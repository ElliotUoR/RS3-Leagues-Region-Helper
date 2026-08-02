import { useMemo, useState } from 'react';
import RetryImage from './RetryImage';
import { ARCH_RELIC_BY_NAME, BLESSING_BY_NAME } from '../data/buildLookups';
import { BLESSING_COLOURS, resolveGodTier } from '../data/blessings';
import { blessingColourTally, blessingGradient, dominantBlessingColour } from '../utils/blessingTheme';
import { BUILD_EXTRA_BY_NAME, extraLifePoints } from '../data/buildExtras';
import {
  BIG_BONED_DAMAGE_SHARE,
  BIG_BONED_LIFE_MULTIPLIER,
  equippedItemsFor,
  getBigBonedBonusDamage,
  getIcyeneBonusPercent,
  getTotalLifePoints,
  getTotalPrayerBonus,
  ICYENIC_FAITH_RELIC,
} from '../utils/gearStats';
import {
  ABYSSAL_CINDERS_ON_HIT_SHARE,
  BARKSCALES_REDUCTION_SHARE,
  GRASP_OF_GUTHIX_AVERAGE_SHARE,
  INFERNO_OF_ZAMORAK_AVERAGE_SHARE,
  LIGHT_OF_SARADOMIN_ARMOUR_SHARE,
  LIGHT_OF_SARADOMIN_AVERAGE_AD_SHARE,
  ACHTO_TIER,
  SPLASH_ZONE_AOE_BONUS,
  WEAPON_MODE_LABELS,
  FURY_OF_THE_SMALL_RELIC,
  combatLevelFor,
  getAdrenaline,
  getBaseAbilityDamage,
  getBasicAttackBand,
  getTotalAbilityDamage,
  hasChinchompaSplashZone,
} from '../utils/abilityDamage';

// Everything a build's blessings, relics and gear actually DO for it, behind
// one button under the loadout.
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
// It spans the FULL WIDTH of the card rather than sitting in the ~260px loadout
// column it grew up in. Once the blessings started paying out derived figures
// of their own - Barkscales' reduction, Striking Light's Light of Saradomin,
// the Inferno of Zamorak - there were a dozen cards to place, and a narrow
// column turned every one of them into four ragged lines.
//
// It derives its own numbers from `slots`, so a caller adds one element and
// passes the build's picks. The exception is armour, which curated builds store
// precomputed in blessingBuilds.js rather than deriving.

// Which potion states exist, in the order the buttons appear. Elder is only
// offered when the build can actually brew one - see `elderSources`.
//
// One potion boosts Defence AND the style's offensive stat by the same amount,
// so this single toggle moves the armour figures and - through the level term
// in the ability damage formula - the damage ones too. See utils/abilityDamage.js.
const STATES = [
  { id: 'overload', label: 'Overload', bonus: '+17' },
  { id: 'elder', label: 'Elder overload', bonus: '+25' },
];

const STYLE_STAT = { melee: 'Strength', ranged: 'Ranged', magic: 'Magic', necromancy: 'Necromancy' };

// Blessings whose payout is a rule rather than a number: their own compact
// wording is already written to be read at a glance, so it is repeated verbatim
// instead of being paraphrased into a figure that does not exist.
const TEXT_ONLY_BLESSINGS = ['Avernic Rampage', 'Eternal Sustenance'];

// Steadfast Will's two armour-scaling lines. Bash is the headline - at 3,600
// armour it is 12,600-16,200 damage from a single ability, which is the whole
// reason the blessing is worth a shield slot, and "350-450% of your armour
// value" does not say that out loud.
const BASH_ARMOUR_SHARE = [3.5, 4.5];
const REFLECT_ARMOUR_SHARE = [0.1, 0.15];

// `+ 0` normalises negative zero, which is not paranoia: the ability damage
// breakdown's last part absorbs whatever the formula's floors took off, and a
// weapon with fractional damage (the Mechanised chinchompa is 943.3) leaves it
// at about -0.3. Math.round takes that to -0, and (-0).toLocaleString() renders
// the string "-0" - so the panel read "+ -0 armour".
const round = (n) => (Math.round(n) + 0).toLocaleString();
const iconFor = (name) => BLESSING_BY_NAME.get(name)?.icon;

