import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { COMBAT_STYLES } from '../data/gear';
import { REGIONS } from '../data/regions';
import { stagesForStyle, stylesInBuild } from '../utils/importableBuild';
import { choosesNothing, defaultChoicesFor, untouchedStyles } from '../utils/loadBuildIntoMine';
import { IS_PAGES_BUILD } from '../utils/deployTarget';

// "Use this build" - the fork behind what used to be a single "Copy into new
// build" link.
//
// Two destinations that differ in one important way: copying starts a DRAFT
// (nothing you own changes until you publish), loading overwrites the setup you
// already have. That asymmetry is why the second screen exists at all - it is
// the confirmation as well as the configuration, since there is no undo, and a
// separate "are you sure" on top would only train people to click through it.

const STYLE_LABELS = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic', necromancy: 'Necromancy' };

const CATEGORIES = [
  { key: 'regions', label: 'Regions', field: 'regions', display: (id) => REGIONS[id]?.name ?? id },
  { key: 'leagueRelics', label: 'League relics', field: 'leagueRelics' },
  { key: 'archRelics', label: 'Arch relics', field: 'archRelics' },
  { key: 'blessings', label: 'Blessings', field: 'blessings' },
  { key: 'extras', label: 'Extras', field: 'extras' },
];

const listOf = (values, display) => values.map((v) => (display ? display(v) : v)).join(', ');

export default function UseBuildModal({ buildName, importable, loading, error, onCopy, onLoad, onClose }) {
  const [screen, setScreen] = useState('choose'); // choose | configure
  const [choices, setChoices] = useState(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const styles = stylesInBuild(importable);

  function openConfigure() {
    setChoices(defaultChoicesFor(importable));
    setScreen('configure');
  }

  const toggleCategory = (key) => setChoices((prev) => ({ ...prev, [key]: !prev[key] }));

  // Absent from `gear` means "do not touch this style", which is also what an
  // unticked box means - so the toggle adds and removes the key rather than
  // storing a false alongside a stage index.
  function toggleStyle(style) {
    setChoices((prev) => {
      const gear = { ...prev.gear };
      if (style in gear) delete gear[style];
      else gear[style] = stagesForStyle(importable, style).at(-1).index;
      return { ...prev, gear };
    });
  }

  const setStage = (style, index) =>
    setChoices((prev) => ({ ...prev, gear: { ...prev.gear, [style]: index } }));

  // Only worth a picker when there is a real choice to make. Most builds have
  // one stage, and a dropdown with a single option is just noise.
  const multiStage = (importable?.stages?.length ?? 0) > 1;
  const untouched = choices ? untouchedStyles(choices, COMBAT_STYLES) : [];

  let body;
  if (loading) {
    body = <p className="build-setup-note">Loading this build…</p>;
  } else if (error || !importable) {
    body = (
      <>
        <p className="build-setup-note">
          Couldn&apos;t load the full build, so it can&apos;t be loaded into My Build. Copying it into a
          build guide still works.
        </p>
        {onCopy && !IS_PAGES_BUILD && (
          <div className="confirm-modal-actions">
            <button type="button" className="confirm-modal-cancel" onClick={onClose}>
              Close
            </button>
            <button type="button" className="use-build-option-go" onClick={onCopy}>
              Copy into a build guide
            </button>
          </div>
        )}
      </>
    );
  } else if (screen === 'choose') {
    body = (
      <div className="use-build-options">
        {/* Hidden on the Pages mirror for the same reason Create a Build is -
            publishing needs the backend. Loading into My Build is pure
            localStorage and works there. */}
        {onCopy && !IS_PAGES_BUILD && (
          <button type="button" className="use-build-option" onClick={onCopy}>
            <span className="use-build-option-title">Copy into a build guide</span>
            <span className="use-build-option-note">
              Opens a new build guide pre-filled from this one. Publishes as a brand new build with its own
              edit link - nothing you already have changes.
            </span>
          </button>
        )}
        <button
          type="button"
          className="use-build-option"
          onClick={openConfigure}
          disabled={styles.length === 0}
        >
          <span className="use-build-option-title">Load into My Build</span>
          <span className="use-build-option-note">
            Puts this build into your own saved setup, so you can tweak it in the planner. Overwrites what you
            have - you choose which parts on the next screen.
          </span>
        </button>
      </div>
    );
  } else {
    body = (
      <>
        <p className="use-build-lead">
          Everything ticked will replace what you have. This can&apos;t be undone.
        </p>

        <ul className="use-build-categories">
          {CATEGORIES.map((category) => {
            const values = importable[category.field];
            // A build with no Arch relics should not be offering to overwrite
            // yours with nothing.
            if (!values || values.length === 0) return null;
            return (
              <li key={category.key}>
                <label className="use-build-check">
                  <input
                    type="checkbox"
                    checked={Boolean(choices[category.key])}
                    onChange={() => toggleCategory(category.key)}
                  />
                  <span className="use-build-check-label">{category.label}</span>
                  <span className="use-build-check-values">{listOf(values, category.display)}</span>
                </label>
              </li>
            );
          })}

          {styles.map((style) => {
            const stages = stagesForStyle(importable, style);
            const taking = style in choices.gear;
            return (
              <li key={style}>
                <label className="use-build-check">
                  <input type="checkbox" checked={taking} onChange={() => toggleStyle(style)} />
                  <span className="use-build-check-label">{STYLE_LABELS[style]} gear</span>
                  {multiStage && stages.length > 1 ? (
                    // Stopping the click reaching the label keeps choosing a
                    // stage from also toggling the checkbox it sits inside.
                    <select
                      className="use-build-stage"
                      value={choices.gear[style] ?? stages.at(-1).index}
                      disabled={!taking}
                      onClick={(event) => event.preventDefault()}
                      onChange={(event) => setStage(style, Number(event.target.value))}
                    >
                      {stages.map((stage) => (
                        <option key={stage.index} value={stage.index}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="use-build-check-values">
                      {multiStage ? stages[0].label : `${Object.keys(stages[0].loadout.slots).length} items`}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>

        {/* The reassuring half - what survives. Without it a partial overwrite
            reads as a total one. */}
        {untouched.length > 0 && (
          <p className="use-build-untouched">
            Untouched: your {untouched.map((style) => STYLE_LABELS[style]).join(', ')} gear.
          </p>
        )}

        <div className="confirm-modal-actions">
          <button type="button" className="confirm-modal-cancel" onClick={() => setScreen('choose')}>
            Back
          </button>
          <button
            type="button"
            className="confirm-modal-confirm"
            disabled={choosesNothing(choices)}
            onClick={() => onLoad(choices)}
          >
            Load into My Build
          </button>
        </div>
      </>
    );
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel use-build-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{screen === 'configure' ? 'What to load' : 'Use this build'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        {buildName && <p className="use-build-name">{buildName}</p>}
        {body}
      </div>
    </div>,
    document.body,
  );
}
