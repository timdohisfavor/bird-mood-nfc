# 今日鸟签 H5-Only Cleanup Handoff - 2026-05-31

**Project / Ticket:** 今日鸟签 NFC H5-only maintenance cleanup and preview  
**Date of Handoff:** 2026-05-31  
**Handoff Author:** Codex  

## Executive Summary

This repo is now intended to be maintained as an H5-first app for the next ~2 months. The current production architecture is the root vanilla H5 app (`index.html`, `styles.css`, `script.js`) built into `dist/` for Netlify; the old WeChat Mini Program files and duplicate `web/` H5 were removed in commit `fca9b64`.

Local H5 preview was opened at `http://127.0.0.1:4173/?fresh=handoff-preview-20260531-clean`. The page loaded successfully, showed the current "今日已揭晓" home state from local daily draw storage, had no console errors, no horizontal overflow, and the unopened bird egg hero asset exists and loads.

## Key Decisions & Rationale

- Decision: Root H5 is the only active frontend architecture.
  - Rationale: Netlify is configured with `publish = "dist"` and `command = "npm run build"` in `netlify.toml`.
  - Practical meaning: Work on `index.html`, `styles.css`, `script.js`, root `assets/`, and build scripts. Do not revive `web/`.

- Decision: Mini Program code was removed from the active project root.
  - Rationale: User explicitly approved H5-focused maintenance and Mini Program deletion as long as H5 is not affected.
  - Important caveat: The bird source data had to move out of `pages/index/index.js`; it now lives in `data/birds-source.json`.

- Decision: H5 runtime bird data now lives under root `assets/meta/`.
  - Rationale: `web/assets/meta/*` was removed with the old `web/` duplicate app.
  - Current runtime paths: `assets/meta/birds.json` and `assets/meta/birds-data.js`.

## Current Codebase State

- `index.html`: Root H5 DOM. Uses `./assets/meta/birds-data.js` and `./assets/unopened-bird-egg.png`.
- `styles.css`: Root H5 visual system, including current home, detail, poster, and unopened bird egg visual states.
- `script.js`: H5 app logic, daily draw, local storage, routing/hash state, detail modal, poster generation, audio/pulse visualization.
- `data/birds-source.json`: New source-of-truth bird data file, extracted from the removed Mini Program data. **Currently untracked by Git.**
- `assets/meta/birds.json`: Generated H5 bird metadata. **Currently untracked by Git.**
- `assets/meta/birds-data.js`: Generated browser global data file. **Currently untracked by Git.**
- `scripts/export_h5_birds.mjs`: Reads `data/birds-source.json`, writes `assets/meta/birds.json`.
- `scripts/build_dist.mjs`: Builds `dist/`, generates `assets/meta/birds-data.js`, copies root H5 assets including `assets/unopened-bird-egg.png`.
- `netlify.toml`: Netlify build is `npm run build`, publish directory is `dist`.
- `README.md` / `AGENTS.md`: Updated to describe H5-first architecture.

## Current Git State

- Branch: `main`
- Latest commit: `fca9b64 chore: 移除小程序 + web/ 子目录，重构详情弹窗结构`
- Previous important commit: `63fee98 Refine H5 bird sign visuals and poster`

Important issue:

- `fca9b64` removed Mini Program and `web/`, but the new required data files are still untracked:
  - `data/birds-source.json`
  - `assets/meta/birds.json`
  - `assets/meta/birds-data.js`

If a fresh clone or Netlify deploy runs from the current committed `HEAD` without those files, `npm run build` may fail because `scripts/export_h5_birds.mjs` expects `data/birds-source.json`.

Other untracked local artifacts should not be committed unless explicitly needed:

- `.playwright-cli/*.yml`
- `output/`
- `design-system/MASTER.md`
- older handoff docs under `docs/codex-handoffs/`

## Preview Verification

Commands run:

```sh
npm run build:fast
python3 -m http.server 4173 --bind 127.0.0.1
```

Build result:

- Exported 34 birds to `assets/meta/birds.json`.
- Built `dist/` with 34 birds.
- `dist/ publish check passed (111 files).`

Browser preview:

- URL opened: `http://127.0.0.1:4173/?fresh=handoff-preview-20260531-clean`
- Page title: `NFC 今日鸟签`
- Current visible state: home page, already revealed daily bird state.
- Current bird shown in preview: `北长尾山雀`
- Date shown: `5月31日 周日 · 农历四月十五`
- Console errors: none observed.
- Horizontal overflow: none observed.
- `.unopened-hero-image`: loaded, natural size `523 x 561`.

