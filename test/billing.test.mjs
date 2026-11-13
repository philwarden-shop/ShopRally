import test from 'node:test';
import assert from 'node:assert/strict';

const B = await import('../app/billing.mjs');

test('billing: core is $199 for 5 people + $29 each extra; active add-ons add up; trials count down', () => {
  assert.equal(B.corePrice(5), 199); assert.equal(B.corePrice(8), 199 + 3 * 29);
  assert.equal(B.monthlyTotal(5, { site: 'active', cos: 'trial', map: 'off' }), 199 + 49);
  assert.equal(B.trialLeft('2026-11-01', '2026-11-13'), 18); assert.equal(B.trialLeft('2026-09-01', '2026-11-13'), 0);
  let s = B.setAddon({}, { id: 'map', to: 'trial' }, '2026-11-13');
  assert.equal(s.states.map, 'trial'); assert.equal(s.trials.map, '2026-11-13');
  s = B.setAddon(s, { id: 'map', to: 'active' }, '2026-11-14'); assert.equal(s.trials.map, undefined);
  assert.throws(() => B.setAddon({}, { id: 'nope', to: 'off' }, 'x'), /add-on/);
  assert.throws(() => B.setAddon({}, { id: 'multi', to: 'off' }, 'x'), /included/);
  const h = B.billingPage({ user: { email: 'phil@x.com' }, people: 8, saved: s, today: '2026-11-13' });
  assert.ok(h.includes('Billing &amp; Add-Ons') && h.includes('nothing is charged') && h.includes('YOUR PLAN') && h.includes('$286'));
  assert.ok(h.includes('Start Free Trial') && h.includes('Turn Off') && h.includes('Add Another Location') && h.includes('p•••@x.com'));
});
