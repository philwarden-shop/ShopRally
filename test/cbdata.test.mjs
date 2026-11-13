import test from 'node:test';
import assert from 'node:assert/strict';
const C = await import('../app/cbdata.mjs');
test('imported CoreBridge customers: case variants for search, paging token round-trip, query shape', async () => {
  assert.deepEqual(C.variants('riverbend dental'), ['riverbend dental', 'Riverbend Dental', 'RIVERBEND DENTAL']);
  assert.deepEqual(C.decTok(C.encTok({ pk: { S: 'a' } })), { pk: { S: 'a' } });
  let seen;
  const items = Array.from({ length: 3 }, (_, i) => ({ pk: { S: 'LOC#nky' }, sk: { S: 'CB#customers#' + i }, data: { S: JSON.stringify({ accountId: i, companyName: 'Co ' + i }) } }));
  const r = await C.listImported({ q: 'co', limit: 2, send: async (input) => { seen = input; return { Items: items }; } });
  assert.match(seen.FilterExpression, /contains\(#d, :q0\) OR/);
  assert.equal(r.rows.length, 2); assert.ok(r.next);
  assert.match(C.importedPage({ page: ({ body }) => body, user: {}, rows: r.rows, q: 'co', next: r.next }), /Co 0[\s\S]*Next 50/);
});
test('imported CoreBridge customer detail: contacts and orders from the small index items', async () => {
  const D2 = await import('../app/cbdata.mjs'); const X = await import('../app/cbindex.mjs');
  assert.equal(X.indexEntries('contacts', { accountId: 10, contactId: 7, firstName: 'Bob', lastName: 'K' })[0].sk, 'CC#10#7');
  assert.match(X.indexEntries('orders', { customerId: 10, orderId: 5, orderDueDate: '2022-03-25T16:00:00-04:00' })[0].sk, /^CO#10#2022-03-25#5$/);
  const items = { 'CB#customers#10': { companyName: 'Florence Estates', accountId: 10, balanceDue: 12.5, customerTerms: 'Net 30' } };
  const get = async (i) => ({ Item: items[i.Key.sk.S] ? { data: { S: JSON.stringify(items[i.Key.sk.S]) } } : undefined });
  const send = async (i) => ({ Items: i.ExpressionAttributeValues[':sk'].S.startsWith('CC#') ? [{ data: { S: JSON.stringify({ name: 'Bob K', email: 'b@x.com', primary: true }) } }] : [{ data: { S: JSON.stringify({ invoice: '226-1', desc: 'Sign', status: 'CLOSED', total: 100 }) } }] });
  const data = await D2.loadImported(10, { send, get, table: 't' });
  const h = D2.importedDetailPage({ page: ({ body }) => body, user: {}, data });
  assert.ok(h.includes('Florence Estates') && h.includes('Bob K') && h.includes('226-1') && h.includes('Net 30') && h.includes('read-only'));
  assert.equal(await D2.loadImported(99, { send, get, table: 't' }), null);
});
