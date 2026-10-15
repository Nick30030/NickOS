document.addEventListener('DOMContentLoaded', () => {
  const serverUrlInput = document.getElementById('serverUrlInput');
  const saveBtn = document.getElementById('saveBtn');
  const msg = document.getElementById('msg');

  chrome.storage.local.get(['serverUrl'], (res) => {
    if (res.serverUrl) serverUrlInput.value = res.serverUrl;
  });

  saveBtn.addEventListener('click', async () => {
    const val = serverUrlInput.value.trim().replace(/\/+$/, '');
    try {
      const url = new URL(val);
      if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
        throw new Error('Enter only the NickOS origin, e.g. https://nickos.ai.studio');
      }
      await chrome.storage.local.set({ serverUrl: url.origin });
      const response = await chrome.runtime.sendMessage({ action: 'sync' });
      if (!response?.ok) throw new Error(response?.error || 'Extension worker unavailable. Reload the extension.');
      msg.textContent = 'Configuration saved. Server synchronization successful.';
      msg.style.color = '#34d399';
      msg.style.display = 'block';
    } catch (error) {
      msg.textContent = error.message;
      msg.style.color = '#f87171';
      msg.style.display = 'block';
    }
  });
});
