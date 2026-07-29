import { useLayoutEffect, useRef, useState } from 'react';
import { getDropTableCategoryColor } from '../data/regionColors';

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
              <span className="drop-table-alchemy-legend-label">{entry.label}</span>
              <span className="drop-table-alchemy-legend-detail">{entry.detail}</span>
            </li>
          ))}
        </ul>
      )}
      <ul className="drop-table-alchemy-categories">
        {dropTable.categories.map((category, index) => {
          const { steps, note } = parseAlchemyChain(category.detail);
          const color = getDropTableCategoryColor(category, index);
          return (
            <li key={category.name} className="drop-table-alchemy-category" style={{ '--drop-table-color': color }}>
              <div className="drop-table-alchemy-category-header">
                <span className="drop-table-alchemy-category-name">{category.name}</span>
                <span className="drop-table-alchemy-category-count">
                  {steps.length} {steps.length === 1 ? 'tier' : 'tiers'}
                </span>
              </div>
              <ol className="drop-table-alchemy-chain">
                {steps.map((step, stepIndex) => (
                  <li key={`${category.name}-${step}`} className="drop-table-alchemy-link">
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
                ))}
              </ol>
              {note && <p className="drop-table-alchemy-note">↺ {note}</p>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

// Expandable "drop table" (or, for Transmutation, resource-conversion table)
// panel attached to a League Relic row - see data/leagueRelics.js's
// `dropTable` field. Deliberately a sibling of LeagueRelicRow's whole-row
// <button> (see how it's called in that file) rather than nested inside it:
// that row button already handles relic selection on click, and a <button>
// inside a <button> is invalid HTML - the same trap TagTooltip.jsx's own
// comment calls out. Because this toggle lives outside that row button
// instead of inside it, it can safely be a real <button> (no role="button"
// span workaround needed here).
//
// The open/closed state is deliberately local-only (useState, not lifted or
// persisted) - this is a supplementary reference lookup, not something that
// needs to survive a reload or be shared with anything else on the page.
//
// Animation: a manual FLIP adapted from RegionPicker.jsx's card-list height
// animation (measure the old height, jump to it, force a reflow, then
// transition to the new height) rather than a fixed max-height guess -
// Transmutation's eventual real table is ~25 categories long, so a max-height
// collapse (as used for short content like .pick-regions-hint) would either
// clip it or leave a large empty gap depending on the guess. Because the
// panel is a normal in-flow block element (not absolutely positioned/an
// overlay), animating its own height is all that's needed for relic rows
// below it in the list to smoothly reflow downward too - that's just normal
// document flow, no extra work required for that part.
export default function RelicDropTablePanel({ dropTable }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const contentRef = useRef(null);
  const isFirstRender = useRef(true);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return undefined;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      // No animation on mount - just settle into the correct static state
      // (always closed on first render, since `open` starts false).
      wrapper.style.height = open ? 'auto' : '0px';
      wrapper.style.overflow = 'hidden';
      return undefined;
    }

    // Measure the height as currently rendered (before this effect mutates
    // anything) - if we were open, that's an 'auto' height resolving to the
    // content's actual box; if closed, it's already 0.
    const startHeight = wrapper.getBoundingClientRect().height;
    const targetHeight = open ? content.scrollHeight : 0;

    wrapper.style.height = `${startHeight}px`;
    wrapper.style.overflow = 'hidden';
    // Reading offsetHeight (assigned to nothing on purpose) forces the
    // browser to flush the height change above before continuing, so the
    // transition below animates from that value instead of skipping it.
    // eslint-disable-next-line no-unused-expressions
    wrapper.offsetHeight;
    wrapper.style.transition = 'height 0.3s ease';
    wrapper.style.height = `${targetHeight}px`;

    const onEnd = (event) => {
      if (event.propertyName !== 'height') return;
      wrapper.style.transition = '';
      wrapper.style.height = open ? 'auto' : '0px';
      wrapper.removeEventListener('transitionend', onEnd);
    };
    wrapper.addEventListener('transitionend', onEnd);
    return () => wrapper.removeEventListener('transitionend', onEnd);
  }, [open]);

  if (!dropTable) return null;

  return (
    <>
      <button
        type="button"
        className="relic-drop-table-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        {open ? 'Hide' : 'See'} {dropTable.footerText} {open ? '↑' : '→'}
      </button>
      <div className="relic-drop-table-wrapper" ref={wrapperRef}>
        <div className="relic-drop-table-panel" ref={contentRef}>
          <h3 className="relic-drop-table-heading">{dropTable.heading}</h3>
          {dropTable.theme === 'alchemy' ? (
            <AlchemyChainCategories dropTable={dropTable} />
          ) : (
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
          )}
        </div>
      </div>
    </>
  );
}
