import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RELIC_PASSIVE_TIERS } from '../data/leagueRelics';

// A single button + modal pair for the "Relic Passives Revealed" reference
// table - same relationship to LEAGUE_RELICS that BlessingPassivesModal has
// to the blessing tier picker (see data/leagueRelics.js's RELIC_PASSIVE_TIERS
// comment). Deliberately a DIFFERENT layout from the blessing passives grid
// rather than the same 4-column card grid recoloured: the reveal image's own
// framing - "as you progress through each tier" - reads as a path, so this
// renders as a single horizontal track with a connecting line, gold
// medallion "milestones" on the 4 tiers that carry an XP multiplier, and
// plain waypoint nodes on the 3 that don't (Tier 3/5/7 per the reveal image -
// not a data gap, see the data file's own comment).
//
// Open/closed state is local-only, same as BlessingPassivesModal - a
// supplementary reference lookup, not something that needs to persist.
export default function RelicPassivesModal() {
  const [open, setOpen] = useState(false);
  const trackRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startScrollLeft: 0, moved: false });

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Click-and-drag horizontal scrolling for the path - the table is wider
  // than the modal even at a sensible modal width (7 tiers), so besides the
  // native scrollbar (see .relic-passives-track's custom green/gold styling
  // in index.css) a click-drag anywhere on the track itself pans it, the
  // same interaction pattern as dragging a map.
  //
  // move/up are attached to `window`, not the track div, and ONLY while a
  // drag is actually active - releasing the mouse button anywhere (over the
  // modal backdrop, outside the browser viewport, wherever) still ends the
  // drag. The first version of this attached move/up as JSX props on the
  // track div itself, scoped to that element; releasing the button while the
  // cursor happened to be outside the div meant the div's own mouseup never
  // fired, so `dragRef.current.active` stayed stuck `true` - every mouse
  // movement over the track from then on (even with no button held at all)
  // kept re-triggering the scroll-follows-cursor logic, which is what read
  // as the content "scrolling forever".
  function handleMouseMove(event) {
    if (!dragRef.current.active) return;
    const el = trackRef.current;
    if (!el) return;
    event.preventDefault();
    const delta = event.pageX - dragRef.current.startX;
    el.scrollLeft = dragRef.current.startScrollLeft - delta;
  }

  function handleMouseUp() {
    dragRef.current.active = false;
    trackRef.current?.classList.remove('is-dragging');
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  function handleMouseDown(event) {
    const el = trackRef.current;
    if (!el) return;
    dragRef.current = { active: true, startX: event.pageX, startScrollLeft: el.scrollLeft };
    el.classList.add('is-dragging');
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  // Safety net for the same stuck-drag scenario if the modal itself closes
  // (unmounting the track) while a drag is mid-flight - without this the
  // listeners above would leak on `window` indefinitely since nothing else
  // would ever call handleMouseUp to remove them.
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <button type="button" className="relic-passives-toggle" onClick={() => setOpen(true)}>
        View Relic Passives
      </button>
      {open &&
        createPortal(
          <div className="modal-overlay" onClick={() => setOpen(false)}>
            <div className="modal-panel relic-passives-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h2>Relic Passives Revealed</h2>
                <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Close">
                  &times;
                </button>
              </div>
              <p className="relic-passives-hint">
                All passives for a tier unlock regardless of relic choice - progress through each tier to stack
                passive buffs and XP multipliers on top of one another. Click and drag, or scroll, to see every
                tier.
              </p>
              <div className="relic-passives-track" ref={trackRef} onMouseDown={handleMouseDown}>
                {/* One short connecting segment per stop (each stop's own
                    ::before in index.css) rather than a single line spanning
                    the whole row - a lone absolutely-positioned bar measured
                    against the row's own computed width kept disagreeing
                    between Chrome and Firefox (both the pre-scroll-viewport
                    bug and, after that fix, a Firefox-specific shrink-wrap
                    discrepancy). Each segment's containing block is instead
                    its own fixed-width stop, a value every layout engine
                    agrees on identically, so there's nothing left to disagree
                    about. */}
                <div className="relic-passives-path">
                  {RELIC_PASSIVE_TIERS.map(({ tier, xpMultiplier, passives }) => (
                    <div key={tier} className={`relic-passives-stop${xpMultiplier ? ' has-multiplier' : ''}`}>
                      <span className="relic-passives-node" aria-hidden="true" />
                      {xpMultiplier ? (
                        <span className="relic-passives-medallion">
                          <span className="relic-passives-medallion-value">{xpMultiplier.split(' ')[0]}</span>
                          <span className="relic-passives-medallion-label">XP</span>
                        </span>
                      ) : (
                        <span className="relic-passives-medallion-spacer" aria-hidden="true" />
                      )}
                      <h3 className="relic-passives-stop-head">{tier}</h3>
                      <ul className="relic-passives-list">
                        {passives.map((passive) => (
                          <li key={passive} className="relic-passives-item">
                            {passive}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
