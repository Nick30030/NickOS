// ==============================================================================
// NICK OS FOCUS GUARD POPUP DIAGNOSTICS SCRIPT
// ==============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  const sessionStatusBadge = document.getElementById('sessionStatusBadge');
  const activeTaskTitle = document.getElementById('activeTaskTitle');
  const modeText = document.getElementById('modeText');
  const blockedCountText = document.getElementById('blockedCountText');
  const currentDomainText = document.getElementById('currentDomainText');
  const currentDomainStatus = document.getElementById('currentDomainStatus');
  const ruleReasonText = document.getElementById('ruleReasonText');
  const syncBtn = document.getElementById('syncBtn');

  // Load cached diagnostic state
  const data = await chrome.storage.local.get(['latestSessionData', 'blockedCount']);
  const sessionData = data.latestSessionData;
  const blockedCount = data.blockedCount || 0;

  blockedCountText.textContent = `${blockedCount} Sites Blocked`;

  if (sessionData) {
    const { isProtectionActive, sessionState, taskTitle, settings } = sessionData;

    if (isProtectionActive) {
      sessionStatusBadge.textContent = 'Enforcing';
      sessionStatusBadge.className = 'badge active';
    } else {
      sessionStatusBadge.textContent = sessionState || 'Paused';
      sessionStatusBadge.className = 'badge paused';
    }

    activeTaskTitle.textContent = taskTitle || (sessionState === 'active' ? 'Active Focus Session' : 'No Active Session');
    if (settings) {
      modeText.textContent = `Mode: ${settings.mode.toUpperCase()}`;
    }
  }

  // Get active tab domain
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const urlObj = new URL(tab.url);
      const domain = urlObj.hostname;
      currentDomainText.textContent = domain;

      if (sessionData && sessionData.settings) {
        const { mode, blockedDomains, allowedDomains } = sessionData.settings;
        const isBlockedInBlacklist = mode === 'blacklist' && blockedDomains.some(d => domain.includes(d));
        const isAllowedInWhitelist = mode === 'whitelist' && allowedDomains.some(d => domain.includes(d));

        if (!sessionData.isProtectionActive) {
          currentDomainStatus.textContent = '🟢 Allowed (Protection Paused)';
          currentDomainStatus.className = 'status-text status-allowed';
          ruleReasonText.textContent = 'Session is not active; blocking suspended.';
        } else if (mode === 'blacklist') {
          if (isBlockedInBlacklist) {
            currentDomainStatus.textContent = '🔴 Blocked by Blacklist Rule';
            currentDomainStatus.className = 'status-text status-blocked';
            ruleReasonText.textContent = `Domain ${domain} matches blacklisted domain pattern.`;
          } else {
            currentDomainStatus.textContent = '🟢 Allowed by Blacklist Mode';
            currentDomainStatus.className = 'status-text status-allowed';
            ruleReasonText.textContent = `Domain ${domain} is not in blocked list.`;
          }
        } else if (mode === 'whitelist') {
          if (isAllowedInWhitelist || domain.includes('localhost')) {
            currentDomainStatus.textContent = '🟢 Allowed by Whitelist Rule';
            currentDomainStatus.className = 'status-text status-allowed';
            ruleReasonText.textContent = `Domain ${domain} is on your Whitelist.`;
          } else {
            currentDomainStatus.textContent = '🔴 Blocked by Whitelist (Monk Mode)';
            currentDomainStatus.className = 'status-text status-blocked';
            ruleReasonText.textContent = `Domain ${domain} is NOT in allowed domains list.`;
          }
        }
      }
    } else {
      currentDomainText.textContent = 'New Tab / Internal';
      currentDomainStatus.textContent = '🟢 Allowed';
    }
  } catch (err) {
    currentDomainText.textContent = 'Unavailable';
  }

  syncBtn.addEventListener('click', () => {
    syncBtn.textContent = 'Syncing...';
    chrome.runtime.sendMessage({ action: 'sync' }, () => {
      setTimeout(() => window.location.reload(), 600);
    });
  });
});
