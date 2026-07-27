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
