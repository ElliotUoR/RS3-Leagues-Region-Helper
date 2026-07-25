// Unlockable abilities reference for RS3 Leagues II: Equilibrium.
//
// Scope: only abilities that runescape.wiki's "Unlocking abilities" section
// (https://runescape.wiki/w/Abilities#Unlocking_abilities) marks as locked
// by something other than a plain skill-level requirement - codex reads,
// quest completions, monster/boss drops, shop purchases, or one specific
// skill milestone (Dive). The vast majority of abilities unlock automatically
// at their level requirement and are intentionally out of scope here; this
// tab only shows the subset actually gated behind something a Leagues region
// pick can lock you out of.
//
// `style` is the ability's real combat-style classification (per
// runescape.wiki's Melee/Ranged/Magic/Necromancy/Defensive ability-list
// pages), NOT the skill named in its level requirement - e.g. several
// Constitution-levelled abilities (Storm Shards, Onslaught, Reprisal, etc.)
// are officially "Defensive" abilities usable by any combat style, and are
// classified here as 'generic'. No unlockable ability is Necromancy-specific
// as of this writing (Necromancy abilities all unlock by level alone), so the
// Necro minitab is expected to render empty.
//
// `source.region` follows the exact same conventions as gear.js/regions.js
// (single id / AND array / `{ anyOf }` OR-group / 'global' / 'relic') and is
// read by the same gearAvailability.js helpers - no separate ability-specific
// availability logic needed.
//
// Icons come from runescape.wiki's ability icon files, which are named
// `{Ability Name}.png` with two disambiguated exceptions (the "(ability)"
// suffix distinguishes the ability from a same-named quest/skill page).
const FP = (file) => `icons/${file}`;

export const ABILITY_STYLES = ['melee', 'ranged', 'magic', 'necromancy', 'generic'];

