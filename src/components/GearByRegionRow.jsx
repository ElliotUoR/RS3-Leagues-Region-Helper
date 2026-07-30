import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import RegionTags from './RegionTags';
import RetryImage from './RetryImage';
import { describeSource, keyStats } from '../utils/gearItemDisplay';
import { wikiContextMenuHandler } from '../utils/wiki';

const STYLE_LABELS = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic', necromancy: 'Necromancy' };

// Same tuning as GearItemRow's own compact tooltip.
const TOOLTIP_CURSOR_GAP = 18;
const TOOLTIP_MAX_WIDTH = 220;
const VIEWPORT_MARGIN = 8;

// A read-only reference row for the Gear by Region page - unlike
// GearItemRow (Gear Planner) there's no equip/toggle interaction here, just
// browsing, so this is a plain non-interactive card rather than a clickable
// button. Reuses GearItemRow's `describeSource`/`keyStats` helpers and the
// same RegionTags component (so lock state/tag styling matches the Gear
// Planner exactly) rather than duplicating that logic.
export default function GearByRegionRow({ item, isUnlocked, compact }) {
  const [hoverPos, setHoverPos] = useState(null);

  // Armour rating is keyed by combat style (see utils/gearStats.js) - an
  // item usable by several styles picks its first applicable style as the
  // representative one for this summary line, since most armour of this
  // kind carries the same rating across every style it's usable for anyway.
  const stats = keyStats(item, item.applicableStyles[0]);

  // An item usable by more than one style (Agility cape, Max cape, etc.)
  // collapses to a single "Shared" pill instead of listing every style it
  // applies to - those hybrid items are common enough (and the individual
  // pills wide enough) that spelling all 4 out just clutters the card.
  const stylePills = (
    <span className="gear-by-region-styles">
      {item.applicableStyles.length > 1 ? (
        <span className="gear-by-region-style-pill style-pill-shared">Shared</span>
      ) : (
        item.applicableStyles.map((style) => (
          <span key={style} className={`gear-by-region-style-pill style-pill-${style}`}>
            {STYLE_LABELS[style]}
          </span>
        ))
      )}
    </span>
  );

  // Dismiss on tap/click anywhere else - the mobile equivalent of
  // onMouseLeave, since touch devices never fire that event.
  useEffect(() => {
    if (!hoverPos) return undefined;
    function handleOutside() {
      setHoverPos(null);
    }
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [hoverPos]);

  // Compact mode hides level/source/stats behind a tooltip, same as
  // GearItemRow's own compact mode - but a click/tap toggle is added
  // alongside the cursor-tracking hover (which touch devices can't reach),
  // so it still works on mobile: tapping the card opens the tooltip at the
  // tap point, tapping again (or anywhere else) closes it.
  if (compact) {
    function handleMouseMove(event) {
      const left = Math.min(
        Math.max(event.clientX, VIEWPORT_MARGIN + TOOLTIP_MAX_WIDTH / 2),
        window.innerWidth - VIEWPORT_MARGIN - TOOLTIP_MAX_WIDTH / 2,
      );
      setHoverPos({ top: event.clientY - TOOLTIP_CURSOR_GAP, left });
    }

    function handleClick(event) {
      event.stopPropagation();
      if (hoverPos) {
        setHoverPos(null);
        return;
      }
      handleMouseMove(event);
    }

    return (
      <div className="gear-item-row gear-by-region-row" onContextMenu={wikiContextMenuHandler(item.wikiName ?? item.name)}>
        {/* Absolutely positioned (top-left corner) rather than sitting in the
            centered flex flow, same reasoning as .gear-item-override-compact's
            top-right placement - it needs to stay visible without shifting
            the centered icon/name/tags below it. */}
        <span className="gear-by-region-compact-styles">{stylePills}</span>
        <button
          type="button"
          className="gear-item-main gear-item-main-compact"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverPos(null)}
          onClick={handleClick}
        >
          <RetryImage src={item.icon} alt="" loading="eager" />
          <span className="gear-item-name">
            {item.name}
            {item.twoHanded && <span className="gear-item-tag-2h">2H</span>}
          </span>
          <RegionTags item={item} isUnlocked={isUnlocked} />
        </button>
        {hoverPos &&
          createPortal(
            <div
              className="gear-item-stats-tooltip"
              role="tooltip"
              style={{ top: hoverPos.top, left: hoverPos.left }}
            >
              {item.level && (
                <span className="gear-item-level">
                  {item.level.skill} {item.level.level}
                </span>
              )}
              <span className="gear-item-source">{describeSource(item.source)}</span>
              {stats.length > 0 && (
                <span className="gear-item-stats">
                  {stats.map((bit) => (
                    <span key={bit.type} className={`gear-stat gear-stat-${bit.type}`}>
                      {bit.text}
                    </span>
                  ))}
                </span>
              )}
            </div>,
            document.body,
          )}
      </div>
    );
  }

  return (
    <div className="gear-item-row gear-by-region-row" onContextMenu={wikiContextMenuHandler(item.wikiName ?? item.name)}>
      <div className="gear-item-main">
        <div className="gear-item-top">
          <span className="gear-item-name">
            {item.name}
            {item.twoHanded && <span className="gear-item-tag-2h">2H</span>}
          </span>
          <RegionTags item={item} isUnlocked={isUnlocked} />
        </div>
        <div className="gear-item-bottom">
          <RetryImage src={item.icon} alt="" loading="eager" />
          <span className="gear-item-info">
            {stylePills}
            {item.level && (
              <span className="gear-item-level">
                {item.level.skill} {item.level.level}
              </span>
            )}
            <span className="gear-item-source">{describeSource(item.source)}</span>
            {stats.length > 0 && (
              <span className="gear-item-stats">
                {stats.map((bit) => (
                  <span key={bit.type} className={`gear-stat gear-stat-${bit.type}`}>
                    {bit.text}
                  </span>
                ))}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
