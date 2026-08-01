import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { reportUserBuild } from '../utils/api';

const MIN_REASON = 10;
const MAX_REASON = 1000;

// Confirm-then-explain dialog behind the Report button on a user build. Files
// a GitHub issue through the same server-held token /api/report-issue uses;
// the build's id, name and a direct link are attached server-side so a
// reporter cannot forge which build they are reporting.
//
// Two steps on purpose: "Report" is a heavier action than it looks, and asking
// for a reason both makes the report actionable and gives the reporter a
// moment to reconsider. A reason is required, not optional - an unexplained
// report is not triageable.
export default function ReportBuildModal({ build, onClose }) {
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState(null);

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const tooShort = reason.trim().length < MIN_REASON;

  async function submit(event) {
    event.preventDefault();
    if (tooShort || status === 'sending') return;
    setStatus('sending');
    setError(null);
    try {
      await reportUserBuild(build.id, reason.trim());
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Could not send that report. Try again.');
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel report-build-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Report ${build.name}`}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>

        {status === 'sent' ? (
          <>
            <h3 className="report-build-heading">Report sent</h3>
            <p className="report-build-body">
              Thanks - this has been filed and someone will look at it. The build stays visible
              until then.
            </p>
            <div className="report-build-actions">
              <button type="button" className="share-button" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <h3 className="report-build-heading">Report this build?</h3>
            <p className="report-build-body">
              You are reporting <strong>{build.name}</strong>
              {build.author_name ? ` by ${build.author_name}` : ''}. This files an issue for a human
              to look at - it does not hide the build straight away.
            </p>

            <label className="report-build-label" htmlFor="report-build-reason">
              What is wrong with it?
            </label>
            <textarea
              id="report-build-reason"
              className="report-build-textarea"
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, MAX_REASON))}
              placeholder="Spam, abusive wording, nonsense build, stolen content..."
              rows={4}
              autoFocus
            />
            <div className="report-build-meta">
              <span>{tooShort ? `At least ${MIN_REASON} characters` : ' '}</span>
              <span>
                {reason.length}/{MAX_REASON}
              </span>
            </div>

            {error && <p className="report-build-error">{error}</p>}

            <div className="report-build-actions">
              <button type="button" className="clear-loadout-button" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="share-button" disabled={tooShort || status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Send report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
