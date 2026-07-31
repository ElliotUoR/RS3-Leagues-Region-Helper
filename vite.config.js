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
}))
