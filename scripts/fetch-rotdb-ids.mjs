#!/usr/bin/env node
// Resolves every item in src/data/gear.js to rotdb.com's internal item id, so a
// build here could be handed to their damage calculator (see the notes at the
// bottom of this file for what that integration would and would not survive).
//
// WHY THIS IS A SCRIPT AND NOT RUNTIME CODE. api.rotdb.com refuses cross-origin
// browser requests (403, no Access-Control-Allow-Origin) - it only answers
// same-origin calls from their own page, or server-side calls that send no
// Origin header at all, which is what Node's fetch does. So the mapping has to
// be resolved ahead of time and committed, not looked up in the browser.
//
// BEING A GOOD CITIZEN. This hits someone else's small hobby API, backed by a
// real database on metered hosting. So: one request at a time with a delay, a
// User-Agent that says who we are, an on-disk cache so a re-run costs nothing,
// and it stops on repeated failures rather than hammering.
//
// Usage:
//   node scripts/fetch-rotdb-ids.mjs            resolve everything (cached)
//   node scripts/fetch-rotdb-ids.mjs --limit 40 quick sample
//   node scripts/fetch-rotdb-ids.mjs --fresh    ignore the cache
//   node scripts/fetch-rotdb-ids.mjs --write    also emit the mapping file
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GEAR } from '../src/data/gear.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const CACHE_PATH = path.join(__dirname, '.rotdb-id-cache.json');
const OUT_PATH = path.join(REPO, 'src/data/rotdbItemIds.js');

const API = 'https://api.rotdb.com';
const USER_AGENT = 'RS3LeaguesRegionHelper/1.0 (+https://jellyflow.xyz/Leagues)';
const DELAY_MS = 220;
const MAX_CONSECUTIVE_FAILURES = 5;

// gear.js slot -> rotdb Slots enum. Theirs is uppercase (their 400 responses
// leak the Java enum names, which is how the full set below was found):
// MAINHAND OFFHAND TWOHANDED HEAD BODY LEGS BOOTS GLOVES NECK RING CAPE POCKET
// AMMO QUIVER. They have a QUIVER we have no equivalent for.
//
// CRITICAL: they split TWOHANDED out as its own slot, where we keep two-handers
// in `weapon` with a `twoHanded` flag. Searching a scythe under MAINHAND
// returns nothing at all - which looked like "their database is missing half of
// RS3" until the real slot turned up.
const SLOT_MAP = {
  offhand: 'OFFHAND',
  head: 'HEAD',
  torso: 'BODY',
  legs: 'LEGS',
  feet: 'BOOTS',
  hands: 'GLOVES',
  neck: 'NECK',
  ring: 'RING',
  back: 'CAPE',
  pocket: 'POCKET',
  ammo: 'AMMO',
};

// Two slots of ours map to two of theirs, so both get an ordered candidate list
// and the first exact name match wins:
//
//   weapon -> MAINHAND or TWOHANDED, decided by our own `twoHanded` flag, with
//     the other tried as a fallback in case the flags disagree on an item.
//   ammo   -> AMMO or QUIVER. We keep quiver items (Nodon spike harness,
//     Pernix's quiver, the Tirannwn quivers) in `ammo`; they have a real QUIVER
//     slot, and those items exist ONLY there.
function rotdbSlotsFor(slot, item) {
  if (slot === 'weapon') return item.twoHanded ? ['TWOHANDED', 'MAINHAND'] : ['MAINHAND', 'TWOHANDED'];
  if (slot === 'ammo') return ['AMMO', 'QUIVER'];
  return [SLOT_MAP[slot]];
}

