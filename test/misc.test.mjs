import test from 'node:test';
import assert from 'node:assert/strict';

const M = await import('../app/misc.mjs');

test('search: customers, projects and open tasks; needs 2+ letters', () => {
  const r = M.search('river', { customers: [{ id: 'r', name: 'Riverbend Dental', contacts: [] }], projects: [{ id: 'p', name: 'Lobby', company: 'Riverbend Dental' }], tasks: [{ title: 'Call', customer: 'Riverbend', done: false }, { title: 'x', customer: 'Riverbend', done: true }] });
  assert.deepEqual([r.customers.length, r.projects.length, r.tasks.length], [1, 1, 1]);
  assert.equal(M.search('r', { customers: [{ name: 'R' }] }).customers.length, 0);
  assert.ok(!M.searchPage({ user: {}, q: '<x>', results: r }).includes('<x>'));
});

test('feedback and profile: validated and saved', () => {
  const l = M.addFeedback([], { kind: 'Idea', text: 'Add a dark theme' }, { who: 'phil', at: 't' });
  assert.equal(l[0].kind, 'Idea');
  assert.throws(() => M.addFeedback(l, { kind: 'Rant', text: 'abc' }, {}), /what kind/);
  assert.throws(() => M.addFeedback(l, { kind: 'Idea', text: '' }, {}), /little more/);
  const me = M.mergeMe({}, { displayName: 'Phil W', dailyDigest: 'on' });
  assert.deepEqual([me.displayName, me.dailyDigest, me.paymentIn], ['Phil W', true, false]);
});

test('pay panel: eCheck has no fee, card adds the Admin fee, nothing shown with no balance', () => {
  assert.deepEqual(M.payAmounts(1070, 3), { echeck: 1070, card: 1102.1, fee: 32.1 });
  assert.match(M.payPanel(1070, 3), /\$1,102\.10[\s\S]*3% card fee/);
  assert.equal(M.payPanel(0, 3), '');
});
