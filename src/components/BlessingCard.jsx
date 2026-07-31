import RetryImage from './RetryImage';

// One pickable blessing. Unlike LeagueRelicRow these are laid out three-across
// as columns rather than as rows, because the three choices in a tier are a
// single either/or decision and the colours (red/green/blue) are what the
// decision actually turns on - they need to sit side by side to be compared.
//
// Both modes show only Jagex's own card text, never this site's commentary:
// `effects` verbatim in detailed mode, and `compactPoints` - the same effects
// compressed to their numbers and conditions, nothing added or dropped - in
// compact mode. See data/blessings.js for how compactPoints is derived.
export default function BlessingCard({ blessing, selected, onToggle, compact }) {
  const classes = [
    'blessing-card',
    `blessing-card-${blessing.colour}`,
    selected ? 'selected' : '',
    compact ? 'blessing-card-compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} onClick={() => onToggle(blessing)} aria-pressed={selected}>
      <span className="blessing-card-check" aria-hidden="true">
        ✓
      </span>
      <span className="blessing-card-head">
        {blessing.icon ? (
          <RetryImage src={blessing.icon} alt="" loading="eager" className="blessing-card-icon" />
        ) : (
          <span className="blessing-card-icon-placeholder" aria-hidden="true" />
        )}
        <span className="blessing-card-name">{blessing.name}</span>
      </span>

      {compact ? (
        <ul className="blessing-card-points">
          {blessing.compactPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      ) : (
        <ul className="blessing-card-effects">
          {blessing.effects.map((effect) => (
            <li key={effect}>{effect}</li>
          ))}
        </ul>
      )}
    </button>
  );
}
