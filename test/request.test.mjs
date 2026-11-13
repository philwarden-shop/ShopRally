import test from 'node:test';
import assert from 'node:assert/strict';

const R = await import('../app/request.mjs');

test('quote request: validated, honeypot stops bots, becomes a prospect + quote task with a QR number', () => {
  const r = R.parseRequest({ name: 'Dana Ruiz', email: 'dana@x.com', what: 'Two vinyl banners for a fall festival.', when: '2026-12-01' });
  assert.equal(r.company, 'Dana Ruiz');
  assert.throws(() => R.parseRequest({ name: 'Bot', email: 'b@x.com', what: 'buy now cheap', website: 'http://spam' }), /spam/);
  assert.throws(() => R.parseRequest({ name: 'Al', what: 'a banner please' }), /email or phone/);
  assert.throws(() => R.parseRequest({ name: 'Al', phone: '8595550100', what: 'x' }), /little about/);
  const out = R.requestToRecords(r, { qrNumber: 7, today: '2026-11-12', id: 'new-x' });
  assert.equal(out.qr, 'QR-0007');
  assert.deepEqual([out.project.lane, out.project.status, out.project.name], ['prospect', 'Quote request QR-0007', 'Two vinyl banners for a fall festival']);
  assert.deepEqual([out.task.kind, out.task.projectId], ['quote', 'new-x']);
  assert.ok(R.requestPage({ done: 'QR-0007' }).includes('QR-0007 is in'));
  assert.ok(!R.requestPage({ error: '<b>x</b>' }).includes('<b>x</b>'));
});
