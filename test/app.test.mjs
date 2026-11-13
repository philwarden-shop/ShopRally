import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.ALLOWED_EMAILS = 'phil.warden@fastsigns.com';
process.env.USER_POOL_ID = 'us-east-2_TEST';
process.env.AWS_REGION = 'us-east-2';

const { sign, verify, allowed, verifyIdToken } = await import('../app/auth.mjs');
const { cbRead, toProject, laneFor, cbDate } = await import('../app/cb.mjs');
const { demoProjects, groupByLane, LANES } = await import('../app/data.mjs');
const { boardPage, projectPage, esc } = await import('../app/views.mjs');
const { readCookies } = await import('../app/index.mjs');

test('session cookie round-trips and rejects tampering and expiry', () => {
  const t = sign({ email: 'a@b.c', exp: Date.now() + 1000 }, 'k');
  assert.equal(verify(t, 'k').email, 'a@b.c');
  assert.equal(verify(t, 'other'), null);
  assert.equal(verify(t.slice(0, -2) + 'xx', 'k'), null);
  assert.equal(verify(sign({ email: 'a', exp: Date.now() - 1 }, 'k'), 'k'), null);
  assert.equal(verify('junk', 'k'), null);
});

test('only allowed emails get in', () => {
  assert.ok(allowed('Phil.Warden@FASTSIGNS.com'));
  assert.ok(!allowed('someone@else.com'));
  assert.ok(!allowed(''));
});

test('id token is verified with the pool key, issuer, audience and expiry', async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256' };
  const mk = (claims) => {
    const h = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'k1' })).toString('base64url');
    const p = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const s = crypto.sign('RSA-SHA256', Buffer.from(`${h}.${p}`), privateKey).toString('base64url');
    return `${h}.${p}.${s}`;
  };
  const good = { iss: 'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_TEST', aud: 'cid', token_use: 'id', exp: Date.now() / 1000 + 60, email: 'phil.warden@fastsigns.com' };
  assert.equal((await verifyIdToken(mk(good), 'cid', { keys: [jwk] })).email, good.email);
  await assert.rejects(verifyIdToken(mk({ ...good, aud: 'x' }), 'cid', { keys: [jwk] }));
  await assert.rejects(verifyIdToken(mk({ ...good, iss: 'https://evil' }), 'cid', { keys: [jwk] }));
  await assert.rejects(verifyIdToken(mk({ ...good, exp: 1 }), 'cid', { keys: [jwk] }));
  const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const bad = mk(good).split('.'); bad[2] = crypto.sign('RSA-SHA256', Buffer.from(`${bad[0]}.${bad[1]}`), other.privateKey).toString('base64url');
  await assert.rejects(verifyIdToken(bad.join('.'), 'cid', { keys: [jwk] }));
});

test('CoreBridge reads retry while held, then return data', async () => {
  let calls = 0;
  const invoke = async () => (++calls < 3 ? { status: 'held', reason: 'TenantRateHeld' } : { status: 'completed_read', evidence_key: 'k' });
  const out = await cbRead('getLocations', null, { invoke, fetchEvidence: async () => '[{"id":2}]' });
  assert.deepEqual(out, [{ id: 2 }]);
  assert.equal(calls, 3);
});

test('CoreBridge reads give up at the deadline and refuse writes', async () => {
  await assert.rejects(cbRead('getLocations', null, { deadline: Date.now() + 50, invoke: async () => ({ reason: 'TenantRateHeld' }) }), /busy/);
  await assert.rejects(cbRead('convertEstimate', { id: 1 }), /not an allowed read/);
  await assert.rejects(cbRead('getLocations', null, { invoke: async () => ({ status: 'http_error', http_status: 403 }) }), /403/);
});

test('CoreBridge records map onto project cards and lanes', () => {
  const p = toProject({ OrderId: 71127, OrderDescription: 'Hanging Sign', CompanyName: 'Acme', OrderTotal: 274.46, Status: 'ESTIMATE',
    DateCreated: { Year: 2026, Month: 11, Day: 9 }, EstimateProjectedOrderDueDate: { Year: 1, Month: 1, Day: 1 }, ExOrderProductIDs: [1] });
  assert.equal(p.id, 'cb-71127'); assert.equal(p.lane, 'estimate'); assert.equal(p.due, null); assert.equal(p.created, '2026-11-09');
  assert.equal(laneFor('BUILT'), 'built'); assert.equal(laneFor('WIP'), 'progress'); assert.equal(laneFor('VOIDED'), 'closed');
  assert.equal(cbDate({ Year: 2026, Month: 2, Day: 3 }), '2026-02-03');
});

test('demo data fills every lane and carries the location', () => {
  const lanes = groupByLane(demoProjects());
  assert.equal(lanes.length, LANES.length);
  for (const l of lanes) assert.ok(l.items.length > 0, l.key);
  for (const p of demoProjects()) assert.equal(p.location, 'nky');
});

test('pages escape everything they show', () => {
  assert.equal(esc('<script>"&\''), '&lt;script&gt;&quot;&amp;&#39;');
  const evil = { ...demoProjects()[0], name: '<img src=x onerror=alert(1)>', company: '"><b>x' };
  const board = boardPage({ user: { email: 'a@b.c' }, mode: 'demo', lanes: groupByLane([evil]), syncedAt: null });
  assert.ok(!board.includes('<img src=x'));
  assert.ok(!projectPage({ user: { email: 'a@b.c' }, mode: 'demo', p: evil }).includes('<img src=x'));
});

test('cookies are parsed from the Function URL event', () => {
  assert.deepEqual(readCookies({ cookies: ['a=1', 'b=x=y'] }), { a: '1', b: 'x=y' });
});

// ---- Slice 1a: workflow, items, boards ----
const W = await import('../app/workflow.mjs');
const I = await import('../app/items.mjs');
const Bd = await import('../app/boards.mjs');
const { formBody } = await import('../app/index.mjs');

test('every demo item sits on a real step and project', () => {
  for (const it of I.demoItems()) {
    assert.ok(W.stepById(it.step), it.id);
    assert.ok(I.customerOf(it.projectId), it.id);
  }
});

