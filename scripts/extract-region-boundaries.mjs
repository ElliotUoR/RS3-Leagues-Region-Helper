// Converts the hand-traced region-boundary image (each region outlined in
// its own distinct color) into SVG path data for an interactive region map -
// replacing the current static map.jpg + icon-hotspot approach with real
// clickable region shapes (including detached islands, e.g. Havenhythe).
//
// Usage: node scripts/extract-region-boundaries.mjs <path-to-traced-png>
// Writes src/data/regionBoundaries.js: { regionId: ["<svg path d>", ...] }
// (one path string per disconnected polygon - a region with islands gets
// more than one).
//
// How it works, end to end:
//   1. Decode the PNG by hand (IHDR/IDAT/unfilter) - no image library
//      dependency needed for a one-off data-generation script.
//   2. Exclude the three known non-border colors baked into this specific
//      traced image (ocean water, the base land fill, and the app's own
//      bright teal "region selected" highlight overlay - this image looks
//      like a screenshot of the live app with some regions toggled on, not
//      a clean copy of map.jpg) - see EXCLUDED_BASE_COLORS.
//   3. Cluster whatever saturated pixels remain (bucket + agglomerative
//      merge) - these should be almost entirely the 11 hand-traced border
//      strokes, plus small amounts of noise from marker-icon artwork.
//   4. Assign each color cluster to the region whose hotspot marker (see
//      src/data/regions.js) is nearest to that cluster's centroid, merging
//      multiple clusters assigned to the same region (anti-aliasing tends
//      to fragment one true stroke color into several close shades).
//   5. Per region: flood-fill from OUTSIDE the image canvas inward,
//      treating only that region's own stroke color (+ water, as a coastal
//      safety net) as walls. Whatever the fill can't reach is "enclosed" -
//      this naturally handles multiple disconnected polygons (mainland +
//      islands) per region with no special-casing.
//   6. Connected-component label the enclosed mask, Moore-neighbor trace
//      each component's boundary, simplify with Douglas-Peucker (raw
//      pixel-boundary tracing is very jagged), emit as an SVG path.
//
// Sanity checks along the way (not just silent output) - see the console
// warnings this prints: a region's enclosed area swallowing another
// region's hotspot marker means its own traced line has a gap somewhere.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/extract-region-boundaries.mjs <path-to-traced-png>');
  process.exit(1);
}

// ───────────────────────────────────────────────────────────────────────
// 1. Minimal PNG decoder (8-bit RGB or RGBA, non-interlaced only - fine for
//    a hand-exported traced image; re-export as non-interlaced PNG if this
//    throws).
// ───────────────────────────────────────────────────────────────────────
function decodePng(buf) {
  let i = 8;
  const idatChunks = [];
  let width, height, bitDepth, colorType;
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    const data = buf.subarray(i + 8, i + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error('interlaced PNGs are not supported - re-export non-interlaced');
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    }
    i += 8 + len + 4;
  }
  if (bitDepth !== 8) throw new Error('only 8-bit PNGs are supported');
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : null;
  if (!channels) throw new Error('only RGB/RGBA PNGs are supported, got color type ' + colorType);

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * width * 3); // always normalize to RGB

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  }

  const decodedRow = Buffer.alloc(stride);
  const prevRow = Buffer.alloc(stride);
  let offset = 0;
  for (let y = 0; y < height; y++) {
    const filterType = raw[offset]; offset += 1;
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[offset + x];
      const a = x >= channels ? decodedRow[x - channels] : 0;
      const b = prevRow[x];
      const c = x >= channels ? prevRow[x - channels] : 0;
      let val;
      if (filterType === 0) val = rawByte;
      else if (filterType === 1) val = rawByte + a;
      else if (filterType === 2) val = rawByte + b;
      else if (filterType === 3) val = rawByte + Math.floor((a + b) / 2);
      else if (filterType === 4) val = rawByte + paeth(a, b, c);
      else throw new Error('bad filter type ' + filterType);
      decodedRow[x] = val & 0xFF;
    }
    offset += stride;
    for (let x = 0; x < width; x++) {
      const srcIdx = x * channels;
      const dstIdx = (y * width + x) * 3;
      pixels[dstIdx] = decodedRow[srcIdx];
      pixels[dstIdx + 1] = decodedRow[srcIdx + 1];
      pixels[dstIdx + 2] = decodedRow[srcIdx + 2];
    }
    decodedRow.copy(prevRow);
  }
  return { width, height, pixels };
}

