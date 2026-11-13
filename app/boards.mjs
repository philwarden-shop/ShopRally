// Design and Production Boards: Board or List view, show/hide columns, move items between steps.
import { page, esc } from './views.mjs';
import { cardChecklist } from './checklists.mjs';
import { boardSteps, stepById, nextSteps, HOLD, HOLD_REASONS, visibleColumns, cbStatusOf } from './workflow.mjs';

const nice = (iso) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
const today = () => new Date().toISOString().slice(0, 10);
const dueColor = (iso) => (iso && iso < today() ? '#a8343f' : iso === today() ? '#874511' : '#5a6478');

const BOARD_CSS = `
.tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.cols{position:relative}.cols summary{list-style:none;cursor:pointer}.cols summary::-webkit-details-marker{display:none}
.cols .menu{position:absolute;right:0;top:42px;z-index:30;width:250px;background:#fff;border:1px solid #e3e7ee;border-radius:12px;box-shadow:0 12px 32px rgba(22,33,58,.2);padding:10px;display:flex;flex-direction:column;gap:4px}
.cols label{display:flex;gap:8px;align-items:center;font-size:13px;min-height:30px}
.kan{display:grid;gap:12px;padding:0 20px 20px;overflow-x:auto}
.col{background:#eaedf2;border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:10px;min-height:420px}
.col h2{margin:0;font-size:14px;font-weight:700;display:flex;justify-content:space-between;align-items:baseline;gap:6px}.col h2 span+span{font-size:12px}.chd{padding:2px 4px 6px;border-bottom:3px solid var(--c)}.chd .hint{font-size:11px;line-height:15px;color:#5a6478;margin-top:2px;min-height:30px}.cempty{font-size:13px;color:#5a6478;text-align:center;padding:18px 10px;border:1px dashed #d5dbe5;border-radius:10px}.avi{width:24px;height:24px;border-radius:12px;background:#3d4658;color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;float:right}
.it{background:#fff;border:1px solid #e3e7ee;border-left:4px solid var(--e);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;font-size:12px}.it>b{font-size:14px!important;line-height:1.3}
.it b a{color:#1b2436}.mv{display:flex;gap:4px}.mv select{font:inherit;font-size:12px;border:1px solid #d5dbe5;border-radius:6px;min-height:30px;flex:1;min-width:0;background:#fff}
.mv button{font:inherit;font-size:12px;font-weight:700;border:0;border-radius:6px;background:#16213a;color:#fff;padding:0 10px;min-height:30px;cursor:pointer}
.pill{display:inline-block;font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px}
.lst{margin:0 20px 20px;background:#fff;border:1px solid #e3e7ee;border-radius:12px;overflow-x:auto}
.lst table{min-width:900px}.lst td{vertical-align:top}
.log{margin:0 20px 24px;background:#fff;border:1px solid #e3e7ee;border-radius:12px;padding:12px 16px;font-size:12px}
.log li{margin:4px 0}
`;

// Hold reasons come from Admin › Workflow › Tags when saved there (Phil, Nov 13); otherwise the standard list.
let HOLDS = HOLD_REASONS;
export function moveForm(item, back) {
  if (item.step === 'done') return '<span style="font-size:12px;color:#1f6a43;font-weight:700">Complete</span>';
  const opts = nextSteps(item.step, item.heldFrom).filter((s) => s.id !== 'hold')
    .map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  const holds = item.step === 'hold' ? '' : `<optgroup label="Put on Hold…">${HOLDS.map((r) => `<option value="hold|${esc(r)}">${esc(r)}</option>`).join('')}</optgroup>`;
  return `<form class="mv" method="post" action="/items/${esc(item.id)}/move"><input type="hidden" name="back" value="${esc(back)}">
    <label style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)" for="mv-${esc(item.id)}">Move ${esc(item.name)} to</label>
    <select id="mv-${esc(item.id)}" name="to">${opts}${holds}</select><button>Move</button></form>${['salesrev', 'proofwait'].includes(item.step) ? ` <a href="/items/${esc(item.id)}/send-proof" style="font-size:12px;font-weight:700">${item.step === 'proofwait' ? 'Resend proof' : 'Send proof'}</a>` : ''}${item.projectId ? ` <a href="/projects/${esc(item.projectId)}?mode=demo&tab=notes" style="font-size:12px;font-weight:600" title="Type @ and a name to notify someone">+ Add a Note</a>` : ''}`;
}

