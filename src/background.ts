import { getBilibiliAudio, loadAuthConfig } from './utils/bilibiliApi';

// Background script for Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Bilibili Audio Player extension installed');
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getCookies") {
    // Get cookies from Bilibili domain
    chrome.cookies.getAll({ domain: "bilibili.com" }, (cookies) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting cookies:", chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      const SESSDATA = cookies.find(cookie => cookie.name === "SESSDATA")?.value || "";
      sendResponse({ SESSDATA });
    });
    return true; // Indicates that the response is sent asynchronously
  } else if (message.action === "getBilibiliAudio") {
    // Forward the call to the actual getBilibiliAudio utility function
    // Ensure authConfig is handled correctly, perhaps by loading it here or passing SESSDATA if available
    const { url, authConfig, cid } = message; // cid might be used in future refined getBilibiliAudio

    // It's better if player.ts/popup.ts call loadAuthConfig themselves and pass it.
    // Or, background could load it if SESSDATA isn't directly part of message for some reason.
    // For now, assuming authConfig is passed in the message as per player.ts placeholder.
    
    getBilibiliAudio(url, authConfig)
      .then(videoInfo => {
        sendResponse(videoInfo);
      })
      .catch(error => {
        console.error('Error in background handling getBilibiliAudio:', error);
        sendResponse(null); // Send null or an error object on failure
      });
    return true; // Indicates that the response is sent asynchronously
  } else if (message.action === "openOptionsPage") {
    chrome.runtime.openOptionsPage();
    sendResponse({ status: "Options page opened or focused" });
    return false; // Synchronous response
  } else if (message.action === 'openPlayer' && message.data) {
    // Open player window with the extracted audio data
    chrome.windows.create({
      url: chrome.runtime.getURL(`player.html?audioUrl=${encodeURIComponent(message.data.audioUrl)}&title=${encodeURIComponent(message.data.title)}&bvid=${message.data.bvid || ''}`),
      type: 'popup',
      width: 400,
      height: 600
    });
  }
  // Add other message handlers if needed
  return false; // Default for synchronous messages if no handler matches
});

// Add context menu for Bilibili video links
chrome.contextMenus.create({
  id: 'extractBilibiliAudio',
  title: '提取并播放音频',
  contexts: ['link'],
  documentUrlPatterns: ['*://*.bilibili.com/*']
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'extractBilibiliAudio' && info.linkUrl) {
    // Send message to popup to handle extraction
    chrome.runtime.sendMessage({
      action: 'extractFromUrl',
      url: info.linkUrl
    });
  }
});

// Optional: Listener for when the extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Bilibili Audio Player extension installed.");
    // Perform any first-time setup here, like initializing default settings
  } else if (details.reason === "update") {
    const thisVersion = chrome.runtime.getManifest().version;
    console.log(
      `Bilibili Audio Player extension updated from ${details.previousVersion} to ${thisVersion}!`
    );
  }
});
