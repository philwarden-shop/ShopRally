import { test } from 'node:test';
import assert from 'node:assert/strict';

test('repeating tasks: next one added on done, counted from done or due, stops after N or on a date', async () => {
  const A = await import('../app/activities.mjs');
  let t = A.addTask([], { title: 'Quarterly check-in', kind: 'call', due: '2026-11-13', repeatOn: '1', repeatEvery: '3', repeatUnit: 'months', repeatFrom: 'due', repeatStop: 'after', repeatTimes: '2', notes: 'Ask about the new office' }, { id: 't1' });
  assert.equal(t[0].notes, 'Ask about the new office'); assert.deepEqual(t[0].repeat, { every: 3, unit: 'months', from: 'due', stop: 'after', left: 2 });
  t = A.completeTask(t, 't1', '2026-11-20T15:00:00Z');
  assert.equal(t.length, 2); assert.equal(t[1].due, '2027-02-13'); assert.equal(t[1].repeat.left, 1); assert.equal(t[1].done, false);
  t = A.completeTask(t, t[1].id, '2027-02-13T15:00:00Z');
  assert.equal(t.length, 2, 'stopped after 2 times');
  let w = A.addTask([], { title: 'Water plants', kind: 'task', due: '2026-11-13', repeatOn: '1', repeatEvery: '1', repeatUnit: 'weeks', repeatFrom: 'done', repeatStop: 'date', repeatUntil: '2026-11-25' }, { id: 'w1' });
  w = A.completeTask(w, 'w1', '2026-11-15T10:00:00Z'); assert.equal(w[1].due, '2026-11-22');
  w = A.completeTask(w, w[1].id, '2026-11-22T10:00:00Z'); assert.equal(w.length, 2, 'next would be after the stop date');
  assert.equal(A.addTask([], { title: 'One time', kind: 'task', due: '2026-11-13' }, { id: 'o' })[0].repeat, undefined);
  assert.throws(() => A.addTask([], { title: 'Bad', kind: 'task', due: '2026-11-13', repeatOn: '1', repeatEvery: '2', repeatStop: 'date' }), /stop date/);
});

test('add prospect: email, phone, chance to close, temperature; bad email refused', async () => {
  const C = await import('../app/create.mjs');
  const l = C.newProject([], { name: 'Lobby sign', company: 'Acme', contact: 'Dana', email: 'dana@acme.com', phone: '859-555-0100', chance: '75', temperature: 'Hot', total: '$2,400' }, { id: 'n1' });
  assert.deepEqual([l[0].email, l[0].phone, l[0].chance, l[0].temperature, l[0].total], ['dana@acme.com', '859-555-0100', 75, 'Hot', 2400]);
  assert.throws(() => C.newProject([], { name: 'X sign', company: 'Acme', email: 'bad' }), /email/);
  const h = C.newProjectPage({ user: {} });
  assert.ok(h.includes('Add Prospect') && h.includes('Add and Start an Estimate') && h.includes('Chance to close') && h.includes('SalesMax will set up'));
});
