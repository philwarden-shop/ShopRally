import test from 'node:test';
import assert from 'node:assert/strict';

const M = await import('../app/migration.mjs');

test('migration checklist: every row has a known status; blockers and Phil decisions are called out', () => {
  assert.ok(M.CHECKLIST.every(([, s]) => M.STATUS[s]));
  const h = M.migrationPage({ user: {} });
  assert.ok(h.includes('Moving Off CoreBridge') && h.includes('Blocked by CoreBridge · 2') && h.includes('Needs Phil · 3'));
});
