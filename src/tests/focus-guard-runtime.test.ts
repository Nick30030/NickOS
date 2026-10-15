import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// These checks exercise the real Express routes and extension worker, unlike
// the standalone domain evaluator in focus-guard.test.ts.
test('Focus Guard keeps session settings, ignores idle clients and records agent heartbeats', async () => {
  const reservation = createServer();
  await new Promise<void>(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = (reservation.address() as { port: number }).port;
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(), env: { ...process.env, PORT: String(port), NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Server startup timed out: ${output}`)), 20000);
      child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${output}`)); });
      child.stderr.on('data', data => { output += data.toString(); });
      child.stdout.on('data', data => {
        output += data.toString();
        if (output.includes('FULL-STACK SERVER] Running')) { clearTimeout(timeout); resolve(); }
      });
    });
    const base = `http://127.0.0.1:${port}`;
    const post = async (path: string, body: unknown) => {
      const response = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      assert.equal(response.status, 200);
      return response.json();
    };
    const state = async () => (await fetch(base + '/api/focus-guard/active-session')).json();
    const settings = { enabled: true, mode: 'whitelist', allowedDomains: ['github.com'], blockedDomains: ['example.com'], blockedApps: [], unknownSitePolicy: 'block' };
    await post('/api/focus-guard/session-sync', { status: 'disconnected', settings });
    assert.equal((await state()).settings.mode, 'whitelist');
    await post('/api/focus-guard/session-sync', { sessionId: 'focus-a', status: 'active', taskTitle: 'Regression test', settings });
    assert.equal((await state()).isProtectionActive, true);
    const idle = await post('/api/focus-guard/session-sync', { status: 'disconnected', settings: { ...settings, enabled: false } });
    assert.equal(idle.ignored, true);
    assert.equal((await state()).isProtectionActive, true);
    assert.equal((await state()).settings.enabled, true);
    await post('/api/focus-guard/heartbeat', { clientId: 'extension-test', clientType: 'browser_extension', status: 'enforcing', activeSessionId: 'focus-a' });
    const agents = await (await fetch(base + '/api/focus-guard/agents')).json();
    assert.equal(agents.agents[0].activeSessionId, 'focus-a');
    await post('/api/focus-guard/session-sync', { sessionId: 'focus-a', status: 'paused', settings });
    assert.equal((await state()).isProtectionActive, false);
    await post('/api/focus-guard/session-sync', { sessionId: 'focus-a', status: 'active', settings });
    await post('/api/focus-guard/session-sync', { sessionId: 'old-session', status: 'completed' });
    assert.equal((await state()).sessionId, 'focus-a');
    await post('/api/focus-guard/session-sync', { sessionId: 'focus-a', status: 'completed', settings });
    assert.equal((await state()).isProtectionActive, false);
    const invalid = await fetch(base + '/api/focus-guard/session-sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'active' }) });
    assert.equal(invalid.status, 400);
  } finally {
    const exit = new Promise<void>(resolve => child.once('exit', () => resolve()));
    if (child.exitCode === null) { child.kill('SIGTERM'); await exit; }
  }
});

test('Extension reports rule errors, preserves the session ID and retries successfully', async () => {
  let listener: any;
  let rejectRules = true;
  let rules: any[] = [];
  const storage: Record<string, any> = { serverUrl: 'https://focus.example', clientId: 'existing-client' };
  const heartbeats: any[] = [];
  let sessionState = 'active';
  const chrome = {
    storage: { local: {
      get: async () => ({ ...storage }),
      set: async (values: object) => { Object.assign(storage, values); },
      remove: async (key: string) => { delete storage[key]; },
    } },
    alarms: { create() {}, onAlarm: { addListener() {} } },
    runtime: { onMessage: { addListener(fn: any) { listener = fn; } }, getURL: (path: string) => `chrome-extension://test/${path}` },
    declarativeNetRequest: {
      getDynamicRules: async () => rules,
      updateDynamicRules: async ({ addRules = [] }: any) => { if (rejectRules) throw new Error('Chrome rejected rules'); rules = addRules; },
    },
  };
  const source = await readFile(new URL('../../extension/background.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, {
    chrome, URL, AbortSignal, console: { error() {} },
    fetch: async (url: string, options: any) => {
      if (url.endsWith('/heartbeat')) heartbeats.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ sessionId: 'focus-a', sessionState, isProtectionActive: sessionState === 'active', settings: { enabled: true, mode: 'whitelist', allowedDomains: ['github.com'], blockedDomains: [] } }) };
    },
  });
  const sync = () => new Promise<any>(resolve => assert.equal(listener({ action: 'sync' }, {}, resolve), true));
  const failure = await sync();
  assert.equal(failure.ok, false);
  assert.match(storage.lastError, /Chrome rejected/);
  assert.equal(heartbeats.at(-1).status, 'error');
  rejectRules = false;
  assert.equal((await sync()).ok, true);
  assert.equal(storage.lastError, undefined);
  assert.equal(heartbeats.at(-1).activeSessionId, 'focus-a');
  assert.equal(heartbeats.at(-1).clientId, 'existing-client');
  assert.equal(heartbeats.at(-1).status, 'enforcing');
  assert.ok(rules.some(rule => rule.action.type === 'allow' && rule.condition.urlFilter === '||focus.example^'));
  sessionState = 'paused';
  assert.equal((await sync()).ok, true);
  assert.equal(rules.length, 0);
  assert.equal(heartbeats.at(-1).status, 'paused');
});
