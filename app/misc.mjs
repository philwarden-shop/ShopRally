// Search, Feedback, My Profile & Settings, Change Log, and the order-page payment panel (card fee from Admin).
import { page, esc } from './views.mjs';

const money = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function search(q, { projects = [], customers = [], tasks = [] }) {
  const s = String(q || '').trim().toLowerCase();
  if (s.length < 2) return { projects: [], customers: [], tasks: [] };
  const hit = (...f) => f.some((x) => String(x || '').toLowerCase().includes(s));
  return {
    customers: customers.filter((c) => hit(c.name, ...(c.contacts || []))).slice(0, 10),
    projects: projects.filter((p) => hit(p.name, p.company, p.contact, p.orderId)).slice(0, 15),
    tasks: tasks.filter((t) => !t.done && hit(t.title, t.customer)).slice(0, 10),
  };
}

export function searchPage({ user, q = '', results }) {
  const sec = (title, list, row) => `<section class="panel"><h2 style="margin:0 0 8px;font-size:15px">${title} · ${list.length}</h2>${list.length ? `<ul style="list-style:none;margin:0;padding:0">${list.map((x) => `<li style="padding:6px 0;border-top:1px solid #eef1f5">${row(x)}</li>`).join('')}</ul>` : '<p style="margin:0;color:var(--mute)">No matches.</p>'}</section>`;
  const body = `<div class="wrap"><div class="bar" style="padding:14px 0"><h1>Search</h1></div><form role="search" style="margin-bottom:12px;display:flex;gap:8px"><label for="sq" style="position:absolute;left:-9999px">Search</label><input id="sq" name="q" value="${esc(q)}" placeholder="Customer, project, contact or order #" style="flex:1;font:inherit;min-height:42px;border:1px solid #d5dbe5;border-radius:10px;padding:0 12px"><button class="btn primary">Search</button></form>
${q ? sec('Customers', results.customers, (c) => `<a href="/customers/${esc(c.id)}"><b>${esc(c.name)}</b></a>`) + sec('Projects', results.projects, (p) => `<a href="/projects/${esc(p.id)}?mode=demo"><b>${esc(p.name)}</b></a> · ${esc(p.company)}`) + sec('Open Tasks', results.tasks, (t) => `<a href="/activities">${esc(t.title)}</a> · ${esc(t.customer)}`) : ''}</div>`;
  return page({ title: 'Search', user, tab: '', body });
}

