import test from 'node:test';
import assert from 'node:assert/strict';
const H = await import('../app/history.mjs');
test('history import: walks customers → contacts → estimates → orders, resumes, counts, never more than maxCalls', async () => {
  const sizes = { searchCustomers: 3, searchContacts: 1, getEstimate: 2, searchOrders: 0 };
  const seen = []; const saved = {};
  const read = async (op, req) => { seen.push([op, req.body ? req.body.page : req.params.page]); const p = req.body ? req.body.page : req.params.page - 1; const n = Math.max(0, Math.min(2, sizes[op] - p * 2)); return { data: Array.from({ length: n }, (_, k) => ({ accountId: `${p}${k}`, contactId: `${p}${k}`, id: `${p}${k}`, orderId: `${p}${k}` })), count: sizes[op] }; };
  const save = async (ent, recs) => { saved[ent] = (saved[ent] || 0) + recs.length; };
  let s = H.newState();
  for (let n = 0; n < 10 && !s.done; n++) s = await H.historyStep({ read, save, state: s, maxCalls: 2, pageSize: 2 });
  assert.ok(s.done);
  assert.deepEqual(saved, { customers: 3, contacts: 1, estimates: 2 });
  assert.deepEqual(seen.slice(0, 3), [['searchCustomers', 0], ['searchCustomers', 1], ['searchContacts', 0]]);
  assert.equal(s.calls, seen.length);
  assert.match(H.historyPanel(s, { on: true }), /Finished/);
  assert.match(H.historyPanel(H.newState(), { on: false }), /Start Full History Import/);
});
test('history import: honours CoreBridge page caps (pageCount) instead of assuming the asked page size', async () => {
  const H = await import('../app/history.mjs');
  let calls = 0;
  const read = async (op, req) => { calls++; const p = req.body ? req.body.page : req.params.page; return op === 'searchCustomers' ? { data: Array.from({ length: p < 2 ? 50 : 10 }, (_, k) => ({ accountId: `${p}-${k}` })), pageSize: 50, pageCount: 3, count: 110 } : { data: [] }; };
  let s = H.newState(); const got = [];
  for (let n = 0; n < 6 && !s.done; n++) s = await H.historyStep({ read, save: async (e, r) => got.push(...r), state: s, maxCalls: 2, pageSize: 100 });
  assert.equal(got.length, 110);
  assert.ok(s.done);
});