function flags(it) {
  const out = [];
  if (it.rush) out.push(['RUSH', '#fbeaec', '#8f2a34']);
  if (it.proof) out.push([`PROOF ${it.proof}`, '#e8f0fb', '#1d4f91']);
  if (it.handoff) out.push([it.handoff.toUpperCase(), '#e6f2ec', '#1f6a43']);
  if (it.step === 'hold') out.push(['ON HOLD', '#fbeaec', '#8f2a34']);
  if (it.revision) out.push([`DESIGN REVISION ${it.revision}`, '#f3f0fa', '#4a3373']);
  return out;
}
const pills = (it) => flags(it).map(([t, bg, fg]) => `<span class="pill" style="background:${bg};color:${fg}">${esc(t)}</span>`).join(' ');

function cell(key, it) {
  const st = stepById(it.step);
  switch (key) {
    case 'due': return `<span style="font-weight:600;white-space:nowrap;color:${dueColor(it.due)}">${esc(nice(it.due))}</span>`;
    case 'ref': return `<span style="white-space:nowrap">${esc(it.ref)}</span>`;
    case 'title': return `<a href="/projects/${esc(it.projectId)}?mode=demo" style="color:#1b2436;font-weight:700">${esc(it.name)}</a>`;
    case 'customer': return esc(it.customer);
    case 'step': return `<span style="display:inline-flex;gap:6px;align-items:center;white-space:nowrap"><span style="width:8px;height:8px;border-radius:4px;background:${st?.color}"></span>${esc(st?.name)}${it.step === 'hold' ? ': ' + esc(it.holdReason) : ''}</span>`;
    case 'person': return esc(it.person);
    case 'note': return esc(it.note || '—');
    case 'flags': return pills(it) || '—';
    case 'sales': return 'Justin';
    case 'station': return esc(it.station || '—');
    case 'handoff': return esc(it.handoff || '—');
    case 'qty': return esc(it.qty || 1);
    case 'cb': return esc(cbStatusOf(it) || '—');
    default: return '';
  }
}

