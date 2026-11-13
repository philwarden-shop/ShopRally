// Email inside the To Do list (Phil, Nov 12): one To Do per conversation, filters Need Reply · Waiting for Reply ·
// Snoozed · Draft. Sending archives the whole conversation. Nothing is ever deleted.
import { esc } from './views.mjs';

export const normSubject = (s) => { let t = String(s || '').trim(); let prev; do { prev = t; t = t.replace(/^(re|fwd?|fw)\s*:\s*/i, ''); } while (t !== prev); return t.toLowerCase(); };
export const threadKey = (m) => `${normSubject(m.subject)}|${String(m.customer || m.from || m.to || '').toLowerCase()}`;

export function wakeSnoozed(mail, nowIso) {
  return mail.map((m) => (m.folder === 'snoozed' && m.snoozeUntil && m.snoozeUntil <= nowIso ? { ...m, folder: 'inbox', snoozeUntil: null } : m));
}
export function snooze(mail, id, days, now) {
  const d = Math.max(1, Math.min(30, Number(days) || 1));
  const target = mail.find((m) => m.id === id);
  if (!target) throw new Error('that email is not here');
  const key = threadKey(target);
  const until = new Date(new Date(now).getTime() + d * 86400000).toISOString();
  return mail.map((m) => (m.folder === 'inbox' && threadKey(m) === key ? { ...m, folder: 'snoozed', snoozeUntil: until } : m));
}
export function archiveThread(mail, id) {
  const target = mail.find((m) => m.id === id);
  if (!target) throw new Error('that email is not here');
  const key = threadKey(target);
  return mail.map((m) => ((m.folder === 'inbox' || m.folder === 'snoozed') && threadKey(m) === key ? { ...m, folder: 'archive', snoozeUntil: null } : m));
}
export function saveDraft(mail, f, { from, at, id = 'd' + Date.now().toString(36) }) {
  const body = String(f.body || '').trim();
  if (!body && !String(f.subject || '').trim()) throw new Error('nothing to save yet');
  const existing = mail.find((m) => m.folder === 'draft' && f.replyTo && m.replyTo === f.replyTo);
  const d = { id: existing ? existing.id : id, folder: 'draft', from, to: String(f.to || ''), subject: String(f.subject || '').slice(0, 200), body: body.slice(0, 20000), replyTo: f.replyTo || '', customer: f.customer || '', projectId: f.projectId || '', at };
  return existing ? mail.map((m) => (m.id === existing.id ? d : m)) : [...mail, d];
}
export const dropDraftFor = (mail, replyTo) => (replyTo ? mail.filter((m) => !(m.folder === 'draft' && m.replyTo === replyTo)) : mail);

