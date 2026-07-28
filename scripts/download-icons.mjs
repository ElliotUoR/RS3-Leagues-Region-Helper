// One-time (and re-runnable) migration: downloads every hotlinked
// runescape.wiki icon referenced in src/data/*.js into public/icons/, then
// rewrites those data files to reference the local copy instead. Safe to
// re-run later when new items are added - already-downloaded files are
// skipped, and only newly-added wiki URLs get fetched.
//
// Handles two shapes:
//   1. Literal icon URL strings, e.g. icon: 'https://runescape.wiki/w/Special:FilePath/X.png'
//   2. regions.js's `FP(file)` helper, used to build boss-drop icon URLs from
//      a bare filename - every FP('X.png') call site shares one definition,
//      so once every referenced file is downloaded we flip that single
//      definition to build a local path instead, fixing every call site at
//      once without touching them individually.
//
// Usage: npm run fetch-icons
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const iconsDir = path.join(root, 'public', 'icons');
const gearFile = path.join(root, 'src', 'data', 'gear.js');
const regionsFile = path.join(root, 'src', 'data', 'regions.js');
const abilitiesFile = path.join(root, 'src', 'data', 'abilities.js');
const relicsFile = path.join(root, 'src', 'data', 'relics.js');
const leagueRelicsFile = path.join(root, 'src', 'data', 'leagueRelics.js');
const spellbooksFile = path.join(root, 'src', 'data', 'spellbooks.js');
const dataFiles = [gearFile, regionsFile, abilitiesFile, relicsFile, leagueRelicsFile, spellbooksFile];

