import { useEffect, useMemo, useState } from 'react';
import TierEntryChip from '../components/TierEntryChip';
import { TIER_LIST_BADGES } from '../utils/tierBadgeMap';
import { GRADE_HUES, RANKED_GRADES } from '../utils/tierChipStyles';
import { TIER_LIST_LABELS, itemNamesFor, itemsFor, tierListTitle } from '../data/tierListItems';
import { IS_PAGES_BUILD } from '../utils/deployTarget';
import { saveTierList, tierListImageUrl } from '../utils/api';
import { copyShareLink } from '../utils/shareLink';
import { tierListShareUrl } from '../utils/tierListRoute';
import {
  ANGLE_EXAMPLES,
  MAX_LENGTHS,
  ROW_COUNT,
  TIER_LIST_TYPES,
  clearDraft,
  emptyDraft,
  loadDraft,
  saveDraft,
  sortedCount,
} from '../utils/tierListDraft';

// The Unsorted row is index -1 rather than a row of its own in `placements`:
// unsorted IS the absence of a placement (see utils/tierListDraft.js), so
// dropping something back here deletes its entry rather than storing a
// sentinel.
const UNSORTED = -1;

const SHARE_LABELS = {
  idle: 'Finish and share',
  working: 'Saving…',
  copied: 'Link copied',
  manual: 'Link ready',
};

const EXPORT_LABELS = { idle: 'Export as image', working: 'Rendering…', done: 'Downloaded' };

