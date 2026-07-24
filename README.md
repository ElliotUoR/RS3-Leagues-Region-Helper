# RS3 Leagues II: Equilibrium — Region Prep

Static site for preparing for the next RS3 league 'Equilibrium'. Choose your regions, prepare
gear loadouts for each combat styles; view unlockable abilties and relics, and share/import your loadout.

Visit https://elliotuor.github.io/RS3-Leagues-Region-Helper/ to try it out.

Changes are persisted through local storage and imported builds do not overwrite your stored build unless you
explicitly tell it to do so.

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