// ───────────────────────────────────────────────────────────────────────
// 2. Color helpers
// ───────────────────────────────────────────────────────────────────────
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return [h, s, v];
}
function dist2(r1, g1, b1, r2, g2, b2) {
  return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
}

// Colors present in this traced image that are NOT a hand-drawn region
// border - re-sample these (see the console output of this script's first
// clustering pass) if you re-export the trace from a different source.
const EXCLUDED_BASE_COLORS = [
  [29, 44, 51],   // ocean water
  [78, 112, 79],  // base land fill
  [13, 184, 129], // "region selected" teal highlight overlay
];
const EXCLUDE_TOL2 = 30 * 30;
const WATER_COLOR = EXCLUDED_BASE_COLORS[0];
const WATER_TOL2 = 20 * 20;

function isExcludedBase(r, g, b) {
  return EXCLUDED_BASE_COLORS.some(([er, eg, eb]) => dist2(r, g, b, er, eg, eb) < EXCLUDE_TOL2);
}
function isWater(r, g, b) {
  return dist2(r, g, b, ...WATER_COLOR) < WATER_TOL2;
}

// ───────────────────────────────────────────────────────────────────────
// 3. Load region hotspots (percent -> pixel space) from regions.js
// ───────────────────────────────────────────────────────────────────────
const { REGIONS } = await import(pathToFileURL(path.join(root, 'src', 'data', 'regions.js')));

// Ground-truth colors confirmed directly by whoever traced the image,
// rather than relying on this script's own color discovery for them - the
// auto-clustering below is prone to transitively over-merging genuinely
// different colors together (confirmed: it merged several regions' actual
// strokes into one wrong blended "Morytania" color). Whichever regions
// aren't listed here fall back to auto-discovery.
const KNOWN_COLORS_HEX = {
  misthalin: 'C912E4',
  morytania: '810856',
  havenhythe: 'F37CE5',
  fremennikProvince: '3885C9',
  asgarnia: '1A29BF',
  // Not given directly - derived by sampling near its marker with a filter
  // permissive enough to catch near-black colors (the default candidate
  // filter requires decent saturation/brightness, which a near-black
  // stroke fails outright).
  wilderness: '080808',
  // Also derived by direct sampling - auto-discovery matched scattered
  // noise instead of the real closed loop for this one (confirmed by
  // rendering its wrongly-discovered color's mask directly).
  karamja: 'A88830',
};

// Confirmed by whoever traced the image: these regions have no real
// islands, so any extra connected component found for them is leftover
// noise (near-black/dark region colors are especially prone to matching
// label text elsewhere on the map) rather than genuine territory - only
// the single largest component is kept for these.
const SINGLE_BLOB_REGIONS = new Set(['wilderness', 'anachronia']);

function hexToRgb(hex) {
  return [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map((h) => parseInt(h, 16));
}

// ───────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────
const png = decodePng(fs.readFileSync(inputPath));
const { width, height, pixels } = png;
console.log(`Decoded ${inputPath}: ${width}x${height}`);

const hotspots = Object.entries(REGIONS).map(([id, r]) => ({
  id,
  x: Math.round((r.hotspot.x / 100) * width),
  y: Math.round((r.hotspot.y / 100) * height),
}));

function getPixel(x, y) {
  const idx = (y * width + x) * 3;
  return [pixels[idx], pixels[idx + 1], pixels[idx + 2]];
}

// --- 3a. Bucket candidate pixels, tracking centroid position ---
const buckets = new Map();
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const [r, g, b] = getPixel(x, y);
    const [, s, v] = rgbToHsv(r, g, b);
    if (s < 0.55 || v < 0.35) continue;
    if (isExcludedBase(r, g, b)) continue;
    const key = [Math.round(r / 10) * 10, Math.round(g / 10) * 10, Math.round(b / 10) * 10].join(',');
    if (!buckets.has(key)) buckets.set(key, { count: 0, sr: 0, sg: 0, sb: 0, sx: 0, sy: 0 });
    const e = buckets.get(key);
    e.count++; e.sr += r; e.sg += g; e.sb += b; e.sx += x; e.sy += y;
  }
}

