import test from 'node:test';
import assert from 'node:assert/strict';

const S = await import('../app/settings.mjs');

test('admin settings: 6 tabs, sensible defaults (dormant 180, price approval $25, reminders on)', () => {
  assert.deepEqual(S.TABS.map((t) => t[1]), ['Company', 'Sales', 'Pricing', 'Work', 'Customer Page & Payments', 'Connections']);
  const d = S.defaults();
  assert.equal(d.dormantDays, 180); assert.equal(d.priceApprovalThreshold, 25);
  assert.equal(d.pastDueReminders, true); assert.equal(d.shippingAccountRequest, true);
  assert.equal(d.completedEmail, 'Invoice + review request');
});

test('admin settings: saving validates numbers, ranges and choices; unchecked boxes turn off; read-only ignored', () => {
  let s = S.mergeSettings({}, 'pricing', { priceApprovalThreshold: '40', depositPct: '50', cardFeePct: '3' });
  assert.equal(s.priceApprovalThreshold, 40);
  assert.throws(() => S.mergeSettings(s, 'pricing', { cardFeePct: '9' }), /between 0 and 4/);
  assert.throws(() => S.mergeSettings(s, 'pricing', { depositPct: 'abc' }), /needs a number/);
  assert.throws(() => S.mergeSettings(s, 'work', { qcBy: 'Nobody' }), /pick one/);
  s = S.mergeSettings(s, 'orders', { completedEmail: 'Invoice only' });
  assert.equal(s.pastDueReminders, false);
  s = S.mergeSettings(s, 'cb', { cbWritesNote: 'On', cbSync: 'on' });
  assert.equal(s.cbWritesNote, 'Off in the test copy');
  assert.throws(() => S.mergeSettings(s, 'sales', { keepWarmDays: '200', dormantDays: '180' }), /Dormant must come after/);
  assert.throws(() => S.mergeSettings(s, 'nope', {}), /does not exist/);
});

test('admin page: status strip, Advanced section, escaped values', () => {
  const h = S.settingsPage({ user: {}, settings: { companyName: '<b>x</b>' }, tab: 'company' });
  assert.ok(h.includes('Using the standard FASTSIGNS settings') && h.includes('1 changed'));
  assert.ok(h.includes('>Advanced</summary>') && !h.includes('<b>x</b>'));
  assert.ok(S.settingsPage({ user: {}, settings: { _savedAt: { pricing: '2026-11-12T14:00:00Z' } }, tab: 'pricing' }).includes('Saved Nov 12'));
});
