import { useLayoutEffect, useRef, useState } from 'react';
import BossRow from './BossRow';
import {
  ACTIVITIES,
  BOSSES,
  FIXED_REGIONS,
  GATEWAY_REGIONS,
  MAX_OPTIONAL,
  MONSTERS,
  OPTIONAL_REGIONS,
  REGIONS,
} from '../data/regions';

// A gateway region that's currently toggled off has nothing to expand (no
// regional content is actually reachable) - shown as a plain faded row with
// the same "!" warning affordance the old compact list used, instead of an
// expandable card.
function OffGatewayRow({ id, openWarningId, toggleWarning, setOpenWarningId }) {
  const region = REGIONS[id];
  return (
    <div className="unlock-region unlock-region-off">
      <h3>
        <span className="region-name-faded">{region.name}</span>
        <button
          type="button"
          className="region-warning-icon"
          title={`${region.name} not unlocked yet`}
          aria-label={`${region.name} not unlocked yet`}
          onClick={() => toggleWarning(id)}
          onBlur={() => setOpenWarningId((prev) => (prev === id ? null : prev))}
        >
          !
          {openWarningId === id && (
            <span className="region-warning-tooltip" role="tooltip">
              {region.name} not unlocked yet
            </span>
          )}
        </button>
      </h3>
    </div>
  );
}

