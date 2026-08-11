# FFmpeg Executable Path Fix Plan (MED-04)

## Problem

`PoDM_project/server/services/content.service.ts:24-25` hardcodes a local Windows
WinGet FFmpeg path and forces it into `fluent-ffmpeg`:

```ts
const ffmpegPath = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet',
    'Packages', 'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe',
    'ffmpeg-8.0.1-full_build', 'bin', 'ffmpeg.exe');
ffmpeg.setFfmpegPath(ffmpegPath);
```

This breaks video thumbnail generation (`generateVideoThumbnail`,
`content.service.ts:123-164`) inside the production Linux Docker container, where
FFmpeg is installed at `/usr/bin/ffmpeg` (`Dockerfile:14` →
`apk add --no-cache ... ffmpeg`). When the hardcoded `.exe` path is set,
`fluent-ffmpeg` invokes a nonexistent binary → `generateVideoThumbnail` throws →
video content creation fails on deploy.

## Root Cause

The dev environment (Windows, WinGet-installed FFmpeg) leaked a machine-specific
absolute path into committed source. `ffmpeg.setFfmpegPath()` overrides
`fluent-ffmpeg`'s own binary resolution, so both the Docker image and any other
environment are forced to use the Windows binary.

## Fix Plan

### Phase 1 — Make the path configurable with a safe default (backend)

1. **Replace the hardcoded path** in `content.service.ts:23-25` with env-driven
   resolution:
   - If `FFMPEG_PATH` is set → `ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH)`.
   - Otherwise → **do not call `setFfmpegPath()` at all** and let `fluent-ffmpeg`
     resolve `ffmpeg` from `PATH` (works on Linux `/usr/bin/ffmpeg`, macOS
     Homebrew, and Windows when ffmpeg is on PATH). Remove the WinGet path
     construction entirely (no more `os.homedir()` Windows path assembly).
2. **Fail loudly on misconfiguration**: wrap in a startup check that verifies the
   resolved binary exists/executes (`ffmpeg -version` via `fluent-ffmpeg`
   `.ffprobe` or `ffmpeg.getFfmpegPath()` + `fs.existsSync`), logging a clear
   error at boot if FFmpeg is missing instead of failing only when a video upload
   arrives. Non-fatal at startup (app can serve photos/text), but the log must be
   unmistakable.
3. **Keep dev convenience**: add `FFMPEG_PATH=...\ffmpeg.exe` (the current WinGet
   path) to `server/.env` so local Windows dev keeps working unchanged; the Docker
   container simply omits it (or sets it to `/usr/bin/ffmpeg`) and relies on PATH.

### Phase 2 — Document the contract

4. Add `FFMPEG_PATH` to the backend `AGENTS.md` env-vars list in
   `PoDM_project/AGENTS.md` (Crypto payments env vars section is separate; add a
   Media/env note) and to root `AGENTS.md` if a global env contract exists.
5. Note in `Dockerfile` comment (or `AGENTS.md`) that the container must install
   `ffmpeg` (already does at `Dockerfile:14`) and must not set `FFMPEG_PATH` to a
   Windows path.

### Phase 3 — Consistency sweep

6. Grep the repo for any other hardcoded ffmpeg/ffprobe binaries (e.g.
   `.setFfmpegPath`, `.setFfprobePath`, `ffmpeg.exe`, `ffprobe.exe`) outside
   `server/.env`. Current search shows `content.service.ts` is the only site, but
   re-verify after changes.

## Deployment Order

1. Ship the code change (Phase 1) with `FFMPEG_PATH` left unset in the container.
2. Add the WinGet value to local `server/.env` (git-ignored, so no secrets/commit
   concern; keeps Windows dev parity).
3. Rebuild the Docker image and verify `docker compose up` boots with a clean
   FFmpeg log line, then upload a video end-to-end (thumbnail generated).
4. Run existing backend tests (`npm test`) — thumbnail path is covered by any
   video-upload integration tests, if present.

## Files to Modify

| File | Change |
|---|---|
| `PoDM_project/server/services/content.service.ts` | Replace hardcoded WinGet path with `FFMPEG_PATH` env var (optional) + PATH fallback; add startup binary check |
| `PoDM_project/server/.env` | Add `FFMPEG_PATH=<WinGet ffmpeg.exe>` for local Windows dev (git-ignored) |
| `PoDM_project/AGENTS.md` | Document `FFMPEG_PATH` env contract + container note |
| `Dockerfile` (optional) | Keep `apk add ffmpeg`; no code change required unless a comment is added |

## Verification

- `npm run build` + `npm test` (backend).
- `docker compose build && docker compose up` → boot log shows FFmpeg binary
  resolved (no error); `docker exec <container> which ffmpeg` → `/usr/bin/ffmpeg`.
- Upload a `.mp4` through `POST /api/v1/content` → thumbnail generated (no
  "FFmpeg error" / 500); cleanup of temp files verified.
- Local Windows dev: video upload still works with `FFMPEG_PATH` set in
  `server/.env`.
