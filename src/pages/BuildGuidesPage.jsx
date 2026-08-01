import { useEffect, useState } from 'react';
import BuildGuideCard from '../components/BuildGuideCard';
import UserBuildListItem from '../components/UserBuildListItem';
import ReportBuildModal from '../components/ReportBuildModal';
import TierList from '../components/TierList';
import {
  BLESSING_BUILDS_EXAMPLES,
  BLESSING_TIER_LIST,
  LEAGUE_RELIC_TIER_LIST,
  RELIC_COLOURS,
} from '../data/blessingBuilds';
import { BLESSINGS, GOD_TIER_BLESSINGS } from '../data/blessings';
import { LEAGUE_RELICS } from '../data/leagueRelics';
import { isBuildTextEditable, isBuildVisible } from '../utils/buildTextEdit';
import { buildGuideUrl, buildIdFromLocation } from '../utils/buildGuideRoute';
import { fetchBuildVotes, getUserBuildBySlug, listFeaturedUserBuilds, trackUsage } from '../utils/api';
import { sanitizeUserBuildPayload } from '../utils/userBuildShape';
import { IS_PAGES_BUILD } from '../utils/deployTarget';

const BLESSING_ICONS = new Map([...BLESSINGS, ...GOD_TIER_BLESSINGS].map((b) => [b.name, b.icon]));
const LEAGUE_RELIC_ICONS = new Map(LEAGUE_RELICS.map((r) => [r.name, r.icon]));

// The tier lists store only grades and notes; icons and the relic accent hue
// are joined on here so TierList itself stays dataset-agnostic.
const blessingTierEntries = BLESSING_TIER_LIST.entries.map((entry) => ({
  ...entry,
  icon: BLESSING_ICONS.get(entry.name),
}));

const relicTierEntries = LEAGUE_RELIC_TIER_LIST.entries.map((entry) => ({
  ...entry,
  icon: LEAGUE_RELIC_ICONS.get(entry.name),
  hue: RELIC_COLOURS[entry.name]?.hue,
}));

function BlessingBadges(entry) {
  return (
    <>
      {entry.kind === 'god' ? (
        <span className="tier-badge tier-badge-god">God</span>
      ) : (
        <span className="tier-badge">T{entry.tier}</span>
      )}
    </>
  );
}

function RelicBadges(entry) {
  return (
    <>
      <span className="tier-badge">{entry.relicTier != null ? `T${entry.relicTier}` : '?'}</span>
      {entry.unlocksGear > 0 && (
        <span className="tier-badge tier-badge-unlocks">unlocks {entry.unlocksGear} items</span>
      )}
    </>
  );
}

// An open build puts its id in the URL so the link opens that build expanded.
// Two forms exist - "/Leagues/build-guides/the-ironclad" (what the address bar
// shows on the live site, and the only form a crawler can read a build id out
// of for a link preview) and "#build-guides/the-ironclad" (every link shared
// before that existed, still accepted). See utils/buildGuideRoute.js.
const VISIBLE_BUILDS = BLESSING_BUILDS_EXAMPLES.filter(isBuildVisible);
const BUILD_IDS = new Set(VISIBLE_BUILDS.map((b) => b.id));

function openBuildIdFromUrl() {
  const id = buildIdFromLocation();
  return id && BUILD_IDS.has(id) ? id : null;
}

// `import.meta.env.DEV` is a compile-time literal, so in production this folds
// to `false && ...` -> `false`, the toggle JSX below becomes unreachable, and
// isBuildTextEditable falls out of the bundle entirely.
const CAN_EDIT = import.meta.env.DEV && isBuildTextEditable();

