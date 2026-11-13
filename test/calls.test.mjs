import test from 'node:test';
import assert from 'node:assert/strict';
const C = await import('../app/calls.mjs');
test('Clarity call webhook: signing key checked; verification value found; call fields picked from any shape', () => {
  assert.ok(C.verifySignature({ 'X-Genie-Signing-Key': 'abc123' }, 'abc123'));
  assert.ok(!C.verifySignature({ 'x-genie-signing-key': 'abc124' }, 'abc123'));
  assert.ok(!C.verifySignature({}, 'abc123'));
  const t = C.parseCall(JSON.stringify({ event: 'test', data: { verificationValue: 'v-998877' } }));
  assert.equal(t.verification, 'v-998877'); assert.ok(t.test);
  const c = C.parseCall(JSON.stringify({ call: { direction: 'inbound', from_number: '+1 (859) 555-0142', to_number: '8595550100', duration: 185, end_time: '2026-11-12T19:00:00Z', summary: 'Asked about lobby sign' } }));
  assert.deepEqual([c.direction, c.from, c.to, c.duration, c.at, c.test], ['inbound', '8595550142', '8595550100', 185, '2026-11-12T19:00:00Z', false]);
  assert.match(C.clarityExtra({ hookUrl: 'https://x/hooks/calls', verification: { value: 'v-998877', at: '2026-11-12T20:00:00Z' }, latest: [c] }), /v-998877[\s\S]*inbound 8595550142/);
});


const SAMPLE = {
  uuid: 'u1', vcon: '0.0.1', created_at: '2026-11-12T22:00:52Z', parties: [{ tel: '8595941580', name: 'Robin Addington', role: 'caller' }, { tel: '15136082348', name: '', role: 'receiver' }],
  dialog: [{ type: 'recording', start: '2026-11-12T21:35:47+00:00', duration: '143', originator: '0', filename: '/rec/u1.wav' }],
  attachments: [{ type: 'tags', body: ['time_answer:1794516945', 'time_talking:132', 'audio_duration:143', 'mapped_call_type:outbound', 'agent_names:Robin Addington', 'voicemail_transcription:null', 'orig_from_user:8595941580', 'orig_sub:201'], encoding: 'json' }],
  analysis: [
    { type: 'transcript_pii_removed', body: { text: 'Thanks for calling **** ****' } },
    { type: 'franchise_diarized', body: JSON.stringify({ summary: 'Confirmed the logo color.', call_type: 'service' }) },
    { type: 'resolution', body: JSON.stringify({ issue_resolved: true, initial_issue: 'Logo color', action_items: ['Move the job forward'], resolution: 'Blue approved' }) },
    { type: 'csat', body: '{"csat": 9}' },
    { type: 'scorecard', body: JSON.stringify({ percentage_earned: 41, scorecard: [{ question: 'Greeting?', points_earned: 0, max_points: 10, comments: 'No name' }] }) },
    { type: 'insights', body: JSON.stringify({ outcome: 'resolved', customer_sentiment: 'positive', competitor_mention: [], common_issue: ['Logo color mismatch'] }) },
    { type: 'topics', body: JSON.stringify({ topics: [{ intent_type: 'praise', topic: 'Thanked the agent' }] }) },
    { type: 'genie_tags', body: JSON.stringify({ tags: [{ tag_key: 'negative_customer_experience', applied: false }, { tag_key: 'upsell', applied: true }] }) },
  ],
};
test('Clarity vCon (real shape): direction, customer phone, summary, action items, score, CSAT, insights', () => {
  const c = C.parseCall(JSON.stringify(SAMPLE));
  assert.deepEqual([c.id, c.direction, c.customerPhone, c.agent, c.talk, c.answered, c.summary, c.csat, c.score, c.resolved, c.outcome, c.sentiment], ['u1', 'outbound', '5136082348', 'Robin Addington', 132, true, 'Confirmed the logo color.', 9, 41, true, 'resolved', 'positive']);
  assert.deepEqual(c.actionItems, ['Move the job forward']);
  assert.deepEqual(c.flags, ['upsell']);
  assert.equal(c.scorecard[0].max, 10);
  assert.equal(c.voicemail, '');
  const missed = C.parseCall(JSON.stringify({ ...SAMPLE, attachments: [{ type: 'tags', body: ['time_answer:null', 'time_talking:0', 'mapped_call_type:inbound', 'voicemail_transcription:Please call me back'] }] }));
  assert.equal(missed.direction, 'inbound'); assert.equal(missed.customerPhone, '8595941580'); assert.equal(missed.answered, false); assert.equal(missed.voicemail, 'Please call me back');
  assert.ok(C.isMissed(missed));
});
test('Calls tab: metrics, filters, team member table and details', () => {
  const now = new Date('2026-11-12T23:00:00Z');
  const a = C.parseCall(JSON.stringify(SAMPLE));
  a.match = { company: 'Riverbend Dental', name: 'Dana Ruiz' };
  const b = C.parseCall(JSON.stringify({ ...SAMPLE, uuid: 'u2', attachments: [{ type: 'tags', body: ['time_answer:null', 'time_talking:0', 'mapped_call_type:inbound', 'agent_names:Meagan Newman'] }] }));
  const old = { at: '2026-10-01T16:00:00Z', direction: 'outbound', from: '8595550100', to: '5135550000', duration: 60, keys: ['parties'] };
  const calls = [a, b, old];
  const m = C.callMetrics(calls);
  assert.deepEqual([m.total, m.inbound, m.outbound, m.missed, m.matched, m.avgScore, m.avgCsat, m.openActions], [3, 1, 2, 1, 1, 41, 9, 2]);
  assert.equal(C.filterCalls(calls, { range: '7d' }, now).length, 2);
  assert.equal(C.filterCalls(calls, { kind: 'missed' }, now).length, 1);
  assert.equal(C.filterCalls(calls, { agent: 'Meagan Newman' }, now).length, 1);
  assert.equal(C.filterCalls(calls, { q: 'riverbend' }, now).length, 1);
  const h = C.callsPage({ page: ({ body }) => body, user: {}, calls, f: {}, now, backfill: { done: false, n: 1200 } });
  assert.ok(h.includes('Call List · 3') && h.includes('Riverbend Dental') && h.includes('By Team Member') && h.includes('Scorecard · 41/100') && h.includes('Move the job forward') && h.includes('1,200 records checked'));
});
test('phone list entries: contacts and customers, faxes skipped', async () => {
  const P = await import('../app/phones.mjs');
  assert.deepEqual(P.phoneEntries('contacts', { contactId: 1, accountId: 2, firstName: 'Dee', lastName: 'Reusch', officePhone: '(859) 653-9950', otherPhone: '(859) 653-9951', otherPhoneType: 'Office Fax' }).map((e) => e.phone), ['8596539950']);
  const cu = P.phoneEntries('customers', { companyName: 'Florence Estates', primaryAccountContact: { contactId: 7, accountId: 10, firstName: 'Bob', officePhone: '1-859-283-2688' } });
  assert.deepEqual([cu[0].phone, cu[0].company], ['8592832688', 'Florence Estates']);
});

test('Calls tab: team-to-team calls are kept out unless asked for', () => {
  const calls = [{ direction: 'on-net', customerPhone: '200', at: '2026-11-12T22:00:00Z' }, { direction: 'inbound', customerPhone: '8595550142', at: '2026-11-12T22:00:00Z' }];
  assert.equal(C.filterCalls(calls, {}).length, 1);
  assert.equal(C.filterCalls(calls, { dir: 'internal' }).length, 1);
});
