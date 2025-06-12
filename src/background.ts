import { getBilibiliAudio, initSignData } from './utils/bilibiliApi';

// Background script for Chrome extension

const RULE_ID = 1; // Define a constant for the rule ID

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    await initSignData();
    console.log('Bilibili Audio Player extension installed/updated');
  } catch (error) {
    console.error('插件启动时初始化失败:', error);
  }

  // Setup declarativeNetRequest rules
  const updateRules = async () => {
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIdsToRemove = currentRules.map(rule => rule.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIdsToRemove,
      addRules: [
        {
          id: RULE_ID,
          priority: 1,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
            requestHeaders: [
              { header: 'Referer', operation: chrome.declarativeNetRequest.HeaderOperation.SET, value: 'https://www.bilibili.com/' },
              { header: 'Origin', operation: chrome.declarativeNetRequest.HeaderOperation.SET, value: 'https://www.bilibili.com' }
            ]
          },
          condition: {
            initiatorDomains: [chrome.runtime.id],
            requestDomains: [
              "upos-hz-mirrorakam.akamaized.net",
              "cn-gotcha01-akcore.bilivideo.com",
              // Add more known Bilibili CDN domains as they are identified
              // General patterns (less specific but broader coverage)
              "*.bilivideo.com",
              "*.biliapi.net", // Might be too broad, monitor if it causes issues
              "*.akamaized.net", // Bilibili uses Akamai, might need to be more specific if it affects other Akamai-hosted sites
              "*.bilivideo.cn"
            ],
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.MEDIA]
          }
        }
      ]
    });
    console.log("DeclarativeNetRequest rules updated.");
  };

  if (details.reason === "install" || details.reason === "update") {
    await updateRules();
  } else if (details.reason === "chrome_update") {
    // Also consider updating rules on browser update, as rules can sometimes be cleared
    await updateRules();
  }
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

// The existing onInstalled listener was merged with the one above.
// Ensure other parts of the original onInstalled listener (like initSignData) are preserved.
