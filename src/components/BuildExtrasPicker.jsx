import RetryImage from './RetryImage';
import { availableBuildExtras } from '../data/buildExtras';

// The Extras picker, shared by the build editor and My Build.
//
// Renders nothing at all unless the regions currently picked actually unlock
// something. There is nothing to say to a build that cannot take any of it, and
// an always-visible empty section reads as a bug rather than as a gate.
//
// `selected` is the RAW pick list, not the region-filtered one - a box stays
// ticked while its region is off so re-picking the region brings it back. What
// the build is worth right now comes from activeBuildExtras (see
// data/buildExtras.js), which every consumer of the effect reads instead.
export default function BuildExtrasPicker({ regions = [], selected = [], onToggle, heading = 'Extras', hint }) {
  const offered = availableBuildExtras(regions);
  if (offered.length === 0) return null;

  return (
    <div className="create-build-extras">
      {heading && <h3>{heading}</h3>}
      {hint && <p className="create-build-hint">{hint}</p>}
      {offered.map((extra) => (
        <label key={extra.name} className="create-build-extra">
          <input
            type="checkbox"
            checked={selected.includes(extra.name)}
            onChange={() => onToggle(extra.name)}
          />
          {extra.icon && <RetryImage src={extra.icon} alt="" className="create-build-extra-icon" />}
          <span className="create-build-extra-text">
            <strong>{extra.name}</strong>
            {extra.summary && <span className="create-build-extra-summary">{extra.summary}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
