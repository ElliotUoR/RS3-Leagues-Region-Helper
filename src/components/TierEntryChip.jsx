import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TierChipContent } from './tierChip';
import { tierChipClassName, tierChipStyle } from '../utils/tierChipStyles';

// A tier list chip that shows the entry's compact description on hover or
// click - used by the tier list maker and by a shared list.
//
// Modelled on the gear planner's compact-mode tooltip (see GearItemRow): the
// bubble tracks the cursor and is rendered through a PORTAL, because these
// chips sit inside rows with rounded corners and overflow that would clip
// anything positioned relative to an ancestor.
//
// Hover AND click, not one or the other. Hover is what a mouse expects; click
// is the only thing a touch device can do, and it also pins the bubble so it
// can be read without holding the pointer still. A drag never opens it - a
// browser fires no click after a completed drag - so picking a chip up and
// dropping it elsewhere stays silent, which is the whole point of "clicking
// (not dragging)".
const TOOLTIP_MAX_WIDTH = 300;
const VIEWPORT_MARGIN = 8;
const CURSOR_GAP = 14;

function positionFor(clientX, clientY) {
  const half = TOOLTIP_MAX_WIDTH / 2;
  const left = Math.min(Math.max(clientX, VIEWPORT_MARGIN + half), window.innerWidth - VIEWPORT_MARGIN - half);
  // Prefer above the cursor; flip below when there is no room, so a chip in
  // the top row does not push its own description off the top of the screen.
  const above = clientY > 160;
  return { top: above ? clientY - CURSOR_GAP : clientY + CURSOR_GAP, left, above };
}

export default function TierEntryChip({ entry, renderBadges, draggable = false, onDragStart, title }) {
  const [pos, setPos] = useState(null);
  const [pinned, setPinned] = useState(false);
  const ref = useRef(null);
  const lines = entry.description ?? [];
  const hasInfo = lines.length > 0;

  // A pinned bubble is dismissed by tapping anywhere else, the same way
  // TagTooltip's is - otherwise a touch user has no way to close it.
  useEffect(() => {
    if (!pinned) return undefined;
    function onOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setPinned(false);
        setPos(null);
      }
    }
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [pinned]);

  function hide() {
    setPinned(false);
    setPos(null);
  }

  return (
    <span
      ref={ref}
      className={tierChipClassName(entry, { draggable, dirty: entry.dirty })}
      style={tierChipStyle(entry)}
      draggable={draggable || undefined}
      onDragStart={onDragStart}
      // Picking the chip up must not leave a bubble hanging over the page for
      // the rest of the drag.
      onDragStartCapture={hide}
      onMouseMove={(event) => {
        if (hasInfo && !pinned) setPos(positionFor(event.clientX, event.clientY));
      }}
      onMouseLeave={() => {
        if (!pinned) setPos(null);
      }}
      onClick={(event) => {
        if (!hasInfo) return;
        if (pinned) hide();
        else {
          setPos(positionFor(event.clientX, event.clientY));
          setPinned(true);
        }
      }}
      title={title}
    >
      <TierChipContent entry={entry} renderBadges={renderBadges} />
      {pos &&
        createPortal(
          <div
            className={`tier-chip-tooltip${pinned ? ' pinned' : ''}`}
            role="tooltip"
            style={{
              top: pos.top,
              left: pos.left,
              transform: `translate(-50%, ${pos.above ? '-100%' : '0'})`,
            }}
          >
            <span className="tier-chip-tooltip-name">{entry.name}</span>
            <ul className="tier-chip-tooltip-points">
              {lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </span>
  );
}
