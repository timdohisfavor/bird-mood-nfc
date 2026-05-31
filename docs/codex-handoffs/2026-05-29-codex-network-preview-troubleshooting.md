# Codex Network And Local Preview Handoff - 2026-05-29

## Executive Summary

Several recent slowdowns and failed previews were not caused by H5 app code. They came from local servers, proxy settings, `localhost`/`127.0.0.1` handling, and heavy concurrent agent/build processes.

Use this handoff before archiving the large network/proxy/local preview diagnostic sessions.

## Known Patterns

- Codex reconnecting or loading slowly can be caused by proxy configuration, especially stale local proxy ports.
- Local H5 preview failures can be caused by:
  - server not running
  - wrong port
  - another process occupying the port
  - proxy intercepting local requests
  - missing `no_proxy` for localhost addresses
- Previous Karing/global proxy issue:
  - global `http_proxy` / `https_proxy` pointed to a local proxy
  - local requests were also routed through the proxy
  - adding `no_proxy` / `NO_PROXY` for localhost addresses fixed one class of local preview failures

## Safe Diagnostic Order

1. Check whether the server is actually running.
   ```sh
   lsof -iTCP:<port> -sTCP:LISTEN
   ```
2. Check direct local response.
   ```sh
   curl -I http://127.0.0.1:<port>/
   ```
3. Check proxy environment.
   ```sh
   env | grep -i proxy
   ```
4. Confirm local bypass includes:
   ```text
   localhost,127.0.0.1,::1,.local
   ```
5. If `localhost` fails but `127.0.0.1` works, prefer `127.0.0.1` for preview.
6. Only after the above should you debug app code.

## Project Preview Commands

For built H5:

```sh
npm run build:fast
npm run serve:dist
```

Open:

```text
http://127.0.0.1:4180/
```

For simple root preview:

```sh
npm run serve
```

Open:

```text
http://127.0.0.1:4173/
```

## Current Drag Sources Observed On 2026-05-29

- `~/.codex` total size was about 3.0G.
- `logs_2.sqlite` was about 608M, mostly TRACE-level volume.
- Active sessions were about 386M across 46 JSONL files.
- Some bird asset sessions were about 68-69M each because of image generation and large tool output.
- `backups_state/provider-sync` was about 575M.
- WorkBuddy and Codex had multiple helper/app-server processes open.
- ImageMagick/WebP conversion can temporarily spike CPU during `npm run build`.

## Maintenance Guidance

- Do not kill processes or change proxy config without user confirmation.
- For Codex state cleanup, create handoffs before archiving valuable sessions.
- For old logs, prefer rotation/archive after a backup, not deletion.
- If Codex feels heavy during active image builds, wait for ImageMagick/build processes to finish before judging app performance.

## Reactivation Prompt

```text
We are diagnosing Codex/local preview/network drag.

Read this handoff:
docs/codex-handoffs/2026-05-29-codex-network-preview-troubleshooting.md

Start in report-only mode. Check server, port, curl result, proxy env, and process load before changing any configuration. Do not delete logs or archive sessions unless handoffs and backups exist.
```

