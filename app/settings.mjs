// Admin settings: 6 tabs, typed fields with defaults, status strip, Advanced sections. Stored as one config doc.
import { page, esc, infoTip } from './views.mjs';
import { companyExtras, salesExtras } from './adminx.mjs';
import { rulesSections, LIST_DEFAULTS, IMPORT_KINDS } from './salesrules.mjs';
import { workflowExtras } from './adminwf.mjs';
import { pricingExtras, ordersExtras, connExtras } from './adminpo.mjs';

export const TABS = [
  ['company', 'Company'], ['sales', 'Sales'], ['pricing', 'Pricing'], ['work', 'Work'], ['orders', 'Customer Page & Payments'], ['cb', 'Connections'],
];

// [key, label, type, default, help, advanced?, extra]
export const FIELDS = {
  company: [
    ['companyName', 'Business name', 'text', 'FASTSIGNS of Northern Kentucky', 'Shown on customer emails and the order page.'],
    ['phone', 'Main phone', 'text', '', 'Shown on the order page.'],
    ['docPrefix', 'Estimate & invoice number prefix', 'text', '226', 'Printed before every estimate and invoice number, like 226-75148. Each location sets its own.'],
    ['timezone', 'Time zone', 'select', 'America/New_York', 'Due dates and the daily scorecard use this.', false, ['America/New_York', 'America/Chicago']],
    ['logoNote', 'Logo', 'text', 'Upload coming soon', 'Logos live in Google Drive, never on AWS.', true],
  ],
  sales: [
    ['missingNextStepDays', 'Flag projects with no next step after (days)', 'number', 0, 'Projects with no open task show in Missing Next Step on Activities.', false, [0, 30]],
    ['keepWarmDays', 'Keep warm after no contact for (days)', 'number', 90, 'Customers move to Keep Warm after this many quiet days.', false, [14, 365]],
    ['dormantDays', 'Dormant after (days)', 'number', 180, 'Customers become Dormant after this many quiet days.', false, [30, 730]],
    ['celebrations', 'Celebrate team wins', 'bool', true, 'Confetti and fireworks when goals are hit.'],
    ['goalTasks', 'Daily goal: Tasks Done', 'number', 8, '', true, [0, 100]],
    ['goalQuotes', 'Daily goal: Quotes Sent', 'number', 3, '', true, [0, 50]],
    ['goalOrders', 'Daily goal: Orders Moved Forward', 'number', 4, '', true, [0, 50]],
    ['monthSales', 'Monthly sales goal ($)', 'number', 40000, 'Shown on Performance.', true, [0, 10000000]],
    ['closeRate', 'Close rate goal (%)', 'number', 50, 'Shown on Performance.', true, [0, 100]],
  ],
  pricing: [
    ['priceApprovalThreshold', 'Customer must approve price changes over ($)', 'number', 25, 'Smaller changes apply without asking. Larger ones need the customer’s OK on the order page.', false, [0, 10000]],
    ['depositPct', 'Deposit (%)', 'number', 50, 'Asked for before production unless the customer has terms or a PO.', false, [0, 100]],
    ['cardFeePct', 'Card fee (%)', 'number', 3, 'Added to card payments only. eCheck has no fee.', false, [0, 4]],
    ['shipMarkupPct', 'Shipping markup (%)', 'number', 20, 'Added to the XPS label cost on the invoice.', false, [0, 200]],
    ['shipHandling', 'Shipping handling fee ($)', 'number', 0, 'Added once per label, on top of the markup.', false, [0, 500]],
    ['estimateNotes', 'Notes on every estimate', 'text', 'Prices are good for 30 days. A 50% deposit starts production.', 'Printed at the bottom of every estimate.'],
  ],
  work: [
    ['proofRoundLimit', 'Proof rounds included', 'number', 3, 'After this, extra rounds are flagged to the salesperson.', false, [1, 10]],
    ['proofReminderDays', 'Remind the customer about a proof after (days)', 'number', 2, '', false, [1, 14]],
    ['target_prospect', 'Days a project can sit in Prospect', 'number', 14, 'Shows as “Stage time left” on the project.', false, [1, 120]],
    ['target_estimate', 'Days in Estimate', 'number', 7, '', false, [1, 120]],
    ['target_progress', 'Days in In production', 'number', 10, '', false, [1, 120]],
    ['target_built', 'Days in Built (waiting for hand-off)', 'number', 3, '', false, [1, 120]],
    ['qcBy', 'Quality control signed off by', 'select', 'Production lead', '', false, ['Production lead', 'Whoever built it', 'The salesperson']],
  ],
  orders: [
    ['pastDueReminders', 'Past due reminders', 'bool', true, 'Emails the customer a pay link when an invoice is past due.'],
    ['shippingAccountRequest', 'Ask for a shipping account', 'bool', true, 'Asks ship-to customers for their carrier account before shipping.'],
    ['completedEmail', 'When an order is completed, send', 'select', 'Invoice + review request', '', false, ['Invoice + review request', 'Invoice only', 'Nothing']],
    ['reviewLink', 'Review link', 'text', '', 'Where the review request sends customers.', true],
    ['tplCompleted', 'Order Completed email (leave blank for the standard one)', 'textarea', '', 'You can use {first}, {project}, {total}, {paylink}, {review}.', true],
    ['tplPastDue', 'Past due reminder (leave blank for the standard one)', 'textarea', '', 'You can use {first}, {invoice}, {balance}, {due}, {paylink}.', true],
    ['tplShipping', 'Shipping account request (leave blank for the standard one)', 'textarea', '', 'You can use {first}, {project}.', true],
  ],
  cb: [
    ['cbSync', 'Read from CoreBridge', 'bool', true, 'Estimates, orders and customers are read from CoreBridge.'],
    ['importApproved', 'Allow history import from CoreBridge', 'bool', false, 'Read-only. Uses the shared CoreBridge slot (about 500 calls an hour), 2 calls per batch.'],
    ['cbWritesNote', 'Write to CoreBridge', 'readonly', 'Off in the test copy', 'Turning writes on needs the owner’s approval.'],
    ['paymentsNote', 'Card and eCheck payments', 'readonly', 'Not connected yet (Fiserv CardPointe)', ''],
  ],
};

