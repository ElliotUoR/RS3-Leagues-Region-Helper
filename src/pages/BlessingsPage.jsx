import { useMemo, useState } from 'react';
import BlessingCard from '../components/BlessingCard';
import BlessingGodPanel from '../components/BlessingGodPanel';
import BlessingPassivesModal from '../components/BlessingPassivesModal';
import { BLESSINGS, BLESSING_COLOURS, BLESSING_COLOUR_META, BLESSING_TIERS } from '../data/blessings';
import { copyShareLink, shareLinkFor } from '../utils/shareLink';

const LANDING_HASH = '#blessings';

// Blessings are grouped by tier, and within a tier ordered red -> green -> blue
// so the same colour is always in the same column across all three rows. That
// column alignment is the whole point of the layout: picking "two of a colour"
// is what decides the god power, and a stable column makes that a vertical
// read rather than something you have to hunt for.
function groupByTier(blessings) {
  return BLESSING_TIERS.map((tier) => [
    tier,
    BLESSING_COLOURS.map((colour) =>
      blessings.find((b) => b.tier === tier && b.colour === colour),
    ).filter(Boolean),
  ]);
}

export default function BlessingsPage({
  selected,
  toggleBlessing,
  clearBlessings,
  regions,
  gatewaySelected,
  equippedNamesByStyle,
  eofWeaponNamesByStyle,
  relics,
  leagueRelics,
  defaultStyle,
}) {
  const tierGroups = useMemo(() => groupByTier(BLESSINGS), []);
  // Detailed is the default here, unlike League Relics. A blessing's verbatim
  // effect lines are short (one to three per card) and are the thing being
  // chosen between, so hiding them behind a toggle would make the page's whole
  // job harder. Compact exists for re-picking once you already know them.
  const [compactMode, setCompactMode] = useState(false);
  const [shareStatus, setShareStatus] = useState('idle');

  const selectedBlessings = useMemo(
    () => selected.map((name) => BLESSINGS.find((b) => b.name === name)).filter(Boolean),
    [selected],
  );

  // Carries the full build (regions, gear, relics) alongside the blessings, so
  // a link shared from here is the same shareable build as one from the Gear
  // Planner - it just opens on this tab. See shareBuild.js's landingHash, and
  // utils/shareLink.js for the short-link/deduplication path.
  async function handleShare() {
    setShareStatus('working');
    try {
      const url = await shareLinkFor({
        regions,
        gatewaySelected,
        equippedNamesByStyle,
        eofWeaponNamesByStyle,
        relics,
        leagueRelics,
        blessings: selected,
        defaultStyle,
        landingHash: LANDING_HASH,
      });
      setShareStatus(await copyShareLink(url));
    } catch {
      setShareStatus('error');
    }
    setTimeout(() => setShareStatus('idle'), 2500);
  }

  const SHARE_LABELS = {
    idle: 'Share blessings',
    working: 'Creating…',
    copied: 'Link copied!',
    manual: 'Link ready',
    error: 'Share unavailable',
  };

  return (
    <>
      <header>
        <div className="blessings-heading">
          <h1>Blessings</h1>
          <div className="blessings-actions">
            <button
              type="button"
              className="clear-loadout-button"
              onClick={clearBlessings}
              disabled={selected.length === 0}
            >
              Clear picks
            </button>
            <button
              type="button"
              className="share-button"
              onClick={handleShare}
              disabled={shareStatus === 'working'}
            >
              {SHARE_LABELS[shareStatus]}
            </button>
          </div>
        </div>
        <p>
          Pick one blessing from each of the three tiers. Every tier offers a choice from one of the gods,
          and decide which god power you are given - a god
          with two or more picks wins, and one of each falls to guthix. Blessings are resettable
          up to three times.
        </p>
      </header>

      <main className="blessings-page">
        <div className="blessing-colour-key">
          {BLESSING_COLOURS.map((colour) => {
            const meta = BLESSING_COLOUR_META[colour];
            return (
              <span key={colour} className={`blessing-key blessing-key-${colour}`}>
                <span className="blessing-key-swatch" aria-hidden="true" />
                <span className="blessing-key-god">{meta.god}</span>
                <span className="blessing-key-theme">{meta.theme}</span>
              </span>
            );
          })}
          <BlessingPassivesModal />
          <button
            type="button"
            className="league-relic-mode-toggle blessing-mode-toggle"
            onClick={() => setCompactMode((prev) => !prev)}
          >
            {compactMode ? 'Toggle to detailed mode' : 'Toggle to compact mode'}
          </button>
        </div>

        {tierGroups.map(([tier, blessings]) => {
          const pickedInTier = blessings.find((b) => selected.includes(b.name));
          return (
            <section key={tier} className="blessing-tier-group">
              <h2 className="blessing-tier-heading">
                <span className="blessing-tier-label">Tier {tier}</span>
                <span className="blessing-tier-note">pick one</span>
                {pickedInTier && (
                  <span className={`blessing-tier-picked blessing-tier-picked-${pickedInTier.colour}`}>
                    {pickedInTier.name}
                  </span>
                )}
              </h2>
              <div className={`blessing-grid${compactMode ? ' compact' : ''}`}>
                {blessings.map((blessing) => (
                  <BlessingCard
                    key={blessing.name}
                    blessing={blessing}
                    selected={selected.includes(blessing.name)}
                    onToggle={toggleBlessing}
                    compact={compactMode}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <BlessingGodPanel selectedBlessings={selectedBlessings} />

        <section className="dev-note">
          <p>
            Blessing card text is transcribed from Jagex's reveal images - there is no wiki page for
            these yet. Compact mode shortens the same effects; it does not add anything.
          </p>
        </section>
      </main>
    </>
  );
}
