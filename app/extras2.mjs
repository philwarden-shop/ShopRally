// Contacts on a customer, morning summary preview, CSV downloads.
import { page, esc } from './views.mjs';

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export function addContact(profile, f) {
  const name = String(f.cName || '').trim();
  const email = String(f.cEmail || '').trim();
  const phone = String(f.cPhone || '').trim();
  if (name.length < 2) throw new Error('add the contact’s name');
  if (email && !EMAIL.test(email)) throw new Error('that email address does not look right');
  if (phone && !/^[0-9()+\-.\s x]{7,25}$/.test(phone)) throw new Error('that phone number does not look right');
  const list = [...((profile && profile.contactsExtra) || [])];
  if (list.some((c) => c.name.toLowerCase() === name.toLowerCase())) throw new Error('that contact is already here');
  list.push({ name: name.slice(0, 80), email: email.slice(0, 120), phone: phone.slice(0, 25), title: String(f.cTitle || '').trim().slice(0, 60) });
  return { ...(profile || {}), contactsExtra: list };
}

export function contactsHtml(cid, fromProjects, extra = []) {
  const all = [...extra, ...fromProjects.filter((n) => !extra.some((e) => e.name === n)).map((n) => ({ name: n }))];
  const rows = all.map((c) => `<div style="padding:8px 0;border-bottom:1px solid #eef1f5"><b>${esc(c.name)}</b>${c.title ? ` · ${esc(c.title)}` : ''}<div style="font-size:13px">${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}${c.email && c.phone ? ' · ' : ''}${c.phone ? `<a href="tel:${esc(c.phone.replace(/[^0-9+]/g, ''))}">${esc(c.phone)}</a>` : ''}</div></div>`).join('');
  const inp = (n, l, t = 'text') => `<label style="display:flex;flex-direction:column;font-size:12px">${l}<input name="${n}" type="${t}" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label>`;
  return `<section class="panel">${rows || '<p style="margin:0;color:var(--mute)">No contacts yet.</p>'}</section>
<section class="panel"><details><summary style="cursor:pointer;font-weight:700">+ Add Contact</summary><form method="post" action="/customers/${esc(cid)}/contact" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;align-items:end;margin-top:8px">${inp('cName', 'Name')}${inp('cTitle', 'Title')}${inp('cEmail', 'Email', 'email')}${inp('cPhone', 'Phone', 'tel')}<button class="btn primary">Add Contact</button></form></details></section>`;
}

// Morning summary (what "Morning summary email" would contain). Preview only in the test copy.
export function digest({ name, groups, comingUp = [], stuck = [], proofs = 0 }) {
  const n = (k) => (groups[k] || []).length;
  const lines = [
    `Good morning${name ? ', ' + name.split(' ')[0] : ''}.`,
    `To do today: ${n('today')} due, ${n('past')} past due, ${n('missing')} project${n('missing') === 1 ? '' : 's'} missing a next step.`,
    comingUp.length ? `Going out today: ${comingUp.map((u) => `${u.name} (${u.ready ? 'ready' : 'needs ' + u.gaps.join(', ')})`).join('; ')}.` : 'Nothing goes out the door today.',
    stuck.length ? `Stuck: ${stuck.length}${stuck.some((s) => s.escalate) ? ', some need you' : ''}.` : 'Nothing is stuck.',
    proofs ? `${proofs} proof${proofs === 1 ? '' : 's'} need a nudge.` : '',
  ].filter(Boolean);
  return lines;
}
export function digestPage({ user, lines }) {
  const body = `<div class="wrap" style="max-width:640px"><div class="bar" style="padding:14px 0"><h1>Morning Summary</h1><span class="pill" style="margin-left:auto;background:#eef1f5;color:#3d4658">Preview · not sent</span></div><section class="panel">${lines.map((l) => `<p style="margin:0 0 8px">${esc(l)}</p>`).join('')}</section><p style="font-size:12px;color:var(--mute)">Turn this email on or off in My Profile &amp; Settings.</p></div>`;
  return page({ title: 'Morning Summary', user, tab: '', body });
}

export function csv(rows, cols) {
  const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.map(([, h]) => cell(h)).join(','), ...rows.map((r) => cols.map(([k]) => cell(r[k])).join(','))].join('\r\n') + '\r\n';
}
