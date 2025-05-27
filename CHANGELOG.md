# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2024-07-30

### Added
- **Playlist Management**: Users can now manually add Bilibili video URLs to a specific playlist directly from the settings page. This involves URL validation and fetching video metadata before adding.
- **Player Window Reuse**: The extension now intelligently reuses an existing player window if one is already open, focusing it and sending new audio data instead of opening multiple player instances. The active player window ID is tracked in local storage.
- **Custom In-Player Modals**: Replaced native browser `prompt()` and `confirm()` dialogs within the player (e.g., for adding to playlists, confirming removal) with custom HTML/CSS/JS modals. This resolves issues with dialogs being suppressed by the browser when the player window isn't active.

### Changed
- **Robust Audio URL Handling**:
    - Playback history and playlist items now primarily store Bilibili Video IDs (BVID) and Content IDs (CID) instead of potentially expiring full audio URLs.
    - Audio URLs are fetched on-demand from the Bilibili API using the stored BVID/CID right before playback is initiated. This significantly improves the reliability of playing from history and playlists over time.
    - This change was implemented across the popup, player, and settings scripts, with API calls routed through the background script.
- **Centralized Type Definitions**: Shared TypeScript interfaces (like `BilibiliVideoInfo`, `HistoryItem`, `AuthConfig`) have been consolidated into a new `src/utils/types.ts` file and imported across relevant modules (`popup.ts`, `player.ts`, `settings.ts`, `utils/bilibiliApi.ts`) to improve code maintainability and type safety.

### Fixed
- **Expired Audio URLs**: Resolved a critical issue where audio playback from history or playlists would fail after the initially extracted audio URL (with a `deadline` parameter) expired.
- **Suppressed Player Dialogs**: Fixed an issue where `window.prompt()` or `window.confirm()` calls in the player window could be suppressed by the browser if the player tab was not the active, focused tab.
- **Linter Errors**: Addressed various linter errors that arose during refactoring, including duplicate imports and incorrect type usages.

---
*Older changes before this log was started are not detailed here.* 