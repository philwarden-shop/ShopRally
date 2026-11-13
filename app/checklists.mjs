// Stage checklists (Phil, Nov 12): every step on every board has a checklist on the card. Required items must be
// checked before the card can leave that step. Admins edit them in Admin › Stage Checklists.
import { esc } from './views.mjs';
import { BOARDS as SIMPLE } from './simpleboards.mjs';

export const DEFAULT_CHECKLISTS = {
  'permits-needs': [['Permit needed? Confirmed with the city', 1], ['All documents for the permit type attached', 1]],
  'permits-submitted': [['Application # recorded', 1], ['Fee paid', 1]],
  'permits-review': [['Checked status with the city this week', 0]],
  'permits-changes': [['Requested changes sent to design', 1]],
  'permits-approved': [['Permit # and expiry entered', 1], ['Permit saved to the job folder', 0]],
  'purchasing-quote': [['Specs and quantity match the order', 1]],
  'purchasing-requested': [['Vendor quote attached', 1], ['Price matches the estimate', 0]],
  'purchasing-order': [['Quote approved', 1]],
  'purchasing-ordered': [['PO # recorded', 1], ['Expected date entered', 1]],
  'purchasing-received': [['Received and checked for damage', 1], ['Count matches the PO', 1]],
  'sales-prospect': [['Contact name, email and phone entered', 1], ['Need-by date set', 1], ['Site survey booked (installs)', 0]],
  'sales-estimate': [['Estimate sent to the customer', 1], ['Hand-off type picked', 1], ['Follow-up task scheduled', 0]],
  'sales-progress': [['Deposit received', 1], ['Customer has the order page link', 0]],
  'sales-built': [['Customer told it is ready', 1], ['Hand-off date confirmed', 0]],
  'sales-complete': [['Final invoice paid', 1], ['Asked for a review', 0]],
  prep: [['Site photos and measurements attached', 1], ['Customer artwork or logo received', 1]],
  indesign: [['Sizes match the order lines', 1], ['Brand colors (PMS) confirmed', 0]],
  proofqc: [['Spelling and phone numbers checked', 1], ['Quantities and sizes match the order', 1]],
  salesrev: [['Matches what the customer asked for', 1]],
  files: [['Print file matches the approved proof', 1], ['Bleed and cut lines set', 1]],
  wip: [['Print file matches the approved proof', 1], ['Material and finish checked', 1]],
  vended: [['Vendor confirmed the ship date', 1]],
  qc: [['QC photo taken', 1], ['Count matches the order', 1]],
  built: [['Packed and labeled', 1], ['Hand-off scheduled', 0]],
};
export const SALES_STAGES = [['sales-prospect', 'Prospect'], ['sales-estimate', 'Estimate'], ['sales-progress', 'In production'], ['sales-built', 'Built'], ['sales-complete', 'Complete']];
export const STEP_NAMES = { prep: 'Prepare for design', indesign: 'In design', proofqc: 'Proof review', salesrev: 'Sales proof review', files: 'Production files', wip: 'WIP', vended: 'Vended product', qc: 'Quality control', built: 'Built: hand-off' };

export const listFor = (saved, step) => ((saved && saved[step]) || DEFAULT_CHECKLISTS[step] || []).map(([text, req]) => ({ text, req: !!req }));

// Every stage that can carry a checklist, grouped by board. Custom stages admins add to a board come in as
// [{ id, name, board }] and get the same "definition of done" box.
const BOARD_ORDER = ['sales', 'design', 'production', 'permits', 'purchasing'];
export function stageCatalog(custom = []) {
  const base = [...SALES_STAGES.map(([id, name]) => ({ id, name, board: 'sales' })), ...Object.entries(STEP_NAMES).map(([id, name]) => ({ id, name, board: ['files', 'prep', 'indesign', 'proofqc', 'salesrev'].includes(id) ? 'design' : 'production' })), ...['permits', 'purchasing'].flatMap((b) => ((SIMPLE[b] && SIMPLE[b].cols) || []).map(([k, name]) => ({ id: `${b}-${k}`, name, board: b })))];
  const seen = new Set(base.map((s) => s.id));
  const extra = (Array.isArray(custom) ? custom : []).filter((s) => s && /^[\w-]{2,40}$/.test(String(s.id)) && !seen.has(s.id) && seen.add(s.id)).map((s) => ({ id: String(s.id), name: String(s.name || s.id).slice(0, 60), board: BOARD_ORDER.includes(s.board) ? s.board : 'production', custom: true }));
  return [...base, ...extra];
}
export const salesStage = (lane) => `sales-${lane}`;

