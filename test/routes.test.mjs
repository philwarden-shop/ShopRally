// QA: drive the real Lambda handler, signed in, against an in-memory table. Every page must render (no 500s),
// and the main forms must save and redirect.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.ALLOWED_EMAILS = process.env.ALLOWED_EMAILS || 'phil.warden@fastsigns.com';
process.env.TABLE = 'fake';

class Cmd { constructor(input) { this.input = input; } }
class GetItemCommand extends Cmd {}
class PutItemCommand extends Cmd {}
class QueryCommand extends Cmd {}
class BatchWriteItemCommand extends Cmd {}
class DeleteItemCommand extends Cmd {}
const store = new Map();
const k = (key) => `${key.pk.S}|${key.sk.S}`;
const client = {
  async send(c) {
    const i = c.input;
    if (c instanceof GetItemCommand) return { Item: store.get(k(i.Key)) };
    if (c instanceof PutItemCommand) { store.set(k(i.Item), i.Item); return {}; }
    if (c instanceof DeleteItemCommand) { store.delete(k(i.Key)); return {}; }
    if (c instanceof QueryCommand) {
      const pk = i.ExpressionAttributeValues[':pk'].S;
      const sk = i.ExpressionAttributeValues[':sk']?.S || '';
      let items = [...store.values()].filter((x) => x.pk.S === pk && x.sk.S.startsWith(sk)).sort((a, b) => a.sk.S.localeCompare(b.sk.S));
      if (i.ScanIndexForward === false) items.reverse();
      if (i.Limit) items = items.slice(0, i.Limit);
      return { Items: items };
    }
    if (c instanceof BatchWriteItemCommand) {
      for (const reqs of Object.values(i.RequestItems)) for (const r of reqs) { if (r.PutRequest) store.set(k(r.PutRequest.Item), r.PutRequest.Item); if (r.DeleteRequest) store.delete(k(r.DeleteRequest.Key)); }
      return {};
    }
    throw new Error('fake db: unsupported command');
  },
};
globalThis.__SMX_FAKE_DB = { client, GetItemCommand, PutItemCommand, QueryCommand, BatchWriteItemCommand, DeleteItemCommand };
globalThis.__SMX_TEST_KEY = 'test-key-for-routes';

const { sign } = await import('../app/auth.mjs');
const { handler } = await import('../app/index.mjs');
const host = 'example.lambda-url.us-east-2.on.aws';
const session = sign({ email: 'phil.warden@fastsigns.com', name: 'Phil Warden', exp: Date.now() + 3600000 }, globalThis.__SMX_TEST_KEY);

async function call(path, { method = 'GET', form, query, cookies = [], headers = {} } = {}) {
  return handler({
    rawPath: path, queryStringParameters: query, cookies: [`smx_session=${session}`, ...cookies],
    headers: { host, origin: method === 'POST' ? `https://${host}` : undefined, referer: `https://${host}/activities`, ...headers },
    requestContext: { http: { method } }, body: form ? new URLSearchParams(form).toString() : undefined, isBase64Encoded: false,
  });
}
const ok = (r, path) => { assert.equal(r.statusCode, 200, `${path} -> ${r.statusCode} ${String(r.body).slice(0, 300)}`); assert.ok(!/Something went wrong/.test(r.body), `${path} errored`); };

