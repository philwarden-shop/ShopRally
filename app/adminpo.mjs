// Admin › Pricing, Customer Page & Payments, and Connections sections from StageTargets.dc.html (Phil, Nov 13).
// Editable parts live in config "admin-extra". Connection statuses are real: read from saved-key status
// (never the key values) and from the admin settings, never copied from the mockup.
import { esc } from './views.mjs';

export const PO_CHECKS = [
  ['supplier', 'Supplier name', 'FASTSIGNS of Northern Kentucky (or the location on the order)'],
  ['address', 'Supplier address', 'Must match the location that took the order'],
  ['amount', 'Amount', 'Must equal the order total (allow ±$1.00). Checks the customer’s tax-exempt status first; a difference that is only the sales tax is never flagged'],
  ['billto', 'Bill-to / ship-to', 'Must match the customer on the order'],
  ['ponum', 'PO number', 'Copied to the order; warns if already used on another order'],
  ['expires', 'Expiration / not-to-exceed', 'Warns if the PO expires before the due date'],
];
export const NOTE_KEYS = [
  ['proof', 'Proof note', 'Under the proof'], ['approval', 'Approval note', 'Next to the Approve button'],
  ['payment', 'Payment note', 'Above the Pay button'], ['ready', 'Ready-date notes', 'Under the ready date'],
  ['thanks', 'Thank-you note', 'After the customer approves or pays'],
];
export const CB_CHANGES = [
  ['confirm', 'Ask to confirm before changing CoreBridge', 'Turn off once the team trusts it. Applies to new estimates, due dates and Built → Complete.'],
  ['dueDates', 'Allow salespeople to change product due dates', 'Design due and Production due on each product line.'],
  ['dragComplete', 'Allow dragging Built → Complete', 'Marks the hand-off in CoreBridge.'],
];
const CREDIT_ACT = ['Warn', 'Block'];

export function poDefaults() {
  return {
    machines: [
      { name: 'Roll to Roll', rate: 38, note: 'HP Latex · Standard profile', on: true },
      { name: 'Flatbed Printer', rate: 52, note: 'Standard profile', on: true },
      { name: 'Laminator', rate: 18, note: '', on: true },
      { name: 'Router', rate: 65, note: 'Router profile', on: true },
    ],
    portalNotes: {
      proof: 'Click anywhere on the proof to pin a comment. Colors on screen may look different from the printed sign.',
      approval: 'Approving starts production. Changes after approval may add cost and time.',
      payment: 'Orders under $2,500 are paid in full to start. Larger orders need a 50% deposit, with the balance due at completion.',
      ready: 'Stock materials: no note. Special-order materials: “uses [material] we order in especially for your job, so its date can move a little.” Finished products from a partner: “built at our partner production facility,” with no supplier named.',
      thanks: 'Thanks! We’ll email you when your order is ready.',
    },
    proofPolicy: 'What you see is what you get. Your first proof and one round of changes are free. Extra rounds may have a fee, so please send all your changes in one request. Changes or errors found after you approve may cost extra.',
    approvalChecks: ['Quantities', 'Sizes', 'Materials', 'Graphics', 'Colors', 'Text', 'Spelling', 'Placement'],
    approvalAll: true,
    poCheck: Object.fromEntries(PO_CHECKS.map(([k]) => [k, true])),
    credit: { grace: 10, inDefault: 'Warn', wouldExceed: 'Warn', over: 'Block', noTerms: 'Cash Customer' },
    jobFolders: { root: 'Shared drive › Job Folders', name: '{order number} · {customer} · {project}', artwork: 'Artwork', proofs: 'Artwork › Proofs', customer: 'Artwork › Raw Files & Downloads', print: 'Artwork › Print Files', survey: 'Artwork › Raw Files & Downloads › Site Survey' },
    transitionOn: false,
    transition: [],
    cbChanges: Object.fromEntries(CB_CHANGES.map(([k]) => [k, true])),
  };
}
const clean = (v, n) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, n);
const JF = [['root', 'Root folder'], ['name', 'Folder name'], ['artwork', 'Artwork folder (designers upload here)'], ['proofs', 'Proofs go to'], ['customer', 'Customer files go to'], ['print', 'Print-ready files go to'], ['survey', 'Site survey photos go to']];