test('moves follow the workflow and say what CoreBridge would get', () => {
  const it = I.demoItems().find((x) => x.id === 'i71'); // WIP
  const ok = I.planMove(it, 'qc', { by: 'phil' });
  assert.equal(ok.fields.step, 'qc'); assert.equal(ok.log.cbWouldPush, null);
  assert.throws(() => I.planMove(it, 'done'), /can't move/); assert.equal(W.nextSteps('wip')[0].id, 'qc'); assert.equal(W.nextSteps('hold', 'wip')[0].id, 'wip');
  assert.throws(() => I.planMove(it, 'hold'), /hold reason/);
  const held = I.planMove(it, 'hold', { reason: 'Waiting for artwork' });
  assert.equal(held.log.cbWouldPush, null); assert.equal(held.fields.heldFrom, 'wip');
  assert.equal(I.planMove({ ...it, ...held.fields }, 'wip').log.cbWouldPush, null);
  assert.equal(W.orderCbStatus([{ step: 'hold', heldFrom: 'wip' }]), 'WIP');
  const qc = I.demoItems().find((x) => x.id === 'i33');
  assert.equal(I.planMove(qc, 'built').log.cbWouldPush, 'BUILT');
});

test('order status follows its items (Built only when every item is Built)', () => {
  assert.equal(W.orderCbStatus([{ step: 'built' }, { step: 'wip' }]), 'WIP');
  assert.equal(W.orderCbStatus([{ step: 'built' }, { step: 'done' }]), 'BUILT');
  assert.equal(W.orderCbStatus([{ step: 'done' }]), 'COMPLETED');
});

test('Design Revision bug from the reconciliation can never happen', () => {
  for (const s of W.ALL_STEPS) assert.notEqual(s.cb, 'DESIGN REVISION');
});

test('list columns: locked columns always show, defaults hide extras', () => {
  const def = W.visibleColumns('production', null);
  assert.ok(def.find((c) => c.key === 'due').on); assert.ok(!def.find((c) => c.key === 'qty').on);
  const custom = W.visibleColumns('production', ['due', 'note']);
  assert.ok(custom.find((c) => c.key === 'due').on); assert.ok(!custom.find((c) => c.key === 'note').on); assert.ok(custom.find((c) => c.key === 'qty').on);
});

test('boards render in both views, escape text, and only show their own steps', () => {
  const items = I.demoItems().map((i) => ({ ...i, customer: I.customerOf(i.projectId) }));
  items[0] = { ...items[0], name: '<script>x</script>' };
  const d = Bd.boardPage({ user: { email: 'a@b.c' }, board: 'design', items, view: 'board', columns: W.visibleColumns('design', null), log: [] });
  assert.ok(d.includes('In design')); assert.ok(!d.includes('<script>x')); assert.ok(!d.includes('>Print<'));
  const p = Bd.boardPage({ user: { email: 'a@b.c' }, board: 'production', items, view: 'list', columns: W.visibleColumns('production', null), log: [] });
  assert.ok(p.includes('<table>')); assert.ok(p.includes('Waiting for artwork'));
});

test('form posts are decoded, including base64 bodies', () => {
  assert.deepEqual(formBody({ body: 'to=fab&back=%2Fboards' }), { to: 'fab', back: '/boards' });
  assert.deepEqual(formBody({ isBase64Encoded: true, body: Buffer.from('to=hold%7CWaiting').toString('base64') }), { to: 'hold|Waiting' });
});

test('every transition points at a real step and every step can be left (except Complete)', () => {
  for (const s of W.STEPS) {
    for (const t of W.TRANSITIONS[s.id]) assert.ok(W.stepById(t), `${s.id}->${t}`);
    if (s.id !== 'done') assert.ok(W.TRANSITIONS[s.id].length > 0, s.id);
  }
});

test('only Built and Complete reach CoreBridge; everything else stays in SalesMax', () => {
  const pushes = W.STEPS.filter((s) => s.cb).map((s) => s.id);
  assert.deepEqual(pushes, ['built', 'done']);
  const it = I.demoItems().find((x) => x.id === 'i61'); // Proof with customer
  assert.equal(I.planMove(it, 'indesign').log.cbWouldPush, null);
  const built = I.demoItems().find((x) => x.id === 'i81');
  assert.equal(I.planMove(built, 'done').log.cbWouldPush, 'COMPLETED');
  assert.equal(W.cbStatusOf({ step: 'wip' }), 'ORDER REVIEW');
  assert.equal(W.orderCbStatus([{ step: 'built' }, { step: 'wip' }]), 'WIP');
});

test('Design backlog: Prepare for design feeds the queue, a designer pulls from it', () => {
  assert.equal(W.nextSteps('prep')[0].id, 'queue');
  assert.equal(W.nextSteps('queue')[0].id, 'indesign');
  assert.equal(W.boardSteps('design')[1].id, 'queue');
});

test('changes requested: back to In design with a Design Revision tag that counts rounds', () => {
  const it = I.demoItems().find((x) => x.id === 'i61'); // Awaiting customer approval
  const r1 = I.planMove(it, 'indesign');
  assert.equal(r1.fields.revision, 1); assert.equal(r1.log.cbWouldPush, null);
  const again = { ...it, ...r1.fields, step: 'proofwait' };
  assert.equal(I.planMove(again, 'indesign').fields.revision, 2);
  assert.equal(I.planMove(again, 'files').fields.revision, 0);
  const html = Bd.boardPage({ user: { email: 'a@b.c' }, board: 'design', items: [{ ...it, ...r1.fields, customer: 'x' }], view: 'board', columns: W.visibleColumns('design', null), log: [] });
  assert.ok(html.includes('DESIGN REVISION 1'));
});

test('In-house or vended? rule reads the Vended box or a "Vended - ..." part', () => {
  assert.equal(W.routeToProduce({ IsVended: true }), 'vended');
  assert.equal(W.routeToProduce({ Parts: [{ Name: 'Acrylic 1/4' }, { Name: 'Vended - Channel letters' }] }), 'vended');
  assert.equal(W.routeToProduce({ Parts: [{ Name: 'Acrylic 1/4' }] }), 'wip');
  assert.equal(W.routeToProduce({}), 'wip');
});

test('Book shipping task appears when every item for a Ship destination is Built, and clears with tracking', () => {
  const dest = { Id: 7, OrderAddressTypeName: 'Ship', Items: [{ OrderProductId: 1 }, { OrderProductId: 2 }] };
  assert.deepEqual(W.handoffTasks(dest, { 1: 'built', 2: 'wip' }), []);
  assert.equal(W.handoffTasks(dest, { 1: 'built', 2: 'built' })[0].kind, 'book-shipping');
  assert.deepEqual(W.handoffTasks({ ...dest, XPSTrackingNumbers: '1Z999' }, { 1: 'built', 2: 'built' }), []);
  assert.equal(W.handoffTasks({ ...dest, OrderAddressTypeName: 'Pickup' }, { 1: 'built', 2: 'done' })[0].kind, 'pickup-notice');
  assert.deepEqual(W.handoffTasks({ ...dest, OrderAddressTypeName: 'Install' }, { 1: 'built', 2: 'built' }), []);
});

test('proof upload runs the automatic review; clean goes to Sales, issues go back to the designer', () => {
  assert.deepEqual(W.onProofUploaded({ step: 'indesign' }), { to: 'proofqc', runReview: true });
  assert.equal(W.onProofUploaded({ step: 'files' }).runReview, false);
  assert.equal(W.proofReviewOutcome({ issues: [] }).to, 'salesrev');
  assert.equal(W.proofReviewOutcome({ issues: [{ text: 'tip only', severity: 'info' }] }).to, 'salesrev');
  const bad = W.proofReviewOutcome({ issues: [{ text: 'Phone number has 9 digits' }, { text: 'Size is 24x36, order says 24x48' }] });
  assert.equal(bad.to, 'indesign'); assert.equal(bad.notify, 'designer'); assert.match(bad.note, /2 issues/);
  assert.ok(W.TRANSITIONS.proofqc.includes(bad.to) && W.TRANSITIONS.proofqc.includes('salesrev'));
});

test('QC task goes to the salesperson, or to their delegate(s) when they work remotely', () => {
  const it = { id: 'x', name: 'Yard signs', step: 'qc', due: '2026-11-12' };
  assert.deepEqual(W.qcTaskFor(it, { salesperson: 'Kristin' }).assignees, ['Kristin']);
  const d = W.qcTaskFor(it, { salesperson: 'Remote Rep', delegates: { 'Remote Rep': ['Kristin', 'Justin'] } });
  assert.deepEqual(d.assignees, ['Kristin', 'Justin']); assert.equal(d.onBehalfOf, 'Remote Rep');
  assert.equal(W.qcTaskFor({ ...it, step: 'wip' }, { salesperson: 'Kristin' }), null);
});

test('Stuck list catches stale holds and slow steps, and escalates the worst', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const ago = (d) => new Date(now - d * 86400000).toISOString();
  const s = W.stuckItems([
    { id: 'a', step: 'hold', holdReason: 'Waiting for artwork', movedAt: ago(3) },
    { id: 'b', step: 'hold', holdReason: 'Need info: vendor', movedAt: ago(6) },
    { id: 'c', step: 'wip', movedAt: ago(1) },
    { id: 'd', step: 'qc', movedAt: ago(3) },
    { id: 'e', step: 'done', movedAt: ago(30) },
  ], now);
  assert.deepEqual(s.map((x) => x.id), ['a', 'b', 'd']);
  assert.equal(s.find((x) => x.id === 'a').escalate, false);
  assert.equal(s.find((x) => x.id === 'b').escalate, true);
  assert.equal(s.find((x) => x.id === 'd').escalate, true);
});

