import test from 'node:test';
import assert from 'node:assert/strict';

const E = await import('../app/email.mjs');
const S = await import('../app/shipping.mjs');

test('email: archive and spam move mail; nothing is ever deleted; spam blocks the sender going forward', () => {
  let mail = E.demoMail('2026-11-12');
  const n = mail.length;
  mail = E.archive(mail, 'm2');
  assert.equal(mail.find((m) => m.id === 'm2').folder, 'archive');
  const r = E.markSpam(mail, 'm3', []);
  assert.equal(r.mail.find((m) => m.id === 'm3').folder, 'spam');
  assert.deepEqual(r.blocked, ['deals@cheap-led-signs.biz']);
  const after = E.fileIncoming(r.mail, { id: 'm9', from: 'Deals@Cheap-LED-Signs.biz', subject: 'again' }, r.blocked);
  assert.equal(after.find((m) => m.id === 'm9').folder, 'spam');
  assert.equal(after.length, n + 1);
  assert.throws(() => E.deleteEmail(), /never deleted/);
  assert.equal(E.notSpam(r.mail, 'm3', r.blocked).blocked.length, 0);
  assert.throws(() => E.move(mail, 'm1', 'trash'), /does not exist/);
});

test('out of office: needs a message, dates in order; one reply per sender; never to spam or no-reply', () => {
  const TM = { team: [{ key: 'kristin', name: 'Kristin Ames', role: 'Sales' }], me: 'phil' };
  assert.throws(() => E.setOutOfOffice({}, { on: 'on', message: 'hi', delegate: 'kristin' }, TM), /auto-reply message/);
  assert.throws(() => E.setOutOfOffice({}, { on: 'on', message: 'I am out this week.', from: '2026-11-20', until: '2026-11-18', delegate: 'kristin' }, TM), /after the start/);
  let o = E.setOutOfOffice({}, { on: 'on', message: 'I am out until Monday. Call the shop at 859-555-0100.', from: '2026-11-12', until: '2026-11-16', delegate: 'kristin' }, TM);
  assert.ok(E.oooActive(o, '2026-11-13') && !E.oooActive(o, '2026-11-17'));
  const reply = E.autoReplyFor(o, { from: 'dana@x.com', subject: 'Proof' }, '2026-11-13');
  assert.equal(reply.subject, 'Re: Proof');
  o = { ...o, repliedTo: ['dana@x.com'] };
  assert.equal(E.autoReplyFor(o, { from: 'Dana@x.com', subject: 'again' }, '2026-11-13'), null);
  assert.equal(E.autoReplyFor(o, { from: 'noreply@xpsship.com', subject: 'x' }, '2026-11-13'), null);
  assert.equal(E.autoReplyFor(o, { from: 'b@x.com', subject: 'x', folder: 'spam' }, '2026-11-13'), null);
  assert.equal(E.setOutOfOffice(o, { message: '' }, TM).on, false);
});

test('hand-off address: required for Install/Deliver/Ship, not for Pickup; prints the same everywhere', () => {
  assert.throws(() => S.setDestination({ type: 'Ship', street: '1 Main', city: 'Florence', state: 'Kentucky', zip: '41042' }), /2-letter/);
  assert.throws(() => S.setDestination({ type: 'Install', street: '12 Oak St', city: 'Florence', state: 'KY', zip: '410' }), /5 digits/);
  const d = S.setDestination({ type: 'Ship', name: 'Riverbend Dental', street: '120 Main St', city: 'Florence', state: 'ky', zip: '41042' });
  assert.deepEqual(S.addressLines(d), ['Ship to:', 'Riverbend Dental', '120 Main St', 'Florence, KY 41042']);
  assert.match(S.addressLines(S.setDestination({ type: 'Pickup' }))[0], /^Pickup/);
});

test('XPS shipping: label cost + markup (+handling) becomes the charge; Complete is blocked until it is on CoreBridge', () => {
  assert.equal(S.shippingCharge(18.42, 20, 0), 22.1);
  assert.equal(S.shippingCharge(100, 15, 5), 120);
  const dest = { type: 'Ship' };
  assert.match(S.completeBlocked(dest, null), /Add the shipping label/);
  let ship = S.recordLabel(null, { carrier: 'UPS', service: 'Ground', tracking: '1Z999AA10123456784', cost: '$18.42' }, { markupPct: 20, handling: 0, at: 't', by: 'phil' });
  assert.equal(ship.total, 22.1);
  assert.match(S.completeBlocked(dest, ship), /\(\$22\.10\) to the CoreBridge order/);
  ship = S.confirmInCoreBridge(ship, { by: 'phil', at: 't' });
  assert.equal(S.completeBlocked(dest, ship), '');
  assert.equal(S.completeBlocked({ type: 'Pickup' }, null), '');
  assert.throws(() => S.recordLabel(null, { tracking: '1Z9', cost: '5' }, {}), /tracking/);
  assert.throws(() => S.shippingCharge(0), /label cost/);
});
