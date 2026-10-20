import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SupabaseRepository } from '../services/storage/SupabaseRepository';
import { LocalStorageRepository } from '../services/storage/LocalStorageRepository';

function cloudMock({ user = true, fail = false } = {}) {
  const writes: { table: string; payload: any }[] = [];
  const client: any = {
    auth: { getUser: async () => ({ data: { user: user ? { id: 'authenticated-user', email: 'test@example.invalid', user_metadata: {} } : null }, error: null }) },
    from(table: string) {
      return {
        upsert: async (payload: any, options: any) => {
          assert.equal(options.ignoreDuplicates, true);
          writes.push({ table, payload });
          return { error: null };
        },
        insert(payload: any[]) {
          writes.push({ table, payload: payload[0] });
          return { select: () => ({ single: async () => fail
            ? { data: null, error: { message: 'row-level security denied' } }
            : { data: { ...payload[0], id: 'cloud-row', created_at: new Date().toISOString() }, error: null } }) };
        },
      };
    },
  };
  return { repo: new SupabaseRepository(client), writes };
}
const task = { title: 'Persisted task', status: 'planned', priority: 'high', commitmentLevel: 'flexible', estimatedMinutes: 30 } as const;
const project = { name: 'Persisted project', code: 'PERSIST', status: 'active', priority: 'high' } as const;

test('cloud task and project creation use the authenticated owner and preserve the profile', async () => {
  const { repo, writes } = cloudMock();
  assert.equal((await repo.createTask(task)).id, 'cloud-row');
  assert.equal((await repo.createProject(project)).id, 'cloud-row');
  for (const table of ['tasks', 'projects']) {
    assert.equal(writes.find(write => write.table === table)?.payload.user_id, 'authenticated-user');
  }
  assert.equal(writes.filter(write => write.table === 'profiles').length, 2);
});

test('a refused cloud creation is reported without creating an invisible local copy', async () => {
  const { repo } = cloudMock({ fail: true });
  const local = new LocalStorageRepository();
  const beforeTasks = (await local.getTasks()).length;
  const beforeProjects = (await local.getProjects()).length;
  await assert.rejects(repo.createTask(task), /row-level security denied/);
  await assert.rejects(repo.createProject(project), /row-level security denied/);
  assert.equal((await local.getTasks()).length, beforeTasks);
  assert.equal((await local.getProjects()).length, beforeProjects);
});

test('cloud creation requires a real authenticated user, not just the public key', async () => {
  const { repo, writes } = cloudMock({ user: false });
  await assert.rejects(repo.createTask(task), /Connectez-vous/);
  await assert.rejects(repo.createProject(project), /Connectez-vous/);
  assert.equal(writes.length, 0);
});

test('local writes persist and quota errors cannot masquerade as successful creation', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const values = new Map<string, string>();
  let full = false;
  let readOnly = false;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { if (full) throw new DOMException('Full', 'QuotaExceededError'); if (readOnly) throw new DOMException('Read only', 'SecurityError'); values.set(key, value); },
  } } });
  try {
    const local = new LocalStorageRepository();
    const createdTask = await local.createTask(task);
    const createdProject = await local.createProject(project);
    assert.ok((await local.getTasks()).some(row => row.id === createdTask.id));
    assert.ok((await local.getProjects()).some(row => row.id === createdProject.id));
    full = true;
    await assert.rejects(local.createTask(task), /Stockage local plein/);
    await assert.rejects(local.createProject(project), /Stockage local plein/);
    full = false;
    readOnly = true;
    await assert.rejects(local.createTask(task), /Écriture.*refusée/);
    await assert.rejects(local.createProject(project), /Écriture.*refusée/);
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else delete (globalThis as any).window;
  }
});