export function boardPage({ user, board, items, view, columns, log, flash, filters = {}, shipInfo = {}, checklists = null, custFlags = {}, holdReasons = null }) {
  HOLDS = Array.isArray(holdReasons) && holdReasons.length ? holdReasons : HOLD_REASONS;
  const steps = boardSteps(board);
  const ids = new Set(steps.map((s) => s.id));
  const all = items.filter((it) => ids.has(it.step) || (it.step === 'hold' && ids.has(it.heldFrom)));
  const f = filters || {};
  // Assigned to filters everything; Station narrows WIP; Destination narrows Built.
  const todayB = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const me = String((user && (user.name || user.email)) || '').split(/[ @]/)[0].toLowerCase();
  const CHIPS = { ready: (it) => it.step !== 'hold', mine: (it) => !!me && String(it.person || '').toLowerCase().startsWith(me), rush: (it) => !!it.rush, late: (it) => !!it.due && it.due < todayB && it.step !== 'done', held: (it) => it.step === 'hold' };
  const chipOk = (it) => !CHIPS[f.chip] || CHIPS[f.chip](it);
  const mine = all.filter((it) => chipOk(it) && (!f.who || it.person === f.who) && (!f.station || it.step !== 'wip' || it.station === f.station) && (!f.handoff || it.step !== 'built' || it.handoff === f.handoff));
  const title = board === 'design' ? 'Design Board' : 'Production Board';
  const back = `/boards/${board}`;
  const seg = ['board', 'list'].map((v) => `<a href="${back}?view=${v}" class="${view === v ? 'on' : ''}">${v === 'board' ? 'Board' : 'List'}</a>`).join('');
  const colsMenu = view !== 'list' ? '' : `<details class="cols"><summary class="btn">Columns ${columns.filter((c) => c.on).length}/${columns.length}</summary>
    <form class="menu" method="get" action="${back}"><input type="hidden" name="view" value="list"><input type="hidden" name="cols" value="1">
    <div style="font-size:11px;font-weight:700;letter-spacing:.6px;color:#5a6478">SHOW COLUMNS</div>
    ${columns.map((c) => `<label><input type="checkbox" name="c" value="${c.key}" ${c.on ? 'checked' : ''} ${c.lock ? 'disabled' : ''} style="width:16px;height:16px;accent-color:#a8343f">${esc(c.label)}${c.lock ? ' <span style="color:#5a6478;font-size:11px">always</span>' : ''}</label>`).join('')}
    <button class="btn primary" style="margin-top:6px">Apply</button><span style="font-size:11px;color:#5a6478">Saved for you on this board.</span></form></details>`;
  const opts = (vals, cur) => ['', ...new Set(vals.filter(Boolean))].map((v) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${v ? esc(v) : 'All'}</option>`).join('');
  const anyF = f.who || f.station || f.handoff;
  const chipQs = (k) => `${back}?view=${esc(view)}${k ? '&chip=' + k : ''}${f.who ? '&who=' + encodeURIComponent(f.who) : ''}`;
  const chipBar = `<div role="group" aria-label="Quick filter" style="display:flex;gap:6px;flex-wrap:wrap;padding:0 20px 8px">${[['ready', 'Ready'], ['mine', 'Mine'], ['rush', 'Rush'], ['late', 'Late'], ['held', 'On Hold'], ['', 'All']].map(([k, l]) => { const on = (f.chip || '') === k; const n = k ? all.filter(CHIPS[k]).length : all.length; return `<a href="${chipQs(k)}" aria-current="${on}" style="font-size:13px;font-weight:600;border-radius:16px;padding:5px 12px;text-decoration:none;border:1px solid ${on ? '#16213a' : '#d5dbe5'};background:${on ? '#16213a' : '#fff'};color:${on ? '#fff' : 'var(--ink)'}">${l} <span style="opacity:.7">${n}</span></a>`; }).join('')}</div>`;
  const filterBar = chipBar + `<form method="get" action="${back}" class="tools" style="padding:0 20px 12px;font-size:13px;gap:12px"><input type="hidden" name="view" value="${esc(view)}">${f.chip ? `<input type="hidden" name="chip" value="${esc(f.chip)}">` : ''}
    <label>Assigned to <select name="who" data-autosubmit style="font:inherit;min-height:32px;border:1px solid #d5dbe5;border-radius:8px">${opts(all.map((i) => i.person), f.who)}</select></label>
    ${board === 'production' ? `<label>Station (WIP) <select name="station" data-autosubmit style="font:inherit;min-height:32px;border:1px solid #d5dbe5;border-radius:8px">${opts(all.map((i) => i.station), f.station)}</select></label>
    <label>Destination (Built) <select name="handoff" data-autosubmit style="font:inherit;min-height:32px;border:1px solid #d5dbe5;border-radius:8px">${opts(['Install', 'Pickup', 'Deliver', 'Ship', ...all.map((i) => i.handoff)], f.handoff)}</select></label>` : ''}
    <noscript><button class="btn">Filter</button></noscript>${anyF ? `<a class="btn" href="${back}?view=${esc(view)}">Clear</a>` : ''}</form>`;
  const holdCount = mine.filter((i) => i.step === 'hold').length;
  const head = `<div class="bar"><h1>${title}</h1><span style="color:#5a6478;font-size:13px">${mine.length} items${holdCount ? ` · ${holdCount} on hold` : ''}</span><span style="flex:1"></span>
    <div class="tools"><div class="seg" role="group" aria-label="View">${seg}</div>${colsMenu}
    <form method="post" action="/demo/reset" style="display:inline"><input type="hidden" name="back" value="${back}"><button class="btn">Reset Demo</button></form></div></div>
    ${flash ? `<div class="note" style="background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}
    <div class="note" style="background:#fff4e0;color:#7a4e00">Demo data. Moving an item shows the CoreBridge status SalesMax <b>would</b> push; CoreBridge writes are off in the test copy.</div>${filterBar}`;

  let main;
  if (view === 'list') {
    const vis = columns.filter((c) => c.on);
    const order = new Map(steps.map((s, i) => [s.id, i]));
    const rows = mine.slice().sort((a, b) => (order.get(a.step === 'hold' ? a.heldFrom : a.step) - order.get(b.step === 'hold' ? b.heldFrom : b.step)) || String(a.due).localeCompare(String(b.due)));
    main = `<div class="lst"><table><thead><tr>${vis.map((c) => `<th scope="col">${esc(c.label)}</th>`).join('')}<th scope="col">Move to</th></tr></thead><tbody>
      ${rows.map((it) => `<tr style="box-shadow:inset 4px 0 0 ${it.rush ? '#a8343f' : it.step === 'hold' ? '#a8343f' : 'transparent'}">${vis.map((c) => `<td>${cell(c.key, it)}</td>`).join('')}<td style="min-width:220px">${moveForm(it, back + '?view=list')}</td></tr>`).join('')}
      </tbody></table><div style="padding:10px 14px;font-size:12px;color:#5a6478;border-top:1px solid #eef1f5">${rows.length} items · in workflow order, then due date</div></div>`;
  } else {
    const colsHtml = [...steps, HOLD].map((s) => {
      const list = mine.filter((it) => it.step === s.id);
      if (s.id === 'hold' && !list.length) return '';
      const over = s.limit && list.length >= s.limit;
      return `<section class="col" aria-label="${esc(s.name)}" style="--c:${s.color}"><div class="chd"><h2 data-free><span>${esc(s.name)}</span><span style="font-weight:600;color:${over ? '#a8343f' : '#5a6478'}">${list.length}${s.limit ? ' of ' + s.limit + ' max' : ''}</span></h2>
        <div class="hint">${esc(s.owner)} · ${s.cb ? 'CoreBridge: ' + esc(s.cb) : 'Stays in SalesMax'}</div></div>
        ${list.map((it) => `<div class="it" style="--e:${it.rush || it.step === 'hold' ? '#a8343f' : '#c9d1e0'}">
          <div style="display:flex;justify-content:space-between;color:#5a6478;font-weight:600"><span>${esc(it.ref)}</span><span style="color:${dueColor(it.due)}">${esc(nice(it.due))}</span></div>
          <b style="font-size:13px"><a href="/projects/${esc(it.projectId)}?mode=demo">${esc(it.name)}</a></b>${board === 'production' ? asmLine(it) : ''}<span style="color:#3d4658">${esc(it.customer)}</span>${custFlags[it.customer] ? `<span title="Customer flag" style="font-size:12px;line-height:1.35;color:#5c3a0c;background:#fff8ec;border:1px solid #f2d29b;border-radius:6px;padding:4px 8px">⚑ ${esc(custFlags[it.customer])}</span>` : ''}
          ${it.step === 'hold' ? `<span style="background:#fbeaec;color:#6e1f27;border-radius:6px;padding:4px 6px">${esc(it.holdReason)}</span>` : it.note ? `<span style="background:#f3f0fa;color:#4a3373;border-radius:6px;padding:4px 6px">${esc(it.note)}</span>` : ''}
          <div>${pills(it)} <span class="avi" title="${esc(it.person)}">${esc(String(it.person || '?').replace(/\([^)]*\)/g, ' ').split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?')}</span></div>${moveForm(it, back)}${checklists ? cardChecklist(it, checklists.saved, (checklists.checks || {})[it.id], back) : ''}${shipCard(it, shipInfo, back, board)}</div>`).join('') || '<div class="cempty">Nothing here</div>'}
      </section>`;
    }).join('');
    const n = steps.length + (mine.some((i) => i.step === 'hold') ? 1 : 0);
    main = `<div class="kan" style="grid-template-columns:repeat(${n},minmax(${n > 6 ? 168 : 220}px,1fr))">${colsHtml}</div>`;
  }
  const logHtml = log && log.length ? `<div class="log"><b>Recent moves</b><ul style="margin:6px 0 0;padding-left:18px">${log.map((l) => `<li>${esc(new Date(l.at).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }))}: “${esc((items.find((x) => x.id === l.itemId) || {}).name || l.itemId)}” ${esc(stepById(l.from)?.name)} → ${esc(stepById(l.to)?.name)}${l.reason ? ' (' + esc(l.reason) + ')' : ''}. ${l.cbWouldPush ? `Would push <b>${esc(l.cbWouldPush)}</b> to CoreBridge.` : 'Nothing sent to CoreBridge.'}</li>`).join('')}</ul></div>` : '';
  const instHtml = board === 'production' ? installsWeek(mine) : '';
  return page({ title, user, tab: board === 'design' ? 'Design' : 'Production', body: `<style>${BOARD_CSS}</style>${head}${main}${instHtml}${logHtml}`, mode: 'demo' });
}

// Project › Products, in the mockup style (Phil, Nov 13): one row per product with Status, Proof, Due and Price;
// click a row to see its note, CoreBridge status and the Move form.
export function itemsPanel(items, back, totals = null, permitFlags = {}) {
  if (!items.length) return '<p style="color:var(--mute);margin:0">No items yet.</p>';
  const money = (n) => (n == null || n === '' || !Number.isFinite(Number(n)) ? '—' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const G = 'display:grid;grid-template-columns:18px minmax(0,2.4fr) minmax(0,1.6fr) 70px 80px 90px;gap:10px;align-items:center';
  const proofOf = (it) => (it.proof ? `<span style="font-size:12px;font-weight:600;color:${it.step === 'proofwait' ? '#874511' : '#1f6a43'}">${esc(it.proof)}${it.step === 'proofwait' ? ' · waiting' : ''}</span>` : '<span style="color:#5a6478">—</span>');
  const rows = items.map((it) => `<details class="prow" style="border-bottom:1px solid #eef1f5"><summary data-free style="${G};list-style:none;cursor:pointer;padding:10px 0;font-size:13px"><span aria-hidden="true" class="prchev" style="color:#5a6478">›</span><span style="min-width:0"><b style="display:block;overflow-wrap:anywhere">${esc(it.name)}</b><span style="font-size:12px;color:#5a6478">${esc(it.ref || '')}</span>${pills(it) ? `<span style="margin-left:6px">${pills(it)}</span>` : ''}</span><span>${cell('step', it)}</span><span>${proofOf(it)}</span><span>${cell('due', it)}</span><span style="text-align:right;font-weight:600">${money(it.price)}</span></summary><div style="padding:0 0 12px 28px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;font-size:13px"><div style="display:flex;flex-direction:column;gap:4px"><span style="color:#5a6478">Who has it: <b style="color:#1b2436">${esc(it.person || '—')}</b></span><span style="color:#5a6478">CoreBridge status: <b style="color:#1b2436">${esc(cbStatusOf(it) || '—')}</b></span>${it.note ? `<span style="color:#3d4658">${esc(it.note)}</span>` : ''}</div><div style="min-width:220px;display:flex;flex-direction:column;gap:8px">${moveForm(it, back)}${/permit/i.test(String(it.product || it.name || '')) ? '<span style="font-size:12px;color:#1d4f91;font-weight:600">Permit line · goes to the Permits board when the order is placed</span>' : ''}<form method="post" action="/items/${esc(it.id)}/permit" style="margin:0"><input type="hidden" name="back" value="${esc(back)}"><input type="hidden" name="on" value="${permitFlags[it.id] ? '0' : '1'}"><button class="btn" style="min-height:32px;font-size:12px" aria-pressed="${!!permitFlags[it.id]}">${permitFlags[it.id] ? '✓ Needs a Permit · on the Permits Board' : 'Needs a Permit?'}</button></form></div></div></details>`).join('');
  // Mockup SendProof: one dialog for every product with a proof to send, ticked together (review fix).
  const sendable = items.filter((it) => ['salesrev', 'proofwait'].includes(it.step));
  const pid = items[0] && items[0].projectId;
  const sendDlg = sendable.length && pid ? `<details class="sendp" style="position:relative;margin:0 0 10px"><summary class="btn primary" style="list-style:none;display:inline-flex">Send Proof${sendable.length > 1 ? 's' : ''} (${sendable.length})</summary><form method="post" action="/projects/${esc(pid)}/send-proofs" style="position:absolute;left:0;top:44px;z-index:40;width:min(460px,92vw);background:#fff;border:1px solid #e3e7ee;border-radius:12px;box-shadow:0 12px 32px rgba(22,33,58,.18);padding:14px;display:flex;flex-direction:column;gap:8px"><b style="font-size:15px">Send Proof</b><span style="font-size:12px;color:#5a6478">Tick the proofs to send in one email. They open on the customer's order page.</span>${sendable.map((it) => `<label style="display:flex;gap:10px;align-items:center;border:1px solid #e3e7ee;border-radius:8px;padding:8px 10px;min-height:44px"><input type="checkbox" name="item" value="${esc(it.id)}" ${it.step === 'salesrev' ? 'checked' : ''} style="width:18px;height:18px;accent-color:#a8343f"><span style="flex:1"><b style="display:block;font-size:13px">${esc(it.name)}</b><span style="font-size:12px;color:#5a6478">${esc(it.ref || '')}${it.proof ? ' · ' + esc(it.proof) : ''}${it.step === 'proofwait' ? ' · already sent, send again' : ''}</span></span></label>`).join('')}<input type="hidden" name="back" value="${esc(back)}"><div style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span style="font-size:12px;color:#5a6478">Test copy: no email goes out.</span><span style="display:flex;gap:8px">${sendable.length === 1 ? `<a class="btn" href="/items/${esc(sendable[0].id)}/send-proof">Edit Email</a>` : ''}<button class="btn primary">Send</button></span></div></form></details>` : '';
  const t = totals || {};
  const line = (k, v, strong = false, c = '#1b2436') => `<span style="color:${strong ? '#1b2436' : '#3d4658'};${strong ? 'font-weight:700' : ''}">${k}</span><span style="text-align:right;color:${c};${strong ? 'font-weight:700' : 'font-weight:600'}">${v}</span>`;
  const tot = t.total != null ? `<div style="display:grid;grid-template-columns:1fr auto;gap:4px 24px;max-width:320px;margin:12px 0 0 auto;font-size:13px">${line('Subtotal', money(t.subtotal ?? t.total))}${line('Discount', t.discount ? '−' + money(t.discount) : money(0))}${t.shipping ? line('Shipping', money(t.shipping)) : ''}<span style="grid-column:1/-1;border-top:2px solid #1b2436;margin:4px 0"></span>${line('Total', money(t.total), true)}${t.deposit ? line('Deposit paid', '−' + money(t.deposit), false, '#1f6a43') : ''}${t.balance != null ? line('Balance due', money(t.balance), true, '#874511') : ''}<span style="grid-column:1/-1;font-size:11px;color:#5a6478;text-align:right">Taxes are added by CoreBridge on the invoice.</span></div>` : '';
  return sendDlg + `<style>${BOARD_CSS}.prow[open]>summary .prchev{transform:rotate(90deg);display:inline-block}.prow>summary::-webkit-details-marker{display:none}@media (max-width:700px){.prow>summary,.prhead{grid-template-columns:18px 1fr auto!important}.prow>summary>span:nth-child(3),.prow>summary>span:nth-child(4),.prhead>span:nth-child(3),.prhead>span:nth-child(4){display:none}}</style><div class="prhead" style="${G};font-size:12px;color:#5a6478;font-weight:600;padding:6px 0;border-bottom:1px solid #e3e7ee"><span></span><span>Product</span><span>Status</span><span>Proof</span><span>Due</span><span style="text-align:right">Price</span></div>${rows}${tot}`;
}

// Production enters Shipping Details right on the card (Ship hand-offs only). Saved to the order; needed before Built.
function shipCard(it, info, back, board) {
  const s = board === 'production' && info && info[it.projectId];
  if (!s || !s.ship || it.step === 'done') return '';
  const pk = s.packages || [];
  const row = (n) => { const b = pk[n] || {}; const i = (k, l, v) => `<input name="${k}${n}" inputmode="decimal" aria-label="Box ${n + 1} ${l}" placeholder="${l}" value="${esc(v || '')}" style="font:inherit;font-size:12px;min-height:30px;border:1px solid #d5dbe5;border-radius:6px;padding:0 4px;min-width:0;width:100%;box-sizing:border-box">`; return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">${i('w', 'lb', b.weight)}${i('l', 'L in', b.length)}${i('d', 'W in', b.width)}${i('h', 'H in', b.height)}</div>`; };
  return `<details style="border-top:1px solid #eef1f5;padding-top:6px"><summary style="cursor:pointer;font-weight:700;color:${pk.length ? '#1f6a43' : '#8f2a34'}">Shipping Details · ${pk.length ? `${pk.length} Box${pk.length > 1 ? 'es' : ''} Saved` : 'Needed Before Built'}</summary><form method="post" action="/projects/${esc(it.projectId)}/boxes" style="display:flex;flex-direction:column;gap:4px;margin-top:6px"><input type="hidden" name="back" value="${esc(back)}">${row(0)}${row(1)}<button class="btn" style="min-height:30px;font-size:12px">Save Shipping Details</button></form></details>`;
}

// Production board: installs in the next 7 days, by day (mockup "Installs This Week").
export function installsWeek(items, today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })) {
  const end = new Date(new Date(today + 'T12:00:00Z').getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const list = items.filter((i) => i.handoff === 'Install' && i.step !== 'done' && i.due && i.due <= end).sort((a, b) => String(a.due).localeCompare(String(b.due)));
  const days = {};
  for (const i of list) (days[i.due] = days[i.due] || []).push(i);
  const label = (d) => (d < today ? 'Overdue · ' : d === today ? 'Today · ' : '') + new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const rows = Object.entries(days).map(([d, its]) => `<div style="display:grid;grid-template-columns:150px 1fr;gap:12px;padding:10px 16px;border-top:1px solid #eef1f5"><b style="font-size:13px;color:${d < today ? '#a8343f' : '#1b2436'}">${esc(label(d))}</b><div style="display:flex;flex-direction:column;gap:6px">${its.map((i) => `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px"><a href="/projects/${esc(i.projectId)}?mode=demo"><b>${esc(i.name)}</b></a><span style="color:#5a6478">${esc(i.customer)}</span>${i.note ? `<span style="font-size:12px;background:#f3f0fa;color:#4a3373;border-radius:6px;padding:2px 6px">${esc(i.note)}</span>` : ''}<span style="margin-left:auto;font-size:12px;color:#3d4658">${esc(i.person || 'Unassigned')} · ${i.step === 'built' ? '<span style="color:#1f6a43;font-weight:700">Built, ready</span>' : '<span style="color:#874511;font-weight:700">Not built yet</span>'}</span></div>`).join('')}</div></div>`).join('');
  return `<section aria-labelledby="inst-h" style="background:#fff;border:1px solid #e3e7ee;border-radius:12px;margin:16px 20px"><div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;gap:12px;flex-wrap:wrap"><h2 id="inst-h" style="margin:0;font-size:15px">Installs This Week</h2><span style="font-size:12px;color:#5a6478">${list.length} install${list.length === 1 ? '' : 's'} in the next 7 days</span></div>${rows || '<div style="padding:10px 16px;border-top:1px solid #eef1f5;font-size:13px;color:#5a6478">No installs in the next 7 days.</div>'}</section>`;
}

// One-line production summary under the card title (mockup monospace note). Built only from what SalesMax knows.
export function asmLine(it = {}) {
  const parts = [it.qty ? `${it.qty} ×` : '', it.size || '', it.material || '', it.station || '', it.handoff ? `→ ${it.handoff}` : ''].filter(Boolean);
  if (!parts.length) return '';
  return `<div title="Production summary" style="font-size:12px;line-height:1.4;color:#1b2436;background:#f6f7f9;border-left:3px solid #6b4fa0;border-radius:4px;padding:4px 8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${esc(parts.join(' '))}</div>`;
}
