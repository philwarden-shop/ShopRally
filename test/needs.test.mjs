import test from 'node:test';
import assert from 'node:assert/strict';

const C = await import('../app/custrecord.mjs');

test('upcoming needs: become a follow-up task on their date; validated', () => {
  const r = C.addNeed({}, { needWhat: 'Trade show banners', needDate: '2027-03-01' }, { at: 't' });
  assert.equal(r.profile.needs.length, 1);
  assert.deepEqual([r.task.title, r.task.due, r.task.kind], ['Follow up: Trade show banners', '2027-03-01', 'call']);
  assert.throws(() => C.addNeed({}, { needWhat: 'x', needDate: '2027-03-01' }, { at: 't' }), /what they will need/);
  assert.throws(() => C.addNeed({}, { needWhat: 'Banners', needDate: 'spring' }, { at: 't' }), /when to follow up/);
  assert.ok(C.needsHtml('r', r.profile.needs).includes('(task on Activities)'));
});