export function parseChecklistForm(f, custom = []) {
  const out = {};
  for (const step of stageCatalog(custom).map((s) => s.id)) {
    if (f[`s_${step}`] === undefined) continue;
    out[step] = String(f[`s_${step}`]).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 15).map((l) => [l.replace(/^\*\s*/, '').slice(0, 120), l.startsWith('*') ? 1 : 0]);
  }
  return out;
}
export function missingRequired(saved, step, checked = []) {
  return listFor(saved, step).map((it, n) => ({ ...it, n })).filter((it) => it.req && !checked.includes(it.n)).map((it) => it.text);
}
export function toggleCheck(state = {}, step, n) {
  const cur = state[step] || []; const k = Number(n);
  return { ...state, [step]: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] };
}
export function cardChecklist(item, saved, checks = {}, back, action = `/items/${item.id}/check`) {
  const list = listFor(saved, item.step);
  if (!list.length) return '';
  const got = (checks && checks[item.step]) || [];
  const done = list.filter((_, n) => got.includes(n)).length;
  const rows = list.map((it, n) => `<form method="post" action="${esc(action)}" style="margin:0"><input type="hidden" name="n" value="${n}"><input type="hidden" name="back" value="${esc(back)}"><button data-free style="font:inherit;font-size:12px;display:flex;gap:6px;align-items:center;background:transparent;border:0;padding:2px 0;cursor:pointer;text-align:left;min-height:28px" aria-pressed="${got.includes(n)}"><span aria-hidden="true" style="width:15px;height:15px;border:1.5px solid ${got.includes(n) ? '#1f6a43' : '#9aa6bd'};border-radius:4px;background:${got.includes(n) ? '#1f6a43' : '#fff'};color:#fff;font-size:11px;line-height:13px;text-align:center">${got.includes(n) ? '✓' : ''}</span>${esc(it.text)}${it.req ? ' <b style="color:#a8343f">*</b>' : ''}</button></form>`).join('');
  return `<details style="border-top:1px solid #eef1f5;padding-top:6px"><summary style="cursor:pointer;font-weight:700;color:${done === list.length ? '#1f6a43' : '#3d4658'}">Checklist · ${done}/${list.length}</summary>${rows}</details>`;
}
export function checklistsPage({ page, user, saved, flash = '', custom = [] }) {
  const cat = stageCatalog(custom);
  const field = ({ id: step, name, custom: isCustom }) => `<label style="display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600"><span>${esc(name)}${isCustom ? ' <span class="pill" style="background:#f3f0fa;color:#4a3373">Custom</span>' : ''}</span><textarea name="s_${step}" rows="4" style="font:inherit;font-weight:400;border:1px solid #d5dbe5;border-radius:8px;padding:8px">${esc(listFor(saved, step).map((it) => (it.req ? '* ' : '') + it.text).join('\n'))}</textarea></label>`;
  const titles = { sales: 'Sales Board', design: 'Design Board', production: 'Production Board', permits: 'Permits Board', purchasing: 'Purchasing Board' };
  const rows = BOARD_ORDER.map((b) => `<h2 style="grid-column:1/-1;margin:8px 0 0;font-size:15px">${titles[b]}</h2>${cat.filter((s) => s.board === b).map(field).join('')}`).join('');
  const body = `<div class="wrap" style="max-width:900px"><div class="bar" style="padding:14px 0"><h1>Stage Checklists</h1></div>${flash ? `<div class="note" style="margin:0 0 12px;background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}
<section class="panel"><p style="margin:0 0 10px;font-size:13px">The definition of done for each stage on the Sales, Design, Production, Permits and Purchasing boards. One item per line. Start a line with <b>*</b> to make it Required: the card can't move on until it's checked. Custom stages your admins add to a board show up here automatically. Leave a box empty for no checklist.</p>
<form method="post" action="/admin/checklists" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">${rows}<div style="grid-column:1/-1"><button class="btn primary">Save Checklists</button></div></form></section></div>`;
  return page({ title: 'Stage Checklists', user, tab: '', body });
}
