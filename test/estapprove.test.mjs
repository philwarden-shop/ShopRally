import test from 'node:test';
import assert from 'node:assert/strict';

const X = await import('../app/portalx.mjs');

test('online estimate approval: needs name + agreement; only for estimates; shows deposit', () => {
  const p = { id: 'p', lane: 'estimate', total: 2350 };
  const o = X.approveEstimateOnline({}, p, { signer: 'Sam Ortiz', agree: 'on' }, { at: 't' });
  assert.deepEqual([o.p.lane, o.p.status, o.p.signer], ['progress', 'Approved online · deposit due', 'Sam Ortiz']);
  assert.throws(() => X.approveEstimateOnline({}, p, { signer: 'Sam' }, { at: 't' }), /tick the box/);
  assert.throws(() => X.approveEstimateOnline({}, p, { agree: 'on' }, { at: 't' }), /your name/);
  assert.throws(() => X.approveEstimateOnline({}, { ...p, lane: 'progress' }, { signer: 'Sam', agree: 'on' }, { at: 't' }), /not waiting/);
  assert.match(X.estimateApprovalHtml('tok', p, { depositPct: 50 }), /\$1,175\.00[\s\S]*Approve Estimate/);
  assert.equal(X.estimateApprovalHtml('tok', { lane: 'progress' }), '');
});
