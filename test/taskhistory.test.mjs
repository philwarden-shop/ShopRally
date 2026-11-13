import test from 'node:test';
import assert from 'node:assert/strict';

const C = await import('../app/custrecord.mjs');

test('finished tasks become customer history once', () => {
  let p = C.activityFromTask({}, { id: 't1', kind: 'call', title: 'Call about install' }, { who: 'phil', at: '2026-11-12T15:00:00Z' });
  assert.deepEqual([p.activity[0].kind, p.activity[0].note, p.lastContact], ['Call', 'Done: Call about install', '2026-11-12']);
  p = C.activityFromTask(p, { id: 't1', kind: 'call', title: 'Call about install' }, { who: 'phil', at: '2026-11-12T16:00:00Z' });
  assert.equal(p.activity.length, 1);
});
