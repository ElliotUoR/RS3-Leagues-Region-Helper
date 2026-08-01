import { useState } from 'react';
import RetryImage from './RetryImage';
import TagTooltip from './TagTooltip';
import TierNoteModal from './TierNoteModal';
import { isSourceEditable, saveTierListChanges } from '../utils/buildTextEdit';

// Generic A-F tier list, rendered twice on the Build Guides page - once for
// blessings + god powers (BLESSING_TIER_LIST) and once for league relics
// (LEAGUE_RELIC_TIER_LIST). The two datasets carry different extra fields, so
// the caller passes a `renderBadges` function for whatever markers that
// particular list needs (T1/T2/T3 + GOD, or relic tier + "unlocks N items").
//
// Empty grade rows are rendered rather than skipped. Both lists have at least
// one empty grade by design - nothing in either is F-tier - and silently
// dropping the row reads as a rendering bug rather than as "nothing is this
// weak", which is the actual claim being made.
// 'unranked' is not a grade so much as the absence of one - see the relic list's
// use of it for entries nobody has assessed yet. Desaturated on purpose so it
// does not read as sitting on the same scale as A-F.
const GRADE_HUES = { A: 140, B: 95, C: 45, D: 25, E: 5, F: 220, unranked: 250 };

// The `import.meta.env.DEV &&` prefix is load-bearing, not belt-and-braces.
// isSourceEditable() checks it internally too, but a CALL cannot be folded at
// build time - written as just `isSourceEditable()` the customiser's markup
// stays in the production bundle (verified: the hint string was still in
// dist/). With the literal in front, this is statically `false` and every
// branch below it is dropped. Same reason BuildGuidesPage writes its own
// CAN_EDIT this way.
const CAN_CUSTOMISE = import.meta.env.DEV && isSourceEditable();

function entryClassName(entry, customising) {
  return [
    'tier-entry',
    entry.colour ? `tier-entry-${entry.colour}` : '',
    // League relics carry a per-relic hue instead of a red/green/blue blessing
    // colour - a real class rather than an attribute selector on the inline
    // custom property, which is unreliable.
    entry.hue != null ? 'tier-entry-relic' : '',
    customising ? 'tier-entry-draggable' : '',
    entry.dirty ? 'tier-entry-dirty' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

// One chip. While customising, the tooltip anchor is replaced by a plain
// draggable span: TagTooltip owns click and pointerdown for its bubble, which
// fights a drag gesture - and the note is reachable anyway by right-clicking,
// which is the only way to edit it.
function TierEntry({ entry, renderBadges, customising, onEditNote }) {
  const style = entry.hue != null ? { '--relic-hue': entry.hue } : undefined;
  const content = (
    <>
      {entry.icon && <RetryImage src={entry.icon} alt="" className="tier-entry-icon" />}
      <span className="tier-entry-name">{entry.name}</span>
      {renderBadges?.(entry)}
      {entry.asterisk && (
        <span className="tier-entry-asterisk" aria-hidden="true">
          *
        </span>
      )}
    </>
  );

  if (!customising) {
    return (
      <TagTooltip className={entryClassName(entry, false)} style={style} tooltip={entry.note}>
        {content}
      </TagTooltip>
    );
  }

  return (
    <span
      className={entryClassName(entry, true)}
      style={style}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', entry.name);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onEditNote(entry);
      }}
      title="Drag to another tier - right-click to edit its tooltip"
    >
      {content}
    </span>
  );
}

function TierRow({ grade, entries, renderBadges, gradeLabels, customising, onDropEntry, onEditNote }) {
  const hue = GRADE_HUES[grade] ?? 220;
  const [dragOver, setDragOver] = useState(false);
  // Grades are single letters, so the badge is sized for one character;
  // anything longer opts into a wrapped, smaller variant rather than
  // overflowing.
  const label = gradeLabels?.[grade] ?? grade;
  const isWordy = label.length > 2;
  const emptyText = customising ? 'Drop here' : 'Nothing ranks this low.';

  // A row is only a drop target while customising - outside that the handlers
  // are absent entirely rather than no-ops, so nothing intercepts a normal
  // drag-select of the text in these chips.
  const dropHandlers = customising
    ? {
        onDragOver: (event) => {
          event.preventDefault();
          setDragOver(true);
        },
        onDragLeave: () => setDragOver(false),
        onDrop: (event) => {
          event.preventDefault();
          setDragOver(false);
          const name = event.dataTransfer.getData('text/plain');
          if (name) onDropEntry(name, grade);
        },
      }
    : {};

  return (
    <div className="tier-row">
      <div
        className={`tier-grade${isWordy ? ' tier-grade-wordy' : ''}`}
        style={{ '--tier-hue': hue }}
        aria-label={isWordy ? label : `Grade ${label}`}
      >
        {label}
      </div>
      <div
        className={`tier-entries${customising ? ' tier-entries-droppable' : ''}${dragOver ? ' drag-over' : ''}`}
        onDragOver={dropHandlers.onDragOver}
        onDragLeave={dropHandlers.onDragLeave}
        onDrop={dropHandlers.onDrop}
      >
        {entries.length === 0 ? (
          <p className="tier-empty">{emptyText}</p>
        ) : (
          entries.map((entry) => (
            <TierEntry
              key={entry.name}
              entry={entry}
              renderBadges={renderBadges}
              customising={customising}
              onEditNote={onEditNote}
            />
          ))
        )}
      </div>
    </div>
  );
}

