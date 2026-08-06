import RegionMap from '../components/RegionMap';
import RegionPicker from '../components/RegionPicker';
import LeagueCountdown from '../components/LeagueCountdown';
import { MAX_OPTIONAL } from '../data/regions';

export default function HomePage({ selected, toggleRegion, isUnlocked, overLimit, clearRegions }) {
  const pickRegionsHintVisible = selected.length === 0;
  const allRegionsUnlocked = selected.length >= MAX_OPTIONAL;

  return (
    <>
      <header className="home-header">
        <h1>
          <span className="site-title-full">RS3 Leagues II: Equilibrium - Regional PVM Unlock Planner</span>
          <span className="site-title-short">Leagues II - Regional PVM Planner</span>
        </h1>
        {/* Two pills side by side, wrapping onto separate lines on narrow
            screens. The second is a real link rather than a styled div so it
            keeps keyboard focus, middle-click and "open in new tab". */}
        <div className="home-banners">
          <a href="#my-build" className="home-banner home-updated-banner">
            <span className="home-banner-icon" aria-hidden="true">
              ✨
            </span>
            <span>
              <span className="home-banner-new">New:</span> Preview blessing effects in My Build
            </span>
            <span className="home-banner-arrow" aria-hidden="true">
              →
            </span>
          </a>
          <a href="#build-guides" className="home-banner home-guides-banner">
            <span className="home-banner-icon" aria-hidden="true">
              📜
            </span>
            <span>
              <span className="home-banner-new">New:</span> View and create build guides
            </span>
            <span className="home-banner-arrow" aria-hidden="true">
              →
            </span>
          </a>
        </div>
      </header>

      <main>
        <div className="region-map-column">
          <RegionMap isUnlocked={isUnlocked} toggleRegion={toggleRegion} />
        </div>

        <div className="region-map-notes">
          <p className={`pick-regions-hint${pickRegionsHintVisible ? ' visible' : ''}`}>
            Pick your regions to get started
          </p>
          <div className={`unlocks-list-heading-note${allRegionsUnlocked ? ' visible' : ''}`}>
            <span className="all-regions-note">
              All regions unlocked <span className="all-regions-arrow" aria-hidden="true">→</span>
            </span>
            <a href="#gear" className="build-create-button">
              Gear Planner
            </a>
            {/* Forces the flex-wrap to break exactly here (a common
                flex-basis:100% trick) so "Or check" + its button always
                start together on their own line, rather than only wrapping
                once the container happens to run out of room mid-group. */}
            <span className="unlocks-list-heading-break" aria-hidden="true" />
            <span className="all-regions-note">
              Or check <span className="all-regions-arrow" aria-hidden="true">→</span>
            </span>
            <a href="#gear-by-region" className="build-create-button">
              Gear by Region
            </a>
          </div>
        </div>

        <LeagueCountdown />

        <RegionPicker
          selected={selected}
          isUnlocked={isUnlocked}
          overLimit={overLimit}
          clearRegions={clearRegions}
        />

        {/* Site status, not a feature - so it sits at the FOOT of the page,
            below the region picker people actually came for, rather than up
            with the "New:" banners in the header. Those link somewhere; this
            is read once and does not.

            Plain text in the component rather than a data file: it is a
            dated note about one week, and giving it a home in `data/` would
            invite it to be left there long after it stopped being true. */}
        <aside className="home-notice-banner" role="status">
          <span className="home-notice-icon" aria-hidden="true">
            !
          </span>
          <span>
            New blessings added - next update for final relics will be the 8th - I am away on 6th &amp; 7th
          </span>
        </aside>
      </main>
    </>
  );
}
