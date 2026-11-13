// Hybrid estimates: SalesMax drafts a placeholder estimate in CoreBridge (customer, contact, salesperson,
// description, one blank product per site-survey line). The salesperson then adds parts in CoreBridge,
// which stays the pricing source of truth. SalesMax reads the priced estimate back.
// Learned in the Nov 10 live test (EST-75325 / EST-75327):
//  - ProductQuantity is required (0 -> "divide by zero").
//  - CoreBridge can reply "Mapping Error" yet still save the estimate, so we ALWAYS read back.
//  - API estimates default to "E-Commerce Import Tax Group"; we set the location's tax group.
import { page, esc } from './views.mjs';
import { taxGroupFor } from './customers.mjs';
import { SOURCE_OPTIONS } from './origination.mjs';

export const SETTINGS = {
  taxGroupId: null, // Admin > CoreBridge sync: the location's normal tax group (to confirm with Phil)
  descriptionPrefix: '',
};

export const DEMO_SURVEYS = {
  'demo-1': { date: '2026-11-06', by: 'Kristin Ames', site: 'Riverbend Dental, Hebron', lines: [
    { description: 'Exterior building letters, front elevation', qty: 1, location: 'Front fascia' },
    { description: 'Monument sign face replacement (2 sides)', qty: 2, location: 'Entrance drive', w: 96, h: 48 },
    { description: 'Lobby wall logo, dimensional', qty: 1, location: 'Reception' },
    { description: 'ADA room ID signs', qty: 18, location: 'Exam rooms and offices' },
    { description: 'Window hours vinyl', qty: 1, location: 'Front door', w: 12, h: 18 },
  ] },
  'demo-2': { date: '2026-11-10', by: 'Kristin Ames', site: 'Tri-State Logistics, Hebron warehouse', lines: [
    { description: 'Warehouse wall graphic, 40 ft', qty: 1, location: 'Loading dock wall', w: 480, h: 96 },
    { description: 'Dock door numbers', qty: 24, location: 'Dock doors', w: 18, h: 24 },
    { description: 'Safety and wayfinding signs', qty: 30, location: 'Warehouse floor', w: 12, h: 18 },
  ] },
};

export const surveyFor = (projectId) => DEMO_SURVEYS[projectId] || null;

// Demo customers: not yet in CoreBridge, so SalesMax must create (or link) them before the estimate.
export const DEMO_CUSTOMERS = {
  'demo-1': { company: { name: 'Riverbend Dental', state: 'KY', phone: '(859) 555-0142' }, contact: { firstName: 'Dana', lastName: 'Ruiz', email: 'dana@riverbenddental.example' },
    facts: { startedBy: 'salesperson', channel: 'site visit', paidOrders: 6, lastPaidOrderAt: '2026-10-20' } },
  'demo-2': { company: { name: 'Tri-State Logistics', state: 'OH', phone: '(513) 555-0198' }, contact: { firstName: 'Marcus', lastName: 'Lee', email: 'mlee@tristatelogistics.example' },
    facts: { startedBy: 'customer', channel: 'inbound email', paidOrders: 3, lastPaidOrderAt: '2026-08-28' } },
};
export const customerFor = (p) => DEMO_CUSTOMERS[p.id] || { company: { name: p.company, state: 'KY' }, contact: { firstName: String(p.contact || '').split(' ')[0], lastName: String(p.contact || '').split(' ').slice(1).join(' ') } };

function customerBox(plan, tax, origin) {
  const steps = plan.ready ? '<li>Company and contact are already in CoreBridge.</li>' : plan.steps.map((st) => `<li>${esc(st.say)}</li>`).join('');
  return `<div class="panel" style="margin:0 0 14px;background:#f6f7f9"><h2 style="margin:0 0 6px;font-size:15px">Before the Estimate</h2>
    <ol style="margin:0 0 8px;padding-left:20px;line-height:1.7">${steps}</ol>
    <div style="font-size:13px">Tax group: <b>${esc(tax.name)}</b> <span style="color:var(--mute)">(${esc(tax.reason)})</span></div>
    ${origin ? `<label style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13px;margin-top:8px">Source <select name="origination" style="font:inherit;min-height:34px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px">${SOURCE_OPTIONS.map((o) => `<option value="${o.id}"${o.id === origin.id ? ' selected' : ''}>${esc(o.short)}</option>`).join('')}</select><span style="color:var(--mute)">Filled in for you: ${esc(origin.reason)} Change it if that's not right.</span></label>` : ''}</div>`;
}

// One blank product per survey line: description and quantity only, no parts and no price.
export function surveyLines(survey) {
  return (survey?.lines || []).map((l) => ({
    description: [l.description, l.location ? `(${l.location})` : ''].filter(Boolean).join(' ').slice(0, 255),
    qty: Math.max(1, Math.round(Number(l.qty) || 1)),
  }));
}

