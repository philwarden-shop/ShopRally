import test from 'node:test';
import assert from 'node:assert/strict';

const S = await import('../app/setup.mjs');

test('interview answers become workflow draft changes', () => {
  const draft = [{ id: 'salesrev', owner: 'Salesperson' }, { id: 'qc', owner: 'Salesperson' }, { id: 'vended' }, { id: 'proofwait' }];
  const ans = ['A mix', 'Only for installs', 'Both', 'Designer sends it directly', 'Mostly vended', 'Yes, exterior signs', 'Production lead', 'Delivered and paid'];
  assert.deepEqual(S.answersToChanges(ans, draft), { owner_salesrev: 'Skipped (designer sends directly)', owner_qc: 'Production lead', days_vended: '14', days_proofwait: '2' });
});