export const FEEDBACK_KINDS = ['Something is broken', 'Idea', 'Confusing', 'Praise'];
export function addFeedback(list, f, { who, at }) {
  if (!FEEDBACK_KINDS.includes(f.kind)) throw new Error('pick what kind of feedback this is');
  const text = String(f.text || '').trim();
  if (text.length < 3) throw new Error('tell us a little more');
  return [{ kind: f.kind, text: text.slice(0, 2000), page: String(f.page || '').slice(0, 200), who, at }, ...(list || [])].slice(0, 500);
}
export function feedbackPage({ user, list = [], flash = '', from = '' }) {
  const body = `<div class="wrap" style="max-width:720px"><div class="bar" style="padding:14px 0"><h1>Send Feedback</h1></div>${flash ? `<div class="note" style="margin:0 0 12px;background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}
<form method="post" action="/feedback" class="panel" style="display:flex;flex-direction:column;gap:10px"><input type="hidden" name="page" value="${esc(from)}">
<fieldset style="border:0;padding:0;margin:0;display:flex;gap:8px;flex-wrap:wrap"><legend style="font-size:13px;margin-bottom:6px">What kind?</legend>${FEEDBACK_KINDS.map((k, n) => `<label style="display:flex;gap:6px;align-items:center;min-height:40px;border:1px solid #d5dbe5;border-radius:16px;padding:0 12px"><input type="radio" name="kind" value="${esc(k)}" ${n === 0 ? 'checked' : ''}> ${esc(k)}</label>`).join('')}</fieldset>
<label style="display:flex;flex-direction:column;gap:4px;font-size:13px">Tell us<textarea name="text" rows="4" required minlength="3" style="font:inherit;border:1px solid #d5dbe5;border-radius:8px;padding:8px"></textarea></label><button class="btn primary" style="align-self:flex-start">Send Feedback</button></form>
${list.length ? `<section class="panel"><details><summary style="cursor:pointer;font-weight:700">Recent Feedback · ${list.length}</summary><ul style="margin:8px 0 0;padding-left:18px">${list.slice(0, 30).map((x) => `<li><b>${esc(x.kind)}</b> · ${esc(x.who)} · ${esc(x.text)}</li>`).join('')}</ul></details></section>` : ''}</div>`;
  return page({ title: 'Send Feedback', user, tab: '', body });
}

export const NOTIFY = [['dailyDigest', 'Morning summary email'], ['proofApproved', 'When a customer approves a proof'], ['paymentIn', 'When a payment comes in'], ['stuckEscalation', 'When something I own gets stuck']];
export function mergeMe(prev, f) {
  const out = { ...(prev || {}) };
  const name = String(f.displayName || '').trim();
  if (name && name.length < 2) throw new Error('your name needs at least 2 letters');
  if (name) out.displayName = name.slice(0, 60);
  for (const [k] of NOTIFY) out[k] = f[k] === 'on';
  return out;
}
export function mePage({ user, me = {}, flash = '' }) {
  const body = `<div class="wrap" style="max-width:720px"><div class="bar" style="padding:14px 0"><h1>My Profile &amp; Settings</h1></div>${flash ? `<div class="note" style="margin:0 0 12px;background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}
<form method="post" action="/me" class="panel" style="display:flex;flex-direction:column;gap:10px"><label style="display:flex;flex-direction:column;gap:4px;font-size:13px">Name people see<input name="displayName" value="${esc(me.displayName || user?.name || '')}" style="font:inherit;min-height:40px;border:1px solid #d5dbe5;border-radius:8px;padding:0 10px"></label>
<div style="font-size:13px;color:var(--mute)">Signed in as ${esc(user?.email || '')}. Theme and location are in the menu under your initials.</div>
<fieldset style="border:0;padding:0;margin:0"><legend style="font-weight:700;margin-bottom:6px">Tell Me When</legend>${NOTIFY.map(([k, l]) => `<label style="display:flex;gap:10px;align-items:center;min-height:40px"><input type="checkbox" name="${k}" ${me[k] !== false ? 'checked' : ''} style="width:20px;height:20px"> ${esc(l)}</label>`).join('')}</fieldset>
<button class="btn primary" style="align-self:flex-start">Save</button><a href="/me/digest">Preview Morning Summary</a></form></div>`;
  return page({ title: 'My Profile & Settings', user, tab: '', body });
}

export function changeLogPage({ user, log, stepName = (x) => x }) {
  const rows = log.map((l) => `<tr><td>${esc(new Date(l.at).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}</td><td>${esc(l.by || '')}</td><td>${esc(l.itemName || l.itemId || l.id || '')}</td><td>${esc(stepName(l.from))} → ${esc(stepName(l.to))}</td><td>${esc(l.reason || l.note || '')}</td></tr>`).join('');
  const body = `<div class="wrap"><div class="bar" style="padding:14px 0"><h1>Change Log</h1></div><section class="panel"><table><thead><tr><th>When</th><th>Who</th><th>Item</th><th>Move</th><th>Why</th></tr></thead><tbody>${rows || '<tr><td colspan="5" style="color:var(--mute)">No moves yet.</td></tr>'}</tbody></table></section></div>`;
  return page({ title: 'Change Log', user, tab: '', body });
}

// Order page payment panel: eCheck has no fee; card adds the Admin card fee. Card processing (Fiserv CardPointe) is not connected yet.
export function payAmounts(balance, cardFeePct = 3) {
  const b = Math.round((Number(balance) || 0) * 100);
  return { echeck: b / 100, card: Math.round(b * (1 + Number(cardFeePct) / 100)) / 100, fee: Math.round(b * (Number(cardFeePct) / 100)) / 100 };
}
export function payPanel(balance, cardFeePct) {
  if (!(Number(balance) > 0)) return '';
  const a = payAmounts(balance, cardFeePct);
  return `<section style="background:#fff;border:1px solid #e3e7ee;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;align-items:baseline"><span style="color:#5a6478">Balance due</span><b style="font-size:20px">${money(balance)}</b></div>
<details><summary style="cursor:pointer;font-weight:700;color:#fff;background:#1d4f91;border-radius:10px;min-height:44px;display:flex;align-items:center;justify-content:center">Pay ${money(balance)}</summary><div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;font-size:14px"><span>eCheck (bank account): <b>${money(a.echeck)}</b></span><span>Card: <b>${money(a.card)}</b> <span style="color:#5a6478">(includes ${Number(cardFeePct)}% card fee)</span></span><span style="font-size:12px;color:#5a6478">Online payment is being connected. For now, call us to pay.</span></div></details></section>`;
}
