// Settings page script
document.addEventListener('DOMContentLoaded', async () => {
  const sessdataInput = document.getElementById('sessdata') as HTMLInputElement;
  const saveButton = document.getElementById('save-btn') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  // Load existing settings
  try {
    const { authConfig } = await chrome.storage.sync.get('authConfig');
    if (authConfig && authConfig.SESSDATA) {
      sessdataInput.value = authConfig.SESSDATA;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }

  // Save settings
  saveButton.addEventListener('click', async () => {
    const SESSDATA = sessdataInput.value.trim();
    
    try {
      await chrome.storage.sync.set({
        authConfig: { SESSDATA }
      });
      
      statusDiv.textContent = '设置已保存！';
      statusDiv.className = 'status success';
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      statusDiv.textContent = '保存设置时出错，请重试。';
      statusDiv.className = 'status error';
    }
  });
});