let clusters = [...buckets.values()]
  .filter((e) => e.count > 15)
  .map((e) => ({
    r: e.sr / e.count, g: e.sg / e.count, b: e.sb / e.count,
    cx: e.sx / e.count, cy: e.sy / e.count, count: e.count,
  }));

// --- 3b. Agglomerative merge of nearby colors (anti-aliasing fragments) ---
const MERGE_TOL2 = 35 * 35;
let merged = true;
while (merged) {
  merged = false;
  outer:
  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      if (dist2(clusters[i].r, clusters[i].g, clusters[i].b, clusters[j].r, clusters[j].g, clusters[j].b) < MERGE_TOL2) {
        const a = clusters[i], b = clusters[j];
        const total = a.count + b.count;
        clusters[i] = {
          r: (a.r * a.count + b.r * b.count) / total,
          g: (a.g * a.count + b.g * b.count) / total,
          b: (a.b * a.count + b.b * b.count) / total,
          cx: (a.cx * a.count + b.cx * b.count) / total,
          cy: (a.cy * a.count + b.cy * b.count) / total,
          count: total,
        };
        clusters.splice(j, 1);
        merged = true;
        break outer;
      }
    }
  }
}

// --- 3c. Assign each cluster to its nearest hotspot, then merge by region ---
const byRegion = new Map();
for (const c of clusters) {
  let best = null, bestDist = Infinity;
  for (const h of hotspots) {
    const d = (c.cx - h.x) ** 2 + (c.cy - h.y) ** 2;
    if (d < bestDist) { bestDist = d; best = h.id; }
  }
  if (!byRegion.has(best)) byRegion.set(best, { r: 0, g: 0, b: 0, count: 0 });
  const e = byRegion.get(best);
  const total = e.count + c.count;
  e.r = (e.r * e.count + c.r * c.count) / total;
  e.g = (e.g * e.count + c.g * c.count) / total;
  e.b = (e.b * e.count + c.b * c.count) / total;
  e.count = total;
}

console.log('\nRegion colors (known ground-truth values override auto-discovery):');
const regionColors = {};
for (const h of hotspots) {
  const { id } = h;
  if (KNOWN_COLORS_HEX[id]) {
    regionColors[id] = hexToRgb(KNOWN_COLORS_HEX[id]);
    console.log(`  ${id.padEnd(18)} #${KNOWN_COLORS_HEX[id]}  (known)`);
    continue;
  }
  const e = byRegion.get(id);
  if (!e) {
    console.warn(`  WARNING: no color cluster matched to ${id} - its border may not be closed or distinct enough`);
    continue;
  }
  const hex = [e.r, e.g, e.b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase();
  regionColors[id] = [Math.round(e.r), Math.round(e.g), Math.round(e.b)];
  console.log(`  ${id.padEnd(18)} #${hex}  (discovered, ${e.count} px)`);
}

// ───────────────────────────────────────────────────────────────────────
// 4. Per-region: outside-in flood fill, connected components, contour trace
// ───────────────────────────────────────────────────────────────────────
const COLOR_TOL2 = 30 * 30;
const DILATE_RADIUS = 4; // bridges small anti-aliasing gaps in the traced line

// Builds a dilated wall mask for one region's color - the traced line has
// small periodic anti-aliasing gaps (confirmed by rendering the raw
// color-match mask directly), so a single-pixel color check leaves the
// "loop" open in dozens of places. Dilating by a couple of pixels bridges
// those without meaningfully distorting the real boundary shape. Done as
// two separable 1D max-window passes (horizontal then vertical) rather than
// a naive 2D box check per pixel - O(width*height*radius) instead of
// O(width*height*radius^2).
function buildDilatedWallMask(color) {
  const base = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = getPixel(x, y);
      if (dist2(r, g, b, ...color) < COLOR_TOL2) base[y * width + x] = 1;
    }
  }
  const hPass = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let hit = 0;
      for (let dx = -DILATE_RADIUS; dx <= DILATE_RADIUS && !hit; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < width && base[y * width + nx]) hit = 1;
      }
      hPass[y * width + x] = hit;
    }
  }
  const dilated = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let hit = 0;
      for (let dy = -DILATE_RADIUS; dy <= DILATE_RADIUS && !hit; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < height && hPass[ny * width + x]) hit = 1;
      }
      dilated[y * width + x] = hit;
    }
  }
  return dilated;
}