test('tags fill themselves from CoreBridge data, and the nightly check spots a missing one', () => {
  const today = new Date('2026-11-10T12:00:00Z');
  const t = W.autoTags({ item: { due: '2026-11-11', step: 'wip' }, product: { Parts: [{ Name: 'Vended - Channel letters' }] }, destination: { OrderAddressTypeName: 'Install' }, customer: { vip: true }, today });
  assert.deepEqual(t.sort(), ['handoff:install', 'rush', 'vended', 'vip']);
  assert.deepEqual(W.autoTags({ item: { due: '2026-12-01' }, today }), []);
  assert.deepEqual(W.missingTags({ tags: ['rush'] }, ['vended', 'rush']), ['vended']);
  for (const r of W.ROUTING_TAGS) assert.ok(!['vip', 'first-order', 'rush'].includes(r));
});

test('Production Board is WIP / Vended / QC / Built, with Assigned to, Station and Destination filters', () => {
  assert.deepEqual(W.boardSteps('production').map((x) => x.id), ['wip', 'vended', 'qc', 'built']);
  const items = I.demoItems().map((i) => ({ ...i, customer: I.customerOf(i.projectId) }));
  const page = (filters) => Bd.boardPage({ user: { email: 'a@b.c' }, board: 'production', items, view: 'list', columns: W.visibleColumns('production', null), log: [], filters });
  assert.ok(page({}).includes('Event banners (4)') && page({}).includes('A-frame inserts'));
  const router = page({ station: 'Router' });
  assert.ok(router.includes('A-frame inserts') && !router.includes('Event banners (4)'));
  assert.ok(router.includes('Yard signs (50)'), 'station filter leaves other steps alone');
  const mike = page({ who: 'Mike (print)' });
  assert.ok(mike.includes('Event banners (4)') && !mike.includes('Yard signs (50)'));
  assert.ok(page({ handoff: 'Install' }).includes('ADA room signs') && !page({ handoff: 'Pickup' }).includes('ADA room signs'));
});

test('Fail QC: picking an issue tags it for reporting and routes to Design or Production', () => {
  const it = { id: 'q', step: 'qc' };
  assert.deepEqual(W.failQc(it, 'Spelling/Grammar').to, 'indesign');
  assert.equal(W.failQc(it, 'Banding').to, 'wip');
  assert.equal(W.failQc(it, 'Banding').tag, 'qc:production:Banding');
  assert.throws(() => W.failQc(it, 'Something else'), /from the list/);
  assert.throws(() => W.failQc({ step: 'wip' }, 'Banding'), /Quality control/);
  for (const to of ['indesign', 'wip']) assert.ok(W.TRANSITIONS.qc.includes(to));
});

// ---- Hybrid estimates ----
const E = await import('../app/estimates.mjs');

test('placeholder estimate: one blank product per site-survey line, quantity never 0', () => {
  const p = demoProjects()[0];
  const lines = E.surveyLines(E.surveyFor(p.id));
  assert.equal(lines.length, 5);
  const body = E.buildPlaceholderEstimate({ project: p, account: { cbAccountId: 8211, contactId: 20251, salespersonId: 15 }, lines });
  assert.equal(body.IsEstimate, true); assert.equal(body.GenericOrderLineItems.length, 5);
  for (const l of body.GenericOrderLineItems) { assert.ok(l.ProductQuantity >= 1); assert.equal(l.UseQuickProductPricing, false); assert.ok(!('PartIds' in l)); }
  assert.equal(body.GenericOrderLineItems[3].ProductQuantity, 18);
  const none = E.buildPlaceholderEstimate({ project: { name: 'Lobby sign' }, lines: E.surveyLines(null) });
  assert.equal(none.GenericOrderLineItems.length, 1); assert.equal(none.GenericOrderLineItems[0].ProductQuantity, 1);
  assert.equal(E.buildPlaceholderEstimate({ project: p, lines: [{ description: 'x', qty: 0 }] }).GenericOrderLineItems[0].ProductQuantity, 1);
  const taxed = E.buildPlaceholderEstimate({ project: p, lines, settings: { taxGroupId: 7 } });
  assert.equal(taxed.OverrideAssignedTaxGroupId, 7);
});

