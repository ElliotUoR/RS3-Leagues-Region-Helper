import { useEffect, useState } from 'react';
import TierListView from '../components/TierListView';
import ReportTierListModal from '../components/ReportTierListModal';
import { TIER_LIST_BADGES } from '../utils/tierBadgeMap';
import { itemNamesFor, tierListTitle } from '../data/tierListItems';
import { getTierList } from '../utils/api';
import { tierListFromLocation } from '../utils/tierListRoute';
import { sanitizeDraft } from '../utils/tierListDraft';

// Somebody else's finished tier list, read-only.
//
// The heading is deliberately "<author>'s blessing tier list" rather than a
// title the author writes: the two things that give a ranking meaning are who
// made it and what it is for, and the angle line already carries the second.
export default function SharedTierListPage() {
  const [state, setState] = useState('loading'); // loading | ready | not-found | error
  const [list, setList] = useState(null);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    const address = tierListFromLocation();
    if (!address) {
      setState('not-found');
      return undefined;
    }

    let cancelled = false;
    getTierList(address.type, address.code)
      .then((row) => {
        if (cancelled) return;
        // Sanitized on read like every other stored payload on this site: it
        // was validated on the way in, but the item list can change under it,
        // and a blessing removed since should vanish rather than render blank.
        const draft = sanitizeDraft(row.payload, address.type, itemNamesFor(address.type));
        setList({ ...draft, code: address.code, type: address.type });
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setState(String(err.message).includes('404') ? 'not-found' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return (
      <main className="build-guides-page">
        <p className="build-setup-note">Loading…</p>
      </main>
    );
  }

  if (state !== 'ready') {
    return (
      <main className="build-guides-page">
        <p className="build-setup-note">
          {state === 'not-found'
            ? "That tier list doesn't exist, or it has been taken down."
            : "Couldn't load that tier list right now."}{' '}
          <a href="#tier-list-maker" className="notice-link">
            Make your own
          </a>
        </p>
      </main>
    );
  }

  return (
    <>
      <header>
        <h1 className="shared-tier-list-title">{tierListTitle(list.authorName, list.type)}</h1>
        {list.angle && <p className="shared-tier-list-angle">{list.angle}</p>}
        <p>
          One player&apos;s ranking, not this site&apos;s.{' '}
          <a href="#tier-list-maker" className="notice-link">
            Create your own tier list
          </a>
          .
        </p>
      </header>

      <main className="tier-maker-page">
        <TierListView
          type={list.type}
          rowLabels={list.rowLabels}
          placements={list.placements}
          renderBadges={TIER_LIST_BADGES[list.type]}
        />
        <div className="shared-tier-list-actions">
          <a href="#tier-list-maker" className="build-create-button">
            + Make your own
          </a>
          <button type="button" className="tier-maker-reset" onClick={() => setReporting(true)}>
            Report this list
          </button>
        </div>
      </main>

      {reporting && (
        <ReportTierListModal type={list.type} code={list.code} onClose={() => setReporting(false)} />
      )}
    </>
  );
}
