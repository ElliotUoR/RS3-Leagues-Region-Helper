import { useEffect, useMemo, useRef, useState } from 'react';
import RetryImage from './RetryImage';
import TagTooltip from './TagTooltip';
import { ARCH_RELIC_BY_NAME, BLESSING_BY_NAME } from '../data/buildLookups';
import { isGodTierSettled, resolveGodTierFor } from '../data/blessings';
import { blessingColourTally, blessingGradient, dominantBlessingColour } from '../utils/blessingTheme';
import { BUILD_EXTRA_BY_NAME, extraLifePoints } from '../data/buildExtras';
import {
  BIG_BONED_DAMAGE_SHARE,
  BIG_BONED_LIFE_MULTIPLIER,
  equippedItemsFor,
  getBigBonedBonusDamage,
  getAegisAbilityDamage,
  ICYENE_PERCENT_PER_PRAYER,
  isIcyeneTomeWorn,
  getTotalArmour,
  getTotalLifePoints,
  getTotalPrayerBonus,
  ICYENIC_FAITH_RELIC,
} from '../utils/gearStats';
import {
  ABYSSAL_CINDERS_ON_HIT_SHARE,
  BARKSCALES_REDUCTION_SHARE,
  GRASP_OF_GUTHIX_AVERAGE_SHARE,
  INFERNO_OF_ZAMORAK_AVERAGE_SHARE,
  LIGHT_OF_SARADOMIN_TARGETS,
  LORD_OF_LIGHT,
  TEARING_THORNS,
  TEARING_THORNS_TRIGGER_HITS,
  ENVENOMED,
  PERFIDIOUS,
  PERFIDIOUS_INFERNO_MULTIPLIER,
  TEMPERED_HEART,
  TEMPERED_HEART_ADRENALINE,
  TEMPERED_HEART_INTERVAL_SECONDS,
  getInfernoOfZamorak,
  HERBLORE_LEVELS,
  getGraspOfGuthix,
  getLightOfSaradomin,
  getPoisonMultiplier,
  ACHTO_TIER,
  ACHTO_MAX_PIECES,
  SPLASH_ZONE_AOE_BONUS,
  WEAPON_MODE_LABELS,
  FURY_OF_THE_SMALL_RELIC,
  BASE_COMBAT_LEVEL,
  SLIVER_COMBAT_LEVEL,
  combatLevelFor,
  getAdrenaline,
  getBaseAbilityDamage,
  getBasicAttackBand,
  getTotalAbilityDamage,
  hasChinchompaSplashZone,
} from '../utils/abilityDamage';
import {
  GENESIS_ESSENCE,
  GENESIS_ESSENCE_TIER,
  HAVOC_BORN,
  HAVOC_BORN_DAMAGE_BONUS,
  HAVOC_BORN_PENALTY,
  HIGHER_POWER,
  HIGHER_POWER_ABILITY_DAMAGE,
  TRUE_EQUILIBRIUM,
  TRUE_EQUILIBRIUM_PER_ALIGNMENT,
  getBlessingModifiers,
} from '../utils/blessingModifiers';
import { getCritBreakdown, UNHOLY_CRITUAL } from '../utils/critChance';
import { CHAOTIC_INSIGHT, CHAOTIC_INSIGHT_EXTRA_PIECES, getWornSetEffects } from '../data/critSetBonus';

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
//
// The Sliver of Edicts is the odd one out and is labelled to say so: it SETS
// every stat to 255 rather than adding, it is not a potion, and it lasts 16.8
// seconds on a 90-second cooldown. So its numbers are a burst ceiling, not
// something a build sustains - hence "255" flat where the potions show "+17".
//
// Each carries a `short` label as well as its full one. Three chips sitting at
// full length is a row of prose the eye has to read before it can find the one
// that is on; abbreviated, the selected chip is the only long one and reads as
// the answer. The swap is animated rather than instantaneous so the row is
// visibly the same three controls rearranging, not three that were replaced.
const STATES = [
  { id: 'overload', short: 'Ovl', label: 'Overload', bonus: '+17' },
  { id: 'elder', short: 'Eld Ovl', label: 'Elder overload', bonus: '+25' },
  { id: 'sliver', short: 'Sliver', label: 'Sliver of Edicts', bonus: '255' },
];

// Granted by the Naragi Edict relic. Gated on the RELIC rather than on the
// Sliver being worn, because it activates from the inventory - a build that
// takes the relic can use it whether or not the pocket slot holds it.
export const SLIVER_RELIC = 'Naragi Edict';

// What the crit total leaves out. Worth a marker rather than a card line: the
// figure sits in the headline row where it reads as authoritative, and the
// sources it misses are ones a player plausibly has - Biting is one of the most
// common weapon perks in the game.
const CRIT_INCOMPLETE_HINT =
  "Does not consider all crit sources - e.g. Biting, abilities, conditionals e.g. Channeller's ring.";

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

// Saved builds store their god powers; the build editor has not settled on them
// yet, so they are derived from the picks instead. Two of them now - tiers 1-3
// award God Tier One, tiers 4-6 award God Tier Two - and each is only named
// once its own half has settled, because resolveGodTierFor falls back to green
// whenever no colour in that half has two picks and would otherwise name a
// power the build has not earned.
//
// `stored` is the payload's own value for that tier when there is one (curated
// guides and saved user builds carry it), and wins over derivation.
function godTierFor(godTier, stored, blessings) {
  if (stored) return stored;
  return isGodTierSettled(godTier, blessings)
    ? resolveGodTierFor(godTier, blessings)?.name ?? null
    : null;
}

