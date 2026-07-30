import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getDropTableCategoryColor } from '../data/regionColors';
import { trackUsage } from '../utils/api';

// Per-item stagger delay for AlchemyCategoryCard's expand/collapse animation,
// scaled down as chain length grows so the whole sequence always finishes
// well under 1 second even for a 27-step chain (Raw fish) - see that
// component below for how these are used.
const ALCHEMY_MAX_STAGGER_MS = 28;
const ALCHEMY_STAGGER_BUDGET_MS = 650;
const ALCHEMY_ITEM_TRANSITION_MS = 180;

// AlchemyCategoryCard's border-grow/shrink duration - deliberately different
// per trigger: a hover has to feel like a considered "hold to confirm" (per
// the original brief), but a click is an explicit, unambiguous action that
// should respond almost immediately. Both still play the same 4-segment
// clockwise border animation (see index.css's --alchemy-seg custom property,
// set inline per-interaction below), just at very different speeds.
const ALCHEMY_HOVER_BORDER_MS = 600;
const ALCHEMY_CLICK_BORDER_MS = 100;
const ALCHEMY_BORDER_SEGMENTS = 4;
// Only hover-out uses this - the wait *before* a fully-opened card even
// starts closing, giving a quick pass back over it a chance to cancel.
const ALCHEMY_LEAVE_GRACE_MS = 300;

