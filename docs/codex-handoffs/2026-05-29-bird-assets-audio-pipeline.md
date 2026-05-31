# Bird Assets And Audio Pipeline Handoff - 2026-05-29

## Executive Summary

The bird asset work expanded the project from 30 to 34 birds and then unified the illustration set, transparent PNGs, WebP export, H5 metadata, and bird call audio. Several large sessions exist because generated images, screenshots, and repeated asset checks made the transcripts heavy.

Use this handoff before archiving the large bird asset sessions from May 25-26.

## Key Decisions & Rationale

- Bird illustrations are project assets, not just generated previews.
  - Required asset spec: 720x720 PNG, real alpha transparency, isolated bird body only, no background, no branch, no scene elements, no text.
  - Every accepted PNG must be mirrored through WebP, H5 data, `web/` assets where applicable, and `dist/`.
- `pages/index/index.js` remains the authority for bird records.
  - H5 data is exported from this source via `scripts/export_h5_birds.mjs`.
- WebP generation is centralized.
  - Use `npm run assets:webp` or full `npm run build`.
- Audio should be short and web-friendly.
  - Project target from prior work: about 8-10 seconds, mono, 96 or 128 kbps, no long leading silence, light fade out.

## Current Asset State

- PNG bird assets: `assets/birds-final/` - 34 PNG files.
- WebP bird assets: `assets/birds-final-webp/` - 34 WebP files.
- Bird call MP3 assets: `assets/bird-calls/` - 34 MP3 files.
- Original bird call backups: `assets/bird-calls-original/`.
- H5 metadata: `web/assets/meta/birds.json` and `web/assets/meta/birds-data.js`.
- Important asset review docs:
  - `docs/asset-review/bird-assets-34-final-redesign-overview.png`
  - `docs/asset-review/generated-four-transparent-final/`
  - `docs/asset-review/tail-fix-final/`
  - `docs/asset-review/tail-clipping-7-compare.png`

## Important History

- The four added birds were: 红胁绣眼, 黄腰柳莺, 知更鸟, 棕背伯劳.
- A previous generated batch looked good visually but had background/scene elements or fake checkerboard transparency. That was rejected.
- Final accepted generated bird assets must be true transparent alpha and consistent with the first 30 birds.
- Some later work identified tail clipping in several assets; tail fix review material lives under `docs/asset-review/tail-fix-final/`.

## Commands

```sh
npm run assets:webp
npm run audio:optimize
npm run export:h5-data
npm run build
npm run check:dist
```

Use `npm run build` after final accepted asset changes.

## Files That Matter

- `scripts/convert_bird_webp.mjs`: PNG to WebP conversion.
- `scripts/optimize_bird_calls.mjs`: trims/encodes bird call audio.
- `scripts/clean_bird_alpha_edges.py`: cleans alpha edge artifacts.
- `scripts/export_h5_birds.mjs`: exports H5 data fields.
- `docs/bird-call-assets.csv`: recorded bird call source mapping.
- `docs/bird-habitat-design.md`: habitat field/design notes.

## Verification Checklist

- 34 PNG files exist under `assets/birds-final/`.
- 34 WebP files exist under `assets/birds-final-webp/`.
- 34 MP3 files exist under `assets/bird-calls/`.
- New PNGs have real alpha transparency, not baked checkerboard pixels.
- No branch/background/scenery remains in bird body assets.
- `npm run build` passes.
- H5 nest cards and detail sheet show complete bird bodies, including feet/tails.
- Audio plays from both nest card controls and detail sheet controls.

## Constraints & Preferences

- Never accept "looks transparent" by eyeballing only; verify alpha or inspect on colored backgrounds.
- Do not update only generated images; update the project asset paths and rebuild.
- Do not change the authoritative bird data shape casually. Keep exported fields aligned with H5 needs.

## Reactivation Prompt

```text
We are continuing bird asset/audio work for 今日鸟签 NFC.

Read this handoff:
docs/codex-handoffs/2026-05-29-bird-assets-audio-pipeline.md

Then inspect the current asset directories and run targeted verification before changing anything. Do not rely on old chat history. If replacing assets, enforce 720x720 real transparent PNG, regenerate WebP, update H5/dist, and verify in local preview.
```

