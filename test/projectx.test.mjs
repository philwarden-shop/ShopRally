import test from 'node:test';
import assert from 'node:assert/strict';

const X = await import('../app/projectx.mjs');

test('project next steps: only this project’s open tasks; empty state nudges', () => {
  const tasks = [{ id: 'a', title: 'Call', projectId: 'p1', due: '2026-11-10', done: false }, { id: 'b', title: 'Old', projectId: 'p1', due: '2026-11-10', done: true }, { id: 'c', title: 'Other', projectId: 'p2', due: '2026-11-12', done: false }];
  const h = X.projectTasksHtml('p1', tasks, '2026-11-12');
  assert.ok(h.includes('Next Steps · 1') && h.includes('Past due') && !h.includes('Other'));
  assert.match(X.projectTasksHtml('p3', tasks, '2026-11-12'), /No next step yet/);
});

test('approve estimate: deposit amount or PO number required; only estimates; moves to In production', () => {
  const p = { id: 'p1', lane: 'estimate', total: 1000 };
  const o = X.approveProject({}, p, { how: 'deposit', amount: '$500' }, { by: 'phil', at: 't' });
  assert.deepEqual([o.p1.lane, o.p1.deposit, o.p1.status], ['progress', 500, 'In production']);
  assert.throws(() => X.approveProject({}, p, { how: 'deposit', amount: '' }, {}), /deposit amount/);
  assert.throws(() => X.approveProject({}, p, { how: 'po' }, {}), /PO number/);
  assert.equal(X.approveProject({}, p, { how: 'terms' }, {}).p1.how, 'terms');
  assert.throws(() => X.approveProject({}, { ...p, lane: 'progress' }, { how: 'terms' }, {}), /only an estimate/);
  assert.match(X.approveHtml(p, 50), /value="500\.00"[\s\S]*Approved · Start Production/);
  assert.equal(X.approveHtml({ lane: 'progress' }), '');
});

test('history: newest moves listed with step names', () => {
  const h = X.historyHtml([{ at: '2026-11-12T14:00:00Z', itemName: 'Lobby', from: 'wip', to: 'qc', by: 'phil@x.com' }], (s) => s.toUpperCase());
  assert.ok(h.includes('History · 1') && h.includes('WIP → QC') && h.includes('phil'));
  assert.equal(X.historyHtml([]), '');
});
