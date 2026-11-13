import test from 'node:test';
import assert from 'node:assert/strict';

const P = await import('../app/perf.mjs');
const A = await import('../app/activities.mjs');
const projects = [
  { lane: 'complete', total: 30000, salesperson: 'Phil Warden' }, { lane: 'progress', total: 15000, salesperson: 'Phil Warden' },
  { lane: 'lost', total: 5000, salesperson: 'Phil Warden' }, { lane: 'estimate', total: 2000, salesperson: 'Kristin W' },
];

test('performance: sold, quotes and close rate; wins when goals are hit', () => {
  const s = P.salesStats(projects, 'phil');
  assert.deepEqual([s.sold, s.wonCount, s.closeRate, s.quoteCount], [45000, 2, 67, 0]);
  assert.equal(P.teamWins(s, { monthSales: 40000, closeRate: 50 }).length, 2);
  assert.equal(P.teamWins(s, { monthSales: 90000, closeRate: 90 }).length, 0);
});

test('performance page: fireworks only on preview and only when celebrations are on', () => {
  assert.ok(P.performancePage({ user: {}, projects, preview: true }).includes('Goal hit! 🎆'));
  assert.ok(!P.performancePage({ user: {}, projects }).includes('class="fw"'));
  assert.ok(!P.performancePage({ user: {}, projects, preview: true, celebrations: false }).includes('class="fw"'));
});

test('team page: stuck rows show escalate vs follow up; workload per person; escaped', () => {
  const h = P.teamPage({ user: {}, stuck: [{ id: 'a', name: '<b>x</b>', projectId: 'p', step: 'hold', escalate: true, person: 'Kristin' }], items: [{ step: 'wip', person: 'Kristin' }, { step: 'wip', person: 'Kristin' }, { step: 'complete', person: 'Bo' }] });
  assert.ok(h.includes('Escalate') && h.includes('Stuck · 1') && !h.includes('<b>x</b>'));
  assert.match(h, /Kristin<\/td><td>2/);
  assert.ok(!h.includes('>Bo<'));
});

test('new task: needs a title, a known kind and a real date; lands in the right group', () => {
  const today = '2026-11-12';
  let t = A.addTask(A.demoTasks(today), { title: 'Call Dana', kind: 'call', due: today, projectId: 'demo-10' }, { customer: 'Riverbend Dental', id: 'n1' });
  assert.equal(t.length, 9);
  assert.ok(A.groupTodos(t, today).today.some((x) => x.id === 'n1'));
  assert.throws(() => A.addTask(t, { title: ' ', kind: 'call', due: today }), /title/);
  assert.throws(() => A.addTask(t, { title: 'xy', kind: 'fax', due: today }), /kind/);
  assert.throws(() => A.addTask(t, { title: 'xy', kind: 'call', due: 'tomorrow' }), /date/);
});

test('scorecard goals come from Admin; celebrations off hides preview', () => {
  const sc = A.scorecard({ tasks: [], today: '2026-11-12', goals: { goalTasks: 5, goalQuotes: 1, goalOrders: 2 } });
  assert.deepEqual(sc.map((s) => s.goal), [5, 10, 6, 1, 2]);
  const h = A.activitiesPage({ user: {}, tasks: [], today: '2026-11-12', celebrations: false });
  assert.ok(!h.includes('Preview 🎉'));
  assert.ok(A.activitiesPage({ user: {}, tasks: [], today: '2026-11-12', newTask: { projectId: 'demo-10' }, projects: [{ id: 'demo-10', name: 'Lobby', company: 'R', lane: 'progress' }] }).includes('<details open'));
});
