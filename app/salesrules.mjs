// Admin > Sales Rules (stage time targets, reply time targets, business hours, keep-warm rules) and
// Admin > Customer Lists (choice lists + Import Customers CSV check). Saved in admin-settings / customer-lists.
import { page, esc } from './views.mjs';

export const STAGES = [
  ['prospect', 'Prospect', 'Until an estimate is created', 14, 'Prospect is added'],
  ['estimate', 'Estimate', 'Until the customer approves', 7, 'Estimate is sent'],
  ['design', 'Design', 'Per product line', 2, 'Line enters Design'],
  ['progress', 'Production · in-house', 'Per product line', 4, 'Line enters Production'],
  ['vendor', 'Production · vendor', 'Per product line', 10, 'Line enters Production'],
  ['built', 'Built', 'Until hand-off', 2, 'Every line is Built'],
  ['complete', 'Complete', 'Until paid in full', 30, 'Order is handed off'],
];
export const REPLY = [
  ['lead', 'New lead or quote request', 'From someone who isn’t a customer yet', 1, 'hours'],
  ['customer', 'Customer email', 'Linked to a customer or project', 4, 'hours'],
  ['proof', 'Proof questions or changes', 'Replies to a proof or on the order page', 2, 'hours'],
  ['voicemail', 'Voicemail', 'Missed calls with a message', 2, 'hours'],
  ['chat', 'Slack or Google Chat mention', 'DMs and @mentions', 2, 'hours'],
  ['vendor', 'Vendor email', 'Suppliers and subcontractors', 1, 'days'],
];
export const REASONS = [['news', 'News about the company or contact'], ['social', 'Their public LinkedIn and company posts'], ['similar', 'Similar projects for other customers (names hidden)'], ['seasonal', 'Seasonal and new sign ideas that fit their business']];
export const HOURS = [['Mon', '8:00 AM – 5:00 PM'], ['Tue', '8:00 AM – 5:00 PM'], ['Wed', '8:00 AM – 5:00 PM'], ['Thu', '8:00 AM – 5:00 PM'], ['Fri', '8:00 AM – 5:00 PM'], ['Sat', 'Closed'], ['Sun', 'Closed']];
export const LIST_DEFAULTS = {
  source: ['Book of Business', 'Referral', 'Walk-in', 'Drive-by', 'Website', 'Networking', 'Trade show'],
  industry: ['Accountants', 'Dental / Medical', 'Restaurants', 'Construction'],
  ctype: ['Commercial', 'Government', 'Non-profit', 'Education', 'Personal'],
  taxExempt: ['Certificate on File', 'Wholesale - Known'],
  inactiveMonths: 18,
};
export const LIST_LABELS = [['source', 'Source', 'Replaces CoreBridge’s Origination type'], ['industry', 'Industry', 'Used on customer records and Prospects'], ['ctype', 'Customer type', ''], ['taxExempt', 'Tax-exempt reasons', '']];

const int = (v, lo, hi, label) => { const n = Number(v); if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`${label} must be a whole number from ${lo} to ${hi}`); return n; };

export function stageTargets(adm = {}) {
  return STAGES.map(([k, name, note, def, start]) => ({ k, name, note, start, days: Number(adm[`target_${k}`]) > 0 ? Number(adm[`target_${k}`]) : def, unit: (adm.stageUnits || {})[k] === 'calendar' ? 'calendar' : 'business' }));
}
export function replyTargets(adm = {}) {
  return REPLY.map(([k, name, hint, n, unit]) => { const s = (adm.replySla || {})[k] || {}; return { k, name, hint, n: s.n || n, unit: s.unit === 'days' || s.unit === 'hours' ? s.unit : unit }; });
}

