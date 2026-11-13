import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeExtra, extraDefaults } from '../app/adminx.mjs';
import { workflowExtras, parseChecklistRows } from '../app/adminwf.mjs';
import { settingsPage } from '../app/settings.mjs';

const user = { email: 'a@b.c', name: 'Phil', isAdmin: true, prefs: {} };

test('workflow tab shows every mockup section', () => {
  const h = settingsPage({ user, settings: {}, tab: 'work' });
  for (const s of ['Workflows and Boards', 'Project Stage Rules', 'Stage Time Targets', 'Reply Time Targets', 'Stage Checklists', 'Permit Document Checklists', 'Tags', 'Hold reasons', 'Into Estimate', 'Sign permit', 'City of Florence']) assert.ok(h.includes(s), s);
  assert.ok(h.includes('href="/admin/workflow"'));
});
test('sales tab has customer lists and import cards, settings tucked in Advanced', () => {
  const h = settingsPage({ user, settings: {}, tab: 'sales', lists: { source: ['A', 'B'] } });
  assert.ok(h.includes('Customer lists') && h.includes('2 values') && h.includes('Import customers') && h.includes('/admin/lists#import'));
  assert.ok(h.indexOf('Advanced') < h.indexOf('Sales Settings'));
});
test('stage rules save checks and override', () => {
  const { x } = mergeExtra(null, { do: 'stagerules', c_0_0: 'on', w_0: 'No one', w_1: 'Hacker' });
  assert.equal(x.stageRules[0].checks[0][1], 1);
  assert.equal(x.stageRules[0].checks[1][1], 0);
  assert.equal(x.stageRules[0].who, 'No one');
  assert.equal(x.stageRules[1].who, 'Owner/Admin');
});
test('tags add, retire, and Design Revision stays', () => {
  let { x } = mergeExtra(null, { do: 'tagadd', g: '1', name: 'Warranty' });
  assert.ok(x.tags[1].tags.includes('Warranty'));
  assert.throws(() => mergeExtra(x, { do: 'tagadd', g: '1', name: 'warranty' }));
  ({ x } = mergeExtra(x, { do: 'tagdel', g: '1', k: '0' }));
  assert.ok(!x.tags[1].tags.includes('Rush') && x.retired.includes('Rush'));
  const k = x.tags[1].tags.findIndex((t) => /automatic/.test(t));
  assert.throws(() => mergeExtra(x, { do: 'tagdel', g: '1', k: String(k) }));
});
test('permit docs edit, add, remove and city extras', () => {
  let { x } = mergeExtra(null, { do: 'permits', n_0_0: 'Signed app', n_0_new: 'Survey', s_0_new: 'Vendor', city_new: 'Covington', citydocs_new: 'Two copies' });
  assert.equal(x.permits[0].docs[0][0], 'Signed app');
  assert.deepEqual(x.permits[0].docs.at(-1), ['Survey', 'Vendor']);
  assert.equal(x.cities.at(-1).city, 'Covington');
  ({ x } = mergeExtra(x, { do: 'permits', del: '0:0' }));
  assert.equal(x.permits[0].docs[0][0], 'Site plan with setbacks');
  ({ x } = mergeExtra(x, { do: 'permadd', type: 'Banner permit' }));
  assert.equal(x.permits.at(-1).type, 'Banner permit');
});
test('checklist rows save, add and remove', () => {
  const f = { rows: '1', 't_sales-prospect_0': 'Contact entered', 'r_sales-prospect_0': 'on', 't_sales-prospect_1': 'Need-by', 't_sales-prospect_2': 'Survey', 't_sales-prospect_new': 'Budget known', 'r_sales-prospect_new': 'on' };
  const out = parseChecklistRows(f, null);
  assert.deepEqual(out['sales-prospect'], [['Contact entered', 1], ['Need-by', 0], ['Survey', 0], ['Budget known', 1]]);
  const out2 = parseChecklistRows({ ...f, 't_sales-prospect_new': '', del: 'sales-prospect:1' }, null);
  assert.deepEqual(out2['sales-prospect'].map((r) => r[0]), ['Contact entered', 'Survey']);
});
test('checklist board tabs switch boards and escape', () => {
  const w = workflowExtras(extraDefaults(), { clBoard: 'permits' });
  assert.ok(w.cl.includes('Application # recorded') && !w.cl.includes('Contact name, email'));
  const w2 = workflowExtras({ tags: [{ name: '<b>', hint: '', boards: '', task: '', tags: ['<i>'] }] });
  assert.ok(!w2.tags.includes('<i>') && w2.tags.includes('&lt;i&gt;'));
});
test('admin sections fold into closed bars with Expand All', () => {
  for (const tab of ['company', 'sales', 'work', 'pricing', 'orders', 'cb']) {
    const h = settingsPage({ user, settings: {}, tab });
    assert.ok(h.includes('data-acol="open"') && h.includes('<details class="acol"><summary>'), tab);
    assert.ok(!/<details class="acol" open/.test(h), tab + ' starts closed');
  }
  const h = settingsPage({ user, settings: {}, tab: 'work' });
  assert.ok(h.includes('<b>Project Stage Rules</b>') && h.includes('<b>Tags</b>'));
});
import { mergeExtra as mx2 } from '../app/adminx.mjs';
import { decideProof } from '../app/proofs.mjs';
test('pricing, order page and connections tabs show the mockup sections', () => {
  const p = settingsPage({ user, settings: {}, tab: 'pricing' });
  for (const t of ['Machines', 'Roll to Roll', 'Modifier Price List', 'Price List and Pricing Engine']) assert.ok(p.includes(t), t);
  const o = settingsPage({ user, settings: {}, tab: 'orders', apps: { cardpointe: false } });
  for (const t of ['Customer Order Page and Payments', 'Payment Processor', 'Needs keys', 'Notes Customers See', 'Approval Checklist', 'Branding', 'Customer PO check', 'Customer emails', 'Estimate and invoice documents', 'Credit rules', 'Ordering lists and defaults', '/admin/preview-order-page']) assert.ok(o.includes(t), t);
  const c = settingsPage({ user, settings: {}, tab: 'cb', apps: { clarity: true } });
  for (const t of ['Connected Apps', 'Job folders (Google Drive)', 'Transition Period', 'How SalesMax and CoreBridge Work Together', 'Changes to CoreBridge', 'Writes to CoreBridge are off']) assert.ok(c.includes(t), t);
  assert.ok(/Clarity Voice[\s\S]{0,300}Keys saved/.test(c));
});
test('order page approval checklist edits and is enforced', () => {
  let { x } = mx2(null, { do: 'approval', ac_0: 'Qty', ac_new: 'Bleed', del: '1', all: 'on', policy: 'P' });
  assert.equal(x.approvalChecks[0], 'Qty'); assert.ok(!x.approvalChecks.includes('Sizes')); assert.equal(x.approvalChecks.at(-1), 'Bleed');
  const it = { step: 'proofwait' };
  assert.throws(() => decideProof(it, 'approve', { checks: ['Qty'], list: ['Qty', 'Bleed'], mustAll: true }));
  assert.equal(decideProof(it, 'approve', { checks: ['Qty'], list: ['Qty', 'Bleed'], mustAll: false }).to, 'files');
});
test('credit, PO check, machines, folders, transition and CoreBridge rules save', () => {
  let { x } = mx2(null, { do: 'credit', grace: '15', inDefault: 'Block', wouldExceed: 'Nope', over: 'Warn', noTerms: 'COD' });
  assert.deepEqual(x.credit, { grace: 15, inDefault: 'Block', wouldExceed: 'Warn', over: 'Warn', noTerms: 'COD' });
  assert.throws(() => mx2(x, { do: 'credit', grace: '-1' }));
  ({ x } = mx2(x, { do: 'pocheck', po_amount: 'on' })); assert.equal(x.poCheck.amount, true); assert.equal(x.poCheck.supplier, false);
  ({ x } = mx2(x, { do: 'machine', name: 'Engraver', rate: '40' })); assert.equal(x.machines.at(-1).rate, 40);
  assert.throws(() => mx2(x, { do: 'machine', name: 'engraver', rate: '40' }));
  ({ x } = mx2(x, { do: 'jobfolders', jf_root: 'Drive › Jobs' })); assert.equal(x.jobFolders.root, 'Drive › Jobs');
  ({ x } = mx2(x, { do: 'transadd', name: 'Kristin' })); assert.equal(x.transition[0].name, 'Kristin');
  ({ x } = mx2(x, { do: 'transdel', i: '0' })); assert.equal(x.transition.length, 0);
  ({ x } = mx2(x, { do: 'cbchanges', cb_confirm: 'on' })); assert.deepEqual(x.cbChanges, { confirm: true, dueDates: false, dragComplete: false });
});
import { boardPage as wb } from '../app/boards.mjs';
import { visibleColumns } from '../app/workflow.mjs';
test('boards use the saved hold reasons', () => {
  const it = { id: 'i1', name: 'Sign', step: 'wip', projectId: 'p1', person: 'Phil', ref: 'R1' };
  const h = wb({ user, board: 'production', items: [it], view: 'list', columns: visibleColumns('production', []), log: [], flash: '', holdReasons: ['Waiting on landlord'] });
  assert.ok(h.includes('hold|Waiting on landlord') && !h.includes('hold|Need info: vendor'));
  const h2 = wb({ user, board: 'production', items: [it], view: 'list', columns: visibleColumns('production', []), log: [], flash: '' });
  assert.ok(h2.includes('hold|Need info: vendor'));
});
import { projectPage } from '../app/views.mjs';
test('prospect project: hero actions, fewer tabs, scope card', () => {
  const p = { id: 'demo-2', lane: 'prospect', name: 'W', company: 'Tri-State Logistics', contact: 'M', total: 100, due: '2027-02-04' };
  const h = projectPage({ user, mode: 'demo', p, standing: '', tab: 'scope', extras: { scope: { text: '<b>x</b>', items: 3, meas: 2, visits: 2, needs: 1 } } });
  for (const t of ['Start Site Visit', 'Move to Estimate', 'Mark Lost', 'Project Scope', 'More tabs appear as the job grows', 'action="/projects/demo-2/scope"']) assert.ok(h.includes(t), t);
  assert.ok(!h.includes('&tab=products') && !h.includes('<b>x</b>'));
  const h2 = projectPage({ user, mode: 'demo', p: { ...p, lane: 'progress' }, standing: '', tab: '' });
  assert.ok(h2.includes('&tab=products') && !h2.includes('Start Site Visit'));
});
import { newProject, newProjectPage } from '../app/create.mjs';
test('add prospect: needs chips name the project, source and notes kept', () => {
  const [p] = newProject([], { company: 'Acme', needs: ['Banners', 'Bogus', 'Trade show'], origination: 'expanded', notes: 'Big warehouse' });
  assert.equal(p.name, 'Banners, Trade show'); assert.equal(p.origination, 'expanded'); assert.equal(p.notes, 'Big warehouse');
  const h = newProjectPage({ user, f: { needs: ['Banners'], temperature: 'Hot' } });
  assert.ok(/value="Banners" checked/.test(h) && /value="Hot" checked/.test(h) && h.includes('name="origination"'));
});
import { assignLead } from '../app/adminx.mjs';
test('auto-assign: round robin by fewest this month, counts tally, -- before any data', () => {
  const x = { autoAssign: true, rotation: [{ name: 'Ann', on: true }, { name: 'Bob', on: true }, { name: 'Cy', on: false }] };
  let r = assignLead(x, null, '2026-11-13'); assert.equal(r.name, 'Ann');
  r = assignLead(x, r.log, '2026-11-13'); assert.equal(r.name, 'Bob');
  r = assignLead(x, r.log, '2026-11-14'); assert.equal(r.name, 'Ann'); assert.deepEqual(r.log.counts, { Ann: 2, Bob: 1 });
  assert.equal(assignLead({ ...x, autoAssign: false }, null, '2026-11-13'), null);
  const r2 = assignLead(x, r.log, '2026-12-01'); assert.deepEqual(r2.log.counts, { Bob: 1 });
  const h0 = settingsPage({ user, settings: {}, tab: 'sales', extra: x });
  assert.ok(h0.includes('-- this month'));
  const h1 = settingsPage({ user, settings: {}, tab: 'sales', extra: x, leadLog: { month: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).slice(0, 7), counts: { Ann: 3 } } });
  assert.ok(h1.includes('3 this month') && h1.includes('0 this month'));
});
test('add prospect from an email: banner and duplicate warning', () => {
  const h = newProjectPage({ user, f: { company: 'Acme', contact: 'Jo', email: 'jo@acme.com' }, from: { from: 'Jo', subject: 'Need a banner' }, dupes: [{ id: 'p9', name: 'Lobby sign' }] });
  assert.ok(h.includes('Started from an email') && h.includes('Need a banner') && h.includes('Already open for this customer') && h.includes('/projects/p9'));
  assert.ok(h.includes('value="jo@acme.com"'));
});
import { stuckItems, stepTargetsFrom } from '../app/workflow.mjs';
test('stuck uses the published workflow target days', () => {
  const it = { id: 'a', step: 'wip', movedAt: '2026-11-10T12:00:00Z' };
  const now = new Date('2026-11-13T12:00:00Z');
  assert.equal(stuckItems([it], now).length, 0);
  assert.equal(stuckItems([it], now, stepTargetsFrom([{ id: 'wip', days: 2 }])).length, 1);
});
import { missingNextStep } from '../app/activities.mjs';
test('missing next step ignores projects moving on a board', () => {
  const ps = [{ id: 'a', lane: 'progress' }, { id: 'b', lane: 'progress', onBoard: true }];
  assert.deepEqual(missingNextStep(ps, []).map((x) => x.projectId), ['a']);
});
import { portalPage } from '../app/proofs.mjs';
test('order page: shop name/phone from settings, signer and version on approval', () => {
  const h = portalPage({ project: { id: 'p', company: 'Acme', name: 'Sign', contact: 'Jo Lee' }, items: [{ id: 'i1', name: 'Sign', step: 'proofwait' }], token: 't', shop: { name: 'FASTSIGNS of Somewhere', phone: '(555) 111-2222' } });
  assert.ok(h.includes('FASTSIGNS of Somewhere') && h.includes('(555) 111-2222') && !h.includes('555-0100'));
  assert.ok(h.includes('name="signer"') && h.includes('value="Jo Lee"') && h.includes('name="version"'));
});
import { syncPurchasing } from '../app/simpleboards.mjs';
test('purchasing: vended items get a linked card once, with owner and follow-up', () => {
  const items = [{ id: 'i2', projectId: 'p1', name: 'Desk logo', step: 'vended' }, { id: 'i3', projectId: 'p1', name: 'Wall', step: 'wip' }];
  let r = syncPurchasing([], items, [{ id: 'p1', company: 'Acme' }], '2026-11-13');
  assert.equal(r.added, 1); assert.deepEqual([r.records[0].item, r.records[0].owner, r.records[0].follow, r.records[0].company], ['i2', 'Purchasing', '2026-11-14', 'Acme']);
  assert.equal(syncPurchasing(r.records, items, [], '2026-11-13').added, 0);
  assert.equal(syncPurchasing([{ project: 'p1', name: 'desk logo' }], items, [], '2026-11-13').added, 0);
});