test('CoreBridge "Mapping Error" reply still yields the order id, and we always read back', () => {
  const r = E.interpretCreateReply({ CbOrderId: 0, IsSuccess: false, Message: 'The Order could not be saved. Please, try again. Error: Mapping Error! One or more invalid input parameters (CbId:71141, ExternalId:)' });
  assert.equal(r.orderId, 71141); assert.equal(r.mustReadBack, true);
  assert.equal(E.interpretCreateReply({ CbOrderId: 0, Message: 'Attempted to divide by zero.' }).orderId, null);
  const sent = E.buildPlaceholderEstimate({ project: { name: 'P' }, lines: [{ description: 'A', qty: 2 }, { description: 'B', qty: 1 }] });
  const good = E.verifyPlaceholders(sent, { Status: 'ESTIMATE', EstimateNumber: 'EST-1', ExOrderProducts: [{ ProductDescription: 'A', ProductQuantity: 2 }, { ProductDescription: 'B', ProductQuantity: 1 }] });
  assert.equal(good.ok, true);
  const bad = E.verifyPlaceholders(sent, { Status: 'ESTIMATE', ExOrderProducts: [{ ProductDescription: 'A', ProductQuantity: 2 }] });
  assert.equal(bad.ok, false); assert.deepEqual(bad.missing, [['B', 1]]);
});

test('estimate preview page escapes text and shows every survey line', () => {
  const p = { ...demoProjects()[0], company: '<b>x' };
  const s = E.surveyFor(p.id);
  const html = E.estimatePage({ user: { email: 'a@b.c' }, p, survey: s, body: E.buildPlaceholderEstimate({ project: p, lines: E.surveyLines(s) }) });
  assert.ok(!html.includes('<b>x')); assert.ok(html.includes('ADA room ID signs'));
});

// ---- Customer first, tax by state ----
const CU = await import('../app/customers.mjs');

test('tax group comes from the company state; exempt and unknown states are handled', () => {
  assert.equal(CU.taxGroupFor({ state: 'ky' }).id, 11);
  assert.equal(CU.taxGroupFor({ state: 'OH' }).name, 'Ohio Shipment');
  assert.equal(CU.taxGroupFor({ state: 'IN', taxExempt: true }).id, 14);
  const unk = CU.taxGroupFor({}); assert.equal(unk.id, 11); assert.equal(unk.check, true);
});

test('company match: exact, possible, none', () => {
  const cb = [{ accountId: 8211, companyName: 'FASTSIGNS 226', companyPhone: '' }, { accountId: 6611, companyName: 'FASTSIGNS 2266', companyPhone: '(304) 712-3060' }];
  assert.deepEqual(CU.matchCompany({ name: 'Fastsigns 226' }, cb), { result: 'match', accountId: 8211, name: 'FASTSIGNS 226' });
  assert.equal(CU.matchCompany({ name: 'Fastsigns' }, cb).result, 'possible');
  assert.equal(CU.matchCompany({ name: 'Riverbend Dental' }, cb).result, 'none');
  assert.equal(CU.matchCompany({ name: 'Riverbend Dental, Inc.' }, [{ accountId: 9, companyName: 'Riverbend Dental' }]).result, 'match');
});

test('estimate waits until company and contact are in CoreBridge; new ones are DO NOT MAIL', () => {
  assert.equal(CU.planCustomerSync({ company: { cbAccountId: 1 }, contact: { cbContactId: 2 } }).ready, true);
  const p = CU.planCustomerSync({ company: { name: 'Riverbend Dental' }, contact: { firstName: 'Dana', lastName: 'Ruiz' } });
  assert.equal(p.ready, false); assert.equal(p.steps[0].do, 'createCompany');
  assert.equal(CU.planCustomerSync({ company: { cbAccountId: 5 }, contact: { firstName: 'A', lastName: 'B' } }).steps[0].do, 'createContact');
  const body = CU.buildCreateCustomer({ company: { name: 'Riverbend Dental' }, contact: { firstName: 'Dana', lastName: 'Ruiz' } });
  assert.equal(body.primaryAccountContact.contactTypeId, 6); assert.equal(body.companyLocationId, 2);
  assert.equal(CU.buildCreateContact({ accountId: 5, contact: { firstName: 'A', lastName: 'B' } }).contactTypeId, 6);
  assert.deepEqual(CU.activateContact(20251), { contactId: 20251, contactTypeId: 4 });
});

test('estimate page shows the customer steps and the state tax group first', () => {
  const p = demoProjects().find((x) => x.id === 'demo-2');
  const cu = E.customerFor(p); const tax = CU.taxGroupFor(cu.company);
  const plan = CU.planCustomerSync({ company: cu.company, contact: cu.contact });
  const body = E.buildPlaceholderEstimate({ project: p, lines: E.surveyLines(E.surveyFor(p.id)), settings: { taxGroupId: tax.id } });
  assert.equal(body.OverrideAssignedTaxGroupId, 38);
  const html = E.estimatePage({ user: { email: 'a@b.c' }, p, survey: E.surveyFor(p.id), body, plan, tax });
  assert.ok(html.includes('Before the Estimate') && html.includes('Ohio Shipment') && html.includes('Create company'));
});



test('estimate tax group follows the company state (via customers.mjs)', () => {
  const body = E.buildPlaceholderEstimate({ project: { name: 'x' }, account: { cbAccountId: 1, contactId: 2, state: 'OH' }, lines: [] });
  assert.equal(body.OverrideAssignedTaxGroupId, 38);
  assert.equal(E.buildPlaceholderEstimate({ project: { name: 'x' }, account: { state: 'KY', taxExempt: true }, lines: [] }).OverrideAssignedTaxGroupId, 14);
});

// --- Send proof + Order Portal approval ---
const { portalToken, readPortalToken, decideProof, canSendProof, APPROVAL_CHECKS, portalPage } = await import('../app/proofs.mjs');

test('portal link opens only its own project, expires, and cannot be a staff session', async () => {
  const { verify: v } = await import('../app/auth.mjs');
  const tok = portalToken('demo-6', 'k1', 1000);
  assert.equal(readPortalToken(tok, 'k1', 2000).p, 'demo-6');
  assert.equal(readPortalToken(tok, 'k2', 2000), null);
  assert.equal(readPortalToken(tok, 'k1', 1000 + 31 * 86400000), null);
  assert.equal(v(tok, 'k1', 2000), null);
});

