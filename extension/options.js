document.addEventListener('DOMContentLoaded', () => {
  const serverUrlInput = document.getElementById('serverUrlInput');
  const saveBtn = document.getElementById('saveBtn');
  const msg = document.getElementById('msg');

  chrome.storage.local.get(['serverUrl'], (res) => {
    if (res.serverUrl) serverUrlInput.value = res.serverUrl;
  });

  saveBtn.addEventListener('click', () => {
    const val = serverUrlInput.value.trim().replace(/\/+$/, '');
    chrome.storage.local.set({ serverUrl: val }, () => {
      msg.style.display = 'block';
      setTimeout(() => msg.style.display = 'none', 2500);
    });
  });
});
