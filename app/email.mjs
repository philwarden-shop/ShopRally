// Email: Inbox / Archive / Spam. Business rule: email is NEVER deleted, only archived (spam is a folder too).
// Out of office: one auto-reply per sender per absence, never to spam, no-reply addresses or other auto-replies.
import { page, esc } from './views.mjs';
import { sampleData } from './data.mjs';

export const FOLDERS = [['inbox', 'Inbox'], ['archive', 'Archive'], ['spam', 'Spam']];

export function demoMail(today) {
  if (!sampleData()) return [];
  const m = (id, from, name, subject, preview, hoursAgo, extra = {}) => ({ id, from, name, subject, preview, at: new Date(new Date(today + 'T14:00:00Z').getTime() - hoursAgo * 3600000).toISOString(), folder: 'inbox', ...extra });
  return [
    m('m1', 'dana@riverbenddental.com', 'Dana Ruiz', 'Lobby sign proof', 'Looks great, can we make the logo a bit bigger?', 1, { customer: 'Riverbend Dental', projectId: 'demo-6' }),
    m('m2', 'sam@oaklinecafe.com', 'Sam Ortiz', 'Deposit sent', 'Just paid the deposit for the patio menu boards.', 3, { customer: 'Oakline Café', projectId: 'demo-4' }),
    m('m3', 'deals@cheap-led-signs.biz', 'LED Deals', 'You WON a free LED sign!!!', 'Click here to claim your prize today only', 5),
    m('m4', 'noreply@xpsship.com', 'XPS Ship', 'Label purchased: 1Z999AA10123456784', 'UPS Ground, $18.42', 6),
    m('m5', 'ann.cho@kentonlibrary.org', 'Ann Cho', 'Wayfinding post mounting', 'Will the posts be set in concrete or bolted?', 26, { customer: 'Kenton County Library', projectId: 'demo-10' }),
  ];
}

export function move(mail, id, folder) {
  if (!FOLDERS.some(([k]) => k === folder)) throw new Error('that folder does not exist');
  if (!mail.some((x) => x.id === id)) throw new Error('that email is not here');
  return mail.map((x) => (x.id === id ? { ...x, folder } : x));
}
export const archive = (mail, id) => move(mail, id, 'archive');
export function markSpam(mail, id, blocked = []) {
  const m = mail.find((x) => x.id === id);
  if (!m) throw new Error('that email is not here');
  const sender = m.from.toLowerCase();
  return { mail: mail.map((x) => (x.from.toLowerCase() === sender && x.folder === 'inbox' ? { ...x, folder: 'spam' } : x)), blocked: [...new Set([...blocked, sender])] };
}
export const notSpam = (mail, id, blocked = []) => {
  const m = mail.find((x) => x.id === id);
  if (!m) throw new Error('that email is not here');
  return { mail: move(mail, id, 'inbox'), blocked: blocked.filter((b) => b !== m.from.toLowerCase()) };
};
// The rule: there is no delete. Anything that tries gets an archive instead.
export function deleteEmail() { throw new Error('emails are never deleted in SalesMax. Archive it instead'); }

// New mail from a blocked sender goes straight to Spam.
export function fileIncoming(mail, msg, blocked = []) {
  return [...mail, { ...msg, folder: blocked.includes(String(msg.from).toLowerCase()) ? 'spam' : 'inbox' }];
}

export function setOutOfOffice(prev, f, { team = [], me = '' } = {}) {
  const on = f.on === 'on';
  const del = team.find((t) => t.key === String(f.delegate || '') && t.key !== me);
  if (on && !del) throw new Error('pick a delegate to cover your customers while you are out');
  const message = String(f.message || '').trim();
  const from = String(f.from || ''), until = String(f.until || '');
  if (on && message.length < 10) throw new Error('write the auto-reply message (at least a sentence)');
  if (on && until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) throw new Error('pick the date you are back');
  if (on && from && until && until < from) throw new Error('the back date must be after the start date');
  return { on, message: message.slice(0, 1000), from, until, delegate: del ? del.key : '', delegateName: del ? del.name : '', repliedTo: on && !prev?.on ? [] : (prev?.repliedTo || []) };
}
export function oooActive(ooo, today) { return !!(ooo && ooo.on && (!ooo.from || ooo.from <= today) && (!ooo.until || today <= ooo.until)); }

