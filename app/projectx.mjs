// Project page extras: this project's tasks, move history, and "Approved & Paid" to start production.
import { esc } from './views.mjs';

const nice = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function projectTasksHtml(projectId, tasks, today) {
  const open = tasks.filter((t) => !t.done && t.projectId === projectId).sort((a, b) => a.due.localeCompare(b.due));
  const rows = open.map((t) => `<li style="display:flex;gap:8px;align-items:center;padding:6px 0;border-top:1px solid #eef1f5"><span style="flex:1"><b>${esc(t.title)}</b><br><small style="color:${t.due < today ? '#a8343f' : 'var(--mute)'}">${t.due < today ? 'Past due · ' : ''}${esc(nice(t.due))}</small></span><form method="post" action="/activities/tasks/${esc(t.id)}/done" style="margin:0"><button class="btn" aria-label="Mark “${esc(t.title)}” done">Done</button></form></li>`).join('');
  return `<section class="panel" aria-label="Next steps"><div style="display:flex;align-items:center;gap:8px"><h2 style="margin:0;font-size:15px">Next Steps · ${open.length}</h2><a class="btn" style="margin-left:auto" href="/activities?new=1&project=${esc(projectId)}">+ Add Task</a></div>
${open.length ? `<ul style="list-style:none;margin:8px 0 0;padding:0">${rows}</ul>` : '<p style="margin:8px 0 0;color:#7a4e00;font-size:13px">No next step yet. Add one so this project doesn’t stall.</p>'}</section>`;
}

export function historyHtml(entries, stepName = (x) => x) {
  if (!entries.length) return '';
  return `<section class="panel" aria-label="History"><details><summary style="cursor:pointer;font-weight:700">History · ${entries.length}</summary><ol style="list-style:none;margin:8px 0 0;padding:0;font-size:13px">${entries.map((l) => `<li style="padding:5px 0;border-top:1px solid #eef1f5">${esc(new Date(l.at).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))} · ${esc(l.itemName || '')}: ${esc(stepName(l.from))} → ${esc(stepName(l.to))}${l.by ? ` · ${esc(String(l.by).split('@')[0])}` : ''}</li>`).join('')}</ol></details></section>`;
}

export const HOW = [['deposit', 'Deposit paid'], ['po', 'PO received'], ['terms', 'Customer has terms']];
export function approveProject(overrides, p, f, { by, at }) {
  if (p.lane !== 'estimate') throw new Error('only an estimate can be approved');
  if (!HOW.some(([k]) => k === f.how)) throw new Error('pick how the customer is paying');
  const rec = { lane: 'progress', status: 'In production', how: f.how, by, at };
  if (f.how === 'deposit') { const a = Number(String(f.amount || '').replace(/[$,\s]/g, '')); if (!(a > 0)) throw new Error('enter the deposit amount'); rec.deposit = a; }
  if (f.how === 'po') { const n = String(f.poNumber || '').trim(); if (n.length < 2) throw new Error('enter the PO number'); rec.poNumber = n.slice(0, 40); }
  return { ...(overrides || {}), [p.id]: rec };
}

export function approveHtml(p, depositPct = 50) {
  if (p.lane !== 'estimate') return '';
  const dep = Math.round((Number(p.total) || 0) * depositPct) / 100;
  return `<section class="panel" aria-label="Approve estimate" style="border-color:#9fd0b2"><h2 style="margin:0 0 8px;font-size:15px">Customer Said Yes?</h2>
<form method="post" action="/projects/${esc(p.id)}/approve" style="display:flex;flex-direction:column;gap:8px"><fieldset style="border:0;margin:0;padding:0;display:flex;gap:8px;flex-wrap:wrap"><legend style="font-size:13px;margin-bottom:4px">How are they paying?</legend>${HOW.map(([k, l], n) => `<label style="display:flex;gap:6px;align-items:center;min-height:40px;border:1px solid #d5dbe5;border-radius:16px;padding:0 12px"><input type="radio" name="how" value="${k}" ${n === 0 ? 'checked' : ''}> ${l}</label>`).join('')}</fieldset>
<div style="display:flex;gap:8px;flex-wrap:wrap"><label style="display:flex;flex-direction:column;font-size:12px">Deposit ($)<input name="amount" inputmode="decimal" value="${dep ? dep.toFixed(2) : ''}" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px;width:140px"></label><label style="display:flex;flex-direction:column;font-size:12px">PO #<input name="poNumber" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label></div>
<button class="btn primary" style="align-self:flex-start">Approved · Start Production</button><span style="font-size:12px;color:var(--mute)">Test copy: this moves the project in SalesMax only. Nothing is sent to CoreBridge.</span></form></section>`;
}

export const LOST_REASONS = ['Price', 'Went with another shop', 'Timing / budget moved', 'No response', 'Did it themselves', 'Other'];
export function markLost(overrides, p, f, { by, at }) {
  if (!['prospect', 'estimate'].includes(p.lane)) throw new Error('only prospects and estimates can be marked lost');
  if (!LOST_REASONS.includes(f.reason)) throw new Error('pick why it was lost');
  return { ...(overrides || {}), [p.id]: { lane: 'lost', status: `Lost: ${f.reason}`, reason: f.reason, note: String(f.note || '').trim().slice(0, 300), by, at } };
}
export function lostHtml(p) {
  if (!['prospect', 'estimate'].includes(p.lane)) return '';
  return `<section class="panel" aria-label="Mark lost"><details><summary style="cursor:pointer;font-weight:700;color:#5a6478">Mark as Lost</summary><form method="post" action="/projects/${esc(p.id)}/lost" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:8px"><label style="display:flex;flex-direction:column;font-size:12px">Why<select name="reason" style="font:inherit;min-height:36px">${LOST_REASONS.map((r) => `<option>${r}</option>`).join('')}</select></label><label style="display:flex;flex-direction:column;font-size:12px;flex:1">Note<input name="note" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><button class="btn">Mark Lost</button></form></details></section>`;
}
