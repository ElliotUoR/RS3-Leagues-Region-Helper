import { useState } from 'react';
import RetryImage from './RetryImage';
import { blessingRows } from './BuildCardMeta';
import { BLESSING_BY_NAME } from '../data/buildLookups';

// The "Blessings" section of a build guide: the two rows of picks again, but
// this time as an explanation of WHY each one is in the build.
//
// The card header already shows the same two rows. This is not a duplicate -
// the header answers "what does this build take", scanned in passing, while
// this answers "why that one", which needs a click and a paragraph. Putting the
// second job in the header would have made every collapsed card three times
// taller for information nobody reads while scrolling a list.
//
// The explanation panel sits at a FIXED position - always the foot of the
// section, never beside the pill you clicked. Anchoring it to the pill would
// move it on every click and reflow the two rows as it grew; pinned, the rows
// stay still and only the text changes, so comparing two picks is a matter of
// clicking twice and reading the same spot. It is absent entirely until a pick
// is opened, and a second click on that pick closes it again.

// ONLY what the build's author actually wrote. There is no fallback to the
// blessing's own analysis: a general note about what a blessing does is not an
// answer to "why is it in THIS build", and presenting one in the same panel
// invites it to be read as though it were.
//
// The consequence is that some picks have nothing to show. They still render -
// the two rows are a useful reference on their own - just not as controls. See
// PickPill.
function explanationFor(name, reasons) {
  return reasons?.[name] || null;
}

// A pick with a note is a button; a pick without one is inert.
//
// That difference IS the affordance - it is how you can see at a glance which
// picks have been written up, without clicking each one to find out. An inert
// pill is dimmed and carries a title so the reason for its state is reachable.
function PickPill({ name, isGod, active, hasNote, onSelect }) {
  const blessing = BLESSING_BY_NAME.get(name);
  if (!blessing) return null;
  const classes = [
    'blessing-guide-pick',
    `blessing-pill-${blessing.colour}`,
    isGod ? 'blessing-pill-god' : '',
    hasNote ? '' : 'is-silent',
    active ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const inner = (
    <>
      {blessing.icon && <RetryImage src={blessing.icon} alt="" className="blessing-pill-icon" />}
      <span>{blessing.name}</span>
    </>
  );

  if (!hasNote) {
    return (
      <span className={classes} title="No note written for this pick">
        {inner}
      </span>
    );
  }
  return (
    <button type="button" className={classes} aria-pressed={active} onClick={() => onSelect(name)}>
      {inner}
    </button>
  );
}

export default function BlessingGuideSection({ blessings = [], godTier, godTier2, reasons = {} }) {
  const [selected, setSelected] = useState(null);
  // Clicking the open pick closes it again, so the panel can be dismissed
  // without having to pick something else to read.
  const toggle = (name) => setSelected((prev) => (prev === name ? null : name));
  const rows = blessingRows({ blessings, godTier, godTier2 });
  if (rows.length === 0) return null;

  const explanation = selected ? explanationFor(selected, reasons) : null;

  return (
    <div className="blessing-guide">
      {rows.map((row) => (
        <div key={row.key} className="blessing-guide-row">
          {row.blessings.map((name) => (
            <PickPill
              key={name}
              name={name}
              active={selected === name}
              hasNote={Boolean(explanationFor(name, reasons))}
              onSelect={toggle}
            />
          ))}
          {row.godTier && (
            <>
              <span className="blessing-guide-arrow" aria-hidden="true">
                →
              </span>
              <PickPill
                name={row.godTier}
                isGod
                active={selected === row.godTier}
                hasNote={Boolean(explanationFor(row.godTier, reasons))}
                onSelect={toggle}
              />
            </>
          )}
        </div>
      ))}

      {/* Only once a pick is open. An empty panel sitting under the rows was
          reserving space for something nobody had asked to see - and with the
          border already saying which picks have a note, it had nothing left to
          explain either. */}
      {selected && explanation && (
        <div className="blessing-guide-note" role="status">
          <span className="blessing-guide-note-head">{selected}</span>
          <p>{explanation}</p>
        </div>
      )}
    </div>
  );
}