// Names that differ between the two datasets. Every one of these was a "miss"
// on the first full run and turned out to be present under another name, not
// absent - so they are corrections, not guesses. Three families of difference:
//   - they qualify Masterwork by style; we only do so for magic
//   - their ammo is singular ("Bane arrow"), ours plural
//   - they put the qualifier last ("Eternal magic staff (meagre)")
const ALIASES = {
  'Dragon Claws': 'Dragon claw',
  'Masterwork helm': 'Masterwork melee helm',
  'Trimmed masterwork helm': 'Trimmed masterwork melee helm',
  'Masterwork platebody': 'Masterwork melee platebody',
  'Trimmed masterwork platebody': 'Trimmed masterwork melee platebody',
  'Masterwork platelegs': 'Masterwork melee platelegs',
  'Trimmed masterwork platelegs': 'Trimmed masterwork melee platelegs',
  'Masterwork gloves': 'Masterwork melee gloves',
  'Trimmed masterwork gloves': 'Trimmed masterwork melee gloves',
  'Masterwork boots': 'Masterwork melee boots',
  'Trimmed masterwork boots': 'Trimmed masterwork melee boots',
  'Masterwork hat': 'Masterwork magic hat',
  'Masterwork robe top': 'Masterwork magic robe top',
  'Masterwork robe bottom': 'Masterwork magic robe bottom',
  'Masterwork gloves (magic)': 'Masterwork magic gloves',
  'Masterwork boots (magic)': 'Masterwork magic boots',
  "Karil's leathertop": "Karil's top",
  "Karil's leatherskirt": "Karil's skirt",
  'Bane arrows': 'Bane arrow',
  'Elder rune arrows': 'Elder rune arrow',
  'Havensilver bolts': 'Havensilver bolt',
  'Meagre eternal magic staff': 'Eternal magic staff (meagre)',
  'Saturated eternal magic staff': 'Eternal magic staff (saturated)',
  'Large rune pouch (unsealed)': 'Large rune pouch',
};

const args = process.argv.slice(2);
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
const fresh = args.includes('--fresh');
const write = args.includes('--write');
const retryMisses = args.includes('--retry-misses');

// Their names and ours differ in casing and apostrophe style ("Abyssal Scourge"
// vs "Abyssal scourge", "Varanus's" vs "Varanus’s"), so comparison is done on a
// normalised form while the ORIGINAL names are what gets stored.
const norm = (s) =>
  s
    .toLowerCase()
    .replaceAll('’', "'")
    .replace(/\s+/g, ' ')
    .trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function collectItems() {
  const seen = new Map();
  for (const bySlot of Object.values(GEAR)) {
    for (const [slot, items] of Object.entries(bySlot)) {
      if (slot !== 'weapon' && !SLOT_MAP[slot]) continue;
      for (const item of items) {
        const key = `${slot}|${item.name}`;
        if (!seen.has(key)) seen.set(key, { slot, name: item.name, slots: rotdbSlotsFor(slot, item) });
      }
    }
  }
  return [...seen.values()];
}

async function search(name, rotdbSlot) {
  const url = `${API}/equipment/search?q=${encodeURIComponent(name)}&slot=${rotdbSlot}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`.slice(0, 120));
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

const cache = !fresh && fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};
if (retryMisses) {
  for (const [k, v] of Object.entries(cache)) {
    if (v.match === 'miss' || v.match === 'error') delete cache[k];
  }
}

const items = collectItems().slice(0, limit);

console.log(`Resolving ${items.length} items against ${API}`);
console.log(`Cache: ${Object.keys(cache).length} already known\n`);

let done = 0;
let fetched = 0;
let consecutiveFailures = 0;

