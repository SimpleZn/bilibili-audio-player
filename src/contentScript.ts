// Content script for Bilibili pages
import { getBilibiliAudio } from './utils/bilibiliApi';
import { isBilibiliVideoPage, loadAuthConfig } from './utils/util';

// Check if current page is a Bilibili video page
if (isBilibiliVideoPage(window.location.href)) {
  console.log('Bilibili video page detected');
  
  // Add a floating button to extract audio
  const floatingButton = document.createElement('div');
  floatingButton.innerHTML = `
    <div id="bili-audio-extract-btn" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #fb7299;
      color: white;
      padding: 10px 15px;
      border-radius: 20px;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
    ">
      <span style="margin-right: 5px;">🎵</span>
      提取音频
    </div>
  `;
  
  document.body.appendChild(floatingButton);
  
  // Add click event to the floating button
  document.getElementById('bili-audio-extract-btn')?.addEventListener('click', async () => {
    try {
      // Get current video URL
      const url = window.location.href;
      
      // Load auth config
      const authConfig = await loadAuthConfig();
      
      // Extract audio URL
      const videoInfo = await getBilibiliAudio(url, authConfig);
      
      if (videoInfo) {
        // Send message to background script to open player
        chrome.runtime.sendMessage({
          action: 'openPlayer',
          data: videoInfo
        });
      } else {
        alert('无法提取音频，请检查登录状态或视频可用性');
      }
    } catch (error) {
      console.error('Error extracting audio:', error);
      alert('提取音频失败: ' + (error as Error).message || '未知错误');
    }
  });
}
