import TierEntryChip from './TierEntryChip';
import { GRADE_HUES, RANKED_GRADES } from '../utils/tierChipStyles';
import { itemsFor } from '../data/tierListItems';
import { ROW_COUNT } from '../utils/tierListDraft';

// Read-only rendering of a finished tier list - the shared page, and anywhere
// else a list needs showing without being edited.
//
// Unsorted sits at the BOTTOM, and is omitted entirely when empty: on a
// finished list it is leftovers, not the starting point it is in the maker.
//
// Rows render even when empty, the same way the curated tier lists do - "the
// author put nothing in D" is a claim worth seeing, and silently dropping the
// row reads as a rendering bug instead.
const UNSORTED = -1;

function Row({ label, hue, entries, renderBadges, wordy }) {
  return (
    <div className="tier-row">
      <div
        className={`tier-grade${wordy || label.length > 2 ? ' tier-grade-wordy' : ''}`}
        style={{ '--tier-hue': hue }}
        aria-label={label}
      >
        {label}
      </div>
      <div className="tier-entries">
        {entries.length === 0 ? (
          <p className="tier-empty">Nothing in this tier.</p>
        ) : (
          entries.map((entry) => (
            <TierEntryChip key={entry.name} entry={entry} renderBadges={renderBadges} />
          ))
        )}
      </div>
    </div>
  );
}

export default function TierListView({ type, rowLabels, placements, renderBadges }) {
  const items = itemsFor(type);
  const inRow = (rowIndex) => items.filter((item) => (placements[item.name] ?? UNSORTED) === rowIndex);
  const unsorted = inRow(UNSORTED);

  return (
    <div className="tier-list-rows">
      {Array.from({ length: ROW_COUNT }, (_, index) => (
        <Row
          key={index}
          label={rowLabels[index] ?? RANKED_GRADES[index]}
          // Hue follows the row's POSITION, not its label - a renamed row keeps
          // the colour of the rank it sits at.
          hue={GRADE_HUES[RANKED_GRADES[index]]}
          entries={inRow(index)}
          renderBadges={renderBadges}
        />
      ))}
      {unsorted.length > 0 && (
        <Row label="Unsorted" hue={GRADE_HUES.unsorted} entries={unsorted} renderBadges={renderBadges} wordy />
      )}
    </div>
  );
}
