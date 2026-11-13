import { test } from 'node:test';
import assert from 'node:assert/strict';
test('proof options: approval mode, extra approver checked, record-who-approved always on', async () => {
  const P = await import('../app/proofs.mjs');
  const o = P.readProofOpts({ approval: 'order', cc: 'alan@x.com', remind: 'on', watermark: 'on', subject: ' Proof v3 ' });
  assert.deepEqual([o.approval, o.cc, o.remind, o.calltask, o.record, o.watermark, o.password, o.subject], ['order', 'alan@x.com', true, false, true, true, false, 'Proof v3']);
  assert.equal(P.readProofOpts({ approval: 'weird' }).approval, 'everyone');
  assert.throws(() => P.readProofOpts({ cc: 'bad' }), /does not look right/);
});
