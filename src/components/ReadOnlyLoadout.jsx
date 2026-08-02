import EquipmentSlot from './EquipmentSlot';
import LeaguesEffectsPanel from './LeaguesEffectsPanel';
import { ESSENCE_OF_FINALITY_NAMES, GEAR } from '../data/gear';

// Non-interactive twin of the gear planner's equipment grid, used by the
// Build Guides page to illustrate a fixed loadout. Deliberately reuses
// EquipmentSlot and the global .equip-grid/.equip-slot styles rather than
// duplicating the grid markup - see .equip-grid.read-only in index.css for
// the handful of overrides that undo the planner-specific affordances.
const SLOT_GRID_AREAS = `
  "eof head pocket"
  "back neck ammo"
  "weapon torso offhand"
  ". legs ."
  "hands feet ring"
`;

// Mirrors GearPage's own SLOT_LABELS - a local copy rather than a shared
// export because the two are free to diverge and it is twelve literals.
const SLOT_LABELS = {
  head: 'Head',
  pocket: 'Pocket',
  back: 'Back',
  neck: 'Neck',
  ammo: 'Ammo',
  weapon: 'Weapon',
  torso: 'Torso',
  offhand: 'Off-hand',
  legs: 'Legs',
  hands: 'Hands',
  feet: 'Feet',
  ring: 'Ring',
};

// Item names in blessingBuilds.js are verified against gear.js, so this is
// expected to always hit - but it returns null rather than throwing if a data
// edit breaks that, so one bad name degrades to one empty slot instead of
// blanking the page.
function findItem(styleId, name) {
  const styleGear = GEAR[styleId];
  if (!name || !styleGear) return null;
  for (const slot of Object.keys(styleGear)) {
    const hit = styleGear[slot].find((item) => item.name === name);
    if (hit) return hit;
  }
  return null;
}

// The Essence of Finality can only hold a weapon of the SAME combat style as
// the one you are wielding - a melee spirit does nothing for a magic loadout.
// Deliberately looked up within the loadout's own style so a wrong-style pick
// renders as an empty slot rather than silently appearing to work.
function findEofWeapon(styleId, name) {
  return findItem(styleId, name);
}

export default function ReadOnlyLoadout({
  styleId,
  styleLabel,
  slots,
  eof,
  armourTotal,
  armourTotalOverloaded,
  armourTotalElder,
  elderSources,
  lifeTotal,
  prayerTotal,
  aegis,
  bigBonedBonus,
  icyeneBonus,
  blessings,
  isUnlocked,
  selectedLeagueRelics,
}) {
  const neckItem = findItem(styleId, slots.neck);
  const eofWeapon = findEofWeapon(styleId, eof);
  // Only meaningful when an Essence of Finality amulet is actually worn -
  // matches how the gear planner reveals its own EOF pseudo-slot.
  const eofVisible = ESSENCE_OF_FINALITY_NAMES.includes(slots.neck);

  return (
    <figure className="read-only-loadout">
      <figcaption className="read-only-loadout-caption">{styleLabel}</figcaption>
      <div className="equip-grid read-only" style={{ gridTemplateAreas: SLOT_GRID_AREAS }}>
        {eofVisible && (
          <EquipmentSlot
            slotId="eof"
            label="EOF"
            item={eofWeapon}
            miniIcon={neckItem?.icon}
            readOnly
            isUnlocked={isUnlocked}
            style={styleId}
            selectedLeagueRelics={selectedLeagueRelics}
          />
        )}
        {Object.keys(SLOT_LABELS).map((slotId) => (
          <EquipmentSlot
            key={slotId}
            slotId={slotId}
            label={SLOT_LABELS[slotId]}
            item={findItem(styleId, slots[slotId])}
            readOnly
            isUnlocked={isUnlocked}
            style={styleId}
            selectedLeagueRelics={selectedLeagueRelics}
          />
        ))}
      </div>
      {/* Every figure these blessings and relics produce, behind one button -
          see LeaguesEffectsPanel. The potion state is a toggle there rather
          than three rows of numbers here. */}
      <LeaguesEffectsPanel
        blessings={blessings}
        armour={{ none: armourTotal, overload: armourTotalOverloaded, elder: armourTotalElder }}
        aegis={aegis && { multiplier: aegis.multiplier, source: aegis.source, none: aegis.base, overload: aegis.overloaded, elder: aegis.elder }}
        elderSources={elderSources}
        lifeTotal={lifeTotal}
        bigBonedBonus={bigBonedBonus}
        prayerTotal={prayerTotal}
        icyeneBonus={icyeneBonus}
      />
    </figure>
  );
}
