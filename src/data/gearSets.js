// "Combine Sets" mode for the Gear by Region page: collapses a complete
// thematic gear family into a single synthetic row, so e.g. Torva's 5 pieces
// show as one "Torva armour" card instead of 5 separate rows scattered
// across 5 slot sections.
//
// GEAR_SET_GROUPS maps an exact gear.js item `name` to its set's display
// name. A set is only synthesized when EVERY name mapped to that display
// name is present in the current filtered item list (see applyCombineSets) -
// a partial match (e.g. only 2 of 5 Torva pieces obtainable from the
// selected region, or a name search that only matches one piece) falls back
// to showing those piece(s) individually, exactly as if combine mode were
// off. This is a separate lookup table rather than a `set` field on each
// gear.js entry so the mapping stays reviewable as one list, without
// scattered edits across a 4400-line file.
//
// The governing rule (per project owner direction) is "same source, same
// set" - if every member shares the same boss/quest/shop origin, they
// combine, even when they're alternative loadout choices rather than pieces
// worn simultaneously (e.g. Vesta's Spear vs Vesta's longsword - you'd only
// ever wield one, but both come from Chaos Elemental/Revenants so both
// belong in "Wildy armour"). A handful of items get left OUT of an otherwise
// matching family because their actual source is genuinely different from
// the rest despite sharing a name prefix - each of those is called out
// in a comment at its exclusion point below.
//
// Tiered/variant families (Vesta's vs Superior Vesta's, Masterwork vs
// Trimmed masterwork, Tempest vs Achto Tempest, etc.) are each their OWN set
// - a tier never combines with its neighbouring tier, only with its own
// same-tier pieces.
//
// Sets that combine weapons/shields into what would otherwise be a pure
// armour set are named "X gear" rather than "X armour" to reflect that.
//
// Masterwork mage armour's hat WAS excluded here (it briefly carried an extra
// misthalin requirement for a Masterwork green cloth/ganodermic flake
// component) - that turned out not to be a real part of its recipe, so it's
// now folded into the set like every other Masterwork armour hat/helm.
export const GEAR_SET_GROUPS = {
  // --- Melee armour ---
  'Torva full helm': 'Torva armour',
  'Torva platebody': 'Torva armour',
  'Torva platelegs': 'Torva armour',
  'Torva gloves': 'Torva armour',
  'Torva boots': 'Torva armour',

  // Elder rune Longsword + round shield share the exact same
  // Smithing/Light-animica-ore source as the armour pieces (just a
  // different bar count in the shop text) - all one family.
  'Elder rune full helm': 'Elder rune equipment',
  'Elder rune platebody': 'Elder rune equipment',
  'Elder rune platelegs': 'Elder rune equipment',
  'Elder rune gauntlets': 'Elder rune equipment',
  'Elder rune armoured boots': 'Elder rune equipment',
  'Elder rune round shield + 5': 'Elder rune equipment',
  'Elder Rune Longsword': 'Elder rune equipment',

  'Bane full helm': 'Bane gear',
  'Bane platebody': 'Bane gear',
  'Bane platelegs': 'Bane gear',
  'Bane square shield': 'Bane gear',

  'Necronium full helm': 'Necronium armour',
  'Necronium platebody': 'Necronium armour',
  'Necronium platelegs': 'Necronium armour',

  // Bandos Warshield + Godsword both drop from General Graardor/asgarnia,
  // same as the armour (Godsword's extra "godsword blade" component isn't a
  // region requirement in this data).
  'Bandos helmet': 'Bandos gear',
  'Bandos chestplate': 'Bandos gear',
  'Bandos tassets': 'Bandos gear',
  'Bandos gloves': 'Bandos gear',
  'Bandos boots': 'Bandos gear',
  'Bandos Warshield': 'Bandos gear',
  'Bandos Godsword': 'Bandos gear',

  'Orikalkum full helm': 'Orikalkum gear',
  'Orikalkum platebody': 'Orikalkum gear',
  'Orikalkum platelegs': 'Orikalkum gear',
  'Orikalkum gauntlets': 'Orikalkum gear',
  'Orikalkum armoured boots': 'Orikalkum gear',
  'Orikalkum kiteshield': 'Orikalkum gear',

  // Malevolent helm/cuirass/greaves share one combination source (malevolent
  // energy + a Reinforcing plate); Malevolent Kiteshield's source is
  // genuinely simpler/different (just "Barrows: Rise of the Six", no
  // Reinforcing plate) so it's excluded here - see the kiteshield trio below.
  'Malevolent helm': 'Malevolent armour',
  'Malevolent cuirass': 'Malevolent armour',
  'Malevolent greaves': 'Malevolent armour',

  // All three PvP-tier kiteshields share the identical "Barrows: Rise of the
  // Six" source, one per combat style (melee/ranged/magic).
  'Malevolent Kiteshield': 'Rise of the Six kiteshields',
  'Vengeful kiteshield': 'Rise of the Six kiteshields',
  'Merciless kiteshield': 'Rise of the Six kiteshields',

  'Dragon Rider gloves': 'Dragon Rider gloves & boots',
  'Dragon Rider boots': 'Dragon Rider gloves & boots',

  'Teralith helmet': 'Teralith armour',
  'Teralith cuirass': 'Teralith armour',
  'Teralith leggings': 'Teralith armour',
  'Teralith gauntlets': 'Teralith armour',
  'Teralith boots': 'Teralith armour',
  'Achto Teralith helmet': 'Achto Teralith armour',
  'Achto Teralith cuirass': 'Achto Teralith armour',
  'Achto Teralith leggings': 'Achto Teralith armour',
  'Achto Teralith gauntlets': 'Achto Teralith armour',
  'Achto Teralith boots': 'Achto Teralith armour',

  // Tetsu katana/wakizashi are crafted at the same Player-Owned Ports
  // workshop (asgarnia) as the armour - one family.
  'Tetsu helm': 'Tetsu gear',
  'Tetsu body': 'Tetsu gear',
  'Tetsu platelegs': 'Tetsu gear',
  'Tetsu katana': 'Tetsu gear',
  'Tetsu wakizashi': 'Tetsu gear',
  'Superior tetsu helm': 'Superior tetsu gear',
  'Superior tetsu body': 'Superior tetsu gear',
  'Superior tetsu platelegs': 'Superior tetsu gear',
  'Elite tetsu katana': 'Superior tetsu gear',
  'Elite tetsu wakizashi': 'Superior tetsu gear',

  'Anima core helm of Zaros': 'Anima core armour of Zaros',
  'Anima core body of Zaros': 'Anima core armour of Zaros',
  'Anima core legs of Zaros': 'Anima core armour of Zaros',
  'Refined anima core helm of Zaros': 'Refined anima core armour of Zaros',
  'Refined anima core body of Zaros': 'Refined anima core armour of Zaros',
  'Refined anima core legs of Zaros': 'Refined anima core armour of Zaros',

  'Anima core helm of Sliske': 'Anima core armour of Sliske',
  'Anima core body of Sliske': 'Anima core armour of Sliske',
  'Anima core legs of Sliske': 'Anima core armour of Sliske',
  'Refined anima core helm of Sliske': 'Refined anima core armour of Sliske',
  'Refined anima core body of Sliske': 'Refined anima core armour of Sliske',
  'Refined anima core legs of Sliske': 'Refined anima core armour of Sliske',

  'Masterwork helm': 'Masterwork armour',
  'Masterwork platebody': 'Masterwork armour',
  'Masterwork platelegs': 'Masterwork armour',
  'Masterwork gloves': 'Masterwork armour',
  'Masterwork boots': 'Masterwork armour',
  // Masterwork 2h Sword is NOT included here - it's disassembled from
  // Chaotic/Drygore/Blade of Nymora-Avaryss weapons across several regions,
  // a completely different (and much heavier) source than the armour.

  'Trimmed masterwork helm': 'Trimmed masterwork armour',
  'Trimmed masterwork platebody': 'Trimmed masterwork armour',
  'Trimmed masterwork platelegs': 'Trimmed masterwork armour',
  'Trimmed masterwork gloves': 'Trimmed masterwork armour',
  'Trimmed masterwork boots': 'Trimmed masterwork armour',

  // --- Ranged armour ---
  'Pernix cowl': 'Pernix armour',
  'Pernix body': 'Pernix armour',
  'Pernix chaps': 'Pernix armour',
  'Pernix gloves': 'Pernix armour',
  'Pernix boots': 'Pernix armour',

  'Armadyl buckler': 'Armadyl gear',
  'Armadyl helmet': 'Armadyl gear',
  'Armadyl chestplate': 'Armadyl gear',
  'Armadyl chainskirt': 'Armadyl gear',
  'Armadyl gloves': 'Armadyl gear',
  'Armadyl boots': 'Armadyl gear',
  'Armadyl Godsword': 'Armadyl gear',
  // Armadyl Crossbow (Commander Zilyana) and Armadyl battlestaff (Glacors)
  // are NOT included - different bosses from Kree'arra despite the shared
  // "Armadyl" branding, so a genuinely different source.

  'Apex hide cowl': 'Apex hide armour',
  'Apex hide body': 'Apex hide armour',
  'Apex hide chaps': 'Apex hide armour',
  'Apex hide vambraces': 'Apex hide armour',
  'Apex hide boots': 'Apex hide armour',

  'Masterwork ranged cowl': 'Masterwork ranged armour',
  'Masterwork ranged body': 'Masterwork ranged armour',
  'Masterwork ranged chaps': 'Masterwork ranged armour',
  'Masterwork ranged vambraces': 'Masterwork ranged armour',
  'Masterwork ranged boots': 'Masterwork ranged armour',
  // Masterwork bow excluded for the same reason as Masterwork 2h Sword above.

  'Sirenic mask': 'Sirenic armour',
  'Sirenic hauberk': 'Sirenic armour',
  'Sirenic chaps': 'Sirenic armour',
  'Elite sirenic mask': 'Elite sirenic armour',
  'Elite sirenic hauberk': 'Elite sirenic armour',
  'Elite sirenic chaps': 'Elite sirenic armour',

  'Dracolich coif': 'Dracolich armour',
  'Dracolich hauberk': 'Dracolich armour',
  'Dracolich chaps': 'Dracolich armour',
  'Dracolich vambraces': 'Dracolich armour',
  'Dracolich boots': 'Dracolich armour',
  'Elite dracolich coif': 'Elite dracolich armour',
  'Elite dracolich hauberk': 'Elite dracolich armour',
  'Elite dracolich chaps': 'Elite dracolich armour',
  'Elite dracolich vambraces': 'Elite dracolich armour',
  'Elite dracolich boots': 'Elite dracolich armour',
  // Undead dragonhide coif shares Dracolich's source but is a head-slot
  // ALTERNATIVE to Dracolich coif, not worn alongside it - excluded.

  'Tempest cowl': 'Tempest armour',
  'Tempest body': 'Tempest armour',
  'Tempest chaps': 'Tempest armour',
  'Tempest gloves': 'Tempest armour',
  'Tempest boots': 'Tempest armour',
  'Achto Tempest cowl': 'Achto Tempest armour',
  'Achto Tempest body': 'Achto Tempest armour',
  'Achto Tempest chaps': 'Achto Tempest armour',
  'Achto Tempest gloves': 'Achto Tempest armour',
  'Achto Tempest boots': 'Achto Tempest armour',

  'Death Lotus hood': 'Death Lotus armour',
  'Death Lotus chestplate': 'Death Lotus armour',
  'Death Lotus chaps': 'Death Lotus armour',
  'Superior Death Lotus hood': 'Superior Death Lotus armour',
  'Superior Death Lotus chestplate': 'Superior Death Lotus armour',
  'Superior Death Lotus chaps': 'Superior Death Lotus armour',

  'Anima core helm of Zamorak': 'Anima core gear of Zamorak',
  'Anima core body of Zamorak': 'Anima core gear of Zamorak',
  'Anima core legs of Zamorak': 'Anima core gear of Zamorak',
  // Blade of Nymora/Avaryss share the identical Twin Furies/kharidianDesert
  // source as Anima core of Zamorak - one family (no Refined-tier weapon
  // exists, so Refined anima core of Zamorak stays armour-only below).
  'Blade of Nymora': 'Anima core gear of Zamorak',
  'Blade of Avaryss': 'Anima core gear of Zamorak',
  'Refined anima core helm of Zamorak': 'Refined anima core armour of Zamorak',
  'Refined anima core body of Zamorak': 'Refined anima core armour of Zamorak',
  'Refined anima core legs of Zamorak': 'Refined anima core armour of Zamorak',

  // Grifolic shield is also a Polypore Dungeon (misthalin) drop, same as the
  // Ganodermic armour pieces - one family, renamed since it's not armour-only.
  'Ganodermic visor': 'Ganodermic gear',
  'Ganodermic poncho': 'Ganodermic gear',
  'Ganodermic leggings': 'Ganodermic gear',
  'Ganodermic gloves': 'Ganodermic gear',
  'Ganodermic boots': 'Ganodermic gear',
  'Grifolic shield': 'Ganodermic gear',

  'Black dragonhide coif': 'Black dragonhide armour',
  'Black dragonhide body': 'Black dragonhide armour',
  'Black dragonhide chaps': 'Black dragonhide armour',
  'Black dragonhide vambraces': 'Black dragonhide armour',
  'Black dragonhide boots': 'Black dragonhide armour',

  // --- Magic armour ---
  'Virtus wand': 'Virtus gear',
  'Virtus book': 'Virtus gear',
  'Virtus mask': 'Virtus gear',
  'Virtus robe top': 'Virtus gear',
  'Virtus robe legs': 'Virtus gear',
  'Virtus gloves': 'Virtus gear',
  'Virtus boots': 'Virtus gear',

  'Starbloom hat + 5': 'Starbloom armour',
  'Starbloom robe top + 5': 'Starbloom armour',
  'Starbloom robe bottom + 5': 'Starbloom armour',
  'Starbloom gloves + 5': 'Starbloom armour',
  'Starbloom boots + 5': 'Starbloom armour',

  'Cryptbloom helm': 'Cryptbloom armour',
  'Cryptbloom top': 'Cryptbloom armour',
  'Cryptbloom bottoms': 'Cryptbloom armour',
  'Cryptbloom gloves': 'Cryptbloom armour',
  'Cryptbloom boots': 'Cryptbloom armour',

  'Primeval mask': 'Primeval armour',
  'Primeval robe top': 'Primeval armour',
  'Primeval robe legs': 'Primeval armour',
  'Primeval gloves': 'Primeval armour',
  'Primeval boots': 'Primeval armour',

  'Hood of subjugation': 'Subjugation armour',
  'Garb of subjugation': 'Subjugation armour',
  'Gown of subjugation': 'Subjugation armour',
  'Gloves of subjugation': 'Subjugation armour',
  'Boots of subjugation': 'Subjugation armour',

  // Every Amascut, the Devourer drop in one set - the 5 resplendence armour
  // pieces plus her 3 signature weapons (Tumeken's Light for melee,
  // Devourer's Guard + The Devourer's Nexus for necromancy) - all wielding
  // alternatives, but all the same source.
  "Mask of Tumeken's resplendence": "Tumeken's resplendence",
  "Robe top of Tumeken's resplendence": "Tumeken's resplendence",
  "Robe bottom of Tumeken's resplendence": "Tumeken's resplendence",
  "Gloves of Tumeken's resplendence": "Tumeken's resplendence",
  "Boots of Tumeken's resplendence": "Tumeken's resplendence",
  "Tumeken's Light": "Tumeken's resplendence",
  "Devourer's Guard": "Tumeken's resplendence",
  "The Devourer's Nexus": "Tumeken's resplendence",
  // Khopesh of Tumeken is NOT included - it's crafted from a Khopesh of the
  // Kharidian + Magister blessings, a meaningfully different (multi-step)
  // source from Amascut's own direct drops above.

  'Mystic hat': 'Mystic armour',
  'Mystic robe top': 'Mystic armour',
  'Mystic robe bottom': 'Mystic armour',
  'Mystic gloves': 'Mystic armour',
  'Mystic boots': 'Mystic armour',

  'Anima core helm of Seren': 'Anima core gear of Seren',
  'Anima core body of Seren': 'Anima core gear of Seren',
  'Anima core legs of Seren': 'Anima core gear of Seren',
  // Wand/Orb of the Cywir elders share Anima core of Seren's exact Helwyr
  // source (no Refined-tier weapon exists, so Refined stays armour-only).
  'Wand of the Cywir elders': 'Anima core gear of Seren',
  'Orb of the Cywir elders': 'Anima core gear of Seren',
  'Refined anima core helm of Seren': 'Refined anima core armour of Seren',
  'Refined anima core body of Seren': 'Refined anima core armour of Seren',
  'Refined anima core legs of Seren': 'Refined anima core armour of Seren',

  'Masterwork hat': 'Masterwork mage armour',
  'Masterwork robe top': 'Masterwork mage armour',
  'Masterwork robe bottom': 'Masterwork mage armour',
  'Masterwork gloves (magic)': 'Masterwork mage armour',
  'Masterwork boots (magic)': 'Masterwork mage armour',
  // Masterwork staff excluded for the same reason as Masterwork 2h Sword/bow.

  'Tectonic mask': 'Tectonic armour',
  'Tectonic robe top': 'Tectonic armour',
  'Tectonic robe bottom': 'Tectonic armour',
  'Elite Tectonic mask': 'Elite Tectonic armour',
  'Elite Tectonic robe top': 'Elite Tectonic armour',
  'Elite Tectonic robe bottom': 'Elite Tectonic armour',

  // Seasinger kiba/makigai are crafted at the same Player-Owned Ports
  // workbench (asgarnia) as the robes - one family. (Weapon tier is called
  // "Elite" while the armour tier is called "Superior" - same tier, just
  // inconsistent in-game naming, so they share one set name here.)
  "Seasinger's hood": "Seasinger's gear",
  "Seasinger's robe top": "Seasinger's gear",
  "Seasinger's robe bottom": "Seasinger's gear",
  'Seasinger kiba': "Seasinger's gear",
  'Seasinger makigai': "Seasinger's gear",
  "Superior seasinger's hood": "Superior seasinger's gear",
  "Superior seasinger's robe top": "Superior seasinger's gear",
  "Superior seasinger's robe bottom": "Superior seasinger's gear",
  'Elite seasinger kiba': "Superior seasinger's gear",
  'Elite seasinger makigai': "Superior seasinger's gear",

  // --- Necromancy armour ---
  // Omni guard + Soulbound lantern are also Rasial drops (misthalin), same
  // as the First Necromancer robes - one family, renamed since it's no
  // longer robes-only.
  'Crown of the First Necromancer': "First Necromancer's gear",
  'Robe top of the First Necromancer': "First Necromancer's gear",
  'Robe bottom of the First Necromancer': "First Necromancer's gear",
  'Hand wrap of the First Necromancer': "First Necromancer's gear",
  'Foot wraps of the First Necromancer': "First Necromancer's gear",
  'Omni guard': "First Necromancer's gear",
  'Soulbound lantern': "First Necromancer's gear",

  'Deathwarden hood (tier 50)': 'Deathwarden armour (tier 50)',
  'Deathwarden robe top (tier 50)': 'Deathwarden armour (tier 50)',
  'Deathwarden robe bottom (tier 50)': 'Deathwarden armour (tier 50)',
  'Deathwarden gloves (tier 50)': 'Deathwarden armour (tier 50)',
  'Deathwarden boots (tier 50)': 'Deathwarden armour (tier 50)',

  'Deathwarden hood (tier 60)': 'Deathwarden armour (tier 60)',
  'Deathwarden robe top (tier 60)': 'Deathwarden armour (tier 60)',
  'Deathwarden robe bottom (tier 60)': 'Deathwarden armour (tier 60)',
  'Deathwarden gloves (tier 60)': 'Deathwarden armour (tier 60)',
  'Deathwarden boots (tier 60)': 'Deathwarden armour (tier 60)',

  'Deathwarden hood (tier 70)': 'Deathwarden armour (tier 70)',
  'Deathwarden robe top (tier 70)': 'Deathwarden armour (tier 70)',
  'Deathwarden robe bottom (tier 70)': 'Deathwarden armour (tier 70)',
  'Deathwarden gloves (tier 70)': 'Deathwarden armour (tier 70)',
  'Deathwarden boots (tier 70)': 'Deathwarden armour (tier 70)',

  'Deathwarden hood (tier 80)': 'Deathwarden armour (tier 80)',
  'Deathwarden robe top (tier 80)': 'Deathwarden armour (tier 80)',
  'Deathwarden robe bottom (tier 80)': 'Deathwarden armour (tier 80)',
  'Deathwarden gloves (tier 80)': 'Deathwarden armour (tier 80)',
  'Deathwarden boots (tier 80)': 'Deathwarden armour (tier 80)',

  'Deathwarden hood (tier 90)': 'Deathwarden armour (tier 90)',
  'Deathwarden robe top (tier 90)': 'Deathwarden armour (tier 90)',
  'Deathwarden robe bottom (tier 90)': 'Deathwarden armour (tier 90)',
  'Deathwarden gloves (tier 90)': 'Deathwarden armour (tier 90)',
  'Deathwarden boots (tier 90)': 'Deathwarden armour (tier 90)',

  'Deathdealer hood (tier 70)': 'Deathdealer armour (tier 70)',
  'Deathdealer robe top (tier 70)': 'Deathdealer armour (tier 70)',
  'Deathdealer robe bottom (tier 70)': 'Deathdealer armour (tier 70)',
  'Deathdealer gloves (tier 70)': 'Deathdealer armour (tier 70)',
  'Deathdealer boots (tier 70)': 'Deathdealer armour (tier 70)',

  'Deathdealer hood (tier 80)': 'Deathdealer armour (tier 80)',
  'Deathdealer robe top (tier 80)': 'Deathdealer armour (tier 80)',
  'Deathdealer robe bottom (tier 80)': 'Deathdealer armour (tier 80)',
  'Deathdealer gloves (tier 80)': 'Deathdealer armour (tier 80)',
  'Deathdealer boots (tier 80)': 'Deathdealer armour (tier 80)',

  'Deathdealer hood (tier 90)': 'Deathdealer armour (tier 90)',
  'Deathdealer robe top (tier 90)': 'Deathdealer armour (tier 90)',
  'Deathdealer robe bottom (tier 90)': 'Deathdealer armour (tier 90)',
  'Deathdealer gloves (tier 90)': 'Deathdealer armour (tier 90)',
  'Deathdealer boots (tier 90)': 'Deathdealer armour (tier 90)',

  // --- Wildy armour: Statius's, Vesta's, Zuriel's and Morrigan's are all
  // Chaos Elemental/Revenants (wilderness) drops - one mega-family per tier,
  // spanning melee/ranged/magic. Alternative weapon choices (Vesta's Spear
  // vs longsword) are both included since both come from the same place. ---
  "Statius's full helm": 'Wildy armour',
  "Statius's platebody": 'Wildy armour',
  "Statius's platelegs": 'Wildy armour',
  "Statius's Warhammer": 'Wildy armour',
  "Vesta's chainbody": 'Wildy armour',
  "Vesta's plateskirt": 'Wildy armour',
  "Vesta's longsword": 'Wildy armour',
  "Vesta's Spear": 'Wildy armour',
  "Zuriel's hood": 'Wildy armour',
  "Zuriel's robe top": 'Wildy armour',
  "Zuriel's robe bottom": 'Wildy armour',
  "Zuriel's staff": 'Wildy armour',
  "Morrigan's coif": 'Wildy armour',
  "Morrigan's leather body": 'Wildy armour',
  "Morrigan's leather chaps": 'Wildy armour',
  "Morrigan's javelin": 'Wildy armour',
  "Morrigan's throwing axe": 'Wildy armour',

  "Superior Statius's full helm": 'Superior wildy armour',
  "Superior Statius's platebody": 'Superior wildy armour',
  "Superior Statius's platelegs": 'Superior wildy armour',
  "Superior Statius's Warhammer": 'Superior wildy armour',
  "Superior Vesta's Chainbody": 'Superior wildy armour',
  "Superior Vesta's plateskirt": 'Superior wildy armour',
  "Superior Vesta's Longsword": 'Superior wildy armour',
  "Superior Vesta's Spear": 'Superior wildy armour',
  "Superior Zuriel's hood": 'Superior wildy armour',
  "Superior Zuriel's robe top": 'Superior wildy armour',
  "Superior Zuriel's robe bottom": 'Superior wildy armour',
  "Superior Zuriel's staff": 'Superior wildy armour',
  "Superior Morrigan's coif": 'Superior wildy armour',
  "Superior Morrigan's leather body": 'Superior wildy armour',
  "Superior Morrigan's leather chaps": 'Superior wildy armour',
  "Superior Morrigan's javelin": 'Superior wildy armour',
  "Superior Morrigan's throwing axe": 'Superior wildy armour',

  // --- Barrows Items: every one of the 7 named brothers (armour + weapon),
  // Akrisae's war mace ("one of the seven Barrows brothers" per its own
  // entry), and Amulet of the Forsaken (explicitly built to enhance the
  // Barrows set effects) - all identical boss: The Barrows Brothers,
  // region: morytania. ---
  "Dharok's Greataxe": 'Barrows Items',
  "Dharok's helm": 'Barrows Items',
  "Dharok's platebody": 'Barrows Items',
  "Dharok's platelegs": 'Barrows Items',
  "Guthan's Warspear": 'Barrows Items',
  "Guthan's helm": 'Barrows Items',
  "Guthan's platebody": 'Barrows Items',
  "Guthan's chainskirt": 'Barrows Items',
  "Torag's Hammer": 'Barrows Items',
  "Torag's helm": 'Barrows Items',
  "Torag's platebody": 'Barrows Items',
  "Torag's platelegs": 'Barrows Items',
  "Verac's Flail": 'Barrows Items',
  "Verac's helm": 'Barrows Items',
  "Verac's brassard": 'Barrows Items',
  "Verac's plateskirt": 'Barrows Items',
  "Ahrim's staff": 'Barrows Items',
  "Ahrim's wand": 'Barrows Items',
  "Ahrim's book of magic": 'Barrows Items',
  "Ahrim's hood": 'Barrows Items',
  "Ahrim's robe top": 'Barrows Items',
  "Ahrim's robe skirt": 'Barrows Items',
  "Karil's crossbow": 'Barrows Items',
  "Karil's pistol crossbow": 'Barrows Items',
  "Karil's off-hand pistol crossbow": 'Barrows Items',
  "Karil's coif": 'Barrows Items',
  "Karil's leathertop": 'Barrows Items',
  "Karil's leatherskirt": 'Barrows Items',
  "Linza's Hammer": 'Barrows Items',
  "Linza's helm": 'Barrows Items',
  "Linza's cuirass": 'Barrows Items',
  "Linza's greaves": 'Barrows Items',
  "Akrisae's war mace": 'Barrows Items',
  'Amulet of the Forsaken': 'Barrows Items',
  // Blighted rebounder (crafted FROM Ahrim's staff, but needs an extra
  // asgarnia leg + a Dragon defender) is NOT included - a meaningfully
  // heavier source than a plain Barrows Brothers drop.

  // --- Lunar gear: every Lunar Diplomacy reward in one set - no slot
  // conflicts at all (neck/ring/back/weapon/head/torso/legs/hands/feet),
  // so every piece really is worn simultaneously. ---
  'Lunar amulet': 'Lunar gear',
  'Lunar ring': 'Lunar gear',
  'Lunar cape': 'Lunar gear',
  'Lunar staff': 'Lunar gear',
  'Lunar helm': 'Lunar gear',
  'Lunar torso': 'Lunar gear',
  'Lunar legs': 'Lunar gear',
  'Lunar gloves': 'Lunar gear',
  'Lunar boots': 'Lunar gear',

  // --- Desert amulets: Desert Diary reward tiers, all kharidianDesert. ---
  'Desert amulet 2': 'Desert amulets',
  'Desert amulet 3': 'Desert amulets',
  'Desert amulet 4': 'Desert amulets',

  // --- Igneous capes: all 5 are TzKal-Zuk drops (Kal-Zuk needs a stricter
  // flawless clear, the other 4 just "no checkpoint used") - same boss. ---
  'Igneous Kal-Zuk': 'Igneous capes',
  'Igneous Kal-Ket': 'Igneous capes',
  'Igneous Kal-Xil': 'Igneous capes',
  'Igneous Kal-Mej': 'Igneous capes',
  'Igneous Kal-Mor': 'Igneous capes',

  'TokHaar-Kal-Ket': 'TokHaar capes',
  'TokHaar-Kal-Xil': 'TokHaar capes',
  'TokHaar-Kal-Mej': 'TokHaar capes',
  'TokHaar-Kal-Mor': 'TokHaar capes',

  'Roar of Awakening': 'Roar of Awakening & Ode to Deceit',
  'Ode to Deceit': 'Roar of Awakening & Ode to Deceit',

  'Am-hej': 'Am-hej & Am-zi',
  'Am-zi': 'Am-hej & Am-zi',

  'Vestments of havoc hood': 'Vestments of havoc',
  'Vestments of havoc robe top': 'Vestments of havoc',
  'Vestments of havoc robe bottom': 'Vestments of havoc',
  'Vestments of havoc boots': 'Vestments of havoc',

  // --- Melee dual-wielded weapon pairs ---
  'Drygore Rapier': 'Drygore rapiers',
  'Off-hand Drygore Rapier': 'Drygore rapiers',
  'Drygore Longsword': 'Drygore longswords',
  'Off-hand Drygore Longsword': 'Drygore longswords',
  'Drygore Mace': 'Drygore maces',
  'Off-hand Drygore Mace': 'Drygore maces',
  'Ripper Claw': 'Ripper claws',
  'Off-hand Ripper Claw': 'Ripper claws',
  'Khopesh of the Kharidian': 'Khopeshes of the Kharidian',
  'Off-hand Khopesh of the Kharidian': 'Khopeshes of the Kharidian',

  // --- Ranged dual-wielded weapon pairs ---
  'Blightbound crossbow': 'Blightbound crossbows',
  'Off-hand Blightbound crossbow': 'Blightbound crossbows',
  'Ascension crossbow': 'Ascension crossbows',
  'Off-hand Ascension crossbow': 'Ascension crossbows',
  'Dragon crossbow': 'Dragon crossbows',
  'Off-hand dragon crossbow': 'Dragon crossbows',
  'Death Lotus dart': 'Death Lotus darts',
  'Off-hand Death Lotus dart': 'Death Lotus darts',
  'Primal crossbow Mk. 5': 'Primal crossbows Mk. 5',
  'Off-hand primal crossbow Mk. 5': 'Primal crossbows Mk. 5',
  'Shadow glaive': 'Shadow glaives',
  'Off-hand shadow glaive': 'Shadow glaives',

  // --- Magic dual-wielded weapon pairs ---
  'Abyssal wand': 'Abyssal wand & orb',
  'Abyssal orb': 'Abyssal wand & orb',
  // Blisterwood staff shares the same morytania source as the wand/orb pair
  // (both ultimately gate on The Branches of Darkmeyer for the logs) - one
  // family of anti-vampyre weapons rather than a separate dual-wield pair.
  'Blisterwood wand': 'Blisterwood weapons',
  'Blisterwood orb': 'Blisterwood weapons',
  'Blisterwood staff': 'Blisterwood weapons',
  // Eternal magic weapons: every bow/staff/wand/orb cut from the same
  // eternal magic logs (Piscatoris, kandarin) - folded into one family per
  // direct instruction, superseding the old per-tier wand & orb pairs.
  'Eternal magic shortbow Mk. 5': 'Eternal magic weapons',
  'Eternal Magic longbow': 'Eternal magic weapons',
  'Meagre eternal magic staff': 'Eternal magic weapons',
  'Saturated eternal magic staff': 'Eternal magic weapons',
  'Eternal magic wand (meagre)': 'Eternal magic weapons',
  'Eternal magic orb (meagre)': 'Eternal magic weapons',
  'Eternal magic wand (saturated)': 'Eternal magic weapons',
  'Eternal magic orb (saturated)': 'Eternal magic weapons',
  // Both Nex drops, asgarnia.
  'Wand of the Praesul': 'Wand of the Praesul & Imperium core',
  'Imperium core': 'Wand of the Praesul & Imperium core',
  // Both Vorago drops, asgarnia.
  'Seismic wand': 'Seismic wand & singularity',
  'Seismic singularity': 'Seismic wand & singularity',

  // --- Necromancy dual-wielded weapon pairs ---
  'Gravite guard': 'Gravite guard & lantern',
  'Gravite lantern': 'Gravite guard & lantern',

  'Death guard (tier 10)': 'Death guard & Skull lantern (tier 10)',
  'Skull lantern (tier 10)': 'Death guard & Skull lantern (tier 10)',
  'Death guard (tier 20)': 'Death guard & Skull lantern (tier 20)',
  'Skull lantern (tier 20)': 'Death guard & Skull lantern (tier 20)',
  'Death guard (tier 30)': 'Death guard & Skull lantern (tier 30)',
  'Skull lantern (tier 30)': 'Death guard & Skull lantern (tier 30)',
  'Death guard (tier 40)': 'Death guard & Skull lantern (tier 40)',
  'Skull lantern (tier 40)': 'Death guard & Skull lantern (tier 40)',
  'Death guard (tier 50)': 'Death guard & Skull lantern (tier 50)',
  'Skull lantern (tier 50)': 'Death guard & Skull lantern (tier 50)',
  'Death guard (tier 60)': 'Death guard & Skull lantern (tier 60)',
  'Skull lantern (tier 60)': 'Death guard & Skull lantern (tier 60)',
  'Death guard (tier 70)': 'Death guard & Skull lantern (tier 70)',
  'Skull lantern (tier 70)': 'Death guard & Skull lantern (tier 70)',
  'Death guard (tier 80)': 'Death guard & Skull lantern (tier 80)',
  'Skull lantern (tier 80)': 'Death guard & Skull lantern (tier 80)',
  'Death guard (tier 90)': 'Death guard & Skull lantern (tier 90)',
  'Skull lantern (tier 90)': 'Death guard & Skull lantern (tier 90)',

  // --- Primal gear: armour + both weapon loadout choices (2h sword, or
  // 1h warhammer + either the offhand warhammer or the kiteshield) + the
  // kiteshield - all smithed from the same Primal ore. ---
  'Primal full helm + 5': 'Primal gear',
  'Primal platebody + 5': 'Primal gear',
  'Primal platelegs + 5': 'Primal gear',
  'Primal gauntlets + 5': 'Primal gear',
  'Primal armoured boots + 5': 'Primal gear',
  'Primal 2h Sword + 5': 'Primal gear',
  'Primal Warhammer + 5': 'Primal gear',
  'Primal Off Hand Warhammer + 5': 'Primal gear',
  'Primal kiteshield + 5': 'Primal gear',

  // Ruinous weapons: every main-hand/off-hand pair across all 4 combat
  // styles (melee rapier, ranged crossbow, magic staff, necromancy guard),
  // plus the 2h maul - all bought from the same Marmaros Dungeoneering
  // rewards trader (wilderness), per direct instruction folded into one
  // family rather than kept as separate per-style dual-wield pairs.
  'Ruinous Maul': 'Ruinous weapons',
  'Ruinous rapier': 'Ruinous weapons',
  'Off-hand ruinous rapier': 'Ruinous weapons',
  'Ruinous crossbow': 'Ruinous weapons',
  'Off-hand Ruinous crossbow': 'Ruinous weapons',
  'Ruinous staff': 'Ruinous weapons',
  'Ruinous guard': 'Ruinous weapons',
  'Ruinous lantern': 'Ruinous weapons',

  // Chaotic equipment: every Chaotic weapon/shield across all styles, all
  // bought from the same Marmaros Dungeoneering rewards trader (wilderness) -
  // folded into one family per direct instruction, same as Ruinous weapons.
  'Chaotic Rapier': 'Chaotic equipment',
  'Chaotic longsword': 'Chaotic equipment',
  'Off-hand chaotic longsword': 'Chaotic equipment',
  'Chaotic maul': 'Chaotic equipment',
  'Chaotic kiteshield': 'Chaotic equipment',
  'Chaotic crossbow': 'Chaotic equipment',
  'Off-hand chaotic crossbow': 'Chaotic equipment',
  'Chaotic staff': 'Chaotic equipment',

  // Annihilation/Decimation/Obliteration: the 3 tier-87 2h Wilderness boss
  // weapons, one per combat style.
  'Annihilation': 'T87 Wildy weapons',
  'Decimation': 'T87 Wildy weapons',
  'Obliteration': 'T87 Wildy weapons',

  // Glaiven/Ragefire/Steadfast boots: the 3 base-tier Glacor boot variants
  // (magic/ranged/melee), all the same Glacor drop - not combined with their
  // Emberkeen/Flarefrost/Hailfire upgrades, same tiering rule as elsewhere.
  'Glaiven boots': 'Glacor boots',
  'Ragefire boots': 'Glacor boots',
  'Steadfast boots': 'Glacor boots',

  // Enhanced/base Dino boots (Anachronia): each tier is its own set, never
  // combined across tiers, same as every other tier family.
  'Enhanced blast diffusion boots': 'Enhanced Dino boots',
  'Enhanced fleeting boots': 'Enhanced Dino boots',
  'Enhanced laceration boots': 'Enhanced Dino boots',
  'Blast diffusion boots': 'Dino boots',
  'Fleeting boots': 'Dino boots',
  'Laceration boots': 'Dino boots',

  // God Arrows: the 5 Elder God Dinarrow variants, all charged the same way
  // (95 Fletching, resonant anima) at Anachronia.
  'Bik arrow': 'God Arrows',
  'Ful arrow': 'God Arrows',
  'Jas demonbane arrow': 'God Arrows',
  'Jas dragonbane arrow': 'God Arrows',
  'Wen arrow': 'God Arrows',

  // Attuned crystal gear: every Attuned-tier crystal weapon/shield (all
  // Crystal Singing, Prifddinas/tirannwn) folded into one family per direct
  // instruction, superseding the old per-pair dual-wield sets.
  'Attuned crystal dagger': 'Attuned crystal gear',
  'Off-hand attuned crystal dagger': 'Attuned crystal gear',
  'Attuned crystal shield': 'Attuned crystal gear',
  'Attuned crystal chakram': 'Attuned crystal gear',
  'Off-hand attuned crystal chakram': 'Attuned crystal gear',
  'Attuned crystal bow': 'Attuned crystal gear',
  'Attuned crystal deflector': 'Attuned crystal gear',
  'Attuned crystal staff': 'Attuned crystal gear',
  'Attuned crystal wand': 'Attuned crystal gear',
  'Attuned crystal orb': 'Attuned crystal gear',
  'Attuned crystal ward': 'Attuned crystal gear',

  // Crystal gear: the base-tier (non-Attuned) crystal weapons/shields, all
  // tirannwn. Crystal Hatchet is deliberately excluded - a tool/weapon
  // hybrid upgraded from a Dragon hatchet rather than bought/crafted the
  // same way as the rest of this family (see its own gear.js entry, which
  // now also requires fremennikProvince for that Dragon hatchet source).
  'Crystal dagger': 'Crystal gear',
  'Crystal halberd': 'Crystal gear',
  'Crystal bow': 'Crystal gear',
  'Crystal deflector': 'Crystal gear',
  'Crystal staff': 'Crystal gear',
  'Crystal wand': 'Crystal gear',
  'Crystal orb': 'Crystal gear',
  'Crystal ward': 'Crystal gear',

  // Ascendri bolts are fletched directly from Ascension bolts (tipped with
  // Hydrix) - both Legio Primus/Ascension Monastery, kandarin.
  'Ascendri bolts': 'Ascendri bolts',
  'Ascension bolts': 'Ascendri bolts',

  // Automaton gloves: all 3 World Wakes automaton bosses' drops, kandarin.
  'Pneumatic gloves': 'Automaton gloves',
  'Static gloves': 'Automaton gloves',
  'Tracking gloves': 'Automaton gloves',

  // Corp spirit shields: the base blessed spirit shield plus all 4 sigil
  // upgrades - every one either drops from, or (for the sigils) is attached
  // to a shield sourced from, the Corporeal Beast, wilderness.
  'Spirit shield': 'Corp spirit shields',
  'Divine spirit shield': 'Corp spirit shields',
  'Elysian spirit shield': 'Corp spirit shields',
  'Arcane spirit shield': 'Corp spirit shields',
  'Spectral spirit shield': 'Corp spirit shields',

  // Noxious Scythe/longbow/staff are all Araxxor and Araxxi (morytania)
  // drops - one per combat style, same source.
  'Noxious Scythe': 'Noxious weapons',
  'Noxious longbow': 'Noxious weapons',
  'Noxious staff': 'Noxious weapons',

  // Sunspear (melee)/(ranged)/(magic) are the 3 style variants of the same
  // River of Blood quest reward. The plain "Sunspear" (no style suffix) is
  // NOT included - it's a genuinely different, lower-tier item from The
  // Lord of Vampyrium (see its own gear.js entry note).
  'Sunspear (melee)': 'Sunspear',
  'Sunspear (ranged)': 'Sunspear',
  'Sunspear (magic)': 'Sunspear',

  // The defender/repriser/rebounder/lantern progression: each tier's 3
  // combat-style variants (melee defender, ranged repriser, magic
  // rebounder/lantern) - never combined ACROSS tiers, same principle as
  // every other tier family. JMod-confirmed (see data/assumptions.js):
  // Barrows/Nex/KK have a CHANCE to drop the Corruption Sigil/Ancient
  // Emblem/Perfect Chitin outright, rather than needing the previous tier's
  // item already held to receive the drop - so each tier's region
  // requirement no longer cascades from the tier below it.
  'Corrupted defender': 'Corrupted defender(s)',
  'Tainted repriser': 'Corrupted defender(s)',
  'Blighted rebounder': 'Corrupted defender(s)',

  // Both components (ancient emblem + chaotic splint) are still required as
  // normal - only the "must already hold a tier-70 item" condition on the
  // emblem was removed, so this tier still needs both asgarnia and
  // wilderness for all 3 variants.
  'Ancient defender': 'Ancient defender(s)',
  'Ancient repriser': 'Ancient defender(s)',
  'Ancient lantern': 'Ancient defender(s)',

  // Perfect chitin (kharidianDesert) is common to all 3, but each variant
  // pairs it with a different second component: the Kalphite Defender's
  // drygore off-hand weapon is ALSO a KK/kharidianDesert drop (so it alone
  // needs nothing else), the rebounder adds a Seismic singularity (Vorago,
  // asgarnia), and the repriser adds an off-hand ascension crossbow (Legio
  // Primus, kandarin) - three genuinely different region combinations,
  // included as one set per direct instruction regardless.
  'Kalphite Defender': 'Kalphite defender(s)',
  'Kalphite repriser': 'Kalphite defender(s)',
  'Kalphite rebounder': 'Kalphite defender(s)',

  // Dark Shard/Sliver of Leng (upgraded tier) and Dark Ice Shard/Sliver
  // (base tier) are each their own dual-wield pair - not combined across
  // tiers, same as every other tiered pair.
  'Dark Shard of Leng': 'Dark Shard & Sliver of Leng',
  'Dark Sliver of Leng': 'Dark Shard & Sliver of Leng',
  'Dark Ice Shard': 'Dark Ice Shard & Sliver',
  'Dark Ice Sliver': 'Dark Ice Shard & Sliver',
};

