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
