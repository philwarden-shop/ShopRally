import test from 'node:test';
import assert from 'node:assert/strict';
const Q = await import('../app/sequences.mjs');
test('sequences: three prebuilt, off by default; admins edit steps, add, remove, reset, toggle; due steps by day', () => {
  const d = Q.withDefaults(null);
  assert.deepEqual(d.slice(0, 3).map((s) => [s.id, s.on]), [['welcome', false], ['nextsteps', false], ['payment', false]]);
  assert.equal(d.length, 14); assert.ok(d.slice(3).every((s) => s.on === false && s.draft && s.steps.length));
  let s = Q.mergeSequenceForm(d, 'payment', { do: 'toggle', on: '1' });
  assert.equal(s[2].on, true);
  s = Q.mergeSequenceForm(s, 'payment', { day0: '2', kind0: 'email', subject0: 'Deposit please', body0: 'x', day1: '4', kind1: 'task', subject1: 'Call them', remove1: 'on', add: 'task' });
  assert.deepEqual(s[2].steps.map((x) => [x.day, x.kind]), [[2, 'email'], [4, 'task']]);
  assert.throws(() => Q.mergeSequenceForm(s, 'payment', { day0: '999', subject0: 'abc' }), /0 to 365/);
  s = Q.mergeSequenceForm(s, 'payment', { do: 'reset' });
  assert.equal(s[2].steps.length, 4); assert.equal(s[2].on, true);
  assert.deepEqual(Q.dueSteps(s[2], { start: '2026-11-10', today: '2026-11-13', doneIdx: [0] }).map((x) => x.n), [1]);
  assert.deepEqual(Q.dueSteps(s[2], { start: '2026-11-10', today: '2026-11-13', stopped: true }), []);
  assert.deepEqual(Q.dueSteps(d[0], { start: '2026-11-01', today: '2026-11-13' }), []);
  assert.equal(Q.fill('Hi {{first_name}}, order {{order_number}} {{nope}}', { first_name: 'Dana', order_number: '226-75148' }), 'Hi Dana, order 226-75148 {{nope}}');
  const h = Q.sequencesPage({ page: ({ body }) => body, user: {}, seqs: s });
  assert.ok(h.includes('New Customer Welcome') && h.includes('New Order, Missing Payment Reminder') && h.includes('New Order, Next Steps') && h.includes('Turn On') && h.includes('Turn Off'));
});

test('sequence engine: on sequences put due steps in To Do, stop rules apply, done steps disappear', () => {
  const seqs = Q.withDefaults(null).map((s) => ({ ...s, on: s.id !== 'welcome' }));
  const projects = [{ id: 'p1', lane: 'progress', company: 'Acme', contact: 'Dana Ruiz', orderId: '75148' }, { id: 'p2', lane: 'complete', company: 'Beta', contact: 'Al' }, { id: 'p0', lane: 'prospect', company: 'Gamma' }];
  let r = Q.sequenceTodos({ seqs, projects, today: '2026-11-12', unpaid: new Set(['p1']), prefix: '226' });
  assert.deepEqual(r.todos.map((t) => t.title), ['Order 226-75148: what happens next']);
  r = Q.sequenceTodos({ seqs, projects, state: r.state, today: '2026-11-15', unpaid: new Set(['p1']), prefix: '226' });
  assert.deepEqual(r.todos.map((t) => t.seqName + ':' + t.seqStep), ['New Order, Next Steps:0', 'New Order, Next Steps:1', 'New Order, Missing Payment Reminder:0', 'New Order, Missing Payment Reminder:1']);
  let st = Q.markStepDone(r.state, 'nextsteps|p1', 0);
  r = Q.sequenceTodos({ seqs, projects, state: st, today: '2026-11-15', unpaid: new Set(), prefix: '226' });
  assert.deepEqual(r.todos.map((t) => t.seqName + ':' + t.seqStep), ['New Order, Next Steps:1']);
  assert.match(r.todos[0].title, /Acme/);
});

test('sequences: start on the approval date; progress shows on the customer', () => {
  const seqs = Q.withDefaults(null).map((s) => (s.id === 'nextsteps' ? { ...s, on: true } : s));
  const projects = [{ id: 'p1', name: 'Lobby sign', company: 'Riverbend Dental', contact: 'Dana Ruiz', lane: 'progress' }];
  const r = Q.sequenceTodos({ seqs, projects, state: {}, today: '2026-11-13', startOf: { p1: '2026-11-10' } });
  assert.equal(r.state['nextsteps|p1'].start, '2026-11-10');
  assert.equal(r.todos.length, 2);
  const pr = Q.sequenceProgress({ seqs, state: { 'nextsteps|p1': { start: '2026-11-10', done: [0] } }, projects, today: '2026-11-13' });
  assert.deepEqual([pr[0].done, pr[0].total, pr[0].nextDate, pr[0].due], [1, 2, '2026-11-12', true]);
  assert.match(Q.sequenceProgressHtml(pr), /New Order, Next Steps[\s\S]*1 of 2 steps done/);
});