test('customer approval needs every box ticked and goes to production files', () => {
  const it = { id: 'i61', step: 'proofwait' };
  assert.throws(() => decideProof(it, 'approve', { checks: APPROVAL_CHECKS.slice(0, 2) }), /tick every box/);
  assert.equal(decideProof(it, 'approve', { checks: APPROVAL_CHECKS }).to, 'files');
  assert.throws(() => decideProof({ step: 'files' }, 'approve', { checks: APPROVAL_CHECKS }), /not waiting/);
});

test('customer changes go back to In design as a Design Revision with the notes', async () => {
  const { planMove } = await import('../app/items.mjs');
  const it = { id: 'i61', step: 'proofwait', revision: 2 };
  assert.throws(() => decideProof(it, 'changes', { notes: ' ' }), /what to change/);
  const d = decideProof(it, 'changes', { notes: 'Make the logo bigger' });
  assert.equal(d.to, 'indesign');
  const { fields } = planMove(it, d.to, { note: d.note });
  assert.equal(fields.revision, 3);
  assert.match(fields.note, /logo bigger/);
  assert.equal(planMove(it, 'files', {}).fields.revision, 0);
});

test('send proof only from sales review or awaiting approval; portal escapes text', () => {
  assert.equal(canSendProof({ step: 'salesrev' }), true);
  assert.equal(canSendProof({ step: 'indesign' }), false);
  const h = portalPage({ project: { name: '<x>', company: 'Co' }, items: [{ id: 'i61', name: 'Sign', step: 'proofwait', customer: 'Co' }], token: 't.k' });
  assert.ok(!h.includes('<x>') && h.includes('&lt;x&gt;'));
  assert.ok(h.includes('/p/t.k/items/i61') && h.includes('Approve This Proof'));
});

// --- Source (CoreBridge order origination), pre-filled ---
const { suggestOrigination, ORIGINATIONS } = await import('../app/origination.mjs');

test('source is pre-filled from how the lead started', () => {
  const today = new Date('2026-11-10');
  assert.equal(suggestOrigination({ channel: 'website', paidOrders: 4, lastPaidOrderAt: '2025-01-01' }, today).id, 57); // customer reached out wins
  assert.equal(suggestOrigination({ startedBy: 'salesperson', paidOrders: 0 }, today).id, 43);
  assert.equal(suggestOrigination({ startedBy: 'salesperson', paidOrders: 5, lastPaidOrderAt: '2026-01-15' }, today).id, 14); // dormant 180+ days
  assert.equal(suggestOrigination({ sequence: 'winback', paidOrders: 2, lastPaidOrderAt: '2026-09-01' }, today).id, 14);
  assert.equal(suggestOrigination({ startedBy: 'salesperson', sequence: 'needs', paidOrders: 5, lastPaidOrderAt: '2026-10-01' }, today).id, 69);
  assert.match(suggestOrigination({}, today).reason, /New account/);
});

test('estimate carries the source CoreBridge requires', async () => {
  const { buildPlaceholderEstimate } = await import('../app/estimates.mjs');
  const body = buildPlaceholderEstimate({ project: { name: 'X' }, settings: { taxGroupId: 11, originationId: ORIGINATIONS.inbound.id } });
  assert.equal(body.OrderOriginationId, 57);
  assert.equal(buildPlaceholderEstimate({ project: { name: 'X' }, settings: {} }).OrderOriginationId, undefined);
});

// --- Build Estimate (configured parts, live CoreBridge price) ---
const BLD = await import('../app/builder.mjs');
// Builder tests use their own fixture modifiers; don't let the bundled history field list (mod-fields.json) change them.
{ const M = await import('../app/modui.mjs'); M.resetModFields(); M.modFields(() => ({ groups: {} })); }
const FIX = { pulled: '2026-11-10', parts: [
  { Id: 45, Name: 'Banner - 13oz Matte (Single-Sided Only)', CostPerType: 'SquareFeet', UsesQuantity: true, UsesWidth: true, UsesHeight: true, ConfiguredOrderReady: true, Modifiers: [{ Id: 233, Name: 'PRODUCTION (BANNERS)' }, { Id: 4, Name: 'Velcro' }] },
  { Id: 318, Name: 'Service - Delivery', CostPerType: 'Each', UsesWidth: false, UsesHeight: false, ConfiguredOrderReady: true, Modifiers: [] },
], modifiers: [{ Id: 4, Name: 'Velcro', VariableRateOptions: [{ Ordinal: 0, Label: 'Hook' }, { Ordinal: 1, Label: 'Loop' }] }, { Id: 233, Name: 'PRODUCTION (BANNERS)', VariableRateOptions: [] }] };

test('build estimate: only the part’s own modifiers, sizes required, variable-rate option required', () => {
  BLD.resetCatalog(); const cat = BLD.catalog(() => FIX);
  const [l] = BLD.readLines({ lines: '1', p0: '45', q0: '2', w0: '96', h0: '36', m0_233: '1', m0_4: '1', m0_999: '1' }, cat);
  assert.deepEqual(l.mods.map((m) => m.id), [233, 4]); // 999 is not on this part, so it is ignored
  assert.match(BLD.checkLine(l).join(' '), /Pick an option for Velcro/);
  const [l2] = BLD.readLines({ lines: '1', p0: '45', q0: '1', m0_4: '1', v0_4: '1' }, cat);
  assert.match(BLD.checkLine(l2).join(' '), /width/);
  const [l3] = BLD.readLines({ lines: '1', p0: '318', q0: '1' }, cat);
  assert.deepEqual(BLD.checkLine(l3), []);
  BLD.resetCatalog();
});

test('build estimate: request matches what CoreBridge priced in the Nov 10 test', () => {
  BLD.resetCatalog(); const cat = BLD.catalog(() => FIX);
  const lines = BLD.readLines({ lines: '2', p0: '45', n0: 'TEST 3x8 banner', q0: '1', w0: '96', h0: '36', p1: '318', q1: '1', m1_4: '1' }, cat);
  const req = BLD.buildConfiguredRequest({ lines, taxGroupId: 11 });
  assert.deepEqual(req.Products[0], { Name: 'TEST 3x8 banner', Quantity: 1, Parts: [{ PartId: 45, Quantity: 1, Width: 96, Height: 36 }] });
  assert.equal(req.Products[1].Parts[0].Width, undefined); // delivery has no size
  assert.equal(req.Products[1].Parts[0].Quantity, undefined); // and its pricing template refuses a part quantity
  assert.equal(req.TaxGroupId, 11);
  const create = BLD.buildConfiguredRequest({ lines, originationId: 57, create: true });
  assert.equal(create.IsEstimate, true); assert.equal(create.OrderOriginationId, 57);
  const shown = BLD.readPrice({ IsSuccess: true, SubTotalPrice: 134.4, TaxesPrice: 7.34, OrderTotal: 141.74, Products: [{ Name: 'TEST 3x8 banner', Quantity: 1, PartsTotal: 122.4, SetupFeeTotal: 12, Total: 134.4, SetupFees: [{ Name: 'Technology Fees', Amount: 12 }, { Name: 'Shipping Fees', Amount: 0 }] }] });
  assert.equal(shown.total, 141.74); assert.deepEqual(shown.lines[0].feeNames, ['Technology Fees $12.00']);
  assert.equal(BLD.readPrice({ IsSuccess: false, Errors: ['Modifier 11 is not related to part 45.'] }).errors[0], 'Modifier 11 is not related to part 45.');
  BLD.resetCatalog();
});