// Note: apostrophes are intentionally allowed in the URL body - some entries
// are double-quoted strings with a literal (unescaped) apostrophe in the URL
// (e.g. "...Stalker's_charm.png"), which is valid JS since double-quoted
// strings don't terminate on `'`. Single-quoted strings never contain a
// literal apostrophe (that would be invalid JS), so they always URL-encode
// it as %27 instead - meaning allowing `'` here can never cause a match to
// run past the real end of a single-quoted URL.
const URL_RE = /https:\/\/runescape\.wiki\/[^\s"`]+\.(?:png|jpg|jpeg|gif|svg)(?:\?[^\s"`]*)?/gi;
const FP_CALL_RE = /FP\('([^']+)'\)/g;
const FP_DEFINITION = "const FP = (file) => `https://runescape.wiki/w/Special:FilePath/${file}`;";
const FP_DEFINITION_LOCAL = 'const FP = (file) => `icons/${file}`;';
const REQUEST_DELAY_MS = 200;
const MAX_ATTEMPTS = 3;

function sanitizeFilename(name) {
  // sanitize anything that isn't safe across common filesystems, just in case
  return name.replace(/[<>:"/\\|?*]/g, '_');
}

function extractFilenameFromUrl(url) {
  const u = new URL(url);
  const raw = u.pathname.includes('Special:FilePath/')
    ? u.pathname.split('Special:FilePath/')[1]
    : u.pathname.split('/').pop();
  return sanitizeFilename(decodeURIComponent(raw));
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadWithRetry(url, dest) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // The wiki can return a 200 with an HTML "file not found" page for a
      // bad filename - writing that as e.g. a .png would silently corrupt
      // the icon, so refuse anything that isn't actually an image.
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        throw new Error(`not an image (content-type: ${contentType || 'unknown'})`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(dest, buf);
      return true;
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        console.log(`FAILED (${err.message})`);
        return false;
      }
      await sleep(600 * attempt);
    }
  }
  return false;
}

async function downloadAll(entries, label) {
  let downloaded = 0;
  let alreadyPresent = 0;
  let failed = 0;
  let i = 0;

  for (const { url, dest } of entries) {
    i++;
    if (existsSync(dest)) {
      alreadyPresent++;
      continue;
    }
    process.stdout.write(`[${label} ${i}/${entries.length}] ${path.basename(dest)} ... `);
    const ok = await downloadWithRetry(url, dest);
    if (ok) {
      downloaded++;
      console.log('ok');
    } else {
      failed++;
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`${label}: downloaded ${downloaded}, already had ${alreadyPresent}, failed ${failed}.`);
  return failed;
}

async function main() {
  mkdirSync(iconsDir, { recursive: true });

  const originalText = new Map();
  for (const file of dataFiles) originalText.set(file, readFileSync(file, 'utf8'));

  // --- Pass 1: literal icon URL strings ---
  const urlToLocal = new Map();
  const urlEntries = [];
  const seenUrls = new Set();
  for (const file of dataFiles) {
    for (const match of originalText.get(file).matchAll(URL_RE)) {
      const url = match[0];
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      const filename = extractFilenameFromUrl(url);
      const dest = path.join(iconsDir, filename);
      urlToLocal.set(url, `icons/${filename}`);
      urlEntries.push({ url, dest });
    }
  }
  console.log(`Found ${urlEntries.length} unique literal icon URLs.\n`);
  await downloadAll(urlEntries, 'icons');

  // --- Pass 2: regions.js's FP(file) helper call sites ---
  const fpFilenames = new Set();
  for (const file of dataFiles) {
    for (const match of originalText.get(file).matchAll(FP_CALL_RE)) fpFilenames.add(match[1]);
  }
  // The FP() call-site argument (`filename`) is used as-is to build the wiki
  // fetch URL (correct - that's a real URL path segment, %-encoding and
  // all). But the file saved to disk needs the *decoded* name: at runtime
  // FP() builds `icons/${filename}` verbatim, and a browser resolving that
  // as an <img src> auto-decodes any %XX sequences in the path - so
  // "icons/Lady_Grey%27s_guitar.png" gets requested as
  // "icons/Lady_Grey's_guitar.png". The file on disk has to be named to
  // match what actually gets requested, not the raw call-site argument.
  const fpEntries = [...fpFilenames].map((filename) => ({
    url: `https://runescape.wiki/w/Special:FilePath/${filename}`,
    dest: path.join(iconsDir, sanitizeFilename(decodeURIComponent(filename))),
  }));
  console.log(`\nFound ${fpEntries.length} unique FP() drop-icon filenames.\n`);
  const fpFailed = fpEntries.length > 0 ? await downloadAll(fpEntries, 'FP') : 0;

  // --- Rewrite: literal URLs -> local paths, everywhere they appear ---
  for (const file of dataFiles) {
    let text = originalText.get(file);
    let replacements = 0;
    for (const [url, localPath] of urlToLocal.entries()) {
      if (!text.includes(url)) continue;
      // A decoded local path can contain a literal apostrophe (e.g.
      // "icons/Devourer's_Guard.png") even when the original URL was
      // single-quoted (with the apostrophe safely %27-encoded) - plainly
      // substituting the URL text in that case would leave a raw apostrophe
      // sitting inside a single-quoted string, breaking JS syntax. Re-quote
      // any single-quoted occurrence as double-quoted first, since that's
      // always safe for a path containing an apostrophe; anything left
      // (already double-quoted, or single-quoted with no apostrophe in the
      // path) gets a plain substring swap.
      text = text.split(`'${url}'`).join(`"${localPath}"`);
      text = text.split(url).join(localPath);
      replacements++;
    }

    // --- Rewrite: FP() helper definition -> local, only if every referenced
    // drop icon downloaded successfully (otherwise keep hotlinking so no
    // drop icon silently 404s against a file that was never fetched). Every
    // dataFile defines its own local FP() helper, so each gets checked/rewritten
    // independently, but all share the same success gate (fpFailed is a single
    // count across every FP() call site in every dataFile) since the
    // downloaded files themselves are shared in the one icons/ directory. ---
    if (fpEntries.length > 0 && fpFailed === 0 && text.includes(FP_DEFINITION)) {
      text = text.replace(FP_DEFINITION, FP_DEFINITION_LOCAL);
      console.log(`Rewrote FP() helper definition to build local icon paths in ${path.relative(root, file)}.`);
    } else if (fpFailed > 0 && text.includes(FP_DEFINITION)) {
      console.log(`Left FP() helper pointing at runescape.wiki in ${path.relative(root, file)} - ${fpFailed} drop icon(s) failed to download.`);
    }

    writeFileSync(file, text, 'utf8');
    console.log(`Rewrote ${replacements} icon reference(s) in ${path.relative(root, file)}`);
  }
}

await main();