function RegionCard({ id, badge, isMinimised, toggleMinimised }) {
  const region = REGIONS[id];
  const bosses = BOSSES.filter((b) => b.region === id && !b.quest);
  const activities = ACTIVITIES.filter((a) => a.region === id);
  const monsters = MONSTERS.filter((m) => m.region === id);

  return (
    <div className="unlock-region">
      <h3>
        <button
          type="button"
          className="unlock-region-toggle"
          onClick={() => toggleMinimised(id)}
          aria-expanded={!isMinimised}
          aria-label={`${isMinimised ? 'Expand' : 'Minimise'} ${region.name} unlocks`}
        >
          {isMinimised ? '+' : '−'}
        </button>
        <button type="button" className="unlock-region-name" onClick={() => toggleMinimised(id)}>
          {region.name}
        </button>
        {badge}
      </h3>
      {!isMinimised && (
        <>
          {region.includes && <p className="region-includes">Includes: {region.includes.join(', ')}</p>}
          {bosses.length > 0 ? (
            <ul className="boss-list">
              {bosses.map((b) => (
                <BossRow key={b.name} boss={b} />
              ))}
            </ul>
          ) : (
            activities.length === 0 &&
            monsters.length === 0 && <p className="region-empty">No boss data added for this region yet.</p>
          )}
          {activities.length > 0 && (
            <>
              <h4 className="unlock-region-subheading">Other unlocks</h4>
              <ul className="boss-list">
                {activities.map((a) => (
                  <BossRow key={a.name} boss={a} />
                ))}
              </ul>
            </>
          )}
          {monsters.length > 0 && (
            <>
              <h4 className="unlock-region-subheading">Monster drops</h4>
              <ul className="boss-list">
                {monsters.map((m) => (
                  <BossRow key={m.name} boss={m} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function RegionPicker({ selected, isUnlocked, overLimit, clearRegions }) {
  const [openWarningId, setOpenWarningId] = useState(null);
  // Which region cards are expanded - deliberately in-memory only and always
  // starts empty (everything minimised by default), rather than restored
  // from storage. RegionPicker unmounts whenever you navigate to another tab
  // (see App.jsx's route === 'home' check) and remounts fresh when you come
  // back, so this naturally resets on every visit and for every newly
  // unlocked region without any extra reset logic being needed.
  const [expanded, setExpanded] = useState(() => new Set());
  const unlockedOptional = OPTIONAL_REGIONS.filter((id) => isUnlocked(id));

  // Animates the card list's height whenever a region is added or removed
  // (a card mounts/unmounts) instead of the panel snapping straight to its
  // new size - there's no CSS way to transition between two "auto" heights,
  // so this is a small manual FLIP: measure, jump to the old height, force a
  // reflow, then transition to the new one. Only fires on membership
  // changes (tracked via `cardSignature`), not when a card is individually
  // expanded/collapsed - the height is still re-measured every render so it
  // never uses a stale start point once one of those did change things.
  const bodyRef = useRef(null);
  const prevSignatureRef = useRef(null);
  const prevHeightRef = useRef(null);
  const cleanupRef = useRef(null);
  const gatewaySignature = GATEWAY_REGIONS.map((id) => (isUnlocked(id) ? '1' : '0')).join('');
  const cardSignature = `${unlockedOptional.join(',')}|${gatewaySignature}`;

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const newHeight = el.scrollHeight;
    const signatureChanged = prevSignatureRef.current !== null && prevSignatureRef.current !== cardSignature;

    if (signatureChanged && prevHeightRef.current !== null && prevHeightRef.current !== newHeight) {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      el.style.height = `${prevHeightRef.current}px`;
      el.style.overflow = 'hidden';
      // Reading offsetHeight (assigned to nothing on purpose) forces the
      // browser to flush the height change above before continuing, so the
      // transition below animates from that value instead of skipping it.
      // eslint-disable-next-line no-unused-expressions
      el.offsetHeight;
      el.style.transition = 'height 0.3s ease';
      el.style.height = `${newHeight}px`;

      const onEnd = (event) => {
        if (event.propertyName !== 'height') return;
        el.style.transition = '';
        el.style.height = '';
        el.style.overflow = '';
        el.removeEventListener('transitionend', onEnd);
        cleanupRef.current = null;
      };
      el.addEventListener('transitionend', onEnd);
      cleanupRef.current = () => {
        el.removeEventListener('transitionend', onEnd);
        el.style.transition = '';
        el.style.height = '';
        el.style.overflow = '';
      };
    }

    prevSignatureRef.current = cardSignature;
    prevHeightRef.current = newHeight;
  });

  function toggleWarning(id) {
    setOpenWarningId((prev) => (prev === id ? null : id));
  }

  function toggleExpanded(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="region-picker">
      <div className="region-picker-heading">
        <h2>
          Regions <span className="region-picker-count">- {selected.length}/{MAX_OPTIONAL}</span>
          {overLimit && (
            <button
              type="button"
              className="region-warning-icon"
              title="Region limit exceeded"
              aria-label="Region limit exceeded"
              onClick={() => toggleWarning('regionLimit')}
              onBlur={() => setOpenWarningId((prev) => (prev === 'regionLimit' ? null : prev))}
            >
              !
              {openWarningId === 'regionLimit' && (
                <span className="region-warning-tooltip" role="tooltip">
                  Region limit exceeded
                </span>
              )}
            </button>
          )}
        </h2>
        <button
          type="button"
          className="clear-regions-button"
          onClick={clearRegions}
          disabled={selected.length === 0}
        >
          Clear
        </button>
      </div>

      <div className="unlocks-list-body" ref={bodyRef}>
        {FIXED_REGIONS.map((id) => (
          <RegionCard
            key={id}
            id={id}
            badge={<span className="badge">always unlocked</span>}
            isMinimised={!expanded.has(id)}
            toggleMinimised={toggleExpanded}
          />
        ))}
        {GATEWAY_REGIONS.map((id) =>
          isUnlocked(id) ? (
            <RegionCard
              key={id}
              id={id}
              badge={<span className="badge badge-gateway">unlocked second</span>}
              isMinimised={!expanded.has(id)}
              toggleMinimised={toggleExpanded}
            />
          ) : (
            <OffGatewayRow
              key={id}
              id={id}
              openWarningId={openWarningId}
              toggleWarning={toggleWarning}
              setOpenWarningId={setOpenWarningId}
            />
          ),
        )}
        {unlockedOptional.map((id) => (
          <RegionCard
            key={id}
            id={id}
            isMinimised={!expanded.has(id)}
            toggleMinimised={toggleExpanded}
          />
        ))}
      </div>

      {overLimit && (
        <p className="region-limit-note">
          You've selected more than {MAX_OPTIONAL} regions - that's over the Leagues limit.
        </p>
      )}
    </div>
  );
}
