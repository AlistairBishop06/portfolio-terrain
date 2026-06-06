# GitHub Portfolio Terrain

A deployable static portfolio for `AlistairBishop06`. It fetches public GitHub repositories, clusters them by language and commit activity, then renders them as a smooth interactive 3D landscape.

## What It Does

- Fetches owner repositories from the GitHub REST API.
- Requests lightweight per-repo commit counts from each default branch.
- Falls back to bundled repository data if GitHub is unavailable or rate-limited.
- Groups repositories into language biomes, then places similar commit counts closer together.
- Uses commit count to shape terrain height, landmark size, prop density, and cluster prominence.
- Renders a continuous Three.js terrain mesh with flags, hover labels, and click-through repository panels.

## File Structure

```text
.
├── index.html
├── main.js
├── style.css
├── layout.json
├── server.js
├── README.md
└── scripts/
    ├── camera-controls.js
    ├── config.js
    ├── dom-ui.js
    ├── fallback-data.js
    ├── github-api.js
    ├── render-loop.js
    ├── repo-panel.js
    ├── terrain-model.js
    ├── terrain-picker.js
    ├── three-scene.js
    └── world-map.js
```

## Run Locally

Use the included static server:

```powershell
node server.js
```

Then open `http://localhost:4173`.

## Deploy To GitHub Pages

1. Push these files to a GitHub repository.
2. Open the repository settings.
3. Go to `Pages`.
4. Select the branch and `/root` folder.
5. Save.

No build step is required. The site uses native ES modules and a Three.js import map, so it can be hosted directly from GitHub Pages or any static host such as Vercel.

## Notes

GitHub's unauthenticated API has rate limits. The app caches successful results in `localStorage` for 45 minutes and uses bundled fallback data if live requests fail.
