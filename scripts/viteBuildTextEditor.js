import fs from 'node:fs';
import path from 'node:path';

// Dev-only Vite middleware that lets the Build Guides page edit its own prose
// and write the change back into src/data/blessingBuilds.js.
//
// WHY THIS IS SAFE TO EXIST:
//   - `configureServer` only runs under `vite dev`. It is not part of the
//     production bundle and there is no equivalent hook in `vite build`, so
//     this endpoint cannot ship.
//   - Requests are additionally rejected unless they arrive from a loopback
//     address, so it is unreachable even if the dev server is bound to 0.0.0.0.
//
// WHY IT EDITS THE SOURCE RATHER THAN REGENERATING IT:
//   blessingBuilds.js is heavily commented - the comments explain where every
//   number came from and are the most valuable part of the file. Re-serialising
//   the parsed data would delete all of them. So instead this locates the exact
//   string literal at the requested path and rewrites only that span, leaving
//   the rest of the file - comments, formatting, key order - byte-identical.
const ENDPOINT = '/__edit-build-text';
const TARGET = 'src/data/blessingBuilds.js';

// --- source scanning -------------------------------------------------------

// Advances past a string literal, comment or template so bracket matching and
// key searching never trip over a brace inside prose (of which there is a lot).
function skipNonCode(src, i) {
  const c = src[i];
  if (c === "'" || c === '"' || c === '`') {
    const lit = readLiteral(src, i);
    return lit ? lit.end : i + 1;
  }
  if (c === '/' && src[i + 1] === '/') {
    const nl = src.indexOf('\n', i);
    return nl === -1 ? src.length : nl;
  }
  if (c === '/' && src[i + 1] === '*') {
    const close = src.indexOf('*/', i + 2);
    return close === -1 ? src.length : close + 2;
  }
  return i;
}

// Reads a quoted string literal starting at `i`, honouring backslash escapes.
function readLiteral(src, i) {
  const quote = src[i];
  if (quote !== "'" && quote !== '"' && quote !== '`') return null;
  let j = i + 1;
  while (j < src.length) {
    if (src[j] === '\\') { j += 2; continue; }
    if (src[j] === quote) return { start: i, end: j + 1, quote };
    j += 1;
  }
  return null;
}