export function mergeRules(adm = {}, f = {}) {
  const out = { ...adm };
  if (f.section === 'stages') {
    out.stageUnits = { ...(adm.stageUnits || {}) };
    for (const [k, name] of STAGES) { if (f[`d_${k}`] !== undefined) out[`target_${k}`] = int(f[`d_${k}`], 1, 365, name); if (f[`u_${k}`]) out.stageUnits[k] = f[`u_${k}`] === 'calendar' ? 'calendar' : 'business'; }
  } else if (f.section === 'reply') {
    out.replySla = { ...(adm.replySla || {}) };
    for (const [k, name] of REPLY) if (f[`n_${k}`] !== undefined) out.replySla[k] = { n: int(f[`n_${k}`], 1, 72, name), unit: f[`u_${k}`] === 'days' ? 'days' : 'hours' };
    if (['25', '1h', '50'].includes(f.dueSoon)) out.dueSoon = f.dueSoon;
  } else if (f.section === 'warm') {
    const kw = int(f.keepWarmDays, 14, 365, 'Customer check-in'); const dm = int(f.dormantDays, 30, 730, 'Mark dormant'); const pn = int(f.prospectNudgeDays, 3, 120, 'Prospect nudge');
    if (dm <= kw) throw new Error('Dormant must come after the check-in');
    Object.assign(out, { keepWarmDays: kw, dormantDays: dm, prospectNudgeDays: pn, reasonSources: Object.fromEntries(REASONS.map(([k]) => [k, f[`r_${k}`] === 'on'])) });
  } else throw new Error('that section does not exist');
  return out;
}

const box = 'background:#fff;border:1px solid #e3e7ee;border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:10px';
const inp = 'font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px';
const th = 'padding:8px 10px;text-align:left;font-size:12px;color:var(--mute);font-weight:600';
const td = 'padding:8px 10px;border-top:1px solid #eef1f5;font-size:14px';
const vh = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)';

