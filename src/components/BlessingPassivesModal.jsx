import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BLESSING_PASSIVE_TIERS } from '../data/blessings';

// A single button + modal pair for the "Blessing Passives Revealed" reference
// table (see data/blessings.js's BLESSING_PASSIVE_TIERS for why this is a
// separate progression track from the tier-1/2/3 blessing picker above it on
// the page). Reuses the site's shared .modal-overlay/.modal-panel pattern
// (see ReportIssueModal.jsx) via a portal, same as RelicDropTablePanel, so it
// looks/behaves like every other modal on the site (dim backdrop, click-
// outside-to-close, body scroll lock while open) - just wider, and rendered
// through a portal so it isn't affected by this button's own stacking
// context/overflow on the Blessings page header.
//
// Open/closed state is local-only - this is a supplementary reference
// lookup, not something that needs to survive a reload or be shared.
export default function BlessingPassivesModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button type="button" className="blessing-passives-toggle" onClick={() => setOpen(true)}>
        View Blessing Passives
      </button>
      {open &&
        createPortal(
          <div className="modal-overlay" onClick={() => setOpen(false)}>
            <div className="modal-panel blessing-passives-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h2>Blessing Passives Revealed</h2>
                <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Close">
                  &times;
                </button>
              </div>
              <p className="blessing-passives-hint">
                Passive perks unlocked by blessing progression overall - separate from which blessing you pick per
                tier above.
              </p>
              <div className="blessing-passives-grid">
                {BLESSING_PASSIVE_TIERS.map(({ tier, colour, passives }) => (
                  <div key={tier} className={`blessing-passives-column blessing-passives-column-${colour}`}>
                    <h3 className="blessing-passives-column-head">
                      <span>{tier}</span>
                      <span className="blessing-passives-ornament" aria-hidden="true">
                        <span className="blessing-passives-ornament-line" />
                        <span className="blessing-passives-ornament-diamond" />
                        <span className="blessing-passives-ornament-line" />
                      </span>
                    </h3>
                    <ul className="blessing-passives-list">
                      {passives.map((passive) => (
                        <li key={passive} className="blessing-passives-item">
                          {passive}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