const strong = (text) => ({ text, tone: 'strong' });
const muted = (text) => ({ text, tone: 'muted' });
// A figure the app is showing but does not stand behind. Red rather than the
// card's own accent on purpose - a caveat tinted to match the number it is
// warning about reads as part of the same claim.
const warn = (text) => ({ text, tone: 'warn' });

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
      // After Aegis, deliberately - see getTotalAbilityDamage.
      damage.multiplierBonus > 0 &&
        strong(
          `+${round(damage.multiplierBonus)} ${HIGHER_POWER} (+${Math.round((damage.abilityDamageMultiplier - 1) * 100)}% of the ${round(damage.withAegis)} above)`,
        ),
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
    lines: (achto.active
      ? [
          strong(`+${round(achto.bonus)} equipment damage bonus`),
          muted(
            `${achto.pieces * 5}% of a tier ${ACHTO_TIER} main-hand's damage, ${achto.pieces} piece${achto.pieces === 1 ? '' : 's'} at 5% each - requires off-hand to be a ${achto.shieldClass}.`,
          ),
          // Without this the count reads as pieces WORN, and a one-piece build
          // showing "3 pieces at 5% each" looks like a bug rather than a god
          // power doing its job.
          achto.chaoticInsight &&
            achto.counted > achto.worn &&
            muted(
              `${achto.worn} actually worn - ${CHAOTIC_INSIGHT} counts each as ${1 + CHAOTIC_INSIGHT_EXTRA_PIECES}${achto.capped ? `, capped at ${ACHTO_MAX_PIECES}` : ''}.`,
            ),
        ]
      : [
          strong(`+${round(achto.bonus)} available, but not being paid`),
          muted(
            // `worn`, not `pieces` - `pieces` is the COUNTED figure, which
            // Chaotic Insight inflates, and "5 pieces worn" off two is a lie
            // about the loadout rather than a statement about the effect.
            `${achto.worn} piece${achto.worn === 1 ? '' : 's'} worn, but the set only pays with a shield in the off-hand - a ${achto.shieldClass} does not qualify.`,
          ),
        ]
    ).filter(Boolean),
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

function strikingLightCard({ style, payoutAD, armourNow, light }) {
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
      // Both blessings state the proc, and both state the SAME figure - they
      // read one shared calculation (getLightOfSaradomin), so there is no risk
      // of two different numbers for one effect. Showing it on both is what
      // someone comparing the two cards expects.
      strong(`Light of Saradomin ~${round(light.each)} damage`),
      muted(
        light.lordOfLight
          ? `40-60% of ability damage plus 250% of armour, boosted by Lord of Light. ${light.procs}x per trigger, ${light.cooldown}s cooldown.`
          : '40-60% of ability damage plus 250% of armour, 9s cooldown.',
      ),
    ].filter(Boolean),
  };
}

// Lord of Light rebuilds the same proc: five per trigger, each scaled by prayer
// bonus, each healing. The card leads with the whole trigger because that is
// what a basic attack actually produces - one proc's figure understates it
// fivefold.
function lordOfLightCard({ light, armourNow, payoutAD }) {
  const prayerPercent = Math.round((light.prayerMultiplier - 1) * 100);
  return {
    key: 'lord-of-light',
    name: LORD_OF_LIGHT,
    icon: iconFor(LORD_OF_LIGHT),
    lines: [
      strong(`~${round(light.total)} damage per trigger`),
      muted(
        `${light.procs}x Light of Saradomin at ~${round(light.each)} each, from a basic attack. ${light.cooldown}s cooldown.`,
      ),
      strong(`~${round(light.base)} per proc before prayer`),
      muted(
        `40-60% of ${round(payoutAD)} ability damage plus 250% of ${round(armourNow)} armour.`,
      ),
      light.prayerBonus > 0
        ? strong(`+${prayerPercent}% from ${round(light.prayerBonus)} prayer bonus`)
        : warn('No prayer bonus - the 2%-per-point multiplier is paying nothing.'),
      light.prayerBonus > 0 && muted('2% more Light of Saradomin damage per point of prayer bonus.'),
      strong(`~${round(light.heal)} healing per trigger`),
      muted('5% of the damage dealt, healed back to you.'),
      muted(`Each proc hits up to ${LIGHT_OF_SARADOMIN_TARGETS} targets within 1 tile.`),
    ].filter(Boolean),
  };
}

// The whole card list for a build, in reading order: what your abilities hit
// for, then what each pick adds on top, then the god power.
// The Sliver of Edicts' activated effect. Deliberately all prose: three of the
// four lines are rules with no figure to compute against a build, and the one
// number that exists (40,000 healing) is already stated.
//
// The exception is armour. "Boosts combat stats to 255" reads like an
// offensive line, and the single biggest thing it does to a build is defensive
// and entirely implicit: Defence 255 runs through the same D^3/1250 baseline
// every armour figure here uses, so the total goes up roughly tenfold. That is what
// Teragard's Aegis, Barkscales and Steadfast Will are all scaling off while
// the Sliver is up, and it is worth stating in the same place as the effect
// that causes it rather than leaving it to be inferred from the toggle.
//
// Costed only when there is gear to cost it against - `armourAt` is null on an
// empty loadout, and the card falls back to the plain effect line.
function sliverCard({ armourAt, sliverArmour }) {
  const gain = armourAt != null && sliverArmour != null ? sliverArmour - armourAt : null;
  return {
    key: 'sliver-of-edicts',
    name: 'Sliver of Edicts',
    colour: 'extra',
    icon: 'icons/Sliver_of_Edicts.png',
    lines: [
      muted('On activate:'),
      strong('Revives you if you die'),
      strong('Boosts combat stats to 255'),
      gain != null && strong(`+${round(gain)} total armour while active`),
      gain != null &&
        muted(`${round(armourAt)} -> ${round(sliverArmour)}, from the Defence part of that boost.`),
      gain != null && warn('Armour interaction is not confirmed!'),
      strong('Heals you for 10k 4 times'),
      muted('90 second CD.'),
    ].filter(Boolean),
  };
}