// Golden Touch's bespoke "Herblore Ledger" rendering (dropTable.theme ===
// 'herblore') - kept as its own component so the generic path (used by
// Superheated/Transmutation and any future themeless relic) stays completely
// untouched. See src/data/leagueRelics.js's Golden Touch dropTable comment
// for what `icon`/`clearance` mean - the dark-green-to-black tint per line
// is assigned positionally by index.css (nth-child), not read from data.
//
// The clearance meter is deliberately two labelled segments (HEIST / OUT)
// rather than reusing the plain text badge alone: lighting up exactly the
// segment(s) that apply reads at a glance, without having to parse "Heist +
// Outside" vs "Heist only" as text first. The original `badge` text is still
// printed underneath (as "Access: <badge>") so the underlying game info is
// never conveyed by color/icon alone.
function HerbloreDropTable({ dropTable }) {
  return (
    <div className="drop-table-herblore-panel">
      <div className="drop-table-herblore-header">
        {dropTable.icon && <img className="drop-table-herblore-header-icon" src={dropTable.icon} alt="" />}
        <h3 className="drop-table-herblore-heading">{dropTable.heading}</h3>
      </div>
      <ol className="drop-table-herblore-list">
        {dropTable.categories.map((category) => {
          const clearance = category.clearance || 'both';
          const heistLit = clearance === 'heist' || clearance === 'both';
          const outLit = clearance === 'outside' || clearance === 'both';
          return (
            <li key={category.name} className="drop-table-herblore-entry">
              <div className="drop-table-herblore-rank">
                {category.icon && <img src={category.icon} alt="" />}
              </div>
              <div className="drop-table-herblore-entry-body">
                <div className="drop-table-herblore-entry-top">
                  <span className="drop-table-herblore-name">{category.name}</span>
                  <div className="drop-table-herblore-clearance">
                    <span className={`drop-table-herblore-clearance-seg ${heistLit ? 'is-lit' : 'is-locked'}`}>
                      Heist
                    </span>
                    <span className={`drop-table-herblore-clearance-seg ${outLit ? 'is-lit' : 'is-locked'}`}>
                      Out
                    </span>
                  </div>
                </div>
                {category.badge && (
                  <span className="drop-table-herblore-badge-caption">Access: {category.badge}</span>
                )}
                {category.detail && <p className="drop-table-herblore-detail">{category.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="drop-table-herblore-legend">
        <span className="drop-table-herblore-legend-key">Heist</span> = inside the Heist minigame only ·{' '}
        <span className="drop-table-herblore-legend-key">Out</span> = normal open-world pickpocketing too
      </p>
    </div>
  );
}

// Splits a Transmutation category's chain text (e.g. 'Copper ore → Tin ore →
// ... → Primal ore (then cycles)') into its ordered tier steps. A trailing
// parenthetical (only the Ores chain has one, noting it loops back to Copper
// ore) is pulled out as a separate annotation instead of being left stuck
// inside the last step's pill text.
function parseAlchemyChain(detail) {
  const rawSteps = detail.split(' → ').map((step) => step.trim());
  const lastIndex = rawSteps.length - 1;
  const cycleMatch = rawSteps[lastIndex]?.match(/^(.*)\s\((.+)\)$/);
  if (cycleMatch) {
    rawSteps[lastIndex] = cycleMatch[1];
    return { steps: rawSteps, note: cycleMatch[2] };
  }
  return { steps: rawSteps, note: null };
}

// Transmutation's tables (see dropTable.theme === 'alchemy' in
// data/leagueRelics.js) are tier progressions - Divine Convergence/Divergence
// step a resource one tier down/up a fixed chain - not drop-chance
// categories, so a flat "name: sentence" row (the generic rendering below)
// would read as a wall of text for a 27-step chain like Raw fish. Instead
// each category renders as its own card with the chain broken into
// individually-styled tier pills connected by arrows, so both a 2-step chain
// (Gems) and a 27-step one stay scannable. Each pill's fill/border/text
// color is interpolated (via the --node-progress custom property, consumed
// in index.css) from pale/dashed at the chain's base end to a saturated,
// glowing fill at its most-refined end, echoing the alchemical
// "raw material -> refined material" idea the relic's effect is built on.
// One category's chain, in either "shrunk" (start/end item only) or
// "expanded" (every tier) form - shrunk is the default. Expanding isn't
// instant: it needs a deliberate hover-and-hold (or a click) first, signalled
// by a border that visibly grows clockwise around the card over
// ALCHEMY_BORDER_GROW_MS (1.5s) - only once that border has fully drawn does
// the content actually expand. This is deliberately slower/more considered
// than a plain instant-on-hover response, per the brief: a quick mouse pass
// over the list shouldn't trigger anything.
//
//   - hover alone (no click) - mouse-enter starts the border growing
//     immediately; mouse-leave (before it locks in) reverses that with the
//     same animation. Once fully open, leaving starts a distinct sequence:
//     wait ALCHEMY_LEAVE_GRACE_MS (1.5s) with nothing changing yet, then the
//     border animates shut, and only once *that* finishes does the content
//     actually collapse - re-entering at any point before it's fully closed
//     cancels the close and reopens instead.
//   - a click locks it open (border stays fully drawn, content stays
//     expanded) regardless of the mouse - a second click closes it, playing
//     the same border-closing animation immediately (no grace wait, since a
//     click is an unambiguous close request) before the content collapses.
//
// `borderActive` drives the CSS border (see .drop-table-alchemy-category-
// border in index.css) - a pure class toggle, so the 4-segment clockwise-
// growing border animates itself via CSS transitions with no JS beyond that.
// `expanded` is a separate, deliberately-delayed piece of state that only
// flips once the relevant border animation has had time to finish (tracked
// with plain setTimeout, not tied to transitionend, since the border is 4
// independently-delayed segments rather than one element).
//
// `renderAll` is a further-lagging piece of state: middle tiers stay mounted
// in the DOM for `totalDuration` after collapsing starts (so their own exit
// animation can play) before finally being removed - without this they'd
// just vanish instantly.
//
// Tier animation: middle tiers mount/unmount from the DOM (only the first/
// last are always present), so entering ones use the `@starting-style`
// at-rule (see index.css) to animate in from a collapsed state the instant
// they're inserted, and leaving ones get an `.is-collapsed` class added
// first (while still mounted) so a normal CSS transition plays before
// they're removed. Each tier's `transitionDelay` is staggered by its
// position - left-to-right order when expanding, right-to-left when
// collapsing - scaled down for long chains (see the ALCHEMY_* constants
// above) so that sequence alone always finishes in well under 1 second
// regardless of chain length (on top of, not instead of, the 1.5s border
// hold before it even starts).
//
// The chain's own wrapper height is FLIP-animated (see the useLayoutEffect
// below) using a simpler variant of the technique this codebase already uses
// elsewhere (RegionPicker.jsx, and this file's own toggle button): rather
// than measuring the DOM immediately before mutating it (React has already
// committed the new render by the time an effect can run), a ref just
// remembers the previously-measured height across renders to compare
// against. Because the card itself and its siblings are normal in-flow flex
// children, animating just this wrapper's height is all that's needed for
// the card to visibly grow/shrink and for every card below it in the list
// to smoothly reflow out of the way too - that's just normal document flow.
function AlchemyCategoryCard({ category, index }) {
  const { steps, note } = parseAlchemyChain(category.detail);
  const color = getDropTableCategoryColor(category, index);
  const stagger = Math.min(ALCHEMY_MAX_STAGGER_MS, ALCHEMY_STAGGER_BUDGET_MS / Math.max(steps.length, 1));
  const totalDuration = (steps.length - 1) * stagger + ALCHEMY_ITEM_TRANSITION_MS;

  const [locked, setLocked] = useState(false);
  const [borderActive, setBorderActive] = useState(false);
  const [borderSegmentMs, setBorderSegmentMs] = useState(ALCHEMY_HOVER_BORDER_MS / ALCHEMY_BORDER_SEGMENTS);
  const [expanded, setExpanded] = useState(false);
  const [renderAll, setRenderAll] = useState(false);
  const growTimerRef = useRef(null);
  const leaveGraceTimerRef = useRef(null);
  const shrinkTimerRef = useRef(null);
  const collapseTimerRef = useRef(null);
  const wrapperRef = useRef(null);
  const prevHeightRef = useRef(null);

  function clearCloseTimers() {
    if (leaveGraceTimerRef.current) {
      clearTimeout(leaveGraceTimerRef.current);
      leaveGraceTimerRef.current = null;
    }
    if (shrinkTimerRef.current) {
      clearTimeout(shrinkTimerRef.current);
      shrinkTimerRef.current = null;
    }
  }

  // `durationMs` is the TOTAL border animation time (ALCHEMY_HOVER_BORDER_MS
  // for a hover, ALCHEMY_CLICK_BORDER_MS for a click) - split evenly across
  // the 4 segments via the --alchemy-seg custom property (see index.css), so
  // content only actually expands once that full animation has played.
  function startOpening(durationMs) {
    if (growTimerRef.current) {
      clearTimeout(growTimerRef.current);
      growTimerRef.current = null;
    }
    clearCloseTimers();
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    setBorderSegmentMs(durationMs / ALCHEMY_BORDER_SEGMENTS);
    setBorderActive(true);
    growTimerRef.current = setTimeout(() => {
      growTimerRef.current = null;
      setExpanded(true);
      setRenderAll(true);
    }, durationMs);
  }

  // `withGrace` - true for a plain mouse-leave (waits ALCHEMY_LEAVE_GRACE_MS
  // before the border even starts closing, giving a quick pass back over the
  // card a chance to cancel this first), false for an explicit click-to-close
  // (starts closing immediately - the user has already unambiguously said
  // they're done with it).
  function startClosing(durationMs, withGrace) {
    if (growTimerRef.current) {
      clearTimeout(growTimerRef.current);
      growTimerRef.current = null;
    }
    clearCloseTimers();
    const beginShrink = () => {
      leaveGraceTimerRef.current = null;
      setBorderSegmentMs(durationMs / ALCHEMY_BORDER_SEGMENTS);
      setBorderActive(false);
      shrinkTimerRef.current = setTimeout(() => {
        shrinkTimerRef.current = null;
        setExpanded(false);
      }, durationMs);
    };
    if (withGrace) {
      leaveGraceTimerRef.current = setTimeout(beginShrink, ALCHEMY_LEAVE_GRACE_MS);
    } else {
      beginShrink();
    }
  }

  // Every pending timer gets cancelled on unmount (e.g. the modal closing
  // mid-animation) so none of them fire a setState after the component's
  // gone.
  useEffect(() => {
    return () => {
      [growTimerRef, leaveGraceTimerRef, shrinkTimerRef, collapseTimerRef].forEach((ref) => {
        if (ref.current) clearTimeout(ref.current);
      });
    };
  }, []);

  useEffect(() => {
    if (expanded || !renderAll) return undefined;
    collapseTimerRef.current = setTimeout(() => {
      setRenderAll(false);
      collapseTimerRef.current = null;
    }, totalDuration);
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const newHeight = wrapper.scrollHeight;
    if (prevHeightRef.current !== null && prevHeightRef.current !== newHeight) {
      wrapper.style.height = `${prevHeightRef.current}px`;
      wrapper.style.overflow = 'hidden';
      // eslint-disable-next-line no-unused-expressions
      wrapper.offsetHeight;
      wrapper.style.transition = `height ${totalDuration}ms ease`;
      wrapper.style.height = `${newHeight}px`;
      const onEnd = (event) => {
        if (event.propertyName !== 'height') return;
        wrapper.style.transition = '';
        wrapper.style.height = 'auto';
        wrapper.style.overflow = '';
        wrapper.removeEventListener('transitionend', onEnd);
      };
      wrapper.addEventListener('transitionend', onEnd);
    }
    prevHeightRef.current = newHeight;
  }, [renderAll, totalDuration]);

  return (
    <li
      className="drop-table-alchemy-category"
      style={{ '--drop-table-color': color }}
      onMouseEnter={() => {
        if (locked) return;
        startOpening(ALCHEMY_HOVER_BORDER_MS);
      }}
      onMouseLeave={() => {
        if (locked) return;
        // Only a genuinely already-open card gets the brief "are you sure"
        // grace pause before closing - a mouse that leaves while the border
        // is still mid-grow (never actually finished opening) cancels
        // immediately instead, so a quick pass over the list doesn't take
        // any extra time just to recognise it already left.
        startClosing(ALCHEMY_HOVER_BORDER_MS, expanded);
      }}
      onClick={() =>
        setLocked((prev) => {
          const next = !prev;
          if (next) {
            // Always (re)start at click speed, even if a slower hover-driven
            // grow is already under way - a click is an explicit action and
            // should override that in-progress hover animation rather than
            // just letting it finish out at the slower pace.
            startOpening(ALCHEMY_CLICK_BORDER_MS);
          } else {
            startClosing(ALCHEMY_CLICK_BORDER_MS, false);
          }
          return next;
        })
      }
    >
      <span
        className={`drop-table-alchemy-category-border${borderActive ? ' is-active' : ''}`}
        style={{ '--alchemy-seg': `${borderSegmentMs}ms` }}
        aria-hidden="true"
      >
        <span className="drop-table-alchemy-border-top" />
        <span className="drop-table-alchemy-border-right" />
        <span className="drop-table-alchemy-border-bottom" />
        <span className="drop-table-alchemy-border-left" />
      </span>
      <div className="drop-table-alchemy-category-header">
        <span className="drop-table-alchemy-category-title">
          {category.icon && <img className="drop-table-alchemy-category-icon" src={category.icon} alt="" />}
          <span className="drop-table-alchemy-category-name">{category.name}</span>
        </span>
        <span className="drop-table-alchemy-category-count">
          {steps.length} {steps.length === 1 ? 'tier' : 'tiers'}
        </span>
      </div>
      <div className="drop-table-alchemy-chain-wrapper" ref={wrapperRef}>
        <ol className="drop-table-alchemy-chain">
          {steps.map((step, stepIndex) => {
            const isEdge = stepIndex === 0 || stepIndex === steps.length - 1;
            if (!isEdge && !renderAll) return null;
            const collapsing = !isEdge && !expanded;
            const order = expanded ? stepIndex : steps.length - 1 - stepIndex;
            return (
              <li
                key={`${category.name}-${step}`}
                className={`drop-table-alchemy-link${collapsing ? ' is-collapsed' : ''}`}
                style={{ transitionDelay: `${order * stagger}ms` }}
              >
                {stepIndex > 0 && (
                  <span className="drop-table-alchemy-arrow" aria-hidden="true">
                    →
                  </span>
                )}
                <span
                  className="drop-table-alchemy-node"
                  style={{ '--node-progress': steps.length > 1 ? stepIndex / (steps.length - 1) : 0 }}
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {note && <p className="drop-table-alchemy-note">↺ {note}</p>}
    </li>
  );
}

function AlchemyChainCategories({ dropTable }) {
  return (
    <>
      {dropTable.legend && (
        <ul className="drop-table-alchemy-legend">
          {dropTable.legend.map((entry) => (
            <li
              key={entry.label}
              className={`drop-table-alchemy-legend-item drop-table-alchemy-legend-${entry.direction}`}
            >
              <span className="drop-table-alchemy-legend-arrow" aria-hidden="true">
                {entry.direction === 'up' ? '↑' : '↓'}
              </span>
              {entry.icon && <img className="drop-table-alchemy-legend-icon" src={entry.icon} alt="" />}
              <span className="drop-table-alchemy-legend-label">{entry.label}</span>
              <span className="drop-table-alchemy-legend-detail">{entry.detail}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="drop-table-alchemy-hint">Click to expand transmutations for item categories.</p>
      <ul className="drop-table-alchemy-categories">
        {dropTable.categories.map((category, index) => (
          <AlchemyCategoryCard key={category.name} category={category} index={index} />
        ))}
      </ul>
    </>
  );
}

// Full-screen "drop table" (or, for Transmutation, resource-conversion
// table) modal attached to a League Relic row - see data/leagueRelics.js's
// `dropTable` field. The toggle button is deliberately a sibling of
// LeagueRelicRow's whole-row <button> (see how it's called in that file)
// rather than nested inside it: that row button already handles relic
// selection on click, and a <button> inside a <button> is invalid HTML - the
// same trap TagTooltip.jsx's own comment calls out.
//
// Renders via createPortal to document.body (same escape-the-clipped-
// ancestor approach GearItemRow.jsx's stats tooltip uses) rather than inline
// where the toggle button lives, since that button sits inside
// .gear-item-row's `overflow: hidden` (needed for its rounded corners) - a
// portal sidesteps having to reason about whether that clipping (or a
// transform on some ancestor) would break a plain position:fixed overlay.
// Reuses the site's shared .modal-overlay/.modal-panel pattern (see
// ReportIssueModal.jsx) rather than a bespoke one, so it looks/behaves like
// every other modal on the site (dim backdrop, click-outside-to-close, body
// scroll lock while open) - just wider, since these tables (Transmutation's
// especially, ~25 categories) need more room than a settings form does.
//
// The open/closed state is deliberately local-only (useState, not lifted or
// persisted) - this is a supplementary reference lookup, not something that
// needs to survive a reload or be shared with anything else on the page.
//
// `relicName` is only used for the trackUsage() call below ("relic_drop_table"
// usage counter, keyed by relic name - see deploy/migrations/009_relic_drop_table_usage.sql
// and the admin dashboard's "Drop table views" panel) - tracked here, in the
// one component every relic's drop table toggle already goes through,
// rather than in each caller, so a future relic with a dropTable is counted
// individually with no extra wiring.
export default function RelicDropTablePanel({ dropTable, relicName }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!dropTable) return null;

  // Each themed relic gets its own bespoke rendering (kept as sibling
  // branches here, or as a dedicated component like HerbloreDropTable above,
  // rather than layering conditionals into the generic markup) so the
  // shared/generic path below stays completely untouched for any relic that
  // doesn't opt into a theme.
  let panelContent;
  if (dropTable.theme === 'forge') {
    panelContent = (
      <>
        <div className="drop-table-forge-heading-row">
          <h3 className="relic-drop-table-heading drop-table-forge-heading">{dropTable.heading}</h3>
          <span className="drop-table-forge-spectrum" aria-hidden="true" />
        </div>
        <ul className="drop-table-forge-grid">
          {dropTable.categories.map((category) => (
            <li key={category.name} className="drop-table-forge-item" style={{ '--forge-color': category.color }}>
              <span className="drop-table-forge-ember">
                {category.icon && <img src={category.icon} alt="" />}
              </span>
              <div className="drop-table-forge-body">
                <div className="drop-table-forge-name-row">
                  <span className="drop-table-forge-name">{category.name}</span>
                </div>
                {category.detail && <span className="drop-table-forge-detail">{category.detail}</span>}
              </div>
            </li>
          ))}
        </ul>
      </>
    );
  } else if (dropTable.theme === 'herblore') {
    panelContent = <HerbloreDropTable dropTable={dropTable} />;
  } else if (dropTable.theme === 'alchemy') {
    panelContent = (
      <>
        <h3 className="relic-drop-table-heading">{dropTable.heading}</h3>
        <AlchemyChainCategories dropTable={dropTable} />
      </>
    );
  } else {
    panelContent = (
      <>
        <h3 className="relic-drop-table-heading">{dropTable.heading}</h3>
        <ul className="relic-drop-table-categories">
          {dropTable.categories.map((category, index) => (
            <li
              key={category.name}
              className="relic-drop-table-category"
              style={{ '--drop-table-color': getDropTableCategoryColor(category, index) }}
            >
              <span className="relic-drop-table-category-name">{category.name}</span>
              {category.badge && <span className="relic-drop-table-badge">{category.badge}</span>}
              {category.detail && <span className="relic-drop-table-category-detail">{category.detail}</span>}
            </li>
          ))}
        </ul>
      </>
    );
  }

  function handleOpen() {
    setOpen(true);
    // Only fires once the panel is actually opened, not on close/outside-
    // click/Escape - "was this drop table looked at" is the question, and a
    // close action isn't a second look.
    if (relicName) trackUsage([{ category: 'relic_drop_table', key: relicName }]);
  }

  return (
    <>
      <button type="button" className="relic-drop-table-toggle" onClick={handleOpen}>
        See {dropTable.footerText}
      </button>
      {open &&
        createPortal(
          <div className="modal-overlay" onClick={() => setOpen(false)}>
            <div
              className={`modal-panel relic-drop-table-modal${dropTable.theme === 'forge' ? ' drop-table-forge-panel' : ''}`}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="modal-close relic-drop-table-modal-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                &times;
              </button>
              {panelContent}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
