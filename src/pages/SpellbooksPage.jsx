import { useState } from 'react';
import UnlockCardGroup from '../components/UnlockCardGroup';
import { PRAYER_GROUPS, SPELLBOOK_GROUPS } from '../data/spellbooks';

const TABS = [
  { id: 'spellbooks', label: 'Spellbooks' },
  { id: 'prayers', label: 'Prayers' },
];

export default function SpellbooksPage({ isUnlocked }) {
  const [tab, setTab] = useState('spellbooks');
  const groups = tab === 'spellbooks' ? SPELLBOOK_GROUPS : PRAYER_GROUPS;

  return (
    <>
      <header>
        <h1>Spellbooks & Prayers</h1>
        <p>
          Which spellbooks, prayer books, and their extensions your region picks unlock. Cards
          with a dashed "Possibly" tag have an unconfirmed extra requirement and are shown as
          available regardless.
        </p>
      </header>

      <main className="abilities-page">
        <div className="style-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`style-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={`unlock-panels unlock-panels-${groups.length}`}>
          {groups.map((group) => (
            <div className="unlock-panel" key={group.id}>
              <UnlockCardGroup parent={group.parent} related={group.related} isUnlocked={isUnlocked} />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