// The four blessings that move a stat rather than paying out a share of one
// (see utils/blessingModifiers.js). Their cards state what they DID to the
// figures above, not what their reveal card says - the effect text is already
// on the Blessings page, and a build wants the consequence.
//
// Each is costed against the totals as they now stand, so the arithmetic on the
// card reconciles with the headline rather than being a second opinion on it.
function havocBornCard({ armourNow, lifeTotal, totalAD, effectiveAD }) {
  return {
    key: 'havoc-born',
    name: HAVOC_BORN,
    icon: iconFor(HAVOC_BORN),
    lines: [
      effectiveAD != null && totalAD != null
        ? strong(`+${round(effectiveAD - totalAD)} damage per hit`)
        : strong(`+${Math.round(HAVOC_BORN_DAMAGE_BONUS * 100)}% damage`),
      muted(`${Math.round(HAVOC_BORN_DAMAGE_BONUS * 100)}% more damage dealt - a multiplier on the hit, not on the ability damage stat.`),
      armourNow != null && strong(`${round(armourNow / (1 - HAVOC_BORN_PENALTY) - armourNow)} armour lost`),
      lifeTotal != null && strong(`${round(lifeTotal / (1 - HAVOC_BORN_PENALTY) - lifeTotal)} life points lost`),
      // Named because the armour half is the expensive one on this league's
      // builds and it is easy to read -25% as a survivability cost alone.
      armourNow != null &&
        muted('Both are -25%. Armour also feeds Teragard\'s Aegis, Barkscales, Steadfast Will and Striking Light, so they all pay it too.'),
    ].filter(Boolean),
  };
}

function trueEquilibriumCard(mods) {
  const per = TRUE_EQUILIBRIUM_PER_ALIGNMENT;
  const x = mods.alignments;
  return {
    key: 'true-equilibrium',
    name: TRUE_EQUILIBRIUM,
    icon: iconFor(TRUE_EQUILIBRIUM),
    lines: [
      strong(`${x} alignment${x === 1 ? '' : 's'} - everything below is ${x}x`),
      muted('One per distinct blessing colour held. God powers are awarded rather than chosen, so they do not count.'),
      strong(`+${round(per.abilityDamage * x)} base ability damage`),
      strong(`+${round(per.armour * x)} armour  +${round(per.lifePoints * x)} life points  +${round(per.prayerBonus * x)} prayer bonus`),
      strong(`+${(per.critChance * x).toFixed(1)}% critical strike chance  +${(per.critDamage * x).toFixed(1)}% critical strike damage`),
      // Crit is the one pair with nowhere to land: nothing else on this panel
      // reads it, so it is stated rather than folded into a total.
      muted('The armour, life points and prayer bonus are already inside the figures above. Critical strike is not modelled anywhere else, so it is quoted as granted.'),
    ],
  };
}

function higherPowerCard({ damage }) {
  return {
    key: 'higher-power',
    name: HIGHER_POWER,
    icon: iconFor(HIGHER_POWER),
    lines: [
      damage?.multiplierBonus
        ? strong(`+${round(damage.multiplierBonus)} base ability damage`)
        : strong(`+${Math.round(HIGHER_POWER_ABILITY_DAMAGE * 100)}% base ability damage`),
      damage?.multiplierBonus
        ? muted(
            `${Math.round(HIGHER_POWER_ABILITY_DAMAGE * 100)}% of ${round(damage.withAegis)} - the weapon-and-level figure PLUS Teragard's Aegis, since Aegis grants base ability damage too.`,
          )
        : muted(`${Math.round(HIGHER_POWER_ABILITY_DAMAGE * 100)}% of base ability damage, already inside the total above.`),
      // The lockout has no number, and it is the whole cost of the blessing -
      // stated in full rather than summarised so nobody takes this by accident.
      { text: "You lose Berserk, Death's Swiftness, Living Death and Sunshine." },
      muted('That trade is not modelled - every figure on this panel is a sustained one, and an ultimate is a window.'),
    ],
  };
}

function genesisEssenceCard(baseAD) {
  const weaponPart = baseAD?.parts?.find((p) => p.key === 'weapon');
  return {
    key: 'genesis-essence',
    name: GENESIS_ESSENCE,
    icon: iconFor(GENESIS_ESSENCE),
    isGod: true,
    lines: [
      weaponPart ? strong(`${round(weaponPart.value)} weapon damage at tier ${GENESIS_ESSENCE_TIER}`) : null,
      muted(`Every equipped weapon is treated as tier ${GENESIS_ESSENCE_TIER}, whatever it actually is.`),
      // Worth saying out loud: at t120 the gap to t95 ammunition is far wider
      // than it was, so a bow that was fine before can now be badly held back.
      baseAD?.ammoCap &&
        strong(`Held back to tier ${baseAD.ammoCap.ammoTier} by ${baseAD.ammoCap.name}`),
      baseAD?.ammoCap &&
        muted('Ammunition caps the weapon\'s tier, and tier 120 makes that cap cost far more than it used to.'),
    ].filter(Boolean),
  };
}

// The working behind the two crit figures. Worth a card of its own because the
// sources are scattered across gear, blessings and relics, and because a worn
// item can be paying nothing (the Stalker's ring without a bow) in a way no
// other stat on this panel manages.
function critCard(crit) {
  const part = (p) => `${p.value > 0 ? '+' : ''}${p.value} ${p.label}`;
  const lines = [
    strong(`${crit.chance}% critical strike chance`),
    muted(crit.chanceParts.map(part).join('   ')),
  ];

  if (crit.overflow > 0) {
    lines.push(
      strong(`Capped at ${crit.cap}% - ${crit.overflow}% converted to critical strike damage`),
      muted(`${crit.rawChance}% before the cap. Unholy Critual converts the excess 1:1, so crit chance from anywhere keeps paying past saturation.`),
    );
  }

  lines.push(strong(`+${crit.damage}% critical strike damage`));
  lines.push(muted(crit.damageParts.map(part).join('   ')));

  // The one worn item that can be dead weight. Said plainly rather than left
  // for the reader to notice a zero in the working above.
  const idle = crit.chanceParts.filter((p) => p.inactive);
  for (const p of idle) lines.push(warn(`${p.label} is paying nothing - ${p.note}.`));

  return { key: 'crit', name: 'Critical strike', colour: 'crit', lines };
}

