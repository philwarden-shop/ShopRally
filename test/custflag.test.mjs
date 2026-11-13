import test from 'node:test';
import assert from 'node:assert/strict';
const R = await import('../app/custrecord.mjs');
test('customer flag + why: saved trimmed from the Account form, shown as a strip', () => {
  const p = R.mergeProfile({}, { flagSet: '1', flag: '  Always call Dana   before an install ', why: 'Opening a 4th office' });
  assert.equal(p.flag, 'Always call Dana before an install'); assert.equal(p.why, 'Opening a 4th office');
  assert.equal(R.mergeProfile(p, { status: 'Active' }).flag, p.flag);
  assert.equal(R.mergeProfile(p, { flagSet: '1', flag: '', why: '' }).flag, '');
  assert.match(R.flagStrip(p.flag, '/x'), /Customer flag[\s\S]*Always call Dana/);
  assert.equal(R.flagStrip(''), '');
});
test('customers: cleanup suggestions; production summary line', async () => {
  const s = R.cleanupSuggestions([{ id: 'a', name: 'A Co', contacts: ['Dana Ruiz'], salesperson: 'K' }, { id: 'b', name: 'B Co', contacts: ['dana ruiz'], salesperson: 'K' }, { id: 'c', name: 'C Co', contacts: [], salesperson: '' }]);
  assert.deepEqual(s.map((x) => x.kind), ['Possible duplicate', 'Missing details', 'No owner']);
  assert.match(s[0].title, /A Co and B Co/);
  const Bd = await import('../app/boards.mjs');
  assert.match(Bd.asmLine({ qty: 2, station: 'Solvent', handoff: 'Install' }), /2 × Solvent → Install/);
  assert.equal(Bd.asmLine({}), '');
});
test('email: Cc/Bcc checked, Schedule Send keeps it as scheduled', async () => {
  const M = await import('../app/mailui.mjs');
  const at = '2026-11-13T02:00:00.000Z';
  const base = { to: 'dana@x.com', subject: 'Proof v4', body: 'Here it is' };
  const a = M.sendEmail([], { ...base, cc: 'a@x.com, b@x.com' }, { from: 'phil@x.com', signature: '', at, id: 'e1' });
  assert.deepEqual([a[0].folder, a[0].cc.length], ['sent', 2]);
  assert.throws(() => M.sendEmail([], { ...base, bcc: 'nope' }, { from: 'p', at }), /Bcc address/);
  const s = M.sendEmail([], { ...base, do: 'schedule', sendAt: '2026-11-14T09:00' }, { from: 'p', at, id: 'e2' });
  assert.equal(s[0].folder, 'scheduled');
  assert.throws(() => M.sendEmail([], { ...base, do: 'schedule', sendAt: '2020-01-01T09:00' }, { from: 'p', at }), /future/);
  assert.match(M.composer({ back: '/x' }), /New Message[\s\S]*Cc Bcc[\s\S]*Schedule Send/);
});
test('email: Undo Send within 30 seconds; Scheduled can be cancelled back to a draft', async () => {
  const M = await import('../app/mailui.mjs'); const T = await import('../app/mailtodo.mjs');
  const at = '2026-11-13T02:00:00.000Z';
  let mail = [{ id: 'in1', folder: 'inbox', from: 'dana@x.com', subject: 'Proof?', at: '2026-11-13T01:00:00.000Z', customer: 'Riverbend' }];
  mail = M.sendEmail(mail, { to: 'dana@x.com', subject: 'Re: Proof?', body: 'Yes', replyTo: 'in1' }, { from: 'p', at, id: 's1' }).map((x) => (x.id === 'in1' ? { ...x, folder: 'archive' } : x));
  const u = T.unsend(mail, 's1', '2026-11-13T02:00:20.000Z');
  assert.deepEqual([u.find((x) => x.id === 's1').folder, u.find((x) => x.id === 'in1').folder], ['draft', 'inbox']);
  assert.throws(() => T.unsend(mail, 's1', '2026-11-13T02:01:00.000Z'), /too late/);
  const s = M.sendEmail([], { to: 'a@x.com', subject: 'Later', body: 'Hi', do: 'schedule', sendAt: '2026-11-14T09:00' }, { from: 'p', at, id: 'q1' });
  assert.equal(T.emailCounts(s).scheduled, 1);
  assert.equal(T.emailTodos(s, 'scheduled')[0].view, 'scheduled');
  assert.equal(T.unschedule(s, 'q1').find((x) => x.id === 'q1').folder, 'draft');
  assert.match(T.undoBar('s1'), /\/email\/s1\/unsend/); assert.equal(T.undoBar('bad id!'), '');
});
test('customers search shows CoreBridge matches link; calls link to the CoreBridge customer', async () => {
  const h = R.customersPage({ user: {}, customers: [{ id: 'a', name: 'A Co', contacts: [], projects: [], open: 0 }], q: 'fed', cbMatches: 3 });
  assert.match(h, /Also in CoreBridge: 3 matches/);
  const C = await import('../app/calls.mjs');
  const p = C.callsPage({ page: ({ body }) => body, user: {}, calls: [{ at: '2026-11-12T20:00:00Z', direction: 'inbound', customerPhone: '8592832688', match: { company: 'Florence Estates', accountId: 10 }, talk: 60, summary: 'x' }] });
  assert.match(p, /href="\/customers\/imported\/10">Florence Estates/);
});
test('customers list: last conversation from logged activity or email', () => {
  const cs = [{ id: 'a', name: 'A Co' }, { id: 'b', name: 'B Co' }];
  const lc = R.lastConversations(cs, { profiles: [{ activity: [{ kind: 'Call', date: '2026-11-10' }] }, {}], mail: [{ customer: 'A Co', folder: 'sent', at: '2026-11-12T15:00:00Z' }, { customer: 'B Co', folder: 'spam', at: '2026-11-12T15:00:00Z' }] });
  assert.deepEqual([lc.a.kind, lc.b], ['email', undefined]);
  assert.match(R.lastConvCell(lc.a, '2026-11-13', 'a'), /Yesterday/);
  assert.match(R.lastConvCell(undefined, '2026-11-13', 'b'), /None logged/);
});
