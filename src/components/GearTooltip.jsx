import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import RegionTags from './RegionTags';
import { getArmourRating } from '../utils/gearStats';

// Hover card for an equipment slot: item name, where it comes from, and its
// stats. Deliberately does NOT show `source.detail`/`note` - those are long
// prose explanations that belong in the item list, not in a card that pops up
// while you are scanning a loadout.
//
// Portalled into document.body with fixed coordinates, for the same reason
// TagTooltip is: slots sit inside cards with `overflow: hidden` for their
// rounded corners, which would clip anything positioned relative to an
// ancestor. Horizontal position is clamped to the viewport.
//
// Hover/focus only, never tap: on touch these slots are either inert (build
// guides) or the primary tap target for picking a slot (gear planner), so
// hijacking tap would break the planner.
const CARD_WIDTH = 250;
const GAP = 10;
const MARGIN = 8;

function computePosition(rect) {
  const half = CARD_WIDTH / 2;
  const left = Math.min(Math.max(rect.left + rect.width / 2, MARGIN + half), window.innerWidth - MARGIN - half);
  const above = rect.top > 240;
  return { top: above ? rect.top - GAP : rect.bottom + GAP, left, above };
}

const ATTACK_KEYS = [
  ['stab', 'Stab'],
  ['slash', 'Slash'],
  ['crush', 'Crush'],
  ['magic', 'Magic'],
  ['ranged', 'Ranged'],
];

function StatRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="gear-tooltip-stat">
      <span>{label}</span>
      <strong>{typeof value === 'number' ? value.toLocaleString() : value}</strong>
    </div>
  );
}

// `anchorStyle`/`anchorClassName` are applied to the wrapper span. Equipment
// slots live in a CSS grid and position themselves with `gridArea`, so when
// they are wrapped the wrapper becomes the grid item and has to carry that
// style instead of the slot itself.
export default function GearTooltip({
  item,
  isUnlocked,
  style,
  selectedLeagueRelics = [],
  anchorStyle,
  anchorClassName,
  children,
}) {
  const [position, setPosition] = useState(null);
  const ref = useRef(null);

  // No item slotted - render the child bare, but keep the grid positioning.
  if (!item) {
    return (
      <span className={anchorClassName} style={anchorStyle}>
        {children}
      </span>
    );
  }

  function show() {
    if (ref.current) setPosition(computePosition(ref.current.getBoundingClientRect()));
  }
  function hide() {
    setPosition(null);
  }

  const stats = item.stats ?? {};
  const armour = getArmourRating(item, style);
  const attack = ATTACK_KEYS.map(([key, label]) => [label, stats.attack?.[key]]).filter(([, v]) => v);
  const levelText = stats.levelText ?? formatLevel(item.level);

  return (
    <span
      ref={ref}
      className={['gear-tooltip-anchor', anchorClassName].filter(Boolean).join(' ')}
      style={anchorStyle}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {position &&
        createPortal(
          <span
            className="gear-tooltip"
            role="tooltip"
            style={{
              top: position.top,
              left: position.left,
              transform: `translate(-50%, ${position.above ? '-100%' : '0'})`,
            }}
          >
            <span className="gear-tooltip-name">{item.name}</span>
            {levelText && <span className="gear-tooltip-level">{levelText}</span>}

            <span className="gear-tooltip-tags">
              <RegionTags item={item} isUnlocked={isUnlocked} selectedLeagueRelics={selectedLeagueRelics} />
            </span>

            <span className="gear-tooltip-stats">
              <StatRow label="Damage" value={stats.damage} />
              <StatRow label="Accuracy" value={stats.accuracy} />
              <StatRow label="Armour" value={armour > 0 ? Math.round(armour * 10) / 10 : 0} />
              <StatRow label="Life bonus" value={stats.lifeBonus} />
              <StatRow label="Prayer bonus" value={stats.prayerBonus} />
              {attack.map(([label, value]) => (
                <StatRow key={label} label={`${label} attack`} value={value} />
              ))}
            </span>
          </span>,
          document.body,
        )}
    </span>
  );
}

// gear.js `level` is either null, or `{ skill, level, note? }`.
function formatLevel(level) {
  if (!level?.level) return null;
  return `${level.skill ?? 'Level'} ${level.level}`;
}
