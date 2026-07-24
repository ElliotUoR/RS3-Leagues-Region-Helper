# RS3 Leagues II: Equilibrium — Region Prep

A static reference site for planning region unlocks in RuneScape 3's Leagues II: Equilibrium
game mode. Misthalin, Karamja, and Havenhythe are always unlocked; you may pick up to 3 more
regions from the remaining 8. Pick your regions on the map or checklist and see what's
unlocked — your selection is saved in the browser (`localStorage`), no account or server needed.

## Region mapping notes

A few areas aren't on the main map and are grouped as follows:

- **Underworld** → Misthalin
- **Mazcab** → Kharidian Desert
- **The Arc** → Asgarnia
- **Lost Grove** → Tirannwn


## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

## Deployment (GitHub Pages)

This repo includes `.github/workflows/deploy.yml`, which builds and deploys `dist/` to GitHub
Pages on every push to `main`.

One-time setup after your first push:

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Push to `main` (or re-run the workflow) — the site will be published at
   `https://<username>.github.io/<repo-name>/`.

The Vite config uses `base: './'`, so the build works under any repo name/subpath without
further changes.
