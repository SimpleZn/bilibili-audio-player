Read this in: [中文](README.md) | [English](README_EN.md)

# Bilibili Audio Player Chrome Extension - User Guide

## Features

Bilibili Audio Player is a Chrome extension that extracts audio from Bilibili videos and plays it independently. Key features include:

1. Extracts audio from Bilibili video URLs **or bare BV IDs** (e.g. `BV1xx411c7mD`), using an on-demand fetching mechanism to prevent expired links.
2. Plays audio independently; closing the Bilibili video page does not affect audio playback.
3. **Player Window Reuse**: Prefers to use an already open player window, avoiding duplicate windows.
4. Automatically reads your logged-in Bilibili cookies from the browser — no manual configuration needed. Manual SESSDATA entry is also supported as a fallback.
5. Automatically detects if the current page is a Bilibili video page.
6. Provides a floating button, popup window, and a standalone player window.
7. **Playback History:** Automatically records recently played audio (stored by video ID for persistence). View and replay your listening history in the extension popup, with support for viewing full history and clearing it on the settings page.
8. **Custom Playlists:** Create and manage your own audio collections.
    * Create, rename, and delete playlists on the settings page.
    * **Manually add videos to a specific playlist by pasting a Bilibili video URL on the settings page**.
    * Add the currently playing audio to a playlist directly from the player.
    * View playlist contents and play audio from them on the settings page.

## Installation

### Developer Mode Installation

1. Clone or download this project and run `npm run build` to generate the `dist/` directory.
2. Open Chrome browser and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked".
5. Select the project's `dist/` directory.

### Installation from Chrome Web Store (Not yet published)

Not yet listed on the Chrome Web Store. Please use Developer Mode installation.

## How to Use

### Method 1: On a Bilibili Video Page

1. Visit any Bilibili video page.
2. Click the "Extract Audio" floating button that appears in the bottom right corner of the page.
3. The audio will open in a new window and start playing automatically.

### Method 2: Using the Extension Icon

1. Click the extension icon in the Chrome toolbar.
2. If the current page is a Bilibili video page, it will display video information and a "Play this video's audio" button.
3. Alternatively, enter a Bilibili video URL **or a bare BV ID** (e.g. `BV1xx411c7mD`) and click "Extract and Play Audio".

### Setting SESSDATA (Optional — for videos requiring login)

The extension automatically reads your logged-in Bilibili cookies from the browser, so manual configuration is usually unnecessary. If auto-detection fails, you can set it manually:

1. Click the "Settings" link at the bottom of the extension popup.
2. Enter your SESSDATA on the settings page.
3. Click "Save Settings".

How to obtain SESSDATA:
1. Log in to the Bilibili website.
2. Press F12 to open developer tools.
3. Go to the **Application** tab.
4. Find **Cookies > bilibili.com** on the left side.
5. Find the cookie named `SESSDATA` and copy its value.

## Player Controls

The player window offers the following controls:
- Play/Pause
- Seekable progress bar
- Volume adjustment
- Add to Playlist button (add the current audio to one of your custom playlists)
- Settings button (quick access to the settings page)

## Troubleshooting

- Some videos require a Bilibili login to extract audio — make sure you are logged in to Bilibili in your browser.
- If audio fails to load, try refreshing the page or re-logging in to Bilibili.
- This extension is for personal study and use only. Please respect Bilibili's copyright and terms of use.
