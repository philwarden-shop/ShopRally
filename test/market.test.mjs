import { test } from 'node:test';
import assert from 'node:assert/strict';
const M = await import('../app/market.mjs');

const cust = (id, type, city, extra = {}) => ({ accountId: id, companyName: `Co ${id}`, accountType: type, defaultCustomerAddress: { address1: `${id} Main St`, city, state: 'Ky', postalCode: '41042' }, primaryAccountContact: { firstName: 'Ann', lastName: 'Lee', officePhone: '(859) 555-0100' }, createdDate: `2026-0${id % 9 + 1}-01T00:00:00`, ...extra });

test('market: city names are cleaned up and grouped', () => {
  assert.equal(M.normCity(' FORT MITCHELL, '), 'Ft. Mitchell');
  assert.equal(M.normCity('ft. thomas'), 'Ft. Thomas');
  assert.equal(M.normCity(''), 'No City');
});

test('market: active / past / never / prospects by city from order history', () => {
  const m = M.buildMarket([cust(1, 'CLIENT', 'Florence'), cust(2, 'CLIENT', 'florence'), cust(3, 'CLIENT', 'Florence'), cust(4, 'PROSPECT', 'Hebron'), cust(5, 'PROSPECT', 'Florence'), cust(6, 'PROSPECT', 'Hebron')], { 1: { last: '2026-10-01', n: 3 }, 2: { last: '2020-01-01', n: 1 }, 6: { last: '2026-11-01', n: 1 } }, '2026-11-13');
  const fl = m.cities.find((r) => r.city === 'Florence');
  assert.deepEqual([fl.active, fl.past, fl.never, fl.prospects], [1, 1, 1, 1]);
  const hb = m.cities.find((r) => r.city === 'Hebron');
  assert.deepEqual([hb.active, hb.prospects], [1, 1], 'a prospect with an order counts as a customer');
  assert.equal(m.prospectTotal, 2);
  assert.equal(m.prospects[0].ph, '(859) 555-0100');
});

test('market: route holds 9 stops, maps link has origin, stops and waypoints', () => {
  let r = { ids: [] };
  for (let i = 1; i <= 9; i++) r = M.applyRoute(r, { id: String(i), do: 'add' });
  assert.throws(() => M.applyRoute(r, { id: '10', do: 'add' }), /9 stops/);
  assert.equal(M.applyRoute(r, { id: '3', do: 'add' }).ids.length, 9);
  assert.equal(M.applyRoute(r, { id: '3', do: 'remove' }).ids.length, 8);
  assert.deepEqual(M.applyRoute(r, { do: 'clear' }).ids, []);
  const u = M.mapsUrl([{ a: '1 Main', city: 'Florence', st: 'KY', z: '41042' }, { a: '2 Oak', city: 'Hebron', st: 'KY', z: '41048' }], 'Shop, Florence, KY');
  assert.match(u, /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&origin=Shop/);
  assert.match(u, /destination=2%20Oak/); assert.match(u, /waypoints=1%20Main/);
  assert.deepEqual(M.applyHide(M.applyHide([], { id: '4' }), { id: '4', do: 'unhide' }), []);
});

test('market: Prospects page groups by city, hides Not a Fit, shows route and penetration', () => {
  const m = M.buildMarket([cust(4, 'PROSPECT', 'Hebron'), cust(5, 'PROSPECT', 'Florence'), cust(7, 'PROSPECT', 'Hebron'), cust(1, 'CLIENT', 'Florence')], { 1: { last: '2026-10-01', n: 1 } }, '2026-11-13');
  const h = M.prospectsView({ market: m, route: { ids: [4] }, hidden: [7] });
  assert.ok(h.includes('Your Route') && h.includes('Send All to Google Maps') && h.includes('On Route ✓'));
  assert.ok(h.includes('Co 5') && !h.includes('>Co 7<'), 'hidden prospect not listed');
  assert.ok(h.includes('Market Penetration by City') && h.includes('Not a Fit (1)'));
  assert.ok(M.prospectsView({ market: m, city: 'Florence' }).includes('Co 5') && !M.prospectsView({ market: m, city: 'Florence' }).includes('>Co 4<'));
  assert.ok(M.prospectsView({ market: m, hidden: [7], showHidden: true }).includes('Move Back'));
  assert.match(M.prospectsView({ market: null }), /building this list/);
  assert.match(M.viewToggle(''), /aria-current="true"[^>]*>Accounts/);
});

test('market: job reads customers and the order index, saves the summary, skips when fresh', async () => {
  const store = {};
  const send = async (input) => { const p = input.ExpressionAttributeValues[':sk'].S; if (p === 'CO#') return { Items: [{ sk: { S: 'CO#1#2026-10-01#9' } }] }; return { Items: [{ data: { S: JSON.stringify(cust(1, 'CLIENT', 'Florence')) } }, { data: { S: JSON.stringify(cust(4, 'PROSPECT', 'Hebron')) } }] }; };
  const cfg = { getConfig: async (k, d) => (k in store ? store[k] : d), putConfig: async (k, v) => { store[k] = v; } };
  const s = await M.marketJob({ ...cfg, today: '2026-11-13', send, table: 't' });
  assert.equal(s.cities.find((r) => r.city === 'Florence').active, 1);
  assert.ok(store['market-summary']);
  let called = 0; await M.marketJob({ ...cfg, today: '2026-11-13', send: async () => { called++; return { Items: [] }; }, table: 't' });
  assert.equal(called, 0);
});
