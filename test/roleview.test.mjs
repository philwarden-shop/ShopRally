import test from 'node:test';
import assert from 'node:assert/strict';

const R = await import('../app/roleview.mjs');

test('role activities: design and production group items by their steps; permits/purchasing by open columns', () => {
  const items = [{ id: 'a', name: 'Lobby', step: 'indesign', projectId: 'p', person: 'Bo', rush: true }, { id: 'b', name: 'Door', step: 'wip', projectId: 'p' }];
  const d = R.roleGroups('design', { items, stepName: (s) => s.toUpperCase() });
  assert.deepEqual(d.find((g) => g.key === 'indesign').rows.map((r) => r.id), ['a']);
  assert.ok(!d.some((g) => g.rows.some((r) => r.id === 'b')));
  const pm = R.roleGroups('permits', { records: [{ id: 'x', name: 'Pylon', col: 'needs' }, { id: 'y', name: 'Done', col: 'approved' }], cols: [['needs', 'Needs Application'], ['approved', 'Approved']] });
  assert.deepEqual(pm.map((g) => g.label), ['Needs Application']);
  const h = R.roleActivitiesPage({ user: {}, role: 'design', groups: d });
  assert.ok(h.includes('Viewing as Design') && h.includes('My Work · 1') && h.includes('Rush'));
});
