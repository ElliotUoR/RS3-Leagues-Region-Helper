// Region definitions for RS3 Leagues II: Equilibrium.
// hotspot coordinates are percentages (0-100) positioned by eye over public/map.jpg,
// so markers stay aligned regardless of the rendered image size.

export const MAX_OPTIONAL = 3;

export const REGIONS = {
  misthalin: {
    name: 'Misthalin',
    fixed: true,
    includes: ['Underworld', 'Fort Forinthry'],
    hotspot: { x: 53, y: 44 },
  },
  karamja: {
    name: 'Karamja',
    fixed: true,
    hotspot: { x: 41, y: 68 },
  },
  havenhythe: {
    name: 'Havenhythe',
    fixed: true,
    hotspot: { x: 92, y: 56 },
  },
  morytania: {
    name: 'Morytania',
    fixed: false,
    hotspot: { x: 67, y: 46 },
  },
  anachronia: {
    name: 'Anachronia',
    fixed: false,
    hotspot: { x: 81, y: 20 },
  },
  kharidianDesert: {
    name: 'Kharidian Desert',
    fixed: false,
    includes: ['Mazcab'],
    hotspot: { x: 58, y: 76 },
  },
  asgarnia: {
    name: 'Asgarnia',
    fixed: false,
    includes: ['The Arc'],
    hotspot: { x: 45, y: 38 },
  },
  wilderness: {
    name: 'Wilderness',
    fixed: false,
    hotspot: { x: 53, y: 20 },
  },
  fremennikProvince: {
    name: 'Fremennik Province',
    fixed: false,
    hotspot: { x: 30, y: 15 },
  },
  kandarin: {
    name: 'Kandarin',
    fixed: false,
    hotspot: { x: 30, y: 47 },
  },
  tirannwn: {
    name: 'Tirannwn',
    fixed: false,
    includes: ['Lost Grove'],
    hotspot: { x: 20, y: 47 },
  },
};

export const REGION_IDS = Object.keys(REGIONS);
export const FIXED_REGIONS = REGION_IDS.filter((id) => REGIONS[id].fixed);
export const OPTIONAL_REGIONS = REGION_IDS.filter((id) => !REGIONS[id].fixed);

// Boss -> region mappings, sourced from runescape.wiki (location/infobox pages)
// and cross-checked against the region-folding rules confirmed with the user:
//   Underworld -> misthalin, Mazcab -> kharidianDesert,
//   The Arc -> asgarnia, Fort Forinthry -> misthalin (per its own wiki
//   infobox's "League" field for the Equilibrium League specifically -
//   despite being geographically embedded in the Wilderness),
//   Daemonheim-based content -> wilderness, Feldip Hills -> kandarin,
//   Troll Country/GWD -> asgarnia, Lost Grove -> tirannwn.
// A long tail of ~40 older/obscure legacy quest bosses is intentionally
// excluded (per user decision) as out of scope for region-locking.
//
// `quest: true` marks a boss whose only encounter is a one-time,
// non-repeatable quest fight (e.g. Count Draynor, Pest Queen). These stay
// in the dataset for completeness but are filtered out of the site's
// visual per-region boss list - only standing/repeatable bosses display.
// Note: TokHaar-Hok and Abomination both have a post-quest "refight" option
// per the wiki, but are still tagged quest:true per explicit user decision.
//
// `subLocation` is the specific dungeon/instance/landmark shown as a tag
// next to the boss name (e.g. "Underworld", "Sanctum of Rebirth").
const FP = (file) => `icons/${file}`;

