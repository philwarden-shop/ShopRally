import { test } from 'node:test';
import assert from 'node:assert/strict';
const F = await import('../app/feedback.mjs');

test('feedback: kinds, page path kept only when safe, old kinds still accepted', () => {
  let l = F.addFeedback([], { kind: 'Idea', text: 'Text reminders', page: '/activities?x=1' }, { who: 'phil', at: '2026-11-13T05:00:00Z', id: 'a' });
  assert.equal(l[0].page, '/activities?x=1'); assert.equal(l[0].status, 'review');
  l = F.addFeedback(l, { kind: 'Something is broken', text: 'Oops here', page: '//evil.com' }, { who: 'kim', at: '2026-11-13T05:01:00Z', id: 'b' });
  assert.equal(l[0].kind, 'Something Is Broken'); assert.equal(l[0].page, '');
  assert.equal(F.addFeedback([], { kind: 'Idea', text: 'abc', page: '/x', withPage: 'off' }, { who: 'p', at: 'x' })[0].page, '');
  assert.throws(() => F.addFeedback([], { kind: 'Nope', text: 'abc' }, { who: 'p', at: 'x' }), /kind/);
  assert.throws(() => F.addFeedback([], { kind: 'Idea', text: 'a' }, { who: 'p', at: 'x' }), /more/);
});

test('feedback: owner sets status and note; the person sees it in Your Earlier Suggestions', () => {
  let l = F.addFeedback([], { kind: 'Idea', text: 'Repeat tasks every few months' }, { who: 'phil', at: '2026-11-02T15:00:00Z', id: 'a' });
  l = F.setFeedbackStatus(l, { id: 'a', status: 'planned', note: 'December release' }, { at: 'now' });
  assert.equal(l[0].status, 'planned');
  assert.throws(() => F.setFeedbackStatus(l, { id: 'zz', status: 'planned' }, { at: 'now' }), /not here/);
  assert.throws(() => F.setFeedbackStatus(l, { id: 'a', status: 'bogus' }, { at: 'now' }), /status/);
  const h = F.feedbackPage({ user: {}, mine: l, from: '/activities' });
  assert.ok(h.includes('Your Earlier Suggestions') && h.includes('Planned') && h.includes('December release'));
  assert.ok(h.includes('Include the page you were on') && h.includes('href="/activities"'));
  assert.ok(F.feedbackPage({ user: {}, kind: 'Question' }).includes('What do you want to know?'));
  const ib = F.feedbackInbox({ user: {}, list: l, status: 'planned' });
  assert.ok(ib.includes('Feedback Inbox') && ib.includes('Planned (1)') && ib.includes('Save Status'));
  assert.ok(!F.feedbackInbox({ user: {}, list: l, status: 'shipped' }).includes('Repeat tasks'));
});
