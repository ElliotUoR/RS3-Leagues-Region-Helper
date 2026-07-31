// PvM "essentials" - the account-wide unlocks that decide your combat ceiling
// but are not gear, abilities, prayers or relics, so they had nowhere else to
// live. Potions, augmentation, familiars, prayer restore.
//
// They look unrelated at first glance, and they are: what they have in common
// is only that each one is quietly gated behind a region or a league relic, and
// that finding out on day three of a run is expensive. The point of the tab is
// to answer "does my region set actually support the way I want to fight" in
// one screen.
//
// `source.region` deliberately reuses the exact shape gear.js/relics.js use, so
// availability runs through the same gearAvailability.js helpers and the tags
// render with the same RegionTags component - a group can list regions, and
// `leagueRelic` names relics that satisfy it without any region at all (see
// normalizeLeagueRelicList).
//
// `caveat` is for a requirement we are NOT certain about. It renders as a
// visible warning rather than being silently folded into the availability
// result, because a wrong "yes" here costs someone a region pick.
const FP = (file) => `icons/essentials/${file}`;

export const ESSENTIALS = [
  {
    name: 'Overloads',
    icon: FP('Overload_potion.png'),
    summary: '+17 to every combat stat for 6 minutes.',
    why:
      'The baseline endgame boost, and the one every damage number on this site assumes. Through the Defence-to-armour formula the +17 Defence alone is worth roughly +540 armour, which any armour-scaling effect then multiplies.',
    source: { region: 'global', detail: 'Herblore 96 - no region requirement.' },
  },
  {
    name: 'Elder overload',
    icon: FP('Elder_overload_potion.png'),
    summary: '+25 to every combat stat, and it lifts your main damage stat too.',
    why:
      'Strictly better than a normal overload: +25 Defence is about +849 armour, and unlike the standard version it raises Strength / Ranged / Magic / Necromancy as well. On a Teragard\'s Aegis build that is worth roughly +692 ability damage on its own.',
    source: {
      // `label` is required for the relic alternative to show: a group with a
      // leagueRelic but no label falls through to plain region pills, which
      // ignore relics, so the tag would sit dark while the row was unlocked
      // (see RegionTags' RegionGroupPill).
      region: { anyOf: ['tirannwn'], label: 'Crystal flask', leagueRelic: 'Divine Druid' },
      detail:
        'Needs a crystal flask (Tirannwn) - or Divine Druid, which grants a flask and unlocks the Meilyr potion recipes outright.',
    },
  },
  {
    name: 'Ancient invention',
    icon: FP('Ancient_armour_gizmo.webp'),
    summary: 'Ancient gizmos, and the perks that only they can roll.',
    why:
      'The tier above standard Invention. Ancient gizmos are what put Aftershock, Precise 6 and the other top perk lines on your gear - without it your augmented gear is running materially below its ceiling.',
    source: { region: 'kandarin', detail: 'Unlocked in the Ancient Cavern / Kandarin.' },
  },
  {
    name: 'Ancient summoning',
    icon: FP('Binding_contract.webp'),
    summary: 'The strongest familiars in the game, via binding contracts.',
    why:
      'Ripper demons, Nightmare muspah and the rest of the ancient familiar line. A ripper is a large chunk of passive damage on any single-target kill, and nothing in the standard Summoning list replaces it.',
    // Voidwalker is deliberately NOT listed as a leagueRelic alternative here.
    // Doing so would mark this green with Voidwalker picked and no Kandarin,
    // i.e. tell someone they can skip a region on an unconfirmed reading. Void
    // Shards list "ancient summoning pouches" among their loot, which is a
    // random trickle rather than being able to make them on demand. The
    // possibility is surfaced as a caveat instead - under-promising a bypass
    // costs nothing, over-promising costs a region pick.
    source: { region: 'kandarin', detail: 'Unlocked in Kandarin.' },
    caveat:
      "Voidwalker may partly cover this - Void Shards can contain ancient summoning pouches. It is unclear if ancient summoning pouches are binding contracts - or if they are actually pouches ready to summon creatures. Likewise it is unclear if binding contracts can be 'bound' without the mystery complete.",
  },
  {
    name: 'Ancient elven ritual shard',
    icon: FP('Ancient_elven_ritual_shard.png'),
    summary: 'Restores prayer points on a short cooldown, forever.',
    why:
      'Effectively removes prayer potions from your inventory, which is several free slots and no downtime on long kills. Compounds with anything that wants sustained prayer uptime - Soul Split especially.',
    source: { region: 'tirannwn', detail: 'From the Prifddinas ritual site, Tirannwn.' },
  },
  {
    name: 'Adrenaline potion',
    icon: FP('Adrenaline_potion.png'),
    summary: 'Instantly restores 25% adrenaline.',
    why:
      'Front-loads an ultimate at the start of a kill instead of spending the first rotation building to it. The cheapest way to open hard.',
    source: { region: 'global', detail: 'Herblore 84 - no region requirement.' },
  },
  {
    name: 'Super adrenaline potion',
    icon: FP('Super_adrenaline_potion.png'),
    summary: 'Restores 25% adrenaline and grants Adrenaline Overload.',
    why:
      'The upgrade: on top of the instant adrenaline it suppresses drain for a short window, which is what makes back-to-back ultimates possible.',
    source: { region: 'global', detail: 'Herblore 96 - no region requirement.' },
    note:
      'Global to make, but hard to keep supplied without Golden Touch or Anachronia - so treat the tag as "possible", not "sustainable".',
  },
  {
    name: 'Adrenaline renewal potion',
    icon: FP('Adrenaline_renewal_potion.png'),
    summary: 'Adrenaline restored over time rather than in one hit.',
    why:
      'Keeps a long fight topped up instead of giving one burst, so it does more across an extended kill than a plain adrenaline potion does.',
    source: {
      region: { anyOf: ['anachronia'], label: 'Adrenaline renewal', leagueRelic: 'Golden Touch' },
      detail: 'Needs Anachronia - or the Golden Touch relic.',
    },
  },
  {
    name: 'Powerburst of vitality',
    icon: FP('Powerburst_of_vitality.webp'),
    summary: 'A short damage-reduction and restore window on a long cooldown.',
    why:
      'The standard "survive this" button. Being able to eat one mechanic per kill is often what separates a clear from a death on progression.',
    source: {
      region: { anyOf: ['anachronia'], label: 'Powerburst', leagueRelic: 'Golden Touch' },
      detail: 'Needs Anachronia - or the Golden Touch relic.',
    },
  },
  {
    name: 'Aggression potion',
    icon: FP('Aggression_potion.png'),
    summary: 'Pulls nearby monsters onto you for several minutes.',
    why:
      'Turns scattered slayer tasks and AoE training into something you stand still for. A large practical difference to how much of a run you spend walking.',
    source: {
      region: { anyOf: ['wilderness'], label: 'Bloodweed / searing ashes', leagueRelic: 'Golden Touch' },
      detail: 'Bloodweed and searing ashes come from the Wilderness - or take Golden Touch.',
    },
  },
  {
    name: 'Lantadyme incense sticks',
    icon: FP('Lantadyme_incense_sticks.png'),
    summary: 'A passive damage-reduction buff while burning.',
    why:
      'Cheap, permanent-uptime mitigation that stacks with everything else. Nothing gates it, so there is no reason not to run it.',
    source: { region: 'global', detail: 'Firemaking / Herblore - no region requirement.' },
    note: 'Superheated makes these substantially stronger if you have picked it.',
  },
  {
    name: 'Kwuarm incense sticks',
    icon: FP('Kwuarm_incense_sticks.webp'),
    summary: 'A passive damage buff while burning.',
    why:
      'The damage counterpart to Lantadyme, and the one nearly every serious PvM setup assumes. Worth checking early, because it is the one incense that is actually gated.',
    source: {
      region: { anyOf: ['kharidianDesert'], label: 'Acadia logs', leagueRelic: 'Transmutation' },
      detail: 'Burns acadia logs - the Desert, or Transmutation to convert into them.',
    },
    note: 'Superheated makes these substantially stronger if you have picked it.',
  },
  {
    name: 'Weapon poison++',
    icon: FP('Weapon_poison_plus2.png'),
    summary: 'Applies a damage-over-time poison to your target.',
    why: 'Free extra damage on anything poisonable, with no cost to your rotation.',
    source: { region: 'global', detail: 'Herblore 73 - no region requirement.' },
  },
  {
    name: 'Weapon poison+++',
    icon: FP('Weapon_poison_plus3.png'),
    summary: 'The strongest weapon poison.',
    why:
      'Meaningfully more than the ++ version over a long kill. The gated one of the pair, so it is worth knowing which you are getting.',
    source: {
      region: { anyOf: ['anachronia'], label: 'Weapon poison+++', leagueRelic: 'Golden Touch' },
      detail: 'Needs Anachronia - or the Golden Touch relic.',
    },
  },
  {
    name: 'Enhanced Excalibur',
    icon: 'icons/Enhanced_Excalibur.png',
    summary: 'A healing special attack, usable from the off-hand slot.',
    why:
      'Heals over time on a special attack that costs no adrenaline, so it is effectively free sustain. Listed here as well as in the Gear Planner because it is a survivability unlock you plan regions around, not a weapon you fight with.',
    // Same requirement the gear entry records - Taverley to obtain, Hard Seers'
    // Village achievements to enhance. Kept in step with gear.js by hand; the
    // two are separate entries on purpose, since this one is about planning.
    source: {
      region: ['asgarnia', 'kandarin'],
      detail:
        "Merlin's Crystal for the base sword (Taverley, Asgarnia), enhanced by the Lady of the Lake after the Hard Seers' Village achievements (Kandarin).",
    },
  },
];
