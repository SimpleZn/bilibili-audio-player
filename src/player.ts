// Player page script
import { Playlist, PlaylistItem } from '../utils/playlistTypes'; // 1. Import Playlist Types

// Define the HistoryItem interface
interface HistoryItem {
  title: string;
  bvid?: string;
  audioUrl: string;
  timestamp: string; // ISO string format for date/time
}

document.addEventListener('DOMContentLoaded', () => {
  const audioPlayer = document.getElementById('audio-player') as HTMLAudioElement;
  const headerTitle = document.getElementById('header-title') as HTMLHeadingElement;
  const videoTitle = document.getElementById('video-title') as HTMLDivElement;
  const videoId = document.getElementById('video-id') as HTMLDivElement;
  const statusMessage = document.getElementById('status-message') as HTMLDivElement; // 2. Updated DOM ref
  const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
  const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;
  const addToPlaylistBtn = document.getElementById('add-to-playlist-btn') as HTMLButtonElement; // 2. New DOM ref
  
  // Custom player controls
  const playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
  const playIcon = document.getElementById('play-icon') as HTMLElement;
  const progressContainer = document.getElementById('progress-container') as HTMLDivElement;
  const progressBar = document.getElementById('progress-bar') as HTMLDivElement;
  const timeDisplay = document.getElementById('time-display') as HTMLDivElement;
  const volumeIcon = document.getElementById('volume-icon') as HTMLDivElement;
  const volumeSlider = document.getElementById('volume-slider') as HTMLDivElement;
  const volumeLevel = document.getElementById('volume-level') as HTMLDivElement;
  
  let videoData = null;
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'playAudio' && message.data) {
      videoData = message.data;
      initializePlayer(videoData);
    }
  });
  
  // Check if video data was passed via URL parameters (fallback)
  const urlParams = new URLSearchParams(window.location.search);
  const audioUrlParam = urlParams.get('audioUrl');
  const titleParam = urlParams.get('title');
  const bvidParam = urlParams.get('bvid');
  
  if (audioUrlParam && titleParam) {
    videoData = {
      audioUrl: decodeURIComponent(audioUrlParam),
      title: decodeURIComponent(titleParam),
      bvid: bvidParam || ''
    };
    initializePlayer(videoData);
  }
  
  // Initialize player with video data
  async function initializePlayer(data: any) { // data is the videoData for current video
    if (!data || !data.audioUrl) {
      showPlayerMessage('无法加载音频数据', 'error');
      return;
    }
    
    // Store videoData at module level for access by other functions
    videoData = data; // Ensure videoData is assigned here

    // Update playback history
    await updatePlaybackHistory(videoData); // Pass videoData explicitly
    
    // Set video info
    headerTitle.textContent = videoData.title;
    videoTitle.textContent = videoData.title;
    videoId.textContent = `BV: ${videoData.bvid}`;
    
    // Set audio source
    audioPlayer.src = videoData.audioUrl;
    audioPlayer.volume = 0.7; // Default volume
    
    // Update volume level display
    updateVolumeLevel(audioPlayer.volume);
    
    // Auto play
    audioPlayer.play().catch(error => {
      console.error('Auto-play failed:', error);
      showPlayerMessage('自动播放失败，请点击播放按钮手动播放', 'error');
    });
    
    // Initialize custom controls (including Add to Playlist button listener)
    initializeCustomControls(videoData); // Pass videoData
  }

  // Update playback history in chrome.storage.local
  async function updatePlaybackHistory(videoData: any) {
    const newHistoryItem: HistoryItem = {
      title: videoData.title,
      bvid: videoData.bvid,
      audioUrl: videoData.audioUrl,
      timestamp: new Date().toISOString(),
    };

    try {
      const result = await chrome.storage.local.get('playbackHistory');
      let history: HistoryItem[] = result.playbackHistory || [];

      // Check for duplicates and remove if existing and not the most recent
      const existingItemIndex = history.findIndex(item => 
        (newHistoryItem.bvid && item.bvid === newHistoryItem.bvid) || 
        (!newHistoryItem.bvid && item.audioUrl === newHistoryItem.audioUrl)
      );

      if (existingItemIndex !== -1) {
        // If it's already the most recent item, do nothing
        if (existingItemIndex === 0) {
          console.log('Video is already the most recent in history.');
          return;
        }
        // Remove the existing item
        history.splice(existingItemIndex, 1);
      }

      // Add the new item to the beginning
      history.unshift(newHistoryItem);

      // Limit history to 100 items
      if (history.length > 100) {
        history = history.slice(0, 100);
      }

      await chrome.storage.local.set({ playbackHistory: history });
      console.log('Playback history updated.');
    } catch (error) {
      console.error('Error updating playback history:', error);
    }
  }
  
  // Initialize custom player controls
  function initializeCustomControls(currentVideoData: any) { // Receive videoData
    // Play/Pause button
    playPauseBtn.addEventListener('click', () => {
      if (audioPlayer.paused) {
        audioPlayer.play();
      } else {
        audioPlayer.pause();
      }
    });
    
    // Update play/pause icon based on player state
    audioPlayer.addEventListener('play', () => {
      playIcon.className = 'icon-pause';
    });
    
    audioPlayer.addEventListener('pause', () => {
      playIcon.className = 'icon-play';
    });
    
    // Progress bar
    audioPlayer.addEventListener('timeupdate', () => {
      const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      progressBar.style.width = `${progress}%`;
      
      // Update time display
      const currentTime = formatTime(audioPlayer.currentTime);
      const duration = formatTime(audioPlayer.duration);
      timeDisplay.textContent = `${currentTime} / ${duration}`;
    });
    
    // Click on progress bar to seek
    progressContainer.addEventListener('click', (e) => {
      const rect = progressContainer.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      audioPlayer.currentTime = pos * audioPlayer.duration;
    });
    
    // Volume control
    volumeIcon.addEventListener('click', () => {
      if (audioPlayer.volume > 0) {
        audioPlayer.volume = 0;
        volumeIcon.className = 'volume-icon icon-mute';
      } else {
        audioPlayer.volume = 0.7;
        volumeIcon.className = 'volume-icon icon-volume';
      }
      updateVolumeLevel(audioPlayer.volume);
    });
    
    // Click on volume slider to change volume
    volumeSlider.addEventListener('click', (e) => {
      const rect = volumeSlider.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      audioPlayer.volume = Math.max(0, Math.min(1, pos));
      updateVolumeLevel(audioPlayer.volume);
      
      // Update volume icon
      volumeIcon.className = audioPlayer.volume > 0 ? 'volume-icon icon-volume' : 'volume-icon icon-mute';
    });
    
    // Settings button
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    
    // Close button
    closeBtn.addEventListener('click', () => {
      window.close();
    });

    // Add to Playlist button event listener (5)
    addToPlaylistBtn.addEventListener('click', async () => {
      if (!currentVideoData || !currentVideoData.audioUrl) {
        showPlayerMessage('当前无视频信息可添加。', 'error');
        return;
      }

      try {
        const playlistsData = await chrome.storage.local.get('userPlaylists');
        const playlists: Playlist[] = playlistsData.userPlaylists || [];

        if (playlists.length === 0) {
          showPlayerMessage('请先在设置页面创建播放合集。', 'error');
          return;
        }

        let promptMessage = "请选择要添加到的播放合集 (输入数字):\n";
        playlists.forEach((p, index) => {
          promptMessage += `${index + 1}. ${p.name}\n`;
        });

        const choiceStr = prompt(promptMessage);
        if (choiceStr === null) return; // User cancelled

        const choiceNum = parseInt(choiceStr, 10);
        if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > playlists.length) {
          showPlayerMessage('无效的选择。', 'error');
          return;
        }

        const selectedPlaylist = playlists[choiceNum - 1];

        // Duplicate check within selected playlist
        const isDuplicate = selectedPlaylist.items.some(item => 
          (currentVideoData.bvid && item.bvid === currentVideoData.bvid) ||
          (!currentVideoData.bvid && item.audioUrl === currentVideoData.audioUrl)
        );

        if (isDuplicate) {
          showPlayerMessage(`"${currentVideoData.title}" 已存在于播放合集 "${selectedPlaylist.name}"。`, 'error');
          return;
        }

        const newPlaylistItem: PlaylistItem = {
          id: Date.now().toString(),
          title: currentVideoData.title,
          bvid: currentVideoData.bvid,
          audioUrl: currentVideoData.audioUrl,
          addedAt: new Date().toISOString(),
        };

        selectedPlaylist.items.push(newPlaylistItem);
        selectedPlaylist.updatedAt = new Date().toISOString();

        await chrome.storage.local.set({ userPlaylists: playlists });
        showPlayerMessage(`已添加到播放合集 "${selectedPlaylist.name}"`, 'success');

      } catch (error) {
        console.error('Error adding to playlist:', error);
        showPlayerMessage('添加到播放合集失败。', 'error');
      }
    });
  }
  
  // Update volume level display
  function updateVolumeLevel(volume: number) {
    volumeLevel.style.width = `${volume * 100}%`;
  }
  
  // Format time in MM:SS
  function formatTime(seconds: number) {
    if (isNaN(seconds)) return '00:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Show player status message (4. Replaces showError)
  function showPlayerMessage(message: string, type: 'success' | 'error') {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`; // Uses new class names from HTML
    statusMessage.classList.add('show');

    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusMessage.classList.remove('show');
      statusMessage.textContent = '';
      statusMessage.className = 'status-message';
    }, 3000);
  }
});
