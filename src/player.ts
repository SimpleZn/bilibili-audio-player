// Player page script
document.addEventListener('DOMContentLoaded', () => {
  const audioPlayer = document.getElementById('audio-player') as HTMLAudioElement;
  const headerTitle = document.getElementById('header-title') as HTMLHeadingElement;
  const videoTitle = document.getElementById('video-title') as HTMLDivElement;
  const videoId = document.getElementById('video-id') as HTMLDivElement;
  const errorMessage = document.getElementById('error-message') as HTMLDivElement;
  const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
  const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;
  
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
  function initializePlayer(data: any) {
    if (!data || !data.audioUrl) {
      showError('无法加载音频数据');
      return;
    }
    
    // Set video info
    headerTitle.textContent = data.title;
    videoTitle.textContent = data.title;
    videoId.textContent = `BV: ${data.bvid}`;
    
    // Set audio source
    audioPlayer.src = data.audioUrl;
    audioPlayer.volume = 0.7; // Default volume
    
    // Update volume level display
    updateVolumeLevel(audioPlayer.volume);
    
    // Auto play
    audioPlayer.play().catch(error => {
      console.error('Auto-play failed:', error);
      showError('自动播放失败，请点击播放按钮手动播放');
    });
    
    // Initialize custom controls
    initializeCustomControls();
  }
  
  // Initialize custom player controls
  function initializeCustomControls() {
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
  
  // Show error message
  function showError(message: string) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
  }
});
