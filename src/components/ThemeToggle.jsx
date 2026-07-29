// Labelled with the mode it switches TO (not the current mode) - "Light
// mode" while dark is active, "Dark mode" while light is active - so the
// button reads as an action rather than a status readout.
export default function ThemeToggle({ theme, onToggle }) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${nextTheme} mode`}
    >
      {nextTheme === 'light' ? 'Light mode' : 'Dark mode'}
    </button>
  );
}