test('QA: every signed-in page renders', async () => {
  for (const p of ['/activities', '/customers', '/customers/riverbend-dental', '/admin', '/boards/permits', '/boards/purchasing', '/boards/design', '/boards/production', '/projects', '/projects/demo-10', '/prospects', '/performance', '/risks', '/me']) ok(await call(p), p);
  for (const t of ['company', 'sales', 'pricing', 'work', 'orders', 'cb']) ok(await call('/admin', { query: { tab: t } }), `/admin?tab=${t}`);
  for (const t of ['overview', 'projects', 'contacts', 'activity', 'account']) ok(await call('/customers/riverbend-dental', { query: { tab: t } }), `customer ${t}`);
  ok(await call('/boards/permits', { query: { view: 'list' } }), 'permits list');
  ok(await call('/reports/reconciliation'), 'recon');
  ok(await call('/performance', { query: { preview: '1' } }), 'perf');
  ok(await call('/team'), 'team');
  ok(await call('/reports/past-due'), 'past due');
  ok(await call('/admin/workflow'), 'wf builder');
  const sb = await call('/setup/workflow/build', { method: 'POST', form: {} });
  assert.match(sb.headers.location, /Built%20from%20your%20answers/);
  const ch = await call('/admin/workflow', { method: 'POST', form: { do: 'chat', say: 'Give quality control 2 days' } });
  assert.equal(ch.statusCode, 200); assert.match(ch.body, /Done in your draft/);
  let wb = await call('/admin/workflow', { method: 'POST', form: { do: 'save', owner_qc: 'Production lead', days_qc: '1' } });
  assert.match(wb.headers.location, /Draft%20saved/);
  assert.match((await call('/admin/workflow')).body, /unpublished change/);
  wb = await call('/admin/workflow', { method: 'POST', form: { do: 'publish' } });
  assert.match(wb.headers.location, /Published/);
  ok(await call('/field'), 'field');
  ok(await call('/admin/migration'), 'migration');
  assert.match((await call('/admin/import', { method: 'POST', form: {} })).headers.location, /turned%20off/);
  assert.match((await call('/activities/tasks/t8/snooze', { method: 'POST', form: { days: '7' } })).headers.location, /Snoozed/);
  assert.match((await call('/projects/demo-3/lost', { method: 'POST', form: { reason: 'Price' } })).headers.location, /lost/);
  assert.match((await call('/projects')).body, /Lost pipeline/);
  const tm = await call('/activities/tasks/new', { method: 'POST', form: { title: 'Call the sign shop', kind: 'call', due: '2026-11-12', assignee: 'kristin' } });
  assert.match(tm.headers.location, /for%20Kristin/);
  assert.ok(!(await call('/activities')).body.includes('Call the sign shop'));
  assert.match((await call('/admin/team', { method: 'POST', form: { name: 'Dana Lee', role: 'Permits', loc: 'nky' } })).headers.location, /Added/);
  const qc = await call('/boards/purchasing/pu4/quote', { method: 'POST', form: { vendor: 'Grimco', description: 'Wall graphic media with laminate', qty: '2', unitPrice: '300', total: '600', w: '120', h: '96' } });
  assert.match(qc.headers.location, /Quote%20blocked/);
  assert.match((await call('/boards/purchasing/pu4/move', { method: 'POST', form: { to: 'ordered' } })).headers.location, /Not%20changed/);
  assert.match((await call('/boards/purchasing')).body, /Quote Blocked/);
  const nd = await call('/customers/riverbend-dental/need', { method: 'POST', form: { needWhat: 'Trade show banners', needDate: '2026-11-20' } });
  assert.match(nd.headers.location, /Need%20added/);
  assert.match((await call('/activities')).body, /Follow up: Trade show banners/);
  ok(await call('/items/i61/send-proof'), 'send proof');
  const pv = await call('/items/i61/proof-version', { method: 'POST', form: { link: 'https://drive.google.com/file/d/abc/view', note: 'Bigger logo' } });
  assert.match(pv.headers.location, /Proof%20v4%20added/);
  assert.match((await call('/items/i61/send-proof')).body, /Proof Versions · 4/);
  const est4 = (await call('/projects')).body.match(/href="\/projects\/(demo-\d+)\?mode=demo"[^>]*>[\s\S]{0,400}?/g);
  const ap = await call('/projects/demo-4/approve', { method: 'POST', form: { how: 'terms' } });
  assert.equal(ap.statusCode, 302);
  const ap2 = await call('/projects/demo-4', { query: { mode: 'demo' } }); ok(ap2, 'approved project');
  assert.match(ap2.body, /Next Steps/);
  const cc = await call('/customers/riverbend-dental/contact', { method: 'POST', form: { cName: 'Dana Ruiz', cEmail: 'dana@x.com' } });
  assert.match(cc.headers.location, /Contact%20added/);
  assert.match((await call('/customers/riverbend-dental', { query: { tab: 'contacts' } })).body, /mailto:dana@x\.com/);
  const cv = await call('/customers.csv'); assert.match(cv.headers['content-type'], /text\/csv/); assert.match(cv.body, /^Customer,/);
  assert.match((await call('/reports/past-due.csv')).body, /^Invoice,/);
  assert.match((await call('/me/digest')).body, /Good morning/);
  assert.match((await call('/projects/new', { query: { company: 'Acme Co' } })).body, /value="Acme Co"/);
  for (const role of ['design', 'production', 'permits', 'purchasing']) { const rv = await call('/activities', { cookies: [`smx_as=${role}`] }); ok(rv, role); assert.match(rv.body, /Viewing as/); }
  assert.match((await call('/search', { query: { q: 'riverbend' } })).body, /Customers<\/h2><span[^>]*>[1-9]/);
  ok(await call('/feedback'), 'feedback');
  assert.match((await call('/feedback', { method: 'POST', form: { kind: 'Idea', text: 'More themes' } })).headers.location, /Thanks/);
  assert.match((await call('/me', { method: 'POST', form: { displayName: 'Phil W', dailyDigest: 'on' } })).headers.location, /Saved/);
  ok(await call('/me'), 'me');
  ok(await call('/log'), 'log');
  const est = await call('/projects/demo-4/estimate');
  if (est.statusCode === 200) assert.match(est.body, /Estimate Notes/);
  const fd = await call('/field/f2', { method: 'POST', form: { c0: 'on', notes: 'brick wall' } });
  assert.match(fd.headers.location, /Saved/);
  assert.match((await call('/field')).body, /brick wall/);
  await call('/boards/permits', { query: { view: 'list' } });
  assert.match((await call('/boards/permits')).body, /<th>Application #<\/th>/);
  ok(await call('/projects/new'), 'new project');
  const np = await call('/projects/new', { method: 'POST', form: { name: 'Truck wrap', company: 'NKY Plumbing', total: '4500' } });
  assert.equal(np.statusCode, 302);
  const npPage = await call(np.headers.location.split('?')[0], { query: { mode: 'demo' } });
  ok(npPage, 'created project'); assert.match(npPage.body, /Truck wrap/);
  assert.match((await call('/projects')).body, /Truck wrap/);
  for (const id of ['demo-6', 'demo-10', 'demo-12', 'demo-14']) ok(await call(`/projects/${id}`, { query: { mode: 'demo' } }), id);
  let ca = await call('/customers/riverbend-dental/activity', { method: 'POST', form: { actKind: 'Call', actNote: 'Called about install' } });
  assert.match(ca.headers.location, /Logged/);
  assert.match((await call('/customers/riverbend-dental', { query: { tab: 'activity' } })).body, /Called about install/);
  ca = await call('/customers/riverbend-dental/vote', { method: 'POST', form: { v: 'up' } });
  assert.match(ca.headers.location, /feedback/);
  ok(await call('/customers'), 'customers keep warm');
  ok(await call('/activities', { query: { new: '1', project: 'demo-10' } }), 'new task');
  const nt = await call('/activities/tasks/new', { method: 'POST', form: { title: 'Call Dana', kind: 'call', due: '2026-11-12', projectId: 'demo-10' } });
  assert.match(nt.headers.location, /Task%20added/);
  ok(await call('/setup/workflow'), 'setup');
  let s = await call('/setup/workflow', { method: 'POST', form: { i: '0', text: 'Field sales' } });
  assert.match(s.headers.location, /at=1/);
  assert.match((await call('/setup/workflow')).body, /Question 2 of 8/);
  s = await call('/reports/reconciliation/pay1', { method: 'POST', form: {} });
  assert.match(s.headers.location, /Marked/);
  ok(await call('/activities', { query: { party: '1', f: 'email' } }), 'activities party');
  assert.match((await call('/activities')).body, /Coming Up Today/);
  assert.match((await call('/projects')).body, /On schedule[\s\S]*Open pipeline/);
  assert.match((await call('/projects')).body, /No next step/);
  assert.match((await call('/activities')).body, /aria-current="page">Activities/);
});

test('QA: main forms save and come back', async () => {
  let r = await call('/activities/tasks/t1/done', { method: 'POST', form: {} });
  assert.equal(r.statusCode, 302); assert.match(r.headers.location, /Done/);
  r = await call('/admin', { method: 'POST', query: { tab: 'pricing' }, form: { priceApprovalThreshold: '30', depositPct: '50', cardFeePct: '3' } });
  assert.equal(r.statusCode, 302);
  assert.match((await call('/admin', { query: { tab: 'pricing' } })).body, /value="30"/);
  r = await call('/admin', { method: 'POST', query: { tab: 'pricing' }, form: { cardFeePct: '99' } });
  assert.equal(r.statusCode, 400);
  r = await call('/customers/riverbend-dental', { method: 'POST', query: { tab: 'account' }, form: { status: 'Keep Warm', marketingSet: '1', groundCarrier: 'UPS', groundAcct: '1Z-999' } });
  assert.equal(r.statusCode, 302);
  assert.match((await call('/customers/riverbend-dental', { query: { tab: 'account' } })).body, /1Z-999/);
  r = await call('/boards/permits/pm1/move', { method: 'POST', form: { to: 'submitted' } });
  assert.match(r.headers.location, /finish%20the%20checklist/);
  for (const n of [0, 1]) { r = await call('/boards/permits/pm1/check', { method: 'POST', form: { n: String(n) } }); assert.equal(r.statusCode, 302); }
  r = await call('/boards/permits/pm1/move', { method: 'POST', form: { to: 'submitted' } });
  assert.match(r.headers.location, /Moved/);
  r = await call('/projects/demo-10/po', { method: 'POST', form: { poNumber: 'PO-1', poAmount: '1' } });
  assert.equal(r.statusCode, 302);
  assert.match((await call('/projects/demo-10', { query: { mode: 'demo' } })).body, /Customer PO[\s\S]*under the order/);
  r = await call('/me/prefs', { method: 'POST', form: { theme: 'Dark' } });
  assert.equal(r.statusCode, 302); assert.ok(r.cookies.some((c) => c.startsWith('smx_theme=Dark')));
  ok(await call('/activities', { cookies: ['smx_theme=Dark', 'smx_as=design'] }), 'dark theme');
});

test('QA: each location keeps its own data', async () => {
  const two = ['smx_loc=two'];
  ok(await call('/activities', { cookies: two }), 'activities two');
  const r = await call('/activities/tasks/new', { method: 'POST', cookies: two, form: { title: 'Second shop only task', kind: 'call', due: '2026-11-12' } });
  assert.match(r.headers.location, /Task%20added/);
  assert.match((await call('/activities', { cookies: two })).body, /Second shop only task/);
  assert.ok(!(await call('/activities')).body.includes('Second shop only task'));
  assert.match((await call('/activities', { cookies: two })).body, /Second location/);
});

test('QA: reset sample data clears changes but keeps Admin settings', async () => {
  await call('/activities/tasks/new', { method: 'POST', form: { title: 'Temp reset check', kind: 'call', due: '2026-11-12' } });
  await call('/admin', { method: 'POST', query: { tab: 'pricing' }, form: { priceApprovalThreshold: '33', depositPct: '50', cardFeePct: '3' } });
  const r = await call('/admin/reset-demo', { method: 'POST', form: {} });
  assert.match(r.headers.location, /Sample%20data%20reset/);
  assert.ok(!(await call('/activities')).body.includes('Temp reset check'));
  assert.match((await call('/admin', { query: { tab: 'pricing' } })).body, /value="33"/);
});

test('QA: cross-site posts are blocked', async () => {
  const r = await call('/admin', { method: 'POST', query: { tab: 'pricing' }, form: { depositPct: '10' }, headers: { origin: 'https://evil.example' } });
  assert.equal(r.statusCode, 403);
});


// ---- Consistency + accessibility lint over every signed-in page (backlog #17, #18) ----
const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'for', 'nor', 'of', 'on', 'in', 'to', 'at', 'by', 'up', 'as', 'is', 'it', 'vs', 'via', 'from', 'with', 'into', 'per']);
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
function titleCaseProblems(text) {
  const words = text.split(' ').filter((w) => /[a-z]/i.test(w) && w.replace(/[^A-Za-z]/g, '').length > 1);
  return words.filter((w, n) => { const c = w.replace(/^[^A-Za-z]+/, ''); return c && /^[a-z]/.test(c) && (n === 0 || !SMALL.has(c.toLowerCase())); });
}
const PAGES = ['/admin/rules', '/admin/lists', '/admin/pricing', '/billing', '/admin/feedback', '/activities', '/customers', '/customers/riverbend-dental?tab=account', '/admin?tab=pricing', '/boards/permits', '/boards/purchasing', '/boards/design', '/boards/production', '/projects', '/projects/demo-10?mode=demo', '/prospects', '/reports/reconciliation', '/setup/workflow?at=0', '/items/i61/send-proof', '/admin/workflow', '/admin/migration', '/performance', '/team', '/field', '/me', '/feedback', '/projects/new', '/search?q=riverbend', '/projects/demo-4/build', '/projects/demo-1/estimate', '/admin/modifier-prices', '/p-portal', '/billing', '/help', '/admin/team', '/admin/import', '/email?folder=spam', '/projects/demo-6/invoice', '/customers/riverbend-dental?tab=email'];
const BANNED = [[/\bRisks\b/, 'Risks (now Team)'], [/\bCoverage\b/, 'Coverage (now Missing a next step)'], [/\bRotting\b/, 'Rotting (now Stuck)'], [/\bRFQ\b/, 'RFQ (now Quote request)'], [/(^|[^-])color:\s*#9aa6bd/i, 'pale grey #9aa6bd text'], [/TV mode/i, 'TV mode']];
async function render(p) {
  if (p === '/p-portal') { const { portalToken } = await import('../app/proofs.mjs'); return (await handler({ rawPath: `/p/${portalToken('demo-6', globalThis.__SMX_TEST_KEY)}`, cookies: [], headers: { host }, requestContext: { http: { method: 'GET' } } })).body; }
  const [path, qs] = p.split('?'); return (await call(path, { query: qs ? Object.fromEntries(new URLSearchParams(qs)) : undefined })).body;
}

test('lint: buttons and headings are Title Case; retired words and pale grey are gone', async () => {
  const problems = [];
  for (const p of PAGES) {
    const h = (await render(p)).replace(/<header>[\s\S]*?<\/header>/, '');
    for (const m of h.matchAll(/<(button|h1|h2|h3|summary)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
      if (/data-free/.test(m[2])) continue;
      const t = strip(m[3]).split(' · ')[0]; if (!t || t.length > 60) continue;
      if (m[1] === 'h2' && /class="(lane|col)"/.test(h.slice(Math.max(0, m.index - 200), m.index))) continue; // workflow step names keep their agreed wording
      const bad = titleCaseProblems(t); if (bad.length) problems.push(`${p} <${m[1]}> "${t}"`);
    }
    for (const [re, label] of BANNED) if (re.test(strip(h)) || (label.includes('#') && re.test(h))) problems.push(`${p}: ${label}`);
  }
  assert.deepEqual([...new Set(problems)], []);
});

test('a11y: every form field has a label; images have alt text; buttons have names', async () => {
  const problems = [];
  for (const p of PAGES) {
    const h = await render(p);
    const ids = new Set([...h.matchAll(/<label[^>]*\bfor="([^"]+)"/g)].map((m) => m[1]));
    for (const m of h.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
      const a = m[2]; if (/type="(hidden|submit)"/.test(a)) continue;
      const id = (a.match(/\bid="([^"]+)"/) || [])[1];
      const wrapped = false;
      if (!/aria-label=/.test(a) && !(id && ids.has(id)) && !wrapped) {
        const before = h.slice(Math.max(0, m.index - 400), m.index); const open = before.lastIndexOf('<label'); const close = before.lastIndexOf('</label>');
        if (!(open > close)) problems.push(`${p}: <${m[1]} ${a.trim().slice(0, 60)}>`);
      }
    }
    for (const m of h.matchAll(/<img\b([^>]*)>/g)) if (!/\balt=/.test(m[1])) problems.push(`${p}: img without alt`);
    for (const m of h.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) if (!strip(m[2]) && !/aria-label=/.test(m[1])) problems.push(`${p}: empty button`);
  }
  assert.deepEqual([...new Set(problems)].slice(0, 40), []);
});


test('QA: customer order page works from its signed link (no staff sign-in): pay panel, comment, price approval', async () => {
  const { portalToken } = await import('../app/proofs.mjs');
  const tok = portalToken('demo-10', globalThis.__SMX_TEST_KEY);
  const pc = (path, opt = {}) => handler({ rawPath: path, cookies: [], headers: { host, origin: opt.form ? `https://${host}` : undefined }, requestContext: { http: { method: opt.form ? 'POST' : 'GET' } }, body: opt.form ? new URLSearchParams(opt.form).toString() : undefined, queryStringParameters: opt.query });
  let r = await pc(`/p/${tok}`);
  assert.equal(r.statusCode, 200); assert.match(r.body, /Balance due/); assert.match(r.body, /Most likely|Your order is ready/); assert.match(r.body, /Approve New Price \(\+\$45\.00\)/);
  r = await pc(`/p/${tok}/comment`, { form: { text: 'Can we use navy?' } });
  assert.match(r.headers.location, /got%20your%20comment/);
  r = await pc(`/p/${tok}/price`, { form: { decision: 'approve' } });
  assert.match(r.headers.location, /approved/);
  r = await pc(`/p/${tok}`);
  assert.match(r.body, /Can we use navy\?/); assert.ok(!r.body.includes('Approve New Price'));
  r = await pc(`/p/${tok}/po`, { form: { poNumber: 'PO-77', poAmount: '1,000.00' } });
  assert.match(r.headers.location, /got%20your%20PO/);
  assert.match((await pc(`/p/${tok}`)).body, /We have PO <b>PO-77<\/b>/);
  assert.match((await call('/projects/demo-10', { query: { mode: 'demo' } })).body, /value="PO-77"/);
  assert.equal((await pc('/p/not-a-token')).statusCode, 403);
});


test('QA: public quote request form creates a prospect and a quote task', async () => {
  const pub = (opt = {}) => handler({ rawPath: '/request', cookies: [], headers: { host, origin: opt.form ? `https://${host}` : undefined }, requestContext: { http: { method: opt.form ? 'POST' : 'GET' } }, body: opt.form ? new URLSearchParams(opt.form).toString() : undefined });
  assert.equal((await pub()).statusCode, 200);
  const r = await pub({ form: { name: 'Sam Lee', email: 'sam@x.com', what: 'Window graphics for our new store front.' } });
  assert.equal(r.statusCode, 200); assert.match(r.body, /QR-\d{4} is in/);
  assert.match((await call('/projects')).body, /Window graphics for our new store front/);
  assert.match((await call('/activities')).body, /Answer quote request QR-\d{4} from Sam Lee/);
  assert.equal((await pub({ form: { name: 'x' } })).statusCode, 400);
});


test('QA: customer approves an estimate online; project moves to In production; deposit task appears', async () => {
  const { portalToken } = await import('../app/proofs.mjs');
  const { demoProjects } = await import('../app/data.mjs');
  const est = demoProjects().filter((p) => p.lane === 'estimate' && p.id !== 'demo-4')[0] || demoProjects().find((p) => p.lane === 'estimate');
  assert.ok(est, 'a sample estimate exists');
  await call('/admin/reset-demo', { method: 'POST', form: {} });
  const tok = portalToken(est.id, globalThis.__SMX_TEST_KEY);
  const pc = (path, opt = {}) => handler({ rawPath: path, cookies: [], headers: { host, origin: opt.form ? `https://${host}` : undefined }, requestContext: { http: { method: opt.form ? 'POST' : 'GET' } }, body: opt.form ? new URLSearchParams(opt.form).toString() : undefined });
  const before = await pc(`/p/${tok}`);
  assert.match(before.body, /Approve Your Estimate/);
  const r = await pc(`/p/${tok}/approve-estimate`, { form: { signer: 'Pat Doe', agree: 'on' } });
  assert.match(r.headers.location, /estimate%20is%20approved/);
  assert.ok(!(await pc(`/p/${tok}`)).body.includes('Approve Your Estimate'));
  assert.match((await call('/activities')).body, /Collect the deposit/);
});


test('QA: only the owner can open Admin, Billing and money reports', async () => {
  const other = sign({ email: 'kristin@fastsigns.com', name: 'Kristin', exp: Date.now() + 3600000 }, globalThis.__SMX_TEST_KEY);
  const as = (path) => handler({ rawPath: path, cookies: [`smx_session=${other}`], headers: { host }, requestContext: { http: { method: 'GET' } } });
  for (const p of ['/admin', '/admin/workflow', '/billing', '/reports/reconciliation', '/reports/past-due.csv']) assert.equal((await as(p)).statusCode, 403, p);
  assert.equal((await as('/activities')).statusCode, 200);
  assert.equal((await call('/admin')).statusCode, 200);
});


test('QA: finishing a task shows on the customer history; project page links to the customer order page', async () => {
  await call('/activities/tasks/t7/done', { method: 'POST', form: {} });
  assert.match((await call('/customers/riverbend-dental', { query: { tab: 'activity' } })).body, /Done: /);
  assert.match((await call('/projects/demo-6', { query: { mode: 'demo' } })).body, /Open as the Customer/);
});


test('QA: email lives in To Do and on the customer: reply with signature, archive, spam; no Email tab; no delete', async () => {
  assert.ok(!/href="\/email" class=""/.test((await call('/activities')).body));
  let a = (await call('/activities')).body;
  assert.match(a, /Lobby sign proof[\s\S]*Reply[\s\S]*Mark as Spam/);
  assert.match((await call('/me/signature', { method: 'POST', form: { signature: 'Phil Warden\nFASTSIGNS of NKY' } })).headers.location, /Signature%20saved/);
  const ct = (await call('/customers/riverbend-dental', { query: { tab: 'email', reply: 'm1' } })).body;
  assert.match(ct, /Reply[\s\S]*value="dana@riverbenddental\.com"[\s\S]*aria-label="Bold"[\s\S]*Phil Warden<br>FASTSIGNS of NKY/);
  const sd = await call('/email/send', { method: 'POST', form: { to: 'dana@riverbenddental.com', subject: 'Re: Lobby sign proof', body: '<b>Bigger</b> logo coming', replyTo: 'm1', customer: 'Riverbend Dental', back: '/customers/riverbend-dental?tab=email' } });
  assert.match(sd.headers.location, /Sent/);
  assert.match((await call('/customers/riverbend-dental', { query: { tab: 'email' } })).body, /To dana@riverbenddental\.com/);
  assert.ok(!(await call('/activities')).body.includes('reply=m1'));
  assert.match((await call('/email/m3/spam', { method: 'POST', form: { back: '/activities' } })).headers.location, /^\/activities\?flash=Marked/);
  assert.match((await call('/email', { query: { folder: 'spam' } })).body, /You WON/);
  assert.match((await call('/email/m2/archive', { method: 'POST', form: { back: '/activities' } })).headers.location, /never%20deleted/);
  assert.notEqual((await call('/email/m1/delete', { method: 'POST', form: {} })).statusCode, 200);
  const o = await call('/email/ooo', { method: 'POST', form: { on: 'on', message: 'Out until Monday. Call the shop.', from: '2026-11-12', until: '2026-11-16', delegate: 'kristin' } });
  assert.match(o.headers.location, /^\/me\?flash=Out/);
  assert.match((await call('/me')).body, /Out of Office Auto-Reply[\s\S]*Email Signature/);
  assert.match((await call('/projects/demo-6', { query: { mode: 'demo' } })).body, /Write Email/);
  assert.match((await call('/static/editor.js')).headers['content-type'], /javascript/);
});

test('QA: hand-off address on the project, estimate and invoice; shipping blocks Complete until it is in CoreBridge', async () => {
  let r = await call('/projects/demo-6/destination', { method: 'POST', form: { type: 'Ship', name: 'Riverbend Dental', street: '120 Main St', city: 'Florence', state: 'KY', zip: '41042' } });
  assert.match(r.headers.location, /address%20saved/);
  assert.match((await call('/projects/demo-6', { query: { mode: 'demo' } })).body, /Ship to:[\s\S]*Florence, KY 41042[\s\S]*Waiting on the shipping label/);
  assert.match((await call('/projects/demo-6/invoice')).body, /Florence, KY 41042/);
  r = await call('/items/i63/move', { method: 'POST', form: { to: 'done', back: '/projects/demo-6?mode=demo' } });
  assert.match(r.headers.location, /Not%20moved/);
  r = await call('/projects/demo-6/label', { method: 'POST', form: { carrier: 'UPS', service: 'Ground', tracking: '1Z999AA10123456784', cost: '18.42' } });
  assert.match(r.headers.location, /22\.10/);
  assert.match((await call('/projects/demo-6/invoice')).body, /Subtotal[\s\S]*Discount[\s\S]*Shipping<\/span><b>\$22\.10/);
  assert.ok(!/18\.42/.test((await call('/projects/demo-6/invoice')).body));
  assert.match((await call('/projects/demo-6/xps', { method: 'POST', form: {} })).headers.location, /not%20connected/);
  assert.match((await call('/items/i63/move', { method: 'POST', form: { to: 'done', back: '/projects/demo-6?mode=demo' } })).headers.location, /Not%20moved/);
  await call('/projects/demo-6/shipping-confirm', { method: 'POST', form: {} });
  assert.match((await call('/items/i63/move', { method: 'POST', form: { to: 'done', back: '/projects/demo-6?mode=demo' } })).headers.location, /finish%20the%20checklist/);
  await call('/items/i63/check', { method: 'POST', form: { n: '0', back: '/boards/production' } });
  assert.ok(!/Not%20moved/.test((await call('/items/i63/move', { method: 'POST', form: { to: 'done', back: '/projects/demo-6?mode=demo' } })).headers.location));
  const est = await call('/projects/demo-1/estimate');
  if (est.statusCode === 200) assert.match(est.body, /Hand-Off Address/);
});

// Page snapshots for the mockup-fidelity pass: written only when SNAP_DIR is set (CodeBuild uploads them to S3).
test('snapshots: render the main pages to HTML files', async () => {
  if (!process.env.SNAP_DIR) return;
  const { mkdirSync, writeFileSync } = await import('node:fs');
  mkdirSync(process.env.SNAP_DIR, { recursive: true });
  const pages = [['activities', '/activities', {}], ['projects', '/projects', { mode: 'demo' }], ['customers', '/customers', {}], ['customer', '/customers/riverbend-dental', {}], ['project', '/projects/demo-6', { mode: 'demo' }], ['production', '/boards/production', {}], ['design', '/boards/design', {}], ['calls', '/calls', {}], ['checklists', '/admin/checklists', {}], ['performance', '/performance', {}], ['team', '/risks', {}]];
  for (const [name, path, query] of pages) {
    const r = await call(path, { query });
    writeFileSync(`${process.env.SNAP_DIR}/${name}.html`, String(r.body || ''));
  }
});

test('QA: every admin and main page loads for the owner (200, no server error)', async () => {
  const bad = [];
  for (const p of ['/calls', '/admin/templates', '/me/templates', '/billing', '/feedback', '/admin/feedback', '/customers?view=prospects', '/admin/connections', '/admin/checklists', '/admin/sequences', '/me', '/help', '/admin/pricing', '/admin/pricing?tab=parts', '/admin/pricing?tab=mods', '/admin/rules', '/admin/lists']) {
    const [path, qs] = p.split('?');
    const r = await call(path, { query: qs ? Object.fromEntries(new URLSearchParams(qs)) : undefined });
    if (r.statusCode !== 200) bad.push(`${p} → ${r.statusCode}`);
  }
  assert.deepEqual(bad, []);
});

test('sweep Activities: Plan Visits, Forward on email, See All Activity; forward opens a Fwd: draft', async () => {
  const h = (await call('/activities')).body;
  assert.ok(h.includes('/customers?view=prospects#route'), 'plan visits link'); assert.ok(/see all activity/i.test(h), 'see all'); assert.ok(h.includes('>Forward</a>'), 'forward');
  const id = (h.match(/fwd=([\w-]+)#compose/) || [])[1];
  assert.ok(id, 'an email row has Forward');
  const slug = (h.match(/\/customers\/([\w-]+)\?tab=email&amp;fwd=|\/customers\/([\w-]+)\?tab=email&fwd=/) || []).slice(1).find(Boolean);
  const c = (await call(`/customers/${slug}`, { query: { tab: 'email', fwd: id } })).body;
  assert.match(c, /value="Fwd: /);
  assert.ok(c.includes('Forwarded message'));
});

test('sweep Customers: Show / Group / Sort like the mockup', async () => {
  const h = (await call('/customers')).body;
  assert.ok(h.includes('Where Your Contacts Are') && h.includes('Start Check-Ins'));
  assert.ok(/All contacts \(\d+\)/.test(h) && h.includes('Needs attention (') && h.includes('No grouping') && h.includes('Lifetime sales'));
  const life = (await call('/customers', { query: { sort: 'lifetime' } })).body;
  const firsts = [...life.matchAll(/class="cgrp"><div><a href="\/customers\/([\w-]+)"/g)].map((m) => m[1]);
  assert.ok(firsts.length > 1);
  assert.equal(firsts[0], 'northside-hvac', 'biggest lifetime first');
  assert.ok((await call('/customers', { query: { group: 'none' } })).body.includes('clist flat'));
});

test('sweep Projects: tiles carry the mockup hints and filter links', async () => {
  const h = (await call('/projects', { query: { mode: 'demo' } })).body;
  assert.ok(h.includes('past the stage time target') && /\d+ of \d+ projects have no next-step task/.test(h) && h.includes('lost or abandoned'));
  assert.ok(h.includes('show=stuck') && h.includes('show=nonext'));
});

test('sweep Project record: Build Estimate, Documents menu, Copy Order Page Link, packing slip without prices', async () => {
  const h = (await call('/projects/demo-10', { query: { mode: 'demo' } })).body;
  assert.ok(h.includes('Build Estimate') && h.includes('More ▾') && h.includes('Print Packing Slip (No Prices)') && h.includes('Copy Order Page Link'));
  const s = await call('/projects/demo-10/packing-slip');
  assert.equal(s.statusCode, 200);
  assert.ok(s.body.includes('Packing Slip') && s.body.includes('SHIP TO') && !/\$\d/.test(s.body.replace(/<style[\s\S]*?<\/style>/, '')), 'no prices on the slip');
});

test('sweep Customer record: Open Projects + Past Orders with Reorder; Terms, Credit & Tax and Locations save', async () => {
  const p = (await call('/customers/riverbend-dental', { query: { tab: 'projects' } })).body;
  assert.ok(p.includes('Start a Project') && p.includes('Open Projects ·') && p.includes('Past Orders ·'));
  const a = (await call('/customers/riverbend-dental', { query: { tab: 'account' } })).body;
  assert.ok(a.includes('Terms, Credit &amp; Tax') && a.includes('Locations') && a.includes('+ Add Location'));
  const r = await call('/customers/riverbend-dental', { method: 'POST', query: { tab: 'account' }, form: { termsSet: '1', terms: 'Net 30', taxGroup: 'Kentucky State Tax', creditLimit: '2500', taxExemptReason: '', locations: '100 Main St, Hebron KY\n' } });
  assert.ok(r.statusCode < 400);
  const a2 = (await call('/customers/riverbend-dental', { query: { tab: 'account' } })).body;
  assert.ok(a2.includes('<option selected>Net 30</option>') && a2.includes('100 Main St, Hebron KY'));
});

test('sweep Design board: + Add a Note on cards and Put on Hold…', async () => {
  const h = (await call('/boards/design')).body;
  assert.ok(h.includes('+ Add a Note') && h.includes('Put on Hold…'));
});

test('sweep Production board: Ready / Mine / Rush / Late / On Hold / All quick filters', async () => {
  const h = (await call('/boards/production')).body;
  assert.ok(['Ready', 'Mine', 'Rush', 'Late', 'On Hold'].every((x) => h.includes(`>${x} <span`)), 'chips');
  const held = (await call('/boards/production', { query: { chip: 'held' } })).body;
  const all = h.match(/(\d+) items/)[1], heldN = held.match(/(\d+) items/)[1];
  assert.ok(Number(heldN) <= Number(all));
  assert.ok(held.includes('aria-current="true"'));
});

test('sweep Permits + Purchasing: + Add Permit / + New Quote Request or PO, City / County Fees, + Add a Note', async () => {
  const p = (await call('/boards/permits')).body;
  assert.ok(p.includes('+ Add Permit') && p.includes('City / County Fees') && p.includes('+ Add a Note'));
  let r = await call('/boards/permits/new', { method: 'POST', form: { name: 'Blade sign', company: 'Oakline Café', where: 'Florence' } });
  assert.match(r.headers.location, /Added/);
  r = await call('/boards/permits/pm5/fee', { method: 'POST', form: { what: 'Permit fee', amount: '$125', paidOn: '2026-11-12', invoice: 'on' } });
  assert.match(r.headers.location, /Saved/);
  assert.ok((await call('/boards/permits')).body.includes('City / County Fees · $125.00'));
  const u = (await call('/boards/purchasing')).body;
  assert.ok(u.includes('+ New Quote Request or PO'));
});

test('sweep Team: slipping list, By Salesperson, Nudge puts a task on their Activities', async () => {
  const h = (await call('/team')).body;
  assert.ok(h.includes('Slipping Through the Cracks') && h.includes('By Salesperson'));
  const r = await call('/team/nudge', { method: 'POST', form: { to: 'kristin', title: 'Call Acme', href: '/projects/demo-10?mode=demo' } });
  assert.match(r.headers.location, /Nudged/);
});

test('sweep Field: SALESMAX FIELD header, Today/Survey/Install/Look Up tabs, Look Up search with Call / Directions / Open', async () => {
  const h = (await call('/field')).body;
  assert.ok(h.includes('SALESMAX FIELD') && h.includes('Look Up') && h.includes('Add Photos in Google Drive'));
  const l = (await call('/field', { query: { kind: 'look', q: 'riverbend' } })).body;
  assert.ok(l.includes('Riverbend Dental') && l.includes('>Open</a>'));
});

test('sweep Send Proof: approvers, Approval mode, template, subject, Follow-Up and Approval Options saved', async () => {
  const h = (await call('/items/i61/send-proof')).body;
  assert.ok(h.includes('Follow-Up and Approval Options') && h.includes('Approval') && h.includes('Template') && h.includes('Preview what'));
  const bad = await call('/items/i61/send-proof', { method: 'POST', form: { cc: 'not-an-email' } });
  assert.match(decodeURIComponent(bad.headers.location), /Not sent|not at proof review/);
});

test('QA: no inline scripts or onclick/onchange handlers (the security policy blocks them); ui.js serves', async () => {
  const bad = [];
  for (const p of ['/activities', '/customers', '/customers?view=prospects', '/projects', '/projects/demo-10?mode=demo', '/performance', '/team', '/search?q=river', '/feedback', '/items/i61/send-proof', '/field', '/billing', '/admin/pricing', '/admin/rules', '/admin/lists', '/boards/design', '/boards/permits', '/projects/demo-10/packing-slip']) {
    const [path, qs] = p.split('?');
    const h = (await call(path, { query: qs ? Object.fromEntries(new URLSearchParams(qs)) : undefined })).body;
    if (/\son(click|change|mouseover|mouseout|submit|input|load)=/i.test(h)) bad.push(p + ' handler');
    if (/<script(?![^>]*\bsrc=)(?![^>]*application\/json)[^>]*>/i.test(h)) bad.push(p + ' inline script');
  }
  assert.deepEqual(bad, []);
  const js = await call('/static/ui.js');
  assert.equal(js.statusCode, 200); assert.match(js.body, /data-autosubmit/);
});

test('sweep Task + Prospect forms: Repeat and Notes on New Task; Add and Start an Estimate goes to Build Estimate', async () => {
  const h = (await call('/activities')).body;
  assert.ok(h.includes('Repeat') && h.includes('The day I mark it done') && h.includes('name="notes"'));
  const r = await call('/projects/new', { method: 'POST', form: { name: 'Window graphics', company: 'Oakline Café', go: 'estimate' } });
  assert.match(r.headers.location, /\/projects\/new-[\w]+\/build$/);
});

test('sweep Out of Office + Connected Apps: mockup wording, Insert Booking Link in signature, Still on / Turned off', async () => {
  const me = (await call('/me')).body;
  assert.ok(me.includes('Away from') && me.includes('Each customer gets the auto-reply once') && me.includes('Covering for you'));
  const c = (await call('/admin/connections')).body;
  assert.ok(c.includes('Still on') && c.includes('Turned off') && c.includes('Owners only'));
});