// Saved builds store their god power; the build editor has not settled on one
// yet, so it is derived from the picks instead.
//
// "Settled" is the same rule blessingTheme.js applies, and for the same reason:
// resolveGodTier falls back to green whenever no colour has two picks, so
// asking it about a half-finished set would name a god power the build has not
// actually earned.
function godTierFor(godTier, blessings) {
  if (godTier) return godTier;
  const colours = blessings.map((name) => BLESSING_BY_NAME.get(name)?.colour).filter(Boolean);
  const settled = colours.length === 3 || BLESSING_COLOURS.some((c) => colours.filter((x) => x === c).length >= 2);
  return settled ? resolveGodTier(colours)?.name ?? null : null;
}

const strong = (text) => ({ text, tone: 'strong' });
const muted = (text) => ({ text, tone: 'muted' });

// Sacred Fervor states the same 30% four times, once per style. Repeating all
// four at a melee build would be three lines of noise; the other two god powers
// have no per-style split, so their whole text is the answer.
function godPowerLines(godPower, style) {
  if (!godPower?.effects) return [];
  if (godPower.name !== 'Sacred Fervor') return godPower.effects;
  const line = godPower.effects.find((effect) => effect.startsWith(STYLE_STAT[style] === 'Strength' ? 'Melee' : STYLE_STAT[style]));
  return line ? [line] : godPower.effects;
}

function abilityDamageCard({ baseAD, damage, aegis, aegisNow, icyeneBonus, style, chinSplash }) {
  const working = baseAD.parts.map((part) => `${round(part.value)} ${part.label}`).join(' + ');
  return {
    key: 'ability-damage',
    name: 'Ability damage',
    wide: true,
    lines: [
      muted(`${working} = ${round(baseAD.total)} base`),
      aegisNow != null && strong(`+${round(aegisNow)} Teragard's Aegis (${aegis.multiplier}x, ${aegis.source})`),
      icyeneBonus != null && strong(`+${icyeneBonus.toFixed(1)}% Tome of the Icyene`),
      // Both readings, labelled - which figure the tome's percentage applies to
      // is not established, and at these numbers the gap is hundreds of damage.
      damage.split &&
        muted(
          `Shown with the tome reading the Aegis-boosted figure. Reading base ability damage instead gives ${round(damage.additive)}.`,
        ),
      // Named, because a weapon quietly firing below its own tier is otherwise
      // invisible - the loadout above shows a t95 bow and the figure here is a
      // t50 one.
      baseAD.ammoCap &&
        muted(
          `${baseAD.ammoCap.weapon} is tier ${baseAD.ammoCap.weaponTier} but ${baseAD.ammoCap.name} is only tier ${baseAD.ammoCap.ammoTier}, so it fires at tier ${baseAD.ammoCap.ammoTier}. Ammunition caps the weapon's tier; it adds no damage of its own.`,
        ),
      chinSplash && strong(`+${SPLASH_ZONE_AOE_BONUS}% via Splash Zone with Chins`),
      // Kept as a separate figure rather than rolled into Total ability damage:
      // that total is the ability damage STAT, and Splash Zone multiplies the
      // damage dealt rather than the stat. The distinction still matters for
      // anyone comparing this build's stat against another - but since chins
      // make the multiplier unconditional, Effective is the number that lands,
      // and it is what every share below is taken of.
      chinSplash &&
        muted('Not part of the ability damage stat, so it is quoted separately as Effective ability damage - which every figure below is a share of.'),
      muted(`${WEAPON_MODE_LABELS[baseAD.mode]}, at ${baseAD.combatLevel} ${STYLE_STAT[style]}`),
    ].filter(Boolean),
  };
}

// The Achto set bonus is the second thing on these builds that pays only for
// holding a shield, so an inactive one is worth stating rather than hiding -
// a build wearing all five pieces with a two-hander is leaving it on the floor
// and has no other way to find that out.
function achtoCard(achto) {
  return {
    key: 'achto',
    name: achto.set,
    colour: 'relic',
    lines: achto.active
      ? [
          strong(`+${round(achto.bonus)} equipment damage bonus`),
          muted(
            `${achto.pieces * 5}% of a tier ${ACHTO_TIER} main-hand's damage, ${achto.pieces} piece${achto.pieces === 1 ? '' : 's'} at 5% each - paid because the off-hand is a ${achto.shieldClass}.`,
          ),
        ]
      : [
          strong(`+${round(achto.bonus)} available, but not being paid`),
          muted(
            `${achto.pieces} piece${achto.pieces === 1 ? '' : 's'} worn, but the set only pays with a shield in the off-hand - a ${achto.shieldClass} does not qualify.`,
          ),
        ],
  };
}

