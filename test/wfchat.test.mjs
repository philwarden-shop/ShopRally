import test from 'node:test';
import assert from 'node:assert/strict';

const W = await import('../app/wfbuilder.mjs');
const draft = W.baseline([{ id: 'qc', name: 'Quality control', board: 'production', owner: 'Salesperson' }, { id: 'proofwait', name: 'Awaiting customer approval', board: 'design', owner: 'Customer' }, { id: 'wip', name: 'WIP', board: 'production', owner: 'Production' }], { qc: 1, proofwait: 3 });

test('process expert chat: days and owners from plain sentences; asks when unclear', () => {
  let r = W.interpret(draft, 'Give quality control 2 days');
  assert.deepEqual(r.changes, { days_qc: '2' }); assert.match(r.reply, /Quality control is now 2 days/);
  r = W.interpret(draft, 'The production lead owns quality control');
  assert.deepEqual(r.changes, { owner_qc: 'Production lead' });
  r = W.interpret(draft, 'customer approval should take 5 days, assign to the salesperson');
  assert.deepEqual(r.changes, { days_proofwait: '5', owner_proofwait: 'Salesperson' });
  assert.match(W.interpret(draft, 'make it faster').reply, /which step/);
  assert.match(W.interpret(draft, 'quality control').reply, /change who owns it/);
  assert.equal(W.editDraft(draft, W.interpret(draft, 'Give quality control 2 days').changes).find((s) => s.id === 'qc').days, 2);
});