// BFS from every canvas-edge pixel, through non-wall pixels only.
function findOutside(wallMask) {
  const outside = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) { stack.push([x, 0]); stack.push([x, height - 1]); }
  for (let y = 0; y < height; y++) { stack.push([0, y]); stack.push([width - 1, y]); }
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const idx = y * width + x;
    if (outside[idx]) continue;
    if (wallMask[idx]) continue;
    outside[idx] = 1;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return outside;
}

function connectedComponents(mask) {
  const visited = new Uint8Array(width * height);
  const components = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx] || !mask[idx]) continue;
      const pixelsInComp = [];
      const stack = [[x, y]];
      visited[idx] = 1;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        pixelsInComp.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nidx = ny * width + nx;
          if (visited[nidx] || !mask[nidx]) continue;
          visited[nidx] = 1;
          stack.push([nx, ny]);
        }
      }
      // Filters out label-text artifacts without also cutting off small
      // real islands (a flat pixel-count threshold can't do both - some
      // islands are smaller than some multi-word labels' combined ink
      // area). Text glyphs are thin/sparse relative to their bounding box;
      // a real island is a solid blob that fills most of its bounding box.
      // Dark/black-ish region colors in particular can match label text
      // rendered in a similar shade anywhere on the map, forming small
      // spurious closed loops near unrelated markers (confirmed: this is
      // what was causing Wilderness's near-black color to falsely "enclose"
      // several other regions' markers).
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const [px, py] of pixelsInComp) {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
      const bboxArea = (maxX - minX + 1) * (maxY - minY + 1);
      const density = pixelsInComp.length / bboxArea;
      if (pixelsInComp.length > 20 && density > 0.35) components.push(pixelsInComp);
    }
  }
  return components;
}

// Moore-neighbor boundary tracing on a component's own pixel set.
function traceBoundary(compPixels) {
  const set = new Set(compPixels.map(([x, y]) => x + ',' + y));
  const inSet = (x, y) => set.has(x + ',' + y);
  // Start pixel: topmost, then leftmost.
  let start = compPixels[0];
  for (const p of compPixels) {
    if (p[1] < start[1] || (p[1] === start[1] && p[0] < start[0])) start = p;
  }
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const boundary = [];
  let current = start;
  let backtrackDir = 6; // came from "north" conceptually
  const maxSteps = compPixels.length * 8 + 100;
  for (let step = 0; step < maxSteps; step++) {
    boundary.push(current);
    let found = null, foundDir = backtrackDir;
    for (let k = 0; k < 8; k++) {
      const dir = (backtrackDir + k) % 8;
      const [dx, dy] = dirs[dir];
      const nx = current[0] + dx, ny = current[1] + dy;
      if (inSet(nx, ny)) { found = [nx, ny]; foundDir = dir; break; }
    }
    if (!found) break;
    current = found;
    backtrackDir = (foundDir + 5) % 8; // start next search behind where we came from
    if (current[0] === start[0] && current[1] === start[1] && boundary.length > 1) break;
  }
  return boundary;
}

// Douglas-Peucker simplification.
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  function perpDist(p, a, b) {
    const [x, y] = p, [x1, y1] = a, [x2, y2] = b;
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(x - x1, y - y1);
    const t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
    const px = x1 + t * dx, py = y1 + t * dy;
    return Math.hypot(x - px, y - py);
  }
  function rdp(pts) {
    if (pts.length < 3) return pts;
    let maxDist = -1, maxIdx = -1;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > tolerance) {
      const left = rdp(pts.slice(0, maxIdx + 1));
      const right = rdp(pts.slice(maxIdx));
      return left.slice(0, -1).concat(right);
    }
    return [pts[0], pts[pts.length - 1]];
  }
  return rdp(points);
}

