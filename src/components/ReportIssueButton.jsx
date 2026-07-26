import { useState } from 'react';
import { submitIssueReport } from '../utils/api';

const MIN_LENGTH = 10;
const MAX_LENGTH = 5000;

// Depends on the optional backend (docs/deployment.md) - on GitHub Pages,
// or before the backend is deployed, /api/report-issue simply doesn't
// exist, so submitting always fails there. That's surfaced as a normal
// inline error rather than hidden, since a visitor who bothered to write a
// report deserves to know it didn't go anywhere.
export default function ReportIssueButton() {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  function toggleOpen() {
    setOpen((prev) => !prev);
    setStatus('idle');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('sending');
    try {
      await submitIssueReport(body);
      setStatus('sent');
      setBody('');
    } catch {
      setStatus('error');
    }
  }

  const trimmedLength = body.trim().length;
  const tooShort = trimmedLength > 0 && trimmedLength < MIN_LENGTH;

  return (
    <div className="report-issue">
      <button type="button" className="report-issue-toggle" onClick={toggleOpen}>
        Report an issue
      </button>
      {open && (
        <div className="report-issue-panel">
          {status === 'sent' ? (
            <p>Thanks - your report was filed. You can close this now.</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <textarea
                value={body}
                maxLength={MAX_LENGTH}
                placeholder="What went wrong? Include what page you were on and what you expected to happen."
                onChange={(event) => setBody(event.target.value)}
                rows={4}
              />
              {tooShort && <p className="report-issue-hint">A few more details would help ({MIN_LENGTH} characters minimum).</p>}
              {status === 'error' && (
                <p className="report-issue-hint">
                  Couldn't send that just now - this feature needs the site's backend, which may not be
                  live yet.
                </p>
              )}
              <button type="submit" disabled={status === 'sending' || trimmedLength < MIN_LENGTH}>
                {status === 'sending' ? 'Sending…' : 'Submit report'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