export function defaults() {
  const o = {};
  for (const list of Object.values(FIELDS)) for (const [k, , , d] of list) o[k] = d;
  return o;
}

export function mergeSettings(prev, tab, f) {
  const list = FIELDS[tab];
  if (!list) throw new Error('that settings tab does not exist');
  const out = { ...defaults(), ...prev };
  for (const [k, label, type, , , , extra] of list) {
    if (type === 'readonly') continue;
    if (type === 'bool') { out[k] = f[k] === 'on'; continue; }
    if (!(k in f)) continue;
    const v = String(f[k]).trim();
    if (type === 'number') {
      const n = Number(v);
      if (v === '' || !Number.isFinite(n)) throw new Error(`${label} needs a number`);
      if (extra && (n < extra[0] || n > extra[1])) throw new Error(`${label} must be between ${extra[0]} and ${extra[1]}`);
      out[k] = n;
    } else if (type === 'select') {
      if (!extra.includes(v)) throw new Error(`pick one of the choices for ${label}`);
      out[k] = v;
    } else out[k] = v.slice(0, type === 'textarea' ? 2000 : 200);
  }
  if (tab === 'sales' && out.dormantDays <= out.keepWarmDays) throw new Error('Dormant must come after Keep Warm');
  out._savedAt = out._savedAt || {};
  return out;
}

const info = (t) => (t ? `<span title="${esc(t)}" aria-label="${esc(t)}" style="display:inline-flex;width:16px;height:16px;border-radius:8px;background:#eef1f5;color:#5a6478;font-size:11px;font-weight:700;align-items:center;justify-content:center;cursor:help;margin-left:4px">i</span>` : '');

function field([k, label, type, , help, , extra], v) {
  const id = `f-${k}`;
  let input;
  if (type === 'bool') input = `<input type="checkbox" id="${id}" name="${k}" ${v ? 'checked' : ''} style="width:20px;height:20px">`;
  else if (type === 'select') input = `<select id="${id}" name="${k}" style="font:inherit;min-height:36px">${extra.map((x) => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
  else if (type === 'readonly') input = `<span id="${id}" style="font-weight:600">${esc(v)}</span>`;
  else if (type === 'textarea') input = `<textarea id="${id}" name="${k}" rows="5" style="font:inherit;width:100%;border:1px solid #d5dbe5;border-radius:8px;padding:8px">${esc(v)}</textarea>`;
  else input = `<input id="${id}" name="${k}" type="${type === 'number' ? 'number' : 'text'}" value="${esc(v)}" ${type === 'number' && extra ? `min="${extra[0]}" max="${extra[1]}"` : ''} style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 10px;width:${type === 'number' ? '120px' : '100%'}">`;
  return `<div><label for="${id}">${esc(label)}</label>${info(help)}</div><div>${input}</div>`;
}


// 226 + 75148 → 226-75148 (never doubled; blank prefix leaves the number alone).
export function docNumber(prefix, n) { const p = String(prefix || '').trim(), s = String(n ?? '').trim(); if (!s) return ''; if (!p || s.startsWith(p + '-')) return s; return `${p}-${s}`; }

