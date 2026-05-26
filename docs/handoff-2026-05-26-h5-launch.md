# H5 Launch Handoff - 2026-05-26

## Project

- Path: `/Users/Admin/Downloads/Codex/2026-05-07/nfc-iphone-m-m-nfc-m`
- Product: `今日鸟签 NFC`
- Surfaces:
  - Root H5: `index.html`, `script.js`, `styles.css`
  - Standalone H5 preview: `web/index.html`, `web/app.js`, `web/styles.css`
  - Mini Program data source: `pages/index/index.js`
  - Netlify output: `dist/`

## Completed Bird Asset Work

- The app now has 34 bird entries.
- All 34 project bird illustrations were replaced with a unified painterly raster style:
  - realistic reference cues
  - cute rounded body language
  - no vector-flat look
  - isolated bird body only
  - no branch, leaves, scenery, text, or background
  - transparent PNG at `720x720`
- WebP assets were regenerated with `npm run build`.
- `红协绣眼` was corrected to `红胁绣眼`.
- `30 只鸟图鉴` UI copy was updated to `34 只鸟图鉴` where already found.

## Key Asset Paths

- Source PNG assets: `assets/birds-final/`
- Source WebP assets: `assets/birds-final-webp/`
- Standalone H5 PNG mirror: `web/assets/birds-final/`
- Standalone H5 WebP mirror: `web/assets/birds-final-webp/`
- H5 data: `web/assets/meta/birds.json`
- H5 embedded data fallback: `web/assets/meta/birds-data.js`
- Final 34-bird overview: `docs/asset-review/bird-assets-34-final-redesign-overview.png`
- Per-batch design checks:
  - `docs/asset-review/batch-01-transparent-clean/`
  - `docs/asset-review/batch-02-transparent-clean/`
  - `docs/asset-review/batch-03-transparent-clean/`
  - `docs/asset-review/batch-04-transparent-clean/`
  - `docs/asset-review/batch-05-transparent-clean/`

## Current Build Commands

```sh
npm run build
```

What it does:

- Converts `assets/birds-final/*.png` to `assets/birds-final-webp/*.webp`
- Exports `pages/index/index.js` raw bird data to `web/assets/meta/birds.json`
- Writes `web/assets/meta/birds-data.js`
- Rebuilds `dist/`
- Copies root H5 files and image assets into `dist/`

## Local Preview

Default:

```sh
npm run serve
```

If port `4173` is unhealthy or occupied, use a clean temporary port:

```sh
python3 -m http.server 4183 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4183/
```

Known note: one previous `4173` server returned `502`; a clean `4183` server verified successfully.

## Verified Before Handoff

- `npm run build` completed.
- `web/assets/meta/birds.json` exported 34 entries.
- All 34 `assets/birds-final/*.png` files exist.
- All 34 `assets/birds-final-webp/*.webp` files exist.
- Temporary local server on `4183` returned:
  - `/` -> `200`
  - `/assets/birds-final-webp/sparrow.webp` -> `200`
  - `/assets/birds-final-webp/brown-headed-bunting.webp` -> `200`
  - `/web/assets/meta/birds.json` -> 34 entries

## H5 Work Still To Finish

- Review the root H5 page as the main launch surface:
  - initial draw state
  - revealed bird state
  - nest/grid page
  - share poster state
  - mobile viewport around 390px wide
  - wider desktop viewport
- Confirm whether the standalone `web/` H5 should remain as a secondary preview or be removed from launch scope.
- Verify all visible copy refers to 34 birds, not 30.
- Verify NFC deep links:
  - `/?tag=demo`
  - `/nfc/demo`
- Verify image sizing after the heavier realistic bird assets.
- Verify no old browser cache issue after deployment.

## Deployment Checklist

- Run `npm run build`.
- Confirm `dist/index.html` exists.
- Confirm `dist/assets/birds-final-webp/` contains 34 WebP files.
- Confirm `dist/web/assets/meta/birds.json` contains 34 entries.
- Confirm Netlify publish directory is `dist`.
- Confirm Netlify rewrites `/nfc/*` to `/index.html`.
- Open deployed URL and check:
  - home page loads
  - draw action works
  - bird image loads as WebP
  - grid page loads 34 birds
  - `?tag=` label works
  - `/nfc/{tag}` works

## Important Worktree Notes

- Do not revert unrelated existing Docker/README/package changes unless explicitly requested.
- Current dirty worktree includes both bird/H5 launch work and earlier Docker-related files:
  - `.dockerignore`
  - `.env.example`
  - `Dockerfile`
  - `backend/`
  - `docker-compose.yml`
  - `docker/`
  - `package-lock.json`
- Treat those existing changes as user/project state, not disposable artifacts.

