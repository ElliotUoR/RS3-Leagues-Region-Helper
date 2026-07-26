import RegionMap from '../components/RegionMap';
import RegionPicker from '../components/RegionPicker';
import UnlocksList from '../components/UnlocksList';

export default function HomePage({ selected, toggleRegion, isUnlocked, overLimit, clearRegions }) {
  return (
    <>
      <header>
        <h1>Leagues II: Equilibrium - Regional PVM unlock planner</h1>
        <p>
          Misthalin, Karamja, and Havenhythe are always unlocked. Pick up to 3 more regions to
          plan your route.
        </p>
      </header>

      <main>
        <RegionMap isUnlocked={isUnlocked} toggleRegion={toggleRegion} />
        <RegionPicker
          selected={selected}
          isUnlocked={isUnlocked}
          toggleRegion={toggleRegion}
          overLimit={overLimit}
          clearRegions={clearRegions}
        />
        <UnlocksList isUnlocked={isUnlocked} />
      </main>
    </>
  );
}
