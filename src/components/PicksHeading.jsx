// The "League relics" heading, plus the one piece of guidance the pick lists
// need and a way to skip past it.
//
// Every row in those three lists (league relics, Arch relics, regions) hides
// its reasoning until you click it - which is what keeps the whole setup beside
// the equipment grid instead of below three columns of prose, but also makes
// the reasoning easy to miss entirely. The hint says it out loud once, at the
// top of the first list, and the toggle opens all three at once for anyone who
// would rather read than click.
//
// Only rendered above the FIRST group: repeating it over Arch relics and
// Regions would say the same thing three times, and one control that opens
// everything is the point.
export default function PicksHeading({ title, expanded, onToggle }) {
  return (
    <div className="build-picks-heading">
      <h4>{title}</h4>
      <p className="build-picks-hint">
        Click relics and regions for more info
        <button type="button" className="build-picks-expand-all" onClick={onToggle} aria-expanded={expanded}>
          {expanded ? 'Shrink all' : 'Expand all'}
        </button>
      </p>
    </div>
  );
}