export function mergePo(x, f) {
  switch (f.do) {
    case 'machine': {
      const name = clean(f.name, 40), rate = Number(f.rate);
      if (name.length < 2) throw new Error('name the machine');
      if (!Number.isFinite(rate) || rate <= 0 || rate > 1000) throw new Error('cost per hour must be $1 to $1,000');
      if (x.machines.some((m) => m.name.toLowerCase() === name.toLowerCase())) throw new Error('that machine is already here');
      if (x.machines.length >= 40) throw new Error('up to 40 machines');
      x.machines = [...x.machines, { name, rate: Math.round(rate * 100) / 100, note: clean(f.note, 60), on: true }];
      return { x, msg: `${name} added.` };
    }
    case 'machinetoggle': { const i = Number(f.i); if (!x.machines[i]) throw new Error('that machine is not here'); x.machines = x.machines.map((m, n) => (n === i ? { ...m, on: !m.on } : m)); return { x, msg: `${x.machines[i].name} is ${x.machines[i].on ? 'active' : 'off'}.` }; }
    case 'portalnotes':
      x.portalNotes = Object.fromEntries(NOTE_KEYS.map(([k]) => [k, String(f[`note_${k}`] ?? x.portalNotes[k] ?? '').trim().slice(0, 600)]));
      return { x, msg: 'Notes customers see are saved.' };
    case 'approval': {
      let list = x.approvalChecks.map((t, n) => clean(f[`ac_${n}`] ?? t, 60)).filter((t, n) => t && String(f.del) !== String(n));
      const nn = clean(f.ac_new, 60); if (nn) list.push(nn);
      list = [...new Set(list)].slice(0, 15);
      if (!list.length) throw new Error('keep at least one checklist item');
      x.approvalChecks = list; x.approvalAll = f.all === 'on';
      x.proofPolicy = String(f.policy ?? x.proofPolicy).trim().slice(0, 600);
      return { x, msg: f.del != null && f.del !== '' ? 'Checklist item removed.' : 'Approval checklist saved.' };
    }
    case 'pocheck': x.poCheck = Object.fromEntries(PO_CHECKS.map(([k]) => [k, f[`po_${k}`] === 'on'])); return { x, msg: 'Customer PO check saved.' };
    case 'credit': {
      const g = Number(f.grace);
      if (!Number.isInteger(g) || g < 0 || g > 90) throw new Error('grace period must be 0 to 90 days');
      const pick = (v, d) => (CREDIT_ACT.includes(v) ? v : d);
      x.credit = { grace: g, inDefault: pick(f.inDefault, x.credit.inDefault), wouldExceed: pick(f.wouldExceed, x.credit.wouldExceed), over: pick(f.over, x.credit.over), noTerms: clean(f.noTerms, 30) || 'Cash Customer' };
      return { x, msg: 'Credit rules saved.' };
    }
    case 'jobfolders': x.jobFolders = Object.fromEntries(JF.map(([k]) => [k, clean(f[`jf_${k}`] ?? x.jobFolders[k], 120) || x.jobFolders[k]])); return { x, msg: 'Job folder names saved.' };
    case 'transition': x.transitionOn = !x.transitionOn; return { x, msg: `Transition backup is ${x.transitionOn ? 'on' : 'off'}.` };
    case 'transadd': {
      const name = clean(f.name, 40);
      if (name.length < 2) throw new Error('enter the person’s name');
      if (x.transition.some((t) => t.name.toLowerCase() === name.toLowerCase())) throw new Error('that person is already on the list');
      if (x.transition.length >= 30) throw new Error('up to 30 people');
      x.transition = [...x.transition, { name, since: new Date().toISOString().slice(0, 10) }];
      return { x, msg: `${name} still works from CoreBridge for now.` };
    }
    case 'transdel': { const i = Number(f.i); if (!x.transition[i]) throw new Error('that person is not on the list'); const n = x.transition[i].name; x.transition = x.transition.filter((_, k) => k !== i); return { x, msg: `${n} switched over to SalesMax.` }; }
    case 'cbchanges': x.cbChanges = Object.fromEntries(CB_CHANGES.map(([k]) => [k, f[`cb_${k}`] === 'on'])); return { x, msg: 'CoreBridge change rules saved. Writes to CoreBridge stay off until the owner turns them on.' };
    default: return null;
  }
}