// Should SalesMax send the out-of-office reply to this message? Once per sender, never to spam / no-reply / auto mail.
export function autoReplyFor(ooo, msg, today) {
  if (!oooActive(ooo, today)) return null;
  const from = String(msg.from || '').toLowerCase();
  if (msg.folder === 'spam' || /no-?reply|mailer-daemon|postmaster/.test(from) || msg.auto) return null;
  if ((ooo.repliedTo || []).includes(from)) return null;
  const cover = ooo.delegateName && !ooo.message.includes(ooo.delegateName.split(' ')[0]) ? `\n\nWhile I'm away, ${ooo.delegateName} is taking care of my customers.` : '';
  return { to: from, subject: `Re: ${msg.subject}`, body: ooo.message + cover };
}

export function emailPage({ user, mail, folder = 'inbox', ooo = {}, today, flash = '' }) {
  const f = FOLDERS.some(([k]) => k === folder) ? folder : 'inbox';
  const list = mail.filter((m) => m.folder === f).sort((a, b) => b.at.localeCompare(a.at));
  const count = (k) => mail.filter((m) => m.folder === k).length;
  const tabs = FOLDERS.map(([k, l]) => `<a href="/email?folder=${k}" ${f === k ? 'aria-current="page"' : ''} style="padding:10px 12px;font-weight:600;border-bottom:3px solid ${f === k ? '#a8343f' : 'transparent'};color:${f === k ? '#1b2436' : '#5a6478'}">${l} <span style="display:inline-flex;min-width:20px;height:20px;border-radius:10px;align-items:center;justify-content:center;background:#dfe8f5;color:#2c4a73;font-size:11px">${count(k)}</span></a>`).join('');
  const act = (m) => {
    const b = (to, label) => `<form method="post" action="/email/${esc(m.id)}/${to}" style="margin:0"><button class="btn">${label}</button></form>`;
    if (f === 'inbox') return b('archive', 'Archive') + b('spam', 'Mark as Spam');
    if (f === 'archive') return b('inbox', 'Move to Inbox');
    return b('notspam', 'Not Spam');
  };
  const rows = list.map((m) => `<div class="task"><span class="t"><b>${esc(m.name || m.from)}</b> · ${esc(m.subject)}<small>${esc(m.preview)} · ${esc(new Date(m.at).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}</small></span><span style="display:flex;gap:6px">${act(m)}</span></div>`).join('') || `<div class="panel" style="color:var(--mute)">Nothing in ${esc(f)}.</div>`;
  const active = oooActive(ooo, today);
  const body = `<div class="wrap"><div class="bar" style="padding:14px 0"><h1>Email: Inbox, Archive &amp; Spam</h1>${active ? '<span class="pill" style="background:#fdf3dc;color:#7a4e00">Out of Office is on</span>' : ''}</div>${flash ? `<div class="note" style="margin:0 0 12px;background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}
<nav aria-label="Folders" style="display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:12px">${tabs}</nav>${rows}
<p style="font-size:12px;color:var(--mute)">Email is never deleted. Archive keeps it out of the way and searchable. Mark as Spam also sends future email from that sender to Spam.</p>
<p style="font-size:13px">Out of Office and your email signature are in <a href="/me#ooo">My Profile &amp; Settings</a>.</p></div>`;
  return page({ title: 'Email', user, tab: '', body });
}

// Delegate's To Do: inbox email of teammates who are out and named this person as their delegate.
export function coveringTasks(list, today) {
  return list.flatMap(({ name, ooo, mail }) => (oooActive(ooo, today) ? mail.filter((m) => m.folder === 'inbox').map((m) => ({ id: `cover-${m.id}`, mailId: m.id, kind: 'email', title: `Covering for ${name.split(' ')[0]}: ${m.subject}`, customer: m.customer || m.name || m.from, projectId: m.projectId || '', due: m.at.slice(0, 10), done: false, mail: true, from: m.from, covering: name })) : []));
}
