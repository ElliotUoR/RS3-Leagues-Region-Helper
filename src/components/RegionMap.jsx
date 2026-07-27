import { useState } from 'react';
import { REGIONS, REGION_IDS } from '../data/regions';
import { REGION_BOUNDARIES } from '../data/regionBoundaries';

// Native pixel size of the traced boundary image (see
// scripts/extract-region-boundaries.mjs) - the SVG viewBox has to match
// this exactly so the shapes line up with map.jpg underneath.
const VIEW_WIDTH = 820;
const VIEW_HEIGHT = 426;

// A region can have more than one polygon (e.g. Havenhythe's small outlying
// islands) - joined into a single path's `d` so the whole region is one
// shape, one focus stop, one click target, regardless of how many
// disconnected pieces it's made of.
function pathDataFor(id) {
  const polygons = REGION_BOUNDARIES[id];
  return polygons && polygons.length > 0 ? polygons.join(' ') : null;
}

export default function RegionMap({ isUnlocked, toggleRegion }) {
  const [hoveredId, setHoveredId] = useState(null);

  function handleKeyDown(event, id) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleRegion(id);
  }

  return (
    <div className="region-map">
      <img src={`${import.meta.env.BASE_URL}map.jpg`} alt="Map of Gielinor showing Leagues regions" />
      <svg
        className="region-map-overlay"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
      >
        {REGION_IDS.map((id) => {
          const d = pathDataFor(id);
          if (!d) return null;

          const region = REGIONS[id];
          const unlocked = isUnlocked(id);
          let state = 'unselected';
          if (region.fixed) state = 'fixed';
          else if (unlocked) state = 'selected';

          const classes = ['region-shape', state, hoveredId === id ? 'hovered' : '']
            .filter(Boolean)
            .join(' ');

          return (
            <path
              key={id}
              d={d}
              className={classes}
              style={{ '--region-color': region.color }}
              role={region.fixed ? undefined : 'button'}
              tabIndex={region.fixed ? undefined : 0}
              aria-pressed={region.fixed ? undefined : unlocked}
              aria-label={region.name}
              onClick={() => !region.fixed && toggleRegion(id)}
              onKeyDown={region.fixed ? undefined : (event) => handleKeyDown(event, id)}
              onMouseEnter={() => setHoveredId(id)}
              onMouseLeave={() => setHoveredId((prev) => (prev === id ? null : prev))}
              onFocus={() => setHoveredId(id)}
              onBlur={() => setHoveredId((prev) => (prev === id ? null : prev))}
            >
              <title>{region.name}</title>
            </path>
          );
        })}
      </svg>
    </div>
  );
}
