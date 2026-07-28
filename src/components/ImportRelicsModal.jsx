// Announces a completed ?import-relics= import (see utils/importRelics.js) -
// same one-shot "notice" visual language as PagesMigrationModal/
// ReportIssueUnavailableModal (.notice-* classes), not the persistent
// shared-view banner used for `?share=` links. Deliberately just an
// acknowledgement: the import has already happened (written straight to
// this visitor's real League Relics selection, and the route has already
// switched to that tab) by the time this renders - there's nothing left
// here to confirm/adopt/undo.
export default function ImportRelicsModal({ count, onClose }) {
  if (count == null) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel notice-modal" onClick={(event) => event.stopPropagation()}>
        <div className="notice-icon" aria-hidden="true">
          ✨
        </div>
        <h2>Relics imported</h2>
        <p className="notice-lede">
          {count} league relic{count === 1 ? '' : 's'} loaded into your League Relics tab.
        </p>

        <div className="notice-secondary-actions">
          <button type="button" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
