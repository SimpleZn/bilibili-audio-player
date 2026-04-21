import { getBilibiliAudio, initSignData } from './utils/bilibiliApi';

// Inject correct Referer for Bilibili CDN so <audio> element is not 403'd
function setupCdnHeaderRules() {
  const makeRule = (id: number, urlFilter: string): chrome.declarativeNetRequest.Rule => ({
    id,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      requestHeaders: [
        { header: 'Referer', operation: chrome.declarativeNetRequest.HeaderOperation.SET, value: 'https://www.bilibili.com' },
        { header: 'Origin',  operation: chrome.declarativeNetRequest.HeaderOperation.SET, value: 'https://www.bilibili.com' },
      ],
    },
    condition: {
      urlFilter,
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.MEDIA,
        chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
        chrome.declarativeNetRequest.ResourceType.OTHER,
      ],
    },
  });

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1001, 1002],
    addRules: [
      makeRule(1001, '||bilivideo.com'),
      makeRule(1002, '||bilivideo.cn'),
    ],
  });
}

// Build full cookie string from browser-stored bilibili.com cookies
function getBilibiliCookieString(): Promise<string> {
  return new Promise(resolve => {
    chrome.cookies.getAll({ domain: 'bilibili.com' }, cookies => {
      if (chrome.runtime.lastError || !cookies) {
        resolve('');
        return;
      }
      resolve(cookies.map(c => `${c.name}=${c.value}`).join('; '));
    });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  try {
    setupCdnHeaderRules();
    await initSignData();
    console.log('Bilibili Audio Player extension installed');
  } catch (error) {
    console.error('插件启动时初始化失败:', error);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getCookies') {
    getBilibiliCookieString().then(cookieString => {
      const SESSDATA = cookieString.match(/SESSDATA=([^;]+)/)?.[1] || '';
      sendResponse({ SESSDATA, cookieString });
    });
    return true;

  } else if (message.action === 'getBilibiliAudio') {
    const { url, authConfig } = message;

    getBilibiliCookieString().then(async cookieString => {
      const enrichedAuth = {
        SESSDATA: authConfig?.SESSDATA || cookieString.match(/SESSDATA=([^;]+)/)?.[1] || '',
        cookieString: cookieString || (authConfig?.SESSDATA ? `SESSDATA=${authConfig.SESSDATA}` : ''),
      };
      try {
        const videoInfo = await getBilibiliAudio(url, enrichedAuth);
        sendResponse(videoInfo);
      } catch (error) {
        console.error('Error in background getBilibiliAudio:', error);
        sendResponse(null);
      }
    });
    return true;

  } else if (message.action === 'openOptionsPage') {
    chrome.runtime.openOptionsPage();
    sendResponse({ status: 'Options page opened or focused' });
    return false;

  } else if (message.action === 'openPlayer' && message.data) {
    chrome.windows.create({
      url: chrome.runtime.getURL(`player.html?audioUrl=${encodeURIComponent(message.data.audioUrl)}&title=${encodeURIComponent(message.data.title)}&bvid=${message.data.bvid || ''}&cid=${message.data.cid || ''}`),
      type: 'popup',
      width: 400,
      height: 600,
    });
  }
  return false;
});

chrome.contextMenus.create({
  id: 'extractBilibiliAudio',
  title: '提取并播放音频',
  contexts: ['link'],
  documentUrlPatterns: ['*://*.bilibili.com/*'],
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'extractBilibiliAudio' && info.linkUrl) {
    chrome.runtime.sendMessage({ action: 'extractFromUrl', url: info.linkUrl });
  }
});