// /build-guides/<x> is ONE namespace covering this site's curated guides and
// user-submitted builds, which is why a user build's slug can never equal a
// curated id (the generator reserves them - see server/src/lib/userBuildSlug.js).
// A segment that isn't a curated id is therefore a user build slug, and this
// resolves it so a shared link opens that build here, expanded.
//
// Fails silently on both "no such slug" and "backend down": the rest of this
// page is static reference material and must render either way.
function useSharedUserBuild() {
  const [shared, setShared] = useState(null);

  useEffect(() => {
    if (IS_PAGES_BUILD) return;
    const segment = buildIdFromLocation();
    if (!segment || BUILD_IDS.has(segment)) return;

    getUserBuildBySlug(segment)
      .then((row) => {
        const build = sanitizeUserBuildPayload(row.payload);
        if (!build) return;
        // The card's collapsed header reads the payload-derived fields the
        // LISTING endpoint supplies; this row carries the whole payload
        // instead, so they are taken off the sanitized build - which is where
        // the listing's copies came from in the first place.
        setShared({
          summary: {
            ...row,
            styles: build.styles,
            blessings: build.blessings,
            relics: build.relics,
            difficultyLabel: build.difficultyLabel,
            difficultyNote: build.difficultyNote,
          },
          build,
        });
      })
      .catch(() => {});
  }, []);

  return shared;
}

// The featured strip is the one part of this page that isn't static data, and
// it is deliberately optional: listFeaturedUserBuilds resolves to [] on any
// failure, and the whole fetch is skipped on the GitHub Pages mirror, which
// has no backend at all. Nothing below depends on it having loaded.
function useFeaturedBuilds() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    if (IS_PAGES_BUILD) return;
    listFeaturedUserBuilds().then(setFeatured);
  }, []);

  return featured;
}

// Scores for whichever user builds ended up on this page - the featured strip,
// a shared build, or both. Deliberately waits until something is actually
// there: a page showing only curated guides has no vote bars to paint, so the
// request would be pure waste.
function useVotesWhenNeeded(needed) {
  const [votes, setVotes] = useState({});

  useEffect(() => {
    if (!needed) return;
    fetchBuildVotes().then(setVotes);
  }, [needed]);

  return [votes, setVotes];
}