// Tearing Thorns and Envenomed both rebuild Grasp of Guthix rather than adding
// a payout of their own, so both cards cost out the SAME proc from
// getGraspOfGuthix - Barkscales' card shows the finished figure too, and all
// three agree by construction.
function tearingThornsCard({ grasp }) {
  return {
    key: 'tearing-thorns',
    name: TEARING_THORNS,
    icon: iconFor(TEARING_THORNS),
    lines: [
      strong(`Grasp of Guthix ~${round(grasp.total)} damage`),
      muted(
        `${round(grasp.fromDamage)} from ability damage + ${round(grasp.fromLife)} from life points` +
          (grasp.poisonMultiplier > 1 ? `, then x${grasp.poisonMultiplier.toFixed(2)} poison` : ''),
      ),
      strong(`+${round(grasp.fromLife)} from 20-30% of maximum life points`),
      muted('25% is the average of that band.'),
      strong(`Triggers every ${grasp.triggerHits} hits of a damage over time ability`),
      { text: 'Damage over time abilities last 100% longer.' },
      muted('Double duration is double the hits feeding that trigger.'),
    ],
  };
}

function envenomedCard({ grasp }) {
  const percent = Math.round((grasp.poisonMultiplier - 1) * 100);
  return {
    key: 'envenomed',
    name: ENVENOMED,
    icon: iconFor(ENVENOMED),
    lines: [
      strong(`+${percent}% poison damage at ${grasp.herbloreLevel} Herblore`),
      muted(`50% flat, plus 2% per Herblore level.`),
      strong(`Grasp of Guthix ~${round(grasp.total)} damage`),
      muted(
        `${round(grasp.base)} before poison scaling. Grasp deals POISON damage, so this multiplies all of it.`,
      ),
      { text: 'Damaging an enemy disables their poison immunity for 30s.' },
      muted('Which is what makes poison worth scaling at all in endgame PvM.'),
    ],
  };
}

// Chaotic Insight: "Each combat equipment item counts as 2 additional pieces
// towards its set effect."
//
// Names the sets it is working on rather than stating the rule and stopping,
// because the rule alone does not answer the only question a build has - is any
// of my gear actually a set? Sets are listed from data/critSetBonus.js, which
// covers what this planner carries gear for; naming armour the planner cannot
// equip would promise something it cannot deliver.
function chaoticInsightCard({ crit, baseAD, equipped }) {
  const critSets = crit?.critSets;
  const best = critSets?.best;
  const achto = baseAD?.achto;
  // Every set-bonus set worn, whether or not this app models what it does -
  // the grant is real either way, and a card that only listed the two crit
  // sets would look like the effect ignores the rest of the loadout.
  const worn = getWornSetEffects(equipped);

  const lines = [];
  for (const entry of worn) {
    lines.push(strong(`+${entry.granted} pieces to ${entry.set}`));

    // The resulting effect, but ONLY where it is actually costed. Everything
    // else gets the grant and nothing more - inventing an effect line for a set
    // this app has never modelled would be worse than saying nothing.
    const crits = (critSets?.sets ?? []).find((c) => c.set === entry.set);
    if (crits && crits === best) {
      lines.push(muted(`${entry.worn} worn counting as ${crits.counted} - +${crits.chance}% critical strike chance from ${crits.effect}.`));
    } else if (crits) {
      lines.push(
        warn(`${entry.worn} worn counting as ${crits.counted}, but paying nothing - it shares one bonus with ${best?.set ?? 'the other set'} and they do not stack.`),
      );
    } else if (achto && achto.set === entry.set) {
      lines.push(
        muted(
          `${entry.worn} worn counting as ${achto.counted}${achto.capped ? ` (capped at ${ACHTO_MAX_PIECES})` : ''} - +${round(achto.bonus)} equipment damage bonus${achto.active ? '' : ', once an off-hand shield is equipped'}.`,
        ),
      );
    }
  }

  return {
    key: 'chaotic-insight',
    name: CHAOTIC_INSIGHT,
    icon: iconFor(CHAOTIC_INSIGHT),
    isGod: true,
    lines:
      lines.length > 0
        ? [muted('Boosting, on this build:'), ...lines]
        : [
            // Nothing worn means nothing to list. Says that rather than naming
            // every set it could have helped with - the same rule
            // perfidiousCard follows.
            { text: 'Each combat equipment item counts as 2 additional pieces towards its set effect.' },
            muted('No set effect on this loadout for it to count towards.'),
          ],
  };
}

// Perfidious pays out ONLY through the three named procs, so its card lists
// what it has actually changed on this build rather than what it could change
// on some other one. A build carrying none of them gets the honest version:
// nothing, and which blessings would fix that.
//
// Each line names the source blessing, because "Light of Saradomin" on its own
// does not tell you which pick brought it.
function perfidiousCard({ blessings, grasp, light, inferno }) {
  const has = (name) => blessings.includes(name);
  const affected = [];

  if (inferno && (has('Abyssal Cinders') || has(UNHOLY_CRITUAL))) {
    affected.push({
      line: strong(`Inferno of Zamorak ${inferno.baseChance}% -> ${inferno.chance}% chance on hit`),
      note: muted(`x${PERFIDIOUS_INFERNO_MULTIPLIER} activation chance, via ${has('Abyssal Cinders') ? 'Abyssal Cinders' : UNHOLY_CRITUAL}.`),
    });
  }

  if (grasp && (has('Barkscales') || has(TEARING_THORNS))) {
    affected.push({
      line: strong(`Grasp of Guthix every ${TEARING_THORNS_TRIGGER_HITS} -> every ${grasp.triggerHits} hits`),
      note: muted(`Activation requirement reduced, via ${has(TEARING_THORNS) ? TEARING_THORNS : 'Barkscales'}.`),
    });
  }

  if (light && (has('Striking Light') || has(LORD_OF_LIGHT))) {
    affected.push({
      line: strong(`Light of Saradomin ${light.baseCooldown}s -> ${light.cooldown}s cooldown`),
      note: muted(`Via ${has(LORD_OF_LIGHT) ? LORD_OF_LIGHT : 'Striking Light'}.`),
    });
  }

  return {
    key: 'perfidious',
    name: PERFIDIOUS,
    icon: iconFor(PERFIDIOUS),
    lines:
      affected.length > 0
        ? [muted('Empowering, on this build:'), ...affected.flatMap((a) => [a.line, a.note])]
        : [
            warn('Nothing on this build - Perfidious is paying nothing.'),
            muted(
              'It only empowers Inferno of Zamorak, Grasp of Guthix and Light of Saradomin. Take Abyssal Cinders or Unholy Critual, Barkscales or Tearing Thorns, or Striking Light or Lord of Light.',
            ),
          ],
  };
}

