import RetryImage from './RetryImage';
import TagTooltip from './TagTooltip';

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
const GRADE_HUES = { A: 140, B: 95, C: 45, D: 25, E: 5, F: 220 };

function TierRow({ grade, entries, renderBadges }) {
  const hue = GRADE_HUES[grade] ?? 220;
  return (
    <div className="tier-row">
      <div className="tier-grade" style={{ '--tier-hue': hue }} aria-label={`Grade ${grade}`}>
        {grade}
      </div>
      <div className="tier-entries">
        {entries.length === 0 ? (
          <p className="tier-empty">Nothing ranks this low.</p>
        ) : (
          entries.map((entry) => (
            <TagTooltip
              key={entry.name}
              className={[
                'tier-entry',
                entry.colour ? `tier-entry-${entry.colour}` : '',
                // League relics carry a per-relic hue instead of a
                // red/green/blue blessing colour - a real class rather than an
                // attribute selector on the inline custom property, which is
                // unreliable.
                entry.hue != null ? 'tier-entry-relic' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={entry.hue != null ? { '--relic-hue': entry.hue } : undefined}
              tooltip={entry.note}
            >
              {entry.icon && <RetryImage src={entry.icon} alt="" className="tier-entry-icon" />}
              <span className="tier-entry-name">{entry.name}</span>
              {renderBadges?.(entry)}
              {entry.asterisk && (
                <span className="tier-entry-asterisk" aria-hidden="true">
                  *
                </span>
              )}
            </TagTooltip>
          ))
        )}
      </div>
    </div>
  );
}

export default function TierList({ title, standfirst, grades, entries, renderBadges, footnote }) {
  return (
    <section className="tier-list">
      <h2 className="tier-list-title">{title}</h2>
      {standfirst && <p className="tier-list-standfirst">{standfirst}</p>}
      <div className="tier-list-rows">
        {grades.map((grade) => (
          <TierRow
            key={grade}
            grade={grade}
            entries={entries.filter((entry) => entry.grade === grade)}
            renderBadges={renderBadges}
          />
        ))}
      </div>
      {footnote && <p className="tier-list-footnote">{footnote}</p>}
    </section>
  );
}
