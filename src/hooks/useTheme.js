import { useEffect, useState } from 'react';

export const THEME_STORAGE_KEY = 'rs3-leagues-theme';

// Dark is the default for every visitor - deliberately not tied to
// prefers-color-scheme (see index.css: `:root` itself is the dark palette,
// `:root[data-theme="light"]` is the override). Only an explicit toggle
// click ever switches to light, persisted from then on.
function loadInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

// index.html has its own copy of this same read-and-apply logic, run
// synchronously before the stylesheet paints anything (see that file) - this
// hook's own effect below re-applies the same attribute on every change,
// but the *initial* value is already correct on first paint either way, so
// there's no flash even though this effect only runs after mount.
export function useTheme() {
  const [theme, setTheme] = useState(loadInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Same as index.html's inline script - storage being unavailable just
      // means the choice won't persist across visits, nothing to recover.
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  return { theme, toggleTheme };
}
