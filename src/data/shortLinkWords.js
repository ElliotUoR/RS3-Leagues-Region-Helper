// Curated word list for build-sharing short links (e.g. /s/torva-seismic-vengeance).
//
// Words are drawn from every `name`/`relicName` in gear.js, relics.js,
// abilities.js, and spellbooks.js - tokenized, deduped, and then manually
// reviewed to drop fragments/filler that don't read well as a standalone
// shortlink word (see EXCLUDED_WORDS below). A short code is built by picking
// a few words from this list at random (independently, repeats allowed) and
// joining them with hyphens; the backend retries on the rare collision
// (enforced by a UNIQUE constraint on the stored code).
//
// Regenerating: run `node scripts/extract-shortlink-words.mjs` after adding
// new gear/relics/abilities/spells. It re-tokenizes the data files and prints
// any *new* candidate words not already in SHORTLINK_WORDS or EXCLUDED_WORDS -
// review those and add each one to whichever list it belongs in. This keeps
// the list current without re-reviewing all ~500+ existing words every time.
export const SHORTLINK_WORDS = [
  'abyss', 'abyssal', 'achto', 'adze', 'aether', 'affliction', 'aggression', 'agility', 'ahrim', 'alloy',
  'amascut', 'amulet', 'ancient', 'andvaranaut', 'angel', 'anima', 'annihilation', 'apex', 'araxyte', 'arcane',
  'archers', 'ariadne', 'armadyl', 'armour', 'armoured', 'arrow', 'arrows', 'ascendri', 'ascension', 'asylum',
  'attack', 'attuned', 'augury', 'aurelius', 'avaryss', 'awakening', 'awe', 'axe', 'bait', 'bakriminel',
  'bandos', 'bane', 'barge', 'battlestaff', 'berserker', 'bik', 'black', 'blade', 'bladed', 'blast',
  'blessing', 'blight', 'blightbound', 'blighted', 'blood', 'bob', 'body', 'bolts', 'bonecrusher', 'bones',
  'book', 'boots', 'bottom', 'bottoms', 'bow', 'bracelet', 'brassard', 'brawler', 'cannon', 'cap',
  'cape', 'carapace', 'catspaw', 'celestial', 'chain', 'chainbody', 'chainskirt', 'champion', 'channeller', 'chaos',
  'chaotic', 'chaps', 'charm', 'charos', 'charyou', 'chestplate', 'chivalry', 'cinderbane', 'circuit', 'claw',
  'claws', 'coif', 'combat', 'concentrated', 'conjurer', 'conservation', 'conversion', 'core', 'corrupted', 'corruption',
  'cowl', 'cres', 'crossbow', 'crown', 'cryptbloom', 'crystal', 'cuirass', 'culinaromancer', 'cup', 'curses',
  'cywir', 'dagger', 'dark', 'death', 'deathdealer', 'deathless', 'deathspore', 'deathtouch', 'deathwarden', 'deceit',
  'decimation', 'defender', 'demon', 'demonbane', 'desert', 'desolation', 'devotion', 'devourer', 'dharok', 'diadem',
  'diffusion', 'dinarrow', 'diplomacy', 'dive', 'divert', 'divine', 'dominion', 'dracolich', 'dragon', 'dragonbane',
  'dragonhide', 'drygore', 'dwarves', 'eclipsed', 'ecology', 'egg', 'elder', 'elders', 'eldritch', 'elidinis',
  'elite', 'elysian', 'emberkeen', 'emberstaff', 'enchanted', 'endurance', 'energy', 'enhanced', 'ensouled', 'erethdor',
  'escape', 'essence', 'evil', 'experimental', 'extreme', 'eye', 'farsight', 'fate', 'favour', 'finality',
  'fingers', 'fire', 'flail', 'flarefrost', 'fleeting', 'flow', 'flurry', 'focus', 'font', 'foot',
  'forsaken', 'fortune', 'fractured', 'framework', 'frost', 'ful', 'fury', 'ganodermic', 'garb', 'gatestone',
  'gauntlets', 'gem', 'genius', 'glaive', 'glaiven', 'gloomfire', 'glory', 'gloves', 'goblin', 'godbow',
  'godsword', 'golden', 'goldenhawk', 'gown', 'grace', 'granite', 'grasping', 'gravite', 'greataxe', 'greater',
  'greaves', 'grimoire', 'grips', 'guard', 'guardian', 'guthan', 'guthix', 'hailfire', 'halberd', 'hammer',
  'hand', 'handwraps', 'harness', 'hat', 'hatchet', 'hauberk', 'havensilver', 'havoc', 'hazelmere', 'heightened',
  'helm', 'helmet', 'hex', 'hexcrest', 'hide', 'hiss', 'hood', 'hook', 'howl', 'hum',
  'humans', 'hungry', 'hydrix', 'iban', 'ice', 'igneous', 'illuminated', 'imperium', 'inanna', 'ingenuity',
  'initiate', 'inquisitor', 'insight', 'insignia', 'inspire', 'instinct', 'introspection', 'invoke', 'jas', 'jaws',
  'kaladanda', 'kalphite', 'karil', 'kerapac', 'ket', 'kharidian', 'khopesh', 'kiteshield', 'knight', 'knockout',
  'koschei', 'kuradal', 'laceration', 'lance', 'laniakea', 'lantern', 'lava', 'leather', 'leatherskirt', 'leathertop',
  'legatus', 'leggings', 'legs', 'leng', 'lens', 'leviathan', 'life', 'light', 'limitless', 'linza',
  'longbow', 'longsword', 'lord', 'luck', 'lunar', 'mab', 'mace', 'mages', 'magic', 'magicks',
  'magma', 'malevolence', 'malevolent', 'mask', 'master', 'masterwork', 'masuta', 'maul', 'medallion', 'melee',
  'memento', 'merciless', 'mercy', 'misalionar', 'moonstone', 'morrigan', 'mortal', 'murmur', 'mystic', 'natural',
  'necklace', 'necromancer', 'necronium', 'nectar', 'nex', 'nexus', 'nightmare', 'nodon', 'noxious', 'nymora',
  'obliteration', 'occultist', 'ode', 'omni', 'onslaught', 'ooglog', 'orb', 'orikalkum', 'passage', 'pastkeeper',
  'penance', 'pernix', 'petasos', 'piety', 'platebody', 'platelegs', 'plateskirt', 'pneumatic', 'polypore', 'poncho',
  'pouch', 'power', 'praefectus', 'praesul', 'praetorio', 'prayers', 'primal', 'primeval', 'proselyte', 'protector',
  'queen', 'rage', 'ragefire', 'ranged', 'ranging', 'rapier', 'razorback', 'razulei', 'reactor', 'reaper',
  'reaver', 'rebounder', 'regen', 'reprisal', 'repriser', 'resplendence', 'revival', 'ricochet', 'rider', 'rigour',
  'ring', 'rings', 'ripper', 'roar', 'robe', 'royal', 'ruination', 'ruinous', 'rune', 'sacrifice',
  'salve', 'sanctity', 'saradomin', 'scourge', 'scrimshaw', 'scripture', 'scythe', 'seal', 'seed', 'seers',
  'seismic', 'senses', 'seren', 'shadow', 'shard', 'shards', 'shatter', 'shield', 'shot', 'sight',
  'signet', 'singularity', 'sirenic', 'skirt', 'skull', 'slayer', 'sliske', 'sliver', 'smoke', 'snap',
  'sniper', 'solomon', 'soma', 'sonic', 'soul', 'soulbound', 'souls', 'spear', 'spectral', 'spellbook',
  'spells', 'spike', 'spikes', 'spirit', 'splintering', 'staff', 'stalker', 'standard', 'static', 'statius',
  'steadfast', 'sticky', 'stone', 'storm', 'stream', 'strength', 'subjugation', 'sunshine', 'sunspear', 'super',
  'superior', 'surge', 'surgeon', 'swiftness', 'switch', 'sword', 'tainted', 'tapestry', 'tassets', 'tear',
  'tectonic', 'tempest', 'tendrils', 'teralith', 'terrasaur', 'terror', 'threads', 'throwing', 'tokhaar', 'tokkul',
  'toktz', 'tome', 'top', 'torag', 'torso', 'torva', 'transfigure', 'trident', 'trimmed', 'tumeken',
  'tuska', 'undead', 'underworld', 'unsealed', 'unsullied', 'vambraces', 'vampyrism', 'vanquish', 'varanus', 'vengeful',
  'verac', 'vesta', 'vestments', 'vigour', 'virtus', 'visage', 'visor', 'wand', 'war', 'ward',
  'warhammer', 'warpaints', 'warrior', 'warshield', 'warspear', 'wave', 'waves', 'weaver', 'wellspring', 'wen',
  'whip', 'whisper', 'wild', 'wolf', 'wrap', 'wraps', 'wrath', 'wrist', 'zamorak', 'zamorakian',
  'zaros', 'zaryte', 'zekkil', 'zemouregal', 'zorgoth', 'zuk', 'zuriel',
];

// Reviewed and deliberately left out of SHORTLINK_WORDS, so future re-runs of
// scripts/extract-shortlink-words.mjs don't keep re-flagging them as new
// candidates. Grouped by why they were rejected:
export const EXCLUDED_WORDS = [
  // Meaningless fragments left over from splitting hyphenated compound
  // proper nouns (e.g. "TokHaar-Kal-Xil" -> "kal", "xil") - unrecognisable
  // as standalone words.
  'kal', 'xil', 'mej', 'mor', 'het', 'tal', 'hej',
  // Ordinals, and short tokens ambiguous enough to read as noise or
  // confuse with something unrelated (e.g. "mod" reads like "moderator").
  'first', 'third', 'sixth', 'mod', 'pharm',
  // Generic filler that happened to appear inside a name but doesn't read
  // as distinctly RS3-flavoured on its own.
  'age', 'always', 'attacker', 'broken', 'double', 'effort', 'full', 'large',
  'last', 'like', 'love', 'note', 'persistent', 'raising', 'small', 'state',
  'subtle', 'thinking', 'tier', 'touch', 'tracking', 'targeted', 'tree',
  'unexpected', 'wealth', 'link',
];
