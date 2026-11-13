import test from 'node:test';
import assert from 'node:assert/strict';

const C = await import('../app/custrecord.mjs');

test('customer activity: logged newest first, needs a kind and a note, moves last contact forward', () => {
  let p = C.logActivity({}, { actKind: 'Call', actNote: 'Talked about the pylon', actDate: '2026-11-01' }, { who: 'phil', at: '2026-11-12T10:00:00Z' });
  p = C.logActivity(p, { actKind: 'Visit', actNote: 'Site walk' }, { who: 'phil', at: '2026-11-12T11:00:00Z' });
  assert.deepEqual(p.activity.map((a) => a.kind), ['Visit', 'Call']);
  assert.equal(p.lastContact, '2026-11-12');
  assert.throws(() => C.logActivity(p, { actKind: 'Fax', actNote: 'x y' }, { who: 'p', at: '2026-11-12T00:00:00Z' }), /Call, Email, Visit or Note/);
  assert.throws(() => C.logActivity(p, { actKind: 'Call', actNote: '' }, { who: 'p', at: '2026-11-12T00:00:00Z' }), /short note/);
});

test('keep warm: Active, Keep Warm and Dormant follow the Admin day counts', () => {
  const c = { projects: [{ due: '2026-01-01' }] };
  assert.equal(C.warmth(c, {}, '2026-11-12').state, 'Dormant');
  assert.equal(C.warmth(c, { lastContact: '2026-07-01' }, '2026-11-12').state, 'Keep Warm');
  assert.equal(C.warmth(c, { lastContact: '2026-11-01' }, '2026-11-12').state, 'Active');
  assert.equal(C.warmth(c, { lastContact: '2026-10-01' }, '2026-11-12', { keepWarmDays: 30, dormantDays: 60 }).state, 'Keep Warm');
});

test('insight votes are recorded and only up/down are allowed', () => {
  const p = C.voteInsight({}, 'up', { who: 'phil', at: 't' });
  assert.equal(p.insightVotes[0].v, 'up');
  assert.throws(() => C.voteInsight(p, 'meh', { who: 'p', at: 't' }), /thumbs/);
});
