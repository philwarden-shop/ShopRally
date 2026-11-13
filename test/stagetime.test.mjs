import test from 'node:test';
import assert from 'node:assert/strict';
const S = await import('../app/stagetime.mjs');
test('stage time left: records stage entry, counts days against the target, flags over', () => {
  let r = S.trackLanes({}, [{ id: 'a', lane: 'progress' }], '2026-11-10');
  assert.ok(r.changed); assert.equal(r.since.a.since, '2026-11-10');
  r = S.trackLanes(r.since, [{ id: 'a', lane: 'progress' }], '2026-11-12'); assert.ok(!r.changed);
  const s = S.stageLeft(r.since.a, '2026-11-13', S.targetsFrom({ target_progress: 4 }));
  assert.deepEqual([s.used, s.target, s.left], [3, 4, 1]);
  assert.match(S.stagePill(s), /Stage time left[\s\S]*1 day[\s\S]*of 4 in In production/);
  assert.match(S.stagePill(S.stageLeft(r.since.a, '2026-11-25', S.targetsFrom({}))), /day.* over/);
  assert.equal(S.stageLeft({ lane: 'complete', since: '2026-11-01' }, '2026-11-13'), null);
  r = S.trackLanes(r.since, [{ id: 'a', lane: 'built' }], '2026-11-14'); assert.deepEqual([r.since.a.lane, r.since.a.from], ['built', 'progress']);
});
