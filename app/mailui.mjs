// Email inside the work: To Do rows, the customer Email tab and the project Email panel.
// Rich text editor bar (like Gmail), signature added to every outgoing email, Archive and Mark as Spam. Never delete.
import { esc } from './views.mjs';

const ALLOWED = new Set(['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'a', 'img', 'font']);
// Keep simple formatting only. Links must be http(s)/mailto/tel; images must be https. No scripts, styles or event handlers.
export function sanitizeHtml(input) {
  let s = String(input || '').slice(0, 20000);
  s = s.replace(/<(script|style|iframe|object|embed|svg|math)[\s\S]*?<\/\1\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  return s.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (m, tag, attrs) => {
    const t = tag.toLowerCase();
    if (!ALLOWED.has(t)) return '';
    if (m.startsWith('</')) return `</${t}>`;
    const keep = [];
    const get = (n) => { const r = attrs.match(new RegExp(`\\b${n}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')); return r ? (r[2] ?? r[3] ?? r[4] ?? '') : null; };
    if (t === 'a') { const h = get('href'); if (h && /^(https?:|mailto:|tel:)/i.test(h.trim())) keep.push(`href="${esc(h.trim())}"`, 'target="_blank"', 'rel="noopener"'); }
    if (t === 'img') { const src = get('src'); if (!src || !/^https:\/\//i.test(src.trim())) return ''; keep.push(`src="${esc(src.trim())}"`); const alt = get('alt'); keep.push(`alt="${esc(alt || '')}"`); for (const n of ['width', 'height']) { const v = get(n); if (v && /^\d{1,4}$/.test(v)) keep.push(`${n}="${v}"`); } }
    if (t === 'font') { const c = get('color'); if (c && /^#[0-9a-f]{3,6}$/i.test(c)) keep.push(`color="${c}"`); const sz = get('size'); if (sz && /^[1-7]$/.test(sz)) keep.push(`size="${sz}"`); }
    return `<${t}${keep.length ? ' ' + keep.join(' ') : ''}>`;
  });
}
// Plain text from the no-script textarea becomes simple HTML.
export function toHtml(body) {
  const b = String(body || '');
  return /<\/?(b|strong|i|em|u|br|p|div|span|ul|ol|li|a|img|font)\b[^>]*>/i.test(b) ? sanitizeHtml(b) : esc(b).replace(/\r?\n/g, '<br>');
}
export function withSignature(bodyHtml, sigHtml) {
  const sig = sanitizeHtml(sigHtml || '');
  return sig ? `${bodyHtml}<br><br><div class="signature">${sig}</div>` : bodyHtml;
}

export function richEditor(name, html = '', label = 'Message') {
  const tools = [['bold', '<b>B</b>', 'Bold'], ['italic', '<i>I</i>', 'Italic'], ['underline', '<u>U</u>', 'Underline'], ['insertUnorderedList', '•', 'Bulleted list'], ['insertOrderedList', '1.', 'Numbered list'], ['createLink', '🔗', 'Link'], ['removeFormat', 'T<sub>x</sub>', 'Clear formatting']];
  return `<div class="rte" data-name="${esc(name)}"><div class="rte-bar" role="toolbar" aria-label="Formatting" hidden style="display:flex;gap:2px;border:1px solid #d5dbe5;border-bottom:0;border-radius:8px 8px 0 0;padding:4px;background:#f6f7f9">${tools.map(([c, i, l]) => `<button type="button" data-cmd="${c}" aria-label="${l}" title="${l}" style="font:inherit;min-width:34px;min-height:32px;border:0;border-radius:6px;background:transparent;cursor:pointer">${i}</button>`).join('')}</div>
<div class="rte-area" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${esc(label)}" hidden style="min-height:120px;border:1px solid #d5dbe5;border-radius:0 0 8px 8px;padding:10px;background:#fff">${sanitizeHtml(html)}</div>
<label class="rte-fallback" style="display:flex;flex-direction:column;font-size:12px">${esc(label)}<textarea name="${esc(name)}" rows="6" style="font:inherit;border:1px solid #d5dbe5;border-radius:8px;padding:8px">${esc(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))}</textarea></label></div>`;
}

// Served from /static/editor.js. Turns the textarea into the formatting editor when scripts run.
export const EDITOR_JS = `(() => {
  document.querySelectorAll('.rte').forEach((w) => {
    const area = w.querySelector('.rte-area'), bar = w.querySelector('.rte-bar'), fb = w.querySelector('.rte-fallback');
    if (!area || !bar || !fb) return;
    const ta = fb.querySelector('textarea');
    const hid = document.createElement('input'); hid.type = 'hidden'; hid.name = ta.name;
    if (!area.innerHTML.trim() && ta.value) area.textContent = ta.value;
    fb.remove(); w.appendChild(hid); area.hidden = false; bar.hidden = false;
    bar.querySelectorAll('[data-cmd]').forEach((b) => b.addEventListener('click', () => {
      area.focus();
      if (b.dataset.cmd === 'createLink') { const u = window.prompt('Link address (https://…)'); if (u) document.execCommand('createLink', false, u); }
      else document.execCommand(b.dataset.cmd, false, null);
    }));
    const form = w.closest('form'); if (form) form.addEventListener('submit', () => { hid.value = area.innerHTML; });
    if (form) form.querySelectorAll('[data-insert]').forEach((b) => b.addEventListener('click', () => { area.focus(); document.execCommand('insertHTML', false, ' ' + b.dataset.insert + ' '); }));
  });
  document.querySelectorAll('[data-insert-text]').forEach((b) => { const f = b.closest('form'); const ta = f && f.querySelector('.rte-fallback textarea'); if (ta) b.addEventListener('click', () => { ta.value += (ta.value ? '\\n' : '') + b.dataset.insertText; }); });
})();`;

export function mailRows(list, { back, replyHref = () => '', fwdHref = () => '', showActions = true } = {}) {
  return list.map((m) => {
    const act = (to, label) => `<form method="post" action="/email/${esc(m.id)}/${to}" style="margin:0"><input type="hidden" name="back" value="${esc(back)}"><button class="btn">${label}</button></form>`;
    const reply = replyHref(m);
    const actions = !showActions ? '' : m.folder === 'inbox' ? `${reply ? `<a class="btn" href="${esc(reply)}">Reply</a>` : ''}${fwdHref(m) ? `<a class="btn" href="${esc(fwdHref(m))}">Forward</a>` : ''}${act('archive', 'Archive')}${act('spam', 'Mark as Spam')}`
      : m.folder === 'spam' ? act('notspam', 'Not Spam') : m.folder === 'archive' ? act('inbox', 'Move to Inbox') : '';
    const when = esc(new Date(m.at).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }));
    return `<div class="task" style="flex-wrap:wrap"><span class="t"><b>${m.folder === 'sent' ? 'To ' + esc(m.to || '') : esc(m.name || m.from)}</b> · ${esc(m.subject)}<small>${m.html ? esc(String(m.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140)) : esc(m.preview || '')} · ${when}${m.folder !== 'inbox' ? ` · ${esc(m.folder === 'sent' ? 'Sent' : m.folder === 'spam' ? 'Spam' : 'Archived')}` : ''}</small></span><span style="display:flex;gap:6px;flex-wrap:wrap">${actions}</span></div>`;
  }).join('');
}

export function composer({ to = '', subject = '', back, customer = '', projectId = '', signature = '', replyTo = '', body = '', tools = '', followUp = true }) {
  const row = 'display:flex;align-items:center;gap:10px;border-bottom:1px solid #eef1f5;min-height:44px;padding:0 14px';
  const inp = 'font:inherit;font-size:14px;flex:1 1 auto;min-width:0;border:0;outline:none;min-height:40px;background:transparent';
  return `<form id="compose" method="post" action="/email/send" style="background:#fff;border:1px solid #e3e7ee;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;margin-bottom:14px">
<div style="display:flex;align-items:center;justify-content:space-between;background:#16213a;color:#fff;padding:10px 14px"><h2 style="margin:0;font-size:14px">${replyTo ? 'Reply' : 'New Message'}</h2><span style="font-size:12px;color:#c9d1e0">Sends from your Gmail</span></div>
<input type="hidden" name="back" value="${esc(back)}"><input type="hidden" name="customer" value="${esc(customer)}"><input type="hidden" name="projectId" value="${esc(projectId)}"><input type="hidden" name="replyTo" value="${esc(replyTo)}">
<div style="${row}"><label for="cmp-to" style="font-size:13px;color:#5a6478;width:56px">To</label><input id="cmp-to" name="to" type="email" required value="${esc(to)}" style="${inp}"><details style="font-size:13px"><summary style="cursor:pointer;color:#1d4f91;font-weight:600;list-style:none">Cc Bcc</summary><div style="position:absolute;right:24px;background:#fff;border:1px solid #e3e7ee;border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:6px;z-index:5;box-shadow:0 8px 24px rgba(22,33,58,.15)"><label style="display:flex;gap:6px;align-items:center">Cc<input name="cc" type="text" placeholder="name@company.com" style="font:inherit;font-size:13px;border:1px solid #d5dbe5;border-radius:6px;padding:4px 6px;min-width:220px"></label><label style="display:flex;gap:6px;align-items:center">Bcc<input name="bcc" type="text" style="font:inherit;font-size:13px;border:1px solid #d5dbe5;border-radius:6px;padding:4px 6px;min-width:220px"></label></div></details></div>
<div style="${row}"><label for="cmp-sub" style="font-size:13px;color:#5a6478;width:56px">Subject</label><input id="cmp-sub" name="subject" required value="${esc(subject)}" style="${inp}"></div>
${tools ? `<div role="toolbar" aria-label="Writing tools" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:8px 14px 0">${tools}</div>` : ''}<div style="padding:10px 14px">${richEditor('body', body, 'Message')}</div>
<div style="font-size:12px;color:var(--mute);padding:0 14px 10px">${signature ? `<div style="border-left:3px solid #e3e7ee;padding-left:8px">${sanitizeHtml(signature)}</div>` : 'No signature yet. Add one in My Profile &amp; Settings.'}</div>
<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-top:1px solid #eef1f5;padding:10px 14px;background:#fafbfc"><button class="btn primary" style="min-height:40px;padding:0 18px">Send</button><button class="btn" name="do" value="draft" formnovalidate>Save Draft</button><details style="position:relative"><summary class="btn" style="list-style:none">Schedule Send</summary><div style="position:absolute;bottom:44px;left:0;background:#fff;border:1px solid #e3e7ee;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;z-index:5;box-shadow:0 8px 24px rgba(22,33,58,.15);min-width:240px"><label style="font-size:12px;display:flex;flex-direction:column;gap:4px">Send at<input type="datetime-local" name="sendAt" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><button class="btn primary" name="do" value="schedule">Schedule It</button></div></details><label style="display:flex;align-items:center;gap:8px;font-size:13px;min-height:40px"><input type="checkbox" name="followup" ${followUp ? 'checked' : ''} style="width:18px;height:18px;accent-color:#a8343f">Add a follow-up task if no reply in 3 days</label><span style="font-size:12px;color:var(--mute);margin-left:auto">Test copy: nothing leaves SalesMax.</span></div></form><script src="/static/editor.js" defer></script>`;
}

export function mailForCustomer(mail, name) {
  const n = String(name || '').toLowerCase();
  return mail.filter((m) => String(m.customer || '').toLowerCase() === n);
}

export function sendEmail(mail, f, { from, signature, at, id = 'm' + Date.now().toString(36) }) {
  const to = String(f.to || '').trim();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to)) throw new Error('that email address does not look right');
  const subject = String(f.subject || '').trim();
  if (subject.length < 2) throw new Error('add a subject');
  const body = toHtml(f.body);
  if (body.replace(/<[^>]+>/g, '').trim().length < 2) throw new Error('write a message');
  const html = withSignature(body, signature);
  const addrs = (v, label) => { const list = String(v || '').split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean); for (const a of list) if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(a)) throw new Error(`the ${label} address “${a}” does not look right`); return list.slice(0, 20); };
  const cc = addrs(f.cc, 'Cc'), bcc = addrs(f.bcc, 'Bcc');
  let sendAt = '';
  if (f.do === 'schedule') { const d = new Date(String(f.sendAt || '')); if (!f.sendAt || isNaN(d) || d.toISOString() <= at) throw new Error('pick a time in the future to send it'); sendAt = d.toISOString(); }
  let next = [...mail, { id, folder: sendAt ? 'scheduled' : 'sent', from, to, cc, bcc, sendAt: sendAt || undefined, subject: subject.slice(0, 200), html, at, customer: f.customer || '', projectId: f.projectId || '', replyTo: f.replyTo || '' }];
  if (f.replyTo) next = next.map((m) => (m.id === f.replyTo && m.folder === 'inbox' ? { ...m, folder: 'archive', answered: at } : m));
  return next;
}

// Inbox email shows up on the To Do list (kind email). Answering or archiving clears it.
export function mailTasks(mail) {
  return mail.filter((m) => m.folder === 'inbox').map((m) => ({ id: `mail-${m.id}`, mailId: m.id, kind: 'email', title: m.subject, customer: m.customer || m.name || m.from, projectId: m.projectId || '', due: m.at.slice(0, 10), done: false, mail: true, from: m.from }));
}

export function oooForm(ooo = {}, team = [], me = '') {
  const opts = team.filter((t) => t.key !== me && ['Owner', 'Sales'].includes(t.role)).map((t) => `<option value="${esc(t.key)}" ${ooo.delegate === t.key ? 'selected' : ''}>${esc(t.name)} (${esc(t.role)})</option>`).join('');
  return `<section class="panel" id="ooo" aria-label="Out of Office"><h2 style="margin:0 0 8px;font-size:15px">Out of Office Auto-Reply ${ooo.on ? `<span class="pill" style="background:#e6f2ec;color:#1f6a43">On${ooo.from && ooo.until ? ` · ${esc(ooo.from)} to ${esc(ooo.until)}` : ''}</span>` : '<span class="pill" style="background:#eef1f5;color:#5a6478">Off</span>'}</h2><p style="margin:0 0 8px;font-size:13px;color:#3d4658">Each customer gets the auto-reply once while you are away. Spam and no-reply senders never get one. Their emails still land in your To Do list for when you are back.</p><form method="post" action="/email/ooo" style="display:flex;flex-direction:column;gap:8px">
<label style="display:flex;gap:10px;align-items:center;min-height:40px"><input type="checkbox" name="on" ${ooo.on ? 'checked' : ''} style="width:20px;height:20px"> Turn on Out of Office</label>
<div style="display:flex;gap:8px;flex-wrap:wrap"><label style="display:flex;flex-direction:column;font-size:12px">Away from<input type="date" name="from" value="${esc(ooo.from || '')}" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><label style="display:flex;flex-direction:column;font-size:12px">Back on<input type="date" name="until" value="${esc(ooo.until || '')}" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label></div>
<label style="display:flex;flex-direction:column;font-size:12px">Delegate (required when on): covers your customer email and To Dos<select name="delegate" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"><option value="">Pick a teammate</option>${opts}</select></label><span style="font-size:12px;color:var(--mute)">While you're out, your new customer emails show in your delegate's To Do list as "Covering for you". When you're back, anything they didn't finish returns to your list.</span>
<label style="display:flex;flex-direction:column;font-size:12px">Auto-reply message<textarea name="message" rows="3" style="font:inherit;border:1px solid #d5dbe5;border-radius:8px;padding:8px">${esc(ooo.message || '')}</textarea></label>
<button class="btn primary" style="align-self:flex-start">Save Out of Office</button><span style="font-size:12px;color:var(--mute)">Each sender gets one reply while you are out. Spam and no-reply addresses never get one.</span></form></section>`;
}

export function signatureForm(sig = '', booking = '') {
  return `<section class="panel" id="signature" aria-label="Email signature"><h2 style="margin:0 0 8px;font-size:15px">Email Signature</h2><form method="post" action="/me/signature" style="display:flex;flex-direction:column;gap:8px">
<p style="margin:0;font-size:13px;color:#3d4658">Added automatically to every email you send from SalesMax: replies in the To Do list, customer and project emails, proofs and estimates.</p>${richEditor('signature', sig, 'Signature')}${booking ? `<div><button type="button" class="btn" data-insert="${esc(`<a href="${esc(booking)}">Book a site visit</a>`)}">Insert Booking Link</button></div>` : '<span style="font-size:12px;color:var(--mute)">Save your booking link below to add a “Book a site visit” link here.</span>'}<button class="btn primary" style="align-self:flex-start">Save Signature</button><span style="font-size:12px;color:var(--mute)">Added automatically to the bottom of every email you send from SalesMax.</span></form>
${sig ? `<div style="margin-top:8px;font-size:12px;color:var(--mute)">Preview:</div><div style="border-left:3px solid #e3e7ee;padding-left:8px">${sanitizeHtml(sig)}</div>` : ''}<script src="/static/editor.js" defer></script></section>`;
}