Note:

- Browser check reported several hidden bird images as not loaded yet. They appear to be off-screen/hidden gallery or modal images, not a first-screen failure. Recheck lazy/preload behavior later if image loading becomes an issue.
- Browser still had prior local draw state, so the preview showed "今日已揭晓" rather than the unopened egg state. This is expected for the same device/date local storage flow.

## Environment & Commands

Use these commands for future H5 work:

```sh
npm run build
npm run build:fast
npm run check:dist
npm run serve
npm run serve:dist
```

Use `npm run build` before deploy-related work because it regenerates WebP and H5 data. Use `npm run build:fast` for HTML/CSS/JS/data iteration.

Local preview:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:4173/
```

Netlify deploy path:

```text
dist/
```

## What Has Been Completed

- [x] Confirmed root H5 is the current production architecture.
- [x] Confirmed Netlify uses `npm run build` and publishes `dist/`.
- [x] Removed old root Mini Program files in committed cleanup.
- [x] Removed old duplicate `web/` H5 in committed cleanup.
- [x] Moved data pipeline toward `data/birds-source.json` -> `assets/meta/birds.json` -> `dist/assets/meta/*`.
- [x] Verified `npm run build:fast` passes locally.
- [x] Opened local H5 preview in the in-app browser.
- [x] Confirmed preview has no console errors and no horizontal overflow.

## Open Questions & Next Steps

1. **High** - Fix the Git tracking gap for required H5 data.
   - Add and commit `data/birds-source.json`, `assets/meta/birds.json`, and `assets/meta/birds-data.js`, or intentionally change the build so generated files are not required in Git.
   - Success criteria: fresh clone can run `npm run build` successfully.

2. **High** - Run a clean-clone style build check.
   - Temporarily verify from committed files only or inspect `git ls-files` coverage.
   - Success criteria: no required build input is only present as an untracked local file.

3. **Medium** - Decide how to handle generated local artifacts.
   - `.playwright-cli/` and `output/` should probably be ignored or cleaned later.
   - Do not delete without user approval if there is any chance the screenshots are needed as visual history.

4. **Medium** - Recheck the unopened state with a fresh profile or a date/localStorage reset.
   - Current preview naturally shows an already revealed daily bird because local storage has today’s result.
   - Success criteria: unopened egg image, copy, and click target still look correct at 375px.

5. **Low** - Re-evaluate whether `assets/meta/birds-data.js` should be committed or only generated.
   - Current `index.html` references it directly, so either keep it committed or make the app resilient before generation.

## Constraints & Preferences

- Do not restore Mini Program or `web/` unless the user explicitly reverses the H5-only direction.
- Do not commit `.playwright-cli/`, `output/`, or random local design artifacts by accident.
- Keep the existing H5 visual direction. Recent user preference: do not aggressively redesign; focus on information hierarchy and product polish.
- For complex bird/nest/egg visuals, prefer bitmap assets over CSS-drawn illustrations.
- Netlify production should continue to build from root H5 into `dist/`.
- The user prefers direct, pragmatic updates and wants continuity in a new conversation.

## Reactivation Prompt

```text
We are continuing the 今日鸟签 NFC H5-only cleanup from a previous Codex session.

Read this handoff completely:
docs/codex-handoffs/2026-05-31-h5-only-cleanup-preview.md

Then inspect:
AGENTS.md
README.md
netlify.toml
package.json
git status --short --untracked-files=all
git log --oneline -5

Start by verifying whether the required H5 data files are tracked:
git ls-files data assets/meta

The first priority is to fix the Git tracking/build gap for:
- data/birds-source.json
- assets/meta/birds.json
- assets/meta/birds-data.js

Do not commit local preview artifacts like .playwright-cli/ or output/.
Do not revive Mini Program or web/ unless explicitly asked.
Confirm the current repo state first, then continue from the highest-priority next step.
```

## Additional Notes

- Current active H5 core line count checked during handoff:
  - `index.html`: 270
  - `script.js`: 1169
  - `styles.css`: 2171
  - `scripts/build_dist.mjs`: 62
  - `scripts/export_h5_birds.mjs`: 125
  - `data/birds-source.json`: 755
  - `assets/meta/birds.json`: 886
  - `assets/meta/birds-data.js`: 886
  - `README.md`: 116
  - `AGENTS.md`: 62
  - Total for this checked set: 6502 lines

- `bird-mood-nfc-download/` still contains old `web/` and `pages/` directories, but that appears to be a downloaded/archive folder rather than the active app root. Do not use it as the active architecture.
