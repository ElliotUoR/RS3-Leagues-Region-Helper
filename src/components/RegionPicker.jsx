import { FIXED_REGIONS, MAX_OPTIONAL, OPTIONAL_REGIONS, REGIONS } from '../data/regions';

export default function RegionPicker({ selected, isUnlocked, toggleRegion, overLimit, clearRegions }) {
  return (
    <div className="region-picker">
      <div className="region-picker-heading">
        <h2>Regions</h2>
        <button
          type="button"
          className="clear-regions-button"
          onClick={clearRegions}
          disabled={selected.length === 0}
        >
          Clear regions
        </button>
      </div>

      <fieldset className="region-group">
        <legend>Always unlocked</legend>
        {FIXED_REGIONS.map((id) => (
          <label key={id} className="region-checkbox fixed">
            <input type="checkbox" checked disabled readOnly />
            {REGIONS[id].name}
          </label>
        ))}
      </fieldset>

      <fieldset className="region-group">
        <legend>
          Pick {MAX_OPTIONAL} ({selected.length}/{MAX_OPTIONAL} selected)
        </legend>
        {OPTIONAL_REGIONS.map((id) => {
          const unlocked = isUnlocked(id);
          return (
            <label key={id} className="region-checkbox">
              <input type="checkbox" checked={unlocked} onChange={() => toggleRegion(id)} />
              {REGIONS[id].name}
            </label>
          );
        })}
        {overLimit && (
          <p className="region-limit-note">
            You've selected more than {MAX_OPTIONAL} regions — that's over the Leagues limit.
          </p>
        )}
      </fieldset>
    </div>
  );
}
