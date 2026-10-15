// ==============================================================================
// NICK OS FOCUS GUARD ENGINE TEST SUITE
// Automated verification of domain rules, session state logic & settings
// ==============================================================================

import { FocusGuardSettings, FocusGuardMode, UnknownSitePolicy } from '../types/focus';

// Domain Evaluation Test Logic
export function evaluateDomainAccess(
  domain: string,
  settings: FocusGuardSettings,
  isSessionActive: boolean
): { allowed: boolean; reason: string } {
  if (!settings.enabled || !isSessionActive) {
    return { allowed: true, reason: 'Protection inactive or session paused/completed.' };
  }

  const cleanDomain = domain.toLowerCase().trim();

  if (settings.mode === 'blacklist') {
    const isBlocked = settings.blockedDomains.some(b => {
      const cleanB = b.toLowerCase().trim();
      return cleanDomain === cleanB || cleanDomain.endsWith('.' + cleanB);
    });

    if (isBlocked) {
      return { allowed: false, reason: `Domain ${cleanDomain} matched Blacklist pattern.` };
    }
    return { allowed: true, reason: `Domain ${cleanDomain} is not in Blacklist.` };
  }

  if (settings.mode === 'whitelist') {
    const isAllowed = settings.allowedDomains.some(a => {
      const cleanA = a.toLowerCase().trim();
      return cleanDomain === cleanA || cleanDomain.endsWith('.' + cleanA);
    });

    if (isAllowed || cleanDomain === 'localhost') {
      return { allowed: true, reason: `Domain ${cleanDomain} matched Whitelist pattern.` };
    }

    if (settings.unknownSitePolicy === 'block') {
      return { allowed: false, reason: `Domain ${cleanDomain} blocked by Whitelist + strict unknown policy.` };
    }

    if (settings.unknownSitePolicy === 'warn') {
      return { allowed: true, reason: `Domain ${cleanDomain} allowed with warning prompt.` };
    }

    return { allowed: false, reason: `Domain ${cleanDomain} is not on Whitelist.` };
  }

  return { allowed: true, reason: 'Default allow' };
}

// Runnable Test Suite Function
export function runFocusGuardTests() {
  console.log('=== RUNNING NICK OS FOCUS GUARD TEST SUITE ===');

  const defaultSettings: FocusGuardSettings = {
    enabled: true,
    mode: 'blacklist',
    allowedDomains: ['nickos.ai.studio', 'ai.studio', 'github.com', 'google.com', 'stackoverflow.com'],
    blockedDomains: ['youtube.com', 'x.com', 'twitter.com', 'reddit.com'],
    blockedApps: ['Discord.exe', 'Steam.exe'],
    unknownSitePolicy: 'allow',
  };

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${testName}`);
      failed++;
    }
  }

  // Test 1: Blacklist mode - blocked domain during active session
  const t1 = evaluateDomainAccess('youtube.com', defaultSettings, true);
  assert(!t1.allowed, 'Blacklist mode blocks youtube.com when session active');

  // Test 2: Blacklist mode - subdomain matching
  const t2 = evaluateDomainAccess('m.youtube.com', defaultSettings, true);
  assert(!t2.allowed, 'Blacklist mode blocks m.youtube.com subdomain');

  // Test 3: Blacklist mode - allowed domain
  const t3 = evaluateDomainAccess('github.com', defaultSettings, true);
  assert(t3.allowed, 'Blacklist mode permits github.com');

  // Test 4: Session paused - protection suspended
  const t4 = evaluateDomainAccess('youtube.com', defaultSettings, false);
  assert(t4.allowed, 'Protection suspends when session is paused');

  // Test 5: Whitelist mode - allowed domain
  const whitelistSettings: FocusGuardSettings = { ...defaultSettings, mode: 'whitelist' };
  const t5 = evaluateDomainAccess('github.com', whitelistSettings, true);
  assert(t5.allowed, 'Whitelist mode permits github.com');

  // Test 6: Whitelist mode - unlisted domain blocked
  const t6 = evaluateDomainAccess('reddit.com', whitelistSettings, true);
  assert(!t6.allowed, 'Whitelist mode blocks unlisted domain reddit.com');

  // Test 7: Whitelist mode - subdomain allowed
  const t7 = evaluateDomainAccess('docs.google.com', whitelistSettings, true);
  assert(t7.allowed, 'Whitelist mode permits docs.google.com subdomain');

  console.log(`\nFocus Guard Test Summary: ${passed} Passed, ${failed} Failed.`);
  return { passed, failed };
}

// Execute tests if invoked directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('focus-guard.test')) {
  runFocusGuardTests();
}
