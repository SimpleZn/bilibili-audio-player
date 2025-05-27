// Popup page script
import { getBilibiliAudio, isBilibiliVideoPage, loadAuthConfig } from './utils/bilibiliApi';
import { Playlist } from './utils/playlistTypes'; // Import Playlist type

document.addEventListener('DOMContentLoaded', async () => {
  const videoUrlInput = document.getElementById('video-url') as HTMLInputElement;
  const extractBtn = document.getElementById('extract-btn') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const currentVideoInfo = document.getElementById('current-video-info') as HTMLDivElement;
  const videoTitle = document.getElementById('video-title') as HTMLDivElement;
  const playCurrentBtn = document.getElementById('play-current-btn') as HTMLButtonElement;
  const historyList = document.getElementById('history-list') as HTMLUListElement;
  const clearHistoryBtn = document.getElementById('clear-history-btn') as HTMLButtonElement;
  const moreHistoryBtn = document.getElementById('more-history-btn') as HTMLButtonElement; // Added
  const collectionList = document.getElementById('collection-list') as HTMLUListElement; // Added
  
  let currentTabUrl = '';
  let currentVideoData: any = null;

  // Define the HistoryItem interface (consistent with player.ts)
  interface HistoryItem {
    title: string;
    bvid?: string;
    audioUrl: string;
    timestamp: string;
  }

  // Helper function to format ISO date string to relative time
  function formatRelativeTime(isoTimestamp: string): string {
    const now = new Date();
    const past = new Date(isoTimestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    const units: { name: string, seconds: number }[] = [
      { name: '年', seconds: 31536000 },
      { name: '月', seconds: 2592000 },
      { name: '天', seconds: 86400 },
      { name: '小时', seconds: 3600 },
      { name: '分钟', seconds: 60 },
    ];

    for (const unit of units) {
      const interval = Math.floor(diffInSeconds / unit.seconds);
      if (interval >= 1) {
        return `${interval} ${unit.name}前`;
      }
    }
    return '刚刚';
  }

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
    
    if (type === 'success' || type === 'info') { // Also hide info messages after a delay
      setTimeout(() => {
        statusDiv.style.display = 'none';
        statusDiv.textContent = ''; // Clear text
        statusDiv.className = 'status'; // Reset class
      }, 3000);
    }
  }

  // --- Playback History Functions ---

  // Function to display playback history
  async function displayPlaybackHistory() {
    if (!historyList) return; // Should not happen if HTML is correct

    historyList.innerHTML = ''; // Clear previous items

    try {
      const result = await chrome.storage.local.get('playbackHistory');
      const history: HistoryItem[] = result.playbackHistory || [];

      if (history.length === 0) {
        const noHistoryLi = document.createElement('li');
        noHistoryLi.textContent = '暂无播放历史';
        noHistoryLi.className = 'no-history';
        historyList.appendChild(noHistoryLi);
        if(moreHistoryBtn) moreHistoryBtn.style.display = 'none'; // Ensure "More" button is hidden
        return;
      }

      const historyLimit = 6;
      const itemsToDisplay = history.slice(0, historyLimit);

      itemsToDisplay.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.dataset.audioUrl = item.audioUrl;
        li.dataset.title = item.title;
        if (item.bvid) {
          li.dataset.bvid = item.bvid;
        }

        const titleSpan = document.createElement('span');
        titleSpan.className = 'history-title';
        titleSpan.textContent = item.title;
        titleSpan.title = item.title; // Show full title on hover

        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'history-timestamp';
        timestampSpan.textContent = formatRelativeTime(item.timestamp);

        li.appendChild(titleSpan);
        li.appendChild(timestampSpan);

        li.addEventListener('click', () => {
          openPlayerWindow({
            audioUrl: item.audioUrl,
            title: item.title,
            bvid: item.bvid || ''
          });
        });
        historyList.appendChild(li);
      });

      if (history.length > historyLimit) {
        if(moreHistoryBtn) moreHistoryBtn.style.display = 'inline-block';
      } else {
        if(moreHistoryBtn) moreHistoryBtn.style.display = 'none';
      }
    } catch (error) {
      console.error('Error displaying playback history:', error);
      const errorLi = document.createElement('li');
      errorLi.textContent = '无法加载播放历史';
      errorLi.className = 'error'; // You might want to style this
      historyList.appendChild(errorLi);
    }
  }

  // --- Collections Functions ---
  async function displayCollections() {
    if (!collectionList) return;

    collectionList.innerHTML = ''; // Clear previous items

    try {
      const { userPlaylists } = await chrome.storage.local.get('userPlaylists');
      const playlists: Playlist[] = userPlaylists || [];

      if (playlists.length === 0) {
        const noCollectionsLi = document.createElement('li');
        noCollectionsLi.textContent = '暂无播放合集';
        noCollectionsLi.className = 'no-collections';
        collectionList.appendChild(noCollectionsLi);
        return;
      }

      playlists.forEach(playlist => {
        const li = document.createElement('li');
        li.className = 'collection-item';
        li.dataset.playlistId = playlist.id;

        const titleSpan = document.createElement('span');
        titleSpan.className = 'collection-title';
        titleSpan.textContent = playlist.name;
        titleSpan.title = playlist.name; // Show full title on hover

        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'collection-timestamp';
        timestampSpan.textContent = formatRelativeTime(playlist.updatedAt);

        li.appendChild(titleSpan);
        li.appendChild(timestampSpan);

        li.addEventListener('click', async () => {
          const playlistId = li.dataset.playlistId;
          if (!playlistId) {
            console.error('Playlist ID not found on clicked item.');
            showStatus('Cannot play: playlist ID missing.', 'error');
            return;
          }

          try {
            const result = await chrome.storage.local.get('userPlaylists');
            const playlists: Playlist[] = result.userPlaylists || [];
            const selectedPlaylist = playlists.find(p => p.id === playlistId);

            if (selectedPlaylist) {
              if (selectedPlaylist.items && selectedPlaylist.items.length > 0) {
                openPlayerWindowForPlaylist(selectedPlaylist, 0); // Start from the first item
                // showStatus(`Playing collection: ${selectedPlaylist.name}`, 'info'); // Optional: feedback
              } else {
                showStatus(`Collection "${selectedPlaylist.name}" is empty. Add songs in Settings.`, 'error');
              }
            } else {
              showStatus('Could not find the selected collection. It might have been deleted.', 'error');
              // Optionally, refresh the collections list here:
              // displayCollections(); 
            }
          } catch (error) {
            console.error('Error handling playlist click:', error);
            showStatus('Failed to load and play collection.', 'error');
          }
        });
        collectionList.appendChild(li);
      });
    } catch (error) {
      console.error('Error displaying collections:', error);
      const errorLi = document.createElement('li');
      errorLi.textContent = '无法加载播放合集';
      errorLi.className = 'error'; 
      collectionList.appendChild(errorLi);
    }
  }

  // Event listener for "Clear History" button
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', async () => {
      if (confirm('确定要清空所有播放历史吗？此操作无法撤销。')) { // Added confirmation
        try {
          await chrome.storage.local.remove('playbackHistory');
          showStatus('播放历史已清空', 'info');
          await displayPlaybackHistory(); // Refresh the list
        } catch (error) {
          console.error('Error clearing playback history:', error);
          showStatus('清空历史失败', 'error');
        }
      }
    });
  }

  if (moreHistoryBtn) {
    moreHistoryBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage(); // This opens settings.html
    });
  }

  // Initial call to display history
  displayPlaybackHistory();
  displayCollections(); // Added

  function openPlayerWindowForPlaylist(playlist: Playlist, startIndex: number = 0) {
    chrome.windows.create({
      url: chrome.runtime.getURL('player.html'),
      type: 'popup',
      width: 420, // Slightly wider for potential playlist UI elements in player
      height: 620 // Slightly taller
    }, (window) => {
      if (window && window.tabs && window.tabs[0] && window.tabs[0].id) {
        const tabId = window.tabs[0].id;
        // Wait for the player window to load its scripts
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, {
            action: 'playPlaylist',
            data: {
              playlist: playlist,
              startIndex: startIndex
            }
          }, () => {
            if (chrome.runtime.lastError) {
              console.error("Error sending playPlaylist message:", chrome.runtime.lastError.message);
              // Optional: showStatus('Player communication error.', 'error');
            }
          });
        }, 500); 
      } else {
          console.error("Could not get tab ID for the new player window.");
          // Optional: showStatus("Failed to open player window.", "error");
      }
    });
  }
});
