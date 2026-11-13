import test from 'node:test';
import assert from 'node:assert/strict';

const X = await import('../app/portalx.mjs');

test('price change: only above the Admin threshold needs the customer; staff can never approve', () => {
  const pc = { amount: 45, reason: 'r', status: 'pending' };
  assert.ok(X.needsApproval(pc, 25));
  assert.ok(!X.needsApproval({ ...pc, amount: 25 }, 25));
  assert.ok(!X.needsApproval({ ...pc, amount: 45 }, 50));
  assert.throws(() => X.decidePrice(pc, 'approve', { staff: true }), /only the customer/);
  assert.equal(X.decidePrice(pc, 'approve', { by: 'Dana', at: 't' }).status, 'approved');
  assert.throws(() => X.decidePrice({ ...pc, status: 'approved' }, 'approve', {}), /no price change/);
  assert.throws(() => X.decidePrice(pc, 'maybe', {}), /approve or decline/);
});

test('comments: trimmed, required, capped', () => {
  const l = X.addComment([], '  Can we use navy?  ', { who: 'Dana', at: '2026-11-12T14:00:00Z' });
  assert.equal(l[0].text, 'Can we use navy?');
  assert.throws(() => X.addComment(l, ' ', { who: 'x', at: 'y' }), /type a comment/);
  assert.throws(() => X.addComment(l, 'x'.repeat(2001), { who: 'x', at: 'y' }), /2,000/);
});

test('portal extras: Title Case buttons, phone note, escaped comments, price button shows amount', () => {
  const h = X.extrasHtml({ token: 'tok', comments: [{ text: '<b>hi</b>', who: 'Dana', at: '2026-11-12T14:00:00Z' }], priceChange: X.demoPriceChange('demo-10') });
  for (const s of ['+ Add Comment', 'Send Comment', 'Approve New Price (+$45.00)', 'Email Me the Link', 'works best on a computer or tablet']) assert.ok(h.includes(s), s);
  assert.ok(!h.includes('<b>hi</b>'));
  assert.ok(X.extrasHtml({ token: 't', emailed: true }).includes('Link Sent to Your Email ✓'));
  assert.ok(!X.extrasHtml({ token: 't', priceChange: { amount: 10, status: 'pending' } }).includes('Approve New Price'));
});
