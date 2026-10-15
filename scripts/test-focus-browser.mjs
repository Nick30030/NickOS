import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.env.FOCUS_GUARD_BASE_URL || 'http://127.0.0.1:3002';
assert.ok(
  ['127.0.0.1', 'localhost'].includes(new URL(base).hostname),
  'Run against an isolated local test server only.',
);

async function getState() {
  const response = await fetch(`${base}/api/focus-guard/active-session`);
  assert.equal(response.status, 200);
  return response.json();
}

async function waitForState(predicate) {
  const deadline = Date.now() + 10000;
  let state;
  do {
    state = await getState();
    if (predicate(state)) return state;
    await new Promise(resolve => setTimeout(resolve, 100));
  } while (Date.now() < deadline);
  assert.fail(`Expected Focus Guard state not received: ${JSON.stringify(state)}`);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    if (!localStorage.getItem('nick_os_focus_guard_settings')) {
      localStorage.setItem('nick_os_focus_guard_settings', JSON.stringify({
        enabled: true,
        mode: 'whitelist',
        allowedDomains: ['github.com'],
        blockedDomains: ['example.com'],
        blockedApps: [],
        unknownSitePolicy: 'block',
      }));
    }
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  const start = page.getByRole('button', { name: 'Démarrer le Focus', exact: true }).first();
  await start.waitFor();
  await waitForState(state => state.settings.mode === 'whitelist');
  console.log('PASS: persisted settings synchronized on startup.');

  await start.click();
  await page.getByRole('button', { name: 'Pause Timer', exact: true }).waitFor();
  const active = await waitForState(state => state.sessionState === 'active' && state.isProtectionActive);
  const sessionId = active.sessionId;
  console.log('PASS: Start Focus creates a real active session in one click.');

  const idleContext = await browser.newContext();
  try {
    const idle = await idleContext.newPage();
    const sync = idle.waitForResponse(response =>
      response.url().endsWith('/api/focus-guard/session-sync') && response.request().method() === 'POST',
      { timeout: 10000 },
    );
    await idle.goto(base, { waitUntil: 'domcontentloaded', timeout: 10000 });
    const idleSync = await sync;
    assert.equal(idleSync.status(), 200);
    assert.equal(idleSync.request().postDataJSON().sessionId, null);
    const state = await getState();
    assert.equal(state.sessionId, sessionId);
    assert.equal(state.sessionState, 'active');
    assert.equal(state.settings.mode, 'whitelist');
    console.log('PASS: an idle profile cannot erase the active session or its settings.');
  } finally {
    await idleContext.close();
  }

  await page.getByRole('button', { name: 'Pause Timer', exact: true }).click();
  await waitForState(state => state.sessionState === 'paused' && !state.isProtectionActive);
  await page.getByRole('button', { name: 'Resume Focus', exact: true }).click();
  await waitForState(state => state.sessionState === 'active' && state.isProtectionActive);
  console.log('PASS: pause disarms protection and resume arms it again.');

  await page.getByRole('button', { name: 'Complete Task', exact: true }).last().click();
  await waitForState(state => state.sessionState === 'completed' && !state.isProtectionActive);
  console.log('PASS: completing a task disables its protection.');
  await page.getByRole('button', { name: 'Exit Focus', exact: true }).click();
  await start.click();
  await page.getByRole('button', { name: 'Pause Timer', exact: true }).waitFor();
  const next = await waitForState(state => state.sessionState === 'active' && state.isProtectionActive);

  const restoredSync = page.waitForResponse(response =>
    response.url().endsWith('/api/focus-guard/session-sync') && response.request().method() === 'POST',
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await restoredSync;
  const restored = await waitForState(state => state.sessionId === next.sessionId && state.isProtectionActive);
  assert.equal(restored.settings.mode, 'whitelist');
  console.log('PASS: reload restores the real session and settings.');

  const heartbeat = await fetch(`${base}/api/focus-guard/heartbeat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      clientId: 'browser-regression-agent',
      clientType: 'browser_extension',
      status: 'enforcing',
      activeSessionId: next.sessionId,
    }),
  });
  assert.equal(heartbeat.status, 200);
  await page.getByText('Outils / Réglages', { exact: true }).click();
  await page.getByRole('button', { name: /Agents & Diagnostics/ }).click();
  await page.getByText('browser-regression-agent', { exact: true }).waitFor();
  console.log('PASS: agent diagnostics display the server heartbeat.');
  assert.deepEqual(errors, []);
  console.log('PASS: no uncaught browser JavaScript errors.');
} finally {
  await browser.close();
}
