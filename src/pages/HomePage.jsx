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
            <a href="#gear" className="gear-planner-cta">
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
            <a href="#gear-by-region" className="gear-planner-cta">
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
      </main>
    </>
  );
}