export default function BuildGuidesPage() {
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(null);
  const featured = useFeaturedBuilds();
  const shared = useSharedUserBuild();
  const [votes, setVotes] = useVotesWhenNeeded(featured.length > 0 || Boolean(shared));
  // Multiple cards may be open at once - readers commonly want to compare two
  // builds side by side, so this is a Set rather than a single active id. Only
  // the most recently opened one is reflected in the URL.
  const [expanded, setExpanded] = useState(() => {
    const id = openBuildIdFromUrl();
    return new Set(id ? [id] : []);
  });

  // Loading a link straight into a build (e.g. a shared
  // "#build-guides/teragards-bulwark" URL) counts as that build being viewed
  // just like clicking to expand one does - tracked once here for whichever
  // build (if any) was already open on the very first render, since toggle()
  // below and the hashchange listener below only cover *subsequent* opens.
  useEffect(() => {
    const id = openBuildIdFromUrl();
    if (id) trackUsage([{ category: 'build_guide', key: id }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back/forward and hand-edited URLs reach here as hashchange (hash form) or
  // popstate (path form), so both are listened for.
  useEffect(() => {
    function onLocationChange() {
      const id = openBuildIdFromUrl();
      if (!id) return;
      setExpanded((prev) => (prev.has(id) ? prev : new Set([...prev, id])));
      trackUsage([{ category: 'build_guide', key: id }]);
    }
    window.addEventListener('hashchange', onLocationChange);
    window.addEventListener('popstate', onLocationChange);
    return () => {
      window.removeEventListener('hashchange', onLocationChange);
      window.removeEventListener('popstate', onLocationChange);
    };
  }, []);

  function toggle(id) {
    const opening = !expanded.has(id);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (opening) next.add(id);
      else next.delete(id);
      // replaceState rather than a navigation: this should be a shareable
      // address, not a history entry per card you poke at.
      window.history.replaceState(null, '', buildGuideUrl(opening ? id : null));
      return next;
    });
    // Only fires when actually opening a build, not closing one - "was this
    // build guide looked at" is the question, same convention as
    // RelicDropTablePanel's trackUsage call for its own drop-table toggle.
    if (opening) trackUsage([{ category: 'build_guide', key: id }]);
  }

  return (
    <>
      <header>
        <h1>Build Guides</h1>
        <p>
          Complete example builds - gear, league relics, Arch relics, blessings, abilities, spellbook
          and prayers. Every build fits inside one Leagues run: the three fixed regions (Misthalin,
          Karamja, Havenhythe) plus at most three optional picks, one blessing per tier, one Tier 1
          league relic and up to two unknown-tier ones.
        </p>
      </header>

      <main className="build-guides-page">
        <div className="build-guides-user-cta">
          <a href="#create-build" className="build-create-button">
            + Create a build
          </a>
          <a href="#user-builds" className="build-see-user-builds-button">
            See user made builds
          </a>
        </div>

        {CAN_EDIT && (
          <div className="build-edit-bar">
            <label className="build-edit-toggle">
              <input type="checkbox" checked={editing} onChange={(e) => setEditing(e.target.checked)} />
              <span>Edit text</span>
            </label>
            <span className="build-edit-note">
              Localhost only. Edits write straight back into <code>src/data/blessingBuilds.js</code>.
            </span>
          </div>
        )}

        {/* Someone followed a link to a specific player build. It goes above
            this site's own guides rather than in the featured strip below -
            it is the reason they opened the page, and it may not be featured
            at all. */}
        {shared && (
          <section className="featured-builds shared-user-build">
            <header className="featured-builds-header">
              <h2>Shared build</h2>
              <p>
                A build made by another player. See{' '}
                <a href="#user-builds" className="notice-link">
                  all user made builds
                </a>.
              </p>
            </header>
            <div className="build-list">
              <UserBuildListItem
                summary={shared.summary}
                initialBuild={shared.build}
                defaultExpanded
                vote={votes[shared.summary.id]}
                onVoted={(id, next) => setVotes((prev) => ({ ...prev, [id]: next }))}
                onReport={setReporting}
              />
            </div>
          </section>
        )}

        <section className="build-list">
          {VISIBLE_BUILDS.map((build) => (
            <BuildGuideCard
              key={build.id}
              build={build}
              expanded={expanded.has(build.id)}
              onToggle={() => toggle(build.id)}
              editing={editing}
            />
          ))}
        </section>

        {/* Player-made builds an admin has picked out, sitting under this
            site's own guides rather than mixed in with them - a featured build
            is a recommendation, not a curated guide, and the heading says so.
            Renders nothing at all when none are featured (or when there is no
            backend to ask), so this page's default state is unchanged. */}
        {featured.length > 0 && (
          <section className="featured-builds">
            <header className="featured-builds-header">
              <h2>Featured player builds</h2>
              <p>
                Builds submitted by other players and picked out as worth a look. See{' '}
                <a href="#user-builds" className="notice-link">
                  all user made builds
                </a>.
              </p>
            </header>
            <div className="build-list">
              {featured.map((summary) => (
                <UserBuildListItem
                  key={summary.id}
                  summary={summary}
                  vote={votes[summary.id]}
                  onVoted={(id, next) => setVotes((prev) => ({ ...prev, [id]: next }))}
                  onReport={setReporting}
                />
              ))}
            </div>
          </section>
        )}

        <TierList
          title="Blessing tier list"
          standfirst="Each blessing and god power graded on its own isolated power, deliberately ignoring the combos above."
          grades={BLESSING_TIER_LIST.grades}
          entries={blessingTierEntries}
          renderBadges={BlessingBadges}
          footnote="* Demon's Mark is graded on the weaker reading of its effect - tap it for detail."
        />

        <TierList
          title="League relic tier list"
          standfirst={LEAGUE_RELIC_TIER_LIST.scopeNote}
          grades={LEAGUE_RELIC_TIER_LIST.grades}
          entries={relicTierEntries}
          renderBadges={RelicBadges}
          gradeLabels={{ unranked: 'Unranked' }}
        />
      </main>

      {reporting && <ReportBuildModal build={reporting} onClose={() => setReporting(null)} />}
    </>
  );
}
