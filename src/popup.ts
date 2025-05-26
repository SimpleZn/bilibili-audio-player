// Popup page script
import { getBilibiliAudio, isBilibiliVideoPage, loadAuthConfig } from './utils/bilibiliApi';

document.addEventListener('DOMContentLoaded', async () => {
  const videoUrlInput = document.getElementById('video-url') as HTMLInputElement;
  const extractBtn = document.getElementById('extract-btn') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const currentVideoInfo = document.getElementById('current-video-info') as HTMLDivElement;
  const videoTitle = document.getElementById('video-title') as HTMLDivElement;
  const playCurrentBtn = document.getElementById('play-current-btn') as HTMLButtonElement;
  
  let currentTabUrl = '';
  let currentVideoData: any = null;

  // Check if current tab is a Bilibili video page
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url) {
      currentTabUrl = tabs[0].url;
      
      if (isBilibiliVideoPage(currentTabUrl)) {
        // Pre-fill the input with current tab URL
        videoUrlInput.value = currentTabUrl;
        
        // Try to extract info from current page
        await extractVideoInfo(currentTabUrl, true);
      }
    }
  } catch (error) {
    console.error('Error checking current tab:', error);
  }

  // Extract button click handler
  extractBtn.addEventListener('click', async () => {
    const url = videoUrlInput.value.trim();
    if (!url) {
      showStatus('请输入 Bilibili 视频链接', 'error');
      return;
    }
    
    await extractVideoInfo(url);
  });
  
  // Play current video button click handler
  playCurrentBtn.addEventListener('click', async () => {
    if (currentVideoData) {
      openPlayerWindow(currentVideoData);
    }
  });

  // Function to extract video info and show status
  async function extractVideoInfo(url: string, isCurrentTab = false) {
    try {
      // Show loading state
      extractBtn.disabled = true;
      extractBtn.innerHTML = '<span class="loading"></span>提取中...';
      showStatus('正在提取音频信息...', 'info');
      
      // Load auth config
      const authConfig = await loadAuthConfig();
      
      // Get audio info
      const videoInfo = await getBilibiliAudio(url, authConfig);
      
      if (!videoInfo) {
        throw new Error('无法提取音频信息，请检查链接或登录状态');
      }
      
      // Store current video data
      currentVideoData = videoInfo;
      
      if (isCurrentTab) {
        // Show current video info section
        currentVideoInfo.style.display = 'block';
        videoTitle.textContent = videoInfo.title;
      } else {
        // Open player window directly
        openPlayerWindow(videoInfo);
        showStatus('音频提取成功！正在打开播放器...', 'success');
      }
    } catch (error) {
      console.error('Error extracting video info:', error);
      showStatus((error as Error).message || '提取失败，请检查链接或网络连接', 'error');
    } finally {
      // Reset button state
      extractBtn.disabled = false;
      extractBtn.textContent = '提取并播放音频';
    }
  }

  // Function to open player window
  function openPlayerWindow(videoData: any) {
    // Create a new window for the player
    chrome.windows.create({
      url: chrome.runtime.getURL('player.html'),
      type: 'popup',
      width: 400,
      height: 600
    }, (window) => {
      // Send video data to the player window
      if (window && window.tabs && window.tabs[0] && window.tabs[0].id) {
        // Wait for the player window to load
        setTimeout(() => {
          chrome.tabs.sendMessage(window.tabs?.[0]?.id || 0, {
            action: 'playAudio',
            data: videoData
          });
        }, 500);
      }
    });
  }

  // Function to show status message
  function showStatus(message: string, type: 'success' | 'error' | 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
    }
  }
});
