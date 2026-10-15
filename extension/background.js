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
const initialized = chrome.storage.local.get(['serverUrl', 'clientId', 'blockedCount']).then(async (res) => {
  if (res.serverUrl) serverUrl = res.serverUrl;
  if (res.clientId) clientId = res.clientId;
  else await chrome.storage.local.set({ clientId });
  if (res.blockedCount) blockedCount = res.blockedCount;
});

// Setup Alarms for periodic session sync & heartbeat
chrome.alarms.create('focusGuardSyncAlarm', { periodInMinutes: 0.5 }); // Chrome minimum: 30s

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'focusGuardSyncAlarm') {
    syncActiveSessionAndEnforce();
  }
});

// Register synchronously so popup messages can wake the service worker.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action !== 'sync') return;
  syncActiveSessionAndEnforce().then(sendResponse).catch((err) => {
    sendResponse({ ok: false, error: err.message });
  });
  return true; // Keep the response channel open until synchronization finishes.
});

// Primary Sync & Enforce Loop
let pendingSync;
function syncActiveSessionAndEnforce() {
  if (!pendingSync) {
    pendingSync = performSync().finally(() => { pendingSync = null; });
  }
  return pendingSync;
}

async function performSync() {
  try {
    await initialized;
    const stored = await chrome.storage.local.get(['serverUrl']);
    if (stored.serverUrl) serverUrl = stored.serverUrl;

    const res = await fetch(`${serverUrl}/api/focus-guard/active-session`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error('Server responded with status ' + res.status);
    }

    const data = await res.json();
    const { isProtectionActive, sessionState, settings, taskId, taskTitle } = data;
    if (typeof isProtectionActive !== 'boolean' || typeof sessionState !== 'string' || !settings) {
      throw new Error('Unexpected API response. Check the NickOS server address in extension options.');
    }

    if (isProtectionActive && settings && settings.enabled) {
      await applyDeclarativeNetRules(settings, taskId, taskTitle);
    } else {
      await clearDeclarativeNetRules('Protection inactive or session status: ' + sessionState);
    }

    // Advertise enforcement only after Chrome successfully installs the rules.
    await chrome.storage.local.set({
      latestSessionData: data,
      lastSyncTimestamp: new Date().toISOString(),
    });

    // Send Heartbeat back to NickOS
    await sendHeartbeat(data.sessionId, isProtectionActive ? 'enforcing' : 'paused');
    await chrome.storage.local.remove('lastError');
    return { ok: true };
  } catch (err) {
    lastActionLog = 'Sync error: ' + err.message;
    await chrome.storage.local.set({ lastError: err.message });
    await sendHeartbeat(null, 'error', err.message);
    return { ok: false, error: err.message };
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
      const systemDomains = [new URL(serverUrl).hostname, 'nickos.ai.studio', 'ai.studio', 'localhost', '127.0.0.1'];
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
          regexFilter: '^https?://',
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
    throw err;
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
    throw err;
  }
}

// Send heartbeat pulse to NickOS server
async function sendHeartbeat(sessionId, status, errorMessage) {
  try {
    await fetch(`${serverUrl}/api/focus-guard/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        clientId,
        clientType: 'browser_extension',
        version: '1.0.0',
        status: status || 'connected',
        activeSessionId: sessionId || null,
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
