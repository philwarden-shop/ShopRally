import test from 'node:test';
import assert from 'node:assert/strict';

const A = await import('../app/activities.mjs');
const today = '2026-11-12';

test('activities: tasks land in Past Due / Due Today / Due Soon / Due Later', () => {
  const g = A.groupTodos(A.demoTasks(today), today);
  assert.deepEqual(g.past.map((t) => t.id), ['t1', 't2']);
  assert.deepEqual(g.today.map((t) => t.id).sort(), ['t3', 't4', 't5']);
  assert.deepEqual(g.soon.map((t) => t.id), ['t6', 't7']);
  assert.deepEqual(g.later.map((t) => t.id), ['t8']);
});

test('activities: open projects with no open task show as Missing Next Step; done/lost do not', () => {
  const projects = [{ id: 'demo-10', lane: 'progress', name: 'Lobby', company: 'Riverbend' }, { id: 'x1', lane: 'estimate', name: 'Banner', company: 'Acme' }, { id: 'x2', lane: 'complete', name: 'Old', company: 'Old Co' }];
  const g = A.groupTodos(A.demoTasks(today), today, { projects });
  assert.deepEqual(g.missing.map((t) => t.projectId), ['x1']);
});

test('activities: chip filter narrows every group and counts only open tasks', () => {
  let tasks = A.demoTasks(today);
  tasks = A.completeTask(tasks, 't5', today + 'T14:00:00Z');
  const g = A.groupTodos(tasks, today, { filter: 'email' });
  assert.deepEqual([...g.past, ...g.today, ...g.soon, ...g.later].map((t) => t.id), ['t1']);
  assert.equal(A.chipCounts(tasks).find((k) => k.key === 'email').count, 1);
});

test('scorecard: counts from SalesMax task log and stage history only; holds and other days do not count', () => {
  let tasks = A.demoTasks(today);
  tasks = A.completeTask(tasks, 't1', today + 'T13:00:00Z');
  tasks = A.completeTask(tasks, 't2', today + 'T13:10:00Z');
  tasks = A.completeTask(tasks, 't4', '2026-11-11T20:00:00Z');
  const log = [
    { itemId: 'i1', to: 'files', at: today + 'T15:00:00Z', by: 'phil.warden@fastsigns.com' },
    { itemId: 'i1', to: 'wip', at: today + 'T16:00:00Z', by: 'phil.warden@fastsigns.com' },
    { itemId: 'i2', to: 'hold', at: today + 'T16:00:00Z', by: 'phil.warden@fastsigns.com' },
    { itemId: 'i3', to: 'wip', at: '2026-11-11T16:00:00Z', by: 'phil.warden@fastsigns.com' },
  ];
  const s = Object.fromEntries(A.scorecard({ tasks, log, today }).map((x) => [x.key, x.value]));
  assert.deepEqual(s, { tasks: 2, emails: 1, customers: 1, quotes: 1, orders: 1 }); // both tasks were for the same customer
});

test('activities: completing twice is harmless; unknown task is refused', () => {
  const tasks = A.completeTask(A.demoTasks(today), 't3', 'x');
  assert.equal(A.completeTask(tasks, 't3', 'y').find((t) => t.id === 't3').doneAt, 'x');
  assert.throws(() => A.completeTask(tasks, 'nope', 'x'), /not here/);
});

test('activities page: Title Case headings, escapes text, scorecard only for sales, confetti only on preview', () => {
  const tasks = A.demoTasks(today).map((t) => (t.id === 't1' ? { ...t, title: '<script>x</script>' } : t));
  const h = A.activitiesPage({ user: { email: 'p@x' }, tasks, today });
  assert.ok(!h.includes('<script>x'));
  for (const s of ['To Do', 'Missing Next Step', 'Past Due', 'Due Today', 'Due Soon', 'Due Later', 'Today’s Scorecard', 'Orders Moved Forward']) assert.ok(h.includes(s), s);
  assert.ok(!h.includes('class="party"'));
  assert.ok(A.activitiesPage({ user: {}, tasks, today, party: true }).includes('class="party"'));
  assert.ok(!A.activitiesPage({ user: {}, tasks, today, isSales: false }).includes('Today’s Scorecard'));
});
