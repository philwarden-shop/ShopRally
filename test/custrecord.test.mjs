import test from 'node:test';
import assert from 'node:assert/strict';

const C = await import('../app/custrecord.mjs');
const projects = [
  { id: 'a', company: 'Riverbend Dental', contact: 'Dana Ruiz', name: 'Lobby sign install', lane: 'progress', total: 2140 },
  { id: 'b', company: 'Riverbend Dental', contact: 'Dana Ruiz', name: 'Door vinyl', lane: 'complete', total: 300 },
  { id: 'c', company: 'Acme & Co', contact: 'Al', name: 'Banner', lane: 'estimate', total: 100 },
];

test('customers: grouped by company with open vs lifetime totals and unique contacts', () => {
  const list = C.listCustomers(projects);
  assert.deepEqual(list.map((c) => c.id), ['acme-co', 'riverbend-dental']);
  const r = list[1];
  assert.equal(r.open, 2140); assert.equal(r.lifetime, 300); assert.deepEqual(r.contacts, ['Dana Ruiz']);
});

test('customer profile: saves known fields, toggles strategic priority, refuses junk account numbers', () => {
  let p = C.mergeProfile({}, { status: 'Dormant', homeLocation: 'Nowhere', marketingSet: '1', expressCarrier: 'FedEx', expressAcct: '123-456' });
  assert.equal(p.status, 'Dormant'); assert.equal(p.homeLocation, 'Northern Kentucky'); assert.equal(p.marketing, false);
  assert.deepEqual(p.shipping.express, { carrier: 'FedEx', acct: '123-456' });
  assert.deepEqual(p.shipping.freight, { carrier: '', acct: '' });
  p = C.mergeProfile(p, { togglePrio: '1' }); assert.equal(p.strategic, true);
  assert.throws(() => C.mergeProfile(p, { groundAcct: '<script>' }), /letters, numbers and dashes/);
});

test('customer page: tabs end with Account, count badges, Express/Ground/Freight, no Means column, escaped', () => {
  const c = C.listCustomers(projects)[1];
  const h = C.customerPage({ user: {}, c: { ...c, name: '<i>R</i>' }, profile: {}, tab: 'account' });
  const nav = h.slice(h.indexOf('aria-label="Customer sections"'));
  const order = ['Overview', 'Projects', 'Contacts', 'Activity', 'Account'].map((t) => nav.indexOf(`>${t}`));
  assert.ok(order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1])), 'tab order');
  for (const s of ['Express', 'Ground', 'Freight', 'Home location', 'Account status', 'Marketing emails']) assert.ok(h.includes(s), s);
  assert.ok(!h.includes('Means'));
  assert.ok(!h.includes('<i>R</i>'));
  assert.match(C.customerPage({ user: {}, c, profile: {} }), /Schedule Site Walk/);
});
