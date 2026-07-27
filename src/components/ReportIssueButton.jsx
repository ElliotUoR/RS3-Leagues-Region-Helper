// Pure toggle pill - stays put and just inverts colour when the report
// modal (ReportIssueModal, rendered once at the App level so both this
// footer button and the nav-bar tab can open the same instance) is open.
export default function ReportIssueButton({ open, onToggle }) {
  return (
    <button
      type="button"
      className={`report-issue-toggle${open ? ' open' : ''}`}
      onClick={onToggle}
    >
      Report an issue
    </button>
  );
}
