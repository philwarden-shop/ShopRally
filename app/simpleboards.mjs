// Permits and Purchasing boards: Board + List views (no TV mode), drag between columns (with a no-script Move menu),
// editable permit fields. Records are kept in SalesMax.
import { page, esc } from './views.mjs';
import { sampleData } from './data.mjs';
import { blockedForOrder, quoteCard } from './quotecheck.mjs';
import { cardChecklist } from './checklists.mjs';

export const BOARDS = {
  permits: {
    title: 'Permits',
    cols: [['needs', 'Needs Application'], ['submitted', 'Submitted'], ['review', 'In Review'], ['changes', 'Needs Changes'], ['approved', 'Approved']],
    fields: [['appNo', 'Application #', 'text'], ['permitNo', 'Permit #', 'text'], ['issued', 'Issued', 'date'], ['expires', 'Expires', 'date']],
  },
  purchasing: {
    title: 'Purchasing',
    cols: [['quote', 'Needs Quote'], ['requested', 'Quote Requested'], ['order', 'Ready to Order'], ['ordered', 'Ordered'], ['received', 'Received']],
    fields: [],
  },
};

export function demoRecords(board) {
  if (!sampleData()) return [];
  if (board === 'permits') return [
    { id: 'pm1', name: 'Exterior wayfinding posts', project: 'demo-10', company: 'Kenton County Library', city: 'Covington', col: 'needs' },
    { id: 'pm2', name: 'Building wall graphic', project: 'demo-11', company: 'Hartwell Builders', city: 'Hebron', col: 'submitted', appNo: 'BC-26-0198' },
    { id: 'pm3', name: 'Monument sign', project: 'demo-2', company: 'Tri-State Logistics', city: 'Hebron', col: 'review', appNo: 'BC-26-1120' },
    { id: 'pm4', name: 'Blade sign', project: 'demo-7', company: 'Florence Fitness', city: 'Florence', col: 'changes', appNo: 'FL-26-0877', note: 'City wants it 2 ft lower' },
    { id: 'pm5', name: 'Pylon refacing', project: 'demo-6', company: 'Riverbend Dental', city: 'Florence', col: 'approved', appNo: 'FL-26-0412', permitNo: 'P-55120', issued: '2026-11-02', expires: '2027-05-02' },
  ];
  return [
    { id: 'pu1', name: 'Wrap vinyl and laminate', project: 'demo-14', company: 'Northside HVAC', vendor: 'Grimco', col: 'quote' },
    { id: 'pu2', name: 'Aluminum standoffs (8)', project: 'demo-6', company: 'Riverbend Dental', vendor: 'Gyford', col: 'requested' },
    { id: 'pu3', name: 'Wayfinding post kits', project: 'demo-10', company: 'Kenton County Library', vendor: 'Sign Supply Co', col: 'order' },
    { id: 'pu4', name: 'Wall graphic print media', project: 'demo-11', company: 'Hartwell Builders', vendor: 'Grimco', col: 'ordered', eta: '2026-11-18' },
  ];
}

