import { useEffect, useState } from 'react';
import AbilitiesPage from './AbilitiesPage';
import RelicsPage from './RelicsPage';
import SpellbooksPage from './SpellbooksPage';
import { trackPageview } from '../utils/api';

const SUB_TABS = [
  { id: 'abilities', label: 'Abilities' },
  { id: 'relics', label: 'Arch Relics' },
  { id: 'spellbooks', label: 'Spellbooks & Prayers' },
];
const SUB_TAB_IDS = new Set(SUB_TABS.map((t) => t.id));
const DEFAULT_SUB_TAB = 'abilities';

// The route is `#character`, with the active sub-tab appended (e.g.
// `#character/relics`) so it's shareable/bookmarkable and supports back/
// forward, same pattern as BuildGuidesPage's expanded-build id. The three
// old standalone hashes are also accepted so existing bookmarks/links into
// those pages keep landing in the right place now that they live here.
const LEGACY_HASH_SUB_TAB = { '#abilities': 'abilities', '#relics': 'relics', '#spellbooks': 'spellbooks' };

function subTabFromHash() {
  const hash = window.location.hash;
  if (LEGACY_HASH_SUB_TAB[hash]) return LEGACY_HASH_SUB_TAB[hash];
  const part = hash.split('/')[1];
  return part && SUB_TAB_IDS.has(part) ? part : DEFAULT_SUB_TAB;
}

// True whenever the current hash still targets this page (the new
// "#character" prefix or one of the three pre-merge standalone hashes) -
// used below to ignore a hashchange fired by navigating to a *different*
// top-level tab while this component's own listener is still attached (it
// only gets torn down once App.jsx's route change unmounts this page, which
// happens slightly after the native hashchange event itself).
function isCharacterHash(hash) {
  return LEGACY_HASH_SUB_TAB[hash] !== undefined || hash.split('/')[0] === '#character';
}

export default function CharacterPage({ isUnlocked, selectedRelics, toggleRelic, hasCrystalGrace }) {
  const [subTab, setSubTab] = useState(subTabFromHash);

  // Switching sub-tabs never changes App.jsx's top-level `route` (it stays
  // "character" throughout), so App.jsx's own route-level trackPageview
  // effect only ever fires once, for whichever sub-tab was active on entry.
  // Back/forward navigation between sub-tabs needs its own tracking here.
  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash;
      if (!isCharacterHash(hash)) return;
      const next = subTabFromHash();
      setSubTab(next);
      trackPageview(`#character/${next}`);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function selectSubTab(id) {
    if (id === subTab) return;
    setSubTab(id);
    // replaceState rather than assigning location.hash: switching sub-tabs
    // shouldn't pile up history entries. That also means it doesn't fire a
    // native hashchange event, so the pageview has to be tracked explicitly
    // here rather than relying on the listener above.
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#character/${id}`);
    trackPageview(`#character/${id}`);
  }

  return (
    <>
      <nav className="sort-tabs character-subnav" role="tablist" aria-label="Character section">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subTab === tab.id}
            className={`sort-tab${subTab === tab.id ? ' active' : ''}`}
            onClick={() => selectSubTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {subTab === 'abilities' && <AbilitiesPage isUnlocked={isUnlocked} />}
      {subTab === 'relics' && (
        <RelicsPage isUnlocked={isUnlocked} selected={selectedRelics} toggleRelic={toggleRelic} />
      )}
      {subTab === 'spellbooks' && <SpellbooksPage isUnlocked={isUnlocked} hasCrystalGrace={hasCrystalGrace} />}
    </>
  );
}
