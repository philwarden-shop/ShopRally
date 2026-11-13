import test from 'node:test';
import assert from 'node:assert/strict';

const A = await import('../app/activities.mjs');
const O = await import('../app/ops.mjs');

test('hand-off tasks: appear only when every item is built; one per project; worded by hand-off type', () => {
  const items = [
    { id: 'a', projectId: 'p1', step: 'built', handoff: 'Install' }, { id: 'b', projectId: 'p1', step: 'built' },
    { id: 'c', projectId: 'p2', step: 'built', handoff: 'Ship' }, { id: 'd', projectId: 'p2', step: 'wip' },
    { id: 'e', projectId: 'p3', step: 'done' },
  ];
  const t = A.autoHandoffTasks(items, [{ id: 'p1', company: 'Acme' }], '2026-11-12');
  assert.deepEqual(t.map((x) => [x.id, x.title, x.customer]), [['auto-p1', 'Confirm the install date with the customer', 'Acme']]);
  const merged = A.mergeAuto([{ id: 'auto-p1', done: true }], t);
  assert.equal(merged.length, 1);
  assert.equal(A.groupTodos(A.mergeAuto([], t), '2026-11-12').today.length, 1);
});

test('coming up today reads each item’s hand-off and install crew', () => {
  const up = O.comingUpToday([{ id: 'x', name: 'Install', projectId: 'p', due: '2026-11-12', step: 'built', handoff: 'Install', person: 'Install crew A' }], '2026-11-12');
  assert.deepEqual([up[0].destination, up[0].ready], ['Install', true]);
});
