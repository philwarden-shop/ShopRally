import test from 'node:test';
import assert from 'node:assert/strict';
const N = await import('../app/projnotes.mjs');
test('project notes and tasks tabs', () => {
  const n = N.addNote([], '  Dana wants it bigger ', { by: 'Phil', at: '2026-11-13T04:00:00.000Z' });
  assert.equal(n[0].text, 'Dana wants it bigger');
  assert.throws(() => N.addNote([], ' ', { by: 'x', at: '2026-11-13T04:00:00.000Z' }), /write a note/);
  assert.match(N.notesHtml('p1', n), /Notes · 1[\s\S]*Phil[\s\S]*Dana wants it bigger/);
  const h = N.projectTasksHtml2('p1', [{ id: 't1', projectId: 'p1', title: 'Call Dana', due: '2026-11-12', done: false }, { id: 't2', projectId: 'p2', title: 'Other', due: '2026-11-12' }, { id: 't3', projectId: 'p1', title: 'Old', done: true }], '2026-11-13');
  assert.ok(h.includes('Tasks · 1 open') && h.includes('Call Dana') && !h.includes('Other') && h.includes('Done Recently · 1'));
});
