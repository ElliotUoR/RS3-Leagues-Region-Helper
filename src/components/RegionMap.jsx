import { REGIONS, REGION_IDS } from '../data/regions';

export default function RegionMap({ isUnlocked, toggleRegion }) {
  return (
    <div className="region-map">
      <img src={`${import.meta.env.BASE_URL}map.jpg`} alt="Map of Gielinor showing Leagues regions" />
      {REGION_IDS.map((id) => {
        const region = REGIONS[id];
        const unlocked = isUnlocked(id);
        let state = 'unselected';
        if (region.fixed) {
          state = 'fixed';
        } else if (unlocked) {
          state = 'selected';
        }
        const classes = ['region-hotspot', state].filter(Boolean).join(' ');

        return (
          <button
            key={id}
            type="button"
            className={classes}
            style={{ left: `${region.hotspot.x}%`, top: `${region.hotspot.y}%` }}
            disabled={region.fixed}
            onClick={() => toggleRegion(id)}
            title={region.name}
            aria-pressed={unlocked}
          >
            <span className="region-hotspot-label">{region.name}</span>
          </button>
        );
      })}
    </div>
  );
}