const CARD = 'background:#ffffff;border:1px solid #e3e7ee;border-radius:12px';
const SAVE = 'font:inherit;font-size:13px;font-weight:700;color:#ffffff;background:#a8343f;border:0;border-radius:8px;padding:0 14px;min-height:36px;cursor:pointer';
const LINKBTN = 'display:inline-flex;align-items:center;background:#fff;color:#1d4f91;border:1px solid #d5dbe5;border-radius:8px;padding:0 12px;min-height:36px;font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap';
const ADD = 'font:inherit;font-size:13px;font-weight:600;color:#1d4f91;background:#ffffff;border:1px dashed #9db7dc;border-radius:8px;padding:0 12px;min-height:36px;cursor:pointer;list-style:none;display:inline-flex;align-items:center';
const IN = 'font:inherit;font-size:13px;min-height:34px;border:1px solid #d5dbe5;border-radius:8px;padding:0 10px;min-width:0;box-sizing:border-box';
const SEL = 'font:inherit;font-size:13px;min-height:34px;border:1px solid #d5dbe5;border-radius:8px;background:#fff';
const TONE = { green: ['#e6f2ec', '#1f6a43'], blue: ['#e8f0fb', '#1d4f91'], amber: ['#fdf3dc', '#7a4e00'], red: ['#fbeaec', '#8f2a34'], gray: ['#eef1f5', '#3d4658'] };
const pill = (t, tone = 'gray') => { const [bg, fg] = TONE[tone]; return `<span style="font-size:11px;font-weight:700;border-radius:10px;padding:2px 9px;background:${bg};color:${fg};white-space:nowrap">${esc(t)}</span>`; };
const row = (a, b, c) => `<div style="display:grid;grid-template-columns:minmax(150px,1fr) minmax(0,2fr) auto;gap:12px;align-items:center;padding:8px 0;border-bottom:1px solid #eef1f5;font-size:13px"><span style="font-weight:600">${a}</span><span style="color:#3d4658;line-height:1.45">${b}</span>${c || '<span></span>'}</div>`;
const head = (id, title, desc, action = '', badge = '') => `<div style="padding:16px 20px;border-bottom:1px solid #e3e7ee;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end"><div style="flex:1 1 420px"><h2 id="${id}" style="margin:0;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;flex-wrap:wrap">${esc(title)}${badge}</h2><p style="margin:4px 0 0;font-size:13px;color:#5a6478;line-height:1.5">${esc(desc)}</p></div>${action}</div>`;
const sec = (id, inner, extra = '') => `<section aria-labelledby="${id}" style="${CARD}${extra}">${inner}</section>`;
const rows = (inner, foot = '') => `<div style="padding:6px 20px 12px;display:flex;flex-direction:column">${inner}${foot ? `<div style="font-size:12px;color:#5a6478;padding-top:8px">${foot}</div>` : ''}</div>`;
const merge = (x0) => { const d = poDefaults(); const x = { ...d, ...(x0 || {}) }; x.portalNotes = { ...d.portalNotes, ...(x.portalNotes || {}) }; x.poCheck = { ...d.poCheck, ...(x.poCheck || {}) }; x.credit = { ...d.credit, ...(x.credit || {}) }; x.jobFolders = { ...d.jobFolders, ...(x.jobFolders || {}) }; x.cbChanges = { ...d.cbChanges, ...(x.cbChanges || {}) }; return x; };

function formFor(back, go) { return (d, inner, attrs = ' style="margin:0"') => `<form method="post" action="/admin/extra?back=${encodeURIComponent(back)}"${attrs}><input type="hidden" name="do" value="${d}"><input type="hidden" name="go" value="${go}">${inner}</form>`; }

export function pricingExtras(x0, { back = '/admin?tab=pricing' } = {}) {
  const x = merge(x0);
  const form = formFor(back, 'machines-h');
  const engine = sec('pe-h', head('pe-h', 'Price List and Pricing Engine', 'Parts, templates and modifiers used by Build Estimate, with a price check against CoreBridge. Prices are set in SalesMax; a nightly check flags any part changed in CoreBridge.', `<a href="/admin/pricing" style="${LINKBTN}">Open Pricing Engine</a>`));
  const list = x.machines.map((m, i) => row(esc(m.name), `$${esc(m.rate)}/hr${m.note ? ' · ' + esc(m.note) : ''}`, form('machinetoggle', `<input type="hidden" name="i" value="${i}"><button aria-label="Turn ${esc(m.name)} ${m.on ? 'off' : 'on'}" style="font:inherit;border:0;background:transparent;cursor:pointer;padding:0">${pill(m.on ? 'Active' : 'Off', m.on ? 'green' : 'gray')}</button>`))).join('');
  const add = `<details style="position:relative"><summary style="${ADD}">+ Add Machine</summary><div style="position:absolute;right:0;top:42px;z-index:20;width:280px;background:#fff;border:1px solid #e3e7ee;border-radius:10px;box-shadow:0 12px 32px rgba(22,33,58,.18);padding:12px">${form('machine', `<label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600">Machine<input name="name" required style="${IN}"></label><label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;margin-top:8px">Cost per hour ($)<input name="rate" inputmode="decimal" required style="${IN}"></label><label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;margin-top:8px">Profile or note<input name="note" placeholder="Standard profile" style="${IN}"></label><button style="${SAVE};margin-top:10px">Add Machine</button>`)}</div></details>`;
  const machines = sec('machines-h', head('machines-h', 'Machines', 'Each machine’s cost per hour and profiles (setup, waste, labor %), used by parts priced by machine.', add) + rows(list, 'Daily available hours and calendar scheduling: later release.'));
  const mods = sec('modp-h', head('modp-h', 'Modifier Price List', 'Prices for options like grommets, lamination and hardware, with suggested prices to review.', `<a href="/admin/modifier-prices" style="${LINKBTN}">Open Modifier Prices</a>`));
  return { engine, machines, mods };
}