function TierMakerRow({ label, hue, index, entries, renderBadges, onRename, onDropEntry, onDragStartEntry }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="tier-row">
      {index === UNSORTED ? (
        <div className="tier-grade tier-grade-wordy" style={{ '--tier-hue': hue }} aria-label="Unsorted">
          Unsorted
        </div>
      ) : (
        // The label is an input, not text: rows are renamable, and a separate
        // "edit" affordance for seven one-word fields would be more chrome than
        // the thing it edits.
        <input
          type="text"
          // Shrinks the moment the label stops being a single letter, so a
          // renamed row reads in full instead of being clipped mid-word.
          className={`tier-grade tier-grade-input${label.length > 2 ? ' tier-grade-input-long' : ''}`}
          style={{ '--tier-hue': hue }}
          value={label}
          maxLength={MAX_LENGTHS.rowLabel}
          aria-label={`Name for tier ${index + 1}`}
          onChange={(event) => onRename(index, event.target.value)}
        />
      )}
      <div
        className={`tier-entries tier-entries-droppable${dragOver ? ' drag-over' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const name = event.dataTransfer.getData('text/plain');
          if (name) onDropEntry(name, index);
        }}
      >
        {entries.length === 0 ? (
          <p className="tier-empty">{index === UNSORTED ? 'Everything is sorted.' : 'Drop here'}</p>
        ) : (
          entries.map((entry) => (
            <TierEntryChip
              key={entry.name}
              entry={entry}
              renderBadges={renderBadges}
              draggable
              onDragStart={(event) => onDragStartEntry(event, entry.name)}
              title="Drag into a tier - click for what it does"
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function TierListMakerPage() {
  const [type, setType] = useState('blessings');
  const items = useMemo(() => itemsFor(type), [type]);
  const itemNames = useMemo(() => itemNamesFor(type), [type]);

  // One draft per type, loaded lazily and kept apart - switching the toggle
  // must never discard the other list's work.
  const [drafts, setDrafts] = useState(() => ({
    blessings: loadDraft('blessings', itemNamesFor('blessings')),
    relics: loadDraft('relics', itemNamesFor('relics')),
  }));
  const draft = drafts[type];
  const [shareStatus, setShareStatus] = useState('idle');
  const [shareUrl, setShareUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [exportStatus, setExportStatus] = useState('idle');

  // A shared link points at a snapshot. The moment the draft changes it stops
  // describing what is on screen, so it is cleared rather than left to mislead.
  useEffect(() => {
    setShareStatus('idle');
    setShareUrl(null);
    setSaveError(null);
    setExportStatus('idle');
  }, [draft]);

  // Every change writes through immediately. There is no Save for the draft -
  // "come back and continue where you were" only holds if closing the tab
  // mid-drag is safe.
  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  function update(patch) {
    setDrafts((prev) => ({ ...prev, [type]: { ...prev[type], ...patch } }));
  }

  function placeEntry(name, rowIndex) {
    setDrafts((prev) => {
      const current = prev[type];
      const placements = { ...current.placements };
      if (rowIndex === UNSORTED) delete placements[name];
      else placements[name] = rowIndex;
      return { ...prev, [type]: { ...current, placements } };
    });
  }

  function renameRow(index, label) {
    const rowLabels = draft.rowLabels.map((existing, i) => (i === index ? label : existing));
    update({ rowLabels });
  }

  function startOver() {
    clearDraft(type);
    setDrafts((prev) => ({ ...prev, [type]: emptyDraft(type) }));
  }

  const entriesInRow = (rowIndex) =>
    items.filter((item) => (draft.placements[item.name] ?? UNSORTED) === rowIndex);

  function startDrag(event, name) {
    event.dataTransfer.setData('text/plain', name);
    event.dataTransfer.effectAllowed = 'move';
  }

  const placed = sortedCount(draft, itemNames);
  const total = itemNames.length;

  // A list is finishable as soon as ONE entry is placed. Not "everything
  // sorted" - leaving entries unranked is itself a statement, and the shared
  // page shows an Unsorted row when there is one - and not "has a name", since
  // the name is optional (an unnamed list is "My blessing tier list").
  const canFinish = placed > 0;
  const finishHint = canFinish
    ? 'Saves your list and copies a link to it.'
    : 'Sort at least one entry to finish.';

  // Both buttons save first. The server dedupes by content, so pressing Share
  // and then Export stores ONE list and returns the same code twice - which is
  // also why the image can only exist for a list that has been saved: it is
  // drawn server-side by the same renderer that draws the link preview.
  function persist() {
    return saveTierList({
      type: draft.type,
      authorName: draft.authorName.trim(),
      angle: draft.angle.trim(),
      rowLabels: draft.rowLabels,
      placements: draft.placements,
    });
  }

  async function handleShare() {
    if (!canFinish || saving) return;
    setSaving(true);
    setSaveError(null);
    setShareStatus('working');
    try {
      const { code } = await persist();
      const url = tierListShareUrl(draft.type, code);
      setShareUrl(url);
      setShareStatus(await copyShareLink(url));
    } catch (err) {
      setShareStatus('idle');
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    if (!canFinish || saving) return;
    setSaving(true);
    setSaveError(null);
    setExportStatus('working');
    try {
      const { code } = await persist();
      setShareUrl(tierListShareUrl(draft.type, code));
      // Fetched as a blob and clicked through an object URL rather than just
      // pointing an <a download> at the endpoint: a cross-origin-ish download
      // attribute is ignored by some browsers, which would open the PNG in a
      // tab instead of saving it.
      const response = await fetch(tierListImageUrl(draft.type, code));
      if (!response.ok) throw new Error(`image render failed (${response.status})`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${draft.authorName.trim() || 'my'}-${draft.type}-tier-list.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setExportStatus('done');
    } catch (err) {
      setExportStatus('idle');
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header>
        <h1>Tier list maker</h1>
        <p>
          Rank every blessing or league relic yourself. Drag from Unsorted into a tier, rename the tiers if you
          want, and say what your list is for - a points-capping list and a speedrun list disagree about almost
          everything, and the context is half the value.
        </p>
      </header>

      <main className="tier-maker-page">
        <div className="tier-maker-types" role="tablist" aria-label="What to rank">
          {TIER_LIST_TYPES.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={type === id}
              className={`tier-maker-type${type === id ? ' active' : ''}`}
              onClick={() => setType(id)}
            >
              {TIER_LIST_LABELS[id]}
            </button>
          ))}
        </div>

        <div className="tier-maker-meta">
          <label className="tier-maker-field">
            <span>What's your angle?</span>
            <input
              type="text"
              value={draft.angle}
              maxLength={MAX_LENGTHS.angle}
              placeholder={ANGLE_EXAMPLES[0]}
              onChange={(event) => update({ angle: event.target.value })}
            />
            <span className="tier-maker-field-hint">e.g. {ANGLE_EXAMPLES.join(', ')}</span>
          </label>
          <label className="tier-maker-field tier-maker-field-name">
            <span>Your name (optional)</span>
            <input
              type="text"
              value={draft.authorName}
              maxLength={MAX_LENGTHS.authorName}
              placeholder="Leave blank for &quot;My tier list&quot;"
              onChange={(event) => update({ authorName: event.target.value })}
            />
            <span className="tier-maker-field-hint">{tierListTitle(draft.authorName, draft.type)}</span>
          </label>
        </div>

        <div className="tier-maker-status">
          <span>
            <strong>{placed}</strong> of {total} sorted
          </span>
          <span className="tier-maker-autosave">Saved in this browser as you go.</span>
          <button type="button" className="tier-maker-reset" onClick={startOver}>
            Start over
          </button>
        </div>

        <div className="tier-list-rows tier-maker-rows">
          {Array.from({ length: ROW_COUNT }, (_, index) => (
            <TierMakerRow
              key={index}
              label={draft.rowLabels[index]}
              // Hue follows the row's POSITION, not its label - a renamed row
              // keeps the colour of the rank it sits at.
              hue={GRADE_HUES[RANKED_GRADES[index]]}
              index={index}
              entries={entriesInRow(index)}
              renderBadges={TIER_LIST_BADGES[type]}
              onRename={renameRow}
              onDropEntry={placeEntry}
              onDragStartEntry={startDrag}
            />
          ))}
          {/* Unsorted sits at the BOTTOM - it is the pile you are working
              through, not a rank, so it should not push the actual ranking
              down the page as it empties. */}
          <TierMakerRow
            label="Unsorted"
            hue={GRADE_HUES.unsorted}
            index={UNSORTED}
            entries={entriesInRow(UNSORTED)}
            renderBadges={TIER_LIST_BADGES[type]}
            onRename={renameRow}
            onDropEntry={placeEntry}
            onDragStartEntry={startDrag}
          />
        </div>

        {!IS_PAGES_BUILD && (
          <div className="tier-maker-finish">
            <button
              type="button"
              className="build-create-button"
              onClick={handleShare}
              disabled={!canFinish || saving}
            >
              {SHARE_LABELS[shareStatus]}
            </button>
            <button
              type="button"
              className="build-see-user-builds-button"
              onClick={handleExport}
              disabled={!canFinish || saving}
            >
              {EXPORT_LABELS[exportStatus]}
            </button>
            <span className="tier-maker-finish-hint">{finishHint}</span>
            {shareUrl && (
              <a className="notice-link tier-maker-share-url" href={shareUrl}>
                {shareUrl}
              </a>
            )}
            {saveError && <span className="tier-customise-error">{saveError}</span>}
          </div>
        )}
      </main>
    </>
  );
}