// `worldWakes: true` marks the 4 abilities granted by completing The World
// Wakes (a Kandarin-set quest, per its Guthixian ruins climax). Some players
// treat this quest as effectively "already done" for Leagues purposes
// (auto-completed quest lines) - the Abilities page's "World Wakes -
// Autocompleted" toggle uses this flag to show these 4 as unlocked
// regardless of whether Kandarin is actually selected.
export const ABILITIES = [
  {
    name: 'Shadow Tendrils',
    style: 'ranged',
    icon: FP('Shadow_Tendrils.png'),
    source: {
      type: 'quest',
      detail:
        "Read the Codex ultimatus, obtained from the archaeological expert at the Exam Centre after completing The Dig Site",
      region: 'misthalin',
    },
  },
  {
    name: 'Smoke Tendrils',
    style: 'magic',
    icon: FP('Smoke_Tendrils.png'),
    source: {
      type: 'quest',
      detail:
        "Read the Codex ultimatus, obtained from the archaeological expert at the Exam Centre after completing The Dig Site",
      region: 'misthalin',
    },
  },
  {
    name: 'Ice Asylum',
    style: 'generic',
    icon: FP('Ice_Asylum.png'),
    source: {
      type: 'quest',
      detail:
        "Read the Codex ultimatus, obtained from the archaeological expert at the Exam Centre after completing The Dig Site",
      region: 'misthalin',
    },
  },
  {
    name: "Death's Swiftness",
    style: 'ranged',
    icon: FP('Death%27s_Swiftness.png'),
    worldWakes: true,
    source: { type: 'quest', detail: 'Obtained on completion of The World Wakes', region: 'kandarin' },
  },
  {
    name: 'Sunshine',
    style: 'magic',
    icon: FP('Sunshine.png'),
    worldWakes: true,
    source: { type: 'quest', detail: 'Obtained on completion of The World Wakes', region: 'kandarin' },
  },
  {
    name: 'Natural Instinct',
    style: 'generic',
    icon: FP('Natural_Instinct.png'),
    worldWakes: true,
    source: { type: 'quest', detail: 'Obtained on completion of The World Wakes', region: 'kandarin' },
  },
  {
    name: "Guthix's Blessing",
    style: 'generic',
    icon: FP('Guthix%27s_Blessing.png'),
    worldWakes: true,
    source: { type: 'quest', detail: 'Obtained on completion of The World Wakes', region: 'kandarin' },
  },
  {
    name: "Tuska's Wrath",
    style: 'generic',
    icon: FP('Tuska%27s_Wrath.png'),
    source: {
      type: 'shop',
      detail: "Rare drop from airuts/beastmaster's hounds, or purchased from the Raid Rewards shop for 15,000 teci",
      region: 'kharidianDesert',
    },
  },
  {
    name: 'Devotion',
    style: 'generic',
    icon: FP('Devotion.png'),
    source: { type: 'quest', detail: 'Obtained on completion of One Piercing Note', region: 'kharidianDesert' },
  },
  {
    name: 'Sacrifice',
    style: 'generic',
    icon: FP('Sacrifice.png'),
    source: { type: 'quest', detail: 'Obtained on completion of One Piercing Note', region: 'kharidianDesert' },
  },
  {
    name: 'Transfigure',
    style: 'generic',
    icon: FP('Transfigure.png'),
    source: { type: 'quest', detail: 'Obtained on completion of One Piercing Note', region: 'kharidianDesert' },
  },
  {
    name: 'Storm Shards',
    style: 'generic',
    icon: FP('Storm_Shards.png'),
    source: {
      type: 'shop',
      detail: 'Read the Storm Shards and Shatter Ability Codex, bought from the Armoursmith on Mazcab for 15,000 teci',
      region: 'kharidianDesert',
    },
  },
  {
    name: 'Shatter',
    style: 'generic',
    icon: FP('Shatter.png'),
    source: {
      type: 'shop',
      detail: 'Read the Storm Shards and Shatter Ability Codex, bought from the Armoursmith on Mazcab for 15,000 teci',
      region: 'kharidianDesert',
    },
  },
  {
    name: 'Onslaught',
    style: 'generic',
    icon: FP('Onslaught.png'),
    source: {
      type: 'shop',
      detail: 'Read the Onslaught Ability Codex, bought from the Armoursmith on Mazcab for 15,000 teci',
      region: 'kharidianDesert',
    },
  },
  {
    name: 'Corruption Shot',
    style: 'ranged',
    icon: FP('Corruption_Shot.png'),
    source: {
      type: 'shop',
      detail: 'Read the Corruption Shot Ability Codex, bought from the Armoursmith on Mazcab for 15,000 teci',
      region: 'kharidianDesert',
    },
  },
  {
    name: 'Corruption Blast',
    style: 'magic',
    icon: FP('Corruption_Blast.png'),
    source: {
      type: 'shop',
      detail: 'Read the Corruption Blast Ability Codex, bought from the Armoursmith on Mazcab for 15,000 teci',
      region: 'kharidianDesert',
    },
  },
  {
    name: 'Invoke Lord of Bones',
    style: 'necromancy',
    icon: FP('Invoke_Lord_of_Bones.png'),
    source: {
      type: 'boss',
      detail: 'Read the Invoke Lord of Bones incantation codex, dropped by Zemouregal & Vorkath',
      region: 'wilderness',
    },
  },
  {
    name: 'Double Escape',
    style: 'generic',
    icon: FP('Double_Escape_codex.png'),
    source: {
      type: 'skilling',
      detail: 'Read the Double Escape codex, crafted from 750 codex pages (farmed on the Anachronia Agility Course) at a lectern',
      region: 'anachronia',
    },
  },
  {
    name: 'Double Surge',
    style: 'generic',
    icon: FP('Double_Surge_codex.png'),
    source: {
      type: 'skilling',
      detail: 'Read the Double Surge codex, crafted from 750 codex pages (farmed on the Anachronia Agility Course) at a lectern',
      region: 'anachronia',
    },
  },
  {
    name: 'Reprisal',
    style: 'generic',
    icon: FP('Reprisal.png'),
    source: {
      type: 'boss',
      detail: 'Read the Reprisal ability codex, dropped by Telos, the Warden',
      region: 'kharidianDesert',
    },
  },
  {
    name: 'Bladed Dive',
    style: 'melee',
    icon: FP('Bladed_Dive.png'),
    source: {
      type: 'shop',
      detail: 'Purchased with 63,000,000 Shattered anima from Shattered Worlds',
      region: 'global',
    },
  },
  {
    name: 'Greater Barge',
    style: 'melee',
    icon: FP('Greater_Barge.png'),
    source: {
      type: 'boss',
      detail: 'Read the Greater Barge ability codex, dropped by Black Stone Dragon (Dragonkin Laboratory)',
      region: 'wilderness',
    },
  },
  {
    name: 'Greater Flurry',
    style: 'melee',
    icon: FP('Greater_Flurry.png'),
    source: {
      type: 'boss',
      detail: 'Read the Greater Flurry ability codex, dropped by Astellarn (Dragonkin Laboratory)',
      region: 'wilderness',
    },
  },
  {
    name: 'Greater Fury',
    style: 'melee',
    icon: FP('Greater_Fury.png'),
    source: {
      type: 'boss',
      detail: 'Read the Greater Fury ability codex, dropped by Verak Lith (Dragonkin Laboratory)',
      region: 'wilderness',
    },
  },
  {
    name: "Slayer's Insight",
    style: 'generic',
    icon: FP('Slayer%27s_Insight.png'),
    source: {
      type: 'shop',
      detail: 'Purchased with 90,000,000 Shattered anima from Shattered Worlds',
      region: 'global',
    },
  },
  {
    name: "Kuradal's Favour",
    style: 'generic',
    icon: FP('Kuradal%27s_Favour.png'),
    source: {
      type: 'shop',
      detail: 'Purchased with 90,000,000 Shattered anima from Shattered Worlds',
      region: 'global',
    },
  },
  {
    name: 'Aggression',
    style: 'generic',
    icon: FP('Aggression.png'),
    source: {
      type: 'shop',
      detail: 'Purchased with 90,000,000 Shattered anima from Shattered Worlds',
      region: 'global',
    },
  },
  {
    name: 'Golden Touch',
    style: 'magic',
    icon: FP('Golden_Touch.png'),
    source: {
      type: 'skilling',
      detail: 'Read the Golden Touch ability codex, crafted from 2,000 vital sparks (Sophanem Slayer Dungeon)',
      region: 'kharidianDesert',
    },
  },
  {
    name: 'Limitless',
    style: 'generic',
    icon: FP('Limitless.png'),
    source: {
      type: 'skilling',
      detail: 'Read the Limitless ability codex, crafted from 2,000 vital sparks (Sophanem Slayer Dungeon)',
      region: 'kharidianDesert',
    },
  },
  {
    name: 'Unsullied',
    style: 'generic',
    icon: FP('Unsullied.png'),
    source: {
      type: 'skilling',
      detail: 'Read the Unsullied ability codex, crafted from 2,000 vital sparks (Sophanem Slayer Dungeon)',
      region: 'kharidianDesert',
    },
  },
  {
    name: 'Dragon Slayer',
    style: 'generic',
    icon: FP('Dragon_Slayer_(ability).png'),
    source: {
      type: 'skilling',
      detail:
        'Read the Dragon Slayer ability codex, crafted via Invention from Black stone hearts (Crassian Leviathan/Taraket, The Shadow Reef) and Ports components (Player-Owned Ports, Asgarnia)',
      region: ['wilderness', { anyOf: ['asgarnia'], label: 'Ports components', component: true }],
    },
  },
  {
    name: 'Demon Slayer',
    style: 'generic',
    icon: FP('Demon_Slayer_(ability).png'),
    source: {
      type: 'skilling',
      detail:
        'Read the Demon Slayer ability codex, crafted via Invention from Black stone hearts (Crassian Leviathan/Taraket, The Shadow Reef) and Ports components (Player-Owned Ports, Asgarnia)',
      region: ['wilderness', { anyOf: ['asgarnia'], label: 'Ports components', component: true }],
    },
  },
  {
    name: 'Undead Slayer',
    style: 'generic',
    icon: FP('Undead_Slayer_(ability).png'),
    source: {
      type: 'skilling',
      detail:
        'Read the Undead Slayer ability codex, crafted via Invention from Black stone hearts (Crassian Leviathan/Taraket, The Shadow Reef) and Ports components (Player-Owned Ports, Asgarnia)',
      region: ['wilderness', { anyOf: ['asgarnia'], label: 'Ports components', component: true }],
    },
  },
  {
    name: 'Ingenuity of the Humans',
    style: 'generic',
    icon: FP('Ingenuity_of_the_Humans.png'),
    source: {
      type: 'skilling',
      detail:
        'Read the Ingenuity of the Humans ability codex, crafted via Invention from Black stone hearts (Crassian Leviathan/Taraket, The Shadow Reef)',
      region: 'wilderness',
    },
  },
  {
    name: 'Greater Ricochet',
    style: 'ranged',
    icon: FP('Greater_Ricochet.png'),
    source: {
      type: 'boss',
      detail: 'Read the Greater Ricochet ability codex, dropped by Raksha, the Shadow Colossus',
      region: 'anachronia',
    },
  },
  {
    name: 'Greater Chain',
    style: 'magic',
    icon: FP('Greater_Chain.png'),
    source: {
      type: 'boss',
      detail: 'Read the Greater Chain ability codex, dropped by Raksha, the Shadow Colossus',
      region: 'anachronia',
    },
  },
  {
    name: 'Divert',
    style: 'generic',
    icon: FP('Divert.png'),
    source: {
      type: 'boss',
      detail: 'Read the Divert ability codex, dropped by Raksha, the Shadow Colossus',
      region: 'anachronia',
    },
  },
  {
    name: 'Greater Concentrated Blast',
    style: 'magic',
    icon: FP('Greater_Concentrated_Blast.png'),
    source: {
      type: 'boss',
      detail: 'Read the Greater Concentrated Blast ability codex, dropped by Kerapac, the Bound',
      region: 'misthalin',
    },
  },
  {
    name: 'Magma Tempest',
    style: 'magic',
    icon: FP('Magma_Tempest.png'),
    source: {
      type: 'boss',
      detail: 'Read the Magma Tempest ability codex, dropped by TzKal-Zuk',
      region: 'misthalin',
    },
  },
  {
    name: 'Magma Tempest (Targeted)',
    style: 'magic',
    icon: FP('Magma_Tempest_(Targeted).png'),
    source: {
      type: 'boss',
      detail: 'Read the Magma Tempest ability codex, dropped by TzKal-Zuk (unlocked together with Magma Tempest)',
      region: 'misthalin',
    },
  },
  {
    name: 'Chaos Roar',
    style: 'melee',
    icon: FP('Chaos_Roar.png'),
    source: {
      type: 'boss',
      detail: 'Read the Chaos Roar ability codex, dropped by Zamorak, Lord of Chaos',
      region: 'misthalin',
    },
  },
  {
    name: 'Greater Sunshine',
    style: 'magic',
    icon: FP('Greater_Sunshine.png'),
    source: {
      type: 'combination',
      detail:
        "Crafted via Invention from a Codex of lost knowledge (Zamorak, Lord of Chaos) and Cywir components (disassembled Cywir elder gear from Helwyr)",
      region: ['misthalin', { anyOf: ['kharidianDesert'], label: 'Cywir components', component: true }],
    },
  },
  {
    name: "Greater Death's Swiftness",
    style: 'ranged',
    icon: FP('Greater_Death%27s_Swiftness.png'),
    source: {
      type: 'combination',
      detail:
        "Crafted via Invention from a Codex of lost knowledge (Zamorak, Lord of Chaos) and Cywir components (disassembled Cywir elder gear from Helwyr)",
      region: ['misthalin', { anyOf: ['kharidianDesert'], label: 'Cywir components', component: true }],
    },
  },
  {
    name: 'Dive',
    style: 'generic',
    icon: FP('Dive.png'),
    source: { type: 'skilling', detail: 'Reach level 30 Agility', region: 'global' },
  },
  {
    name: 'Greater Sonic Wave',
    style: 'magic',
    icon: FP('Greater_Sonic_Wave.png'),
    source: {
      type: 'boss',
      detail: 'Read the Greater Sonic Wave ability codex, dropped by Armoured phantoms/Risen ghosts (Wilderness)',
      region: 'wilderness',
    },
  },
];
