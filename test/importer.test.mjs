import test from 'node:test';
import assert from 'node:assert/strict';

const I = await import('../app/importer.mjs');
const row = (id, status = 'ESTIMATE') => ({ OrderId: id, Status: status, OrderDescription: 'Sign ' + id, CompanyName: 'Co', OrderTotal: 100 });

test('import: pages estimates then orders, stops at the call budget, resumes, skips voided', async () => {
  const pages = { getEstimate: [[row(1), row(2)], [row(3)]], getOrders: [[row(10, 'WIP'), row(11, 'VOIDED')], []] };
  const calls = [];
  const saved = [];
  const read = async (op, p) => { calls.push([op, p.page]); return pages[op][p.page - 1] || []; };
  const save = async (ps) => { saved.push(...ps); };
  let s = await I.importBatch({ read, save, maxCalls: 2, pageSize: 2 });
  assert.deepEqual(calls, [['getEstimate', 1], ['getEstimate', 2]]);
  assert.deepEqual([s.estimatesDone, s.done, s.imported, s.calls], [true, false, 3, 2]);
  s = await I.importBatch({ read, save, state: s, maxCalls: 5, pageSize: 2 });
  assert.equal(s.done, true);
  assert.deepEqual(saved.map((p) => p.id), ['cb-1', 'cb-2', 'cb-3', 'cb-10']);
  assert.ok(I.importPage({ user: {}, state: s, allowed: false }).includes('Turned off'));
});