function toSvgPath(points) {
  if (points.length < 3) return null;
  const [first, ...rest] = points;
  return `M ${first[0]} ${first[1]} ` + rest.map(([x, y]) => `L ${x} ${y}`).join(' ') + ' Z';
}

const result = {};
console.log('\nExtracting boundaries:');
for (const h of hotspots) {
  const color = regionColors[h.id];
  if (!color) { console.warn(`  ${h.id}: skipped, no color assigned`); continue; }

  const wallMask = buildDilatedWallMask(color);
  const outside = findOutside(wallMask);
  const enclosed = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    if (!outside[i]) enclosed[i] = 1;
  }

  // Components are found (and small ones filtered as label-text noise -
  // see connectedComponents) BEFORE the sanity checks below, so those
  // checks reflect what's actually in the output rather than the raw,
  // unfiltered mask.
  let components = connectedComponents(enclosed);
  // Wilderness has no real islands - confirmed by whoever traced it - so
  // any extra component here is leftover noise (near-black region colors
  // are especially prone to matching label text elsewhere on the map;
  // density filtering alone wasn't quite strict enough to rule all of it
  // out). Keep only the single largest component for regions in this set.
  if (SINGLE_BLOB_REGIONS.has(h.id) && components.length > 1) {
    components = [components.reduce((a, b) => (b.length > a.length ? b : a), components[0])];
  }
  const filteredEnclosed = new Uint8Array(width * height);
  let enclosedCount = 0;
  for (const comp of components) {
    for (const [x, y] of comp) { filteredEnclosed[y * width + x] = 1; enclosedCount++; }
  }

  // Sanity check: this region's own marker should itself be enclosed.
  const ownIdx = h.y * width + h.x;
  if (!filteredEnclosed[ownIdx]) {
    console.warn(`  WARNING: ${h.id}'s own marker isn't enclosed by its detected border - likely an open/unclosed loop`);
  }
  // Sanity check: no other region's marker should be inside this one's area
  // - unless that marker's own pixel is itself a match for THIS region's
  // wall color (e.g. it happens to sit on label text that coincidentally
  // matches, as confirmed for Wilderness/Asgarnia) rather than genuinely
  // enclosed interior. `enclosed` alone can't distinguish those two cases
  // (a wall pixel is never marked `outside`, so it always reads as
  // "enclosed" regardless of position) - only flag a real, actionable leak.
  for (const other of hotspots) {
    if (other.id === h.id) continue;
    const otherIdx = other.y * width + other.x;
    if (!filteredEnclosed[otherIdx]) continue;
    if (wallMask[otherIdx]) continue; // sitting on this region's own wall/text, not a leak
    console.warn(`  WARNING: ${h.id}'s enclosed area also contains ${other.id}'s marker - likely a gap letting the fill leak through`);
  }

  const paths = [];
  for (const comp of components) {
    const boundary = traceBoundary(comp);
    const simplified = simplify(boundary, 1.5);
    const svgPath = toSvgPath(simplified);
    if (svgPath) paths.push(svgPath);
  }
  result[h.id] = paths;
  console.log(`  ${h.id.padEnd(18)} ${components.length} polygon(s), ${enclosedCount} px enclosed total`);
}

// ───────────────────────────────────────────────────────────────────────
// 5. Write output
// ───────────────────────────────────────────────────────────────────────
const outPath = path.join(root, 'src', 'data', 'regionBoundaries.js');
const header = `// Auto-generated by scripts/extract-region-boundaries.mjs from a hand-traced
// region-boundary image - do not hand-edit, re-run the script instead.
// Each region maps to an array of SVG path 'd' strings (one per disconnected
// polygon - a region with islands, e.g. Havenhythe, has more than one), in
// the pixel coordinate space of the ${width}x${height} traced source image -
// use viewBox="0 0 ${width} ${height}" when rendering.
`;
const body = `export const REGION_BOUNDARIES = ${JSON.stringify(result, null, 2)};\n`;
fs.writeFileSync(outPath, header + '\n' + body);
console.log(`\nWrote ${outPath}`);
