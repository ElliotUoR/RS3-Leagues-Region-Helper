import RetryImage from './RetryImage';
import {
  BLESSING_COLOURS,
  BLESSING_COLOUR_META,
  GOD_TIER_BLESSINGS,
  GOD_TIER_SOURCE_TIERS,
  resolveGodTierFor,
} from '../data/blessings';

const GOD_TIER_TITLES = { 1: 'God Tier One', 2: 'God Tier Two' };

// A god power is derived, never picked - it falls out of the colours of one
// HALF of the tree (2+ of a colour wins; 1-of-each falls back to green). Tiers
// 1-3 award God Tier One, tiers 4-6 award God Tier Two, and the two resolve
// independently. This panel exists to make that rule legible rather than
// magical: it shows the running colour tally for its own half, names the rule
// that fired, and marks which of the three powers you are on track for.
//
// It stays visible with an incomplete selection on purpose. Watching the
// awarded power change as the second pick lands is the clearest way to explain
// the mechanic, so a partial tally is shown as provisional rather than hidden.
//
// `selectedBlessings` may be the WHOLE six-pick selection - the panel filters
// down to its own half, so both instances take the same prop.
export default function BlessingGodPanel({ selectedBlessings, godTier = 1 }) {
  const fromTiers = GOD_TIER_SOURCE_TIERS[godTier] ?? [];
  const mine = selectedBlessings.filter((b) => fromTiers.includes(b.tier));
  const picked = mine.length;
  const total = fromTiers.length;
  const counts = Object.fromEntries(
    BLESSING_COLOURS.map((colour) => [colour, mine.filter((b) => b.colour === colour).length]),
  );
  const majorityColour = BLESSING_COLOURS.find((colour) => counts[colour] >= 2);

  // resolveGodTierFor answers "what would these picks award" and falls back to
  // green whenever no colour has two - correct for a finished half, but it
  // would show green as "on track" off a single red pick. So the outcome is
  // only surfaced once it is actually settled: either a colour has reached two
  // (which no later pick can overturn) or every pick in this half is in.
  const settled = Boolean(majorityColour) || picked === total;
  const awarded = settled ? resolveGodTierFor(godTier, mine) : null;

  const tierRange = `${fromTiers[0]}-${fromTiers[fromTiers.length - 1]}`;

  let ruleText;
  if (picked === 0) {
    ruleText = `Pick a blessing from tiers ${tierRange} and this god power resolves from their colours.`;
  } else if (majorityColour) {
    const meta = BLESSING_COLOUR_META[majorityColour];
    ruleText = `${counts[majorityColour]} ${majorityColour} of ${picked} - a colour with two or more picks wins, so ${meta.god} takes it.`;
  } else if (picked === total) {
    ruleText = 'One of each colour - no majority, so the tie falls to green (Guthix, balance).';
  } else {
    ruleText = `${picked} of ${total} picked - no colour has two yet, so this is still provisional.`;
  }

  const powers = GOD_TIER_BLESSINGS.filter((power) => power.godTier === godTier);

  return (
    <section className={`god-panel${awarded ? ` god-panel-${awarded.colour}` : ''}`}>
      <div className="god-panel-head">
        <h2 className="god-panel-title">{GOD_TIER_TITLES[godTier]}</h2>
        <span className="god-panel-derived">From tiers {tierRange} - awarded, not picked</span>
      </div>

      <div className="god-panel-tally" aria-label="Colour tally">
        {BLESSING_COLOURS.map((colour) => {
          const meta = BLESSING_COLOUR_META[colour];
          const tallyClasses = ['god-tally', `god-tally-${colour}`];
          if (counts[colour] > 0) tallyClasses.push('has-picks');
          if (majorityColour === colour) tallyClasses.push('winning');
          return (
            <span key={colour} className={tallyClasses.join(' ')}>
              <span className="god-tally-count">{counts[colour]}</span>
              <span className="god-tally-god">{meta.god}</span>
              <span className="god-tally-theme">{meta.theme}</span>
            </span>
          );
        })}
      </div>

      <p className="god-panel-rule">{ruleText}</p>

      <div className="god-panel-powers">
        {powers.map((power) => {
          const isAwarded = awarded?.name === power.name;
          return (
            <article
              key={power.name}
              className={`god-power god-power-${power.colour}${isAwarded ? ' awarded' : ''}`}
              aria-current={isAwarded ? 'true' : undefined}
            >
              <header className="god-power-head">
                {power.icon && <RetryImage src={power.icon} alt="" loading="eager" className="god-power-icon" />}
                <span className="god-power-name">{power.name}</span>
                {isAwarded && (
                  <span className="god-power-badge">{picked === total ? 'Awarded' : 'Locked in'}</span>
                )}
              </header>
              <ul className="god-power-effects">
                {power.effects.map((effect) => (
                  <li key={effect}>{effect}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
