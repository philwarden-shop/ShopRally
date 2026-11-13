import test from 'node:test';
import assert from 'node:assert/strict';
const E = await import('../app/expected.mjs');
test('expected ready = latest of velocity + vended; hard due never shifts; late alerts; customer date rule', () => {
  let x = E.expectedReady({ velocity: '2026-11-12', vended: [{ name: 'Desk logo acrylic', date: '2026-11-18' }], hardDue: '2026-11-13' });
  assert.deepEqual([x.expected, x.late, x.customerDate], ['2026-11-18', true, '2026-11-13']);
  assert.match(E.expectedPanel(x), /after the hard due date/);
  x = E.expectedReady({ velocity: '2026-11-16', vended: [] });
  assert.deepEqual([x.expected, x.late, x.customerDate], ['2026-11-16', false, '2026-11-16']);
  assert.equal(E.lateTasks([{ late: true, projectId: 'p1', name: 'Lobby', company: 'R', expected: '2026-11-18', hardDue: '2026-11-13' }, { late: false }], '2026-11-12').length, 1);
});
