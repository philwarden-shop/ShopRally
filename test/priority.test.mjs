import test from 'node:test';
import assert from 'node:assert/strict';
const P = await import('../app/priority.mjs');
test('strategic priority: 6 criteria, score /100, pin with a reason', () => {
  const f = { c0: '5', c1: '4', c2: '5', c3: '5', c4: '5', c5: '3' };
  const prof = P.mergePriority({}, f);
  assert.deepEqual(P.priorityOf(prof), { score: 90, auto: 'High', level: 'High', pinned: false, note: '' });
  assert.equal(P.priorityOf(P.mergePriority({}, { ...f, c0: '1', c1: '1', c2: '1' })).level, 'Med');
  assert.throws(() => P.mergePriority({}, { ...f, c0: '9' }), /1 to 5/);
  assert.throws(() => P.mergePriority({}, { ...f, override: 'Low' }), /why/);
  assert.equal(P.priorityOf(P.mergePriority({}, { ...f, override: 'Low', note: 'Only one-off jobs' })).level, 'Low');
  assert.equal(P.priorityOf({}), null);
  assert.match(P.priorityCard('x', prof), /High · 90/);
});
test('projects board toolbar: filters and list view', async () => {
  const V = await import('../app/views.mjs');
  const lanes = [{ key: 'estimate', name: 'Estimate', items: [{ id: 'a', name: 'Alpha sign', company: 'A', priority: 'High', prioScore: 90, total: 100, due: '2099-01-01' }, { id: 'b', name: 'Beta sign', company: 'B', priority: 'Low', total: 50 }], total: 150 }, { key: 'progress', name: 'In production', items: [{ id: 'c', name: 'Gamma sign', company: 'C', priority: 'Med', total: 10 }], total: 10 }];
  const h = V.boardPage({ user: {}, mode: 'demo', lanes, f: { prio: 'High' } });
  assert.ok(h.includes('Alpha sign') && !h.includes('Beta sign') && !h.includes('Gamma sign'));
  const l = V.boardPage({ user: {}, mode: 'demo', lanes, f: { view: 'list', show: 'orders' } });
  assert.ok(l.includes('Project list') && l.includes('Gamma sign') && !l.includes('Alpha sign'));
});
