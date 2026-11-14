import test from 'node:test';
import assert from 'node:assert/strict';
import { readPolicy, mergePolicy, paymentGate, crossesGate, requirement, policyCard } from '../app/paypolicy.mjs';

test('payment policy: full under the threshold, deposit above, PO for terms customers', () => {
  const pol = readPolicy(null, { depositPct: 50 });
  assert.equal(requirement({ total: 1200 }, pol).kind, 'full');
  assert.deepEqual([requirement({ total: 8000 }, pol).kind, requirement({ total: 8000 }, pol).amount], ['deposit', 4000]);
  assert.equal(requirement({ total: 8000 }, pol, { terms: 'Net 30' }).kind, 'po');
  assert.equal(paymentGate({ total: 8000 }, pol, { paid: 1000 }).ok, false);
  assert.match(paymentGate({ total: 8000 }, pol, { paid: 1000 }).need, /\$3,000\.00 still to pay/);
  assert.equal(paymentGate({ total: 8000 }, pol, { paid: 4000 }).ok, true);
  assert.equal(paymentGate({ total: 8000 }, pol, { terms: 'Net 30', po: true }).ok, true);
  assert.equal(paymentGate({ total: 8000 }, { ...pol, on: false }).ok, true);
});
test('payment policy: gate point and admin form', () => {
  const pol = readPolicy(null);
  assert.equal(crossesGate(pol, 'queue', 'indesign'), true);
  assert.equal(crossesGate(pol, 'indesign', 'proofqc'), false);
  assert.equal(crossesGate({ ...pol, gateAt: 'production' }, 'files', 'wip'), true);
  assert.equal(crossesGate({ ...pol, gateAt: 'production' }, 'queue', 'indesign'), false);
  const m = mergePolicy(null, { on: 'on', depositPct: '40', fullPayUnder: '1000', gateAt: 'production' });
  assert.deepEqual([m.on, m.depositPct, m.fullPayUnder, m.termsPO, m.gateAt], [true, 40, 1000, false, 'production']);
  assert.throws(() => mergePolicy(null, { depositPct: '140', fullPayUnder: '1' }));
  assert.ok(policyCard(m).includes('Save Payment Policy') && policyCard(m).includes('value="40"'));
});
