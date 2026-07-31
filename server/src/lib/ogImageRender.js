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
// familiar arrangement so the slot grid reads at a glance. Matches
// GearPage.jsx's own SLOT_GRID_AREAS exactly, including 'eof' top-left -
// see the drawing loop below for why that one's conditional.
const SLOT_GRID = {
  eof: [0, 0],
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

// Blessings and league relics are drawn as bare icons with no label, so they
// pack much tighter than the labelled region grid.
//
// Column counts are sized for the eventual ceiling, not today's data: eight
// blessings once all tiers are released (four picks now - three tiers plus the
// derived god power), and seven league relics. Both fill their first column
// before starting a second, so today's four blessings render as a single
// column of four rather than a lopsided 2x2.
const PICK_ICON_BOX = 88;
const PICK_GRID_GAP_X = 26;
const PICK_GRID_GAP_Y = 20;
const BLESSING_MAX = 8;
const BLESSING_COL_HEIGHT = 4;
const LEAGUE_RELIC_MAX = 7;
const LEAGUE_RELIC_COL_HEIGHT = 4;

const MARGIN = 50;
const MIDDLE_GAP = 56;
const HEADER_HEIGHT = 100;
const BOTTOM_MARGIN = 40;

// Fills column-first: index 0..colHeight-1 in column 0, the rest in column 1.
// Returns { col, row } so a partly-filled second column stays top-aligned.
function columnFirstPosition(index, colHeight) {
  return { col: Math.floor(index / colHeight), row: index % colHeight };
}

function pickBlockSize(count, colHeight) {
  if (count === 0) return { width: 0, height: 0, cols: 0 };
  const cols = Math.ceil(count / colHeight);
  const rows = Math.min(count, colHeight);
  return {
    cols,
    width: cols * PICK_ICON_BOX + (cols - 1) * PICK_GRID_GAP_X,
    height: rows * PICK_ICON_BOX + (rows - 1) * PICK_GRID_GAP_Y,
  };
}

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

export async function renderShareImage({
  unlockedRegionIds,
  equippedNames,
  eofWeaponName,
  defaultStyle,
  blessings = [],
  leagueRelics = [],
}) {
  const gearGridWidth = SLOT_COLS * SLOT_BOX + (SLOT_COLS - 1) * SLOT_GAP;
  const gearGridHeight = SLOT_ROWS * SLOT_BOX + (SLOT_ROWS - 1) * SLOT_GAP;

  const regionRows = Math.max(1, Math.ceil(unlockedRegionIds.length / REGION_GRID_COLS));
  const regionCols = Math.min(REGION_GRID_COLS, unlockedRegionIds.length) || 1;
  const regionGridWidth = regionCols * REGION_ICON_BOX + (regionCols - 1) * REGION_GRID_GAP_X;
  const regionGridHeight = regionRows * (REGION_ICON_BOX + REGION_LABEL_HEIGHT) + (regionRows - 1) * REGION_GRID_GAP_Y;

  // Defensive caps: the decoder already limits both, but the renderer sizes the
  // canvas from these counts, so an over-long list here would silently draw
  // outside it rather than being clipped.
  const shownBlessings = blessings.slice(0, BLESSING_MAX);
  const shownRelics = leagueRelics.slice(0, LEAGUE_RELIC_MAX);

  const blessingBlock = pickBlockSize(shownBlessings.length, BLESSING_COL_HEIGHT);
  const relicBlock = pickBlockSize(shownRelics.length, LEAGUE_RELIC_COL_HEIGHT);

  const gearGridLeft = MARGIN;
  const gearGridTop = HEADER_HEIGHT;
  const regionGridLeft = gearGridLeft + gearGridWidth + MIDDLE_GAP;
  const regionGridTop = HEADER_HEIGHT;

  // Each block only claims horizontal space when it has something in it, and
  // only adds the gap that precedes it - so a build with no blessings puts the
  // relics where the blessings would have been rather than leaving a hole, and
  // a build with neither ends the canvas right after the regions.
  let nextLeft = regionGridLeft + regionGridWidth;
  const blessingLeft = nextLeft + MIDDLE_GAP;
  if (blessingBlock.width > 0) nextLeft = blessingLeft + blessingBlock.width;
  const relicLeft = nextLeft + MIDDLE_GAP;
  if (relicBlock.width > 0) nextLeft = relicLeft + relicBlock.width;

  const width = nextLeft + MARGIN;
  const height =
    HEADER_HEIGHT +
    Math.max(gearGridHeight, regionGridHeight, blessingBlock.height, relicBlock.height) +
    BOTTOM_MARGIN;

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

  // Left - equipped gear grid. 'eof' isn't a real GEAR_SLOTS slot (it's the
  // weapon spirit slotted inside an equipped Essence of Finality necklace,
  // see useGearLoadout.js) and, like on the actual Gear Planner, only
  // renders at all while that necklace is worn - skipped entirely rather
  // than drawn as a permanently-empty box otherwise.
  for (const [slot, [col, row]] of Object.entries(SLOT_GRID)) {
    if (slot === 'eof' && !eofWeaponName) continue;

    const x = gearGridLeft + col * (SLOT_BOX + SLOT_GAP);
    const y = gearGridTop + row * (SLOT_BOX + SLOT_GAP);

    ctx.fillStyle = PANEL_BG;
    roundRect(ctx, x, y, SLOT_BOX, SLOT_BOX, 10);
    ctx.fill();
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, SLOT_BOX, SLOT_BOX, 10);
    ctx.stroke();

    // The EOF weapon is a real weapon-slot item (its spirit, not the
    // necklace) - always looked up in GEAR[style].weapon regardless of the
    // 'eof' grid slot it's drawn in, same as findItemIcon(..., 'weapon', ...)
    // would for the actual weapon slot.
    const iconPath =
      slot === 'eof' ? findItemIcon(defaultStyle, 'weapon', eofWeaponName) : findItemIcon(defaultStyle, slot, equippedNames[slot]);
    if (iconPath) {
      await drawIconCentered(ctx, path.join(path.dirname(ICONS_DIR), iconPath), x, y, SLOT_BOX, 10);
    }

    // Mirrors EquipmentSlot.jsx's `miniIcon` - a small badge of the actual
    // equipped necklace (regular or (or) variant both have their own icon)
    // overlaid in the corner, so it's clear which necklace this spirit
    // belongs to rather than just "a weapon icon floating top-left".
    if (slot === 'eof') {
      const neckIconPath = findItemIcon(defaultStyle, 'neck', equippedNames.neck);
      if (neckIconPath) {
        const badgeSize = 30;
        const badgeCx = x + SLOT_BOX - badgeSize / 2 + 3;
        const badgeCy = y + SLOT_BOX - badgeSize / 2 + 3;

        ctx.fillStyle = BG;
        ctx.beginPath();
        ctx.arc(badgeCx, badgeCy, badgeSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = BORDER;
        ctx.lineWidth = 2;
        ctx.stroke();

        await drawIconCentered(
          ctx,
          path.join(path.dirname(ICONS_DIR), neckIconPath),
          badgeCx - badgeSize / 2,
          badgeCy - badgeSize / 2,
          badgeSize,
          5,
        );
      }
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

  // Blessings, then league relics. Both are drawn as bare icons: the artwork is
  // already distinctive and colour-coded (blessings by god, league relics by
  // their own frame), and a name under each would double the block's width for
  // no gain at thumbnail size - unlike regions, whose icons are far less
  // recognisable on their own.
  await drawPickColumn(ctx, shownBlessings, blessingLeft, HEADER_HEIGHT, BLESSING_COL_HEIGHT);
  await drawPickColumn(ctx, shownRelics, relicLeft, HEADER_HEIGHT, LEAGUE_RELIC_COL_HEIGHT);

  return canvas.toBuffer('image/png');
}

async function drawPickColumn(ctx, picks, left, top, colHeight) {
  for (const [index, pick] of picks.entries()) {
    const { col, row } = columnFirstPosition(index, colHeight);
    const x = left + col * (PICK_ICON_BOX + PICK_GRID_GAP_X);
    const y = top + row * (PICK_ICON_BOX + PICK_GRID_GAP_Y);
    // No panel/border behind these: the icons are hexagonal or shield-shaped
    // with their own frame, so a rounded square underneath reads as a second,
    // conflicting frame rather than as a slot.
    await drawIconCentered(ctx, path.join(path.dirname(ICONS_DIR), pick.icon), x, y, PICK_ICON_BOX, 2);
  }
}
