import test from 'node:test';
import assert from 'node:assert/strict';
const T = await import('../app/mailtodo.mjs');
const at = (h) => new Date(Date.UTC(2026, 10, 12, h)).toISOString();
const mail = [
  { id: 'a', folder: 'inbox', from: 'kelly@x.com', customer: 'Tri-State', subject: 'Wall graphics', at: at(9) },
  { id: 'b', folder: 'inbox', from: 'kelly@x.com', customer: 'Tri-State', subject: 'RE: Wall graphics', at: at(10) },
  { id: 'c', folder: 'inbox', from: 'jordan@new.com', subject: 'Model home signs', at: at(11) },
  { id: 's', folder: 'sent', from: 'phil@f.com', to: 'tom@x.com', customer: 'Florence Realty', subject: 'Estimate', at: at(8) },
];
test('email To Do: one item per conversation; Re: grouped; unknown sender can become a contact', () => {
  const t = T.emailTodos(mail);
  assert.deepEqual(t.map((x) => [x.title, x.count, x.matched]), [['RE: Wall graphics', 2, true], ['Model home signs', 1, false]]);
  assert.match(T.emailRow(t[0], { today: '2026-11-12' }), /2 new/);
  assert.match(T.emailRow(t[1], { today: '2026-11-12' }), /Create Contact/);
});
test('email To Do filters: need reply, waiting for reply, snoozed (wakes up), draft; archive takes the whole conversation', () => {
  assert.deepEqual(T.emailCounts(mail), { need: 2, waiting: 1, snoozed: 0, draft: 0, scheduled: 0 });
  let m = T.snooze(mail, 'a', 3, at(12));
  assert.deepEqual(T.emailCounts(m), { need: 1, waiting: 1, snoozed: 1, draft: 0, scheduled: 0 });
  m = T.wakeSnoozed(m, new Date(Date.UTC(2026, 10, 16)).toISOString());
  assert.equal(T.emailCounts(m).need, 2);
  m = T.saveDraft(m, { replyTo: 'c', body: 'Hi Jordan', subject: 'Re: Model home signs', to: 'jordan@new.com' }, { from: 'phil', at: at(13), id: 'd1' });
  m = T.saveDraft(m, { replyTo: 'c', body: 'Hi Jordan, updated', subject: 'Re: Model home signs' }, { from: 'phil', at: at(14) });
  assert.equal(T.emailTodos(m, 'draft').length, 1);
  assert.equal(T.dropDraftFor(m, 'c').filter((x) => x.folder === 'draft').length, 0);
  m = T.archiveThread(m, 'b');
  assert.deepEqual(m.filter((x) => x.folder === 'archive').map((x) => x.id), ['a', 'b']);
  const withReply = [...mail, { id: 'r', folder: 'inbox', from: 'tom@x.com', customer: 'Florence Realty', subject: 'Re: Estimate', at: at(12) }];
  assert.equal(T.emailCounts(withReply).waiting, 0);
  assert.match(T.emailFilterBar({ need: 2, waiting: 1 }, 'need'), /Need Reply · 2[\s\S]*Waiting for Reply · 1[\s\S]*Snoozed · 0[\s\S]*Draft · 0/);
});
