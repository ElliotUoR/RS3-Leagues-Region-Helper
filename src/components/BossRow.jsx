import { useState } from 'react';
import RetryImage from './RetryImage';
import { wikiContextMenuHandler } from '../utils/wiki';

export default function BossRow({ boss }) {
  const [expanded, setExpanded] = useState(false);
  const hasDrops = boss.drops && boss.drops.length > 0;

  return (
    <li className="boss-row">
      <button
        type="button"
        className="boss-row-header"
        onClick={() => setExpanded((prev) => !prev)}
        onContextMenu={wikiContextMenuHandler(boss.name)}
        aria-expanded={expanded}
        aria-disabled={!hasDrops}
      >
        <span className={`boss-row-chevron${expanded ? ' open' : ''}`} aria-hidden="true">
          {hasDrops ? '▸' : ''}
        </span>
        <span className="boss-row-name">{boss.name}</span>
        {boss.subLocation && <span className="sub-location-tag">{boss.subLocation}</span>}
      </button>
      {expanded && hasDrops && (
        <ul className="boss-drops">
          {boss.drops.map((drop) => (
            <li key={drop.name} className="boss-drop" onContextMenu={wikiContextMenuHandler(drop.name)}>
              <RetryImage src={drop.icon} alt="" />
              <span>{drop.name}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
