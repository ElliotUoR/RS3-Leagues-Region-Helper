import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// A tag-style span whose extra info is normally only reachable via the
// native `title` hover tooltip - which touch devices can't trigger at all.
// Tapping toggles a small floating bubble showing the same text, dismissed
// by tapping anywhere else on the page. The native `title` is kept too, so
// mouse users still get the familiar instant hover tooltip - the tap
// behaviour is purely additive.
//
// Renders as a <span role="button"> rather than a real <button>: these tags
// commonly sit inside another clickable element (e.g. GearItemRow's
// whole-row <button>), and a nested <button> is invalid HTML - browsers
// silently break click/tap handling on it instead of throwing.
//
// The bubble itself is rendered via a portal straight into document.body,
// positioned with `fixed` coordinates computed from the anchor's own
// bounding rect - not CSS-anchored to the tag. Tags routinely sit inside a
// card with `overflow: hidden` (for its rounded corners), which would clip
// any bubble positioned relative to an ancestor inside that card; a portal
// sidesteps that entirely, and the horizontal position is clamped to the
// viewport so it doesn't spill off-screen on narrow cards near an edge.
const BUBBLE_MAX_WIDTH = 220;
const BUBBLE_GAP = 8;
const VIEWPORT_MARGIN = 8;

function computeBubblePosition(anchorRect) {
  const halfWidth = BUBBLE_MAX_WIDTH / 2;
  const min = VIEWPORT_MARGIN + halfWidth;
  const max = window.innerWidth - VIEWPORT_MARGIN - halfWidth;
  const left = Math.min(Math.max(anchorRect.left + anchorRect.width / 2, min), max);
  // Prefer above the tag; flip below if there isn't enough room above.
  const above = anchorRect.top > 60;
  const top = above ? anchorRect.top - BUBBLE_GAP : anchorRect.bottom + BUBBLE_GAP;
  return { top, left, above };
}

export default function TagTooltip({ className, tooltip, children }) {
  const [position, setPosition] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!position) return undefined;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setPosition(null);
    }
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [position]);

  if (!tooltip) {
    return <span className={className}>{children}</span>;
  }

  function toggle(e) {
    e.stopPropagation();
    e.preventDefault();
    setPosition((prev) => {
      if (prev) return null;
      return ref.current ? computeBubblePosition(ref.current.getBoundingClientRect()) : null;
    });
  }

  return (
    <span
      ref={ref}
      role="button"
      tabIndex={0}
      className={`tag-tooltip-anchor ${className}`}
      title={tooltip}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') toggle(e);
      }}
    >
      {children}
      {position &&
        createPortal(
          <span
            className="tag-tooltip-bubble"
            role="tooltip"
            style={{
              top: position.top,
              left: position.left,
              transform: `translate(-50%, ${position.above ? '-100%' : '0'})`,
            }}
          >
            {tooltip}
          </span>,
          document.body,
        )}
    </span>
  );
}
