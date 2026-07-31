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
      '+17 to all stats. Through the Defence-to-armour formula the +17 Defence alone is worth roughly +540 armour, which any armour-scaling effect then multiplies.',
    source: { region: 'global', detail: 'Herblore 96 - no region requirement.' },
  },
  {
    name: 'Elder overload',
    icon: FP('Elder_overload_potion.png'),
    summary: '+25 to every combat stat for 6 minutes.',
    why:
      'Upgrade to an overload: +25 Defence is about +849 armour. On a Teragard\'s Aegis build that is worth roughly +692 ability damage on its own.',
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
      'Ancient gizmos unlock BIS weapon and armour perks',
    source: { region: 'kandarin', detail: 'Unlocked in the Ancient Cavern / Kandarin.' },
  },
  {
    name: 'Ancient summoning',
    icon: FP('Binding_contract.webp'),
    summary: 'The strongest familiars in the game, via binding contracts.',
    why:
      'Ripper demons, Kalgerion demon, Nightmare muspah, blood reavers. Gargoyle and divine druid combo to provide a +36 mining boost.',
    // Voidwalker is a confirmed alternative: its Void Shard table includes
    // every ancient Summoning pouch (see that relic's dropTable), so the
    // familiars are reachable without Kandarin.
    source: {
      region: { anyOf: ['kandarin'], label: 'Ancient pouches', leagueRelic: 'Voidwalker' },
      detail: 'Unlocked in Kandarin - or Voidwalker, whose Void Shards drop ancient Summoning pouches.',
    },
  },
  {
    name: 'Ancient elven ritual shard',
    icon: FP('Ancient_elven_ritual_shard.png'),
    summary: 'Restores prayer points on a short cooldown, forever.',
    why:
      'Restores up to 375 prayer points every 30 seconds.',
    source: { region: 'tirannwn', detail: 'From the Prifddinas ritual site, Tirannwn.' },
  },
  {
    name: 'Adrenaline potion',
    icon: FP('Adrenaline_potion.png'),
    summary: 'Restores 25% adrenaline.',
    why:
      'Useful after ultimates to reach thresholds quicker',
    source: { region: 'global', detail: 'Herblore 84 - no region requirement.' },
  },
  {
    name: 'Super adrenaline potion',
    icon: FP('Super_adrenaline_potion.png'),
    summary: 'Restores 30% adrenaline.',
    why:
      'More adrenaline than its predecessor',
    source: { region: 'global', detail: 'Herblore 96 - no region requirement.' },
    note:
      'Global to make, but adren crystals are hard to keep supplied without Golden Touch or Anachronia - so treat it as "possible", not "sustainable".',
  },
  {
    name: 'Adrenaline renewal potion',
    icon: FP('Adrenaline_renewal_potion.png'),
    summary: 'Adrenaline restored over time rather than at once',
    why:
      'Restores the most adrenaline - 40% over 10 ticks.',
    source: {
      region: { anyOf: ['anachronia'], label: 'Adrenaline renewal', leagueRelic: 'Golden Touch' },
      detail: 'Needs Anachronia - or the Golden Touch relic.',
    },
  },
  {
    name: 'Powerburst of vitality',
    icon: FP('Powerburst_of_vitality.webp'),
    summary: 'Temporarily double your hitpoints.',
    why:
      'Useful against many bosses, uniquely good this league due to the synergy with Big Bones and its HP scaling effect',
    source: {
      region: { anyOf: ['anachronia'], label: 'Powerburst', leagueRelic: 'Golden Touch' },
      detail: 'Needs Anachronia - or the Golden Touch relic.',
    },
  },
  {
    name: 'Aggression potion',
    icon: FP('Aggression_potion.png'),
    summary: 'Pulls aggro nearby monsters onto you for six minutes.',
    why:
      'Useful for lazy slayer and general training',
    source: {
      region: { anyOf: ['wilderness'], label: 'Bloodweed / searing ashes', leagueRelic: 'Golden Touch' },
      detail: 'Bloodweed and searing ashes come from the Wilderness - or take Golden Touch.',
    },
  },
  {
    name: 'Lantadyme incense sticks',
    icon: FP('Lantadyme_incense_sticks.png'),
    summary: 'Potion extension.',
    why:
      'Get an extra 2 minutes out of overloads and other timed potions',
    source: { region: 'global', detail: 'Firemaking / Herblore - no region requirement.' },
    note: 'Superheated makes these substantially stronger if you have picked it.',
  },
  {
    name: 'Kwuarm incense sticks',
    icon: FP('Kwuarm_incense_sticks.webp'),
    summary: 'Poison damage buff',
    why:
      'Provides up to +10% damage for weapon poison. Could synergise interestingly with Barkscales blessing',
    source: {
      region: { anyOf: ['kharidianDesert'], label: 'Acadia logs', leagueRelic: 'Transmutation' },
      detail: 'Burns acadia logs - the Desert, or Transmutation to convert into them.',
    },
    note: 'Superheated makes these substantially stronger if you have picked it.',
  },
  {
    name: 'Weapon poison++',
    icon: FP('Weapon_poison_plus2.png'),
    summary: 'Second best weapon poison.',
    why: 'Free extra damage on anything poisonable.',
    source: { region: 'global', detail: 'Herblore 73 - no region requirement.' },
  },
  {
    name: 'Weapon poison+++',
    icon: FP('Weapon_poison_plus3.png'),
    summary: 'Best weapon poison.',
    why:
      'Even more free damage on non-poison immune enemies.',
    source: {
      region: { anyOf: ['anachronia'], label: 'Weapon poison+++', leagueRelic: 'Golden Touch' },
      detail: 'Needs Anachronia - or the Golden Touch relic.',
    },
  },
  {
    name: 'Enhanced Excalibur',
    icon: 'icons/Enhanced_Excalibur.png',
    summary: 'A healing effect, usable from the inventory.',
    why:
      'Free sustain every 5 minutes',
    // Same requirement the gear entry records - Taverley to obtain, Hard Seers'
    // Village achievements to enhance. Kept in step with gear.js by hand; the
    // two are separate entries on purpose, since this one is about planning.
    source: {
      region: ['asgarnia', 'kandarin'],
      detail:
        "Enhanced by the Lady of the Lake (Asgarnia) after the Hard Seers' Village achievements (Kandarin).",
    },
  },
];
