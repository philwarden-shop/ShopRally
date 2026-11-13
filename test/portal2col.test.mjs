import { test } from 'node:test';
import assert from 'node:assert/strict';

test('order page: two columns on desktop (main + Order Summary rail), one column on phones', async () => {
  const P = await import('../app/proofs.mjs');
  const h = P.portalPage({ project: { id: 'x', company: 'Acme', name: 'Lobby sign', orderId: '75840', contact: 'Dana', salesperson: 'Kristin', total: 2140, due: '2026-11-20' }, items: [], token: 't', side: '<section id="rail-x">Pay</section>' });
  assert.ok(h.includes('class="pg"') && h.includes('aria-label="Order summary"') && h.includes('id="rail-x"'));
  assert.ok(h.includes('grid-template-columns:minmax(0,1fr) 340px') && /@media\(max-width:880px\)\{\.pg\{grid-template-columns:minmax\(0,1fr\)\}/.test(h));
  assert.ok(h.includes('$2,140.00') && h.includes('<dt>Order</dt><dd>75840</dd>'));
  assert.ok(h.indexOf('class="pg"') < h.indexOf('aria-label="Order summary"'), 'summary sits in the right rail after the main column');
});
