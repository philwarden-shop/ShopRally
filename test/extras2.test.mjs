import test from 'node:test';
import assert from 'node:assert/strict';

const E = await import('../app/extras2.mjs');

test('contacts: validated, no duplicates, shown with mail and phone links', () => {
  const p = E.addContact({}, { cName: 'Dana Ruiz', cEmail: 'dana@riverbend.com', cPhone: '(859) 555-0100', cTitle: 'Office manager' });
  assert.equal(p.contactsExtra.length, 1);
  assert.throws(() => E.addContact(p, { cName: 'dana ruiz' }), /already here/);
  assert.throws(() => E.addContact(p, { cName: 'Al', cEmail: 'nope' }), /email/);
  assert.throws(() => E.addContact(p, { cName: 'Al', cPhone: 'call me' }), /phone/);
  const h = E.contactsHtml('r', ['Dana Ruiz', 'Sam'], p.contactsExtra);
  assert.ok(h.includes('mailto:dana@riverbend.com') && h.includes('tel:8595550100') && h.includes('<b>Sam</b>'));
  assert.equal((h.match(/<b>Dana Ruiz<\/b>/g) || []).length, 1);
});

test('morning summary: counts, what goes out, stuck and proofs', () => {
  const l = E.digest({ name: 'Phil Warden', groups: { today: [1, 2], past: [1], missing: [] }, comingUp: [{ name: 'Lobby', ready: false, gaps: ['not built yet'] }], stuck: [{ escalate: true }], proofs: 1 });
  assert.deepEqual(l[0], 'Good morning, Phil.');
  assert.match(l[1], /2 due, 1 past due, 0 projects missing/);
  assert.match(l.join(' '), /Lobby \(needs not built yet\)[\s\S]*Stuck: 1, some need you[\s\S]*1 proof need/);
});

test('csv: quotes, commas, newlines and formula injection are handled', () => {
  const out = E.csv([{ a: 'x, y', b: '=SUM(A1)', c: 'he said "hi"' }], [['a', 'A'], ['b', 'B'], ['c', 'C']]);
  assert.equal(out, 'A,B,C\r\n"x, y",\'=SUM(A1),"he said ""hi"""\r\n');
});