function waiting(mail) {
  const sent = mail.filter((m) => m.folder === 'sent');
  return sent.filter((s) => !mail.some((m) => m !== s && m.folder !== 'sent' && m.folder !== 'draft' && threadKey(m) === threadKey({ ...s, customer: s.customer || s.to }) && m.at > s.at));
}
const grouped = (list) => {
  const map = new Map();
  for (const m of list.slice().sort((a, b) => a.at.localeCompare(b.at))) { const k = threadKey(m); const g = map.get(k) || []; g.push(m); map.set(k, g); }
  return [...map.values()];
};
export function emailCounts(mail) {
  return { need: grouped(mail.filter((m) => m.folder === 'inbox')).length, waiting: waiting(mail).length, snoozed: grouped(mail.filter((m) => m.folder === 'snoozed')).length, draft: mail.filter((m) => m.folder === 'draft').length, scheduled: mail.filter((m) => m.folder === 'scheduled').length };
}
export function emailTodos(mail, view = 'need') {
  const mk = (g, extra = {}) => { const last = g[g.length - 1]; return { id: `mail-${last.id}`, mailId: last.id, kind: 'email', title: last.subject, customer: last.customer || last.name || last.from || last.to, projectId: last.projectId || '', due: String(last.at).slice(0, 10), done: false, mail: true, from: last.from, name: last.name || '', snippet: String(last.text || last.snippet || last.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240), count: g.length, matched: !!last.customer, view, ...extra }; };
  if (view === 'waiting') return waiting(mail).map((s) => mk([s], { title: s.subject, customer: s.customer || s.to }));
  if (view === 'snoozed') return grouped(mail.filter((m) => m.folder === 'snoozed')).map((g) => mk(g, { until: g[g.length - 1].snoozeUntil }));
  if (view === 'scheduled') return mail.filter((m) => m.folder === 'scheduled').sort((a, b) => String(a.sendAt).localeCompare(String(b.sendAt))).map((d) => mk([d], { title: d.subject || '(no subject)', customer: d.customer || d.to, until: d.sendAt }));
  if (view === 'draft') return mail.filter((m) => m.folder === 'draft').map((d) => mk([d], { title: d.subject || '(no subject)', customer: d.customer || d.to }));
  return grouped(mail.filter((m) => m.folder === 'inbox')).map((g) => mk(g));
}
export function emailFilterBar(counts, active) {
  const V = [['need', 'Need Reply'], ['waiting', 'Waiting for Reply'], ['snoozed', 'Snoozed'], ['draft', 'Draft'], ...(Number(counts.scheduled || 0) ? [['scheduled', 'Scheduled']] : [])];
  return `<div class="chips" role="group" aria-label="Email filter" style="justify-content:flex-end;margin:-4px 0 8px"><span style="font-size:12px;font-weight:600;color:var(--mute);align-self:center">Email</span>${V.map(([k, l]) => `<a class="chip ${active === k ? 'on' : ''}" style="background:#fff;color:#1d4f91;border:1px solid ${active === k ? '#9db7dc' : '#d5dbe5'}" href="/activities?f=email&ev=${k}">${l} · ${Number(counts[k] || 0)}</a>`).join('')}</div>`;
}
export function emailRow(t, { today, back = '/activities' }) {
  const cslug = String(t.customer || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const post = (to, label, extra = '') => `<form method="post" action="/email/${esc(t.mailId)}/${to}" style="margin:0;display:flex">${extra}<input type="hidden" name="back" value="${esc(back)}"><button class="btn">${label}</button></form>`;
  const when = t.view === 'scheduled' && t.until ? `Sends ${new Date(t.until).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : t.view === 'snoozed' && t.until ? `Back ${new Date(t.until).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' })}` : t.due === today ? 'Today' : t.due ? new Date(t.due + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
  const tag = t.view === 'scheduled' ? 'Scheduled' : t.view === 'waiting' ? 'Waiting' : t.view === 'draft' ? 'Draft' : t.view === 'snoozed' ? 'Snoozed' : 'Email';
  const count = t.count > 1 ? ` <span class="pill" style="background:#e8f0fb;color:#1d4f91">${t.count} new</span>` : '';
  const match = t.view === 'need' && !t.matched ? `<a class="btn" href="/projects/new?company=${encodeURIComponent(t.customer || '')}">+ Create Contact</a>` : '';
  const actions = t.view === 'need' ? `<a class="btn" href="/customers/${esc(cslug)}?tab=email&reply=${esc(t.mailId)}#compose">Reply</a><a class="btn" href="/customers/${esc(cslug)}?tab=email&fwd=${esc(t.mailId)}#compose">Forward</a>${match}${post('archive', 'Archive')}${post('snooze', 'Snooze', `<label style="position:absolute;left:-9999px" for="sn-${esc(t.mailId)}">Snooze for</label><select id="sn-${esc(t.mailId)}" name="days" style="font:inherit;font-size:12px;min-height:36px;border:1px solid #d5dbe5;border-radius:8px 0 0 8px"><option value="1">1 day</option><option value="3">3 days</option><option value="7">1 week</option></select>`)}${post('spam', 'Mark as Spam')}`
    : t.view === 'scheduled' ? post('unschedule', 'Cancel and Edit') : t.view === 'snoozed' ? post('wake', 'Bring Back Now') : t.view === 'draft' ? `<a class="btn" href="/customers/${esc(cslug)}?tab=email#compose">Finish Draft</a>` : `<a class="btn" href="/customers/${esc(cslug)}?tab=email">Open</a>`;
  // Mockup style (Main.dc.html): an envelope, the subject, who · customer · project, and the day on the right.
  // Click the row to read the start of the email and reply, forward, archive, snooze or mark as spam.
  const ENV = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4f91" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 7l9 6 9-6"></path></svg>';
  const who = t.name || (t.from && !String(t.from).includes('@') ? t.from : '') || t.from || '';
  const sub = [who && who !== t.customer ? `<span>${esc(who)}</span>` : '', t.customer ? `<a href="/customers/${esc(cslug)}" style="color:#1d4f91;font-weight:500;text-decoration:none">${esc(t.customer)}</a>` : '', t.projectId ? `<a href="/projects/${esc(t.projectId)}?mode=demo" style="color:#1d4f91;font-weight:500;text-decoration:none">Open project</a>` : (t.view === 'need' && !t.matched ? '<span>No customer match</span>' : '')].filter(Boolean).join('<span aria-hidden="true">·</span>');
  const dueC = t.due && t.due < today && t.view === 'need' ? '#a8343f' : '#1b2436';
  return `<details class="mrow"><summary data-free class="trow" style="list-style:none;cursor:pointer"><span style="width:36px;flex:0 0 36px;display:flex;justify-content:center;padding-top:14px;align-self:flex-start">${ENV}</span><span style="flex:1 1 auto;min-width:0;padding:12px 0;display:flex;gap:12px;align-items:flex-start"><span style="flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:4px"><span style="font-size:14px;font-weight:600;color:#1b2436">${esc(t.title)}${count}${tag !== 'Email' ? ` <span class="pill" style="background:#eef1f5;color:#3d4658">${tag}</span>` : ''}</span><span style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:#5a6478">${sub}</span></span><span style="font-size:13px;font-weight:600;white-space:nowrap;color:${dueC}">${esc(when)}</span></span></summary><div style="padding:0 20px 14px 48px;display:flex;flex-direction:column;gap:10px">${t.snippet ? `<div style="border-left:3px solid #1d4f91;background:#f8f9fb;border-radius:0 8px 8px 0;padding:10px 12px;font-size:13px;color:#3d4658;line-height:1.5">${who ? `<b style="display:block;color:#1b2436;margin-bottom:2px">${esc(who)}</b>` : ''}${esc(t.snippet)}</div>` : ''}<div style="display:flex;gap:6px;flex-wrap:wrap">${actions}</div></div></details>`;
}

// Undo Send: within 30 seconds a sent email goes back to a draft, and the email it answered goes back to Need Reply.
export const UNDO_SECONDS = 30;
export function unsend(mail, id, now = new Date().toISOString()) {
  const m = mail.find((x) => x.id === id);
  if (!m || m.folder !== 'sent') throw new Error('that email is not in Sent');
  if ((new Date(now) - new Date(m.at)) / 1000 > UNDO_SECONDS) throw new Error('too late to undo: it was sent more than 30 seconds ago');
  const draft = { id: m.id, folder: 'draft', from: m.from, to: m.to, cc: m.cc, bcc: m.bcc, subject: m.subject, body: m.html, replyTo: m.replyTo || '', customer: m.customer, projectId: m.projectId, at: now };
  return mail.map((x) => (x.id === id ? draft : m.replyTo && x.id === m.replyTo && x.folder === 'archive' ? { ...x, folder: 'inbox', answered: undefined } : x));
}
export function unschedule(mail, id, now = new Date().toISOString()) {
  const m = mail.find((x) => x.id === id);
  if (!m || m.folder !== 'scheduled') throw new Error('that email is not scheduled');
  return mail.map((x) => (x.id === id ? { id: m.id, folder: 'draft', from: m.from, to: m.to, cc: m.cc, bcc: m.bcc, subject: m.subject, body: m.html, replyTo: m.replyTo || '', customer: m.customer, projectId: m.projectId, at: now } : x));
}
export function undoBar(id, back = '/activities') {
  if (!/^[\w-]{1,40}$/.test(String(id || ''))) return '';
  return `<form method="post" action="/email/${id}/unsend" style="margin:0;display:inline-flex;gap:8px;align-items:center"><input type="hidden" name="back" value="${esc(back)}"><button class="btn" style="min-height:28px">Undo Send</button><span style="font-size:12px">(30 seconds)</span></form>`;
}
