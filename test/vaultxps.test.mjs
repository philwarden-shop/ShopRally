import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.__SMX_FAKE_SECRETS = { get: async (n) => store.get(n) || null, put: async (n, v) => { store.set(n, JSON.parse(JSON.stringify(v))); } };
const V = await import('../app/vault.mjs');
const X = await import('../app/xps.mjs');
const S = await import('../app/shipping.mjs');

test('vault: keys go to the secret store, blanks keep what is saved, only the last 4 show', async () => {
  await V.saveApp('xps', { customerId: 'C123', integrationId: 'I9', apiKey: 'sk_live_abcd1234' }, 'phil');
  await V.saveApp('xps', { apiKey: '' , customerId: 'C124' }, 'phil');
  const s = await V.readApp('xps');
  assert.deepEqual([s.customerId, s.apiKey, s.integrationId], ['C124', 'sk_live_abcd1234', 'I9']);
  assert.ok([...store.keys()][0].endsWith('/conn/xps'));
  const h = V.connectionsPage({ user: {}, saved: { xps: s } });
  assert.ok(h.includes('••••1234') && !h.includes('sk_live_abcd1234') && h.includes('type="password"'));
  assert.ok(!h.includes('C124') && !h.includes('I9') && !h.includes('type="text"'), 'no saved value shown in full, no plain text key boxes');
  const cp = V.connectionsPage({ user: {}, saved: { cardpointe: { merchantId: '496160873888', site: 'fts-uat', apiUsername: 'testing', apiPassword: 'testing123' } } });
  assert.ok(!cp.includes('496160873888') && !cp.includes('testing') && !cp.includes('testing123') && cp.includes('••••3888'), 'Fiserv values masked');
  await assert.rejects(() => V.saveApp('xps', {}, 'p'), /nothing to save/);
  assert.throws(() => V.mergeAppForm('xps', {}, { apiKey: 'has space' }), /no spaces/);
  assert.equal(V.appStatus('cardpointe', null).connected, false);
  store.clear(); // other tests must see XPS as not connected (never call the real XPS from tests)
});

test('XPS put order: packages from production, address from the hand-off, order number as the reference', async () => {
  const pk = X.packagesFromForm({ w0: '12.5', l0: '48', d0: '24', h0: '4', w1: '3' });
  assert.deepEqual(pk.map((p) => [p.weight, p.length, p.width, p.height]), [['12.5', '48', '24', '4'], ['3', null, null, null]]);
  assert.throws(() => X.packagesFromForm({ w0: '5', l0: '10' }), /all three sizes/);
  assert.throws(() => X.packagesFromForm({}), /at least one box/);
  const dest = { type: 'Ship', name: 'Dana Ruiz', street: '120 Main St', city: 'Florence', state: 'KY', zip: '41042' };
  const body = X.buildPutOrder({ orderNumber: '75840', project: { name: 'Lobby sign', company: 'Riverbend Dental', total: 2140 }, dest, packages: pk, today: '2026-11-12' });
  assert.deepEqual([body.orderId, body.shipperReference, body.receiver.state, body.weightUnit, body.packages.length], ['75840', '75840', 'KY', 'lb', 2]);
  assert.throws(() => X.buildPutOrder({ orderNumber: '1', project: {}, dest: { type: 'Pickup' }, packages: pk }), /Ship/);
  let seen; await X.xpsPutOrder({ customerId: 'C', integrationId: 'I', apiKey: 'K', body, fetchFn: async (u, o) => { seen = [u, o.method]; return { ok: true }; } });
  assert.deepEqual(seen, ['https://xpsshipper.com/restapi/v1/customers/C/integrations/I/orders/75840', 'PUT']);
  assert.ok(X.holdBuiltInCoreBridge(dest, null));
  assert.ok(!X.holdBuiltInCoreBridge(dest, { labels: [{}] }));
  assert.ok(!X.holdBuiltInCoreBridge({ type: 'Install' }, null));
  const panel = S.shippingPanel('p1', dest, { labels: [], packages: pk });
  assert.ok(panel.includes('Shipping Details') && panel.includes('value="12.5"'));
});

test('XPS trigger: only when every line is Built, Ship hand-off, boxes saved, not in parallel mode, not twice', async () => {
  const X = await import('../app/xps.mjs');
  const dest = { type: 'Ship', city: 'Florence', state: 'KY' };
  const ship = { packages: [{ weight: '5' }] };
  const built = [{ step: 'built' }, { step: 'done' }];
  assert.equal(X.xpsTrigger({ items: [{ step: 'built' }, { step: 'wip' }], dest, ship }).action, 'wait');
  assert.equal(X.xpsTrigger({ items: built, dest, ship }).action, 'push');
  assert.match(X.xpsTrigger({ items: built, dest, ship, parallel: true }).message, /Parallel mode/);
  assert.match(X.xpsTrigger({ items: built, dest, ship: {} }).message, /no shipping details/);
  assert.match(X.xpsTrigger({ items: built, dest, ship: { ...ship, xpsOrder: { ok: true } } }).message, /already sent/);
  assert.equal(X.xpsTrigger({ items: built, dest: { type: 'Pickup' }, ship }).action, 'skip');
  const S = await import('../app/shipping.mjs');
  const panel = S.shippingPanel('p1', dest, { labels: [], packages: ship.packages });
  assert.ok(!panel.includes('Send Order to XPS') && panel.includes('every product line is Built'));
  const V = await import('../app/vault.mjs');
  assert.ok(V.connectionsPage({ user: {}, parallel: true }).includes('Turn Parallel Mode Off'));
});

