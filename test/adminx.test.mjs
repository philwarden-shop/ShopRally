import { test } from 'node:test';
import assert from 'node:assert/strict';
import { companyExtras, mergeExtra, extraDefaults, XFEATS } from '../app/adminx.mjs';

test('company extras show the mockup sections', () => {
  const h = companyExtras(null);
  for (const l of ['Sales Tax and Price Multipliers', '+ Add Tax Agency', 'Kentucky State Tax', 'Commission Plans', '+ Add Plan', 'Roles &amp; Access', 'Your plan:', 'Add · $39/mo', 'Not in your plan', 'Discount Limits', 'Save Discount Limits', 'Clean up contacts']) assert.ok(h.includes(l), l);
  assert.ok(!/\son[a-z]+=/i.test(h));
});

test('merge extra: tax, plan, discount, access, cleanup', () => {
  let r = mergeExtra(null, { do: 'tax', name: 'Boone County', rate: '6.5' });
  assert.equal(r.x.taxes.length, 3);
  assert.throws(() => mergeExtra(r.x, { do: 'tax', name: 'X', rate: '6' }));
  assert.throws(() => mergeExtra(r.x, { do: 'tax', name: 'Bad Rate', rate: '' }));
  r = mergeExtra(r.x, { do: 'deltax', i: '2' });
  assert.equal(r.x.taxes.length, 2);
  r = mergeExtra(r.x, { do: 'plan', name: 'New hire', rule: '3% of GP for 90 days' });
  assert.equal(r.x.plans.length, 4);
  const d = { do: 'discount' }; [5, 10, 20, 0, 0, 100].forEach((v, i) => { d[`d_${i}`] = String(v); });
  assert.deepEqual(mergeExtra(null, d).x.discount, [5, 10, 20, 0, 0, 100]);
  d.d_0 = '150'; assert.throws(() => mergeExtra(null, d));
  const acc = mergeExtra(null, { do: 'access', a_0_0: 'on' }).x.access;
  assert.deepEqual(acc[XFEATS[0][0]], [1, 0, 0, 0, 0, 0]);
  assert.equal(acc['Admin settings'][5], 1);
  assert.deepEqual(acc['Order portal payments'], extraDefaults().access['Order portal payments']);
  assert.equal(mergeExtra(null, { do: 'cleanup' }).x.cleanup, true);
});
