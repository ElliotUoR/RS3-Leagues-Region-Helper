// Draws a finished tier list as a PNG - the download behind "Export as image",
// and the preview image a shared link unfurls with.
//
// Same approach as ogImageRender.js (fixed coordinates, pre-existing PNGs, no
// layout engine) and the same palette, so the two images read as coming from
// one site. Kept separate rather than folded in because almost nothing is
// shared beyond the colours: that one lays out a gear grid and icon columns,
// this one lays out labelled rows of chips whose height depends on how many
// chips wrapped.
//
// The canvas is sized to its own content rather than a fixed OG dimension -
// Discord and Twitter size an embed to the real image, so padding to a standard
// size would only add dead space.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { itemsFor, tierListTitle } from '../../../src/data/tierListItems.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '../../../public');

const BG = '#16171d';
const PANEL_BG = '#1f2028';
const CHIP_BG = '#16171d';
const BORDER = '#2e303a';
const TEXT = '#c7c7cf';
const TEXT_H = '#f3f4f6';
const ACCENT = '#c084fc';

// The row accent hues, matching utils/tierChipStyles.js. Duplicated as literals
// rather than imported because that module is browser-side styling glue; what
// matters is that a row is the same colour in the image as on the page, which a
// six-value table states more plainly than an import chain would.
const ROW_HUES = [165, 140, 95, 45, 25, 5, 220];
const UNSORTED_HUE = 250;

const WIDTH = 1200;
const MARGIN = 44;
const HEADER_TOP = 52;
const HEADER_GAP = 30;

const LABEL_W = 116;
const ROW_GAP = 10;
const ROW_PAD = 12;
const ROW_MIN_H = 74;

const CHIP_H = 50;
const CHIP_GAP = 10;
const CHIP_PAD_X = 14;
const CHIP_ICON = 34;
const CHIP_FONT = '600 17px sans-serif';

const FOOTER_H = 46;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hsl(hue, sat, light, alpha = 1) {
  return `hsl(${hue} ${sat}% ${light}% / ${alpha})`;
}

