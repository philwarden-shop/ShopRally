import { test } from 'node:test';
import assert from 'node:assert/strict';

test('global search: grouped results with highlights, pills, See all, and an empty message', async () => {
  const S = await import('../app/search2.mjs');
  const data = {
    projects: [{ id: 'p1', name: 'Lobby sign', company: 'Riverbend Dental', orderId: '75840', lane: 'progress' }],
    customers: [{ id: 'riverbend-dental', name: 'Riverbend Dental', contacts: ['Dana Ruiz'], projects: [{ lane: 'progress' }] }],
    tasks: [{ title: 'Call Riverbend about install', customer: 'Riverbend Dental', due: '2026-11-13' }],
    mail: [{ id: 'm', folder: 'inbox', subject: 'Riverbend proof', from: 'dana@x.com', at: '2026-11-12T15:00:00Z', customer: 'Riverbend Dental' }, { id: 's', folder: 'spam', subject: 'Riverbend spam', at: '2026-11-12T15:00:00Z' }],
    imported: [{ accountId: 7, companyName: 'Riverbend Dental LLC', accountType: 'CLIENT', defaultCustomerAddress: { city: 'Hebron', state: 'KY' } }],
  };
  const r = S.searchAll('river', data);
  assert.equal(r.projects.length, 1); assert.equal(r.customers.length, 1); assert.equal(r.emails.length, 1, 'spam is skipped'); assert.equal(r.history.length, 1);
  assert.deepEqual(r.projects[0].tag[0], 'In production');
  assert.equal(S.searchAll('d', data).projects.length, 0);
  assert.equal(S.searchAll('dana', data).contacts.length, 1);
  assert.match(S.hl('Riverbend Dental', 'river'), /<mark[^>]*>River<\/mark>bend Dental/);
  assert.equal(S.hl('<b>', 'x'), '&lt;b&gt;');
  const h = S.searchPage2({ user: {}, q: 'river', results: r, from: 'customers' });
  assert.ok(h.includes('5 results for') && h.includes('CoreBridge History') && h.includes('This tab') && h.includes('<mark'));
  const many = S.searchAll('co', { customers: Array.from({ length: 8 }, (_, i) => ({ id: 'c' + i, name: 'Co ' + i, contacts: [] })) });
  assert.ok(S.searchPage2({ user: {}, q: 'co', results: many }).includes('See all 8 customers'));
  assert.ok(S.searchPage2({ user: {}, q: 'zzz', results: S.searchAll('zzz', data) }).includes('No matches for'));
});
