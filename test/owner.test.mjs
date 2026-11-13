import test from 'node:test';
import assert from 'node:assert/strict';

const T = await import('../app/team.mjs');

test('owner check: OWNER_EMAIL or an Owner on the team; everyone else is not', () => {
  const team = [{ role: 'Owner', email: 'Phil.Warden@fastsigns.com' }, { role: 'Sales', email: 'kristin@x.com' }];
  assert.ok(T.isOwner('phil.warden@fastsigns.com', team, ''));
  assert.ok(!T.isOwner('kristin@x.com', team, ''));
  assert.ok(T.isOwner('boss@x.com', [], 'Boss@x.com'));
  assert.ok(!T.isOwner('', team, 'a@b.c'));
});
