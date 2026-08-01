// The small T1/T2/T3, God and relic-tier markers on a tier list chip.
//
// Shared by the maker, the read-only shared page and the curated lists on Build
// Guides, so a chip carries the same markers wherever it appears. Its own
// module because both the maker page and the shared page need them and neither
// owns the other.
export function BlessingBadges(entry) {
  return entry.kind === 'god' ? (
    <span className="tier-badge tier-badge-god">God</span>
  ) : (
    <span className="tier-badge">T{entry.tier}</span>
  );
}

export function RelicBadges(entry) {
  return <span className="tier-badge">{entry.relicTier != null ? `T${entry.relicTier}` : '?'}</span>;
}
