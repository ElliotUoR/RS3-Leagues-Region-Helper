// Distinct colour + short label per region, used for the gear item region
// tags. Colours are chosen to stay distinguishable in both light and dark
// themes (mid-saturation, applied via color-mix() at low opacity for the
// tag background so the page theme still shows through).
export const REGION_COLORS = {
  misthalin: '#4f7fd6',
  karamja: '#5cb85c',
  havenhythe: '#c9a23e',
  morytania: '#8b5cd6',
  anachronia: '#d97a3d',
  kharidianDesert: '#d6b93e',
  asgarnia: '#3fa9a9',
  wilderness: '#d64545',
  fremennikProvince: '#3f6fd6',
  kandarin: '#c23f8a',
  tirannwn: '#2fa66b',
  global: '#8a8a94',
  relic: '#c9962e',
};

// Custom colour overrides for specific resource tags (the `label` field on
// a gear item's source.region group, e.g. "Eternal magic logs" - see
// RegionTags.jsx's ResourcePill). Most resource tags (Luminate ore, Algarum
// thread, etc.) just share that pill's default gold colour - this map only
// needs an entry for ones that should stand out with their own colour
// instead of that shared default.
export const RESOURCE_TAG_COLORS = {
  // Originally a much darker navy (#16205c) - too close to the page's own
  // dark-mode background to read against, and murky on light mode too.
  // Lightened to a clear mid-tone blue that keeps enough contrast in both.
  'Eternal magic logs': '#4a90e2',
  'Primal ore': '#7a1414',
};

// Curated distinct-color palette for League Relic drop/resource-conversion
// tables (see RelicDropTablePanel.jsx) - each category row in a relic's
// `dropTable` gets its own color so it reads as visually distinct from every
// other line in the same table. Same criteria as REGION_COLORS above:
// mid-saturation hues picked to stay legible via color-mix() against both
// the light and dark theme backgrounds. Assigned by array index (cycling if
// a table ever has more categories than colors here - Transmutation's real
// table will have ~25) via getDropTableCategoryColor below, which an
// explicit per-category `color` override always wins over.
export const DROP_TABLE_PALETTE = [
  '#4f7fd6',
  '#5cb85c',
  '#d64545',
  '#c9a23e',
  '#8b5cd6',
  '#d97a3d',
  '#2fa66b',
  '#c23f8a',
  '#3fa9a9',
  '#d6b93e',
  '#3f6fd6',
  '#a65f2f',
  '#6ba3d6',
  '#9c6ade',
];

// Resolves the color for one dropTable category: an explicit `category.color`
// always wins, otherwise cycles through DROP_TABLE_PALETTE by the category's
// array index.
export function getDropTableCategoryColor(category, index) {
  return category.color || DROP_TABLE_PALETTE[index % DROP_TABLE_PALETTE.length];
}

export const REGION_SHORT_LABELS = {
  misthalin: 'Misthalin',
  karamja: 'Karamja',
  havenhythe: 'Havenhythe',
  morytania: 'Morytania',
  anachronia: 'Anachronia',
  kharidianDesert: 'Desert',
  asgarnia: 'Asgarnia',
  wilderness: 'Wilderness',
  fremennikProvince: 'Fremennik',
  kandarin: 'Kandarin',
  tirannwn: 'Tirannwn',
  global: 'Global',
  relic: '★ Relic',
};
