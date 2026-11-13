import test from 'node:test';
import assert from 'node:assert/strict';

const O = await import('../app/ops.mjs');

test('PO check: exact passes; tax-exempt without tax passes; just-tax short is a note; real gaps are errors', () => {
  assert.equal(O.poCheck({ poAmount: '1070', total: 1070 }).level, 'ok');
  assert.equal(O.poCheck({ poAmount: '1000', total: 1060, tax: 60, taxExempt: true }).level, 'ok');
  const n = O.poCheck({ poAmount: '1000', total: 1060, tax: 60 });
  assert.equal(n.level, 'note'); assert.ok(n.ok); assert.match(n.msg, /just the tax/);
  const e = O.poCheck({ poAmount: '900', total: 1060, tax: 60 });
  assert.equal(e.ok, false); assert.match(e.msg, /under the order by \$160\.00/);
  assert.equal(O.poCheck({ poAmount: '', total: 5 }).level, 'error');
});

test('coordinator: due-today items show ready or what is missing; handled list counts', () => {
  const items = [
    { id: 'a', name: 'Lobby', projectId: 'p', due: '2026-11-12', step: 'built', destination: 'Pickup' },
    { id: 'b', name: 'Truck', projectId: 'p', due: '2026-11-12', step: 'wip', destination: 'Install' },
    { id: 'c', name: 'Later', projectId: 'p', due: '2026-11-13', step: 'built' },
  ];
  const up = O.comingUpToday(items, '2026-11-12');
  assert.deepEqual(up.map((u) => [u.id, u.ready]), [['a', true], ['b', false]]);
  assert.deepEqual(up[1].gaps, ['not built yet', 'no install crew assigned']);
  const h = O.coordinatorHtml(up, O.demoHandled('2026-11-12'));
  assert.ok(h.includes('Coming Up Today · No Surprises') && h.includes('Handled For You Today · 5'));
});

test('My Projects tiles: Phil’s order, counts and pipeline values', () => {
  const projects = [
    { id: '1', lane: 'progress', total: 100, due: '2026-11-20' }, { id: '2', lane: 'progress', total: 50, due: '2026-11-01' },
    { id: '3', lane: 'lost', total: 70 }, { id: '4', lane: 'estimate', total: 30 },
  ];
  const t = O.projectTiles(projects, [{ projectId: '1', done: false }], '2026-11-12');
  assert.deepEqual(t.map((x) => x.label), ['On schedule', 'Stuck', 'Missing a next step', 'Lost pipeline', 'Open pipeline']);
  assert.deepEqual(t.map((x) => x.count), [2, 1, 2, 1, 3]);
  assert.equal(t[4].value, 180); assert.equal(t[3].value, 70);
});
