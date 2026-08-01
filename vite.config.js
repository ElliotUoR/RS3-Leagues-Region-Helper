import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import buildTextEditor from './scripts/viteBuildTextEditor.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // The live deploy needs an absolute base: short links now resolve at a
  // real nested path (/Leagues/s/CODE, see api.js resolveShortCode) rather
  // than only ever at /Leagues/ itself, and a relative './assets/...' base
  // resolves against whatever the current URL's last path segment happens
  // to be - wrong one level deep. GitHub Pages never serves a nested path
  // like that, so it keeps the relative base (deployment-path-agnostic,
  // works whether Pages serves it at the repo name or a custom domain).
  base: mode === 'live' ? '/Leagues/' : './',
  // buildTextEditor is `apply: 'serve'` - it adds a localhost-only endpoint for
  // editing the Build Guides prose in place, and is never part of a production
  // build. See scripts/viteBuildTextEditor.js.
  plugins: [react(), buildTextEditor()],

  // Dev-server only (Vite ignores `server` in a build), and it exists so the
  // app can talk to a real backend locally. In production Caddy routes these
  // two prefixes (see deploy/Caddyfile.snippet); here Vite does the same job,
  // so utils/api.js's hardcoded /Leagues/ paths work unchanged rather than
  // needing a separate dev base URL.
  //
  // The /Leagues prefix is stripped before forwarding, because Caddy strips it
  // too (`handle_path`) - the Node service's routes are declared as
  // "/api/user-builds", not "/Leagues/api/user-builds", and PostgREST expects
  // a bare table name.
  server: {
    proxy: {
      '/Leagues/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/Leagues/, ''),
      },
      '/Leagues/rest': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/Leagues\/rest/, ''),
      },
    },
  },
}))