// Index of the bracket closing the one at `open`, skipping strings/comments.
function matchBracket(src, open) {
  const pairs = { '{': '}', '[': ']' };
  const close = pairs[src[open]];
  if (!close) return -1;
  let depth = 0;
  let i = open;
  while (i < src.length) {
    const skipped = skipNonCode(src, i);
    if (skipped !== i) { i = skipped; continue; }
    if (src[i] === src[open]) depth += 1;
    else if (src[i] === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return -1;
}

// Finds `key:` within [from, to), where the key may be bare, 'quoted' or
// "quoted" - object keys here include relic names with spaces and apostrophes.
function findKey(src, from, to, key) {
  const candidates = [`${key}:`, `'${key}':`, `"${key}":`];
  let best = -1;
  for (const candidate of candidates) {
    let i = from;
    while (i < to) {
      const found = src.indexOf(candidate, i);
      if (found === -1 || found >= to) break;
      // Reject a match inside a comment or string by re-scanning from `from`.
      if (!isCode(src, from, found)) { i = found + 1; continue; }
      if (best === -1 || found < best) best = found;
      break;
    }
  }
  return best === -1 ? -1 : best + (src[best] === "'" || src[best] === '"' ? key.length + 3 : key.length + 1);
}

// True when `target` is real code rather than inside a string/comment.
function isCode(src, from, target) {
  let i = from;
  while (i < target) {
    const skipped = skipNonCode(src, i);
    if (skipped > target) return false;
    i = skipped === i ? i + 1 : skipped;
  }
  return true;
}

// Skips whitespace to the first meaningful character.
function skipWs(src, i) {
  while (i < src.length && /\s/.test(src[i])) i += 1;
  return i;
}

// Walks a path like ['unlocks', 'abilities', 2, 'note'] and returns the span of
// the string literal it lands on.
function resolveLiteral(src, windowStart, windowEnd, segments) {
  let start = windowStart;
  let end = windowEnd;
  for (let s = 0; s < segments.length; s += 1) {
    const seg = segments[s];
    let valueAt;
    if (typeof seg === 'number') {
      // Nth element of the array occupying the current window.
      const open = skipWs(src, start);
      if (src[open] !== '[') throw new Error('expected an array at segment ' + s);
      let i = open + 1;
      let idx = 0;
      let depth = 0;
      let elementStart = skipWs(src, i);
      while (i < end) {
        const skipped = skipNonCode(src, i);
        if (skipped !== i) { i = skipped; continue; }
        const ch = src[i];
        if (ch === '{' || ch === '[') depth += 1;
        else if (ch === '}' || ch === ']') {
          if (depth === 0) break;
          depth -= 1;
        } else if (ch === ',' && depth === 0) {
          if (idx === seg) { end = i; start = elementStart; break; }
          idx += 1;
          elementStart = skipWs(src, i + 1);
        }
        i += 1;
      }
      if (idx !== seg) throw new Error('array index ' + seg + ' not found');
      valueAt = start;
    } else {
      const after = findKey(src, start, end, seg);
      if (after === -1) throw new Error('key "' + seg + '" not found');
      valueAt = skipWs(src, after);
    }
    const ch = src[valueAt];
    if (ch === '{' || ch === '[') {
      const closeIdx = matchBracket(src, valueAt);
      if (closeIdx === -1) throw new Error('unbalanced bracket at segment ' + s);
      start = valueAt;
      end = closeIdx + 1;
      // A number segment consumed the element itself; keep the window as-is.
      if (typeof seg === 'number') { start = valueAt; end = closeIdx + 1; }
    } else {
      const lit = readLiteral(src, valueAt);
      if (!lit) throw new Error('expected a string literal at segment ' + s);
      if (s !== segments.length - 1) throw new Error('path continues past a string at segment ' + s);
      return lit;
    }
  }
  throw new Error('path did not end on a string literal');
}

// Sets a single top-level boolean key on a build, inserting it after the `id:`
// line if it is not already there. Used for `hidden`, which unlike the prose
// fields may legitimately not exist yet on a given build.
function setBooleanKey(src, buildStart, buildEnd, key, value) {
  const after = findKey(src, buildStart, buildEnd, key);
  if (after !== -1) {
    const at = skipWs(src, after);
    const match = /^(true|false)/.exec(src.slice(at, at + 5));
    if (!match) throw new Error(`"${key}" is not a boolean`);
    return src.slice(0, at) + String(value) + src.slice(at + match[0].length);
  }
  // Not present - insert immediately after the id line so it reads first.
  const idEnd = src.indexOf('\n', buildStart);
  if (idEnd === -1) throw new Error('malformed build block');
  return `${src.slice(0, idEnd + 1)}    ${key}: ${value},\n${src.slice(idEnd + 1)}`;
}

// Serialises to a single-quoted JS literal. Real newlines become \n so a
// multi-paragraph edit stays on one source line, matching the existing style.
function toLiteral(value) {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r\n|\r|\n/g, '\\n');
  return `'${escaped}'`;
}

// --- plugin ----------------------------------------------------------------

export default function buildTextEditor() {
  return {
    name: 'build-text-editor',
    apply: 'serve', // belt and braces: never active for `vite build`
    configureServer(server) {
      server.middlewares.use(ENDPOINT, (req, res) => {
        const remote = req.socket.remoteAddress ?? '';
        const isLocal = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote);
        const fail = (code, message) => {
          res.statusCode = code;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: message }));
        };
        if (!isLocal) return fail(403, 'local requests only');
        if (req.method !== 'POST') return fail(405, 'POST only');

        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          let payload;
          try {
            payload = JSON.parse(body);
          } catch {
            return fail(400, 'invalid JSON');
          }
          const { buildId, path: segments, value } = payload;
          const isBool = typeof value === 'boolean';
          if (!buildId || !Array.isArray(segments) || (typeof value !== 'string' && !isBool)) {
            return fail(400, 'expected { buildId, path[], value } with a string or boolean value');
          }
          if (isBool && segments.length !== 1) {
            return fail(400, 'boolean values are only supported for a single top-level key');
          }
          const file = path.resolve(server.config.root, TARGET);
          let src;
          try {
            src = fs.readFileSync(file, 'utf8');
          } catch {
            return fail(500, 'could not read ' + TARGET);
          }
          const marker = `id: '${buildId}',`;
          const buildStart = src.indexOf(marker);
          if (buildStart === -1) return fail(404, 'unknown build ' + buildId);
          const nextBuild = src.indexOf("\n    id: '", buildStart + marker.length);
          const buildEnd = nextBuild === -1 ? src.length : nextBuild;

          let updated;
          try {
            if (isBool) {
              updated = setBooleanKey(src, buildStart, buildEnd, segments[0], value);
            } else {
              const lit = resolveLiteral(src, buildStart, buildEnd, segments);
              updated = src.slice(0, lit.start) + toLiteral(value) + src.slice(lit.end);
            }
          } catch (err) {
            return fail(422, err.message);
          }
          try {
            fs.writeFileSync(file, updated);
          } catch {
            return fail(500, 'could not write ' + TARGET);
          }
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        });
      });
    },
  };
}
