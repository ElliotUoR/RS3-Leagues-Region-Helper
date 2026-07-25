import { useEffect, useRef, useState } from 'react';

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
export default function TagTooltip({ className, tooltip, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [open]);

  if (!tooltip) {
    return <span className={className}>{children}</span>;
  }

  function toggle(e) {
    e.stopPropagation();
    e.preventDefault();
    setOpen((prev) => !prev);
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
      {open && (
        <span className="tag-tooltip-bubble" role="tooltip">
          {tooltip}
        </span>
      )}
    </span>
  );
}
