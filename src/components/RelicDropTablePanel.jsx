import { useLayoutEffect, useRef, useState } from 'react';
import { getDropTableCategoryColor } from '../data/regionColors';

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
        {dropTable.theme === 'forge' ? (
          // Superheated's bespoke "forge" theme - blacksmith heat-scale
          // ingot cards instead of the generic palette-cycling bullet list
          // below. Kept as a fully separate branch (rather than layering
          // conditionals into the generic markup) so the shared path stays
          // untouched for every relic that doesn't opt into a theme.
          <div className="relic-drop-table-panel drop-table-forge-panel" ref={contentRef}>
            <div className="drop-table-forge-heading-row">
              <h3 className="relic-drop-table-heading drop-table-forge-heading">{dropTable.heading}</h3>
              <span className="drop-table-forge-spectrum" aria-hidden="true" />
            </div>
            <ul className="drop-table-forge-grid">
              {dropTable.categories.map((category) => (
                <li key={category.name} className="drop-table-forge-item" style={{ '--forge-color': category.color }}>
                  <span className="drop-table-forge-ember" aria-hidden="true" />
                  <div className="drop-table-forge-body">
                    <div className="drop-table-forge-name-row">
                      <span className="drop-table-forge-name">{category.name}</span>
                      {category.stage && <span className="drop-table-forge-stage">{category.stage}</span>}
                    </div>
                    {category.detail && <span className="drop-table-forge-detail">{category.detail}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="relic-drop-table-panel" ref={contentRef}>
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
          </div>
        )}
      </div>
    </>
  );
}
