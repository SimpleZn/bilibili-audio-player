Read this in: [中文](README.md) | [English](README_EN.md)

# Bilibili Audio Player Chrome Extension - User Guide

## Features

Bilibili Audio Player is a Chrome extension that extracts audio from Bilibili videos and plays it independently. Key features include:

1.  Extracts audio URLs from Bilibili video URLs.
2.  Plays audio independently; closing the Bilibili video page does not affect audio playback.
3.  Supports authentication via SESSDATA to access videos requiring login.
4.  Automatically detects if the current page is a Bilibili video page.
5.  Provides a floating button, popup window, and a standalone player window.
6.  **Playback History:** Automatically records recently played audio. View and replay your listening history in the extension popup, with an option to clear the history.
7.  **Custom Playlists:** Create and manage your own audio collections.
    *   Create, rename, and delete playlists on the settings page.
    *   Add the currently playing audio to a playlist directly from the player.
    *   View playlist contents and play audio from them on the settings page.

## Installation

### Developer Mode Installation

1.  Download and unzip the extension's ZIP file.
2.  Open Chrome browser and navigate to `chrome://extensions/`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked".
5.  Select the unzipped extension directory (the one containing `manifest.json`).

### Installation from Chrome Web Store (Not yet published)

1.  Visit the Chrome Web Store.
2.  Search for "Bilibili Audio Player".
3.  Click "Add to Chrome".

## How to Use

### Method 1: On a Bilibili Video Page

1.  Visit any Bilibili video page.
2.  Click the "Extract Audio" floating button that appears in the bottom right corner of the page.
3.  The audio will open in a new window and start playing automatically.

### Method 2: Using the Extension Icon

1.  Click the extension icon in the Chrome toolbar.
2.  If the current page is a Bilibili video page, it will display video information and a "Play this video's audio" button.
3.  Alternatively, manually enter a Bilibili video link and click "Extract and Play Audio".

### Setting SESSDATA (For accessing videos that require login)

1.  Click the "Settings" link at the bottom of the extension popup.
2.  Enter your SESSDATA on the settings page.
3.  Click "Save Settings".

How to obtain SESSDATA:
1.  Log in to the Bilibili website.
2.  Press F12 to open developer tools.
3.  Go to the Application tab.
4.  Find Cookies > bilibili.com on the left side.
5.  Find the cookie named SESSDATA and copy its value.

## Player Usage

The player window offers the following controls:
-   Play/Pause control
-   Seekable progress bar
-   Volume adjustment
-   Add to Playlist button (add the current audio to one of your custom playlists)
-   Settings button (quick access to the settings page)

## Important Notes

-   This extension is for personal study and use only.
-   Please respect Bilibili's copyright and terms of use.
-   Some videos may require login to extract audio.
-   If you encounter issues, try updating SESSDATA or checking your network connection.