test('build estimate page escapes text and keeps the choices', () => {
  BLD.resetCatalog(); BLD.catalog(() => FIX);
  const lines = BLD.readLines({ lines: '1', p0: '45', n0: '<b>x</b>', w0: '96', h0: '36' });
  const h = BLD.builderPage({ user: { email: 'a@b.c' }, p: { id: 'demo-1', name: 'P', company: 'C' }, lines });
  assert.ok(h.includes('&lt;b&gt;x&lt;/b&gt;') && !h.includes('<b>x</b>'));
  assert.ok(h.includes('value="45" selected') && h.includes('PRODUCTION (BANNERS)'));
  BLD.resetCatalog();
});

test('cbRead passes a body for POST lookups', async () => {
  const { cbRead } = await import('../app/cb.mjs');
  let sent;
  const r = await cbRead('priceConfiguredOrder', undefined, { body: { AccountId: 1 }, invoke: async (ev) => { sent = ev; return { status: 'completed_read', evidence_key: 'k' }; }, fetchEvidence: async () => '{"IsSuccess":true}' });
  assert.deepEqual(sent.body, { AccountId: 1 }); assert.equal(r.IsSuccess, true);
});

test('cbRead hands back CoreBridge validation errors instead of a bare 400', async () => {
  const { cbRead } = await import('../app/cb.mjs');
  const r = await cbRead('priceConfiguredOrder', undefined, { body: {}, invoke: async () => ({ status: 'http_error', http_status: 400, error_key: 'e' }), fetchEvidence: async () => '{"IsSuccess":false,"Errors":["quantity is not allowed by this part\'s pricing template; omit it to use 1."]}' });
  assert.equal(r.IsSuccess, false); assert.match(r.Errors[0], /quantity is not allowed/);
  await assert.rejects(cbRead('getEstimate', {}, { invoke: async () => ({ status: 'http_error', http_status: 500, error_key: 'e' }), fetchEvidence: async () => 'oops' }), /failed/);
});

test('cbRead stops retrying a held request when another attempt would not fit before the deadline', async () => {
  const { cbRead } = await import('../app/cb.mjs');
  let calls = 0;
  await assert.rejects(cbRead('getEstimate', {}, { deadline: Date.now() + 5000, attemptMs: 11000, invoke: async () => { calls++; return { reason: 'TenantRateHeld' }; } }), /busy/);
  assert.equal(calls, 1);
});

// --- Buying agent: vendor quote and PO checks ---
const BUY = await import('../app/buying.mjs');
test('buying: vendor quoted 2 signs, we sold 1 - blocked, and the cost is for 1', () => {
  const item = { qty: 1, w: 48, h: 96, material: 'Aluminum composite (ACM) 3mm', sides: 1, dueDate: '2026-12-15' };
  const quote = { vendor: 'Acme Signs', quoteNo: 'Q-881', lines: [{ description: '4x8 ACM 3mm panel, digitally printed', qty: 2, unitPrice: 310, total: 620, w: 96, h: 48 }], freight: 45, expires: '2026-12-31', leadDays: 7 };
  const r = BUY.checkQuote(item, quote, { today: '2026-11-10' });
  assert.equal(r.level, 'block');
  assert.ok(r.issues.some((i) => i.code === 'qty_mismatch' && /quoted 2, but the estimate sells 1/.test(i.say)));
  assert.equal(r.cost, 355); // 1 x 310 + 45 freight, never 620
  const po = BUY.checkPurchaseOrder({ item, quote, accepted: r, po: { qty: 2, total: 665, quoteNo: 'Q-881' } });
  assert.equal(po.level, 'block');
  assert.ok(po.issues.some((i) => i.code === 'po_qty') && po.issues.some((i) => i.code === 'quote_unresolved'));
});
test('buying: a clean quote passes; math, size, sides, expiry and lead time are caught', () => {
  const item = { qty: 3, w: 24, h: 36, material: 'Coroplast 4mm', sides: 2, dueDate: '2026-11-20' };
  const ok = BUY.checkQuote(item, { lines: [{ description: 'Coroplast 4mm yard sign double-sided', qty: 3, unitPrice: 20, total: 60, w: 36, h: 24 }], expires: '2026-12-31', leadDays: 3 }, { today: '2026-11-10' });
  assert.equal(ok.level, 'ok'); assert.equal(ok.cost, 60);
  const bad = BUY.checkQuote(item, { lines: [{ description: 'Coroplast 4mm yard sign', qty: 3, unitPrice: 20, total: 66, w: 30, h: 24 }], expires: '2026-11-01', leadDays: 9 }, { today: '2026-11-10' });
  const codes = bad.issues.map((i) => i.code);
  for (const c of ['math', 'size_mismatch', 'sides', 'expired', 'lead_time']) assert.ok(codes.includes(c), c);
  assert.equal(bad.level, 'block');
  const po = BUY.checkPurchaseOrder({ item, accepted: ok, po: { qty: 3, total: 60 } });
  assert.equal(po.level, 'ok');
  assert.equal(BUY.checkPurchaseOrder({ item, accepted: ok, po: { qty: 3, total: 75 } }).issues[0].code, 'po_over_quote');
});
test('cbRead marks screen requests as interactive for the priority lane', async () => {
  const { cbRead } = await import('../app/cb.mjs');
  let sent;
  await cbRead('priceConfiguredOrder', undefined, { body: {}, interactive: true, invoke: async (ev) => { sent = ev; return { status: 'completed_read', evidence_key: 'k' }; }, fetchEvidence: async () => '{}' });
  assert.equal(sent.priority, 'interactive');
});

// --- AI Estimator v1: site survey -> draft on the Build Estimate screen ---
const EST = await import('../app/estimator.mjs');

test('estimator reads sizes from survey text', () => {
  assert.deepEqual(EST.parseSize('24 x 36'), { w: 24, h: 36 });
  assert.deepEqual(EST.parseSize('8 ft x 3 ft banner'), { w: 96, h: 36 });
  assert.deepEqual(EST.parseSize('Warehouse wall graphic, 40 ft'), { w: 480, h: 0 });
  assert.deepEqual(EST.parseSize('Monument (2 sides)'), { w: 0, h: 0 });
});

