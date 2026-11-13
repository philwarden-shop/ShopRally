import test from 'node:test';
import assert from 'node:assert/strict';

const M = await import('../app/mailui.mjs');
const X = await import('../app/xps.mjs');

test('sanitizer: keeps simple formatting and safe links; drops scripts, handlers and javascript: links', () => {
  const s = M.sanitizeHtml('<b onclick="x()">Hi</b><script>alert(1)</script><a href="javascript:alert(1)">x</a><a href="https://fastsigns.com">site</a><img src="http://x/i.png"><img src="https://x/logo.png" width="120" onerror="y()"><p style="color:red">ok</p>');
  assert.equal(s, '<b>Hi</b><a>x</a><a href="https://fastsigns.com" target="_blank" rel="noopener">site</a><img src="https://x/logo.png" alt="" width="120"><p>ok</p>');
  assert.equal(M.toHtml('line 1\n<line 2>'), 'line 1<br>&lt;line 2&gt;');
});

test('send: signature added automatically; replying archives the original; bad input refused', () => {
  const inbox = [{ id: 'm1', folder: 'inbox', from: 'dana@x.com', subject: 'Proof', at: '2026-11-12T10:00:00Z', customer: 'Riverbend Dental' }];
  const out = M.sendEmail(inbox, { to: 'dana@x.com', subject: 'Re: Proof', body: '<b>Bigger</b> logo coming', replyTo: 'm1', customer: 'Riverbend Dental' }, { from: 'phil@x.com', signature: '<p>Phil Warden<br>FASTSIGNS of NKY</p>', at: 't', id: 's1' });
  const sent = out.find((m) => m.id === 's1');
  assert.match(sent.html, /<b>Bigger<\/b> logo coming<br><br><div class="signature"><p>Phil Warden<br>FASTSIGNS of NKY<\/p><\/div>/);
  assert.equal(out.find((m) => m.id === 'm1').folder, 'archive');
  assert.throws(() => M.sendEmail(inbox, { to: 'nope', subject: 'x', body: 'y' }, { at: 't' }), /email address/);
  assert.throws(() => M.sendEmail(inbox, { to: 'a@b.co', subject: 'Hi', body: ' ' }, { at: 't' }), /write a message/);
});

test('inbox email becomes To Do items; editor bar has Gmail-style buttons with a no-script fallback', () => {
  const t = M.mailTasks([{ id: 'm1', folder: 'inbox', subject: 'Proof', at: '2026-11-12T10:00:00Z', customer: 'Riverbend Dental' }, { id: 'm2', folder: 'archive', subject: 'x', at: '2026-11-12T10:00:00Z' }]);
  assert.deepEqual(t.map((x) => [x.id, x.kind, x.mail]), [['mail-m1', 'email', true]]);
  const e = M.richEditor('body');
  for (const l of ['Bold', 'Italic', 'Underline', 'Bulleted list', 'Numbered list', 'Link']) assert.ok(e.includes(`aria-label="${l}"`), l);
  assert.ok(e.includes('<textarea name="body"'));
});

test('XPS: search request shape; match shipments to the order; skip voided and already-recorded labels', async () => {
  let seen;
  const fetchFn = async (url, opt) => { seen = { url, opt }; return { ok: true, json: async () => ({ shipments: [
    { bookNumber: 'B1', trackingNumber: '1Z1', carrierCode: 'ups', serviceCode: 'ups_ground', totalShippingCost: '18.42', shipperReference: '75840', voided: false },
    { bookNumber: 'B2', trackingNumber: '1Z2', carrierCode: 'ups', totalShippingCost: '9.10', shipperReference: '75840', voided: true },
    { bookNumber: 'B3', trackingNumber: '1Z3', carrierCode: 'fedex', totalShippingCost: '30.00', orderIds: ['75841'] },
  ] }) }; };
  const all = await X.xpsSearch({ customerId: 'C9', apiKey: 'K', keyword: '75840', fetchFn });
  assert.equal(seen.url, 'https://xpsshipper.com/restapi/v1/customers/C9/searchShipments');
  assert.equal(seen.opt.headers.Authorization, 'RSIS K');
  assert.deepEqual(JSON.parse(seen.opt.body), { keyword: '75840' });
  const mine = X.matchShipments(all, '75840');
  assert.deepEqual(mine.map((s) => s.bookNumber), ['B1']);
  assert.deepEqual(X.newLabels({ labels: [] }, mine), [{ carrier: 'UPS', service: 'ups_ground', tracking: '1Z1', cost: 18.42, bookNumber: 'B1', date: '' }]);
  assert.deepEqual(X.newLabels({ labels: [{ tracking: '1Z1' }] }, mine), []);
  await assert.rejects(() => X.xpsSearch({ keyword: '1' }), /not connected/);
});
