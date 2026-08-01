import { submitIssueReport } from './api';

// Files an issue automatically when something the visitor did failed through no
// fault of their own - currently just publishing a build.
//
// WHY: a failed publish is the one error on this site that costs real work. The
// visitor has filled in a whole build and has no idea whether it is their fault,
// and in practice nobody stops to write a bug report at that moment. Without
// this, the only trace was a line in the server log that nobody reads.
//
// It goes through the ordinary /api/report-issue endpoint rather than a new one,
// so it inherits the same rate limit, the same GitHub filing, and the same
// issue_reports row - and shows up in triage next to human reports.
//
// Deliberately fire-and-forget and never surfaced: the visitor is already
// looking at an error message, and "we also failed to report the failure" helps
// nobody. Any throw here is swallowed.

// Cheap guard against a visitor mashing Publish and filing five identical
// issues, which would also burn the endpoint's rate limit (10 per 10 minutes).
// Per-page-load rather than persisted - a genuinely new attempt after a reload
// is worth hearing about again.
const reported = new Set();

export function reportPublishFailure({ action, error, reason, context = {} }) {
  const signature = `${action}:${reason ?? ''}:${error?.message ?? ''}`;
  if (reported.has(signature)) return;
  reported.add(signature);

  const lines = [
    'Issue type: Automatic report',
    `Action: ${action}`,
    `Error: ${error?.message ?? String(error)}`,
  ];
  if (reason) lines.push(`Server reason: ${reason}`);

  for (const [key, value] of Object.entries(context)) {
    if (value === undefined || value === null || value === '') continue;
    lines.push(`${key}: ${value}`);
  }

  lines.push(`URL: ${window.location.href}`);
  lines.push(`When: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('Filed automatically when a visitor pressed Publish and the request failed.');
  lines.push('No build content is included - only its shape, so nothing a visitor wrote is copied here.');

  // Never awaited and never rethrown - see the note above.
  submitIssueReport(lines.join('\n')).catch(() => {});
}
