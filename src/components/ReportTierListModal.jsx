import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { reportTierList } from '../utils/api';

// Confirm-then-explain dialog behind the Report button on a shared tier list.
// Files a GitHub issue with the code and link attached server-side - the
// reporter only supplies the reason, exactly like ReportBuildModal.
const MIN_REASON = 10;

export default function ReportTierListModal({ type, code, onClose }) {
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (reason.trim().length < MIN_REASON) return;
    setStatus('sending');
    setError(null);
    try {
      await reportTierList(type, code, reason.trim());
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel report-build-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Report this tier list</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        {status === 'sent' ? (
          <>
            <p>Thanks - that&apos;s been passed on for a human to look at.</p>
            <div className="tier-note-modal-actions">
              <button type="button" className="tier-customise-save" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="tier-note-modal-hint">
              You are reporting <code>{code}</code>. This files an issue for a human to review - it does not
              take the list down automatically.
            </p>
            <textarea
              className="tier-note-modal-input"
              rows={5}
              value={reason}
              autoFocus
              placeholder="What's wrong with it?"
              onChange={(event) => setReason(event.target.value)}
            />
            {status === 'error' && <p className="tier-customise-error">Couldn&apos;t send that: {error}</p>}
            <div className="tier-note-modal-actions">
              <button type="button" className="tier-customise-cancel" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="tier-customise-save"
                disabled={status === 'sending' || reason.trim().length < MIN_REASON}
              >
                {status === 'sending' ? 'Sending…' : 'Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
