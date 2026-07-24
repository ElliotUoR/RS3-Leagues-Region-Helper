import { useMemo, useState } from 'react';
import AbilityRow from '../components/AbilityRow';
import { ABILITIES, ABILITY_STYLES } from '../data/abilities';
import { isGearItemAvailable } from '../data/gearAvailability';

const STYLE_LABELS = {
  melee: 'Melee',
  ranged: 'Ranged',
  magic: 'Magic',
  necromancy: 'Necro',
  generic: 'Generic',
};

const TABS = [...ABILITY_STYLES, 'all'];

export default function AbilitiesPage({ isUnlocked }) {
  const [tab, setTab] = useState('all');
  const [worldWakesAutocompleted, setWorldWakesAutocompleted] = useState(false);
  const [ignoreComponents, setIgnoreComponents] = useState(false);

  function isAbilityAvailable(ability) {
    if (worldWakesAutocompleted && ability.worldWakes) return true;
    return isGearItemAvailable(ability, isUnlocked, { ignoreComponents });
  }

  const displayAbilities = useMemo(() => {
    const filtered = tab === 'all' ? ABILITIES : ABILITIES.filter((a) => a.style === tab);
    // Unlocked abilities sort ahead of locked ones, same convention as the gear list.
    const available = filtered.filter((a) => isAbilityAvailable(a));
    const locked = filtered.filter((a) => !isAbilityAvailable(a));
    return [...available, ...locked];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isUnlocked, worldWakesAutocompleted, ignoreComponents]);

  const tabLabel = tab === 'all' ? 'abilities' : `${STYLE_LABELS[tab].toLowerCase()} abilities`;

  return (
    <>
      <header>
        <h1>Abilities</h1>
        <p>
          Abilities that are locked behind a codex, quest, drop, or shop purchase - greyed out
          until you've picked the region(s) that provide them. Abilities that simply unlock at a
          skill level aren't shown here.
        </p>
      </header>

      <main className="abilities-page">
        <div className="abilities-controls">
          <div className="style-tabs" role="tablist">
            {TABS.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={tab === s}
                className={`style-tab${tab === s ? ' active' : ''}`}
                onClick={() => setTab(s)}
              >
                {s === 'all' ? 'All' : STYLE_LABELS[s]}
              </button>
            ))}
          </div>

          <div className="abilities-toggles">
            <label className="hide-locked-toggle" title="Treats Death's Swiftness, Sunshine, Natural Instinct, and Guthix's Blessing as unlocked even if Kandarin isn't selected.">
              <input
                type="checkbox"
                checked={worldWakesAutocompleted}
                onChange={(e) => setWorldWakesAutocompleted(e.target.checked)}
              />
              <span>World Wakes - Autocompleted</span>
            </label>

            <label className="hide-locked-toggle" title="Skips component tags (Ports components, Cywir components) - you'll only need the ability's other listed region(s).">
              <input
                type="checkbox"
                checked={ignoreComponents}
                onChange={(e) => setIgnoreComponents(e.target.checked)}
              />
              <span>Ignore component requirements</span>
            </label>
          </div>
        </div>

        {displayAbilities.length > 0 ? (
          <div className="gear-item-rows">
            {displayAbilities.map((ability) => (
              <AbilityRow
                key={ability.name}
                ability={ability}
                available={isAbilityAvailable(ability)}
                isUnlocked={isUnlocked}
              />
            ))}
          </div>
        ) : (
          <p className="gear-empty">No unlockable {tabLabel}.</p>
        )}
      </main>
    </>
  );
}
