# Terrain

An interactive 3D portfolio for `AlistairBishop06`, designed to deploy directly on GitHub Pages.

The site turns public GitHub repository contributions into a flyable voxel landscape. Repository pushes become peaks, public commits by `AlistairBishop06` become terrain height, streaks become ridges, quiet days become valleys, and repository languages tint the biome.

## Run Locally

Use the included static server from this folder:

```powershell
node server.js
```

Then open `http://localhost:4173`.

Avoid `python -m http.server` on Windows for this project. On some machines it serves `.js` files as `text/plain`, which prevents browser ES modules from starting.

## Deploy To GitHub Pages

1. Push these files to a repository.
2. Open the repository settings on GitHub.
3. Go to `Pages`.
4. Select the branch and root folder.
5. Save.

No build step is required.

## Data Notes

The public GitHub REST API does not expose a user's exact contribution calendar without authentication. This site uses public owner repositories plus each repository's public commits authored by `AlistairBishop06` over the last year. If commit lookups are rate-limited, repository push dates still create peaks so the portfolio remains usable.
