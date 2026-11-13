import test from 'node:test';
import assert from 'node:assert/strict';

const A = await import('../app/activities.mjs');
const X = await import('../app/projectx.mjs');

test('snooze: moves the due date forward from today (or the later due date); only 1, 3 or 7 days', () => {
  const t = [{ id: 'a', due: '2026-11-10' }, { id: 'b', due: '2026-11-20' }];
  assert.equal(A.snoozeTask(t, 'a', '1', '2026-11-12').find((x) => x.id === 'a').due, '2026-11-13');
  assert.equal(A.snoozeTask(t, 'b', '7', '2026-11-12').find((x) => x.id === 'b').due, '2026-11-27');
  assert.throws(() => A.snoozeTask(t, 'a', '30', '2026-11-12'), /1, 3 or 7/);
});

test('mark lost: only prospects/estimates, needs a reason, counts as lost', () => {
  const o = X.markLost({}, { id: 'p', lane: 'estimate' }, { reason: 'Price' }, { by: 'phil', at: 't' });
  assert.deepEqual([o.p.lane, o.p.status], ['lost', 'Lost: Price']);
  assert.throws(() => X.markLost({}, { id: 'p', lane: 'progress' }, { reason: 'Price' }, {}), /only prospects/);
  assert.throws(() => X.markLost({}, { id: 'p', lane: 'estimate' }, { reason: 'Meh' }, {}), /why/);
});
