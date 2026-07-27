// Distinguishes the self-hosted "live" deploy (jellyflow.xyz/Leagues, full
// backend - shortlinks, issue reporting) from the static GitHub Pages
// mirror (no backend at all). Set at build time via `vite --mode pages`
// (see package.json scripts and .github/workflows/deploy.yml) - never
// inferred from window.location, so a build can't silently drift from what
// it was actually built as.
export const IS_PAGES_BUILD = import.meta.env.MODE === 'pages';

export const LIVE_SITE_URL = 'https://jellyflow.xyz/Leagues/';

export const PAGES_MIGRATION_DISMISSED_KEY = 'rs3-leagues-pages-migration-dismissed';
