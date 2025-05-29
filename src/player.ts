// Player page script
import { Playlist, PlaylistItem } from './utils/playlistTypes'; // 1. Import Playlist Types
import { HistoryItem, BilibiliVideoInfo, AuthConfig } from "./utils/types"; // Import shared types


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
  
  // Playlist specific DOM elements
  const playlistInfoDiv = document.getElementById('playlist-info') as HTMLDivElement;
  const playlistNameEl = document.getElementById('playlist-name') as HTMLParagraphElement;
  const playlistTrackIndicatorEl = document.getElementById('playlist-track-indicator') as HTMLParagraphElement;
  const prevTrackBtn = document.getElementById('prev-track-btn') as HTMLButtonElement;
  const nextTrackBtn = document.getElementById('next-track-btn') as HTMLButtonElement;

  // Modal DOM elements
  const customModalOverlay = document.getElementById('custom-modal-overlay') as HTMLDivElement;
  const modalTitle = document.getElementById('modal-title') as HTMLHeadingElement;
  const modalMessageText = document.getElementById('modal-message-text') as HTMLParagraphElement;
  const modalPlaylistList = document.getElementById('modal-playlist-list') as HTMLUListElement;
  const modalConfirmBtn = document.getElementById('modal-confirm-btn') as HTMLButtonElement;
  const modalCancelBtn = document.getElementById('modal-cancel-btn') as HTMLButtonElement;

  let videoData: CurrentTrackData | null = null; // Updated type
  
  // State variables for playlist
  let currentPlaylist: PlaylistItem[] | null = null;
  let currentPlaylistName: string | null = null;
  let currentTrackIndex: number = -1;
  let isPlaylistMode: boolean = false;

  // Interface for current track data
  interface CurrentTrackData {
    title: string;
    audioUrl: string; // This will be the fresh, temporary URL
    bvid: string;
    cid: string; 
    aid?: string; // Optional, as bvid is primary
  } // CurrentTrackData is specific to player.ts, so it stays.
  // It's often a subset or slightly different version of BilibiliVideoInfo for player's internal use.
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'playPlaylist') {
      isPlaylistMode = true;
      const { playlist, startIndex } = message.data as { playlist: Playlist, startIndex: number };
      currentPlaylist = playlist.items; // These items should now have bvid/cid, audioUrl is optional
      currentPlaylistName = playlist.name;
      currentTrackIndex = startIndex || 0;
      startOrContinuePlaylistPlayback(); // This will now fetch fresh audioUrl
      updatePlaylistUI();
    } else if (message.action === 'playAudio' && message.data) {
      isPlaylistMode = false;
      currentPlaylist = null;
      currentPlaylistName = null;
      currentTrackIndex = -1;
      // videoData is now expected to include bvid and cid from popup.ts
      videoData = message.data as CurrentTrackData; 
      initializePlayer(videoData);
      updatePlaylistUI();
    }
  });
  
  // Check if video data was passed via URL parameters (fallback)
  const urlParams = new URLSearchParams(window.location.search);
  const audioUrlParam = urlParams.get('audioUrl');
  const titleParam = urlParams.get('title');
  const bvidParam = urlParams.get('bvid');
  const cidParam = urlParams.get('cid'); // Added cidParam
  
  if (audioUrlParam && titleParam && bvidParam && cidParam) { // Ensure bvid and cid are present
    isPlaylistMode = false; // Ensure playlist mode is off
    videoData = {
      audioUrl: decodeURIComponent(audioUrlParam),
      title: decodeURIComponent(titleParam),
      bvid: bvidParam, // bvid is now required
      cid: cidParam,   // cid is now required
      // aid can be omitted if bvid is present or fetched if necessary
    };
    initializePlayer(videoData);
    updatePlaylistUI(); // Hide playlist UI elements
  }
  
  // Function to start or continue playlist playback
  async function startOrContinuePlaylistPlayback() {
    if (isPlaylistMode && currentPlaylist && currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length) {
      const trackItem = currentPlaylist[currentTrackIndex]; // This is a PlaylistItem
      
      // Fetch fresh audio URL using bvid and cid from trackItem
      showPlayerMessage(`正在加载: ${trackItem.title}`, 'info');
      const authConfig = await loadAuthConfig(); // Make sure loadAuthConfig is available or imported
      const freshVideoInfo = await getBilibiliAudio(
        `https://www.bilibili.com/video/${trackItem.bvid}`, // Construct URL from bvid
        authConfig,
        trackItem.cid // Pass cid directly if getBilibiliAudio can take it, or modify getBilibiliAudio
                      // For now, assuming getBilibiliAudio uses the URL to find video info including cid.
                      // If getBilibiliAudio needs cid explicitly, its signature/logic needs update.
                      // Let's assume for now it re-fetches CID if not passed or if URL is primary.
      );

      if (freshVideoInfo && freshVideoInfo.audioUrl) {
        // Map PlaylistItem and fresh info to CurrentTrackData structure
        const trackData: CurrentTrackData = { 
          title: trackItem.title, 
          audioUrl: freshVideoInfo.audioUrl, 
          bvid: trackItem.bvid, 
          cid: freshVideoInfo.cid, // Use fresh cid, should match trackItem.cid
          aid: freshVideoInfo.aid
        };
        initializePlayer(trackData);
        updatePlaylistUI(); // Update track indicator
      } else {
        showPlayerMessage(`无法加载 "${trackItem.title}"。请检查网络或视频状态。`, 'error');
        // Optionally, skip to next track or stop playback
        if (isPlaylistMode && currentPlaylist) { // Advance to next to avoid getting stuck
            currentTrackIndex++;
            if (currentTrackIndex < currentPlaylist.length) {
                startOrContinuePlaylistPlayback();
            } else {
                isPlaylistMode = false;
                showPlayerMessage('播放列表已结束。', 'info');
                updatePlaylistUI();
            }
        }
      }
    } else if (isPlaylistMode) {
      // Playlist ended or invalid state
      isPlaylistMode = false;
      showPlayerMessage('播放列表已结束或状态无效。', 'info');
      updatePlaylistUI();
    }
  }
  
  // Initialize player with video data
  async function initializePlayer(data: CurrentTrackData) { // data is the videoData for current video
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

    // Check and set favorite icon state
    const isFav = await checkIfVideoIsFavorited(videoData);
    updateFavoriteIcon(isFav);
    
    // Auto play
    audioPlayer.play().catch(error => {
      console.error('Auto-play failed:', error?.toString());
      showPlayerMessage('自动播放失败，请点击播放按钮手动播放', 'error');
    });
    
    // Initialize custom controls (including Add to Playlist button listener)
    initializeCustomControls(videoData); // Pass videoData
  }

  // Update playback history in chrome.storage.local
  async function updatePlaybackHistory(videoData: CurrentTrackData) { // Changed type to CurrentTrackData
    const newHistoryItem: HistoryItem = {
      title: videoData.title,
      bvid: videoData.bvid, // Now directly from CurrentTrackData, which should be valid
      cid: videoData.cid,   // Now directly from CurrentTrackData
      audioUrl: videoData.audioUrl, // Store the temporary fresh audio URL
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
    // Audio ended listener (for playlist progression)
    audioPlayer.addEventListener('ended', () => {
      if (isPlaylistMode && currentPlaylist) {
        currentTrackIndex++;
        if (currentTrackIndex < currentPlaylist.length) {
          startOrContinuePlaylistPlayback();
        } else {
          // Playlist ended
          isPlaylistMode = false;
          showPlayerMessage('播放列表已结束。', 'info');
          updatePlaylistUI(); // Hide playlist controls and info
        }
      }
    });

    // Next Track button listener
    nextTrackBtn.addEventListener('click', () => {
      if (isPlaylistMode && currentPlaylist && currentTrackIndex < currentPlaylist.length - 1) {
        currentTrackIndex++;
        startOrContinuePlaylistPlayback();
      }
    });

    // Previous Track button listener
    prevTrackBtn.addEventListener('click', () => {
      if (isPlaylistMode && currentPlaylist && currentTrackIndex > 0) {
        currentTrackIndex--;
        startOrContinuePlaylistPlayback();
      }
    });
    
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
        showPlayerMessage('当前无视频信息可添加或移除。', 'error');
        return;
      }

      const isCurrentlyFavorited = addToPlaylistBtn.classList.contains('is-favorited');

      if (isCurrentlyFavorited) {
        // --- Unfavorite Logic: Remove from all playlists ---
        showConfirmationModal(
          "确定要从所有播放合集中移除此歌曲吗？此操作会将其从所有包含它的合集中移除。",
          async () => { // onConfirm
            try {
              const playlistsData = await chrome.storage.local.get('userPlaylists');
              let playlists: Playlist[] = playlistsData.userPlaylists || [];
              let modified = false;

              playlists.forEach(playlist => {
                const initialLength = playlist.items.length;
                playlist.items = playlist.items.filter(item =>
                  !((currentVideoData.bvid && item.bvid === currentVideoData.bvid) ||
                    (!currentVideoData.bvid && item.audioUrl === currentVideoData.audioUrl))
                );
                if (playlist.items.length < initialLength) {
                  playlist.updatedAt = new Date().toISOString();
                  modified = true;
                }
              });

              if (modified) {
                await chrome.storage.local.set({ userPlaylists: playlists });
                showPlayerMessage('已从所有播放合集中移除。', 'success');
              } else {
                showPlayerMessage('歌曲未在任何播放合集中找到。', 'info');
              }
              updateFavoriteIcon(false);
            } catch (error) {
              console.error('Error removing from playlists:', error);
              showPlayerMessage('从播放合集中移除失败。', 'error');
            }
          }
        );
      } else {
        // --- Favorite Logic: Add to a selected playlist ---
        try {
          const playlistsData = await chrome.storage.local.get('userPlaylists');
          const playlists: Playlist[] = playlistsData.userPlaylists || [];

          if (playlists.length === 0) {
            showPlayerMessage('请先在设置页面创建播放合集。', 'error');
            // Optionally, direct them to settings or show a confirm to open settings
            showConfirmationModal(
              "您还没有创建任何播放合集。是否现在前往设置页面创建？",
              () => { chrome.runtime.openOptionsPage(); },
              () => {}, // Optional: do something on cancel
              "提示",
              "前往设置",
              "稍后"
            );
            return;
          }

          showPlaylistSelectionModal(playlists, async (selectedPlaylist) => {
            if (!selectedPlaylist) return; // User cancelled or no selection

            const isDuplicate = selectedPlaylist.items.some((item: PlaylistItem) =>
              (currentVideoData.bvid && item.bvid === currentVideoData.bvid) ||
              (!currentVideoData.bvid && item.audioUrl === currentVideoData.audioUrl)
            );

            if (isDuplicate) {
              showPlayerMessage(`"${currentVideoData.title}" 已存在于播放合集 "${selectedPlaylist.name}"。`, 'error');
              updateFavoriteIcon(true); // Ensure icon reflects favorited status
              return;
            }

            const newPlaylistItem: PlaylistItem = {
              id: Date.now().toString(),
              title: currentVideoData.title,
              bvid: currentVideoData.bvid, // currentVideoData is videoData (CurrentTrackData)
              cid: currentVideoData.cid,   // Add cid
              audioUrl: currentVideoData.audioUrl, // Store temporary fresh URL
              addedAt: new Date().toISOString(),
            };

            selectedPlaylist.items.push(newPlaylistItem);
            selectedPlaylist.updatedAt = new Date().toISOString();

            // Update the specific playlist in the overall playlists array
            const playlistIndex = playlists.findIndex(p => p.id === selectedPlaylist.id);
            if (playlistIndex > -1) {
              playlists[playlistIndex] = selectedPlaylist;
            }

            await chrome.storage.local.set({ userPlaylists: playlists });
            showPlayerMessage(`已添加到播放合集 "${selectedPlaylist.name}"`, 'success');
            updateFavoriteIcon(true);
          });

        } catch (error) {
          console.error('Error adding to playlist:', error);
          showPlayerMessage('添加到播放合集失败。', 'error');
        }
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
  function showPlayerMessage(message: string, type: 'success' | 'error' | 'info') {
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

  // --- Favorite Icon Logic ---
  function updateFavoriteIcon(isFavorited: boolean) {
    if (addToPlaylistBtn) {
      if (isFavorited) {
        addToPlaylistBtn.classList.add('is-favorited');
        addToPlaylistBtn.title = "已在播放合集中";
      } else {
        addToPlaylistBtn.classList.remove('is-favorited');
        addToPlaylistBtn.title = "添加到播放合集";
      }
    }
  }

  async function checkIfVideoIsFavorited(currentVideoData: any): Promise<boolean> {
    if (!currentVideoData || (!currentVideoData.bvid && !currentVideoData.audioUrl)) {
      return false;
    }
    try {
      const playlistsData = await chrome.storage.local.get('userPlaylists');
      const playlists: Playlist[] = playlistsData.userPlaylists || [];

      for (const playlist of playlists) {
        const isPresent = playlist.items.some((item: PlaylistItem) => 
          (currentVideoData.bvid && item.bvid === currentVideoData.bvid) ||
          (!currentVideoData.bvid && item.audioUrl === currentVideoData.audioUrl)
        );
        if (isPresent) {
          return true; // Found in at least one playlist
        }
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
    return false; // Not found in any playlist
  }
  // --- End Favorite Icon Logic ---

  // Function to update playlist UI elements
  function updatePlaylistUI() {
    if (isPlaylistMode && currentPlaylistName && currentPlaylist) {
      playlistInfoDiv.style.display = 'block';
      playlistNameEl.textContent = `播放列表: ${currentPlaylistName}`;
      playlistTrackIndicatorEl.textContent = `曲目 ${currentTrackIndex + 1} / ${currentPlaylist.length}`;
      prevTrackBtn.style.display = 'inline-block';
      nextTrackBtn.style.display = 'inline-block';
    } else {
      playlistInfoDiv.style.display = 'none';
      prevTrackBtn.style.display = 'none';
      nextTrackBtn.style.display = 'none';
    }
  }

  // --- Custom Modal Functions ---
  let currentConfirmCallback: (() => void) | null = null;
  let currentCancelCallback: (() => void) | null = null;
  let currentPlaylistSelectionCallback: ((playlist: Playlist | null) => void) | null = null;
  let selectedPlaylistForModal: Playlist | null = null;

  function showModal(isPlaylistMode: boolean) {
    modalMessageText.style.display = isPlaylistMode ? 'none' : 'block';
    modalPlaylistList.style.display = isPlaylistMode ? 'block' : 'none';
    customModalOverlay.style.display = 'flex';
  }

  function hideModal() {
    customModalOverlay.style.display = 'none';
    modalPlaylistList.innerHTML = ''; // Clear list items
    modalMessageText.textContent = '';
    // Event listeners for confirm/cancel are persistent, so they don't need to be removed here.
    // Only callbacks need to be cleared.
    // modalConfirmBtn.removeEventListener('click', handleConfirmClick);
    // modalCancelBtn.removeEventListener('click', handleCancelClick);

    // Clear callbacks
    currentConfirmCallback = null;
    currentCancelCallback = null;
    currentPlaylistSelectionCallback = null;
    selectedPlaylistForModal = null;
  }

  function handleConfirmClick() {
    if (currentPlaylistSelectionCallback) {
      currentPlaylistSelectionCallback(selectedPlaylistForModal);
    } else if (currentConfirmCallback) {
      currentConfirmCallback();
    }
    hideModal();
  }

  function handleCancelClick() {
    if (currentPlaylistSelectionCallback) {
      currentPlaylistSelectionCallback(null); // Pass null for cancellation
    } else if (currentCancelCallback) {
      currentCancelCallback();
    }
    hideModal();
  }

  modalConfirmBtn.addEventListener('click', handleConfirmClick);
  modalCancelBtn.addEventListener('click', handleCancelClick);

  // Function to show a confirmation dialog
  function showConfirmationModal(
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    title: string = "请确认",
    confirmText: string = "确定",
    cancelText: string = "取消"
  ) {
    modalTitle.textContent = title;
    modalMessageText.textContent = message;
    modalConfirmBtn.textContent = confirmText;
    modalCancelBtn.textContent = cancelText;

    currentConfirmCallback = onConfirm;
    currentCancelCallback = onCancel || (() => {}); // Default to no-op if not provided
    currentPlaylistSelectionCallback = null; // Not a playlist selection

    showModal(false); // false for !isPlaylistMode (i.e. show message, not list)
  }

  // Function to show playlist selection dialog
  function showPlaylistSelectionModal(
    playlists: Playlist[],
    onSelect: (playlist: Playlist | null) => void
  ) {
    modalTitle.textContent = "选择播放合集";
    modalPlaylistList.innerHTML = ''; // Clear previous items
    selectedPlaylistForModal = null; // Reset selection

    if (playlists.length === 0) {
      // This case should ideally be handled before calling, but as a fallback:
      modalMessageText.textContent = "没有可用的播放合集。请先创建。";
      modalPlaylistList.style.display = 'none';
      modalConfirmBtn.style.display = 'none'; // No confirm if no playlists
      modalCancelBtn.textContent = "关闭";
    } else {
      playlists.forEach(playlist => {
        const li = document.createElement('li');
        li.className = 'modal-list-item';
        li.textContent = playlist.name;
        li.dataset.playlistId = playlist.id;
        li.addEventListener('click', () => {
          // Remove 'selected' from previously selected item
          const currentSelected = modalPlaylistList.querySelector('.selected');
          if (currentSelected) currentSelected.classList.remove('selected');
          // Add 'selected' to clicked item
          li.classList.add('selected');
          selectedPlaylistForModal = playlist;
        });
        modalPlaylistList.appendChild(li);
      });
      modalConfirmBtn.style.display = 'inline-block';
      modalConfirmBtn.textContent = "确定";
      modalCancelBtn.textContent = "取消";
    }

    currentPlaylistSelectionCallback = onSelect;
    currentConfirmCallback = null;
    currentCancelCallback = () => onSelect(null); // Ensure cancel calls onSelect(null)

    showModal(true); // true for isPlaylistMode (i.e. show list)
  }
  // --- End Custom Modal Functions ---

  // Need to import getBilibiliAudio and loadAuthConfig from bilibiliApi.ts
  // This will require changes if player.ts is compiled in a way that it can't directly import
  // For extensions, often helper functions are sendMessage'd from background or content scripts
  // or direct imports work if using a bundler like webpack that handles modules.
  // Assuming direct imports work due to webpack.config.js presence:

  async function loadAuthConfig(): Promise<AuthConfig> { // Definition from bilibiliApi.ts (simplified for player context if direct import fails)
    return new Promise((resolve) => {
      chrome.storage.sync.get('authConfig', (result) => {
        resolve((result.authConfig as AuthConfig) || { SESSDATA: '' });
      });
    });
  }
  // interface AuthConfig { SESSDATA: string; } // REMOVED

  // Placeholder for getBilibiliAudio if direct import from bilibiliApi.ts is problematic
  // Ideally, this would be a direct import: import { getBilibiliAudio } from './utils/bilibiliApi';
  // For now, defining a compatible signature. Actual call might need to go via background script.
  async function getBilibiliAudio(url: string, authConfig?: AuthConfig, cidToMatch?: string): Promise<BilibiliVideoInfo | null> { // Use imported AuthConfig and BilibiliVideoInfo
      // The call is now intentionally routed through the background script, so this warning is no longer needed.
      // console.warn("getBilibiliAudio called from player.ts - ensure this is intended and works with your build setup. Consider using background script for API calls.");
      
      // Basic implementation detail assuming it might be moved to background later:
      return new Promise((resolve) => {
          chrome.runtime.sendMessage(
              { action: "getBilibiliAudio", url: url, authConfig: authConfig, cid: cidToMatch }, 
              (response) => {
                  if (chrome.runtime.lastError) {
                      console.error("Error calling getBilibiliAudio via background:", chrome.runtime.lastError.message);
                      resolve(null);
                  } else {
                      resolve(response as BilibiliVideoInfo | null);
                  }
              }
          );
      });
  }
  // interface BilibiliVideoInfo { ... } // REMOVED
});