for (const { slot, name, slots } of items) {
  const key = `${slot}|${name}`;
  done += 1;

  if (cache[key] && !fresh) continue;

  try {
    // Try each candidate slot in turn, stopping at the first exact name match.
    let results = [];
    let exact = null;
    let usedSlot = slots[0];
    for (const candidate of slots) {
      const hits = await search(ALIASES[name] ?? name, candidate);
      fetched += 1;
      const hit = hits.find((r) => norm(r.name) === norm(name) || (ALIASES[name] && norm(r.name) === norm(ALIASES[name])));
      if (hit) {
        exact = hit;
        usedSlot = candidate;
        results = hits;
        break;
      }
      if (hits.length > results.length) {
        results = hits;
        usedSlot = candidate;
      }
      if (slots.length > 1) await sleep(DELAY_MS);
    }
    consecutiveFailures = 0;

    if (exact) {
      cache[key] = { id: exact.id, rotdbName: exact.name, match: 'exact', rotdbSlot: usedSlot };
    } else if (results.length > 0) {
      // Kept, but flagged - a human has to eyeball these rather than trusting
      // the search's own ranking, since a wrong id is a silently wrong build.
      cache[key] = { id: results[0].id, rotdbName: results[0].name, match: 'fuzzy', candidates: results.length };
    } else {
      cache[key] = { id: null, rotdbName: null, match: 'miss' };
    }
  } catch (err) {
    consecutiveFailures += 1;
    cache[key] = { id: null, rotdbName: null, match: 'error', error: String(err.message) };
    console.error(`  ! ${name} (${slot}): ${err.message}`);
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(`\nStopping: ${MAX_CONSECUTIVE_FAILURES} failures in a row. Progress is cached; re-run to resume.`);
      break;
    }
    await sleep(DELAY_MS * 4);
  }

  if (done % 50 === 0) {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
    process.stdout.write(`  ${done}/${items.length}\r`);
  }
  await sleep(DELAY_MS);
}

fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

// ---- report -------------------------------------------------------------
const rows = items.map(({ slot, name }) => ({ slot, name, ...(cache[`${slot}|${name}`] ?? { match: 'skipped' }) }));
const by = (m) => rows.filter((r) => r.match === m);

console.log(`\n\nrequests made this run: ${fetched}\n`);
console.log('=== coverage ===');
for (const m of ['exact', 'fuzzy', 'miss', 'error', 'skipped']) {
  const n = by(m).length;
  if (n) console.log(`  ${m.padEnd(8)} ${String(n).padStart(4)}  ${((n / rows.length) * 100).toFixed(1)}%`);
}

console.log('\n=== by slot ===');
const slots = [...new Set(rows.map((r) => r.slot))];
for (const slot of slots) {
  const inSlot = rows.filter((r) => r.slot === slot);
  const ok = inSlot.filter((r) => r.match === 'exact').length;
  console.log(`  ${slot.padEnd(9)} ${String(ok).padStart(3)}/${String(inSlot.length).padEnd(4)} exact`);
}

const misses = by('miss');
if (misses.length) {
  console.log(`\n=== not in their database (${misses.length}) ===`);
  for (const r of misses.slice(0, 40)) console.log(`  ${r.slot.padEnd(9)} ${r.name}`);
  if (misses.length > 40) console.log(`  ... and ${misses.length - 40} more`);
}

const fuzzy = by('fuzzy');
if (fuzzy.length) {
  console.log(`\n=== needs eyeballing - closest match differs (${fuzzy.length}) ===`);
  for (const r of fuzzy.slice(0, 40)) console.log(`  ${r.slot.padEnd(9)} ${r.name}  ->  ${r.rotdbName} #${r.id}`);
  if (fuzzy.length > 40) console.log(`  ... and ${fuzzy.length - 40} more`);
}

if (write) {
  // Only exact matches are emitted. A fuzzy match is a guess, and a wrong id
  // produces a confidently wrong damage number - worse than no number.
  const map = {};
  for (const r of by('exact')) map[r.name] = r.id;
  const body = `// GENERATED by scripts/fetch-rotdb-ids.mjs - do not edit by hand.
//
// Maps this planner's item names to rotdb.com's internal item ids, for handing
// a build to their damage calculator. Only exact name matches are included;
// see the script for the misses and near-misses it found.
//
// These are THEIR internal ids with no stability guarantee - re-run the script
// if their data changes.
export const ROTDB_ITEM_IDS = ${JSON.stringify(map, null, 2)};
`;
  fs.writeFileSync(OUT_PATH, body);
  console.log(`\nwrote ${Object.keys(map).length} exact ids -> ${path.relative(REPO, OUT_PATH)}`);
} else {
  console.log('\n(--write to emit src/data/rotdbItemIds.js)');
}