export function buildPlaceholderEstimate({ project, account = {}, lines = [], settings = SETTINGS }) {
  if (account.state || account.taxExempt) settings = { ...settings, taxGroupId: taxGroupFor(account).id };
  const items = lines.length ? lines : [{ description: project.name || 'New product', qty: 1 }];
  const body = {
    IsEstimate: true,
    CbAccountId: account.cbAccountId || 0,
    OrderContactId: account.contactId || undefined,
    OrderSalesPersonId: account.salespersonId || undefined,
    OrderDescription: `${settings.descriptionPrefix || ''}${project.name || 'Estimate'}`.slice(0, 255),
    GenericOrderLineItems: items.map((l, i) => ({
      IndexNumber: i + 1,
      LineNumber: i + 1,
      ProductDescription: String(l.description || '').slice(0, 255),
      ProductQuantity: Math.max(1, Math.round(Number(l.qty) || 1)),
      UseQuickProductPricing: Boolean(l.quickProductId),
      ...(l.quickProductId ? { QuickProductId: l.quickProductId } : {}),
      IsTaxable: true,
    })),
  };
  if (settings.taxGroupId) { body.OverrideAssignedTaxGroupId = settings.taxGroupId; body.ForceOverrideUseDefaultTaxGroup = true; }
  if (settings.originationId) body.OrderOriginationId = settings.originationId; // CoreBridge requires it (Nov 10 test)
  for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
  return body;
}

// CoreBridge's reply is not trustworthy on its own. Pull out any order id it mentions and always read back.
export function interpretCreateReply(reply = {}) {
  const fromMsg = /CbId:(\d+)/.exec(String(reply.Message || ''));
  const orderId = reply.CbOrderId > 0 ? reply.CbOrderId : fromMsg ? Number(fromMsg[1]) : null;
  return { orderId, mustReadBack: true, saidSuccess: reply.IsSuccess === true, message: reply.Message || null };
}

// After read-back: did CoreBridge keep every placeholder product we asked for?
export function verifyPlaceholders(sentBody, readBack = {}) {
  const want = sentBody.GenericOrderLineItems.map((l) => [l.ProductDescription, l.ProductQuantity]);
  const got = (readBack.ExOrderProducts || []).map((p) => [p.ProductDescription, p.ProductQuantity]);
  const missing = want.filter(([d, q]) => !got.some(([gd, gq]) => gd === d && gq === q));
  return { ok: missing.length === 0 && readBack.Status === 'ESTIMATE', missing, estimateNumber: readBack.EstimateNumber || null };
}

export function estimateCta(p) {
  const s = surveyFor(p.id);
  const n = s ? s.lines.length : 0;
  return `<p style="color:var(--mute);margin:0 0 10px">No items yet.</p>
    <div style="display:flex;flex-wrap:wrap;gap:10px"><a class="btn primary" href="/projects/${esc(p.id)}/build">Build Estimate (live CoreBridge price)</a>
    <a class="btn" href="/projects/${esc(p.id)}/estimate?mode=demo">Draft placeholder estimate${n ? ` (${n} products from the site survey)` : ''}</a></div>`;
}

export function estimatePage({ user, p, survey, body, plan = { ready: true, steps: [] }, tax = null, origin = null, prefix = '' }) {
  const lines = body.GenericOrderLineItems;
  const rows = lines.map((l) => `<tr><td>${l.LineNumber}</td><td>${esc(l.ProductDescription)}</td><td>${l.ProductQuantity}</td><td style="color:var(--mute)">Blank: salesperson adds parts in CoreBridge</td></tr>`).join('');
  const surveyNote = survey ? `From the site survey on ${esc(survey.date)} by ${esc(survey.by)} at ${esc(survey.site)}.` : 'No site survey on this project, so one blank product is drafted from the project name.';
  const body2 = `<div class="wrap"><div class="bar" style="padding:14px 0"><a href="/projects/${esc(p.id)}?mode=demo">← ${esc(p.name)}</a></div>
  <div class="panel"><h1 style="margin:0 0 4px">Placeholder Estimate for ${esc(p.company)}</h1>${p.estimateNumber ? `<p style="margin:0 0 4px;font-weight:700">Estimate ${esc(prefix && !String(p.estimateNumber).startsWith(prefix + '-') ? prefix + '-' + p.estimateNumber : p.estimateNumber)}</p>` : ''}
  <p style="color:var(--mute);margin:0 0 14px">${surveyNote}</p>
  ${tax ? customerBox(plan, tax, origin) : ''}
  <table><thead><tr><th>#</th><th>Product (blank)</th><th>Qty</th><th>Next</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="note" style="background:#fff4e0;color:#7a4e00;margin:14px 0">Test copy: CoreBridge writes are off. When on, SalesMax creates this estimate, reads it back to confirm every product saved, then opens a task for the salesperson: "Add parts and pricing in CoreBridge".</div>
  <ol style="margin:0 0 14px;padding-left:20px;line-height:1.7"><li>SalesMax creates the estimate shell with these blank products.</li><li>The salesperson adds parts and modifiers in CoreBridge; CoreBridge prices them.</li><li>SalesMax reads the priced estimate back and it shows up here and in the Order Portal.</li></ol>
  <button class="btn primary" disabled title="Writes are off in the test copy">Create in CoreBridge</button>
  <details style="margin-top:14px"><summary style="cursor:pointer;color:var(--mute)">What SalesMax Would Send (for Checking)</summary><pre style="white-space:pre-wrap;font-size:12px;background:#f6f7f9;padding:10px;border-radius:8px">${esc(JSON.stringify(body, null, 2))}</pre></details>
  </div></div>`;
  return page({ title: 'Placeholder estimate', user, tab: 'Projects', mode: 'demo', body: body2 });
}