async function drawIcon(ctx, iconPath, x, y, size) {
  try {
    const image = await loadImage(path.join(PUBLIC_DIR, iconPath));
    const scale = Math.min(size / image.width, size / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, x + (size - w) / 2, y + (size - h) / 2, w, h);
    return true;
  } catch {
    return false;
  }
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

// Chip widths depend on the rendered text, so the row heights - and therefore
// the canvas height - cannot be known until every label has been measured.
// A throwaway 1x1 context does the measuring before the real canvas is sized.
function measureChips(entries) {
  const probe = createCanvas(1, 1).getContext('2d');
  probe.font = CHIP_FONT;
  return entries.map((entry) => ({
    ...entry,
    width: CHIP_PAD_X * 2 + (entry.icon ? CHIP_ICON + 8 : 0) + probe.measureText(entry.name).width,
  }));
}

// Greedy wrap into however many lines the row needs.
function wrapChips(chips, maxWidth) {
  const lines = [[]];
  let used = 0;
  for (const chip of chips) {
    const needed = chip.width + (lines[lines.length - 1].length > 0 ? CHIP_GAP : 0);
    if (used + needed > maxWidth && lines[lines.length - 1].length > 0) {
      lines.push([chip]);
      used = chip.width;
    } else {
      lines[lines.length - 1].push(chip);
      used += needed;
    }
  }
  return lines;
}

// `placements` is name -> row index; anything absent is unsorted. Mirrors
// components/TierListView.jsx exactly, including Unsorted last and omitted
// when empty, so the image matches the page it came from.
function buildRows({ type, rowLabels, placements }) {
  const items = itemsFor(type);
  const rows = rowLabels.map((label, index) => ({
    label,
    hue: ROW_HUES[index] ?? ROW_HUES[ROW_HUES.length - 1],
    entries: items.filter((item) => placements[item.name] === index),
  }));
  const unsorted = items.filter((item) => placements[item.name] == null);
  if (unsorted.length > 0) rows.push({ label: 'Unsorted', hue: UNSORTED_HUE, entries: unsorted });
  return rows;
}

export async function renderTierListImage({ type, authorName, angle, rowLabels, placements }) {
  const rows = buildRows({ type, rowLabels, placements });
  const chipAreaWidth = WIDTH - MARGIN * 2 - LABEL_W - ROW_PAD * 2;

  const laidOut = rows.map((row) => {
    const lines = wrapChips(measureChips(row.entries), chipAreaWidth);
    const contentH = row.entries.length === 0 ? CHIP_H : lines.length * CHIP_H + (lines.length - 1) * CHIP_GAP;
    return { ...row, lines, height: Math.max(ROW_MIN_H, contentH + ROW_PAD * 2) };
  });

  const headerH = HEADER_TOP + (angle ? HEADER_GAP * 2 : HEADER_GAP) + 18;
  const rowsH = laidOut.reduce((sum, row) => sum + row.height + ROW_GAP, 0);
  const height = headerH + rowsH + FOOTER_H;

  const canvas = createCanvas(WIDTH, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, WIDTH, height);

  // Header: whose list, what for.
  ctx.fillStyle = TEXT_H;
  ctx.font = '700 34px sans-serif';
  ctx.fillText(truncate(ctx, tierListTitle(authorName, type), WIDTH - MARGIN * 2), MARGIN, HEADER_TOP);
  if (angle) {
    ctx.fillStyle = ACCENT;
    ctx.font = 'italic 600 20px sans-serif';
    ctx.fillText(truncate(ctx, angle, WIDTH - MARGIN * 2), MARGIN, HEADER_TOP + HEADER_GAP);
  }

  let y = headerH;
  for (const row of laidOut) {
    // Label block, in the row's own hue.
    ctx.fillStyle = hsl(row.hue, 55, 45, 0.18);
    roundRect(ctx, MARGIN, y, LABEL_W, row.height, 10);
    ctx.fill();
    ctx.strokeStyle = hsl(row.hue, 55, 45, 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = hsl(row.hue, 65, 70);
    // Single letters get the big treatment; a renamed row gets a size that
    // fits the label block instead of overflowing it.
    ctx.font = row.label.length <= 2 ? '700 30px sans-serif' : '700 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(truncate(ctx, row.label, LABEL_W - 14), MARGIN + LABEL_W / 2, y + row.height / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // The chip area.
    const areaX = MARGIN + LABEL_W + ROW_GAP;
    const areaW = WIDTH - MARGIN - areaX;
    ctx.fillStyle = PANEL_BG;
    roundRect(ctx, areaX, y, areaW, row.height, 10);
    ctx.fill();
    ctx.strokeStyle = BORDER;
    ctx.stroke();

    if (row.entries.length === 0) {
      ctx.fillStyle = TEXT;
      ctx.globalAlpha = 0.45;
      ctx.font = 'italic 16px sans-serif';
      ctx.fillText('Nothing in this tier', areaX + ROW_PAD, y + row.height / 2 + 5);
      ctx.globalAlpha = 1;
    } else {
      let lineY = y + ROW_PAD;
      for (const line of row.lines) {
        let x = areaX + ROW_PAD;
        for (const chip of line) {
          // A relic carries its own accent hue; a blessing carries a
          // red/green/blue colour. Neither is on the row, so the chip keeps
          // the identity it has on the page.
          const chipHue = chip.hue;
          ctx.fillStyle = CHIP_BG;
          roundRect(ctx, x, lineY, chip.width, CHIP_H, CHIP_H / 2);
          ctx.fill();
          ctx.strokeStyle = chipHue != null ? hsl(chipHue, 60, 55, 0.75) : BORDER;
          ctx.stroke();

          let textX = x + CHIP_PAD_X;
          if (chip.icon) {
            // eslint-disable-next-line no-await-in-loop
            await drawIcon(ctx, chip.icon, x + 8, lineY + (CHIP_H - CHIP_ICON) / 2, CHIP_ICON);
            textX = x + 8 + CHIP_ICON + 8;
          }
          ctx.fillStyle = TEXT_H;
          ctx.font = CHIP_FONT;
          ctx.fillText(chip.name, textX, lineY + CHIP_H / 2 + 6);
          x += chip.width + CHIP_GAP;
        }
        lineY += CHIP_H + CHIP_GAP;
      }
    }

    y += row.height + ROW_GAP;
  }

  ctx.fillStyle = TEXT;
  ctx.globalAlpha = 0.6;
  ctx.font = '600 15px sans-serif';
  ctx.fillText('jellyflow.xyz/Leagues - RS3 Leagues II: Equilibrium', MARGIN, height - 18);
  ctx.globalAlpha = 1;

  return canvas.encode('png');
}