function adrenalineCard(adrenaline, blessings) {
  const junkie = blessings.includes('Adrenaline Junkie');
  return {
    key: 'adrenaline',
    // One card, because everything here feeds the same bar. Named and iconed
    // for whichever is actually driving it - Heightened Senses and Fury of the
    // Small are Arch relics rather than blessings, so their icons come from the
    // other lookup.
    name: adrenaline.driver,
    icon: junkie ? iconFor(adrenaline.driver) : ARCH_RELIC_BY_NAME.get(adrenaline.driver)?.icon,
    // Zamorak red when the blessing is driving it; an Arch relic on its own is
    // not a god pick and says so with a colour no blessing uses.
    colour: junkie ? 'red' : 'relic',
    lines: [
      strong(`Maximum adrenaline ${adrenaline.max}%`),
      muted(adrenaline.parts.join('   ')),
      adrenaline.generation && strong(`+${adrenaline.generation}% adrenaline generation`),
      // Quoted rather than folded into a combined generation figure: this is
      // the relic's own wording, and "1% more" leaves it open whether that is a
      // percentage point on a basic's 9% or a 1% multiplier of it. The gap
      // between those readings is small, but inventing a total would state a
      // precision the effect text does not have.
      //
      // Plain weight, not `strong`. The bold lines on this panel are the
      // figures a build is chosen FOR, and 1% next to Adrenaline Junkie's +50%
      // is not one of them - typesetting it the same way overstates it.
      adrenaline.fury && { text: 'Basic abilities generate 1% more adrenaline' },
      adrenaline.fury && muted(`${FURY_OF_THE_SMALL_RELIC} - Arch relic.`),
      adrenaline.generation,
    ].filter(Boolean),
  };
}

// One card per Extra, each stating its own contribution. Worth saying out loud
// even though the figure is already inside Total health: under Big Boned the
// Totem's +1,500 is really +2,250, and that x1.5 is invisible inside a total
// that has everything else in it too.
function extraCards(extras, hasBigBoned) {
  return extras
    .map((name) => BUILD_EXTRA_BY_NAME.get(name))
    .filter(Boolean)
    .map((extra) => {
      const multiplied = hasBigBoned && extra.lifePoints;
      return {
        key: `extra-${extra.name}`,
        name: extra.name,
        colour: 'extra',
        icon: extra.icon,
        lines: [
          extra.lifePoints && strong(`+${round(extra.lifePoints)} maximum life points`),
          multiplied && strong(`+${round(extra.lifePoints * BIG_BONED_LIFE_MULTIPLIER)} after Big Boned`),
          multiplied &&
            muted(
              `Added before the x1.5, so it also carries +${round(extra.lifePoints * BIG_BONED_LIFE_MULTIPLIER * BIG_BONED_DAMAGE_SHARE)} bonus damage per hit.`,
            ),
          !extra.lifePoints && extra.summary && { text: extra.summary },
        ].filter(Boolean),
      };
    });
}

// The abilities Steadfast Will empowers, with the two that scale off armour
// costed out. The other three lines are rules with no number to compute, so
// they keep the blessing's own compact wording.
function steadfastWillCard(armourNow) {
  const blessing = BLESSING_BY_NAME.get('Steadfast Will');
  const span = ([low, high]) => `${round(armourNow * low)} - ${round(armourNow * high)}`;
  return {
    key: 'Steadfast Will',
    name: 'Steadfast Will',
    icon: blessing?.icon,
    lines: [
      strong(`Bash +${span(BASH_ARMOUR_SHARE)} damage`),
      muted('350-450% of armour value, on top of the ability itself.'),
      strong(`Reflect +${span(REFLECT_ARMOUR_SHARE)} damage`),
      muted('On top of 100% of incoming damage, and it hits 8 extra targets within 3 tiles.'),
      { text: 'Preparation: -12s off every ability cooldown' },
      { text: 'Revenge: double duration and cooldown, max 20 stacks' },
    ],
  };
}

