// Composites a share-link preview image: the default build's equipped gear
// on the left, unlocked region icons on the right. Pure pixel-pushing with
// pre-existing PNGs (see public/icons/ and public/icons/regions/) - no HTML/
// CSS layout engine involved, just fixed coordinates. The canvas is sized to
// its actual content (gear grid width + a modest gap + however many region
// icons there are) rather than a fixed OG-standard size - Discord/Twitter
// both size the embed to whatever the image's real dimensions are, so
// padding it out to a fixed width would just be dead space.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GEAR } from '../../../src/data/gear.js';
import { REGIONS } from '../../../src/data/regions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, '../../../public/icons');
const REGION_ICONS_DIR = path.join(ICONS_DIR, 'regions');

const BG = '#16171d';
const PANEL_BG = '#1f2028';
const BORDER = '#2e303a';
const TEXT = '#c7c7cf';
const TEXT_H = '#f3f4f6';
const ACCENT = '#c084fc';

// Classic RS worn-equipment screen shape (3 columns x 5 rows, some cells
// empty) - not a literal pixel copy of the in-game interface, just the same
// familiar arrangement so the slot grid reads at a glance.
const SLOT_GRID = {
  head: [1, 0],
  pocket: [2, 0],
  back: [0, 1],
  neck: [1, 1],
  ammo: [2, 1],
  weapon: [0, 2],
  torso: [1, 2],
  offhand: [2, 2],
  legs: [1, 3],
  hands: [0, 4],
  feet: [1, 4],
  ring: [2, 4],
};
const SLOT_COLS = 3;
const SLOT_ROWS = 5;
const SLOT_BOX = 84;
const SLOT_GAP = 12;

const REGION_ICON_BOX = 96;
const REGION_GRID_COLS = 2;
const REGION_GRID_GAP_X = 40;
const REGION_GRID_GAP_Y = 28;
const REGION_LABEL_HEIGHT = 30;

const MARGIN = 50;
const MIDDLE_GAP = 56;
const HEADER_HEIGHT = 100;
const BOTTOM_MARGIN = 40;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function drawIconCentered(ctx, iconPath, boxX, boxY, boxSize, padding) {
  let image;
  try {
    image = await loadImage(iconPath);
  } catch {
    return;
  }
  const innerSize = boxSize - padding * 2;
  const scale = Math.min(innerSize / image.width, innerSize / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  ctx.drawImage(image, boxX + (boxSize - drawW) / 2, boxY + (boxSize - drawH) / 2, drawW, drawH);
}

function findItemIcon(style, slot, itemName) {
  if (!itemName) return null;
  const items = GEAR[style]?.[slot] ?? [];
  return items.find((item) => item.name === itemName)?.icon ?? null;
}

export async function renderShareImage({ unlockedRegionIds, equippedNames, defaultStyle }) {
  const gearGridWidth = SLOT_COLS * SLOT_BOX + (SLOT_COLS - 1) * SLOT_GAP;
  const gearGridHeight = SLOT_ROWS * SLOT_BOX + (SLOT_ROWS - 1) * SLOT_GAP;

  const regionRows = Math.max(1, Math.ceil(unlockedRegionIds.length / REGION_GRID_COLS));
  const regionCols = Math.min(REGION_GRID_COLS, unlockedRegionIds.length) || 1;
  const regionGridWidth = regionCols * REGION_ICON_BOX + (regionCols - 1) * REGION_GRID_GAP_X;
  const regionGridHeight = regionRows * (REGION_ICON_BOX + REGION_LABEL_HEIGHT) + (regionRows - 1) * REGION_GRID_GAP_Y;

  const gearGridLeft = MARGIN;
  const gearGridTop = HEADER_HEIGHT;
  const regionGridLeft = gearGridLeft + gearGridWidth + MIDDLE_GAP;
  const regionGridTop = HEADER_HEIGHT;

  const width = regionGridLeft + regionGridWidth + MARGIN;
  const height = HEADER_HEIGHT + Math.max(gearGridHeight, regionGridHeight) + BOTTOM_MARGIN;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = TEXT_H;
  ctx.font = '700 30px sans-serif';
  ctx.fillText('RS3 Leagues II: Equilibrium', MARGIN, 44);
  ctx.fillStyle = ACCENT;
  ctx.font = '600 17px sans-serif';
  ctx.fillText('Regional PVM Unlock Planner', MARGIN, 70);

  // Left - equipped gear grid.
  for (const [slot, [col, row]] of Object.entries(SLOT_GRID)) {
    const x = gearGridLeft + col * (SLOT_BOX + SLOT_GAP);
    const y = gearGridTop + row * (SLOT_BOX + SLOT_GAP);

    ctx.fillStyle = PANEL_BG;
    roundRect(ctx, x, y, SLOT_BOX, SLOT_BOX, 10);
    ctx.fill();
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, SLOT_BOX, SLOT_BOX, 10);
    ctx.stroke();

    const iconPath = findItemIcon(defaultStyle, slot, equippedNames[slot]);
    if (iconPath) {
      await drawIconCentered(ctx, path.join(path.dirname(ICONS_DIR), iconPath), x, y, SLOT_BOX, 10);
    }
  }

  // Right - unlocked region icons.
  for (const [index, id] of unlockedRegionIds.entries()) {
    const col = index % REGION_GRID_COLS;
    const row = Math.floor(index / REGION_GRID_COLS);
    const x = regionGridLeft + col * (REGION_ICON_BOX + REGION_GRID_GAP_X);
    const y = regionGridTop + row * (REGION_ICON_BOX + REGION_LABEL_HEIGHT + REGION_GRID_GAP_Y);

    ctx.fillStyle = PANEL_BG;
    ctx.beginPath();
    ctx.arc(x + REGION_ICON_BOX / 2, y + REGION_ICON_BOX / 2, REGION_ICON_BOX / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = REGIONS[id]?.color ?? BORDER;
    ctx.lineWidth = 3;
    ctx.stroke();

    await drawIconCentered(ctx, path.join(REGION_ICONS_DIR, `${id}.png`), x, y, REGION_ICON_BOX, 10);

    ctx.fillStyle = TEXT;
    ctx.font = '600 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(REGIONS[id]?.name ?? id, x + REGION_ICON_BOX / 2, y + REGION_ICON_BOX + 22);
    ctx.textAlign = 'left';
  }

  return canvas.toBuffer('image/png');
}