export const BOSSES = [
  // Misthalin (incl. Underworld / Senntisten, Fort Forinthry)
  {
    name: 'Dragith Nurn',
    region: 'misthalin',
    subLocation: 'Lumbridge Catacombs',
    drops: [
      { name: 'Mask part 5', icon: FP('Mask_part_5.png') },
      { name: "Lady Grey's guitar", icon: FP('Lady_Grey%27s_guitar.png') },
    ],
  },
  {
    name: 'Rasial, the First Necromancer',
    region: 'misthalin',
    subLocation: 'Underworld',
    drops: [
      { name: 'Omni guard', icon: FP('Omni_guard.png') },
      { name: 'Soulbound lantern', icon: FP('Soulbound_lantern.png') },
      { name: 'Crown of the First Necromancer', icon: FP('Crown_of_the_First_Necromancer.png') },
      { name: 'Robe top of the First Necromancer', icon: FP('Robe_top_of_the_First_Necromancer.png') },
      { name: 'Robe bottom of the First Necromancer', icon: FP('Robe_bottom_of_the_First_Necromancer.png') },
      { name: 'Hand wrap of the First Necromancer', icon: FP('Hand_wrap_of_the_First_Necromancer.png') },
      { name: 'Foot wraps of the First Necromancer', icon: FP('Foot_wraps_of_the_First_Necromancer.png') },
    ],
  },
  {
    name: 'Hermod, the Spirit of War',
    region: 'misthalin',
    subLocation: 'Underworld',
    drops: [
      { name: 'Hermodic plate', icon: FP('Hermodic_plate.png') },
      { name: "Hermod's armour spike", icon: FP('Hermod%27s_armour_spike.png') },
      { name: "Hermod's helmet", icon: FP('Hermod%27s_helmet.png') },
    ],
  },
  {
    name: 'Vermyx, Brood Mother',
    region: 'misthalin',
    subLocation: 'Sanctum of Rebirth',
    drops: [
      { name: 'Divine Rage prayer codex', icon: FP('Divine_Rage_prayer_codex.png') },
      { name: 'Scripture of Amascut', icon: FP('Scripture_of_Amascut.png') },
      { name: 'The Brood Mother', icon: FP('The_Brood_Mother.png') },
    ],
  },
  {
    name: 'Kezalam, the Wanderer',
    region: 'misthalin',
    subLocation: 'Sanctum of Rebirth',
    drops: [
      { name: 'Divine Rage prayer codex', icon: FP('Divine_Rage_prayer_codex.png') },
      { name: 'Scripture of Amascut', icon: FP('Scripture_of_Amascut.png') },
    ],
  },
  {
    name: 'Nakatra, Devourer Eternal',
    region: 'misthalin',
    subLocation: 'Sanctum of Rebirth',
    drops: [
      { name: 'Divine Rage prayer codex', icon: FP('Divine_Rage_prayer_codex.png') },
      { name: 'Scripture of Amascut', icon: FP('Scripture_of_Amascut.png') },
      { name: 'Roar of Awakening', icon: FP('Roar_of_Awakening.png') },
      { name: 'Ode to Deceit', icon: FP('Ode_to_Deceit.png') },
      { name: 'Shard of Genesis Essence', icon: FP('Shard_of_Genesis_Essence.png') },
    ],
  },
  {
    name: 'Kerapac, the Bound',
    region: 'misthalin',
    subLocation: 'Nodon Front (EGWD)',
    drops: [
      { name: "Kerapac's wrist wraps", icon: FP('Kerapac%27s_wrist_wraps.png') },
      { name: 'Greater Concentrated Blast ability codex', icon: FP('Greater_Concentrated_blast_ability_codex.png') },
      { name: 'Scripture of Jas', icon: FP('Scripture_of_Jas.png') },
      { name: 'Manuscript of Jas', icon: FP('Manuscript_of_Jas.png') },
      { name: 'Fractured Staff of Armadyl component', icon: FP('Fractured_Staff_of_Armadyl.png') },
    ],
  },
  {
    name: 'Arch-Glacor',
    region: 'misthalin',
    subLocation: 'Glacor Front (EGWD)',
    drops: [
      { name: 'Leng artefact', icon: FP('Leng_artefact.png') },
      { name: 'Scripture of Wen', icon: FP('Scripture_of_Wen.png') },
      { name: 'Manuscript of Wen', icon: FP('Manuscript_of_Wen.png') },
      { name: 'Frozen core of Leng', icon: FP('Frozen_core_of_Leng.png') },
    ],
  },
  {
    name: 'Croesus',
    region: 'misthalin',
    subLocation: 'Croesus Front (EGWD)',
    drops: [
      { name: 'Croesus foultorch', icon: FP('Croesus_foultorch.png') },
      { name: 'Croesus sporehammer', icon: FP('Croesus_sporehammer.png') },
      { name: 'Croesus spore sack', icon: FP('Croesus_spore_sack.png') },
      { name: 'Cryptbloom helm (incomplete)', icon: FP('Cryptbloom_helm_(incomplete).png') },
      { name: 'Cryptbloom top (incomplete)', icon: FP('Cryptbloom_top_(incomplete).png') },
      { name: 'Cryptbloom bottoms (incomplete)', icon: FP('Cryptbloom_bottoms_(incomplete).png') },
      { name: 'Cryptbloom gloves (incomplete)', icon: FP('Cryptbloom_gloves_(incomplete).png') },
      { name: 'Cryptbloom boots (incomplete)', icon: FP('Cryptbloom_boots_(incomplete).png') },
      { name: 'Scripture of Bik', icon: FP('Scripture_of_Bik.png') },
    ],
  },
  {
    name: 'TzKal-Zuk',
    region: 'misthalin',
    subLocation: 'TzekHaar Front (EGWD)',
    drops: [
      { name: 'Scripture of Ful', icon: FP('Scripture_of_Ful.png') },
      { name: 'Magma Tempest ability codex', icon: FP('Magma_Tempest_ability_codex.png') },
      { name: 'Ek-ZekKil', icon: FP('Ek-ZekKil.png') },
      { name: 'Igneous stone', icon: FP('Igneous_stone.png') },
      { name: "TzKal-Zuk's helmet", icon: FP('TzKal-Zuk%27s_helmet.png') },
    ],
  },
  {
    name: 'Skeletal Horror',
    region: 'misthalin',
    subLocation: 'Silvarea',
    drops: [{ name: "Skeleton Champion's scroll", icon: FP('Skeleton_Champion%27s_scroll.png') }],
  },
  {
    name: 'Zamorak, Lord of Chaos',
    region: 'misthalin',
    subLocation: 'Zamorakian Undercity',
    drops: [
      { name: 'Chaos Roar ability codex', icon: FP('Chaos_Roar_ability_codex.png') },
      { name: 'Vestments of havoc hood', icon: FP('Vestments_of_havoc_hood.png') },
      { name: 'Vestments of havoc robe top', icon: FP('Vestments_of_havoc_robe_top.png') },
      { name: 'Vestments of havoc robe bottom', icon: FP('Vestments_of_havoc_robe_bottom.png') },
      { name: 'Vestments of havoc boots', icon: FP('Vestments_of_havoc_boots.png') },
      { name: 'Bow of the Last Guardian', icon: FP('Bow_of_the_Last_Guardian.png') },
      { name: 'Codex of lost knowledge', icon: FP('Codex_of_lost_knowledge.png') },
      { name: 'Jewels of Zamorak', icon: FP('Jewels_of_Zamorak.png') },
    ],
  },
  { name: 'Count Draynor', region: 'misthalin', subLocation: 'Draynor Manor', quest: true },
  { name: 'Culinaromancer', region: 'misthalin', subLocation: 'Realm of the Culinaromancer', quest: true },
  {
    name: 'Zemouregal & Vorkath',
    region: 'misthalin',
    subLocation: 'Fort Forinthry',
    drops: [
      { name: "Vorkath's spike", icon: FP("Vorkath%27s_spike.png") },
      { name: 'Invoke Lord of Bones incantation codex', icon: FP('Invoke_Lord_of_Bones_incantation_codex.png') },
      { name: "Vorkath's scale", icon: FP("Vorkath%27s_scale.png") },
    ],
  },

  // Karamja (incl. TzHaar City)
  {
    name: 'TzTok-Jad',
    region: 'karamja',
    subLocation: 'TzHaar Fight Cave',
    drops: [
      { name: 'Fire cape', icon: FP('Fire_cape.png') },
      { name: "TzTok-Jad's head", icon: FP('TzTok-Jad%27s_head.png') },
    ],
  },
  {
    name: 'Har-Aken',
    region: 'karamja',
    subLocation: 'Fight Kiln',
    drops: [
      { name: 'TokHaar-Kal-Ket', icon: FP('TokHaar-Kal-Ket.png') },
      { name: 'TokHaar-Kal-Xil', icon: FP('TokHaar-Kal-Xil.png') },
      { name: 'TokHaar-Kal-Mej', icon: FP('TokHaar-Kal-Mej.png') },
      { name: 'TokHaar-Kal-Mor', icon: FP('TokHaar-Kal-Mor.png') },
      { name: 'Volcanic shard', icon: FP('Volcanic_shard.png') },
      { name: "Har-Aken's head", icon: FP('Har-Aken%27s_head.png') },
    ],
  },
  { name: 'General Khazard', region: 'karamja', subLocation: 'Fight Arena', quest: true },
  { name: 'TokHaar-Hok', region: 'karamja', subLocation: 'Fight Cauldron', quest: true },
  { name: 'TokTz-Ket-Dill', region: 'karamja', subLocation: 'TzHaar City tunnels', quest: true },
  { name: 'Abomination', region: 'karamja', subLocation: "Tarshak's Sanctum", quest: true },

  // Havenhythe
  {
    name: 'Ivar, King of Bones',
    region: 'havenhythe',
    subLocation: 'Hollow Hill',
    drops: [
      { name: 'Bonecrusher maul', icon: FP('Bonecrusher_maul.png') },
      { name: 'Magic skull mask', icon: FP('Magic_skull_mask.png') },
      { name: "Ivar's loincloth", icon: FP('Ivar%27s_loincloth.png') },
    ],
  },
  {
    name: 'Silverquill, the Dreadhog',
    region: 'havenhythe',
    subLocation: 'Blighted Cave',
    drops: [
      { name: 'Sanguine spines', icon: FP('Sanguine_spines.png') },
      { name: 'Silver spines', icon: FP('Silver_spines.png') },
      { name: "Silverquill's blood-filled cyst", icon: FP("Silverquill%27s_blood-filled_cyst.png") },
    ],
  },

  // Morytania
  {
    name: 'The Barrows Brothers',
    region: 'morytania',
    subLocation: 'The Barrows',
    drops: [
      { name: "Dharok's helm", icon: FP("Dharok%27s_helm.png") },
      { name: "Dharok's platebody", icon: FP("Dharok%27s_platebody.png") },
      { name: "Dharok's platelegs", icon: FP("Dharok%27s_platelegs.png") },
      { name: "Dharok's greataxe", icon: FP("Dharok%27s_greataxe.png") },
      { name: "Ahrim's hood", icon: FP("Ahrim%27s_hood.png") },
      { name: "Ahrim's robe top", icon: FP("Ahrim%27s_robe_top.png") },
      { name: "Ahrim's robe skirt", icon: FP("Ahrim%27s_robe_skirt.png") },
      { name: "Ahrim's staff", icon: FP("Ahrim%27s_staff.png") },
      { name: "Karil's coif", icon: FP("Karil%27s_coif.png") },
      { name: "Karil's top", icon: FP("Karil%27s_top.png") },
      { name: "Karil's skirt", icon: FP("Karil%27s_skirt.png") },
      { name: "Karil's crossbow", icon: FP("Karil%27s_crossbow.png") },
      { name: "Torag's helm", icon: FP("Torag%27s_helm.png") },
      { name: "Torag's platebody", icon: FP("Torag%27s_platebody.png") },
      { name: "Torag's platelegs", icon: FP("Torag%27s_platelegs.png") },
      { name: "Torag's hammer", icon: FP("Torag%27s_hammer.png") },
      { name: "Verac's helm", icon: FP("Verac%27s_helm.png") },
      { name: "Verac's brassard", icon: FP("Verac%27s_brassard.png") },
      { name: "Verac's plateskirt", icon: FP("Verac%27s_plateskirt.png") },
      { name: "Verac's flail", icon: FP("Verac%27s_flail.png") },
      { name: "Guthan's helm", icon: FP("Guthan%27s_helm.png") },
      { name: "Guthan's platebody", icon: FP("Guthan%27s_platebody.png") },
      { name: "Guthan's chainskirt", icon: FP("Guthan%27s_chainskirt.png") },
      { name: "Guthan's warspear", icon: FP("Guthan%27s_warspear.png") },
    ],
  },
  {
    name: 'Barrows: Rise of the Six',
    region: 'morytania',
    subLocation: 'Shadow Realm (via a well west of the Barrows)',
    drops: [
      { name: 'Malevolent kiteshield', icon: FP('Malevolent_kiteshield.png') },
      { name: 'Merciless kiteshield', icon: FP('Merciless_kiteshield.png') },
      { name: 'Vengeful kiteshield', icon: FP('Vengeful_kiteshield.png') },
    ],
  },
  {
    name: 'Araxxor and Araxxi',
    region: 'morytania',
    subLocation: 'Araxyte Hive',
    drops: [
      { name: 'Spider leg top', icon: FP('Spider_leg_top.png') },
      { name: 'Spider leg middle', icon: FP('Spider_leg_middle.png') },
      { name: 'Spider leg bottom', icon: FP('Spider_leg_bottom.png') },
      { name: "Araxxi's fang", icon: FP("Araxxi%27s_fang.png") },
      { name: "Araxxi's web", icon: FP("Araxxi%27s_web.png") },
      { name: "Araxxi's eye", icon: FP("Araxxi%27s_eye.png") },
      { name: 'Araxyte egg', icon: FP('Araxyte_egg.png') },
    ],
  },
  { name: 'Barrelchest', region: 'morytania', subLocation: 'Harmony Island Monastery', quest: true },

  // Anachronia
  {
    name: 'Orikalka',
    region: 'anachronia',
    subLocation: 'Rex Matriarch Lair (Orthen)',
    drops: [
      { name: 'Heart of the Warrior', icon: FP('Heart_of_the_Warrior.png') },
      { name: 'Bagrada rex (unchecked)', icon: FP('Bagrada_rex_(unchecked).png') },
    ],
  },
  {
    name: 'Rathis',
    region: 'anachronia',
    subLocation: 'Rex Matriarch Lair (Orthen)',
    drops: [
      { name: 'Heart of the Archer', icon: FP('Heart_of_the_Archer.png') },
      { name: 'Corbicula rex (unchecked)', icon: FP('Corbicula_rex_(unchecked).png') },
    ],
  },
  {
    name: 'Pthentraken',
    region: 'anachronia',
    subLocation: 'Rex Matriarch Lair (Orthen)',
    drops: [
      { name: 'Heart of the Seer', icon: FP('Heart_of_the_Seer.png') },
      { name: 'Pavosaurus rex (unchecked)', icon: FP('Pavosaurus_rex_(unchecked).png') },
    ],
  },
  {
    name: 'Osseous',
    region: 'anachronia',
    subLocation: 'Rex Matriarch Lair (Orthen)',
    drops: [
      { name: "Occultist's ring", icon: FP("Occultist%27s_ring.png") },
      { name: 'Jail cell key', icon: FP('Jail_cell_key.png') },
    ],
  },
  {
    name: 'Raksha, the Shadow Colossus',
    region: 'anachronia',
    subLocation: 'Orthen Oubliette',
    drops: [
      { name: 'Fleeting boots', icon: FP('Fleeting_boots.png') },
      { name: 'Shadow spike', icon: FP('Shadow_spike.png') },
      { name: 'Greater Ricochet ability codex', icon: FP('Greater_Ricochet_ability_codex.png') },
      { name: 'Greater Chain ability codex', icon: FP('Greater_Chain_ability_codex.png') },
      { name: 'Divert ability codex', icon: FP('Divert_ability_codex.png') },
    ],
  },

  // Kharidian Desert (incl. Mazcab, Heart of Gielinor, Menaphos)
  {
    name: 'Kalphite Queen',
    region: 'kharidianDesert',
    subLocation: 'Kalphite Hive',
    drops: [
      { name: 'Dragon chainbody', icon: 'icons/Dragon_chainbody.png' },
      { name: 'Dragon 2h sword', icon: 'icons/Dragon_2h_sword.png' },
      { name: 'Kalphite queen head', icon: 'icons/Kalphite_queen_head.png' },
      { name: 'Kalphite egg', icon: 'icons/Kalphite_egg.png' },
    ],
  },
  {
    name: 'Exiled Kalphite Queen',
    region: 'kharidianDesert',
    subLocation: 'Exiled Kalphite Hive',
    drops: [
      { name: 'Dragon chainbody', icon: 'icons/Dragon_chainbody.png' },
      { name: 'Dragon 2h sword', icon: 'icons/Dragon_2h_sword.png' },
      { name: 'Kalphite queen head', icon: 'icons/Kalphite_queen_head.png' },
      { name: 'Kalphite egg', icon: 'icons/Kalphite_egg.png' },
    ],
  },
  {
    name: 'Kalphite King',
    region: 'kharidianDesert',
    subLocation: 'Exiled Kalphite Hive',
    drops: [
      { name: 'Drygore rapier', icon: 'icons/Drygore_rapier.png' },
      { name: 'Off-hand drygore rapier', icon: 'icons/Off-hand_drygore_rapier.png' },
      { name: 'Drygore longsword', icon: 'icons/Drygore_longsword.png' },
      { name: 'Off-hand drygore longsword', icon: 'icons/Off-hand_drygore_longsword.png' },
      { name: 'Drygore mace', icon: 'icons/Drygore_mace.png' },
      { name: 'Off-hand drygore mace', icon: 'icons/Off-hand_drygore_mace.png' },
      { name: 'Perfect chitin', icon: 'icons/Perfect_chitin.png' },
      { name: 'Kalphite claw', icon: 'icons/Kalphite_claw.png' },
    ],
  },
  {
    name: 'Amascut, the Devourer',
    region: 'kharidianDesert',
    subLocation: 'Golden Palace (Menaphos)',
    drops: [
      { name: "Devourer's Guard", icon: "icons/Devourer's_Guard.png" },
      { name: "Tumeken's Light", icon: "icons/Tumeken's_Light.png" },
      { name: "Mask of Tumeken's resplendence", icon: "icons/Mask_of_Tumeken's_resplendence.png" },
      { name: "Robe top of Tumeken's resplendence", icon: "icons/Robe_top_of_Tumeken's_resplendence.png" },
      { name: "Robe bottom of Tumeken's resplendence", icon: "icons/Robe_bottom_of_Tumeken's_resplendence.png" },
      { name: "Gloves of Tumeken's resplendence", icon: "icons/Gloves_of_Tumeken's_resplendence.png" },
      { name: "Boots of Tumeken's resplendence", icon: "icons/Boots_of_Tumeken's_resplendence.png" },
      { name: 'Shard of Genesis Essence', icon: 'icons/Shard_of_Genesis_Essence.png' },
    ],
  },
  {
    name: 'Telos, the Warden',
    region: 'kharidianDesert',
    subLocation: 'Heart of Gielinor',
    drops: [
      { name: 'Orb of corrupted anima', icon: 'icons/Orb_of_corrupted_anima.png' },
      { name: 'Orb of volcanic anima', icon: 'icons/Orb_of_volcanic_anima.png' },
      { name: 'Orb of pure anima', icon: 'icons/Orb_of_pure_anima.png' },
      { name: 'Dormant Seren godbow', icon: 'icons/Dormant_Seren_godbow.png' },
      { name: 'Dormant staff of Sliske', icon: 'icons/Dormant_staff_of_Sliske.png' },
      { name: 'Dormant Zaros godsword', icon: 'icons/Dormant_Zaros_godsword.png' },
      { name: 'Reprisal ability codex', icon: 'icons/Reprisal_ability_codex.png' },
      { name: "Telos' sword", icon: "icons/Telos'_sword.png" },
      { name: "Telos' tendril", icon: "icons/Telos'_tendril.png" },
    ],
  },
  {
    name: 'Gregorovic',
    region: 'kharidianDesert',
    subLocation: 'Heart of Gielinor',
    drops: [
      { name: 'Dormant anima core helm', icon: 'icons/Dormant_anima_core_helm.png' },
      { name: 'Dormant anima core body', icon: 'icons/Dormant_anima_core_body.png' },
      { name: 'Dormant anima core legs', icon: 'icons/Dormant_anima_core_legs.png' },
      { name: 'Crest of Sliske', icon: 'icons/Crest_of_Sliske.png' },
      { name: 'Shadow glaive', icon: 'icons/Shadow_glaive.png' },
      { name: 'Off-hand shadow glaive', icon: 'icons/Off-hand_shadow_glaive.png' },
      { name: 'Sliskean essence', icon: 'icons/Sliskean_essence.png' },
      { name: 'Faceless mask', icon: 'icons/Faceless_mask.png' },
    ],
  },
  {
    name: 'Twin Furies (Nymora and Avaryss)',
    region: 'kharidianDesert',
    subLocation: 'Heart of Gielinor',
    drops: [
      { name: 'Dormant anima core helm', icon: 'icons/Dormant_anima_core_helm.png' },
      { name: 'Dormant anima core body', icon: 'icons/Dormant_anima_core_body.png' },
      { name: 'Dormant anima core legs', icon: 'icons/Dormant_anima_core_legs.png' },
      { name: 'Crest of Zamorak', icon: 'icons/Crest_of_Zamorak.png' },
      { name: 'Blade of Avaryss', icon: 'icons/Blade_of_Avaryss.png' },
      { name: 'Blade of Nymora', icon: 'icons/Blade_of_Nymora.png' },
      { name: 'Zamorakian essence', icon: 'icons/Zamorakian_essence.png' },
      { name: 'Wings of the Twin Furies', icon: 'icons/Wings_of_the_Twin_Furies.png' },
    ],
  },
  {
    name: 'Vindicta',
    region: 'kharidianDesert',
    subLocation: 'Heart of Gielinor',
    drops: [
      { name: 'Dormant anima core helm', icon: 'icons/Dormant_anima_core_helm.png' },
      { name: 'Dormant anima core body', icon: 'icons/Dormant_anima_core_body.png' },
      { name: 'Dormant anima core legs', icon: 'icons/Dormant_anima_core_legs.png' },
      { name: 'Crest of Zaros', icon: 'icons/Crest_of_Zaros.png' },
      { name: 'Dragon Rider lance', icon: 'icons/Dragon_Rider_lance.png' },
      { name: 'Zarosian essence', icon: 'icons/Zarosian_essence.png' },
      { name: 'Vindiddy', icon: 'icons/Vindiddy.png' },
      { name: 'Rawrvek', icon: 'icons/Rawrvek.png' },
    ],
  },
  {
    name: 'Helwyr',
    region: 'kharidianDesert',
    subLocation: 'Heart of Gielinor',
    drops: [
      { name: 'Dormant anima core helm', icon: 'icons/Dormant_anima_core_helm.png' },
      { name: 'Dormant anima core body', icon: 'icons/Dormant_anima_core_body.png' },
      { name: 'Dormant anima core legs', icon: 'icons/Dormant_anima_core_legs.png' },
      { name: 'Crest of Seren', icon: 'icons/Crest_of_Seren.png' },
      { name: 'Wand of the Cywir elders', icon: 'icons/Wand_of_the_Cywir_elders.png' },
      { name: 'Orb of the Cywir elders', icon: 'icons/Orb_of_the_Cywir_elders.png' },
      { name: 'Serenic essence', icon: 'icons/Serenic_essence.png' },
      { name: 'Twisted antler', icon: 'icons/Twisted_antler.png' },
    ],
  },
  {
    name: 'Yakamaru',
    region: 'kharidianDesert',
    subLocation: 'Liberation of Mazcab',
    drops: [
      { name: 'Teci', icon: 'icons/Teci.png' },
      { name: 'Achto Primeval robe top', icon: 'icons/Achto_Primeval_robe_top.png' },
      { name: 'Achto Primeval robe legs', icon: 'icons/Achto_Primeval_robe_legs.png' },
      { name: 'Achto Tempest body', icon: 'icons/Achto_Tempest_body.png' },
      { name: 'Achto Tempest chaps', icon: 'icons/Achto_Tempest_chaps.png' },
      { name: 'Achto Teralith cuirass', icon: 'icons/Achto_Teralith_cuirass.png' },
      { name: 'Achto Teralith leggings', icon: 'icons/Achto_Teralith_leggings.png' },
      { name: 'Mazcab ability codex', icon: 'icons/Mazcab_ability_codex.png' },
    ],
  },
  {
    name: 'Beastmaster Durzag',
    region: 'kharidianDesert',
    subLocation: 'Pit of Trials (Mazcab)',
    drops: [
      { name: 'Teci', icon: 'icons/Teci.png' },
      { name: 'Achto Primeval mask', icon: 'icons/Achto_Primeval_mask.png' },
      { name: 'Achto Primeval gloves', icon: 'icons/Achto_Primeval_gloves.png' },
      { name: 'Achto Primeval boots', icon: 'icons/Achto_Primeval_boots.png' },
      { name: 'Achto Tempest cowl', icon: 'icons/Achto_Tempest_cowl.png' },
      { name: 'Achto Tempest gloves', icon: 'icons/Achto_Tempest_gloves.png' },
      { name: 'Achto Tempest boots', icon: 'icons/Achto_Tempest_boots.png' },
      { name: 'Achto Teralith helmet', icon: 'icons/Achto_Teralith_helmet.png' },
      { name: 'Achto Teralith gauntlets', icon: 'icons/Achto_Teralith_gauntlets.png' },
      { name: 'Achto Teralith boots', icon: 'icons/Achto_Teralith_boots.png' },
      { name: 'Mazcab ability codex', icon: 'icons/Mazcab_ability_codex.png' },
    ],
  },
  {
    name: 'The Magister',
    region: 'kharidianDesert',
    subLocation: 'Sophanem Slayer Dungeon',
    drops: [
      { name: 'Phylactery', icon: 'icons/Phylactery.png' },
      { name: 'Key to the Crossing', icon: 'icons/Key_to_the_Crossing.png' },
      { name: 'Gloves of passage', icon: 'icons/Gloves_of_passage.png' },
    ],
  },

  // Asgarnia (incl. The Arc, Troll Country/God Wars Dungeon)
  {
    name: 'Giant Mole',
    region: 'asgarnia',
    subLocation: 'Falador Park',
    drops: [
      { name: 'Numbing root', icon: 'icons/Numbing_root.png' },
      { name: 'Clingy mole', icon: 'icons/Clingy_mole.png' },
      { name: 'Dragon 2h sword', icon: 'icons/Dragon_2h_sword.png' },
      { name: 'Ultra-growth potion', icon: 'icons/Ultra-growth_potion_(1).png' },
    ],
  },
  {
    name: 'Vorago',
    region: 'asgarnia',
    subLocation: 'The Borehole',
    drops: [
      { name: 'Seismic wand', icon: 'icons/Seismic_wand.png' },
      { name: 'Seismic singularity', icon: 'icons/Seismic_singularity.png' },
      { name: 'Ancient summoning stone', icon: 'icons/Ancient_summoning_stone.png' },
      { name: "Vorago's arm", icon: "icons/Vorago's_arm.png" },
      { name: 'Ancient artefact', icon: 'icons/Ancient_artefact.png' },
    ],
  },
  {
    name: 'Sanctum Guardian',
    region: 'asgarnia',
    subLocation: 'Temple of Aminishi',
    drops: [{ name: 'Crassian Allegiance', icon: 'icons/Crassian_Allegiance.png' }],
  },
  {
    name: 'Masuta the Ascended',
    region: 'asgarnia',
    subLocation: 'Temple of Aminishi',
    drops: [
      { name: "Masuta's warspear", icon: "icons/Masuta's_warspear.png" },
      { name: "Himiko's Vision", icon: "icons/Himiko's_Vision.png" },
    ],
  },
  {
    name: 'Seiryu the Azure Serpent',
    region: 'asgarnia',
    subLocation: 'Temple of Aminishi',
    drops: [
      { name: 'Ancient scale', icon: 'icons/Ancient_scale.png' },
      { name: 'Chipped black stone crystal', icon: 'icons/Chipped_black_stone_crystal.png' },
      { name: "Seiryu's horns", icon: "icons/Seiryu's_horns.png" },
    ],
  },
  {
    name: 'Nex',
    region: 'asgarnia',
    subLocation: 'Ancient Prison (GWD)',
    drops: [
      { name: 'Torva full helm', icon: 'icons/Torva_full_helm.png' },
      { name: 'Torva platebody', icon: 'icons/Torva_platebody.png' },
      { name: 'Torva platelegs', icon: 'icons/Torva_platelegs.png' },
      { name: 'Torva boots', icon: 'icons/Torva_boots.png' },
      { name: 'Torva gloves', icon: 'icons/Torva_gloves.png' },
      { name: 'Pernix cowl', icon: 'icons/Pernix_cowl.png' },
      { name: 'Pernix body', icon: 'icons/Pernix_body.png' },
      { name: 'Pernix chaps', icon: 'icons/Pernix_chaps.png' },
      { name: 'Pernix boots', icon: 'icons/Pernix_boots.png' },
      { name: 'Pernix gloves', icon: 'icons/Pernix_gloves.png' },
      { name: 'Virtus mask', icon: 'icons/Virtus_mask.png' },
      { name: 'Virtus robe top', icon: 'icons/Virtus_robe_top.png' },
      { name: 'Virtus robe legs', icon: 'icons/Virtus_robe_legs.png' },
      { name: 'Virtus boots', icon: 'icons/Virtus_boots.png' },
      { name: 'Virtus gloves', icon: 'icons/Virtus_gloves.png' },
      { name: 'Virtus wand', icon: 'icons/Virtus_wand.png' },
      { name: 'Virtus book', icon: 'icons/Virtus_book.png' },
      { name: 'Zaryte bow', icon: 'icons/Zaryte_bow.png' },
    ],
  },
  {
    name: 'Nex, Angel of Death',
    region: 'asgarnia',
    subLocation: 'Ancient Prison (GWD)',
    drops: [
      { name: 'Wand of the praesul', icon: 'icons/Wand_of_the_praesul.png' },
      { name: 'Imperium core', icon: 'icons/Imperium_core.png' },
      { name: 'Praesul codex', icon: 'icons/Praesul_codex.png' },
      { name: 'Intricate smoke-shrouded chest', icon: 'icons/Intricate_smoke-shrouded_chest.png' },
      { name: 'Intricate shadow chest', icon: 'icons/Intricate_shadow_chest.png' },
      { name: 'Intricate blood stained chest', icon: 'icons/Intricate_blood_stained_chest.png' },
      { name: 'Intricate ice chest', icon: 'icons/Intricate_ice_chest.png' },
    ],
  },
  {
    name: "K'ril Tsutsaroth",
    region: 'asgarnia',
    subLocation: 'God Wars Dungeon',
    drops: [
      { name: 'Hood of subjugation', icon: 'icons/Hood_of_subjugation.png' },
      { name: 'Garb of subjugation', icon: 'icons/Garb_of_subjugation.png' },
      { name: 'Gown of subjugation', icon: 'icons/Gown_of_subjugation.png' },
      { name: 'Gloves of subjugation', icon: 'icons/Gloves_of_subjugation.png' },
      { name: 'Boots of subjugation', icon: 'icons/Boots_of_subjugation.png' },
      { name: 'Ward of subjugation', icon: 'icons/Ward_of_subjugation.png' },
      { name: 'Zamorakian spear', icon: 'icons/Zamorakian_spear.png' },
      { name: 'Steam battlestaff', icon: 'icons/Steam_battlestaff.png' },
      { name: 'Godsword shard 1', icon: 'icons/Godsword_shard_1.png' },
      { name: 'Godsword shard 2', icon: 'icons/Godsword_shard_2.png' },
      { name: 'Godsword shard 3', icon: 'icons/Godsword_shard_3.png' },
      { name: 'Zamorak hilt', icon: 'icons/Zamorak_hilt.png' },
    ],
  },
  {
    name: 'General Graardor',
    region: 'asgarnia',
    subLocation: 'God Wars Dungeon',
    drops: [
      { name: 'Bandos helmet', icon: 'icons/Bandos_helmet.png' },
      { name: 'Bandos chestplate', icon: 'icons/Bandos_chestplate.png' },
      { name: 'Bandos tassets', icon: 'icons/Bandos_tassets.png' },
      { name: 'Bandos gloves', icon: 'icons/Bandos_gloves.png' },
      { name: 'Bandos boots', icon: 'icons/Bandos_boots.png' },
      { name: 'Bandos warshield', icon: 'icons/Bandos_warshield.png' },
      { name: 'Bandos hilt', icon: 'icons/Bandos_hilt.png' },
    ],
  },
  {
    name: 'Commander Zilyana',
    region: 'asgarnia',
    subLocation: 'God Wars Dungeon',
    drops: [
      { name: 'Saradomin sword', icon: 'icons/Saradomin_sword.png' },
      { name: 'Armadyl crossbow', icon: 'icons/Armadyl_crossbow.png' },
      { name: 'Off-hand Armadyl crossbow', icon: 'icons/Off-hand_Armadyl_crossbow.png' },
      { name: "Saradomin's murmur", icon: "icons/Saradomin's_murmur.png" },
      { name: "Saradomin's hiss", icon: "icons/Saradomin's_hiss.png" },
      { name: "Saradomin's whisper", icon: "icons/Saradomin's_whisper.png" },
      { name: "Saradomin's hum", icon: "icons/Saradomin's_hum.png" },
      { name: 'Saradomin hilt', icon: 'icons/Saradomin_hilt.png' },
    ],
  },
  {
    name: "Kree'arra",
    region: 'asgarnia',
    subLocation: 'God Wars Dungeon',
    drops: [
      { name: 'Armadyl helmet', icon: 'icons/Armadyl_helmet.png' },
      { name: 'Armadyl chestplate', icon: 'icons/Armadyl_chestplate.png' },
      { name: 'Armadyl chainskirt', icon: 'icons/Armadyl_chainskirt.png' },
      { name: 'Armadyl gloves', icon: 'icons/Armadyl_gloves.png' },
      { name: 'Armadyl boots', icon: 'icons/Armadyl_boots.png' },
      { name: 'Armadyl buckler', icon: 'icons/Armadyl_buckler.png' },
      { name: 'Armadyl hilt', icon: 'icons/Armadyl_hilt.png' },
      { name: 'Godsword shard 1', icon: 'icons/Godsword_shard_1.png' },
      { name: 'Godsword shard 2', icon: 'icons/Godsword_shard_2.png' },
      { name: 'Godsword shard 3', icon: 'icons/Godsword_shard_3.png' },
    ],
  },
  {
    name: 'Queen Black Dragon',
    region: 'asgarnia',
    subLocation: 'Grotworm Lair',
    drops: [
      { name: 'Royal torsion spring', icon: 'icons/Royal_torsion_spring.png' },
      { name: 'Royal sight', icon: 'icons/Royal_sight.png' },
      { name: 'Royal frame', icon: 'icons/Royal_frame.png' },
      { name: 'Royal bolt stabiliser', icon: 'icons/Royal_bolt_stabiliser.png' },
      { name: 'Dragonbone upgrade kit', icon: 'icons/Dragonbone_upgrade_kit.png' },
      { name: 'Dragon kiteshield', icon: 'icons/Dragon_kiteshield.png' },
    ],
  },
  { name: 'Pest Queen', region: 'asgarnia', subLocation: "Valluta's Domain", quest: true },

  // Wilderness (incl. Daemonheim-based content)
  {
    name: 'Corporeal Beast',
    region: 'wilderness',
    subLocation: "Corporeal Beast's Lair",
    drops: [
      { name: 'Arcane sigil', icon: FP('Arcane_sigil.png') },
      { name: 'Divine sigil', icon: FP('Divine_sigil.png') },
      { name: 'Elysian sigil', icon: FP('Elysian_sigil.png') },
      { name: 'Spectral sigil', icon: FP('Spectral_sigil.png') },
    ],
  },
  {
    name: 'King Black Dragon',
    region: 'wilderness',
    subLocation: "King Black Dragon's Lair",
    drops: [
      { name: 'Dragon Rider gloves', icon: FP('Dragon_Rider_gloves.png') },
      { name: 'Dragon Rider boots', icon: FP('Dragon_Rider_boots.png') },
      { name: 'Dragon kite ornament kit (or)', icon: FP('Dragon_kite_ornament_kit_(or).png') },
      { name: 'Dragon kite ornament kit (sp)', icon: FP('Dragon_kite_ornament_kit_(sp).png') },
    ],
  },
  {
    name: 'Chaos Elemental',
    region: 'wilderness',
    subLocation: "Rogues' Castle",
    drops: [
      { name: "Statius's warhammer", icon: FP("Statius%27s_warhammer.png") },
      { name: "Statius's full helm", icon: FP("Statius%27s_full_helm.png") },
      { name: "Statius's platebody", icon: FP("Statius%27s_platebody.png") },
      { name: "Statius's platelegs", icon: FP("Statius%27s_platelegs.png") },
      { name: "Vesta's longsword", icon: FP("Vesta%27s_longsword.png") },
      { name: "Vesta's spear", icon: FP("Vesta%27s_spear.png") },
      { name: "Vesta's chainbody", icon: FP("Vesta%27s_chainbody.png") },
      { name: "Vesta's plateskirt", icon: FP("Vesta%27s_plateskirt.png") },
      { name: "Zuriel's staff", icon: FP("Zuriel%27s_staff.png") },
      { name: "Zuriel's hood", icon: FP("Zuriel%27s_hood.png") },
      { name: "Zuriel's robe top", icon: FP("Zuriel%27s_robe_top.png") },
      { name: "Zuriel's robe bottom", icon: FP("Zuriel%27s_robe_bottom.png") },
      { name: "Morrigan's javelin", icon: FP("Morrigan%27s_javelin.png") },
      { name: "Morrigan's throwing axe", icon: FP("Morrigan%27s_throwing_axe.png") },
      { name: "Morrigan's coif", icon: FP("Morrigan%27s_coif.png") },
      { name: "Morrigan's leather body", icon: FP("Morrigan%27s_leather_body.png") },
      { name: "Morrigan's leather chaps", icon: FP("Morrigan%27s_leather_chaps.png") },
    ],
  },
  {
    name: 'Astellarn',
    region: 'wilderness',
    subLocation: 'Dragonkin Laboratory',
    drops: [
      { name: 'Greater Flurry ability codex', icon: FP('Greater_Flurry_ability_codex.png') },
      { name: 'Diary of an Overzealous Gnome', icon: FP('Diary_of_an_Overzealous_Gnome.png') },
    ],
  },
  {
    name: 'Verak Lith',
    region: 'wilderness',
    subLocation: 'Dragonkin Laboratory',
    drops: [
      { name: 'Greater Fury ability codex', icon: FP('Greater_Fury_ability_codex.png') },
      { name: 'Redacted Dragonkin Research', icon: FP('Redacted_Dragonkin_Research.png') },
    ],
  },
  {
    name: 'Black Stone Dragon',
    region: 'wilderness',
    subLocation: 'Dragonkin Laboratory',
    drops: [
      { name: 'Greater Barge ability codex', icon: FP('Greater_Barge_ability_codex.png') },
      { name: 'Draconic energy', icon: FP('Draconic_energy.png') },
      { name: 'Inert black stone crystal', icon: FP('Inert_black_stone_crystal.png') },
    ],
  },
  {
    name: 'Crassian Leviathan',
    region: 'wilderness',
    subLocation: 'The Shadow Reef',
    drops: [
      { name: 'The Last Offering', icon: FP('The_Last_Offering.png') },
      { name: 'Black stone heart', icon: FP('Black_stone_heart.png') },
      { name: 'Black stone arrow tips', icon: FP('Black_stone_arrow_tips.png') },
    ],
  },
  {
    name: 'Taraket the Necromancer',
    region: 'wilderness',
    subLocation: 'The Shadow Reef',
    drops: [
      { name: "Kranon's Ancient Journal", icon: FP("Kranon%27s_Ancient_Journal.png") },
      { name: 'Black stone heart', icon: FP('Black_stone_heart.png') },
      { name: 'Black stone arrow tips', icon: FP('Black_stone_arrow_tips.png') },
    ],
  },
  {
    name: 'The Ambassador',
    region: 'wilderness',
    subLocation: 'The Shadow Reef',
    drops: [
      { name: 'Eldritch crossbow limb', icon: FP('Eldritch_crossbow_limb.png') },
      { name: 'Eldritch crossbow stock', icon: FP('Eldritch_crossbow_stock.png') },
      { name: 'Eldritch crossbow mechanism', icon: FP('Eldritch_crossbow_mechanism.png') },
    ],
  },
  {
    name: 'Flesh-hatcher Mhekarnahz',
    region: 'wilderness',
    subLocation: 'west of Daemonheim',
    drops: [
      { name: "Seeker's charm", icon: FP("Seeker%27s_charm.png") },
      { name: "Stalker's charm", icon: FP("Stalker%27s_charm.png") },
    ],
  },

  // Fremennik Province
  {
    name: 'Dagannoth Supreme',
    region: 'fremennikProvince',
    subLocation: 'Waterbirth Island Dungeon',
    drops: [
      { name: "Archers' ring", icon: FP("Archers%27_ring.png") },
      { name: 'Seercull', icon: FP('Seercull.png') },
    ],
  },
  {
    name: 'Dagannoth Prime',
    region: 'fremennikProvince',
    subLocation: 'Waterbirth Island Dungeon',
    drops: [
      { name: "Seers' ring", icon: FP("Seers%27_ring.png") },
      { name: 'Mud battlestaff', icon: FP('Mud_battlestaff.png') },
    ],
  },
  {
    name: 'Dagannoth Rex',
    region: 'fremennikProvince',
    subLocation: 'Waterbirth Island Dungeon',
    drops: [
      { name: 'Berserker ring', icon: FP('Berserker_ring.png') },
      { name: 'Warrior ring', icon: FP('Warrior_ring.png') },
    ],
  },
  { name: 'Ice Troll King', region: 'fremennikProvince', subLocation: 'Ice Troll Caves', quest: true },

  // Kandarin (incl. Feldip Hills)
  {
    name: 'Legio Primus',
    region: 'kandarin',
    subLocation: 'Monastery of Ascension',
    drops: [
      { name: 'Ascension signet I', icon: FP('Ascension_signet_I.png') },
      { name: 'Ascension Keystone', icon: FP('Ascension_Keystone.png') },
      { name: 'Ascension grips', icon: FP('Ascension_grips.png') },
      { name: 'Legio crown', icon: FP('Legio_crown.png') },
    ],
  },
  {
    name: 'Legio Secundus',
    region: 'kandarin',
    subLocation: 'Monastery of Ascension',
    drops: [
      { name: 'Ascension signet II', icon: FP('Ascension_signet_II.png') },
      { name: 'Ascension Keystone', icon: FP('Ascension_Keystone.png') },
      { name: 'Ascension grips', icon: FP('Ascension_grips.png') },
      { name: 'Legio crown', icon: FP('Legio_crown.png') },
    ],
  },
  {
    name: 'Legio Tertius',
    region: 'kandarin',
    subLocation: 'Monastery of Ascension',
    drops: [
      { name: 'Ascension signet III', icon: FP('Ascension_signet_III.png') },
      { name: 'Ascension Keystone', icon: FP('Ascension_Keystone.png') },
      { name: 'Ascension grips', icon: FP('Ascension_grips.png') },
      { name: 'Legio crown', icon: FP('Legio_crown.png') },
    ],
  },
  {
    name: 'Legio Quartus',
    region: 'kandarin',
    subLocation: 'Monastery of Ascension',
    drops: [
      { name: 'Ascension signet IV', icon: FP('Ascension_signet_IV.png') },
      { name: 'Ascension Keystone', icon: FP('Ascension_Keystone.png') },
      { name: 'Ascension grips', icon: FP('Ascension_grips.png') },
      { name: 'Legio crown', icon: FP('Legio_crown.png') },
    ],
  },
  {
    name: 'Legio Quintus',
    region: 'kandarin',
    subLocation: 'Monastery of Ascension',
    drops: [
      { name: 'Ascension signet V', icon: FP('Ascension_signet_V.png') },
      { name: 'Ascension Keystone', icon: FP('Ascension_Keystone.png') },
      { name: 'Ascension grips', icon: FP('Ascension_grips.png') },
      { name: 'Legio crown', icon: FP('Legio_crown.png') },
    ],
  },
  {
    name: 'Legio Sextus',
    region: 'kandarin',
    subLocation: 'Monastery of Ascension',
    drops: [
      { name: 'Ascension signet VI', icon: FP('Ascension_signet_VI.png') },
      { name: 'Ascension Keystone', icon: FP('Ascension_Keystone.png') },
      { name: 'Ascension grips', icon: FP('Ascension_grips.png') },
      { name: 'Legio crown', icon: FP('Legio_crown.png') },
    ],
  },
  { name: 'Penance King', region: 'kandarin', subLocation: 'Barbarian Outpost' },
  { name: 'Penance Queen', region: 'kandarin', subLocation: 'Barbarian Outpost' },
  { name: 'Sea Troll Queen', region: 'kandarin', subLocation: 'Piscatoris Fishing Colony', quest: true },

  // Tirannwn (incl. Lost Grove)
  {
    name: 'Solak, Guardian of the Grove',
    region: 'tirannwn',
    subLocation: 'The Lost Grove',
    drops: [
      { name: "Erethdor's grimoire", icon: FP("Erethdor%27s_grimoire.png") },
      { name: 'Blightbound crossbow', icon: FP('Blightbound_crossbow.png') },
      { name: 'Off-hand Blightbound crossbow', icon: FP('Off-hand_Blightbound_crossbow.png') },
    ],
  },
];
