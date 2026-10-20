import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.CREATION_BASE_URL || 'http://127.0.0.1:3000';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use an isolated local test server.');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, headless: true, args: ['--no-sandbox'] });

async function createAndReload(context, label) {
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.getByText('03. Objectifs', { exact: true }).click();
  await page.getByRole('button', { name: 'Nouveau Projet', exact: true }).first().click();
  await page.getByPlaceholder('e.g. NICK OS Architecture & Engine').fill(`Projet ${label}`);
  await page.getByRole('button', { name: 'Create Project', exact: true }).click();
  const card = page.locator('div.p-5').filter({ has: page.getByRole('heading', { name: `Projet ${label}`, exact: true }) });
  await card.getByRole('button', { name: 'Add Task', exact: true }).click();
  await page.getByPlaceholder('e.g. Implement the Workspace sidebar navigation').fill(`Tache ${label}`);
  await page.getByRole('button', { name: 'Commit Task', exact: true }).click();
  await card.getByRole('button', { name: /Show Tasks/ }).click();
  await card.getByText(`Tache ${label}`, { exact: true }).waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('03. Objectifs', { exact: true }).click();
  await card.getByRole('button', { name: /Show Tasks/ }).click();
  await card.getByText(`Tache ${label}`, { exact: true }).waitFor();
  console.log(`PASS: ${label} project and task visible immediately and after reload.`);
  return page;
}

try {
  const local = await browser.newContext();
  const localPage = await createAndReload(local, 'local');
  // A real browser storage write failure must keep the form open and display an error.
  await localPage.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  await localPage.getByRole('button', { name: 'Nouveau Projet', exact: true }).first().click();
  await localPage.getByPlaceholder('e.g. NICK OS Architecture & Engine').fill('Quota project');
  await localPage.getByRole('button', { name: 'Create Project', exact: true }).click();
  await localPage.getByRole('alert').filter({ hasText: 'Stockage local plein' }).waitFor();
  console.log('PASS: local quota failure stays visible in the open form.');
  await local.close();

  // Simulated Supabase HTTP API: real SDK and forms, no external credentials or database changes.
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'browser@example.invalid', user_metadata: {} };
  const tables = { profiles: [{ ...user, name: 'Browser test' }], tasks: [], projects: [] };
  const cloud = await browser.newContext();
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: expires })).toString('base64url')}.test-signature`;
  await cloud.addInitScript(({ user, token, expires }) => {
    localStorage.setItem('nick_os_supabase_url', 'https://creation-test.supabase.co');
    localStorage.setItem('nick_os_supabase_key', 'public-test-key');
  }, { user, token, expires });
  let rejectWrites = false;
  await cloud.route('https://creation-test.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/auth/v1/user') return reply(user);
    if (url.pathname === '/auth/v1/token') return reply({ access_token: token, refresh_token: 'test-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user });
    const table = url.pathname.split('/').at(-1);
    if (!url.pathname.startsWith('/rest/v1/')) return reply({ message: 'Not found' }, 404);
    const singular = request.headers().accept?.includes('vnd.pgrst.object');
    const rows = tables[table] || [];
    if (request.method() === 'GET') {
      if (singular) return rows.length ? reply(rows[0]) : reply({ code: 'PGRST116', message: 'No rows' }, 406);
      return reply(rows);
    }
    const body = request.postDataJSON();
    if (table === 'profiles') return reply(null, 201); // ignoreDuplicates preserves the profile
    if (rejectWrites && ['tasks', 'projects'].includes(table)) return reply({ message: 'row-level security denied' }, 403);
    const values = Array.isArray(body) ? body : [body];
    const created = values.map(value => ({ ...value, id: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
    tables[table] = [...rows, ...created];
    return reply(singular ? created[0] : created, 201);
  });
  const loginPage = await cloud.newPage();
  await loginPage.goto(base, { waitUntil: 'domcontentloaded' });
  await loginPage.getByText('Config', { exact: true }).click();
  await loginPage.getByPlaceholder('Adresse e-mail du compte Supabase').fill(user.email);
  await loginPage.getByPlaceholder('Mot de passe du compte Supabase').fill('browser-test-password');
  await Promise.all([
    loginPage.waitForEvent('framenavigated', frame => frame === loginPage.mainFrame()),
    loginPage.getByRole('button', { name: 'Se connecter à Supabase', exact: true }).click(),
  ]);
  await loginPage.close();
  console.log('PASS: Supabase sign-in uses the configured project and reloads with an authenticated session.');
  const cloudPage = await createAndReload(cloud, 'cloud simulé');
  assert.equal(tables.projects[0].user_id, user.id);
  assert.equal(tables.tasks[0].user_id, user.id);
  rejectWrites = true;
  await cloudPage.getByRole('button', { name: 'Nouveau Projet', exact: true }).first().click();
  await cloudPage.getByPlaceholder('e.g. NICK OS Architecture & Engine').fill('Denied project');
  await cloudPage.getByRole('button', { name: 'Create Project', exact: true }).click();
  await cloudPage.getByRole('alert').filter({ hasText: 'row-level security denied' }).waitFor();
  assert.equal(tables.projects.length, 1);
  console.log('PASS: cloud refusal is visible, keeps the form open and creates no local substitute.');
  await cloud.close();
} finally {
  await browser.close();
}
