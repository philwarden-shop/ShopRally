import { test } from 'node:test';
import assert from 'node:assert/strict';
const X = await import('../app/mailextras.mjs');
const M = await import('../app/mailui.mjs');

test('email extras: booking link must be https, button inserts it, missing link points to My Profile', () => {
  assert.equal(X.cleanBooking(' https://cal.com/phil '), 'https://cal.com/phil');
  assert.equal(X.cleanBooking(''), '');
  assert.throws(() => X.cleanBooking('javascript:alert(1)'), /https/);
  assert.throws(() => X.cleanBooking('http://x.com'), /https/);
  assert.match(X.bookingButton('https://cal.com/phil'), /data-insert=.*Book a time with me/);
  assert.match(X.bookingButton(''), /href="\/me#booking"/);
  assert.match(X.bookingForm('https://cal.com/phil'), /value="https:\/\/cal.com\/phil"/);
});

test('email extras: Help Me Write drafts by stage from the open project', () => {
  const p = X.helpMeWrite({ first: 'Kelly', company: 'Acme', project: 'Lobby Sign', lane: 'proof', salesperson: 'Phil Warden' });
  assert.match(p, /^Hi Kelly,/); assert.match(p, /proof for the Lobby Sign is ready/); assert.match(p, /\n\nPhil$/);
  assert.match(X.helpMeWrite({ lane: 'estimate', project: 'Banners' }), /estimate for the Banners/);
  assert.match(X.helpMeWrite({ lane: 'progress' }), /in production/);
  assert.match(X.helpMeWrite({ lane: 'prospect', company: 'Acme', booking: 'https://cal.com/p' }), /Acme's signs[\s\S]*https:\/\/cal.com\/p/);
  assert.match(X.helpMeWrite({}), /^Hi there,/);
});

test('email extras: follow-up task due 3 days after sending, only once per email', () => {
  let t = X.followUpTask([], { mailId: 'm1', subject: 'Proof ready', to: 'k@a.com', customer: 'Acme', sentYmd: '2026-11-28' });
  assert.equal(t.length, 1); assert.equal(t[0].due, '2026-12-01'); assert.equal(t[0].kind, 'email'); assert.match(t[0].title, /Follow up if no reply: Proof ready/);
  t = X.followUpTask(t, { mailId: 'm1', subject: 'x', sentYmd: '2026-11-28' });
  assert.equal(t.length, 1);
});

test('email extras: composer shows the tools row and the follow-up checkbox (checked by default)', () => {
  const h = M.composer({ back: '/x', tools: X.bookingButton('https://cal.com/p') });
  assert.ok(h.includes('aria-label="Writing tools"') && h.includes('Booking Link'));
  assert.ok(/name="followup" checked/.test(h) && h.includes('Add a follow-up task if no reply in 3 days'));
  assert.ok(!/name="followup" checked/.test(M.composer({ back: '/x', followUp: false })));
  assert.ok(M.EDITOR_JS.includes('data-insert'));
});