test('estimator drafts makeable lines, routes vended work to RFQ, never guesses a size', () => {
  const part = (id, name, w = true, mods = []) => ({ Id: id, Name: name, CostPerType: w ? 'SquareFeet' : 'Each', UsesQuantity: true, UsesWidth: w, UsesHeight: w, Modifiers: mods });
  const FIX = { parts: [part(515, 'Polycarbonate - 3/16" (White)', true, [{ Id: 243, Name: 'GRAPHIC DESIGN' }, { Id: 235, Name: 'PRODUCTION (RIGID)' }]), part(222, 'Vinyl Colored (RTA)', true, [{ Id: 244, Name: 'PRODUCTION (VINYL)' }]), part(566, 'Vended - Dimensional Letters', false), { ...part(469, 'Service - Install', false), UsesQuantity: false }], modifiers: [] };
  BLD.resetCatalog(); const cat = BLD.catalog(() => FIX);
  const survey = { site: 'Riverbend', lines: [
    { description: 'Exterior building letters', qty: 1 },
    { description: 'Monument sign face replacement', qty: 2, w: 96, h: 48 },
    { description: 'ADA room ID signs', qty: 18 },
    { description: 'Window hours vinyl', qty: 1 },
  ] };
  const d = EST.draftFromSurvey(survey, { cat });
  assert.equal(d.form.p0, '515'); assert.equal(d.form.w0, '96'); assert.equal(d.form.q0, '2');
  assert.equal(d.form.m0_235, '1'); assert.equal(d.form.m0_243, undefined); // production yes, design left to the person
  assert.equal(d.form.p1, '222'); assert.equal(d.form.w1, undefined); // no size on the survey: left blank, flagged
  assert.equal(d.form.p2, '469'); assert.equal(d.form.lines, '3');
  assert.equal(d.vendor.length, 1); assert.equal(d.person.length, 1);
  assert.ok(d.notes.some((n) => /width and height/.test(n)));
  const lines = BLD.readLines(d.form, cat);
  assert.equal(lines[0].part.id, 515); assert.deepEqual(BLD.checkLine(lines[0]), []);
  assert.ok(BLD.checkLine(lines[1]).length); // must be fixed before pricing
  BLD.resetCatalog();
});

// --- Prospect claim rules ---
const CL = await import('../app/claims.mjs');

test('claim limits: one owner, open cap, weekly cap, re-claim cooldown', () => {
  const R = { ...CL.CLAIM_RULES, maxOpen: 3, maxPerWeek: 2 };
  const claims = [
    { business: 'A', owner: 'kristin', claimedAt: '2026-11-02' },
    { business: 'B', owner: 'phil', claimedAt: '2026-11-09' },
    { business: 'C', owner: 'phil', claimedAt: '2026-11-10' },
    { business: 'D', owner: 'phil', claimedAt: '2026-09-01', releasedAt: '2026-10-01' },
  ];
  const t = '2026-11-11';
  assert.equal(CL.canClaim({ person: 'phil', business: 'A', claims, today: t, rules: R }).reason, 'taken');
  assert.equal(CL.canClaim({ person: 'phil', business: 'E', claims, today: t, rules: R }).reason, 'week_limit');
  assert.equal(CL.canClaim({ person: 'phil', business: 'D', claims, today: '2026-11-17', rules: R }).reason, 'cooldown');
  assert.equal(CL.canClaim({ person: 'phil', business: 'E', claims, today: '2026-11-17', rules: R }).ok, true);
  assert.equal(CL.canClaim({ person: 'phil', business: 'E', claims: [...claims, { business: 'F', owner: 'phil', claimedAt: '2026-10-01' }], today: '2026-11-17', rules: R }).reason, 'at_limit');
  assert.equal(CL.nextOwner({ business: 'D', team: ['phil', 'kristin', 'marcus'], claims, today: '2026-11-17', rules: R }), 'kristin'); // phil is in cooldown for D
});

test('stale claims go back to the pool', () => {
  assert.equal(CL.addBusinessDays('2026-11-13', 2), '2026-11-17'); // Fri + 2 business days = Tue
  const c = { business: 'X', owner: 'phil', claimedAt: '2026-11-13', touches: [] };
  assert.equal(CL.claimStatus(c, '2026-11-16').state, 'due');
  assert.equal(CL.claimStatus(c, '2026-11-18').action, 'release');
  const t1 = { ...c, touches: [{ type: 'call', at: '2026-11-14' }] };
  assert.equal(CL.claimStatus(t1, '2026-11-20').state, 'ok');
  assert.equal(CL.claimStatus(t1, '2026-11-30').action, 'remind');
  assert.equal(CL.claimStatus(t1, '2026-12-05').action, 'alert_manager');
  assert.equal(CL.claimStatus({ ...c, touches: [{ type: 'mass_email', at: '2026-11-14' }] }, '2026-11-18').action, 'release'); // mass email isn't a real touch
  const busy = { ...c, touches: [{ type: 'call', at: '2026-12-20' }] };
  assert.equal(CL.claimStatus(busy, '2026-12-29').action, 'release'); // no meeting/quote in 45 days
  assert.equal(CL.claimStatus({ ...busy, extendedDays: 30 }, '2026-12-29').state, 'ok');
});

// --- Modifier charges + double-sided ---
const MP = await import('../app/modprices.mjs');

test('modifier choices become priced CoreBridge lines; blanks are flagged, not guessed', () => {
  const list = [
    { group: 'PRODUCTION (RIGID)', field: 'Add Holes', choice: 'Four Corners', how: 'sign', cost: 1, price: 3 },
    { group: 'PRODUCTION (RIGID)', field: "Add'l Labor (Min)", choice: '*', how: 'min', cost: 0.5, price: 1.5 },
    { group: 'GRAPHIC DESIGN', field: 'Match Font', choice: 'Yes', how: 'order', cost: null, price: null },
  ];
  const r = MP.modifierCharges([
    { group: 'PRODUCTION (RIGID)', field: 'Add Holes', value: 'Four Corners' },
    { group: 'PRODUCTION (RIGID)', field: "Add'l Labor (Min)", value: '15' },
    { group: 'GRAPHIC DESIGN', field: 'Match Font', value: true },
    { group: 'GRAPHIC DESIGN', field: 'Find ClipArt', value: true },
    { group: 'GRAPHIC DESIGN', field: 'Match PMS', value: false },
  ], { list });
  assert.deepEqual(r.charges.map((c) => c.total), [3, 22.5]);
  assert.deepEqual(r.unpriced, ['GRAPHIC DESIGN: Match Font']);
  assert.deepEqual(r.unknown, ['GRAPHIC DESIGN: Find ClipArt']);
  assert.deepEqual(MP.chargePart(r.charges[0]), { PartId: 298, Quantity: 1, VendorCost: 1, VendorMarkup: 200, Notes: 'PRODUCTION (RIGID): Add Holes – Four Corners' });
  assert.equal(MP.chargePart({ label: 'x', qty: 2, cost: 0, price: 5 }).VendorMarkup, 0);
});

