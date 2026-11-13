import test from 'node:test';
import assert from 'node:assert/strict';

const S = await import('../app/standing.mjs');

test('where this stands: counts built items, names proofs waiting on the customer, flags holds and past due', () => {
  const items = [{ name: 'Lobby', step: 'built' }, { name: 'Desk logo', step: 'proofwait' }, { name: 'Door', step: 'hold', holdReason: 'waiting on permit' }];
  const w = S.whereThisStands({ lane: 'progress', due: '2026-11-10' }, items, '2026-11-12');
  assert.match(w.text, /1 of 3 items built/);
  assert.match(w.text, /approve “Desk logo”/);
  assert.match(w.text, /on hold \(waiting on permit\)/);
  assert.match(w.text, /Past due by 2 days/);
  assert.equal(w.tone, 'risk');
  assert.equal(w.basedOn, '3 items, due date');
});

test('where this stands: prospects and estimates get a plain next step', () => {
  assert.match(S.whereThisStands({ lane: 'prospect' }, [], '2026-11-12').text, /site walk/);
  assert.match(S.whereThisStands({ lane: 'estimate', due: '2026-11-13' }, [], '2026-11-12').text, /approval and deposit.*Due tomorrow/);
});

test('customer flags: tax exempt, PO required, past due; none is fine; text is escaped', () => {
  const f = S.customerFlags({ company: { IsTaxExempt: true, TaxExemptNumber: 'KY-1', poRequired: true, pastDue: 1200 } });
  assert.deepEqual(f.map((x) => x.label), ['Tax Exempt', 'PO Required', 'Past Due Balance']);
  assert.equal(S.customerFlags({}).length, 0);
  const h = S.standingHtml({ lane: 'prospect', insight: '<b>x</b>' }, [], '2026-11-12', {});
  assert.ok(h.includes('✦ Where This Stands') && h.includes('Customer Flags') && !h.includes('<b>x</b>'));
});
