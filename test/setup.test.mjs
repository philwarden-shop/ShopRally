import test from 'node:test';
import assert from 'node:assert/strict';

const S = await import('../app/setup.mjs');

test('reconciliation: lists what CoreBridge cannot take; marking entered is one-way and recorded', () => {
  let p = S.demoPayments('2026-11-12');
  p = S.markEntered(p, 'pay1', 'phil', 't1');
  assert.equal(p.find((x) => x.id === 'pay1').enteredBy, 'phil');
  assert.equal(S.markEntered(p, 'pay1', 'x', 't2').find((x) => x.id === 'pay1').enteredAt, 't1');
  assert.throws(() => S.markEntered(p, 'nope', 'x', 't'), /not here/);
  const h = S.reconPage({ user: {}, payments: p });
  assert.ok(h.includes('To Enter · 1') && h.includes('$1,070.00') && h.includes('Already Entered · 2'));
});

test('setup interview: 8 questions, answers stored by number, bad input refused, ends with a gap review', () => {
  assert.equal(S.QUESTIONS.length, 8);
  let a = [];
  S.QUESTIONS.forEach((q, n) => { a = S.answer(a, n, q.a[0]); });
  assert.throws(() => S.answer(a, 9, 'x'), /does not exist/);
  assert.throws(() => S.answer(a, 0, '  '), /pick an answer/);
  const h = S.setupPage({ user: {}, answers: a, at: 8 });
  assert.ok(h.includes('Looks Right · Build My Workflow') && h.includes('city rejects a permit'));
  const mid = S.setupPage({ user: {}, answers: a.slice(0, 2), at: 2 });
  assert.ok(mid.includes('Question 3 of 8') && mid.includes('Go Back One Question') && !mid.includes('Looks Right'));
});
