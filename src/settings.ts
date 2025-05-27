// Settings page script
import { Playlist, PlaylistItem } from '../utils/playlistTypes'; // 1. Import Playlist Types

document.addEventListener('DOMContentLoaded', async () => {
  const sessdataInput = document.getElementById('sessdata') as HTMLInputElement;
  const saveButton = document.getElementById('save-btn') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  // Playlist Management DOM Elements (2)
  const newPlaylistNameInput = document.getElementById('new-playlist-name') as HTMLInputElement;
  const createPlaylistBtn = document.getElementById('create-playlist-btn') as HTMLButtonElement;
  const playlistListContainer = document.getElementById('playlist-list-container') as HTMLDivElement;
  const playlistManagementSection = playlistListContainer.parentElement as HTMLDivElement; // Assuming .section-container

  // Playlist Items View DOM Elements (1)
  const playlistItemsView = document.getElementById('playlist-items-view') as HTMLDivElement;
  const playlistItemsTitle = document.getElementById('playlist-items-title') as HTMLHeadingElement;
  const backToPlaylistsBtn = document.getElementById('back-to-playlists-btn') as HTMLButtonElement;
  const playlistItemsList = document.getElementById('playlist-items-list') as HTMLUListElement;


  // --- Utility to show status messages ---
  function showStatus(message: string, type: 'success' | 'error') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block'; // Make sure it's visible

    // Hide message after 3 seconds
    setTimeout(() => {
      statusDiv.style.display = 'none';
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 3000);
  }
  
  // Load existing SESSDATA settings
  try {
    const { authConfig } = await chrome.storage.sync.get('authConfig');
    if (authConfig && authConfig.SESSDATA) {
      sessdataInput.value = authConfig.SESSDATA;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }

  // Save SESSDATA settings
  saveButton.addEventListener('click', async () => {
    const SESSDATA = sessdataInput.value.trim();
    
    try {
      await chrome.storage.sync.set({
        authConfig: { SESSDATA }
      });
      showStatus('SESSDATA 设置已保存！', 'success');
    } catch (error) {
      console.error('Error saving SESSDATA settings:', error);
      showStatus('保存 SESSDATA 设置时出错，请重试。', 'error');
    }
  });

  // --- Playlist Management ---

  // 3. loadPlaylists Function
  async function loadPlaylists() {
    try {
      const data = await chrome.storage.local.get('userPlaylists');
      const playlists: Playlist[] = data.userPlaylists || [];
      renderPlaylists(playlists);
    } catch (error) {
      console.error('Error loading playlists:', error);
      showStatus('加载播放合集失败。', 'error');
      renderPlaylists([]); // Render empty state
    }
  }

  // 4. renderPlaylists Function
  function renderPlaylists(playlists: Playlist[]) {
    playlistListContainer.innerHTML = ''; // Clear existing content

    if (!playlists || playlists.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = '暂无播放合集。';
      emptyMessage.className = 'empty-message';
      playlistListContainer.appendChild(emptyMessage);
      return;
    }

    const ul = document.createElement('ul');
    playlists.forEach(playlist => {
      const li = document.createElement('li');
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'playlist-name';
      nameSpan.textContent = playlist.name;
      nameSpan.title = playlist.name; // Set title attribute for full name on hover
      nameSpan.addEventListener('click', () => { 
        displayPlaylistItems(playlist.id);
      });
      li.appendChild(nameSpan);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'playlist-actions';

      const renameBtn = document.createElement('button');
      renameBtn.textContent = '重命名';
      renameBtn.className = 'rename-playlist-btn';
      renameBtn.dataset.playlistId = playlist.id;
      renameBtn.addEventListener('click', () => _renamePlaylist(playlist.id, playlist.name)); // Corrected: Wrapped in arrow function
      actionsDiv.appendChild(renameBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '删除';
      deleteBtn.className = 'delete-playlist-btn';
      deleteBtn.dataset.playlistId = playlist.id;
      deleteBtn.addEventListener('click', () => _deletePlaylist(playlist.id)); // Corrected: Wrapped in arrow function
      actionsDiv.appendChild(deleteBtn);
      
      li.appendChild(actionsDiv);
      ul.appendChild(li);
    });
    playlistListContainer.appendChild(ul);
  }

  // 5. Create Playlist Functionality
  createPlaylistBtn.addEventListener('click', async () => {
    const name = newPlaylistNameInput.value.trim();
    if (!name) {
      showStatus('请输入播放合集名称。', 'error');
      return;
    }

    try {
      const data = await chrome.storage.local.get('userPlaylists');
      const playlists: Playlist[] = data.userPlaylists || [];

      // Check for duplicate names
      if (playlists.some(p => p.name === name)) {
        showStatus('已存在同名播放合集。', 'error');
        return;
      }

      const newPlaylist: Playlist = {
        id: Date.now().toString(), // Simple unique ID
        name: name,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      playlists.push(newPlaylist);
      await chrome.storage.local.set({ userPlaylists: playlists });
      
      newPlaylistNameInput.value = ''; // Clear input
      showStatus(`播放合集 "${name}" 创建成功！`, 'success');
      await loadPlaylists(); // Refresh list
    } catch (error) {
      console.error('Error creating playlist:', error);
      showStatus('创建播放合集失败。', 'error');
    }
  });

  // 6. Delete Playlist Functionality
  async function _deletePlaylist(playlistId: string) {
    if (!confirm("确定要删除这个播放合集吗？其包含的所有歌曲信息也将被移除。")) {
      return;
    }
    try {
      const data = await chrome.storage.local.get('userPlaylists');
      let playlists: Playlist[] = data.userPlaylists || [];
      playlists = playlists.filter(p => p.id !== playlistId);
      await chrome.storage.local.set({ userPlaylists: playlists });
      showStatus('播放合集已删除。', 'success');
      await loadPlaylists();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      showStatus('删除播放合集失败。', 'error');
    }
  }

  // 7. Rename Playlist Functionality
  async function _renamePlaylist(playlistId: string, currentName: string) {
    const newName = prompt("请输入新的播放合集名称：", currentName);
    if (newName && newName.trim() !== "" && newName.trim() !== currentName) {
      try {
        const data = await chrome.storage.local.get('userPlaylists');
        let playlists: Playlist[] = data.userPlaylists || [];
        
        // Check for duplicate names (excluding the current playlist being renamed)
        if (playlists.some(p => p.name === newName.trim() && p.id !== playlistId)) {
          showStatus('已存在其他同名播放合集。', 'error');
          return;
        }

        const playlistIndex = playlists.findIndex(p => p.id === playlistId);
        if (playlistIndex > -1) {
          playlists[playlistIndex].name = newName.trim();
          playlists[playlistIndex].updatedAt = new Date().toISOString();
          await chrome.storage.local.set({ userPlaylists: playlists });
          showStatus('播放合集已重命名。', 'success');
          await loadPlaylists();
        }
      } catch (error) {
        console.error('Error renaming playlist:', error);
        showStatus('重命名播放合集失败。', 'error');
      }
    } else if (newName === null) {
      // User cancelled prompt, do nothing
    } else {
      showStatus('名称无效或未更改。', 'error');
    }
  }

  // 8. Initial Load for playlists
  loadPlaylists();

  // --- Playlist Items View Logic --- (2)

  // View State Management
  function showPlaylistListView() {
    if (playlistManagementSection) { // Show the main playlist creation/list section
        // Find direct children of container that are form-group or playlist-list-container for playlist creation/listing
        Array.from(playlistManagementSection.children).forEach(child => {
            if (child.id === 'playlist-list-container' || 
                child.classList.contains('form-group') || // for new playlist input
                child === createPlaylistBtn) { // for create button
                 (child as HTMLElement).style.display = '';
            }
        });
    }
    if (playlistItemsView) playlistItemsView.style.display = 'none';
  }

  function showItemsView() {
     if (playlistManagementSection) { // Hide the main playlist creation/list section elements
        Array.from(playlistManagementSection.children).forEach(child => {
            if (child.id === 'playlist-list-container' || 
                child.classList.contains('form-group') || // for new playlist input
                child === createPlaylistBtn) { // for create button
                (child as HTMLElement).style.display = 'none';
            }
        });
    }
    if (playlistItemsView) playlistItemsView.style.display = 'block';
  }

  // Back to Playlists button (7)
  backToPlaylistsBtn.addEventListener('click', showPlaylistListView);
  
  // displayPlaylistItems Function (3)
  async function displayPlaylistItems(playlistId: string) {
    try {
      const data = await chrome.storage.local.get('userPlaylists');
      const playlists: Playlist[] = data.userPlaylists || [];
      const playlist = playlists.find(p => p.id === playlistId);

      if (!playlist) {
        showStatus('无法找到播放合集。', 'error');
        showPlaylistListView(); // Go back to list view if playlist not found
        return;
      }

      playlistItemsTitle.textContent = `播放合集: ${playlist.name}`;
      playlistItemsList.innerHTML = ''; // Clear previous items

      if (playlist.items.length === 0) {
        const noItemsMsg = document.createElement('li');
        noItemsMsg.className = 'no-items-message';
        noItemsMsg.textContent = '此播放合集暂无歌曲。';
        playlistItemsList.appendChild(noItemsMsg);
      } else {
        playlist.items.forEach(item => {
          const li = document.createElement('li');
          
          const itemInfoDiv = document.createElement('div');
          itemInfoDiv.className = 'item-info';
          
          const itemTitleSpan = document.createElement('span');
          itemTitleSpan.className = 'item-title';
          itemTitleSpan.textContent = item.title;
          itemTitleSpan.title = item.title; // Set title attribute for full name on hover
          itemTitleSpan.addEventListener('click', () => _playPlaylistItem(item));
          itemInfoDiv.appendChild(itemTitleSpan);

          if (item.bvid) {
            const itemDetailsSpan = document.createElement('span');
            itemDetailsSpan.className = 'item-details';
            itemDetailsSpan.textContent = ` (BV: ${item.bvid}) - 添加于: ${new Date(item.addedAt).toLocaleDateString()}`;
            itemInfoDiv.appendChild(itemDetailsSpan);
          } else {
            const itemDetailsSpan = document.createElement('span');
            itemDetailsSpan.className = 'item-details';
            itemDetailsSpan.textContent = ` - 添加于: ${new Date(item.addedAt).toLocaleDateString()}`;
            itemInfoDiv.appendChild(itemDetailsSpan);
          }
          li.appendChild(itemInfoDiv);

          const itemActionsDiv = document.createElement('div');
          itemActionsDiv.className = 'item-actions';
          
          const removeBtn = document.createElement('button');
          removeBtn.textContent = '移除';
          removeBtn.className = 'remove-item-btn';
          removeBtn.title = '从此播放合集中移除';
          removeBtn.addEventListener('click', () => _removePlaylistItem(playlist.id, item.id));
          itemActionsDiv.appendChild(removeBtn);
          
          li.appendChild(itemActionsDiv);
          playlistItemsList.appendChild(li);
        });
      }
      showItemsView();
    } catch (error) {
      console.error('Error displaying playlist items:', error);
      showStatus('加载播放合集歌曲失败。', 'error');
      showPlaylistListView();
    }
  }

  // _playPlaylistItem Function (4)
  function _playPlaylistItem(item: PlaylistItem) {
    // Open player window with the item data
    // This is similar to background.ts or popup.ts logic for opening player
    const playerUrl = chrome.runtime.getURL(
      `player.html?audioUrl=${encodeURIComponent(item.audioUrl)}&title=${encodeURIComponent(item.title)}&bvid=${item.bvid || ''}`
    );
    chrome.windows.create({
      url: playerUrl,
      type: 'popup',
      width: 400,
      height: 600
    });
  }

  // _removePlaylistItem Function (6)
  async function _removePlaylistItem(playlistId: string, itemId: string) {
    if (!confirm("确定要从此播放合集中移除这首歌曲吗？")) {
      return;
    }
    try {
      const data = await chrome.storage.local.get('userPlaylists');
      let playlists: Playlist[] = data.userPlaylists || [];
      const playlistIndex = playlists.findIndex(p => p.id === playlistId);

      if (playlistIndex === -1) {
        showStatus('无法找到播放合集。', 'error');
        return;
      }
      
      const originalItemCount = playlists[playlistIndex].items.length;
      playlists[playlistIndex].items = playlists[playlistIndex].items.filter(item => item.id !== itemId);

      if (playlists[playlistIndex].items.length < originalItemCount) {
        playlists[playlistIndex].updatedAt = new Date().toISOString();
        await chrome.storage.local.set({ userPlaylists: playlists });
        showStatus('歌曲已从播放合集中移除。', 'success');
        // Refresh the current view of items for this playlist
        await displayPlaylistItems(playlistId); 
      } else {
        showStatus('未找到要移除的歌曲，或移除失败。', 'error');
      }
    } catch (error) {
      console.error('Error removing playlist item:', error);
      showStatus('移除歌曲失败。', 'error');
    }
  }
});
