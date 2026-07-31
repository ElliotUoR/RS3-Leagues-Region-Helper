import RetryImage from './RetryImage';
import {
  BLESSING_COLOURS,
  BLESSING_COLOUR_META,
  GOD_TIER_BLESSINGS,
  resolveGodTier,
} from '../data/blessings';

// The God Tier One power is derived, never picked - it falls out of the colours
// of the three tier picks (2+ of a colour wins; 1-of-each falls back to green).
// This panel exists to make that rule legible rather than magical: it shows the
// running colour tally, names the rule that fired, and marks which of the three
// powers you are currently on track for.
//
// It stays visible with an incomplete selection on purpose. Watching the
// awarded power change as the second pick lands is the clearest way to explain
// the mechanic, so a partial tally is shown as provisional rather than hidden.
export default function BlessingGodPanel({ selectedBlessings }) {
  const picked = selectedBlessings.length;
  const counts = Object.fromEntries(
    BLESSING_COLOURS.map((colour) => [colour, selectedBlessings.filter((b) => b.colour === colour).length]),
  );
  const majorityColour = BLESSING_COLOURS.find((colour) => counts[colour] >= 2);

  // resolveGodTier answers "what would these picks award" and falls back to
  // green whenever no colour has two - correct for a finished set of three, but
  // it would show green as "on track" off a single red pick. So the outcome is
  // only surfaced once it is actually settled: either a colour has reached two
  // (which no third pick can overturn) or all three picks are in.
  const settled = Boolean(majorityColour) || picked === 3;
  const awarded = settled ? resolveGodTier(selectedBlessings.map((b) => b.colour)) : null;

  let ruleText;
  if (picked === 0) {
    ruleText = 'Pick a blessing from each tier and the god power resolves from their colours.';
  } else if (majorityColour) {
    const meta = BLESSING_COLOUR_META[majorityColour];
    ruleText = `${counts[majorityColour]} ${majorityColour} of ${picked} - a colour with two or more picks wins, so ${meta.god} takes it.`;
  } else if (picked === 3) {
    ruleText = 'One of each colour - no majority, so the tie falls to green (Guthix, balance).';
  } else {
    ruleText = `${picked} of 3 picked - no colour has two yet, so this is still provisional.`;
  }

  return (
    <section className={`god-panel${awarded ? ` god-panel-${awarded.colour}` : ''}`}>
      <div className="god-panel-head">
        <h2 className="god-panel-title">God Tier One</h2>
        <span className="god-panel-derived">Awarded, not picked</span>
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
        {GOD_TIER_BLESSINGS.map((power) => {
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
                  <span className="god-power-badge">{picked === 3 ? 'Awarded' : 'Locked in'}</span>
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
