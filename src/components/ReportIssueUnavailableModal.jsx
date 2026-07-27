import { LIVE_SITE_URL } from '../utils/deployTarget';

// Shown instead of the real ReportIssueModal on the GitHub Pages build,
// which has no backend to file a report against. Same "only works on the
// live site" visual language as PagesMigrationModal (.notice-* classes).
export default function ReportIssueUnavailableModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel notice-modal" onClick={(event) => event.stopPropagation()}>
        <div className="notice-icon" aria-hidden="true">
          🔌
        </div>
        <h2>Report an issue</h2>
        <p className="notice-lede">
          Issue reporting needs this site's backend, which only runs on the live version at{' '}
          <a className="notice-link" href={LIVE_SITE_URL}>
            {LIVE_SITE_URL}
          </a>
          .
        </p>

        <a className="notice-primary-button" href={LIVE_SITE_URL}>
          Visit new site →
        </a>

        <div className="notice-secondary-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