// Expected member count per set, derived from GEAR_SET_GROUPS itself so
// there's no separate registry to keep in sync - a set only synthesizes once
// every one of its mapped names shows up in the current list.
const SET_EXPECTED_COUNTS = Object.values(GEAR_SET_GROUPS).reduce((counts, setName) => {
  counts.set(setName, (counts.get(setName) ?? 0) + 1);
  return counts;
}, new Map());

function buildSetItem(setName, members) {
  const representative = members[0];
  // Union rather than the representative's own styles - a mega-set like
  // Barrows Items or Wildy armour spans melee/ranged/magic at once, so a
  // single member's styles would under-report what the set actually covers.
  const applicableStyles = [...new Set(members.flatMap((m) => m.applicableStyles))];
  return {
    name: setName,
    icon: representative.icon,
    source: representative.source,
    level: representative.level,
    applicableStyles,
    twoHanded: representative.twoHanded,
    isCombinedSet: true,
    setPieceCount: members.length,
  };
}

// Splits `items` into `{ sets, singles }`: complete set/pair families become
// one synthetic row each (no `stats`, so GearByRegionRow's stat line is
// naturally empty - only the tooltip/region tags, copied verbatim from one
// representative member, are shown), while everything else - including any
// INCOMPLETE set (fewer members present than GEAR_SET_GROUPS expects) - comes
// back untouched in `singles`. Pass `combine: false` to bypass grouping
// entirely (used when the toggle is off).
export function applyCombineSets(items, { combine = true } = {}) {
  if (!combine) return { sets: [], singles: items };

  const bySetName = new Map();
  const singles = [];
  for (const item of items) {
    const setName = GEAR_SET_GROUPS[item.name];
    if (!setName) {
      singles.push(item);
      continue;
    }
    if (!bySetName.has(setName)) bySetName.set(setName, []);
    bySetName.get(setName).push(item);
  }

  const sets = [];
  for (const [setName, members] of bySetName) {
    if (members.length === SET_EXPECTED_COUNTS.get(setName)) {
      sets.push(buildSetItem(setName, members));
    } else {
      singles.push(...members);
    }
  }
  sets.sort((a, b) => a.name.localeCompare(b.name));

  return { sets, singles };
}