function strikingLightCard({ style, payoutAD, armourNow }) {
  const band = getBasicAttackBand(style);
  return {
    key: 'striking-light',
    name: 'Striking Light',
    icon: iconFor('Striking Light'),
    lines: [
      strong(`Basic attack ${round((payoutAD * band.boosted[0]) / 100)} - ${round((payoutAD * band.boosted[1]) / 100)}`),
      muted(
        `${band.boosted[0]}-${band.boosted[1]}% of ability damage - ${band.base[0]}-${band.base[1]}% for ${style}, +40 from the blessing.`,
      ),
      strong(
        `Light of Saradomin ~${round(payoutAD * LIGHT_OF_SARADOMIN_AVERAGE_AD_SHARE + armourNow * LIGHT_OF_SARADOMIN_ARMOUR_SHARE)} damage`,
      ),
      muted('40-60% of ability damage plus 250% of armour, 9s cooldown.'),
    ],
  };
}

// The whole card list for a build, in reading order: what your abilities hit
// for, then what each pick adds on top, then the god power.
function buildCards(context) {
  const { blessings, style, baseAD, damage, payoutAD, aegis, aegisNow, armourNow, lifeTotal, prayerTotal, icyeneBonus, adrenaline, extras, resolvedGodTier, chinSplash } =
    context;
  const cards = [];
  const picked = (name) => blessings.includes(name);

  if (damage) cards.push(abilityDamageCard(context));
  if (baseAD?.achto) cards.push(achtoCard(baseAD.achto));
  if (adrenaline) cards.push(adrenalineCard(adrenaline, blessings));

  if (lifeTotal != null && picked('Big Boned')) {
    cards.push({
      key: 'big-boned',
      name: 'Big Boned',
      icon: iconFor('Big Boned'),
      lines: [
        strong(`${round(lifeTotal)} maximum life points`),
        strong(`+${round(getBigBonedBonusDamage(lifeTotal))} bonus damage per hit`),
        muted('5% of maximum life points, flat and per hit - a 5-hit ability collects it five times.'),
      ],
    });
  }

  cards.push(...extraCards(extras, picked('Big Boned')));

  if (aegisNow != null) {
    cards.push({
      key: 'aegis',
      name: "Teragard's Aegis",
      icon: iconFor("Teragard's Aegis"),
      lines: [
        strong(`+${round(aegisNow)} base ability damage`),
        muted(`25% of ${round(armourNow)} total armour, ${aegis.multiplier}x for a ${aegis.source}`),
      ],
    });
  }

  if (payoutAD != null && picked('Abyssal Cinders')) {
    cards.push({
      key: 'abyssal-cinders',
      name: 'Abyssal Cinders',
      icon: iconFor('Abyssal Cinders'),
      lines: [
        strong(`+${round(payoutAD * ABYSSAL_CINDERS_ON_HIT_SHARE)} bonus damage on hit`),
        muted('15% of total ability damage.'),
        strong(`Inferno of Zamorak ~${round(payoutAD * INFERNO_OF_ZAMORAK_AVERAGE_SHARE)} damage`),
        muted('5% chance on hit; rolls 100-200% of ability damage, single target.'),
      ],
    });
  }

  if (payoutAD != null && armourNow != null && picked('Barkscales')) {
    cards.push({
      key: 'barkscales',
      name: 'Barkscales',
      icon: iconFor('Barkscales'),
      lines: [
        strong(`-${round(armourNow * BARKSCALES_REDUCTION_SHARE)} incoming damage per hit`),
        muted('10% of total armour, flat - on top of any percentage reduction.'),
        strong(`Grasp of Guthix ~${round(payoutAD * GRASP_OF_GUTHIX_AVERAGE_SHARE)} damage`),
        muted('Every 5th reduction; rolls 80-120% of ability damage as poison in a 3x3.'),
      ],
    });
  }

  if (payoutAD != null && armourNow != null && picked('Striking Light')) {
    cards.push(strikingLightCard(context));
  }

  // Falls through to the plain wording if there is no armour figure to cost it
  // against - which should not happen (Steadfast Will is armour-scaling, so a
  // build that picks it is always passed one) but costs one condition to be
  // sure of rather than rendering "NaN - NaN damage".
  if (picked('Steadfast Will') && armourNow != null) cards.push(steadfastWillCard(armourNow));

  for (const name of [...TEXT_ONLY_BLESSINGS, armourNow == null && 'Steadfast Will'].filter(Boolean)) {
    const blessing = picked(name) ? BLESSING_BY_NAME.get(name) : null;
    if (!blessing) continue;
    cards.push({
      key: name,
      name,
      icon: blessing.icon,
      lines: (blessing.compactPoints ?? blessing.effects ?? []).map((text) => ({ text })),
    });
  }

  if (icyeneBonus != null) {
    cards.push({
      key: 'icyenic',
      name: 'Tome of the Icyene',
      colour: 'icyenic',
      lines: [
        strong(`+${icyeneBonus.toFixed(1)}% critical strike chance`),
        strong(`+${icyeneBonus.toFixed(1)}% base ability damage`),
        muted(`0.2% of each per 1 Prayer bonus, from ${round(prayerTotal)}. Icyenic Faith.`),
      ],
    });
  }

  const godPower = resolvedGodTier ? BLESSING_BY_NAME.get(resolvedGodTier) : null;
  if (godPower) {
    cards.push({
      key: 'god-power',
      name: godPower.name,
      icon: godPower.icon,
      isGod: true,
      lines: [
        ...godPowerLines(godPower, style).map((text) => ({ text })),
        // Splash Zone's own text is all conditions - "area-of-effect and
        // multi-target attacks", "per tile the target occupies". Chinchompas
        // satisfy the first one on every hit, so for this loadout the whole
        // card collapses to one unconditional sentence.
        chinSplash && strong(`With chins you always deal ${SPLASH_ZONE_AOE_BONUS}% more damage`),
      ].filter(Boolean),
    });
  }

  return cards;
}

