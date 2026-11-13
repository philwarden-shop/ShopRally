import { test } from 'node:test';
import assert from 'node:assert/strict';

test('notes: @mentions find teammates by first name, full name or key; a task is added for each', async () => {
  const N = await import('../app/projnotes.mjs');
  const team = [{ key: 'kristin', name: 'Kristin Wellbrock' }, { key: 'mike', name: 'Mike' }, { key: 'phil', name: 'Phil Warden' }];
  assert.deepEqual(N.mentionsIn('@Kristin can you check? cc @phil-warden', team).map((t) => t.key), ['kristin', 'phil']);
  assert.deepEqual(N.mentionsIn('email me at a@b.com', team).map((t) => t.key), []);
  assert.deepEqual(N.mentionsIn('no tags', team), []);
  const t = N.mentionTask([], { note: '@Kristin colors changed', by: 'Phil', project: { id: 'demo-10', company: 'Riverbend Dental' }, today: '2026-11-13' });
  assert.equal(t[0].title, 'Phil mentioned you: @Kristin colors changed'); assert.equal(t[0].projectId, 'demo-10'); assert.equal(t[0].due, '2026-11-13');
});
