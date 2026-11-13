import { test } from 'node:test';
import assert from 'node:assert/strict';

test('team: slipping list (late tasks, unanswered email, no next step, stuck) and By Salesperson rows', async () => {
  const P = await import('../app/perf.mjs');
  const team = [{ key: 'kristin', name: 'Kristin Ames' }, { key: 'tom', name: 'Tom Butler' }];
  const projects = [{ id: 'a', name: 'Lobby', company: 'Acme', lane: 'estimate', total: 1000, salesperson: 'Kristin Ames' }, { id: 'b', name: 'Wrap', company: 'Bo', lane: 'complete', total: 5000, salesperson: 'Tom Butler' }, { id: 'c', name: 'Sign', company: 'Cy', lane: 'progress', total: 2000, salesperson: 'Tom Butler' }];
  const tasksBy = { kristin: [{ title: 'Call Acme', due: '2026-11-10', done: false, projectId: 'x' }], tom: [{ title: 'Ship', due: '2026-11-20', done: false, projectId: 'c' }] };
  const mailBy = { tom: [{ folder: 'inbox', subject: 'Grommets?', from: 'a@b.com', at: '2026-11-11T10:00:00Z' }] };
  const s = P.slipping({ projects, tasksBy, mailBy, team, today: '2026-11-13' });
  assert.deepEqual(s.map((x) => x.type).sort(), ['Email', 'Project', 'Task']);
  assert.equal(s.find((x) => x.type === 'Task').age, '3 days late');
  assert.equal(s.find((x) => x.type === 'Project').title, 'Lobby');
  const r = P.repRows({ projects, tasksBy, mailBy, today: '2026-11-13', goal: 10000 });
  const tom = r.find((x) => x.name === 'Tom Butler');
  assert.deepEqual([tom.sold, tom.pct, tom.unanswered, tom.missing], [7000, 70, 1, 0]);
  const h = P.teamPage({ user: {}, stuck: [], items: [], slip: s, reps: r });
  assert.ok(h.includes('Slipping Through the Cracks') && h.includes('By Salesperson') && h.includes('Nudge') && h.includes('Customers waiting on us'));
});
