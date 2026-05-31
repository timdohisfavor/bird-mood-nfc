# Bird H5 Current State Handoff - 2026-05-29

## Executive Summary

今日鸟签 NFC is a dual-surface app: WeChat Mini Program plus vanilla H5 preview. The H5 launch surface has grown into a product prototype with daily draw, nest/grid collection, detail sheet, poster/save flow, Joyi Xiaohongshu traffic entry, local NFC preview, bird call audio, and test-only preview tools.

Use this handoff before archiving the large H5/UI sessions from May 26-29. It is meant to let a fresh Codex thread continue without reopening the heavy chat history.

## Key Decisions & Rationale

- Root H5 is the primary launch surface.
  - Main files: `index.html`, `script.js`, `styles.css`.
  - Standalone `web/` is still mirrored for preview compatibility, but launch checks should prioritize root H5 and `dist/`.
- Build output is `dist/`, not the repository root.
  - Netlify publish should point to `dist`.
  - `scripts/check_dist_publish.mjs` guards against leaking source/temporary files.
- Local preview should use the project server, not `file://`.
  - Preferred command: `npm run serve:dist`.
  - Preferred URL: `http://127.0.0.1:4180/`.
  - Local `/nfc/*` fallback depends on `scripts/serve_dist.mjs`.
- Test-only controls are intentional.
  - Preview unlock/reset/NFC simulation should appear only in local preview mode.
  - Do not remove them merely because they are not production UI.

## Current Codebase State

- `index.html`: root H5 DOM, home/nest/poster/detail modal surfaces.
- `script.js`: app state, routing, daily draw, local storage, audio playback, preview tools, detail sheet, poster/detail saving.
- `styles.css`: root H5 visual system, responsive layout, nest cards, detail sheet, pulse visualization UI.
- `pages/index/index.js`: Mini Program source of truth for raw bird data.
- `scripts/export_h5_birds.mjs`: exports H5 metadata from Mini Program data.
- `scripts/build_dist.mjs`: assembles Netlify-ready `dist/`.
- `scripts/serve_dist.mjs`: serves local `dist/` with NFC route fallback.
- `scripts/check_dist_publish.mjs`: checks `dist/` before deployment.
- `docs/h5-page-structure.md`: current naming guide for H5 pages and modules.
- `docs/handoff-2026-05-28.md`: previous H5 handoff with verified commands and notes.

## Environment & Commands

```sh
npm run build
npm run build:fast
npm run check:dist
npm run serve:dist
```

Use `npm run build` when assets changed. Use `npm run build:fast` for JS/HTML/CSS/data-only iteration where WebP regeneration is unnecessary.

## What Has Been Completed

- 34-bird H5 data path exists.
- Nest/grid page supports collection status and local preview inspection flow.
- Unlocked bird cards open a screenshot-friendly detail sheet.
- Bird calls exist as optimized MP3 assets for 34 birds.
- Detail sheet includes bird call playback and pulse/rainbow visualization work.
- Joyi Xiaohongshu traffic entry exists in product surfaces.
- Local NFC path preview fallback exists for `/nfc/{tag}`.
- `docs/h5-page-structure.md` names the H5 pages/modules so future requests can be precise.

## Open Questions & Next Steps

1. High - Verify the current dirty worktree before new feature work.
   - Current known dirty files when this handoff was written: `index.html`, `styles.css`, `.playwright-cli/*.yml`, and `output/`.
   - Do not revert these without explicit user approval.
2. High - Run visual QA on mobile width around 390-430px and desktop width.
   - Check home card, nest cards, detail sheet bird body framing, audio controls, and save-to-image output.
3. High - Confirm all audio buttons work in both nest cards and detail sheet.
   - Previous friction: visualization could animate while audio was not actually connected.
4. Medium - Recheck generated image saving for full detail card, not clipped half-card output.
5. Medium - Confirm production build contains no zip/source/temp files with `npm run check:dist`.

## Constraints & Preferences

- Do not deploy to Netlify unless the user explicitly asks.
- Do not silently hide missing H5 data with fallback copy such as "常见栖息地"; missing derived fields should surface early.
- For H5 local loading failures, check server, port, proxy variables, and `no_proxy` before assuming app code broke.
- The user values polish: avoid visible broken clicks, poor layout, clipped bird bodies, and generic "vibe coding" feel.

## Reactivation Prompt

```text
We are continuing the 今日鸟签 NFC H5 project from a previous Codex session.

Read this handoff:
docs/codex-handoffs/2026-05-29-bird-h5-current-state.md

Then read:
docs/h5-page-structure.md
docs/handoff-2026-05-28.md
AGENTS.md

First inspect the current git status and relevant files. Do not assume the old chat history is available. Confirm the current dirty worktree state, then continue from the highest priority open item.
```