export default function LeaguesEffectsPanel({
  style,
  slots,
  blessings = [],
  godTier,
  leagueRelics = [],
  archRelics = [],
  extras = [],
  armour,
  aegis,
  elderSources = [],
  caption,
}) {
  const [open, setOpen] = useState(false);
  // 'none' | 'overload' | 'elder'. Clicking the active one turns it off, same
  // convention GearStatsSummary's own overload toggle uses.
  const [potion, setPotion] = useState('none');

  const theme = useMemo(() => {
    const tally = blessingColourTally(blessings);
    return { gradient: blessingGradient(tally), accent: dominantBlessingColour(tally) };
  }, [blessings]);

  const equipped = useMemo(() => equippedItemsFor(style, slots), [style, slots]);

  // Elder needs a source AND, when armour is being shown at all, a figure to
  // switch to. A build with no armour-scaling blessing passes no armour but can
  // still brew the potion, and it still moves that build's ability damage.
  const canElder = elderSources.length > 0 && (!armour || armour.elder != null);
  const state = potion === 'elder' && !canElder ? 'none' : potion;
  const armourNow = armour?.[state] ?? armour?.none ?? null;
  const aegisNow = aegis ? aegis[state] ?? aegis.none : null;
  const hasGear = Object.keys(equipped).length > 0;

  // Base ability damage moves with the potion state because the formula's level
  // term reads the boosted combat stat - see utils/abilityDamage.js.
  const baseAD = useMemo(
    () => (hasGear ? getBaseAbilityDamage(equipped, { combatLevel: combatLevelFor(state) }) : null),
    [equipped, hasGear, state],
  );

  const hasIcyenic = leagueRelics.includes(ICYENIC_FAITH_RELIC);
  const prayerTotal = hasIcyenic && hasGear ? getTotalPrayerBonus(equipped) : null;
  const icyeneBonus = hasIcyenic ? getIcyeneBonusPercent(equipped) : null;
  // Total health is worth stating whenever something has actually moved it -
  // Big Boned, or an Extra that grants max LP. A build with the Totem but no
  // Big Boned still has 1,500 more health than the loadout alone implies, and
  // it would be the one figure on this panel nothing accounted for.
  const bonusLife = extraLifePoints(extras);
  const hasBigBoned = blessings.includes('Big Boned');
  const lifeTotal =
    hasGear && (hasBigBoned || bonusLife > 0)
      ? getTotalLifePoints(equipped, { bigBoned: hasBigBoned, archRelics, extraLifePoints: bonusLife })
      : null;

  const damage = baseAD
    ? getTotalAbilityDamage({ base: baseAD.total, aegisBonus: aegisNow ?? 0, icyenePercent: icyeneBonus ?? 0 })
    : null;
  // Everything downstream - Abyssal Cinders, Barkscales' Grasp, Light of
  // Saradomin - is a share of the FINISHED ability damage, not of the base.
  const totalAD = damage?.compounding ?? null;

  const resolvedGodTier = godTierFor(godTier, blessings);
  const chinSplash = hasChinchompaSplashZone(resolvedGodTier, equipped);

  // Splash Zone is a multiplier on damage dealt rather than on the ability
  // damage STAT, so it sits outside the total above. With chinchompas it
  // applies to every hit unconditionally, which makes it indistinguishable in
  // practice from a bigger stat - so it gets its own headline, and everything
  // that takes a share of ability damage takes it of THIS figure. Grasp of
  // Guthix off a chin build really does hit 30% harder.
  const effectiveAD =
    chinSplash && totalAD != null ? Math.round(totalAD * (1 + SPLASH_ZONE_AOE_BONUS / 100)) : null;
  const payoutAD = effectiveAD ?? totalAD;

  const adrenaline = getAdrenaline({ blessings, archRelics });

  const figures = [
    // Leads, because when it exists it is the number that actually lands.
    effectiveAD != null && {
      key: 'effective-ad',
      label: 'Effective ability damage',
      value: round(effectiveAD),
      className: 'gear-stat-dmg',
    },
    damage && { key: 'ad', label: 'Total ability damage', value: round(totalAD), className: 'gear-stat-dmg' },
    armourNow != null && { key: 'armour', label: 'Total armour', value: round(armourNow), className: 'gear-stat-armour' },
    lifeTotal != null && { key: 'life', label: 'Total health', value: round(lifeTotal), className: 'gear-stat-lp' },
    prayerTotal != null && { key: 'prayer', label: 'Prayer bonus', value: round(prayerTotal), className: 'gear-stat-prayer' },
  ].filter(Boolean);

  const cards = buildCards({
    blessings,
    style,
    baseAD,
    damage,
    payoutAD,
    aegis,
    aegisNow,
    armourNow,
    lifeTotal,
    prayerTotal,
    icyeneBonus,
    adrenaline,
    extras,
    resolvedGodTier,
    chinSplash,
  });

  // No gear, no panel. Every figure here is framed as "what this loadout is
  // worth", so an empty equipment grid has nothing to answer - and the build
  // editor starts every stage empty, where a panel quoting the bare Defence
  // baseline as "Total armour" would be pure noise.
  if (!hasGear || (figures.length === 0 && cards.length === 0)) return null;

  return (
    // Both the flat accent and the full gradient go in as custom properties, so
    // the stylesheet can reach the build's colour balance from anywhere inside
    // - the hero card's left edge uses the gradient, the rest use the accent.
    <div
      className="leagues-effects"
      style={{
        ...(theme.accent ? { '--effects-accent': theme.accent } : null),
        ...(theme.gradient ? { '--effects-gradient': theme.gradient } : null),
      }}
    >
      <button
        type="button"
        className={`leagues-effects-toggle${open ? ' open' : ''}`}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        style={theme.gradient ? { backgroundImage: theme.gradient } : undefined}
      >
        <span className="leagues-effects-icon" aria-hidden="true">
          ✦
        </span>{' '}
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

          {caption && <p className="leagues-effects-caption">{caption}</p>}

          <div className="leagues-effects-head">
            {/* Shown whenever there is gear, not only when armour is: the
                potion moves ability damage through the formula's level term
                even for a build that never reads its armour value. */}
            {hasGear && (
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
                      <span className="leagues-effects-potion-defence">{entry.bonus}</span>
                    </button>
                  );
                })}
                {canElder && <span className="leagues-effects-elder-note">via {elderSources.join(' or ')}</span>}
              </div>
            )}

            <dl className="leagues-effects-figures">
              {figures.map((figure) => (
                <div key={figure.key} className="leagues-effects-figure">
                  <dt>{figure.label}</dt>
                  <dd>
                    <strong className={figure.className}>{figure.value}</strong>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="leagues-effects-cards">
            {cards.map((card) => (
              <section
                key={card.key}
                // Each card wears its OWN god's colour rather than the build's
                // dominant one - a mixed build then reads as the mix it is, and
                // Abyssal Cinders is Zamorak red next to Barkscales' Guthix
                // green whichever way the build leans overall. Looked up from
                // the blessing data so a card never has to restate it.
                data-colour={card.colour ?? BLESSING_BY_NAME.get(card.name)?.colour ?? null}
                className={`leagues-effects-card${card.wide ? ' wide' : ''}${card.isGod ? ' god' : ''}`}
              >
                <h5>
                  {card.icon && <RetryImage src={card.icon} alt="" className="leagues-effects-card-icon" />}
                  {card.name}
                </h5>
                <ul>
                  {card.lines.map((line) => (
                    <li key={line.text} className={line.tone}>
                      {line.text}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
