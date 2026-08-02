import { useMemo, useState } from 'react';
import { blessingColourTally, blessingGradient, dominantBlessingColour } from '../utils/blessingTheme';

// Everything a build's blessings and relics actually DO for it, behind one
// button under the loadout.
//
// It replaced a stack of six or seven stat lines that were always on screen and
// listed base / overloaded / elder overloaded as three separate rows each. That
// is a lot of numbers to read past when most of the time you want one figure -
// so the potion state is a TOGGLE and every affected number moves with it,
// rather than being three rows you pick from yourself.
//
// Deliberately an inline expander, not an overlay: two build cards can be open
// at once for comparison, and it never covers the equipment grid the numbers
// describe.
//
// Built to grow. Rows come from a list, so adding (say) Abyssal Cinders damage
// later is one entry rather than another paragraph wedged into a component.

// Which potion states exist, in the order the buttons appear. Elder is only
// offered when the build can actually brew one - see `elderSources`.
const STATES = [
  { id: 'overload', label: 'Overload', defence: '+17' },
  { id: 'elder', label: 'Elder overload', defence: '+25' },
];

export default function LeaguesEffectsPanel({
  blessings = [],
  armour,
  aegis,
  elderSources = [],
  lifeTotal,
  bigBonedBonus,
  prayerTotal,
  icyeneBonus,
}) {
  const [open, setOpen] = useState(false);
  // 'none' | 'overload' | 'elder'. Clicking the active one turns it off, same
  // convention GearStatsSummary's own overload toggle uses.
  const [potion, setPotion] = useState('none');

  const theme = useMemo(() => {
    const tally = blessingColourTally(blessings);
    return { gradient: blessingGradient(tally), accent: dominantBlessingColour(tally) };
  }, [blessings]);

  const canElder = elderSources.length > 0 && armour?.elder != null;
  const state = potion === 'elder' && !canElder ? 'none' : potion;
  const armourNow = armour?.[state] ?? armour?.none ?? null;
  const aegisNow = aegis ? aegis[state] ?? aegis.none : null;

  // Nothing to show means no button - a build with no blessings and no Icyenic
  // Faith has no effects to expand.
  const rows = [
    armourNow != null && {
      key: 'armour',
      label: 'Total armour',
      value: armourNow.toLocaleString(),
      className: 'gear-stat-armour',
      note: state === 'none' ? 'at 99 Defence' : `at 99 Defence ${STATES.find((s) => s.id === state).defence}`,
    },
    aegisNow != null && {
      key: 'aegis',
      label: 'Ability damage',
      value: `+${aegisNow.toLocaleString()}`,
      className: 'gear-stat-aegis',
      note: `Teragard's Aegis - ${aegis.multiplier}x, ${aegis.source}`,
    },
    lifeTotal != null && {
      key: 'life',
      label: 'Total health',
      value: lifeTotal.toLocaleString(),
      className: 'gear-stat-lp',
      note: 'at 99 Hitpoints',
    },
    bigBonedBonus != null && {
      key: 'bigboned',
      label: 'Bonus damage',
      value: `+${bigBonedBonus.toLocaleString()}`,
      className: 'gear-stat-bigboned',
      note: 'per hit - Big Boned, 5% of max life points',
    },
    prayerTotal != null && {
      key: 'prayer',
      label: 'Prayer bonus',
      value: prayerTotal.toLocaleString(),
      className: 'gear-stat-prayer',
      note: null,
    },
    icyeneBonus != null && {
      key: 'icyenic',
      label: 'Crit & Ability',
      value: `+${icyeneBonus.toFixed(1)}%`,
      className: 'gear-stat-icyenic',
      note: 'Icyenic Faith - 0.2% per 1 prayer bonus',
    },
  ].filter(Boolean);

  if (rows.length === 0) return null;

  return (
    <div className="leagues-effects" style={theme.accent ? { '--effects-accent': theme.accent } : undefined}>
      <button
        type="button"
        className={`leagues-effects-toggle${open ? ' open' : ''}`}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        style={theme.gradient ? { backgroundImage: theme.gradient } : undefined}
      >
        <span className="leagues-effects-icon" aria-hidden="true">
          ✦
        </span>
        Leagues effects
        <span className="leagues-effects-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="leagues-effects-panel">
          {/* The gradient bar is the build's own colour balance - a blue-heavy
              build reads blue before a single number is read. */}
          <span
            className="leagues-effects-bar"
            aria-hidden="true"
            style={theme.gradient ? { backgroundImage: theme.gradient } : undefined}
          />

          {armour && (
            <div className="leagues-effects-potions">
              {STATES.map((entry) => {
                if (entry.id === 'elder' && !canElder) return null;
                const active = state === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className={`leagues-effects-potion${active ? ' active' : ''}`}
                    aria-pressed={active}
                    onClick={() => setPotion(active ? 'none' : entry.id)}
                  >
                    {entry.label}
                    <span className="leagues-effects-potion-defence">{entry.defence}</span>
                  </button>
                );
              })}
              {canElder && (
                <span className="leagues-effects-elder-note">via {elderSources.join(' or ')}</span>
              )}
            </div>
          )}

          <dl className="leagues-effects-rows">
            {rows.map((row) => (
              <div key={row.key} className="leagues-effects-row">
                {/* Label and figure share a line; the note gets its own. This
                    panel lives in the loadout column, which is ~260px wide -
                    all three on one line wrapped "Teragard's Aegis - 3x,
                    shield" into three ragged fragments. */}
                <div className="leagues-effects-row-main">
                  <dt>{row.label}</dt>
                  <dd>
                    <strong className={row.className}>{row.value}</strong>
                  </dd>
                </div>
                {row.note && <p className="leagues-effects-note">{row.note}</p>}
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
