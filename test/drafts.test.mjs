import test from 'node:test';
import assert from 'node:assert/strict';

const D = await import('../app/drafts.mjs');
const p = { name: 'Lobby sign', contact: 'Dana Ruiz', total: 2140 };

test('shipping account request: only for Ship items, only when no account on file, and only when Admin has it on', () => {
  const ship = [{ destination: 'Ship' }];
  assert.ok(D.needsShippingAccount(ship, {}, {}));
  assert.ok(!D.needsShippingAccount(ship, { shipping: { ground: { carrier: 'UPS', acct: '1Z' } } }, {}));
  assert.ok(!D.needsShippingAccount([{ destination: 'Pickup' }], {}, {}));
  assert.ok(!D.needsShippingAccount(ship, {}, { shippingAccountRequest: false }));
  assert.match(D.shippingDraft(p).body, /^Hi Dana,/);
});

test('order completed email: invoice + review request by default, invoice only, or nothing', () => {
  assert.ok(D.orderComplete([{ step: 'built' }, { step: 'complete' }]));
  assert.ok(!D.orderComplete([{ step: 'built' }, { step: 'wip' }]));
  assert.match(D.completedDraft(p, { reviewLink: 'https://g.page/r/x' }).body, /\$2,140\.00[\s\S]*review\? https:\/\/g\.page/);
  assert.ok(!/review/.test(D.completedDraft(p, { mode: 'Invoice only' }).body));
  assert.equal(D.completedDraft(p, { mode: 'Nothing' }), null);
});

test('past due: draft names invoice, balance, due date and pay link; page escapes and shows reminder state', () => {
  const inv = D.demoInvoices('2026-11-12');
  const d = D.pastDueDraft(inv[0], 'https://x/p/t');
  assert.match(d.body, /Invoice 75710 for \$640\.00 was due 2026-11-03[\s\S]*https:\/\/x\/p\/t/);
  const h = D.pastDuePage({ user: {}, invoices: [{ ...inv[0], customer: '<b>x</b>' }], today: '2026-11-12', links: {}, remindersOn: false });
  assert.ok(h.includes('Reminders Off') && h.includes('9 days') && !h.includes('<b>x</b>'));
});