// Tempered Heart: "Generate 6% adrenaline every 1.2s."
//
// The only adrenaline source in the tree that does not depend on attacking, so
// its figures are stated as rates rather than as shares of a rotation - 6% per
// 1.2s is 5% a second, which is a full bar every 20 seconds from standing
// still.
function temperedHeartCard() {
  const perSecond = TEMPERED_HEART_ADRENALINE / TEMPERED_HEART_INTERVAL_SECONDS;
  return {
    key: 'tempered-heart',
    name: TEMPERED_HEART,
    icon: iconFor(TEMPERED_HEART),
    lines: [
      strong(`+${TEMPERED_HEART_ADRENALINE}% adrenaline every ${TEMPERED_HEART_INTERVAL_SECONDS}s`),
      strong(`${Math.round(perSecond * 60)}% adrenaline per minute`),
      muted(`${perSecond}% a second, off your rotation entirely - it ticks whether or not you are attacking.`),
      strong(`100% adrenaline in ${Math.round(100 / perSecond)}s from empty`),
      muted('Which removes the build-up phase rather than speeding it up.'),
    ],
  };
}

function buildCards(context) {
  const { blessings, style, equipped, baseAD, damage, payoutAD, aegis, aegisNow, armourNow, lifeTotal, prayerTotal, icyeneBonus, adrenaline, extras, resolvedGodTier, chinSplash, hasSliver, baseArmour, sliverArmour, resolvedGodTier2, mods, totalAD, effectiveAD, crit, light, grasp, inferno } =
    context;
  const cards = [];
  const picked = (name) => blessings.includes(name);
  // A god power, so it is in resolvedGodTier2 rather than in the picks.
  const hasChaoticInsight = resolvedGodTier2 === CHAOTIC_INSIGHT;

  if (damage) cards.push(abilityDamageCard(context));
  if (crit) cards.push(critCard(crit));
  if (baseAD?.achto) cards.push(achtoCard(baseAD.achto));
  if (adrenaline) cards.push(adrenalineCard(adrenaline, blessings));
  // Pushed straight after the adrenaline card so it lands immediately to the
  // right of Adrenaline Junkie whenever that one is present - the two are the
  // same subject, and reading them apart means holding one rate in your head
  // while you look for the other. Order is the only lever here: the cards flow
  // in a grid, so "next in the list" is "to the right of" until the row wraps.
  if (picked(TEMPERED_HEART)) cards.push(temperedHeartCard());

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

  // Before the blessings that take a share of these figures, because these are
  // what set them - reading Havoc Born's -25% armour after Barkscales' share of
  // that armour is reading the answer before the question.
  if (mods.equilibrium) cards.push(trueEquilibriumCard(mods));
  if (mods.higher) cards.push(higherPowerCard(context));
  if (mods.havoc) cards.push(havocBornCard({ armourNow, lifeTotal, totalAD, effectiveAD }));
  if (mods.genesis) cards.push(genesisEssenceCard(baseAD));
  if (hasChaoticInsight) cards.push(chaoticInsightCard(context));

  if (hasSliver) cards.push(sliverCard({ armourAt: baseArmour, sliverArmour }));

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
        strong(`Inferno of Zamorak ~${round(inferno.damage)} damage`),
        muted(
          `${inferno.chance}% chance on hit; rolls 100-200% of ability damage, single target.` +
            (inferno.perfidious ? ` ${inferno.baseChance}% before Perfidious.` : ''),
        ),
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
        strong(`Grasp of Guthix ~${round(grasp?.total ?? payoutAD * GRASP_OF_GUTHIX_AVERAGE_SHARE)} damage`),
        muted(
          `Every ${grasp?.triggerHits ?? 5}${grasp?.perfidious ? '' : 'th'} reduction; rolls 80-120% of ability damage as poison in a 3x3.`,
        ),
        // Named here rather than left to the Tearing Thorns / Envenomed cards,
        // because this is the line whose number those two changed.
        grasp?.tearingThorns &&
          muted(`Includes Tearing Thorns' life points and Envenomed's poison bonus where taken - see their cards.`),
      ],
    });
  }

  if (picked(PERFIDIOUS)) cards.push(perfidiousCard(context));
  if (grasp && picked(TEARING_THORNS)) cards.push(tearingThornsCard(context));
  if (grasp && picked(ENVENOMED)) cards.push(envenomedCard(context));

  if (payoutAD != null && armourNow != null && picked('Striking Light')) {
    cards.push(strikingLightCard(context));
  }

  if (light?.lordOfLight && payoutAD != null && armourNow != null) {
    cards.push(lordOfLightCard(context));
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

  // One card per awarded god power. Both are pushed in tier order, so a build
  // that has settled only its first half still shows that one rather than
  // nothing - the same "show it as soon as it is real" rule the rest of this
  // panel follows.
  for (const name of [resolvedGodTier, resolvedGodTier2]) {
    const godPower = name ? BLESSING_BY_NAME.get(name) : null;
    if (!godPower) continue;
    // These two have their own costed cards - this loop would otherwise add a
    // second one repeating the effect text.
    if (godPower.name === GENESIS_ESSENCE) continue;
    if (godPower.name === CHAOTIC_INSIGHT) continue;
    cards.push({
      key: `god-power-${godPower.godTier ?? 1}`,
      name: godPower.name,
      icon: godPower.icon,
      isGod: true,
      lines: [
        ...godPowerLines(godPower, style).map((text) => ({ text })),
        // Splash Zone's own text is all conditions - "area-of-effect and
        // multi-target attacks", "per tile the target occupies". Chinchompas
        // satisfy the first one on every hit, so for this loadout the whole
        // card collapses to one unconditional sentence.
        chinSplash &&
          godPower.name === 'Splash Zone' &&
          strong(`With chins you always deal ${SPLASH_ZONE_AOE_BONUS}% more damage`),
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
  godTier2,
  leagueRelics = [],
  archRelics = [],
  extras = [],
  armour,
  aegis,
  elderSources = [],
  caption,
  // My Build opens expanded: the panel IS the reason that page exists, so
  // hiding it behind a click there would bury the payoff. On a build card it
  // stays shut, because a listing of several cards each unfurling a dozen
  // effect tiles is unreadable. Only the initial state - the toggle still
  // works, and switching style tab does not re-collapse it, because this
  // component stays mounted across that change.
  defaultOpen = false,
  // A counter, not a boolean: "open this now" is an event, and a boolean would
  // latch the panel open so the visitor could never collapse it again. Every
  // increment opens it; the toggle keeps working in between.
  openSignal = 0,
}) {
  const [open, setOpen] = useState(defaultOpen);

  const seenSignal = useRef(openSignal);
  useEffect(() => {
    if (openSignal === seenSignal.current) return;
    seenSignal.current = openSignal;
    setOpen(true);
  }, [openSignal]);
  // 'none' | 'overload' | 'elder'. Clicking the active one turns it off, same
  // convention GearStatsSummary's own overload toggle uses.
  const [potion, setPotion] = useState('none');
  // Herblore level, for Envenomed's "+2% poison damage per Herblore level".
  // Unlike the potion row this is NOT a toggle-off - one of the two always
  // applies, because you always have a Herblore level. 99 is the default; 120
  // is the elite cap, and the gap between them (+248% vs +290% poison) is large
  // enough that assuming one would misreport the other by a wide margin.
  const [herbloreLevel, setHerbloreLevel] = useState(HERBLORE_LEVELS[0]);

  const theme = useMemo(() => {
    const tally = blessingColourTally(blessings);
    return { gradient: blessingGradient(tally), accent: dominantBlessingColour(tally) };
  }, [blessings]);

  const equipped = useMemo(() => equippedItemsFor(style, slots), [style, slots]);

  // Elder needs a source AND, when armour is being shown at all, a figure to
  // switch to. A build with no armour-scaling blessing passes no armour but can
  // still brew the potion, and it still moves that build's ability damage.
  const canElder = elderSources.length > 0 && (!armour || armour.elder != null);
  const hasSliver = leagueRelics.includes(SLIVER_RELIC);
  const state = (potion === 'elder' && !canElder) || (potion === 'sliver' && !hasSliver) ? 'none' : potion;
  const hasGear = Object.keys(equipped).length > 0;

  // The Sliver's armour and Aegis figures are DERIVED here rather than passed
  // in, unlike the three potion states. Two of this component's four callers
  // hand over armour precomputed in blessingBuilds.js, so a fourth state would
  // otherwise mean hand-authoring another total for every curated loadout. The
  // inputs are already on hand - `equipped` and `style` - so the same
  // gearStats helpers that produced the other three produce this one.
  //
  // Derived whenever the relic is held, NOT only when `armour` was passed: the
  // Sliver's card states its armour gain for every build that can press it,
  // including one whose blessings never read an armour total otherwise.
  // `armourNow` below stays gated on `armour` so that unchanged behaviour -
  // no armour-scaling blessing, no "Total armour" figure - is preserved.
  // Resolved BEFORE the stat totals, because Genesis Essence is a god power and
  // it changes weapon tier - so the modifiers below cannot be worked out until
  // it is known whether it was awarded.
  const resolvedGodTier = godTierFor(1, godTier, blessings);
  const resolvedGodTier2 = godTierFor(2, godTier2, blessings);

  // Picks plus awarded god powers. getBlessingModifiers reads Havoc Born, True
  // Equilibrium and Higher Power off the picks and Genesis Essence off the
  // gods, and alignmentCount ignores the gods by construction.
  const modBlessings = useMemo(
    () => [...blessings, resolvedGodTier, resolvedGodTier2].filter(Boolean),
    [blessings, resolvedGodTier, resolvedGodTier2],
  );
  const mods = useMemo(() => getBlessingModifiers(modBlessings), [modBlessings]);

  // Defence level each state puts you at, so armour can be re-derived per state
  // rather than read out of the `armour` prop's three precomputed figures.
  const defenceLevelFor = (potionState) =>
    potionState === 'sliver' ? SLIVER_COMBAT_LEVEL : combatLevelFor(potionState);

  // Two of this component's four callers hand over armour precomputed in
  // blessingBuilds.js, from a time when nothing could move it. Three things now
  // can - the Sliver's 255 Defence, Havoc Born's -25% and True Equilibrium's
  // flat bonus - and none of them are in those stored figures.
  //
  // So: derive whenever anything would change the answer, and otherwise keep
  // using the prop. That keeps the seven curated guides showing exactly the
  // numbers they were authored with, while a build that moves armour gets a
  // figure that actually accounts for it.
  const derivedArmour = mods.active || state === 'sliver';
  const armourAt = useMemo(() => {
    if (!hasGear) return () => null;
    return (potionState) =>
      getTotalArmour(equipped, style, defenceLevelFor(potionState), { blessings: modBlessings });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipped, hasGear, style, modBlessings]);

  const sliverArmour = useMemo(
    () => (hasSliver && hasGear ? armourAt('sliver') : null),
    [hasSliver, hasGear, armourAt],
  );
  // The unboosted total the Sliver's gain is measured from. Prefers the
  // caller's own figure when nothing would have changed it, so a curated guide
  // quotes the same number its loadout line shows.
  const baseArmour = useMemo(() => {
    if (mods.active && hasGear) return armourAt('none');
    return armour?.none ?? (hasSliver && hasGear ? armourAt('none') : null);
  }, [mods.active, armour, hasSliver, hasGear, armourAt]);

  const armourNow = (() => {
    if (derivedArmour && hasGear) return armourAt(state);
    if (!armour) return null;
    return armour[state] ?? armour.none;
  })();

  // Aegis is a quarter of whatever armour actually is, so once armour is being
  // derived the bonus has to be too - the prop's precomputed figures were taken
  // from the unmodified total and would understate or overstate it.
  const aegisNow = !aegis
    ? null
    : derivedArmour && armourNow != null
      ? getAegisAbilityDamage(armourNow, aegis.multiplier)
      : aegis[state] ?? aegis.none;

  // Base ability damage moves with the potion state because the formula's level
  // term reads the boosted combat stat - see utils/abilityDamage.js. It also
  // carries Genesis Essence's tier override, True Equilibrium's flat bonus and
  // Higher Power's multiplier, all of which show up in `parts`.
  const baseAD = useMemo(
    () =>
      hasGear
        ? getBaseAbilityDamage(equipped, { combatLevel: combatLevelFor(state), blessings: modBlessings })
        : null,
    [equipped, hasGear, state, modBlessings],
  );

  // Prayer bonus, computed for EVERY build rather than only Icyenic Faith ones:
  // Lord of Light scales Light of Saradomin by 2% per point, so a build with no
  // Icyenic Faith can still be reading this stat hard. The headline figure below
  // stays gated on something actually consuming it.
  const prayerBonusTotal = hasGear ? getTotalPrayerBonus(equipped, { blessings: modBlessings }) : 0;

  const hasIcyenic = leagueRelics.includes(ICYENIC_FAITH_RELIC);
  // True Equilibrium's prayer bonus is real prayer bonus, so Icyenic Faith
  // reads it like any other - see getTotalPrayerBonus.
  const hasLordOfLight = blessings.includes(LORD_OF_LIGHT);
  const hasEnvenomed = blessings.includes(ENVENOMED);
  const hasPerfidious = blessings.includes(PERFIDIOUS);
  const prayerTotal = hasGear && (hasIcyenic || hasLordOfLight) ? prayerBonusTotal : null;
  const icyeneBonus =
    hasIcyenic && prayerTotal != null && isIcyeneTomeWorn(equipped)
      ? Number((prayerTotal * ICYENE_PERCENT_PER_PRAYER).toFixed(1))
      : null;
  // Total health is worth stating whenever something has actually moved it -
  // Big Boned, an Extra that grants max LP, or now a blessing. A build with the
  // Totem but no Big Boned still has 1,500 more health than the loadout alone
  // implies, and it would be the one figure on this panel nothing accounted for.
  const bonusLife = extraLifePoints(extras);
  const hasBigBoned = blessings.includes('Big Boned');
  const lifeTotal =
    hasGear && (hasBigBoned || bonusLife > 0 || mods.lifeFlat > 0 || mods.havoc)
      ? getTotalLifePoints(equipped, {
          bigBoned: hasBigBoned,
          archRelics,
          extraLifePoints: bonusLife,
          blessings: modBlessings,
        })
      : null;

  const damage = baseAD
    ? getTotalAbilityDamage({
        base: baseAD.total,
        aegisBonus: aegisNow ?? 0,
        icyenePercent: icyeneBonus ?? 0,
        abilityDamageMultiplier: mods.abilityDamageMultiplier,
      })
    : null;
  // Everything downstream - Abyssal Cinders, Barkscales' Grasp, Light of
  // Saradomin - is a share of the FINISHED ability damage, not of the base.
  const totalAD = damage?.compounding ?? null;

  const chinSplash = hasChinchompaSplashZone(resolvedGodTier, equipped);


  // Critical strike is the one stat that reads gear, blessings and relics at
  // once - see utils/critChance.js, which also owns Unholy Critual's cap.
  const crit = useMemo(
    () => (hasGear ? getCritBreakdown({ equipped, blessings: modBlessings, leagueRelics }) : null),
    [hasGear, equipped, modBlessings, leagueRelics],
  );

  // Splash Zone is a multiplier on damage dealt rather than on the ability
  // damage STAT, so it sits outside the total above. With chinchompas it
  // applies to every hit unconditionally, which makes it indistinguishable in
  // practice from a bigger stat - so it gets its own headline, and everything
  // that takes a share of ability damage takes it of THIS figure. Grasp of
  // Guthix off a chin build really does hit 30% harder.
  //
  // Havoc Born's +20% is the same kind of thing - "your damage is increased",
  // not "your ability damage stat is increased" - so it multiplies here beside
  // Splash Zone rather than inside the total.
  const dealtMultiplier =
    (chinSplash ? 1 + SPLASH_ZONE_AOE_BONUS / 100 : 1) * mods.damageMultiplier;
  const effectiveAD =
    dealtMultiplier !== 1 && totalAD != null ? Math.round(totalAD * dealtMultiplier) : null;
  const payoutAD = effectiveAD ?? totalAD;

  // Both blessings that carry Light of Saradomin read this one figure, so they
  // can never disagree about what the proc is worth.
  const light =
    payoutAD != null && armourNow != null
      ? getLightOfSaradomin({
          payoutAD,
          armour: armourNow,
          prayerBonus: prayerBonusTotal,
          lordOfLight: hasLordOfLight,
          perfidious: hasPerfidious,
        })
      : null;

  // One Grasp of Guthix for whichever blessings carry it. Envenomed multiplies
  // it because Grasp deals poison damage - see getGraspOfGuthix.
  const grasp =
    payoutAD != null
      ? getGraspOfGuthix({
          payoutAD,
          lifeTotal: lifeTotal ?? 0,
          tearingThorns: blessings.includes(TEARING_THORNS),
          envenomed: hasEnvenomed,
          herbloreLevel,
          perfidious: hasPerfidious,
        })
      : null;

  const inferno = payoutAD != null ? getInfernoOfZamorak({ payoutAD, perfidious: hasPerfidious }) : null;

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

  // A SECOND row rather than two more entries in the first. Critical strike is
  // a pair of percentages among a row of flat totals, and the two read as one
  // stat - putting them on their own line keeps that pairing visible and stops
  // the headline row wrapping unpredictably as the build fills out.
  //
  // Always shown once there is gear: unlike armour or prayer bonus, everyone
  // has a crit chance, so an absent figure would read as "none" rather than
  // "nothing has moved it".
  const critFigures = crit
    ? [
        {
          key: 'crit-chance',
          label: 'Critical strike chance',
          value: `${crit.chance}%`,
          className: 'gear-stat-crit',
          // This total is honest about what it counts and silent about what it
          // does not, which on its own reads as a complete figure. The marker
          // says otherwise - see CRIT_INCOMPLETE_HINT.
          hint: CRIT_INCOMPLETE_HINT,
          // Named on the figure itself, because a capped number that silently
          // stops rising as you add crit gear is the most confusing thing this
          // panel could show without explanation.
          suffix: crit.overflow > 0 ? `capped, ${crit.overflow}% to damage` : null,
        },
        {
          key: 'crit-damage',
          label: 'Critical strike damage',
          value: `+${crit.damage}%`,
          className: 'gear-stat-crit',
        },
      ]
    : [];

  const cards = buildCards({
    blessings,
    style,
    equipped,
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
    resolvedGodTier2,
    chinSplash,
    hasSliver,
    mods,
    totalAD,
    effectiveAD,
    crit,
    light,
    grasp,
    inferno,
    baseArmour,
    sliverArmour,
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
              <div className="leagues-effects-buffs">
              <div className="leagues-effects-potions">
                {STATES.map((entry) => {
                  if (entry.id === 'elder' && !canElder) return null;
                  if (entry.id === 'sliver' && !hasSliver) return null;
                  const active = state === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={`leagues-effects-potion${active ? ' active' : ''}`}
                      aria-pressed={active}
                      onClick={() => setPotion(active ? 'none' : entry.id)}
                    >
                      {/* Both labels are always in the DOM, one of them
                          collapsed to zero width. Swapping the text outright
                          cannot be transitioned - there is no "from" width to
                          animate out of - so each sits in its own 0fr/1fr grid
                          column and the column is what moves. See
                          .leagues-effects-potion-word. */}
                      {/* aria-hidden on whichever is collapsed: zero width and
                          overflow:hidden do not take an element out of the
                          accessibility tree, so without this the chip announces
                          itself as "Ovl Overload +17". */}
                      <span
                        className={`leagues-effects-potion-word${active ? '' : ' shown'}`}
                        aria-hidden={active}
                      >
                        <span>{entry.short}</span>
                      </span>
                      <span
                        className={`leagues-effects-potion-word${active ? ' shown' : ''}`}
                        aria-hidden={!active}
                      >
                        <span>{entry.label}</span>
                      </span>
                      <span className="leagues-effects-potion-defence">{entry.bonus}</span>
                    </button>
                  );
                })}
                {/* Only while elder is the ACTIVE state. It answers "can this
                    build even brew one", which is a question about the chip
                    that was just pressed - parked beside an unpressed chip it
                    was a permanent caption on a row that is meant to read as
                    three short options. */}
                {state === 'elder' && (
                  <span className="leagues-effects-elder-note">via {elderSources.join(' + ')}</span>
                )}
                {/* The Sliver's numbers need their frame stated: they last 16.8
                    seconds, and the armour ones extrapolate the Defence-to-armour
                    formula far past the level it was verified at (see
                    gearStats.js's getSkillArmour). Quoting 15,000 armour with no
                    caveat would read as a sustained figure someone can plan gear
                    around. */}
                {state === 'sliver' && (
                  <span className="leagues-effects-elder-note">
                    16.8s burst - armour extrapolated past 99 Defence
                  </span>
                )}
              </div>

              {/* Second row, and only for Envenomed - it is the one blessing
                  whose payout depends on a skill level rather than on gear or
                  picks, so there is nothing to choose until it is taken.
                  Unlike the potion row above, one of these is ALWAYS on:
                  clicking the active chip does not turn it off, because you
                  cannot have no Herblore level. */}
              {hasEnvenomed && (
                <div className="leagues-effects-potions leagues-effects-herblore">
                  {HERBLORE_LEVELS.map((level) => {
                    const active = herbloreLevel === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        className={`leagues-effects-potion${active ? ' active' : ''}`}
                        aria-pressed={active}
                        onClick={() => setHerbloreLevel(level)}
                      >
                        <span
                          className={`leagues-effects-potion-word${active ? '' : ' shown'}`}
                          aria-hidden={active}
                        >
                          <span>{level}</span>
                        </span>
                        <span
                          className={`leagues-effects-potion-word${active ? ' shown' : ''}`}
                          aria-hidden={!active}
                        >
                          <span>{level} Herblore</span>
                        </span>
                        <span className="leagues-effects-potion-defence">
                          +{Math.round((getPoisonMultiplier({ envenomed: true, herbloreLevel: level }) - 1) * 100)}%
                        </span>
                      </button>
                    );
                  })}
                  <span className="leagues-effects-elder-note">poison damage, via Envenomed</span>
                </div>
              )}
              </div>
            )}

            <div className="leagues-effects-figure-rows">
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
              {critFigures.length > 0 && (
                <dl className="leagues-effects-figures leagues-effects-figures-crit">
                  {critFigures.map((figure) => (
                    <div key={figure.key} className="leagues-effects-figure">
                      <dt>
                        {figure.label}
                        {figure.hint && (
                          <TagTooltip className="leagues-effects-warn-marker" tooltip={figure.hint}>
                            !
                          </TagTooltip>
                        )}
                      </dt>
                      <dd>
                        <strong className={figure.className}>{figure.value}</strong>
                        {figure.suffix && (
                          <span className="leagues-effects-figure-suffix"> {figure.suffix}</span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
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