test('Out of Office needs a delegate; the delegate covers the email; auto-reply names them', async () => {
  const E = await import('../app/email.mjs');
  const team = [{ key: 'phil', name: 'Phil Warden', role: 'Owner' }, { key: 'kristin', name: 'Kristin Ames', role: 'Sales' }];
  assert.throws(() => E.setOutOfOffice({}, { on: 'on', message: 'Out until Monday, thanks!' }, { team, me: 'phil' }), /delegate/);
  assert.throws(() => E.setOutOfOffice({}, { on: 'on', message: 'Out until Monday, thanks!', delegate: 'phil' }, { team, me: 'phil' }), /delegate/);
  const o = E.setOutOfOffice({}, { on: 'on', message: 'Out until Monday, thanks!', delegate: 'kristin' }, { team, me: 'phil' });
  assert.equal(o.delegateName, 'Kristin Ames');
  assert.match(E.autoReplyFor(o, { from: 'dana@x.com', subject: 'Hi' }, '2026-11-12').body, /Kristin Ames is taking care/);
  const c = E.coveringTasks([{ name: 'Phil Warden', ooo: o, mail: [{ id: 'm1', folder: 'inbox', subject: 'Proof', at: '2026-11-12T10:00:00Z' }, { id: 'm2', folder: 'archive', subject: 'x', at: '2026-11-12T10:00:00Z' }] }], '2026-11-12');
  assert.deepEqual(c.map((t) => t.title), ['Covering for Phil: Proof']);
  assert.equal(E.setOutOfOffice({}, { message: '' }, { team, me: 'phil' }).on, false);
});

test('shipping batch: details on the production card (Ship only), hand-added tracking, rules, no XPS wording', async () => {
  const Bd = await import('../app/boards.mjs');
  const S = await import('../app/shipping.mjs');
  const X = await import('../app/xps.mjs');
  const items = [{ id: 'a', projectId: 'p1', step: 'wip', name: 'Lobby sign', ref: 'Order 1 · Item 1', customer: 'Riverbend', person: 'Mike', due: '2026-11-13' }, { id: 'b', projectId: 'p2', step: 'wip', name: 'Banner', ref: 'Order 2 · Item 1', customer: 'Oakline', person: 'Mike', due: '2026-11-13' }];
  const h = Bd.boardPage({ user: {}, board: 'production', items, view: 'board', columns: [], log: [], shipInfo: { p1: { ship: true, packages: [] } } });
  assert.equal((h.match(/Shipping Details · Needed Before Built/g) || []).length, 1);
  const panel = S.shippingPanel('p1', { type: 'Ship' }, { labels: [{ carrier: 'Estes', service: '', tracking: 'PRO123456', cost: 350, charge: 420, by: 'phil' }, { carrier: 'UPS', service: 'Ground', tracking: '1Z9999', cost: 18, charge: 21.6, by: 'XPS' }], total: 441.6 });
  assert.ok(panel.includes('Added by hand') && panel.includes('Automatic') && panel.includes('+ Add Tracking') && !/XPS/.test(panel.replace(/action="[^"]*"/g, '')));
  assert.deepEqual(S.mergeShipRules({ requireDetails: 'on', types: 'Ship,Deliver' }), { requireDetails: true, autoSend: false, types: ['Ship', 'Deliver'] });
  assert.ok(S.shipRulesPanel().includes('Save Shipping Rules'));
  const built = [{ step: 'built' }];
  assert.match(X.xpsTrigger({ items: built, dest: { type: 'Ship' }, ship: { packages: [{}] }, rules: { autoSend: false } }).message, /turned off/);
  assert.equal(X.xpsTrigger({ items: built, dest: { type: 'Deliver' }, ship: { packages: [{}] }, rules: { types: ['Ship', 'Deliver'] } }).action, 'push');
  const V = await import('../app/views.mjs');
  V.setParallel(true); assert.ok(V.page({ title: 't', user: {}, body: 'x' }).includes('Parallel Mode is on')); V.setParallel(false);
});

test('hand-off address from the company profile (default ship-to), or typed and optionally saved; CoreBridge is a per-shop app', async () => {
  const S = await import('../app/shipping.mjs');
  const saved = S.addressesFor({}, 'Riverbend Dental', true);
  assert.equal(saved.length, 2);
  const p = S.destinationPanel('p1', null, { saved });
  assert.match(p, /Main office \(default ship-to\)/);
  assert.match(p, /Enter a different address/);
  const d = S.setDestination({ type: 'Ship', saved: '1' }, saved);
  assert.deepEqual([d.city, d.zip], ['Hebron', '41048']);
  const typed = S.setDestination({ type: 'Ship', saved: '', name: 'Lot 4', street: '9 Oak Rd', city: 'Union', state: 'KY', zip: '41091' }, saved);
  const prof = S.addProfileAddress({}, typed);
  assert.equal(prof.addresses[0].default, true);
  assert.equal(S.addProfileAddress(prof, typed).addresses.length, 1);
  const V = await import('../app/vault.mjs');
  assert.ok(V.connectionsPage({ user: {} }).includes('CoreBridge Business ID'));
});

test('document prefix: each location sets its own (226-75148), never doubled', async () => {
  const St = await import('../app/settings.mjs');
  assert.equal(St.docNumber('226', '75148'), '226-75148');
  assert.equal(St.docNumber('226', '226-75148'), '226-75148');
  assert.equal(St.docNumber('', '75148'), '75148');
  assert.ok(St.FIELDS.company.some((f) => f[0] === 'docPrefix'));
  const S = await import('../app/shipping.mjs');
  const h = S.invoicePage({ page: ({ body }) => body, user: {}, p: { id: 'demo-6', orderId: '75148', name: 'x', company: 'y', total: 10 }, dest: null, ship: null, prefix: '226' });
  assert.match(h, /Invoice · 226-75148/);
});
