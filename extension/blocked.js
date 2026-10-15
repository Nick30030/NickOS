document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const domain = urlParams.get('domain') || 'restricted website';
  const task = urlParams.get('task') || 'Active Focus Session';

  document.getElementById('domainTag').textContent = domain;
  document.getElementById('activeTaskText').textContent = task;

  chrome.storage.local.get(['serverUrl'], (res) => {
    if (res.serverUrl) {
      document.getElementById('returnBtn').href = res.serverUrl;
    }
  });
});
