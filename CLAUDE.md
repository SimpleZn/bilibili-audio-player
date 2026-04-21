# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Chrome extension (Manifest V3) that extracts audio from Bilibili videos and plays it in a standalone popup window. Built with TypeScript + Webpack. No React framework used in the extension UI — vanilla TS with direct DOM manipulation.

## Commands

```bash
npm run build   # Production build → dist/
npm run dev     # Watch mode for development
```

To load the extension: open `chrome://extensions/`, enable Developer Mode, click "Load unpacked", select the `dist/` directory.

## Architecture

Webpack compiles five independent entry points, each mapped to a Chrome extension page:

| Entry (`src/`) | Output | Purpose |
|---|---|---|
| `background.ts` | `background.js` | Service worker — handles messages, opens player windows, manages context menus |
| `contentScript.ts` | `contentScript.js` | Injected into bilibili.com pages — renders the floating "提取音频" button |
| `popup.ts` | `popup.js` | Extension toolbar popup — detect current tab, manual URL input, play history |
| `player.ts` | `player.js` | Standalone audio player window — playback controls, add-to-playlist |
| `settings.ts` | `settings.js` | Options page — SESSDATA config, playlist CRUD, history management |

Static HTML files in `public/` are copied verbatim to `dist/` alongside the compiled JS.

## Key Design Decisions

**On-demand audio URL fetching**: Bilibili audio URLs expire quickly. The player always re-fetches a fresh URL from the API before playback rather than relying on a stored URL. `bvid` + `cid` are stored persistently; `audioUrl` is ephemeral.

**WBI signature (`encWbi` in `src/utils/util.ts`)**: All Bilibili API calls must be signed using the WBI scheme. Sign keys (`imgKey`, `subKey`) are fetched from `/x/web-interface/nav` and cached in `chrome.storage.local` for 24 hours. `initSignData()` in `bilibiliApi.ts` manages this cache.

**Message passing**: `popup.ts` and `player.ts` cannot call Bilibili APIs directly (CORS). They send `getBilibiliAudio` messages to the background service worker, which performs the fetch and replies.

**Storage**:
- `chrome.storage.sync` — `authConfig` (SESSDATA)
- `chrome.storage.local` — WBI sign keys cache (`signData`, `spiData`, `cacheTime`), play history, user playlists (`userPlaylists`)

## Utility Modules (`src/utils/`)

- `types.ts` — All shared TypeScript interfaces (`BilibiliVideoInfo`, `AuthConfig`, `HistoryItem`, API response shapes)
- `playlistTypes.ts` — `Playlist` and `PlaylistItem` interfaces; playlists stored under key `userPlaylists`
- `bilibiliApi.ts` — API calls: `getBilibiliAudio`, `fetchVideoInfo`, `extractAudioUrl`, `initSignData`, `sign`
- `util.ts` — `encWbi` (WBI signing), `extractVideoId`, `isBilibiliVideoPage`, `saveAuthConfig`, `loadAuthConfig`
