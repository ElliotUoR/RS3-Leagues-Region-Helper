import {
  ARMOUR_SCALING_BLESSINGS,
  ICYENIC_FAITH_RELIC,
  LIFE_SCALING_BLESSINGS,
  getAegisBreakdown,
  getBigBonedBonusDamage,
  getIcyeneBonusPercent,
  getTotalArmour,
  getTotalLifePoints,
  getTotalPrayerBonus,
} from '../utils/gearStats';
import { extraLifePoints } from '../data/buildExtras';

// The at-a-glance line that sits under a gear grid: the totals a blessing
// actually reads, and what each of those blessings is paying because of them.
//
// Shared by the build editor and My Build. It deliberately overlaps with the
// Leagues effects panel further down both pages - the same figures appear in
// both - because the two answer different questions. This line is for WHILE
// you are swapping gear, where the point is watching one number move as you
// click; the panel is for once you have stopped, where the point is the full
// derivation. Collapsing them into one would cost the first of those.
//
// Every figure is gated on a pick that reads it. Total armour without an
// armour-scaling blessing is a number nothing in the build consumes, and this
// line sits directly above an equipment grid that is already busy.

// Quoted at 99 rather than following any overload toggle: this is the resting
// figure, and the panel below owns the "what do potions do" question.
const BASE_LEVEL = 99;

export default function LoadoutStatNote({
  style,
  slots,
  equipped,
  blessings = [],
  leagueRelics = [],
  archRelics = [],
  extras = [],
  elderSources = [],
}) {
  const showArmour = blessings.some((name) => ARMOUR_SCALING_BLESSINGS.has(name));
  const showHealth = blessings.some((name) => LIFE_SCALING_BLESSINGS.has(name));
  const showPrayer = leagueRelics.includes(ICYENIC_FAITH_RELIC);
  const showAegis = blessings.includes("Teragard's Aegis");

  const armourTotal = showArmour ? getTotalArmour(equipped, style, BASE_LEVEL) : null;
  const lifeTotal = showHealth
    ? getTotalLifePoints(equipped, { bigBoned: true, archRelics, extraLifePoints: extraLifePoints(extras) })
    : null;
  const bigBonedBonus = lifeTotal != null ? getBigBonedBonusDamage(lifeTotal) : null;
  const prayerTotal = showPrayer ? getTotalPrayerBonus(equipped) : null;
  // Null unless the Tome is actually in the pocket slot - see
  // getIcyeneBonusPercent for why that matters.
  const icyeneBonus = showPrayer ? getIcyeneBonusPercent(equipped) : null;

  // Aegis quotes every potion state at once rather than following a toggle:
  // a toggle answers "how much armour do I have right now", this answers "what
  // is this blessing worth to me", and that is a question about the whole range.
  const aegis = showAegis
    ? getAegisBreakdown({
        equipped,
        style,
        weaponName: slots?.weapon,
        offhandName: slots?.offhand,
        hasElder: elderSources.length > 0,
      })
    : null;

  const hasTotals = armourTotal != null || lifeTotal != null || prayerTotal != null;
  const hasBlessingLines = aegis || bigBonedBonus != null || icyeneBonus != null;
  if (!hasTotals && !hasBlessingLines) return null;

  return (
    <div className="loadout-stat-note">
      {/* Same colour classes GearItemRow uses for these stats (see
          utils/gearItemDisplay.js's keyStats), so this note reads as the same
          "armour"/"health" concept everywhere. .gear-stat::before already
          inserts the "·" separator between adjacent stats - no manual one
          needed here. */}
      {hasTotals && (
        <span className="create-build-armour-note">
          {armourTotal != null && (
            <span className="gear-stat gear-stat-armour">
              Total armour: {armourTotal.toLocaleString()} at 99 Defence
            </span>
          )}
          {lifeTotal != null && (
            <span className="gear-stat gear-stat-lp">
              Total health: {lifeTotal.toLocaleString()} at 99 Hitpoints
            </span>
          )}
          {prayerTotal != null && (
            <span className="gear-stat gear-stat-prayer">Prayer bonus: {prayerTotal.toLocaleString()}</span>
          )}
        </span>
      )}

      {/* The blessings with a stateable number of their own, kept on their own
          lines under the totals they derive from rather than crammed into that
          line - each needs its own caveat (which multiplier, per hit, at which
          potion state) and the totals line is already dense. */}
      {hasBlessingLines && (
        <p className="create-build-blessing-note">
          {aegis && (
            <span className="create-build-blessing-line">
              <span className="gear-stat gear-stat-aegis">
                Teragard&apos;s Aegis: +{aegis.base.toLocaleString()} ability damage
              </span>
              <span className="create-build-blessing-detail">
                {' '}({aegis.multiplier}x - {aegis.source})
                {' · '}+{aegis.overloaded.toLocaleString()} overloaded
                {aegis.elder != null && (
                  <> {'· '}+{aegis.elder.toLocaleString()} elder overloaded - via {elderSources.join(' + ')}</>
                )}
              </span>
            </span>
          )}
          {bigBonedBonus != null && (
            <span className="create-build-blessing-line">
              <span className="gear-stat gear-stat-bigboned">
                Big Boned: +{bigBonedBonus.toLocaleString()} bonus damage
              </span>
              <span className="create-build-blessing-detail"> per hit (5% of max life points)</span>
            </span>
          )}
          {icyeneBonus != null && (
            <span className="create-build-blessing-line">
              <span className="gear-stat gear-stat-icyenic">
                Icyenic Faith: +{icyeneBonus.toFixed(1)}% Crit &amp; Ability bonus
              </span>
              <span className="create-build-blessing-detail"> (0.2% per 1 prayer bonus)</span>
            </span>
          )}
        </p>
      )}
    </div>
  );
}
