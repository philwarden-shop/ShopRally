import test from 'node:test';
import assert from 'node:assert/strict';

const W = await import('../app/wfbuilder.mjs');
const steps = [{ id: 'proofwait', name: 'Awaiting customer approval', board: 'design', owner: 'Customer' }, { id: 'qc', name: 'Quality control', board: 'production', owner: 'Salesperson' }, { id: 'done', name: 'Complete', board: 'none', owner: 'x' }];

test('workflow builder: draft edits validated, diff shows unpublished changes, Complete is not editable', () => {
  const pub = W.baseline(steps, { proofwait: 3, qc: 1 });
  assert.deepEqual(pub.map((s) => s.id), ['proofwait', 'qc']);
  const d = W.editDraft(pub, { owner_qc: 'Production lead', days_qc: '2' });
  assert.deepEqual(W.diff(pub, d), ['qc']);
  assert.throws(() => W.editDraft(pub, { owner_qc: ' ' }), /needs an owner/);
  assert.throws(() => W.editDraft(pub, { days_qc: '99' }), /0 to 60/);
  assert.match(W.expertTips(d).join(' '), /Quality control longer than a day/);
  const h = W.builderPage({ user: {}, published: pub, draft: d });
  assert.ok(h.includes('Draft · 1 unpublished change') && h.includes('✦ Process Expert'));
  assert.ok(W.builderPage({ user: {}, published: pub, draft: pub }).includes('>Published<'));
});

test('proofing: round limit from Admin; reminders after N days waiting on the customer', () => {
  assert.deepEqual(W.proofRound({ revision: 3 }, 3), { round: 4, limit: 3, over: true });
  assert.equal(W.proofRound({}, 3).over, false);
  const now = new Date('2026-11-12T12:00:00Z');
  const items = [{ id: 'a', name: 'A', step: 'proofwait', movedAt: '2026-11-09T12:00:00Z' }, { id: 'b', name: 'B', step: 'proofwait', movedAt: '2026-11-12T08:00:00Z' }, { id: 'c', name: 'C', step: 'indesign', revision: 3, projectId: 'p' }];
  const r = W.proofReminders(items, now, 2);
  assert.deepEqual(r.map((x) => [x.id, x.waited]), [['a', 3]]);
  const h = W.proofPanel(r, items, 3);
  assert.ok(h.includes('Proofs Needing a Nudge · 2') && h.includes('round 4 of 3'));
  assert.equal(W.proofPanel([], [], 3), '');
});