export function rulesSections(adm = {}, back = '') {
  const act = `/admin/rules${back ? '?back=' + encodeURIComponent(back) : ''}`;
  const st = stageTargets(adm); const rp = replyTargets(adm);
  const reasons = adm.reasonSources || {};
  const stages = `<section aria-labelledby="st-h" style="${box}"><h2 id="st-h" style="margin:0;font-size:17px">Stage Time Targets</h2><p style="margin:0;font-size:13px;color:var(--mute)">A project past its target shows as Stuck on Projects and moves up in Focus Now.</p><form method="post" action="${act}"><input type="hidden" name="section" value="stages"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:620px"><thead><tr><th scope="col" style="${th}">Stage</th><th scope="col" style="${th}">Target</th><th scope="col" style="${th}">Counted in</th><th scope="col" style="${th}">Clock starts when</th></tr></thead><tbody>${st.map((s) => `<tr><td style="${td}"><b>${esc(s.name)}</b><div style="font-size:12px;color:var(--mute)">${esc(s.note)}</div></td><td style="${td}"><label><span style="${vh}">${esc(s.name)} target</span><input name="d_${s.k}" type="number" min="1" max="365" value="${s.days}" style="${inp};width:80px"></label> days</td><td style="${td}"><label><span style="${vh}">${esc(s.name)} counted in</span><select name="u_${s.k}" style="${inp}"><option value="business" ${s.unit === 'business' ? 'selected' : ''}>Business days</option><option value="calendar" ${s.unit === 'calendar' ? 'selected' : ''}>Calendar days</option></select></label></td><td style="${td};color:var(--mute)">${esc(s.start)}</td></tr>`).join('')}</tbody></table></div><button class="btn primary" style="margin-top:10px">Save Stage Targets</button></form></section>`;
  const reply = `<section aria-labelledby="rp-h" style="${box}"><h2 id="rp-h" style="margin:0;font-size:17px">Reply Time Targets</h2><p style="margin:0;font-size:13px;color:var(--mute)">How fast each kind of message should be answered. This sets Past Due, Due Today and Due Soon in Activities once email and chat are connected. Time only counts during business hours.</p><form method="post" action="${act}"><input type="hidden" name="section" value="reply"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:560px"><thead><tr><th scope="col" style="${th}">Message</th><th scope="col" style="${th}">Answer within</th></tr></thead><tbody>${rp.map((r) => `<tr><td style="${td}"><b>${esc(r.name)}</b><div style="font-size:12px;color:var(--mute)">${esc(r.hint)}</div></td><td style="${td}"><label style="display:inline-flex;gap:6px;align-items:center"><span style="${vh}">${esc(r.name)} answer within</span><input name="n_${r.k}" type="number" min="1" max="72" value="${r.n}" style="${inp};width:70px"><select name="u_${r.k}" style="${inp}"><option value="hours" ${r.unit === 'hours' ? 'selected' : ''}>business hours</option><option value="days" ${r.unit === 'days' ? 'selected' : ''}>business days</option></select></label></td></tr>`).join('')}</tbody></table></div><label style="display:flex;gap:8px;align-items:center;font-size:13px;margin-top:10px">Show as Due Soon when<select name="dueSoon" style="${inp}">${[['25', '25% of the time is left'], ['1h', '1 business hour is left'], ['50', '50% of the time is left']].map(([v, l]) => `<option value="${v}" ${(adm.dueSoon || '25') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><button class="btn primary" style="margin-top:10px">Save Reply Targets</button></form></section>`;
  const hours = `<section aria-labelledby="bh-h" style="${box}"><h2 id="bh-h" style="margin:0;font-size:17px">Business Hours</h2><p style="margin:0;font-size:13px;color:var(--mute)">Will come from your Google Business Profile (including holiday hours) once Google is connected. Until then SalesMax uses these standard hours.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px">${HOURS.map(([d, v]) => `<div style="border:1px solid #eef1f5;border-radius:8px;padding:6px 10px;font-size:13px"><b>${d}</b><div style="color:${v === 'Closed' ? 'var(--mute)' : 'var(--ink)'}">${v}</div></div>`).join('')}</div><p style="margin:0;font-size:12px;color:var(--mute)">Example: a customer emails Friday at 4:30 PM with a 2-hour target. 30 minutes count Friday, and the rest counts Monday from 8:00, so it’s due Monday 9:30 AM.</p></section>`;
  const warm = `<section aria-labelledby="kw-h" style="${box}"><h2 id="kw-h" style="margin:0;font-size:17px">Keep-Warm Rules</h2><p style="margin:0;font-size:13px;color:var(--mute)">When SalesMax adds a check-in task, with a reason to reach out that helps the customer.</p><form method="post" action="${act}" style="display:flex;flex-direction:column;gap:8px"><input type="hidden" name="section" value="warm">${[['keepWarmDays', 'Customer check-in after no order for', adm.keepWarmDays || 90, 14, 365], ['dormantDays', 'Mark dormant after no order for', adm.dormantDays || 180, 30, 730], ['prospectNudgeDays', 'Nudge on a prospect with no contact for', adm.prospectNudgeDays || 21, 3, 120]].map(([k, l, v, lo, hi]) => `<label style="display:flex;gap:8px;align-items:center;font-size:14px;flex-wrap:wrap">${l}<input name="${k}" type="number" min="${lo}" max="${hi}" value="${v}" style="${inp};width:80px"> days</label>`).join('')}<fieldset style="border:0;margin:6px 0 0;padding:0"><legend style="font-size:14px;font-weight:700;margin-bottom:6px">Where Reasons to Reach Out Can Come From</legend>${REASONS.map(([k, l]) => `<label style="display:flex;gap:8px;align-items:center;min-height:36px;font-size:14px"><input type="checkbox" name="r_${k}" ${reasons[k] === false ? '' : 'checked'} style="width:18px;height:18px;accent-color:#a8343f">${esc(l)}</label>`).join('')}</fieldset><button class="btn primary" style="align-self:flex-start">Save Keep-Warm Rules</button></form></section>`;
  return { stages, reply, hours, warm };
}

export function rulesPage({ user, adm = {}, flash = '' }) {
  const { stages, reply, hours, warm } = rulesSections(adm);
  const body = `<div class="wrap" style="max-width:980px;display:flex;flex-direction:column;gap:16px;padding-top:16px"><div class="bar" style="padding:0"><h1>Sales Rules</h1></div>${flash ? `<div class="note" style="margin:0">${esc(flash)}</div>` : ''}${stages}${reply}${hours}${warm}</div>`;
  return page({ title: 'Sales Rules', user, tab: '', body });
}

export function mergeLists(prev = {}, f = {}) {
  const out = { ...LIST_DEFAULTS, ...prev };
  for (const [k, label] of LIST_LABELS) {
    if (f[k] === undefined) continue;
    const vals = [...new Set(String(f[k]).split(/\r?\n/).map((s) => s.trim()).filter(Boolean))];
    if (!vals.length) throw new Error(`${label} needs at least one choice`);
    if (vals.length > 200 || vals.some((v) => v.length > 60)) throw new Error(`${label}: up to 200 choices, 60 letters each`);
    out[k] = vals;
  }
  if (f.inactiveMonths !== undefined) out.inactiveMonths = int(f.inactiveMonths, 3, 60, 'Mark inactive after');
  return out;
}

// Small CSV reader (quotes, commas, new lines inside quotes).
export function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false; const s = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => String(x).trim()));
}
export const IMPORT_KINDS = {
  customers: ['Customers', 'Company, primary and billing contacts, addresses, terms, salesperson', ['Company', 'Contact First', 'Contact Last', 'Email', 'Phone', 'Address', 'City', 'State', 'Zip', 'Terms', 'Salesperson'], ['Company']],
  locations: ['Locations', 'Extra ship-to and install addresses for existing customers', ['Company', 'Location Name', 'Address', 'City', 'State', 'Zip'], ['Company', 'Address']],
  contacts: ['Contacts', 'Extra contacts for existing customers', ['Company', 'First', 'Last', 'Email', 'Phone', 'Title'], ['Company', 'First']],
};
export function checkImport(kind, text) {
  const def = IMPORT_KINDS[kind]; if (!def) throw new Error('pick what you are importing');
  const rows = parseCsv(text); if (rows.length < 2) throw new Error('paste a header row and at least one data row');
  const head = rows[0].map((h) => h.trim()); const low = head.map((h) => h.toLowerCase());
  const missing = def[3].filter((c) => !low.includes(c.toLowerCase()));
  const idx = def[3].map((c) => low.indexOf(c.toLowerCase()));
  const data = rows.slice(1, 5001);
  const problems = []; data.forEach((r, n) => { const miss = def[3].filter((c, j) => idx[j] >= 0 && !String(r[idx[j]] || '').trim()); if (miss.length) problems.push(`Row ${n + 2}: missing ${miss.join(', ')}`); });
  const ei = low.indexOf('email'); if (ei >= 0) data.forEach((r, n) => { const e = String(r[ei] || '').trim(); if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) problems.push(`Row ${n + 2}: email “${e}” doesn’t look right`); });
  return { head, rows: data, missing, problems: problems.slice(0, 50), problemN: problems.length, total: rows.length - 1 };
}

