#!/usr/bin/env node
// Fails the build if server/src imports a file from outside server/ that
// server/Dockerfile does not COPY into the image.
//
// WHY THIS EXISTS. The Dockerfile copies individual files out of src/ rather
// than the whole directory (src/data is several MB of frontend gear/ability
// tables this service has no use for). That makes the container's filesystem a
// strict subset of the repo's, and nothing else notices the difference: `node
// src/index.js`, every local test, and `docker build` itself all succeed with
// the full repo on disk. The failure only appears once the image actually runs,
// as ERR_MODULE_NOT_FOUND at import time - which kills the process before a
// single route is registered, so EVERY /api/* endpoint goes down, not just the
// feature whose import was added. That outage has already happened once.
//
// Resolution is TRANSITIVE on purpose. The file that took the site down was
// src/utils/gearStats.js, which no server file imports directly - it is
// re-exported by src/data/blessings.js. A check that only looked at server/src's
// own import statements would have passed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(SCRIPT_DIR, '..');
const REPO_ROOT = path.resolve(SERVER_DIR, '..');
const DOCKERFILE = path.join(SERVER_DIR, 'Dockerfile');

const toPosix = (p) => p.split(path.sep).join('/');
const repoRelative = (abs) => toPosix(path.relative(REPO_ROOT, abs));

// Static specifiers only: `import x from 'y'`, `export ... from 'y'`, and
// `import('y')`. A computed dynamic import would be invisible here, but this
// service has none - and one would be a bad idea precisely because it would
// also be invisible to this check.
const SPECIFIER_RE = /(?:\bfrom\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/g;

function listJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsFiles(full));
    else if (/\.(js|mjs|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Walks outward from server/src, collecting every file reached OUTSIDE
// server/. Files inside server/ are followed but not collected - `COPY
// server/src` already covers them wholesale.
function collectExternalDependencies(entryFiles) {
  const external = new Set();
  const seen = new Set();
  const queue = [...entryFiles];

  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!fs.existsSync(file)) continue;

    const source = fs.readFileSync(file, 'utf8');
    for (const [, specifier] of source.matchAll(SPECIFIER_RE)) {
      // Bare specifiers are npm packages, installed by `npm install` in the
      // image rather than copied.
      if (!specifier.startsWith('.')) continue;
      const resolved = path.resolve(path.dirname(file), specifier);
      if (!toPosix(resolved).startsWith(toPosix(SERVER_DIR) + '/')) external.add(resolved);
      queue.push(resolved);
    }
  }
  return external;
}

// COPY <src>... <dest>; the final token is the destination. `--chown`-style
// flags and heredoc forms are not used here but are skipped defensively.
function dockerfileCopySources() {
  const sources = [];
  for (const rawLine of fs.readFileSync(DOCKERFILE, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!/^COPY\s/i.test(line)) continue;
    const tokens = line.slice(5).trim().split(/\s+/).filter((t) => !t.startsWith('--'));
    if (tokens.length < 2) continue;
    sources.push(...tokens.slice(0, -1));
  }
  return sources;
}

function isCovered(repoRelPath, copySources) {
  return copySources.some((source) => {
    const clean = source.replace(/^\.\//, '').replace(/\/$/, '');
    if (clean === repoRelPath) return true;
    // A copied directory covers everything beneath it.
    return repoRelPath.startsWith(clean + '/');
  });
}

const entryFiles = listJsFiles(path.join(SERVER_DIR, 'src'));
const external = collectExternalDependencies(entryFiles);
const copySources = dockerfileCopySources();

const missing = [];
const notOnDisk = [];
for (const abs of [...external].sort()) {
  const rel = repoRelative(abs);
  if (!fs.existsSync(abs)) notOnDisk.push(rel);
  else if (!isCovered(rel, copySources)) missing.push(rel);
}

if (notOnDisk.length > 0) {
  console.error('Imports that do not resolve to a file on disk:\n');
  for (const rel of notOnDisk) console.error('  ' + rel);
  console.error('\n(An extensionless specifier will do this - Node does not add .js for you.)\n');
}

if (missing.length > 0) {
  console.error('server/Dockerfile does not COPY these files, which server/src imports:\n');
  for (const rel of missing) console.error(`  COPY ${rel} ./${rel}`);
  console.error(
    '\nWithout them the image builds fine and then crashes on boot with\n' +
      'ERR_MODULE_NOT_FOUND, taking down every /api/* route. Add the lines above\n' +
      'to server/Dockerfile.\n',
  );
}

if (missing.length > 0 || notOnDisk.length > 0) process.exit(1);

console.log(
  `Dockerfile COPY check passed - ${external.size} file(s) imported from outside server/, all copied.`,
);
