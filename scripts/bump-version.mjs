// Run by the pre-commit git hook (.githooks/pre-commit) on every commit.
// Bumps src/data/version.json's version by 0.1 (starting at 1.0 if the file
// doesn't exist yet) and stamps the current time, so the site footer can
// show a version + last-updated timestamp without any manual step.
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const versionFile = path.join(__dirname, '..', 'src', 'data', 'version.json');

let version = 1.0;
if (existsSync(versionFile)) {
  const current = JSON.parse(readFileSync(versionFile, 'utf8'));
  version = Math.round((parseFloat(current.version) + 0.1) * 10) / 10;
}

const data = {
  version: version.toFixed(1),
  // toUTCString() (e.g. "Sun, 26 Jul 2026 03:00:22 GMT") spells out GMT
  // explicitly, unlike toISOString()'s trailing "Z" - readable at a glance
  // in both the raw JSON and the footer, no timezone-conversion ambiguity.
  updatedAt: new Date().toUTCString(),
};

writeFileSync(versionFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(`[bump-version] ${data.version} @ ${data.updatedAt}`);