// `gradeLabels` maps a grade key to what the badge should read, for rows whose
// name is not the grade itself (e.g. { unranked: 'Unranked (below F)' }).
//
// `listId` ('blessings' | 'relics') names which export in blessingBuilds.js the
// customiser writes back to. Without it the list is read-only even on
// localhost - a list with nowhere to save to should not offer a Save button.
export default function TierList({ title, standfirst, grades, entries, renderBadges, footnote, gradeLabels, listId }) {
  const [customising, setCustomising] = useState(false);
  // The working copy, keyed by entry name -> { grade?, note? }. Only holds what
  // has actually been changed, which is exactly what gets POSTed - so an entry
  // dragged out and back again sends nothing.
  const [pending, setPending] = useState({});
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | saving | error
  const [error, setError] = useState(null);

  const canCustomise = CAN_CUSTOMISE && Boolean(listId);
  // `customising` alone is only ever true when canCustomise is - but it is
  // STATE, so a bundler cannot prove that. Everything conditional below reads
  // this instead, which starts from the compile-time constant and therefore
  // folds away completely in production.
  const active = canCustomise && customising;

  // Applied over the real data for rendering. The underlying module data is
  // never mutated: unticking Customise throws the working copy away, and a
  // successful save reloads the file through HMR instead.
  const shown = entries.map((entry) => {
    const change = pending[entry.name];
    if (!change) return entry;
    return { ...entry, ...change, dirty: true };
  });

  const changeCount = Object.keys(pending).length;
  let unsavedLabel = '';
  if (changeCount > 0) {
    unsavedLabel = ` ${changeCount} unsaved change${changeCount === 1 ? '' : 's'}.`;
  }

  function recordChange(name, patch) {
    setPending((prev) => {
      const original = entries.find((entry) => entry.name === name);
      const merged = { ...prev[name], ...patch };
      // Drop keys that match the file again, then the entry itself if nothing
      // is left - so dragging something back where it started is not a "change".
      for (const key of Object.keys(merged)) {
        if (original && merged[key] === original[key]) delete merged[key];
      }
      const next = { ...prev };
      if (Object.keys(merged).length === 0) delete next[name];
      else next[name] = merged;
      return next;
    });
  }

  function handleToggleCustomise(on) {
    setCustomising(on);
    setStatus('idle');
    setError(null);
    if (!on) setPending({});
  }

  async function handleSave() {
    if (changeCount === 0) {
      handleToggleCustomise(false);
      return;
    }
    setStatus('saving');
    setError(null);
    try {
      await saveTierListChanges(
        listId,
        Object.entries(pending).map(([name, change]) => ({ name, ...change })),
      );
      // Vite reloads blessingBuilds.js from disk, so the working copy has to go
      // - keeping it would layer the same edit on top of the saved file.
      setPending({});
      setCustomising(false);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  return (
    <section className="tier-list">
      <div className="tier-list-head">
        <h2 className="tier-list-title">{title}</h2>
        {canCustomise && (
          <div className="tier-customise-bar">
            <label className="tier-customise-toggle">
              <input
                type="checkbox"
                checked={customising}
                onChange={(event) => handleToggleCustomise(event.target.checked)}
              />
              <span>Customise</span>
            </label>
            {active && (
              <>
                <span className="tier-customise-hint">
                  Drag between tiers, right-click to edit a tooltip.{unsavedLabel}
                </span>
                <button
                  type="button"
                  className="tier-customise-save"
                  onClick={handleSave}
                  disabled={status === 'saving'}
                >
                  {status === 'saving' ? 'Saving…' : 'Save'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {active && <p className="tier-customise-note">Localhost only. Saving writes into <code>src/data/blessingBuilds.js</code>.</p>}
      {active && status === 'error' && <p className="tier-customise-error">Couldn&apos;t save: {error}</p>}
      {standfirst && <p className="tier-list-standfirst">{standfirst}</p>}
      <div className="tier-list-rows">
        {grades.map((grade) => (
          <TierRow
            key={grade}
            grade={grade}
            entries={shown.filter((entry) => entry.grade === grade)}
            renderBadges={renderBadges}
            gradeLabels={gradeLabels}
            customising={active}
            onDropEntry={(name, toGrade) => recordChange(name, { grade: toGrade })}
            onEditNote={setEditing}
          />
        ))}
      </div>
      {footnote && <p className="tier-list-footnote">{footnote}</p>}
      {active && editing && (
        <TierNoteModal
          entry={shown.find((entry) => entry.name === editing.name) ?? editing}
          onCancel={() => setEditing(null)}
          onApply={(note) => {
            recordChange(editing.name, { note });
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}
