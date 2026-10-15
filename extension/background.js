// ==============================================================================
// NICK OS FOCUS GUARD — MANIFEST V3 BACKGROUND SERVICE WORKER
// Dynamic DeclarativeNetRequest Engine Synchronized to Real Execution Sessions
// ==============================================================================

const DEFAULT_SERVER_URL = 'https://nickos.ai.studio';
let serverUrl = DEFAULT_SERVER_URL;
let clientId = 'ext_' + Math.random().toString(36).substring(2, 10);
let blockedCount = 0;
let lastActionLog = 'Extension background service initialized.';

// Initialize Extension Settings
chrome.storage.local.get(['serverUrl', 'clientId', 'blockedCount'], (res) => {
  if (res.serverUrl) serverUrl = res.serverUrl;
  if (res.clientId) clientId = res.clientId;
  else chrome.storage.local.set({ clientId });
  if (res.blockedCount) blockedCount = res.blockedCount;
});

// Setup Alarms for periodic session sync & heartbeat
chrome.alarms.create('focusGuardSyncAlarm', { periodInMinutes: 0.1 }); // every ~6s

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'focusGuardSyncAlarm') {
    syncActiveSessionAndEnforce();
  }
});

// Primary Sync & Enforce Loop
async function syncActiveSessionAndEnforce() {
  try {
    const stored = await chrome.storage.local.get(['serverUrl']);
    if (stored.serverUrl) serverUrl = stored.serverUrl;

    const res = await fetch(`${serverUrl}/api/focus-guard/active-session`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      updateEnforcementStatus(false, null, 'Server responded with status ' + res.status);
      return;
    }

    const data = await res.json();
    const { isProtectionActive, sessionState, settings, taskId, taskTitle } = data;

    // Cache state locally for popup diagnostics
    await chrome.storage.local.set({
      latestSessionData: data,
      lastSyncTimestamp: new Date().toISOString(),
    });

    if (isProtectionActive && settings && settings.enabled) {
      await applyDeclarativeNetRules(settings, taskId, taskTitle);
    } else {
      await clearDeclarativeNetRules('Protection inactive or session status: ' + sessionState);
    }

    // Send Heartbeat back to NickOS
    await sendHeartbeat(sessionState, isProtectionActive ? 'enforcing' : 'paused');
  } catch (err) {
    lastActionLog = 'Sync error: ' + err.message;
    await chrome.storage.local.set({ lastError: err.message });
    await sendHeartbeat('disconnected', 'error', err.message);
  }
}

// Convert settings into chrome.declarativeNetRequest Dynamic Rules
async function applyDeclarativeNetRules(settings, taskId, taskTitle) {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(r => r.id);

    const newRules = [];
    let ruleIdCounter = 100;

    const blockRedirectUrl = chrome.runtime.getURL('blocked.html') +
      `?task=${encodeURIComponent(taskTitle || 'Focus Task')}&mode=${settings.mode}`;

    if (settings.mode === 'blacklist') {
      // Create block rule for each blocked domain
      for (const domain of settings.blockedDomains) {
        if (!domain || !domain.trim()) continue;
        const cleanDomain = domain.trim().toLowerCase();
        
        newRules.push({
          id: ruleIdCounter++,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: {
              url: blockRedirectUrl + `&domain=${encodeURIComponent(cleanDomain)}`
            }
          },
          condition: {
            urlFilter: `||${cleanDomain}^`,
            resourceTypes: ['main_frame']
          }
        });
      }
    } else if (settings.mode === 'whitelist') {
      // Whitelist Mode: Block everything EXCEPT allowed domains and NickOS system origins
      const systemDomains = ['nickos.ai.studio', 'ai.studio', 'run.app', 'localhost', '127.0.0.1'];
      const allowedDomains = Array.from(new Set([
        ...systemDomains,
        ...(settings.allowedDomains || []).map(d => d.trim().toLowerCase()).filter(Boolean)
      ]));
      
      // Rule 1: High priority ALLOW for each whitelisted & system domain
      for (const domain of allowedDomains) {
        newRules.push({
          id: ruleIdCounter++,
          priority: 10,
          action: { type: 'allow' },
          condition: {
            urlFilter: `||${domain}^`,
            resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'xmlhttprequest', 'other']
          }
        });
      }

      // Rule 2: Catch-all redirect for any unlisted http/https main_frame request
      newRules.push({
        id: ruleIdCounter++,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: {
            url: blockRedirectUrl + `&domain=unauthorized_domain`
          }
        },
        condition: {
          urlFilter: 'http*',
          excludedRequestDomains: allowedDomains,
          resourceTypes: ['main_frame']
        }
      });
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: newRules,
    });

    lastActionLog = `Applied ${newRules.length} dynamic rules in ${settings.mode.toUpperCase()} mode.`;
  } catch (err) {
    console.error('[FocusGuard Extension] Failed to update dynamic rules:', err);
    lastActionLog = 'Rule update error: ' + err.message;
  }
}

// Clear all rules when session ends or is paused
async function clearDeclarativeNetRules(reason) {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(r => r.id);
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds
      });
    }
    lastActionLog = 'Cleared rules: ' + reason;
  } catch (err) {
    console.error('[FocusGuard Extension] Clear rules error:', err);
  }
}

// Send heartbeat pulse to NickOS server
async function sendHeartbeat(sessionState, status, errorMessage) {
  try {
    await fetch(`${serverUrl}/api/focus-guard/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        clientType: 'browser_extension',
        version: '1.0.0',
        status: status || 'connected',
        activeSessionId: sessionState === 'active' ? 'session_active' : null,
        blockedEnforcementsCount: blockedCount,
        lastActionLog,
        errorMessage: errorMessage || null,
      })
    });
  } catch {
    // quiet ignore network drops
  }
}

// Track blocked navigation feedback
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    blockedCount++;
    chrome.storage.local.set({ blockedCount });
    lastActionLog = `Blocked navigation to ${info.request.url} (Rule ID: ${info.rule.ruleId})`;
  });
}

// Initial sync on startup
syncActiveSessionAndEnforce();
