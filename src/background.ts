// Background script for Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Bilibili Audio Player extension installed');
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPlayer' && message.data) {
    // Open player window with the extracted audio data
    chrome.windows.create({
      url: chrome.runtime.getURL(`player.html?audioUrl=${encodeURIComponent(message.data.audioUrl)}&title=${encodeURIComponent(message.data.title)}&bvid=${message.data.bvid || ''}`),
      type: 'popup',
      width: 400,
      height: 600
    });
  }
  
  // Always return true for async response
  return true;
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
