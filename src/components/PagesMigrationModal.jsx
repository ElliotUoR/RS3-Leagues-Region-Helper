import { useState } from 'react';
import { LIVE_SITE_URL } from '../utils/deployTarget';

// Only ever rendered on the GitHub Pages build (see App.jsx) - shown once
// per browser unless dismissed with "don't ask again" (localStorage,
// PAGES_MIGRATION_DISMISSED_KEY). "Continue on old site" closes it for this
// visit only; it'll show again next time.
export default function PagesMigrationModal({ open, onDismiss }) {
  const [showWhy, setShowWhy] = useState(false);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={() => onDismiss(false)}>
      <div className="modal-panel notice-modal" onClick={(event) => event.stopPropagation()}>
        <div className="notice-icon" aria-hidden="true">
          🪼
        </div>
        <h2>This site has migrated</h2>
        <p className="notice-lede">
          This site has migrated to{' '}
          <a className="notice-link" href={LIVE_SITE_URL}>
            {LIVE_SITE_URL}
          </a>
          .
        </p>

        <button type="button" className="migration-why-toggle" onClick={() => setShowWhy((prev) => !prev)}>
          Why the move? <span className={`migration-why-chevron${showWhy ? ' open' : ''}`}>⌄</span>
        </button>
        {showWhy && (
          <p className="migration-why-body">
            The live version has issue tracking and shortened export links, with more features
            planned - this static GitHub Pages copy can't support those since it has no backend
            of its own.
          </p>
        )}

        <a className="notice-primary-button" href={LIVE_SITE_URL}>
          Visit new site →
        </a>

        <div className="notice-secondary-actions">
          <button type="button" onClick={() => onDismiss(false)}>
            Continue on old site
          </button>
          <span className="notice-dot">·</span>
          <button type="button" onClick={() => onDismiss(true)}>
            Don't ask again
          </button>
        </div>
      </div>
    </div>
  );
}
