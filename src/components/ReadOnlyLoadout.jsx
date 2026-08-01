import EquipmentSlot from './EquipmentSlot';
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
  aegis,
  bigBonedBonus,
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
      {armourTotal != null && (
        <p className="read-only-loadout-armour">
          {/* Same colour coding the gear planner's own stat line uses
              (.gear-stat-armour / .gear-stat-lp) - armour is armour-blue and
              health is life-green wherever either number appears. */}
          Total armour <strong className="gear-stat-armour">{armourTotal.toLocaleString()}</strong>
          <span className="read-only-loadout-armour-note"> at 99 Defence</span>
          {/* Armour from the Defence skill is D^3/1250 + 4D + 40, so a boost to
              Defence is worth a lot of armour: +17 from a normal overload is
              ~+540, and +25 from an ELDER overload is ~+849. Four blessings
              scale off total armour and you are overloaded for essentially all
              PvM, so the boosted figures are the honest ones for DPS. */}
          {armourTotalOverloaded != null && (
            <>
              <br />
              <strong className="read-only-loadout-armour-ovl">{armourTotalOverloaded.toLocaleString()}</strong>
              <span className="read-only-loadout-armour-note"> overloaded (+17)</span>
            </>
          )}
          {armourTotalElder != null && (
            <>
              <br />
              <strong className="read-only-loadout-armour-elder">{armourTotalElder.toLocaleString()}</strong>
              <span className="read-only-loadout-armour-note">
                {' '}elder overloaded (+25)
                {elderSources?.length ? ` - via ${elderSources.join(' or ')}` : ''}
              </span>
            </>
          )}
        </p>
      )}
      {/* Teragard's Aegis turns armour into base ability damage, so it belongs
          directly under the armour it is derived from. Quoted at each potion
          state for the same reason the armour above is: you are overloaded for
          essentially all PvM, and the unboosted figure is the one you will
          never actually be hitting at. */}
      {aegis && (
        <p className="read-only-loadout-armour">
          Ability damage <strong className="gear-stat-dmg">+{aegis.base.toLocaleString()}</strong>
          <span className="read-only-loadout-armour-note">
            {' '}from Teragard's Aegis ({aegis.multiplier}x, {aegis.offhandClass})
          </span>
          {aegis.overloaded != null && (
            <>
              <br />
              <strong className="read-only-loadout-armour-ovl">+{aegis.overloaded.toLocaleString()}</strong>
              <span className="read-only-loadout-armour-note"> overloaded</span>
            </>
          )}
          {aegis.elder != null && (
            <>
              <br />
              <strong className="read-only-loadout-armour-elder">+{aegis.elder.toLocaleString()}</strong>
              <span className="read-only-loadout-armour-note">
                {' '}elder overloaded
                {elderSources?.length ? ` - via ${elderSources.join(' or ')}` : ''}
              </span>
            </>
          )}
        </p>
      )}

      {/* Only ever passed by a user-submitted build (see UserBuildCard) whose
          author picked Big Boned - that's the one blessing that reads its
          value straight off total life points, so it's the only case this
          number is worth showing at all. Curated builds never pass it. */}
      {lifeTotal != null && (
        <p className="read-only-loadout-armour">
          Total health <strong className="gear-stat-lp">{lifeTotal.toLocaleString()}</strong>
          <span className="read-only-loadout-armour-note"> at 99 Hitpoints</span>
        </p>
      )}

      {/* Big Boned's bonus damage is a flat share of the health total above, so
          it sits under it. Per HIT, not per ability - a multi-hit ability
          collects it once per hit, which is most of why the blessing is worth
          taking. */}
      {bigBonedBonus != null && (
        <p className="read-only-loadout-armour">
          Bonus damage <strong className="gear-stat-dmg">+{bigBonedBonus.toLocaleString()}</strong>
          <span className="read-only-loadout-armour-note"> per hit, from Big Boned</span>
        </p>
      )}
    </figure>
  );
}