export function listsPage({ user, lists = {}, flash = '', check = null, kind = 'customers', csv = '' }) {
  const L = { ...LIST_DEFAULTS, ...lists };
  const listForm = `<section aria-labelledby="cl-h" style="${box}"><h2 id="cl-h" style="margin:0;font-size:17px">Customer Lists</h2><p style="margin:0;font-size:13px;color:var(--mute)">The choices used on customer records. One choice per line.</p><form method="post" action="/admin/lists" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px"><input type="hidden" name="do" value="lists">${LIST_LABELS.map(([k, l, h]) => `<label style="display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600">${l} <span style="font-weight:400;color:var(--mute);font-size:12px">${L[k].length} choices${h ? ' · ' + esc(h) : ''}</span><textarea name="${k}" rows="7" style="font:inherit;font-weight:400;border:1px solid #d5dbe5;border-radius:8px;padding:8px">${esc(L[k].join('\n'))}</textarea></label>`).join('')}<label style="display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600">Mark inactive after <span style="font-weight:400;color:var(--mute);font-size:12px">No orders or estimates, no open orders, no credit</span><span style="display:flex;gap:6px;align-items:center;font-weight:400"><input name="inactiveMonths" type="number" min="3" max="60" value="${L.inactiveMonths}" style="${inp};width:80px"> months</span></label><div style="grid-column:1/-1"><button class="btn primary">Save Lists</button></div></form></section>`;
  const def = IMPORT_KINDS[kind] || IMPORT_KINDS.customers;
  const bad = check && (check.missing.length || check.problemN);
  const result = check ? `<div style="border:1px solid ${bad ? '#f0d6b3' : '#b9dcc8'};background:${bad ? '#fffaf3' : '#f3faf6'};border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px"><b>${check.total} row${check.total === 1 ? '' : 's'} read · ${check.missing.length ? 'missing columns: ' + esc(check.missing.join(', ')) : check.problemN ? check.problemN + ' row' + (check.problemN === 1 ? '' : 's') + ' to fix' : 'ready to import'}</b>${check.problems.length ? `<ul style="margin:0;padding-left:18px;font-size:13px">${check.problems.slice(0, 10).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:12px"><thead><tr>${check.head.map((h) => `<th scope="col" style="${th}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${check.rows.slice(0, 5).map((r) => `<tr>${check.head.map((h, i) => `<td style="padding:4px 10px;border-top:1px solid #eef1f5">${esc(r[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div><span style="font-size:12px;color:var(--mute)">Check only. Nothing was saved. Importing turns on when a new location joins SalesMax; NKY customers come from CoreBridge.</span></div>` : '';
  const imp = `<section aria-labelledby="ic-h" style="${box}" id="import"><h2 id="ic-h" style="margin:0;font-size:17px">Import Customers</h2><p style="margin:0;font-size:13px;color:var(--mute)">Bring in customers, extra locations and extra contacts from a spreadsheet. Used when a new location joins SalesMax. Save the sheet as CSV and paste it below to check it.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px">${Object.entries(IMPORT_KINDS).map(([k, [n, d, cols]]) => `<div style="border:1px solid ${k === kind ? '#16213a' : '#eef1f5'};border-radius:10px;padding:10px 12px"><b>${n}</b> <span class="pill" style="background:#eef0f4;color:#3d4658">CSV</span><div style="font-size:12px;color:var(--mute);margin-top:4px">${esc(d)}</div><div style="font-size:11px;margin-top:6px">Columns: ${esc(cols.join(', '))}</div></div>`).join('')}</div><form method="post" action="/admin/lists#import" style="display:flex;flex-direction:column;gap:8px"><input type="hidden" name="do" value="check"><label style="display:flex;gap:8px;align-items:center;font-size:13px">Importing<select name="kind" style="${inp}">${Object.entries(IMPORT_KINDS).map(([k, [n]]) => `<option value="${k}" ${k === kind ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label style="display:flex;flex-direction:column;gap:4px;font-size:13px">Paste the CSV (header row first)<textarea name="csv" rows="6" style="font:12px ui-monospace,monospace;border:1px solid #d5dbe5;border-radius:8px;padding:8px" placeholder="${esc(def[2].join(','))}">${esc(csv)}</textarea></label><button class="btn primary" style="align-self:flex-start">Check the File</button></form>${result}</section>`;
  const body = `<div class="wrap" style="max-width:980px;display:flex;flex-direction:column;gap:16px;padding-top:16px"><div class="bar" style="padding:0"><h1>Customer Lists &amp; Import</h1></div>${flash ? `<div class="note" style="margin:0">${esc(flash)}</div>` : ''}${listForm}${imp}</div>`;
  return page({ title: 'Customer Lists', user, tab: '', body });
}
