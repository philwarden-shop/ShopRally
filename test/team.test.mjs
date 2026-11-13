import test from 'node:test';
import assert from 'node:assert/strict';

const T = await import('../app/team.mjs');

test('team members: add with role and location, no duplicates, cannot remove yourself', () => {
  let t = T.demoTeam();
  t = T.addMember(t, { name: 'Dana Lee', role: 'Permits', loc: 'two', email: 'dana@x.com' });
  assert.deepEqual(t[t.length - 1], { key: 'dana', name: 'Dana Lee', role: 'Permits', loc: 'two', email: 'dana@x.com' });
  assert.throws(() => T.addMember(t, { name: 'Dana Smith', role: 'Sales' }), /already on the team/);
  assert.throws(() => T.addMember(t, { name: 'Bo', role: 'Boss' }), /pick a role/);
  assert.throws(() => T.removeMember(t, 'phil', 'phil'), /cannot remove yourself/);
  assert.equal(T.removeMember(t, 'dana', 'phil').length, t.length - 1);
  assert.ok(T.teamAdminPage({ user: {}, team: t }).includes('Add a Team Member'));
});