// Same left admin menu on every admin page (Phil: consistent everywhere). Wraps a rendered page's <main>.
export const ADMIN_GROUPS = [
  ['Settings', TABS.map(([k2, label]) => [label, `/admin?tab=${k2}`])],
  ['Workflow', [['Workflow Builder', '/admin/workflow'], ['Set Up Workflow', '/setup/workflow'], ['Sales Rules', '/admin/rules'], ['Stage Checklists', '/admin/checklists'], ['Sequences', '/admin/sequences'], ['Email Templates', '/admin/templates'], ['Pricing Engine', '/admin/pricing'], ['Modifier Prices', '/admin/modifier-prices']]],
  ['People & Apps', [['Team Members', '/admin/team'], ['Connected Apps & Keys', '/admin/connections'], ['Calls', '/calls'], ['Feedback Inbox', '/admin/feedback']]],
  ['Data', [['Customer Lists & Import', '/admin/lists'], ['Import From CoreBridge', '/admin/import'], ['Moving Off CoreBridge', '/admin/migration'], ['Nightly Reconciliation', '/reports/reconciliation'], ['Past Due', '/reports/past-due'], ['Change Log', '/log']]],
];
export function withAdminNav(htmlBody, path) {
  if (typeof htmlBody !== 'string' || !htmlBody.includes('<main id="main">') || htmlBody.includes('class="abar"')) return htmlBody;
  // Mockup admin sub-pages (ConnectedApps, WorkflowBuilder…) have no side menu: a breadcrumb back to Admin Settings,
  // plus an "All Admin Pages" menu so every admin page is still one click away (Phil: consistent everywhere).
  const all = ADMIN_GROUPS.flatMap(([, links]) => links);
  const cur = all.find(([, href]) => href.split('?')[0] === path && !href.includes('?'));
  const menu = ADMIN_GROUPS.map(([g, links]) => `<div class="agm"><div class="agh">${esc(g)}</div>${links.map(([label, href]) => { const on = cur && href === cur[1]; return `<a href="${href}" class="${on ? 'on' : ''}"${on ? ' aria-current="page"' : ''}>${esc(label)}</a>`; }).join('')}</div>`).join('');
  const css = '<style>.abar{max-width:1240px;margin:0 auto;padding:16px 32px 0;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;font-size:13px}.abar .crumb a{color:#1d4f91}.abar details{position:relative}.abar summary{list-style:none;cursor:pointer;font-weight:600;color:#1b2436;background:#fff;border:1px solid #d5dbe5;border-radius:8px;padding:0 12px;min-height:36px;display:inline-flex;align-items:center}.abar summary::-webkit-details-marker{display:none}.amenu{position:absolute;right:0;top:42px;z-index:60;width:min(720px,92vw);background:#fff;border:1px solid #e3e7ee;border-radius:12px;box-shadow:0 12px 32px rgba(22,33,58,.18);padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}.agm{display:flex;flex-direction:column;gap:2px}.agh{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--mute);padding:2px 8px 4px}.agm a{font-size:13px;color:#1b2436;padding:6px 8px;border-radius:6px;text-decoration:none}.agm a:hover{background:#f4f6f9}.agm a.on{background:#16213a;color:#fff}</style>';
  const own = /href="\/admin(\?[^"]*)?"[^>]*>Admin [Ss]ettings<\/a>/.test(htmlBody);
  const bar = `<div class="abar"><div class="crumb">${own ? '' : `<a href="/admin">Admin Settings</a>${cur ? ` <span aria-hidden="true">›</span> ${esc(cur[0])}` : ''}`}</div><details><summary>All Admin Pages ▾</summary><nav class="amenu" aria-label="Admin areas">${menu}</nav></details></div>`;
  return htmlBody.replace('<main id="main">', `<main id="main">${css}${bar}`);
}

