import UnlockCard from './UnlockCard';

// Renders a parent unlock card with its related/extension cards attached
// below via a small connector (dashed line + chevron), so it reads as
// "these build on the card above" rather than an unrelated sibling.
export default function UnlockCardGroup({ parent, related, isUnlocked }) {
  return (
    <div className="unlock-group">
      <UnlockCard entry={parent} isUnlocked={isUnlocked} />
      {related?.length > 0 && (
        <>
          <div className="unlock-group-connector" aria-hidden="true">
            <span className="unlock-group-connector-line" />
            <span className="unlock-group-connector-chevron">⌄</span>
          </div>
          <div className="unlock-group-children">
            {related.map((child) => (
              <UnlockCard key={child.name} entry={child} isUnlocked={isUnlocked} extension={parent.name} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