export function ordersExtras(x0, { back = '/admin?tab=orders', s = {}, apps = {}, lists = {} } = {}) {
  const x = merge(x0);
  const fiserv = apps.cardpointe;
  const proc = [['Fiserv', 'CardPointe · card and eCheck · your current merchant account', fiserv ? 'Keys saved' : 'Needs keys', fiserv ? '#1f6a43' : '#874511', '/admin/connections#cardpointe'], ['Authorize.net', 'Card and ACH', 'Later', '#5a6478', ''], ['Stripe', 'Card, ACH, Apple Pay', 'Later', '#5a6478', ''], ['Square', 'Card', 'Later', '#5a6478', '']];
  const procHtml = proc.map(([n, h, st, c, href], i) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border:1px solid ${i === 0 ? (fiserv ? '#b9dcc8' : '#f0d6b3') : '#e3e7ee'};border-radius:10px;padding:10px 12px"><span><span style="display:block;font-size:14px;font-weight:600">${n}</span><span style="font-size:12px;color:#5a6478">${h}</span></span>${href ? `<a href="${href}" style="font-size:12px;font-weight:700;color:${c};white-space:nowrap;text-decoration:none">${st}${fiserv ? '' : ' →'}</a>` : `<span style="font-size:12px;font-weight:700;color:${c};white-space:nowrap">${st}</span>`}</div>`).join('');
  const dep = Number(s.depositPct ?? 50), fee = Number(s.cardFeePct ?? 3);
  const rules = [
    ['Deposit', `${dep}% deposit before production, balance at completion · term customers (Net 15/30): PO instead · change it under Pricing`],
    ['Credit card surcharge', `${fee}% on card payments · shown on estimates, invoices and the payment pop-up`],
    ['eCheck', 'On · no fee'],
    ['Price changes from proof revisions', `Customer approves any change over $${esc(s.priceApprovalThreshold ?? 25)}`],
    ['Proof reminders', `After ${esc(s.proofReminderDays ?? 2)} days, until approved`],
    ['Online estimate approval', 'On · converts to an order in CoreBridge once writes are turned on'],
    ['Link address', 'Test copy address · your own address (orders.fastsignsnky.com) is set up later'],
    ['Logo and colors', esc(s.companyName || 'FASTSIGNS of Northern Kentucky')],
  ].map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:13px;border-bottom:1px solid #eef1f5;padding:6px 0"><span style="color:#5a6478">${k}</span><span style="font-weight:600;text-align:right">${v}</span></div>`).join('');
  const formN = formFor(back, 'portal-h');
  const notes = formN('portalnotes', `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">${NOTE_KEYS.map(([k, l, w]) => `<label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#3d4658">${l}<span style="font-weight:400;color:#5a6478">${w}</span><textarea name="note_${k}" rows="2" style="font:inherit;font-size:13px;font-weight:400;color:#1b2436;border:1px solid #d5dbe5;border-radius:8px;padding:8px 10px;resize:vertical;line-height:1.45">${esc(x.portalNotes[k])}</textarea></label>`).join('')}</div><div style="padding-top:10px"><button style="${SAVE}">Save Notes</button></div>`);
  const appr = formN('approval', `<div style="display:flex;flex-direction:column;gap:6px;max-width:640px;background:#f8f9fb;border-radius:10px;padding:10px 12px"><div style="font-size:13px;font-weight:600">Price Changes From Proof Revisions</div><div style="font-size:13px;color:#3d4658">If a change raises the price by less than <b>$${esc(s.priceApprovalThreshold ?? 25)}</b>, the estimate updates quietly. At or above it, the customer must click “Approve New Price” on the order page before work continues. <a href="/admin?tab=pricing#settings" style="color:#1d4f91;font-weight:600">Change the amount</a></div></div>
<label style="display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;max-width:640px">Proof policy (shown above the checklist)<textarea name="policy" rows="3" style="font:inherit;font-size:13px;font-weight:400;line-height:1.45;border:1px solid #d5dbe5;border-radius:8px;padding:8px 10px;resize:vertical">${esc(x.proofPolicy)}</textarea><span style="font-size:11px;font-weight:400;color:#5a6478">Keep it short; it sits in a small box next to the proof.</span></label>
<div style="font-size:13px;font-weight:600">Checklist items (“I checked the…”)</div><ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;max-width:640px">${x.approvalChecks.map((t, n) => `<li style="display:flex;align-items:center;gap:8px"><span aria-hidden="true" style="color:#9aa6bd;font-size:14px">⋮⋮</span><input name="ac_${n}" value="${esc(t)}" aria-label="Checklist item ${n + 1}" style="${IN};flex:1 1 auto"><button name="del" value="${n}" aria-label="Remove ${esc(t)}" style="font:inherit;width:36px;height:36px;border:0;border-radius:8px;background:transparent;color:#5a6478;font-size:18px;cursor:pointer">×</button></li>`).join('')}<li style="display:flex;align-items:center;gap:8px"><span aria-hidden="true" style="color:#1d4f91;font-weight:700;width:14px">+</span><input name="ac_new" placeholder="Add Item" aria-label="New checklist item" style="${IN};flex:1 1 auto"><span style="width:36px"></span></li></ol>
<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap"><label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#3d4658"><input type="checkbox" name="all"${x.approvalAll ? ' checked' : ''} style="width:16px;height:16px;accent-color:#a8343f">Every item must be ticked before Approve works</label><button style="${SAVE}">Save Approval Checklist</button></div>`, ' style="margin:0;display:flex;flex-direction:column;gap:10px"');
  const portal = sec('portal-h', head('portal-h', 'Customer Order Page and Payments', 'What customers see when they open an estimate, proof or invoice link.') + `<div class="po2" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr))"><div style="padding:14px 20px;display:flex;flex-direction:column;gap:10px;border-right:1px solid #e3e7ee"><h3 style="margin:0;font-size:14px;font-weight:700">Payment Processor</h3>${procHtml}<div style="font-size:12px;color:#5a6478;line-height:1.45">Paste your processor’s keys once; card details are entered on the processor’s secure form and never stored in SalesMax. Each payment goes on the daily list to key into CoreBridge.</div></div><div style="padding:14px 20px;display:flex;flex-direction:column;gap:10px"><h3 style="margin:0;font-size:14px;font-weight:700">Rules and Look</h3>${rules}<a href="/admin/preview-order-page" style="font-size:13px;font-weight:600;color:#1d4f91;text-decoration:none">Preview the Customer Page →</a></div></div><div style="border-top:1px solid #e3e7ee;padding:14px 20px;display:flex;flex-direction:column;gap:10px"><div><h3 style="margin:0;font-size:14px;font-weight:700">Notes Customers See</h3><p style="margin:2px 0 0;font-size:12px;color:#5a6478">Short messages on the customer order page. Leave one blank to hide it.</p></div>${notes}</div><div style="border-top:1px solid #e3e7ee;padding:14px 20px;display:flex;flex-direction:column;gap:10px"><div><h3 style="margin:0;font-size:14px;font-weight:700">Approval Checklist</h3><p style="margin:2px 0 0;font-size:12px;color:#5a6478">What customers tick before they can approve a proof.</p></div>${appr}</div><style>@media (max-width:760px){.po2{grid-template-columns:1fr!important}.po2>div{border-right:0!important}}</style>`);

  const branding = sec('brand-h', head('brand-h', 'Branding', 'Your logo and name on the customer order page, estimates, invoices, packing slips and customer emails. Upload once; every document and page uses it.', `<a href="/admin?tab=company#settings" style="${LINKBTN}">Edit Business Details</a>`) + rows([
    row('Company logo', 'PNG or SVG, wide format (about 600 × 150). Uploads go to Google Drive once it’s connected', pill('Not yet', 'amber')),
    row('Small logo / icon', 'Square, for phone screens and email headers', pill('Not yet', 'amber')),
    row('Business name', esc(s.companyName || 'FASTSIGNS of Northern Kentucky'), pill('Set', 'green')),
    row('Per location', 'Each location can have its own logo and name (for your second store)', pill('Later')),
  ].join('')));

  const formP = formFor(back, 'pocheck-h');
  const pocheck = sec('pocheck-h', head('pocheck-h', 'Customer PO check', 'When a customer emails a PO, SalesMax saves it to the job folder under Customer Info and checks it automatically. Anything that doesn’t match flags the order and gives the salesperson a task to contact the order contact.') + formP('pocheck', rows(PO_CHECKS.map(([k, a, b]) => row(`<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="po_${k}"${x.poCheck[k] ? ' checked' : ''} style="width:16px;height:16px;accent-color:#a8343f">${a}</label>`, esc(b), pill(x.poCheck[k] ? 'On' : 'Off', x.poCheck[k] ? 'green' : 'gray'))).join('') + `<div style="padding-top:10px"><button style="${SAVE}">Save PO Check</button></div>`)));

  const emails = sec('cem-h', head('cem-h', 'Customer emails', 'The automatic emails with their subjects, wording and fill-in fields ({contact first name}, {order number}, {portal link}, {salesperson}). Each one stays off until you review it; nothing is sent to customers from the test copy.', `<a href="/admin/templates" style="${LINKBTN}">Edit Emails</a>`) + rows([
    ['New estimate', 'When an estimate is ready for approval'], ['Estimate follow-ups #1 and #2', 'With PDF, 3 and 7 days after sending'], ['New order · Invoice', 'When an order is created; when an invoice is sent'], ['Action needed', 'When a product needs something from the customer'], ['Proof available · Proof follow-ups #1 and #2', 'When a proof is sent; reminders until approved'], ['Order built', 'When everything is built'], ['Order completed · Invoice + review request', `Sent when the order is marked Complete: ${esc(s.completedEmail || 'Invoice + review request')}`], ['Payment due', '5 days before the due date'], ['Statements · Customer login · Multiple invoices · Credit memos', 'Monthly statement, statement on demand, portal login, invoice bundles, credit memos'],
  ].map(([a, b]) => row(a, b, pill('Review', 'amber'))).join(''), 'Send from: the salesperson’s address (replies go to them), or the location’s address.'));

  const docs = sec('edoc-h', head('edoc-h', 'Estimate and invoice documents', 'Templates and text for the PDFs and the order page.', `<a href="/admin/templates" style="${LINKBTN}">Edit Templates</a>`) + rows([
    ['Estimate', 'Title ESTIMATE · “THIS IS NOT AN INVOICE” + next steps, payment terms, timelines, proofs'], ['Invoice', 'Payment instructions (ACH, checks payable to…, remittance email) · transactions with surcharge'], ['Statement · Credit memo', 'Monthly statement · credit memo'], ['Header and footer', `Location address in the header · ${s.estimateNotes ? 'footer: ' + esc(String(s.estimateNotes).slice(0, 60)) : 'footer text 1 and 2'}`],
  ].map(([a, b]) => row(a, b, pill('Set', 'green'))).join('')));

  const formC = formFor(back, 'credit-h');
  const sel = (n, v) => `<select name="${n}" style="${SEL}">${CREDIT_ACT.map((o) => `<option${o === v ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
  const credit = sec('credit-h', head('credit-h', 'Credit rules', 'Checked whenever an estimate is approved or an order is sent.') + formC('credit', rows([
    row('Grace period', 'Days past terms before an account is in default', `<label style="display:flex;gap:6px;align-items:center;font-size:13px"><input name="grace" inputmode="numeric" value="${esc(x.credit.grace)}" aria-label="Grace period days" style="${IN};width:64px">days</label>`),
    row('Account in default', 'Warn the salesperson · or block until it’s brought current', sel('inDefault', x.credit.inDefault)),
    row('Order would go over the limit', 'Warn · or require payment of the amount over', sel('wouldExceed', x.credit.wouldExceed)),
    row('Already over the limit', 'Warn · or require the overage be paid first', sel('over', x.credit.over)),
    row('Customers without terms', 'Shown as', `<input name="noTerms" value="${esc(x.credit.noTerms)}" aria-label="Label for customers without terms" style="${IN};width:150px">`),
  ].join('') + `<div style="padding-top:10px"><button style="${SAVE}">Save Credit Rules</button></div>`)));

  const L = lists || {};
  const ordering = sec('olist-h', head('olist-h', 'Ordering lists and defaults', 'Choices and defaults used on estimates and orders.', `<a href="/admin/lists" style="${LINKBTN}">Edit Lists</a>`) + rows([
    row('Product categories', 'A-Frame, ADA, Banners, Channel Letters, Monument, Vehicle Graphics, Wall / Window Graphics and more · from the CoreBridge catalog', pill('From CoreBridge', 'blue')),
    row('Cancel and lost reasons', esc((L.lost || ['Price', 'Timing', 'Went elsewhere', 'No response', 'Budget cut', 'Custom']).join(', ')), pill(`${(L.lost || [1, 2, 3, 4, 5, 6]).length}`)),
    row('Reorder defaults', 'Update to current prices · keep proofs and notes · current salesperson · remove discounts', pill('Set', 'green')),
    row('Due dates', 'Estimate follow-up after 3 days · recalculate the due date when a proof is approved', pill('On', 'green')),
    row('Payment types', 'Card, eCheck (order page) · Check, Cash, ACH, Wire, Trade (recorded by hand)', pill('7')),
  ].join('')));
  return { portal, branding, pocheck, emails, docs, credit, ordering };
}

export const SYNC_ROWS = [
  ['Customer or contact added or edited', 'Saved in SalesMax and matched to (or created in) CoreBridge. Edits made in CoreBridge come back within minutes.', 'Both ways', '#1d4f91'],
  ['Estimate drafted, priced, edited', 'Lives only in SalesMax until the customer approves. Prices come from the SalesMax price list.', 'SalesMax only', '#5a6478'],
  ['Customer approves', 'The finished order is created in CoreBridge at SalesMax’s prices, then read back and checked line by line. Any deposit paid goes with it.', 'SalesMax → CoreBridge', '#1f6a43'],
  ['Price changes after approval', 'The CoreBridge order is voided and re-sent with the new price, after a manager’s OK. Other changes never void an order.', 'SalesMax → CoreBridge', '#1f6a43'],
  ['Order entered directly in CoreBridge', 'Imported (webhook), with its production summary, and placed on the Design and Production boards.', 'CoreBridge → SalesMax', '#874511'],
  ['Design and production steps', 'Tracked only in SalesMax. CoreBridge sees WIP, then Built when every item is built, then Complete at hand-off.', 'SalesMax → CoreBridge', '#1f6a43'],
  ['Hand-offs (pickup, install, delivery, ship)', 'Set in SalesMax and sent as the order’s destinations.', 'SalesMax → CoreBridge', '#1f6a43'],
  ['Order page payment (card or eCheck)', 'Taken through Fiserv in SalesMax. Listed on the daily offline-payment list; ticked off automatically when it shows up in CoreBridge.', 'Daily list', '#1f6a43'],
  ['Permit fees added', 'Shown on the SalesMax invoice and added to the daily list for CoreBridge.', 'Daily list', '#1f6a43'],
  ['Parts, prices and modifiers', 'Set in SalesMax. A nightly check flags any part whose price was changed in CoreBridge.', 'Nightly check', '#5a6478'],
  ['Estimates, invoices and customer emails', 'Made and sent by SalesMax. CoreBridge’s automatic customer emails are turned off.', 'SalesMax only', '#5a6478'],
];

export function connExtras(x0, { back = '/admin?tab=cb', s = {}, apps = {} } = {}) {
  const x = merge(x0);
  const ok = (b, yes, no = 'Needs setup') => (b ? [yes, 'green'] : [no, 'amber']);
  const list = [
    ['CoreBridge', 'Orders, customers, payments sync · read-only in the test copy', ok(s.cbSync !== false, 'Reading', 'Off')],
    ['Google Workspace', 'Gmail, Calendar, Drive job folders', ['Needs setup', 'amber']],
    ['Gmail (shared inbox)', 'Email in, email out, archiving', ['Needs setup', 'amber']],
    ['Google Drive', 'Job folders and files', ['Needs setup', 'amber']],
    ['Google Calendar', 'Booking links and meetings', ['Needs setup', 'amber']],
    ['Google Business Profile', 'Business hours and holidays', ['Needs setup', 'amber']],
    ['Fiserv CardPointe', 'Card and eCheck payments on the order page', ok(apps.cardpointe, 'Keys saved', 'Needs keys')],
    ['Clarity Voice', 'Calls, voicemails, click-to-call', ok(apps.clarity, 'Keys saved', 'Needs keys')],
    ['XPS shipping', 'Shipping labels and tracking', ok(apps.xps, 'Keys saved', 'Needs keys')],
    ['Google Chat', 'DMs and @mentions in Activities · hidden there until connected', ['Needs setup', 'amber']],
    ['Slack', 'DMs and @mentions in Activities · hidden there until connected', ['Needs setup', 'amber']],
    ['Custom domain', 'orders.fastsignsnky.com · emails sent as the salesperson', ['Later', 'gray']],
    ['QuickBooks Online', 'Accounting sync (today through CoreBridge)', ['Later', 'gray']],
    ['Avalara', 'Automatic sales tax', ['Later', 'gray']],
    ['Google reviews', 'Your current review process stays as is', ['No change', 'gray']],
  ];
  const apps2 = sec('apps-h', head('apps-h', 'Connected Apps', 'Everything SalesMax talks to, in one place. Anything not connected is hidden everywhere else in SalesMax (its filter, messages and buttons).', `<a href="/admin/connections" style="${LINKBTN}">+ Connect a Service</a>`) + rows(list.map(([a, b, [t, tone]]) => row(esc(a), esc(b), pill(t, tone))).join(''), 'Keys are saved in AWS and only the last 4 characters are ever shown.'));

  const formJ = formFor(back, 'jobf-h');
  const jobf = sec('jobf-h', head('jobf-h', 'Job folders (Google Drive)', 'Where SalesMax files everything for a job. Every job folder is named with the CoreBridge order number, so it matches the order on screen. Boards and pop-ups upload straight into these folders.', '', pill('Drive not connected yet', 'amber')) + formJ('jobfolders', rows(JF.map(([k, l]) => row(l, `<input name="jf_${k}" value="${esc(x.jobFolders[k])}" aria-label="${l}" style="${IN};width:100%">`, '')).join('') + `<div style="padding-top:10px"><button style="${SAVE}">Save Folder Names</button></div>`)));

  const formT = formFor(back, 'trans-h');
  const tRows = x.transition.map((t, i) => row(esc(t.name), 'Still sends their estimates and proofs from CoreBridge. SalesMax won’t send estimate or proof pages for their projects, but imports their estimates and orders and follows the CoreBridge status so Production can run them in SalesMax.', `<span style="display:flex;gap:6px;align-items:center">${pill('Until they switch', 'amber')}${formT('transdel', `<input type="hidden" name="i" value="${i}"><button style="font:inherit;font-size:12px;font-weight:600;color:#1d4f91;background:transparent;border:0;cursor:pointer;min-height:28px">Switched</button>`)}</span>`)).join('');
  const tAdd = `<details style="position:relative"><summary style="${ADD}">+ Add Person</summary><div style="position:absolute;right:0;top:42px;z-index:20;width:260px;background:#fff;border:1px solid #e3e7ee;border-radius:10px;box-shadow:0 12px 32px rgba(22,33,58,.18);padding:12px">${formT('transadd', `<label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600">Who still works from CoreBridge<input name="name" required style="${IN}"></label><button style="${SAVE};margin-top:10px">Add Person</button>`)}</div></details>`;
  const trans = sec('trans-h', head('trans-h', 'Transition Period', 'Backup plan only, off unless needed. Temporary while the team moves from CoreBridge to SalesMax. SalesMax is the source of truth; these exceptions keep the two systems from doubling up. Remove each one when that person switches over.', `<div style="display:flex;gap:8px;align-items:center">${formT('transition', `<button style="${LINKBTN};cursor:pointer;font:inherit;font-size:13px;font-weight:600">${x.transitionOn ? 'Turn Backup Off' : 'Turn Backup On'}</button>`)}${tAdd}</div>`, pill(x.transitionOn ? 'Backup · on' : 'Backup · off', 'amber')) + rows(tRows + row('Invoices when Complete', 'SalesMax sends the invoice (with Pay link and review request) to every customer, including theirs. Turn off CoreBridge’s automatic invoice email so customers don’t get two.', pill('Action in CoreBridge', 'red')), 'Ends when the last person switches over.'));

  const how = sec('how-h', head('how-h', 'How SalesMax and CoreBridge Work Together', 'Everything below happens behind the scenes. Your team works in SalesMax; CoreBridge keeps accounting and the order record. In the test copy nothing is written to CoreBridge.') + `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:700px"><thead><tr style="text-align:left;font-size:11px;letter-spacing:.4px;color:#5a6478"><th scope="col" style="padding:8px 20px;border-bottom:1px solid #e3e7ee">WHEN</th><th scope="col" style="padding:8px 12px;border-bottom:1px solid #e3e7ee">WHAT HAPPENS</th><th scope="col" style="padding:8px 20px;border-bottom:1px solid #e3e7ee">DIRECTION</th></tr></thead><tbody>${SYNC_ROWS.map(([w, h, d, c]) => `<tr><td style="padding:9px 20px;border-bottom:1px solid #eef1f5;font-weight:600;vertical-align:top;width:220px">${esc(w)}</td><td style="padding:9px 12px;border-bottom:1px solid #eef1f5;line-height:1.45">${esc(h)}</td><td style="padding:9px 20px;border-bottom:1px solid #eef1f5;white-space:nowrap;color:${c};font-weight:600;vertical-align:top">${esc(d)}</td></tr>`).join('')}</tbody></table></div>`);

  const formB = formFor(back, 'cbch-h');
  const cbch = sec('cbch-h', `<div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px"><h2 id="cbch-h" style="margin:0;font-size:16px;font-weight:700">Changes to CoreBridge</h2><p style="margin:0;font-size:13px;color:#874511;background:#fdf3dc;border-radius:8px;padding:8px 10px">Writes to CoreBridge are off in the test copy. These rules apply only after the owner turns writes on.</p>${formB('cbchanges', `${CB_CHANGES.map(([k, l, h]) => `<label style="display:flex;align-items:flex-start;gap:10px;padding:6px 0"><input type="checkbox" name="cb_${k}"${x.cbChanges[k] ? ' checked' : ''} style="width:18px;height:18px;margin-top:2px;accent-color:#a8343f"><span><b style="font-size:14px;display:block">${l}</b><span style="font-size:13px;color:#5a6478">${h}</span></span></label>`).join('')}<div style="padding-top:6px"><button style="${SAVE}">Save CoreBridge Rules</button></div>`)}</div>`);
  return { apps: apps2, jobf, trans, how, cbch };
}