test('double-sided only where CoreBridge allows it; charges ride on the same product', () => {
  const FIX = { parts: [
    { Id: 48, Name: 'Acrylic', CostPerType: 'SquareFeet', UsesQuantity: true, UsesWidth: true, UsesHeight: true, CanPrintOnBothSides: true, Modifiers: [] },
    { Id: 55, Name: 'Aluminum', CostPerType: 'SquareFeet', UsesQuantity: true, UsesWidth: true, UsesHeight: true, CanPrintOnBothSides: false, Modifiers: [] },
  ], modifiers: [] };
  BLD.resetCatalog(); const cat = BLD.catalog(() => FIX);
  const lines = BLD.readLines({ lines: '2', p0: '48', q0: '1', w0: '12', h0: '12', s0: 'DS', p1: '55', q1: '1', w1: '12', h1: '12', s1: 'DS' }, cat);
  assert.deepEqual(BLD.checkLine(lines[0]), []);
  assert.match(BLD.checkLine(lines[1])[0], /both sides/);
  lines[0].charges = [{ label: 'PRODUCTION (RIGID): Add Holes – Four Corners', qty: 1, cost: 1, price: 3 }];
  const req = BLD.buildConfiguredRequest({ lines: [lines[0]] });
  assert.equal(req.Products[0].Parts[0].PrintOnBothSides, true);
  assert.equal(req.Products[0].Parts[1].PartId, 298);
  BLD.resetCatalog();
});

// --- Modifier fields from order history, price list, prospects page ---
const MU = await import('../app/modui.mjs');
const ADM = await import('../app/admin.mjs');

test('modifier fields come from history; priced groups are not also sent as CoreBridge modifiers', () => {
  MU.resetModFields();
  const mf = MU.modFields(() => ({ pulled: '2026-11-11', groups: { 'PRODUCTION (RIGID)': [
    { field: 'Add Holes', type: 'select', choices: ['Four Corners', '2 Holes'] }, { field: 'Add Routing', type: 'check' },
    { field: "Add'l Labor (Min)", type: 'min' }, { field: 'Hole Placement', type: 'text' }, { field: 'Rounded', type: 'select', choices: ['3/4\\" Round'] }] } }));
  assert.equal(mf.groups['PRODUCTION (RIGID)'][4].choices[0], '3/4" Round');
  const FIX = { parts: [{ Id: 48, Name: 'Acrylic', CostPerType: 'SquareFeet', UsesQuantity: true, UsesWidth: true, UsesHeight: true, CanPrintOnBothSides: true, Modifiers: [{ Id: 235, Name: 'PRODUCTION (RIGID)' }, { Id: 158, Name: 'Tape Options' }] }], modifiers: [{ Id: 158, Name: 'Tape Options', VariableRateOptions: [{ Ordinal: 2, Label: 'VHB (Clear)' }] }] };
  BLD.resetCatalog(); const cat = BLD.catalog(() => FIX);
  const form = { lines: '1', p0: '48', q0: '1', w0: '12', h0: '12', m0_235: '1', m0_158: '1', v0_158: '2', x0_235_0: 'Four Corners', x0_235_1: '1', x0_235_2: '15', x0_235_3: 'top' };
  const [l] = BLD.readLines(form, cat);
  assert.deepEqual(l.mods.map((m) => m.id), [158]); // 235 is priced by SalesMax, not sent as a modifier
  assert.deepEqual(l.sel.map((x) => [x.field, x.value]), [['Add Holes', 'Four Corners'], ['Add Routing', true], ["Add'l Labor (Min)", '15'], ['Hole Placement', 'top']]);
  const r = MP.modifierCharges(l.sel, { list: [{ group: 'PRODUCTION (RIGID)', field: 'Add Holes', choice: 'Four Corners', how: 'sign', cost: null, price: 5.25 }] });
  assert.deepEqual(r.charges.map((c) => c.total), [5.25]);
  assert.ok(r.unknown.includes("PRODUCTION (RIGID): Add'l Labor (Min) – 15"));
  const html = MU.modifiersHtml(l);
  assert.match(html, /name="x0_235_0"/); assert.match(html, /<details[^>]* open>/);
  assert.deepEqual(MU.priceRows('PRODUCTION (RIGID)').map((x) => x.choice), ['Four Corners', '2 Holes', 'Yes', '*', '3/4" Round']);
  BLD.resetCatalog(); MU.resetModFields();
});

test('price list form merges one group and drops blanks', () => {
  const list = [{ group: 'GRAPHIC DESIGN', field: 'Match Font', choice: 'Yes', how: 'order', cost: null, price: 15 }, { group: 'PRODUCTION (RIGID)', field: 'Add Holes', choice: '2 Holes', how: 'sign', cost: 1, price: 5 }];
  const out = ADM.mergePriceForm(list, 'PRODUCTION (RIGID)', { rows: '2', f0: 'Add Holes', o0: 'Four Corners', h0: 'sign', c0: '', p0: '5.25', f1: 'Add Holes', o1: '2 Holes', h1: 'sign', c1: '', p1: '' });
  assert.deepEqual(out.map((e) => [e.group, e.choice, e.price]), [['GRAPHIC DESIGN', 'Yes', 15], ['PRODUCTION (RIGID)', 'Four Corners', 5.25]]);
});

test('prospect claims page actions follow the rules', () => {
  const t = '2026-11-11';
  let r = ADM.applyClaimAction(ADM.DEMO_CLAIMS, { action: 'claim', business: 'nky-ford', person: 'phil', today: t });
  assert.match(r.flash, /kristin/);
  r = ADM.applyClaimAction(ADM.DEMO_CLAIMS, { action: 'claim', business: 'florence-ortho', person: 'phil', today: t });
  assert.equal(r.claims.length, 3);
  r = ADM.applyClaimAction(r.claims, { action: 'touch', business: 'florence-ortho', person: 'phil', today: t });
  assert.equal(r.claims[2].touches.length, 1);
  r = ADM.applyClaimAction(r.claims, { action: 'release', business: 'florence-ortho', person: 'phil', today: t });
  assert.equal(r.claims[2].releasedAt, t);
  assert.equal(ADM.personOf({ email: 'phil.warden@fastsigns.com' }), 'phil');
});
