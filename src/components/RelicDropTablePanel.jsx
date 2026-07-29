import { useLayoutEffect, useRef, useState } from 'react';
import { getDropTableCategoryColor } from '../data/regionColors';

// Golden Touch's bespoke "Heist Ledger" rendering (dropTable.theme ===
// 'heist') - a treasure/heist-themed alternative to the generic palette-
// cycled <ul> below, kept as its own component so the generic path (used by
// Superheated/Transmutation and any future themeless relic) stays completely
// untouched. See src/data/leagueRelics.js's Golden Touch dropTable comment
// for what `rank`/`metal`/`clearance` mean.
//
// The clearance meter is deliberately two labelled segments (HEIST / STREET)
// rather than reusing the plain text badge alone: lighting up exactly the
// segment(s) that apply reads at a glance, without having to parse "Heist +
// Outside" vs "Heist only" as text first. The original `badge` text is still
// printed underneath (as "Access: <badge>") so the underlying game info is
// never conveyed by color/icon alone.
function HeistDropTable({ dropTable }) {
  return (
    <div className="drop-table-heist-panel">
      <div className="drop-table-heist-header">
        <span className="drop-table-heist-header-icon" aria-hidden="true">💰</span>
        <div className="drop-table-heist-header-text">
          <span className="drop-table-heist-eyebrow">Heist Crew Ledger</span>
          <h3 className="drop-table-heist-heading">{dropTable.heading}</h3>
        </div>
      </div>
      <ol className="drop-table-heist-list">
        {dropTable.categories.map((category, index) => {
          const clearance = category.clearance || 'both';
          const heistLit = clearance === 'heist' || clearance === 'both';
          const streetLit = clearance === 'outside' || clearance === 'both';
          return (
            <li
              key={category.name}
              className={`drop-table-heist-entry drop-table-heist-metal-${category.metal || 'gold'}`}
            >
              <div className="drop-table-heist-rank" aria-hidden="true">
                {category.rank || index + 1}
              </div>
              <div className="drop-table-heist-entry-body">
                <div className="drop-table-heist-entry-top">
                  <span className="drop-table-heist-name">{category.name}</span>
                  <div className="drop-table-heist-clearance">
                    <span
                      className={`drop-table-heist-clearance-seg ${heistLit ? 'is-lit' : 'is-locked'}`}
                    >
                      {!heistLit && <span aria-hidden="true">🔒</span>}
                      Heist
                    </span>
                    <span
                      className={`drop-table-heist-clearance-seg ${streetLit ? 'is-lit' : 'is-locked'}`}
                    >
                      {!streetLit && <span aria-hidden="true">🔒</span>}
                      Street
                    </span>
                  </div>
                </div>
                {category.badge && (
                  <span className="drop-table-heist-badge-caption">Access: {category.badge}</span>
                )}
                {category.detail && <p className="drop-table-heist-detail">{category.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="drop-table-heist-legend">
        <span className="drop-table-heist-legend-key">Heist</span> = inside the Heist minigame only ·{' '}
        <span className="drop-table-heist-legend-key">Street</span> = normal open-world pickpocketing too
      </p>
    </div>
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

  // Each themed relic gets its own bespoke rendering (kept as sibling
  // branches here, or as a dedicated component like HeistDropTable above,
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
      </>
    );
  } else if (dropTable.theme === 'heist') {
    panelContent = <HeistDropTable dropTable={dropTable} />;
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
        <div
          className={`relic-drop-table-panel${dropTable.theme === 'forge' ? ' drop-table-forge-panel' : ''}`}
          ref={contentRef}
        >
          {panelContent}
        </div>
      </div>
    </>
  );
}