export function moveRecord(records, id, to, board) {
  const def = BOARDS[board];
  if (!def) throw new Error('that board does not exist');
  if (!def.cols.some(([k]) => k === to)) throw new Error('that column does not exist');
  const r = records.find((x) => x.id === id);
  if (!r) throw new Error('that card is not here');
  if (board === 'permits' && to === 'approved' && !(r.permitNo || '').trim()) throw new Error('enter the Permit # before moving it to Approved');
  if (board === 'purchasing' && blockedForOrder(r, to)) throw new Error('the vendor quote is blocked. Fix the quote before ordering');
  return records.map((x) => (x.id === id ? { ...x, col: to } : x));
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export function updateFields(records, id, f, board) {
  const def = BOARDS[board];
  const r = records.find((x) => x.id === id);
  if (!r) throw new Error('that card is not here');
  const next = { ...r };
  for (const [k, label, type] of def.fields) {
    if (!(k in f)) continue;
    const v = String(f[k] || '').trim();
    if (type === 'date' && v && !DATE.test(v)) throw new Error(`${label} needs a date`);
    if (type === 'text' && v.length > 40) throw new Error(`${label} is too long`);
    next[k] = v;
  }
  if (next.issued && next.expires && next.expires <= next.issued) throw new Error('Expires must be after Issued');
  return records.map((x) => (x.id === id ? next : x));
}

// City / county permit fees: kept on the permit card; "add to the invoice" means at cost, not taxed.
export function addFee(records, id, f) {
  const r = records.find((x) => x.id === id);
  if (!r) throw new Error('that card is not here');
  const what = String(f.what || '').trim();
  const amt = Number(String(f.amount || '').replace(/[$,]/g, ''));
  if (what.length < 2) throw new Error('say what the fee is for');
  if (!(amt > 0) || amt > 100000) throw new Error('enter the fee amount');
  if (f.paidOn && !DATE.test(String(f.paidOn))) throw new Error('Paid on needs a date');
  const fee = { what: what.slice(0, 80), amount: Math.round(amt * 100) / 100, paidOn: f.paidOn || '', invoice: f.invoice === 'on' };
  return records.map((x) => (x.id === id ? { ...x, fees: [...(x.fees || []), fee] } : x));
}
export function newRecord(records, f, board, id = (board === 'permits' ? 'pm' : 'pu') + Date.now().toString(36)) {
  const name = String(f.name || '').trim();
  const company = String(f.company || '').trim();
  if (name.length < 2) throw new Error(board === 'permits' ? 'say what the permit is for' : 'say what we are buying');
  if (company.length < 2) throw new Error('add the customer');
  const rec = { id, name: name.slice(0, 80), company: company.slice(0, 80), project: String(f.project || '').trim().slice(0, 40), col: BOARDS[board].cols[0][0] };
  if (board === 'permits') rec.city = String(f.where || '').trim().slice(0, 40); else rec.vendor = String(f.where || '').trim().slice(0, 40);
  return [...records, rec];
}
const money2 = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function feesForm(r) {
  const fees = r.fees || [];
  const total = fees.reduce((a, x) => a + x.amount, 0);
  const inp = 'font:inherit;font-size:12px;min-height:28px;border:1px solid #d5dbe5;border-radius:6px;padding:0 6px';
  return `<details><summary style="cursor:pointer;font-size:12px;font-weight:600;color:#1d4f91">City / County Fees${fees.length ? ' · ' + money2(total) : ''}</summary>${fees.length ? `<ul style="margin:6px 0;padding-left:16px;font-size:12px">${fees.map((x) => `<li>${esc(x.what)} · ${money2(x.amount)}${x.paidOn ? ' · paid ' + esc(x.paidOn) : ''}${x.invoice ? ' · on invoice' : ''}</li>`).join('')}</ul>` : ''}<form method="post" action="/boards/permits/${esc(r.id)}/fee" style="display:flex;flex-direction:column;gap:4px;font-size:12px;margin-top:6px"><label>What<input name="what" required placeholder="Permit fee, plan review" style="${inp};width:100%"></label><div style="display:flex;gap:4px"><label style="flex:1">Amount<input name="amount" inputmode="decimal" required style="${inp};width:100%"></label><label style="flex:1">Paid on<input name="paidOn" type="date" style="${inp};width:100%"></label></div><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="invoice" checked> Add to the customer's invoice (at cost, not taxed)</label><button class="btn" style="min-height:30px;align-self:flex-start">Save Fee</button></form></details>`;
}
function newForm(board) {
  const p = board === 'permits';
  const inp = 'font:inherit;font-size:13px;min-height:34px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px';
  return `<details style="position:relative"><summary class="btn primary" style="list-style:none;cursor:pointer">${p ? '+ Add Permit' : '+ New Quote Request or PO'}</summary><form method="post" action="/boards/${board}/new" style="position:absolute;right:0;top:44px;z-index:30;background:#fff;border:1px solid #e3e7ee;border-radius:12px;box-shadow:0 8px 24px rgba(22,33,58,.15);padding:12px;display:flex;flex-direction:column;gap:8px;width:300px;font-size:12px"><label>${p ? 'What sign' : 'What we are buying'}<input name="name" required style="${inp};width:100%"></label><label>Customer<input name="company" required style="${inp};width:100%"></label><label>${p ? 'City or county' : 'Vendor'}<input name="where" style="${inp};width:100%"></label><label>Project ID (optional)<input name="project" placeholder="demo-10" style="${inp};width:100%"></label><button class="btn primary">${p ? 'Add Permit' : 'Add Request'}</button></form></details>`;
}
const seg = (board, view) => `<div class="seg" role="group" aria-label="View"><a href="/boards/${board}?view=board" class="${view === 'board' ? 'on' : ''}">Board</a><a href="/boards/${board}?view=list" class="${view === 'list' ? 'on' : ''}">List</a></div>`;

function moveForm(board, r, cols) {
  return `<form method="post" action="/boards/${board}/${esc(r.id)}/move" style="margin:0;display:flex;gap:4px"><label class="sr" for="mv-${esc(r.id)}" style="position:absolute;left:-9999px">Move ${esc(r.name)}</label><select id="mv-${esc(r.id)}" name="to" style="font:inherit;font-size:12px;min-height:30px">${cols.map(([k, l]) => `<option value="${k}" ${k === r.col ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select><button class="btn" style="min-height:30px">Move</button></form>`;
}

function fieldsForm(board, r, def) {
  if (!def.fields.length) return '';
  return `<details><summary style="cursor:pointer;font-size:12px;font-weight:600;color:#1d4f91">Permit Details</summary><form method="post" action="/boards/${board}/${esc(r.id)}/fields" style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;font-size:12px;margin-top:6px;align-items:center">${def.fields.map(([k, l, t]) => `<label for="${k}-${esc(r.id)}">${esc(l)}</label><input id="${k}-${esc(r.id)}" name="${k}" type="${t}" value="${esc(r[k] || '')}" style="font:inherit;font-size:12px;min-height:28px;border:1px solid #d5dbe5;border-radius:6px;padding:0 6px">`).join('')}<span></span><button class="btn" style="min-height:30px">Save</button></form></details>`;
}

export function simpleBoardPage({ user, board, records, view = 'board', flash = '', checklists = null, refs = {} }) {
  const niceD = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : d);
  const refOf = (r) => { const x = refs[r.project]; return x ? (x.orderId ? `Order ${x.orderId}` : x.name) : ''; };
  const cl = (r) => (checklists ? cardChecklist({ id: r.id, step: `${board}-${r.col}` }, checklists.saved, (checklists.checks || {})[`b:${board}:${r.id}`], `/boards/${board}`, `/boards/${board}/${r.id}/check`) : '');
  const def = BOARDS[board];
  const v = view === 'list' ? 'list' : 'board';
  const meta = (r) => esc([r.company, r.city || r.vendor, r.appNo ? `App ${r.appNo}` : '', r.permitNo ? `Permit ${r.permitNo}` : '', r.eta ? `ETA ${niceD(r.eta)}` : '', r.owner ? r.owner : '', r.follow && r.col !== 'received' && r.col !== 'approved' ? `Follow up ${niceD(r.follow)}` : ''].filter(Boolean).join(' · '));
  let main;
  if (v === 'board') {
    main = `<div class="board" style="grid-template-columns:repeat(${def.cols.length},minmax(220px,1fr))">${def.cols.map(([k, l]) => {
      const list = records.filter((r) => r.col === k);
      const ci = def.cols.findIndex(([kk]) => kk === k);
      const colr = ['#9aa6bd', '#1d4f91', '#6b4fa0', '#c88a12', '#1f6a43'][ci] || '#5a6478';
      const late = (r) => r.expires && r.expires < new Date().toISOString().slice(0, 10);
      return `<section class="lane sbl" data-col="${k}" aria-label="${esc(l)}"><div class="chd" style="border-bottom:3px solid ${colr};padding:2px 4px 6px"><h2 data-free style="font-size:14px;margin:0;display:flex;justify-content:space-between">${esc(l)} <span>${list.length}</span></h2></div>${list.map((r) => `<div class="card" draggable="true" data-id="${esc(r.id)}" style="border-left:4px solid ${r.note || late(r) ? '#a8343f' : colr}"><div style="display:flex;justify-content:space-between;font-size:11px;color:#5a6478;font-weight:600"><span>${esc(refOf(r))}</span><span>${esc(r.eta ? 'ETA ' + niceD(r.eta) : r.expires ? 'Expires ' + niceD(r.expires) : '')}</span></div><b><a href="/projects/${esc(r.project)}?mode=demo" style="color:#1b2436">${esc(r.name)}</a></b><span class="co">${meta(r)}</span>${r.note ? `<span class="ai">${esc(r.note)}</span>` : ''}${moveForm(board, r, def.cols)}${fieldsForm(board, r, def)}${board === 'permits' ? feesForm(r) : ''}${board === 'purchasing' ? quoteCard(r) : ''}${cl(r)}${r.project ? `<a href="/projects/${esc(r.project)}?mode=demo&tab=notes" style="font-size:12px;font-weight:600" title="Type @ and a name to notify someone">+ Add a Note</a>` : ''}</div>`).join('') || '<div style="font-size:12px;color:var(--mute);padding:6px">Nothing here. Drag a card in.</div>'}</section>`;
    }).join('')}</div>`;
  } else {
    const extra = def.fields.map(([, l]) => `<th>${esc(l)}</th>`).join('');
    main = `<div class="wrap" style="max-width:none"><div class="panel"><table><thead><tr><th>Item</th><th>Customer</th><th>Status</th>${extra}<th>Move</th></tr></thead><tbody>${records.map((r) => `<tr><td><a href="/projects/${esc(r.project)}?mode=demo">${esc(r.name)}</a></td><td>${esc(r.company)}</td><td>${esc((def.cols.find(([k]) => k === r.col) || [, r.col])[1])}</td>${def.fields.map(([k]) => `<td>${esc(r[k] || '')}</td>`).join('')}<td>${moveForm(board, r, def.cols)}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
  const body = `<style>.sbw{padding:20px 24px 40px}.sbw .bar{padding:0 0 12px}.sbl{background:#eaedf2;min-height:420px}.sbl .card{border:1px solid #e3e7ee;padding:10px 12px;gap:6px}.sbl .card b{font-size:14px}@media (max-width:700px){.sbw{padding:16px}}</style><div class="sbw"><div class="bar"><h1 style="position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0)">${esc(def.title)}</h1><p style="margin:0;color:#3d4658;font-size:14px">${esc(def.title)} · ${records.length} open · drag a card or use Move</p><span style="flex:1"></span><div style="display:flex;gap:8px;align-items:center">${newForm(board)}${seg(board, v)}</div></div>${flash ? `<div class="note" style="background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}${main}
</div><form id="dnd" method="post" style="display:none"><input type="hidden" name="to"></form><script src="/static/board.js" defer></script><style>.lane.over{outline:2px dashed #1d4f91}.card[draggable]{cursor:grab}</style>`;
  return page({ title: def.title, user, tab: def.title, body });
}

// Served from /static/board.js (CSP allows same-origin scripts only).
export const BOARD_JS = `(() => {
  const f = document.getElementById('dnd'); if (!f) return;
  let id = null;
  document.querySelectorAll('.card[draggable]').forEach((c) => c.addEventListener('dragstart', (e) => { id = c.dataset.id; e.dataTransfer.setData('text/plain', id); }));
  document.querySelectorAll('.lane[data-col]').forEach((l) => {
    l.addEventListener('dragover', (e) => { e.preventDefault(); l.classList.add('over'); });
    l.addEventListener('dragleave', () => l.classList.remove('over'));
    l.addEventListener('drop', (e) => { e.preventDefault(); l.classList.remove('over'); const cid = id || e.dataTransfer.getData('text/plain'); if (!cid) return;
      f.action = location.pathname + '/' + encodeURIComponent(cid) + '/move'; f.elements.to.value = l.dataset.col; f.submit(); });
  });
})();`;

// Review fix (Nov 13): every vended product gets a Purchasing card automatically, linked to the item, with an owner
// and a follow-up date. Existing cards are left alone (matched by item, or by project + name for hand-made ones).
export function syncPurchasing(records = [], items = [], projects = [], today) {
  const add = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const out = [...records]; let added = 0;
  for (const it of items) {
    if (it.step !== 'vended') continue;
    if (out.some((r) => r.item === it.id || (r.project === it.projectId && String(r.name).toLowerCase() === String(it.name).toLowerCase()))) continue;
    const pr = projects.find((p) => p.id === it.projectId) || {};
    out.push({ id: `auto-${it.id}`, name: it.name, project: it.projectId, company: pr.company || it.customer || '', vendor: '', col: 'quote', item: it.id, owner: 'Purchasing', follow: add(today, 1), auto: true });
    added++;
  }
  return { records: out, added };
}