// ---- Admin Settings layout ported from StageTargets.dc.html (mockup) ----
const ADMIN_TABS2 = [['company', 'Company & Team'], ['sales', 'Sales'], ['pricing', 'Pricing'], ['work', 'Workflow'], ['orders', 'Customer Page & Payments'], ['cb', 'Connections']];
const PLUS = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>';
const BTN = 'display:inline-flex;align-items:center;gap:6px;background:#ffffff;color:#1b2436;border:1px solid #d5dbe5;text-decoration:none;font:inherit;font-weight:600;font-size:13px;padding:0 12px;min-height:36px;border-radius:8px;box-sizing:border-box;cursor:pointer;white-space:nowrap';
function adminShell({ locName = 'FASTSIGNS of Northern Kentucky', locDot = '#4fb3c9', cur = 'company', counts = {}, chips = [], flash = '', body = '' }) {
  const tabs = ADMIN_TABS2.map(([k, l]) => { const on = k === cur; return `<a role="tab" aria-selected="${on}" href="/admin?tab=${k}" style="font-size:14px;font-weight:600;border-bottom:3px solid ${on ? '#a8343f' : 'transparent'};color:${on ? '#1b2436' : '#3d4658'};padding:0 14px;min-height:44px;display:inline-flex;align-items:center;gap:6px;text-decoration:none">${esc(l)}${counts[k] != null ? `<span style="font-size:11px;font-weight:600;color:#5a6478;background:#eef0f4;border-radius:9px;padding:1px 7px">${counts[k]}</span>` : ''}</a>`; }).join('');
  const chipHtml = chips.length ? `<div role="status" aria-label="Status summary" style="display:flex;flex-wrap:wrap;gap:8px">${chips.map((c) => `<span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;background:${c.warn ? '#fdf3dc' : '#e6f2ec'};color:${c.warn ? '#7a4e00' : '#1f6a43'};border-radius:16px;padding:5px 12px">${c.warn ? '!' : '✓'} ${esc(c.text)}</span>`).join('')}</div>` : '';
  return `<div style="padding:28px 32px 48px;box-sizing:border-box"><div style="max-width:980px;margin:0 auto;display:flex;flex-direction:column;gap:24px">
<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px"><div><h1 style="margin:0;font-size:28px;font-weight:700">Admin Settings</h1><p style="margin:4px 0 0;color:#5a6478;font-size:14px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">Settings for <span style="width:8px;height:8px;border-radius:4px;background:${locDot}"></span><b style="color:#1b2436">${esc(locName)}</b> only. Only admins see this page.</p></div>
<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><a href="/billing" style="${BTN};min-height:44px;font-size:14px">Billing &amp; Add-Ons</a><span role="status" style="font-size:13px;font-weight:600;color:#1f6a43;display:inline-flex;align-items:center;gap:6px">✓ ${esc(flash || 'All changes saved')}</span></div></div>
<div role="tablist" aria-label="Admin sections" style="display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid #d5dbe5;margin-bottom:-8px">${tabs}</div>
${chipHtml}${body}</div></div>`;
}
function adminCard({ id = '', title, desc = '', badge = null, action = '', body = '' }) {
  return `<section${id ? ` id="${esc(id)}"` : ''} aria-label="${esc(title)}" style="background:#ffffff;border:1px solid #e3e7ee;border-radius:12px"><div style="padding:16px 20px;border-bottom:1px solid #e3e7ee;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end"><div style="flex:1 1 420px"><h2 style="margin:0;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;flex-wrap:wrap">${esc(title)}${badge ? `<span style="font-size:11px;font-weight:700;background:${badge.bg};color:${badge.fg};border-radius:10px;padding:2px 8px">${esc(badge.text)}</span>` : ''}</h2>${desc ? `<p style="margin:4px 0 0;font-size:13px;color:#5a6478;line-height:1.5">${esc(desc)}</p>` : ''}</div>${action}</div>${body}</section>`;
}
export function adminRows(rows = [], foot = '') {
  const pill = { green: ['#e6f2ec', '#1f6a43'], blue: ['#e8f0fb', '#1d4f91'], amber: ['#fdf3dc', '#7a4e00'], gray: ['#eef1f5', '#3d4658'] };
  return `<div style="padding:6px 20px 12px;display:flex;flex-direction:column">${rows.map((r) => { const [bg, fg] = pill[r.tone || 'gray']; return `<div style="display:grid;grid-template-columns:minmax(150px,1fr) minmax(0,2fr) auto;gap:12px;align-items:center;padding:8px 0;border-bottom:1px solid #eef1f5;font-size:13px"><span style="font-weight:600">${esc(r.a)}</span><span style="color:#3d4658;line-height:1.45">${esc(r.b)}</span>${r.c ? `<span style="font-size:11px;font-weight:700;border-radius:10px;padding:2px 9px;background:${bg};color:${fg};white-space:nowrap">${esc(r.c)}</span>` : '<span></span>'}</div>`; }).join('')}${foot ? `<div style="font-size:12px;color:#5a6478;padding-top:8px">${esc(foot)}</div>` : ''}</div>`;
}
function locationsCard({ locs = [], people = [], locShort = 'Northern Kentucky' }) {
  const lc = locs.map((l) => `<div style="border:1px solid ${l.here ? '#4fb3c9' : '#e3e7ee'};border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:6px"><div style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:5px;background:${l.dot}"></span><span style="font-size:14px;font-weight:700;flex:1 1 auto">${esc(l.name)}</span><span style="font-size:11px;color:#5a6478">${l.here ? 'You are here' : 'Switch from the top bar'}</span></div>${l.conns.map(([k, v, ok]) => `<div style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><span style="color:#5a6478">${esc(k)}</span><span style="font-weight:600;color:${ok === true ? '#1f6a43' : ok === false ? '#874511' : '#1b2436'}">${esc(v)}</span></div>`).join('')}</div>`).join('');
  return `<section aria-label="Locations and Team" style="background:#ffffff;border:1px solid #e3e7ee;border-radius:12px"><div style="padding:16px 20px;border-bottom:1px solid #e3e7ee;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0;font-size:16px;font-weight:700">Locations and Team</h2><p style="margin:4px 0 0;font-size:13px;color:#5a6478">Each location has its own CoreBridge, Google Workspace, data and people. Nobody can see a location they don’t belong to.</p></div><a href="/billing" style="${BTN}">${PLUS}Location</a></div>
<div class="admlocs" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:16px 20px">${lc}</div>
<div style="border-top:1px solid #eef1f5;display:flex;justify-content:space-between;align-items:center;padding:12px 20px;gap:12px;flex-wrap:wrap"><span style="font-size:13px;color:#3d4658">People at ${esc(locShort)}, their roles and who does QC are managed on Team Members.</span><a href="/admin/team" style="${BTN}">${PLUS}Invite or Edit People</a></div></section><style>@media (max-width:700px){.admlocs{grid-template-columns:1fr!important}}</style>`;
}
const ATAB_LABEL = { company: 'Company & Team', sales: 'Sales', pricing: 'Pricing', work: 'Workflow', orders: 'Customer Page & Payments', cb: 'Connections' };
const ATAB_LINKS = {
  company: [['Team Members', '/admin/team', 'Invite people, set roles and who does QC.'], ['Billing & Add-Ons', '/billing', 'Your plan, add-ons and invoices. Owners only.']],
  sales: [['Sales Rules', '/admin/rules', 'Stage targets, reply time targets, business hours and keep-warm rules.'], ['Sequences', '/admin/sequences', 'Automatic estimate follow-ups, proof reminders and past-due notices.'], ['Email Templates', '/admin/templates', 'Saved emails for Help Me Write and Insert Template.'], ['Customer Lists & Import', '/admin/lists', 'Check a customer list before importing it.'], ['Feedback Inbox', '/admin/feedback', 'Ideas and problems your team sent with Send Feedback.']],
  pricing: [['Pricing Engine', '/admin/pricing', 'Parts, templates, modifiers and a price check against CoreBridge.'], ['Modifier Prices', '/admin/modifier-prices', 'Prices for options like grommets, lamination and hardware.']],
  work: [['Workflow Builder', '/admin/workflow', 'Steps, owners, target days, business rules and hand-off & shipping.'], ['Set Up Workflow', '/setup/workflow', 'The Process Expert interview that builds your workflow.'], ['Stage Checklists', '/admin/checklists', 'What must be done before a project moves on.']],
  orders: [['Past Due', '/reports/past-due', 'Invoices past due and the reminders sent.'], ['Nightly Reconciliation', '/reports/reconciliation', 'Payments to key into CoreBridge by hand.']],
  cb: [['Connected Apps & Keys', '/admin/connections', 'CoreBridge, XPS, Clarity Voice and Fiserv keys, plus Parallel Mode.'], ['Import From CoreBridge', '/admin/import', 'History import progress (read-only).'], ['Moving Off CoreBridge', '/admin/migration', 'What still lives in CoreBridge and what has moved.'], ['Calls', '/calls', 'Every call from Clarity Voice, by team member.'], ['Change Log', '/log', 'Every change, with who made it and when.']],
};
const ATAB_DESC = { company: 'Business details printed on estimates, invoices and the customer order page.', sales: 'Keep-warm timing, goals and celebrations.', pricing: 'Deposits, fees, shipping charges and what prints on every estimate.', work: 'Proof rounds, reminders, stage time targets and quality control.', orders: 'What customers get from the order page and after an order is done.', cb: 'How SalesMax reads from CoreBridge. Writes stay off in the test copy.' };
function frow([k, label, type, , help, , extra], v) {
  const id = `f-${k}`;
  let input;
  if (type === 'bool') input = `<label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600"><input type="checkbox" id="${id}" name="${k}" ${v ? 'checked' : ''} style="width:20px;height:20px;accent-color:#1f6a43">${v ? 'On' : 'Off'}</label>`;
  else if (type === 'select') input = `<select id="${id}" name="${k}" style="font:inherit;font-size:13px;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px;background:#fff">${extra.map((x) => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
  else if (type === 'readonly') input = `<span id="${id}" style="font-size:11px;font-weight:700;border-radius:10px;padding:2px 9px;background:#eef1f5;color:#3d4658">${esc(v)}</span>`;
  else if (type === 'textarea') input = `<textarea id="${id}" name="${k}" rows="4" style="font:inherit;font-size:13px;width:100%;box-sizing:border-box;border:1px solid #d5dbe5;border-radius:8px;padding:8px">${esc(v)}</textarea>`;
  else input = `<input id="${id}" name="${k}" type="${type === 'number' ? 'number' : 'text'}" value="${esc(v)}" ${type === 'number' && extra ? `min="${extra[0]}" max="${extra[1]}"` : ''} style="font:inherit;font-size:13px;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 10px;box-sizing:border-box;width:${type === 'number' ? '120px' : '100%'}">`;
  return `<div style="display:grid;grid-template-columns:minmax(150px,1fr) minmax(0,2fr);gap:12px;align-items:${type === 'textarea' ? 'start' : 'center'};padding:10px 0;border-bottom:1px solid #eef1f5;font-size:13px"><span><label for="${id}" style="font-weight:600">${esc(label)}</label>${help ? `<span style="display:block;font-size:12px;color:#5a6478;line-height:1.4;margin-top:2px">${esc(help)}</span>` : ''}</span><span>${input}</span></div>`;
}

// Phil, Nov 13: every Admin section folds into a bar, closed by default, so it's easier to find what you need.
const CHEV = '<svg aria-hidden="true" class="acolchev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>';
export function collapseSections(html) {
  let out = '', i = 0;
  while (true) {
    const st = html.indexOf('<section', i);
    if (st < 0) { out += html.slice(i); break; }
    let depth = 0, j = st, end = -1;
    const re = /<section\b|<\/section>/g; re.lastIndex = st;
    for (let m; (m = re.exec(html));) { depth += m[0] === '</section>' ? -1 : 1; if (!depth) { end = m.index + 10; break; } }
    if (end < 0) { out += html.slice(i); break; }
    const sec = html.slice(st, end);
    const hm = /<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(sec);
    const title = hm ? hm[1].replace(/<span[^>]*>[\s\S]*?<\/span>|<button[\s\S]*?<\/button>|<details[\s\S]*?<\/details>/g, '').replace(/<[^>]+>/g, '').trim() : '';
    const pm = /<\/h2>[\s\S]{0,400}?<p\b[^>]*>([\s\S]*?)<\/p>/.exec(sec);
    const desc = pm ? pm[1].replace(/<[^>]+>/g, '').trim() : '';
    out += html.slice(i, st) + (title ? `<details class="acol"><summary><span class="acolt">${CHEV}<b>${title}</b>${desc ? `<span hidden> · </span><span class="acold">${desc}</span>` : ''}</span></summary>${sec}</details>` : sec);
    i = end;
  }
  return out;
}
const ACOL_CSS = '<style>details.acol{background:#ffffff;border:1px solid #e3e7ee;border-radius:12px}details.acol>summary{list-style:none;cursor:pointer;padding:14px 20px;min-height:52px;box-sizing:border-box;display:flex;align-items:center}details.acol>summary::-webkit-details-marker{display:none}details.acol>summary:hover{background:#f8f9fb;border-radius:12px}.acolt{display:grid;grid-template-columns:16px auto;column-gap:10px;align-items:center}.acolt b{font-size:16px;font-weight:700;color:#1b2436}.acold{grid-column:2;font-size:13px;color:#5a6478;line-height:1.45;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}.acolchev{color:#5a6478;transition:transform .15s}details.acol[open]>summary .acolchev{transform:rotate(90deg)}details.acol[open]>summary .acold{display:none}details.acol[open]>summary{border-bottom:1px solid #eef1f5;border-radius:12px 12px 0 0}details.acol>section{border:0!important;border-radius:0 0 12px 12px!important}details.acol>section>div:first-child h2,details.acol>section>h2:first-child,details.acol>section>div:first-child>div:first-child>h2{display:none!important}details.acol>section>div:first-child:has(>h2+.itip:last-child){display:none!important}details.acol>section>div:first-child h2+p,details.acol>section>div:first-child>div>h2+p{margin-top:0!important}</style>';
const ACOL_BAR = '<div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:-12px"><button type="button" data-acol="open" style="font:inherit;font-size:13px;font-weight:600;color:#1d4f91;background:transparent;border:0;cursor:pointer;min-height:32px;padding:0 6px">Expand All</button><button type="button" data-acol="close" style="font:inherit;font-size:13px;font-weight:600;color:#1d4f91;background:transparent;border:0;cursor:pointer;min-height:32px;padding:0 6px">Collapse All</button></div>';
export function settingsPage({ user, settings, tab = 'company', flash = '', error = '', extra = null, lists = {}, checklists = null, custom = [], cl = 'sales', apps = {}, seqs = null }) {
  const t = FIELDS[tab] ? tab : 'company';
  const s = { ...defaults(), ...settings };
  const list = FIELDS[t];
  const shown = list.filter((x) => !(t === 'work' && x[0].startsWith('target_')));
  const main = shown.filter((x) => !x[5]);
  const adv = shown.filter((x) => x[5]);
  const saved = s._savedAt?.[t];
  const changed = list.filter(([k, , type, d]) => type !== 'readonly' && s[k] !== d).length;
  const counts = Object.fromEntries(Object.keys(FIELDS).map((k) => [k, 1 + (ATAB_LINKS[k] || []).length + (k === 'company' ? 7 : k === 'sales' ? 6 : k === 'work' ? 3 : 0)]).map(([k, n]) => [k, ({ sales: 8, work: 9, pricing: 3, orders: 8, cb: 6 })[k] || n]));
  const savedTxt = saved ? `Saved ${new Date(saved).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'All changes saved';
  const std = { text: `${saved ? 'Settings saved' : 'Using the standard FASTSIGNS settings'} \u00b7 ${changed} changed from standard` };
  const chips = t === 'company' ? [{ text: '2 locations' }, { text: s.cbSync ? 'CoreBridge connected' : 'CoreBridge off' }, { text: 'Google Workspace not connected yet', warn: true }, std] : [std];
  const form = `<form method="post" action="/admin?tab=${t}"><div style="padding:6px 20px 12px;display:flex;flex-direction:column">${main.map((x) => frow(x, s[x[0]])).join('')}${adv.length ? `<details style="padding-top:8px"><summary style="cursor:pointer;font-size:13px;font-weight:600;color:#1d4f91;min-height:32px;display:flex;align-items:center">Advanced</summary>${adv.map((x) => frow(x, s[x[0]])).join('')}</details>` : ''}<div style="padding-top:12px"><button class="btn primary" style="min-height:40px">Save</button></div></div></form>`;
  const settingsCard = adminCard({ id: 'settings', title: t === 'company' ? 'Business Details' : `${ATAB_LABEL[t]} Settings`, desc: ATAB_DESC[t], body: form });
  const links = (ATAB_LINKS[t] || []).map(([l, h, d]) => `<a href="${h}" style="display:grid;grid-template-columns:minmax(150px,1fr) minmax(0,2fr) auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #eef1f5;font-size:13px;color:#1b2436;text-decoration:none"><span style="font-weight:600;color:#1d4f91">${esc(l)}</span><span style="color:#3d4658;line-height:1.45">${esc(d)}</span><span style="font-size:12px;font-weight:700;color:#1d4f91">Open →</span></a>`).join('');
  const linkCard = links ? adminCard({ title: t === 'company' ? 'People and Billing' : 'More Settings', desc: 'Each of these has its own page.', body: `<div style="padding:4px 20px 10px;display:flex;flex-direction:column">${links}</div>` }) : '';
  const locs = t === 'company' ? locationsCard({ locs: [{ name: s.companyName || 'FASTSIGNS of Northern Kentucky', dot: '#4fb3c9', here: true, conns: [['CoreBridge', s.cbSync ? 'Connected' : 'Off', !!s.cbSync], ['Google Workspace', 'Not connected yet', false], ['Phone', s.phone || 'Not set', s.phone ? true : null]] }, { name: 'Second location', dot: '#f2b84b', conns: [['CoreBridge', 'Needs its key', false], ['Google Workspace', 'Not connected yet', false]] }] }) : '';
  const sample = t === 'company' ? adminCard({ title: 'Sample Data', desc: 'Puts every sample task, board, customer note and approval back the way it started. Admin settings stay.', body: '<form method="post" action="/admin/reset-demo" style="padding:12px 20px 16px"><button class="btn">Reset Sample Data</button></form>' }) : '';
  const rs = (t === 'sales' || t === 'work') ? rulesSections(s, `/admin?tab=${t}`) : null;
  const sx = t === 'sales' ? salesExtras(extra, { tip: infoTip, seqs }) : null;
  const wx = t === 'work' ? workflowExtras(extra, { checklists, custom, clBoard: cl }) : null;
  const L = { ...LIST_DEFAULTS, ...(lists || {}) };
  const nv = (a) => `${(a || []).length} value${(a || []).length === 1 ? '' : 's'}`;
  const more = (a, n = 4) => (a || []).slice(0, n).join(', ') + ((a || []).length > n ? ` and ${(a || []).length - n} more` : '');
  const custLists = t === 'sales' ? adminCard({ title: 'Customer lists', desc: 'The choices used on customer records. Source replaces CoreBridge’s Origination type.', action: `<a href="/admin/lists" style="display:inline-flex;align-items:center;background:#fff;color:#1d4f91;border:1px solid #d5dbe5;border-radius:8px;padding:0 12px;min-height:36px;font-size:13px;font-weight:600;text-decoration:none">Edit Lists</a>`, body: adminRows([{ a: 'Source', b: more(L.source, 7), c: nv(L.source) }, { a: 'Industry', b: more(L.industry), c: nv(L.industry) }, { a: 'Customer type', b: more(L.ctype, 5), c: nv(L.ctype) }, { a: 'Tax-exempt reasons', b: more(L.taxExempt), c: nv(L.taxExempt) }, { a: 'Mark inactive after', b: `No orders or estimates for ${L.inactiveMonths} months, no open orders, no credit`, c: `${L.inactiveMonths} months`, tone: 'blue' }]) }) : '';
  const imp = t === 'sales' ? adminCard({ title: 'Import customers', desc: 'Bring in customers, extra locations and extra contacts from a spreadsheet. Used when a new location joins SalesMax.', action: `<a href="/admin/lists#import" style="display:inline-flex;align-items:center;background:#fff;color:#1d4f91;border:1px solid #d5dbe5;border-radius:8px;padding:0 12px;min-height:36px;font-size:13px;font-weight:600;text-decoration:none">Start an Import</a>`, body: adminRows(Object.values(IMPORT_KINDS).map(([a, b]) => ({ a, b, c: 'CSV' }))) }) : '';
  const px = t === 'pricing' ? pricingExtras(extra) : null;
  const ox = t === 'orders' ? ordersExtras(extra, { s, apps, lists }) : null;
  const cx = t === 'cb' ? connExtras(extra, { s, apps }) : null;
  const tabExtras = t === 'pricing' ? px.engine + px.machines : t === 'orders' ? ox.portal + ox.branding + ox.pocheck + ox.emails + ox.docs + ox.credit + ox.ordering : t === 'cb' ? cx.apps + cx.jobf + cx.trans + cx.how + cx.cbch : t === 'sales' ? sx.src + sx.lead + rs.warm + sx.seq + sx.book + custLists + imp : t === 'work' ? wx.boards + wx.rules + rs.stages + rs.reply + rs.hours + wx.cl + wx.permits + wx.tags + wx.css : '';
  const ADV = { sales: 'Prospect Claim Rules, Sales Settings, more pages', work: 'Proof rounds, quality control, more pages', pricing: 'Modifier Price List, deposits and fees, more pages', orders: 'Past-due reminders, completed-order email, more pages', cb: 'CoreBridge Sync, history import, more pages' };
  const tail = ADV[t] ? `<details style="background:#ffffff;border:1px solid #e3e7ee;border-radius:12px;padding:12px 20px"><summary style="cursor:pointer;font-size:14px;font-weight:700;min-height:32px;display:flex;align-items:center;gap:6px">Advanced <span style="font-weight:400;font-size:13px;color:#5a6478">· rarely changed: ${ADV[t]}</span></summary><div style="display:flex;flex-direction:column;gap:16px;padding:12px 0 4px">${t === 'pricing' ? px.mods : ''}${t === 'sales' ? sx.claim.replace(/^<details[^>]*>/, '<div>').replace(/<summary[\s\S]*?<\/summary>/, '').replace(/<\/details>$/, '</div>') : ''}${settingsCard}${linkCard}</div></details>` : '';
  const msg = error ? `<div class="note" role="alert" style="margin:0;background:#fbeaec;color:#8f2a34">${esc(error)}</div>` : '';
  const body = adminShell({ locName: s.companyName || 'FASTSIGNS of Northern Kentucky', cur: t, counts, chips, flash: flash || savedTxt, body: msg + ACOL_CSS + ACOL_BAR + collapseSections(locs + (t === 'company' ? companyExtras(extra, { locName: s.companyName || 'FASTSIGNS of Northern Kentucky', tip: infoTip }) : '') + tabExtras + (tail || settingsCard + linkCard) + sample) });
  return page({ title: 'Admin Settings', user, tab: '', body });
}
