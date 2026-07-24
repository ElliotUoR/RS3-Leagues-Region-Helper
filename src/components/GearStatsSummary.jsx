const ATTACK_STYLES = ['stab', 'slash', 'crush', 'magic', 'ranged'];

// `damage`/`accuracy` are flat rating numbers on every item type, not
// percentages. Weapon/offhand/ammo ratings are on a much larger numeric
// scale than armour/accessory ratings, so they're still tracked separately
// to keep the totals readable — but neither is a "%".
const WEAPON_SLOTS = new Set(['weapon', 'offhand', 'ammo']);

function sumStats(equipped) {
  const totals = {
    attack: { stab: 0, slash: 0, crush: 0, magic: 0, ranged: 0 },
    defence: { stab: 0, slash: 0, crush: 0, magic: 0, ranged: 0 },
    armourDamage: 0,
    armourAccuracy: 0,
    weaponDamageRating: 0,
    weaponAccuracyRating: 0,
    lifeBonus: 0,
    prayerBonus: 0,
  };
  for (const [slot, item] of Object.entries(equipped)) {
    const s = item?.stats;
    if (!s) continue;
    for (const key of ATTACK_STYLES) {
      totals.attack[key] += s.attack?.[key] || 0;
      totals.defence[key] += s.defence?.[key] || 0;
    }
    if (WEAPON_SLOTS.has(slot)) {
      totals.weaponDamageRating += s.damage || 0;
      totals.weaponAccuracyRating += s.accuracy || 0;
    } else {
      totals.armourDamage += s.damage || 0;
      totals.armourAccuracy += s.accuracy || 0;
    }
    totals.lifeBonus += s.lifeBonus || 0;
    totals.prayerBonus += s.prayerBonus || 0;
  }
  return totals;
}

export default function GearStatsSummary({ equipped }) {
  const totals = sumStats(equipped);
  const itemCount = Object.keys(equipped).length;

  return (
    <div className="gear-stats-summary">
      <h3>Loadout totals</h3>
      <p className="gear-stats-count">{itemCount} item{itemCount === 1 ? '' : 's'} equipped</p>

      <div className="gear-stats-row">
        <span>Armour damage</span>
        <strong>{totals.armourDamage.toFixed(1)}</strong>
      </div>
      <div className="gear-stats-row">
        <span>Armour accuracy</span>
        <strong>{totals.armourAccuracy.toFixed(1)}</strong>
      </div>
      <div className="gear-stats-row">
        <span>Weapon damage rating</span>
        <strong>{totals.weaponDamageRating.toFixed(1)}</strong>
      </div>
      <div className="gear-stats-row">
        <span>Weapon accuracy rating</span>
        <strong>{totals.weaponAccuracyRating.toFixed(1)}</strong>
      </div>
      <div className="gear-stats-row">
        <span>Life points</span>
        <strong>+{totals.lifeBonus}</strong>
      </div>
      <div className="gear-stats-row">
        <span>Prayer bonus</span>
        <strong>+{totals.prayerBonus}</strong>
      </div>

      <table className="gear-stats-table">
        <thead>
          <tr>
            <th></th>
            <th>Stab</th>
            <th>Slash</th>
            <th>Crush</th>
            <th>Magic</th>
            <th>Ranged</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Attack</td>
            {ATTACK_STYLES.map((k) => (
              <td key={k}>{totals.attack[k]}</td>
            ))}
          </tr>
          <tr>
            <td>Defence</td>
            {ATTACK_STYLES.map((k) => (
              <td key={k}>{totals.defence[k]}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
