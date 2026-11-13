// Email templates (Phil, Nov 12): shop-wide (admins) + personal (each salesperson). Inserted from the email writer.
import { esc } from './views.mjs';

export const DEFAULT_TEMPLATES = [
  { id: 'proof', name: 'Proof ready', subject: 'Your proof for {{order_number}} is ready', body: 'Hi {{first_name}},\n\nYour proof is ready to review on your order page. Please check spelling, sizes and colors, then click Approve or tell us what to change.\n\nThanks,\n{{salesperson}}' },
  { id: 'deposit', name: 'Deposit reminder', subject: 'Deposit for order {{order_number}}', body: 'Hi {{first_name}},\n\nWe start production as soon as the deposit comes in. You can pay by card or eCheck from your order page.\n\n{{salesperson}}' },
  { id: 'pickup', name: 'Ready for pickup', subject: 'Order {{order_number}} is ready for pickup', body: 'Hi {{first_name}},\n\nYour order is ready. We are open Monday to Friday, 8 to 5. Just give your name at the front desk.\n\n{{salesperson}}' },
  { id: 'install', name: 'Install confirmation', subject: 'Install for {{company}}', body: 'Hi {{first_name}},\n\nConfirming your install. Please let me know who can let our crew in and any site rules we should know about.\n\n{{salesperson}}' },
  { id: 'thanks', name: 'Thanks + review request', subject: 'Thank you, {{first_name}}', body: 'Hi {{first_name}},\n\nThank you for choosing us for order {{order_number}}. If you have a minute, a short Google review helps a lot.\n\n{{salesperson}}' },
];

export const withTemplateDefaults = (saved) => (Array.isArray(saved) && saved.length ? saved : DEFAULT_TEMPLATES.map((t) => ({ ...t })));
export const fillT = (tpl, vars = {}) => String(tpl || '').replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] != null && vars[k] !== '' ? String(vars[k]) : m));

export function mergeTemplateForm(list, f) {
  const out = [];
  for (let n = 0; n < 40; n++) {
    if (f[`name${n}`] === undefined) continue;
    if (f[`remove${n}`] === 'on') continue;
    const name = String(f[`name${n}`] || '').trim();
    if (name.length < 2) throw new Error(`template ${n + 1} needs a name`);
    const subject = String(f[`subject${n}`] || '').trim();
    if (subject.length < 2) throw new Error(`“${name}” needs a subject`);
    out.push({ id: String(f[`id${n}`] || 't' + n + Date.now().toString(36)).replace(/[^\w-]/g, '').slice(0, 30), name: name.slice(0, 60), subject: subject.slice(0, 160), body: String(f[`body${n}`] || '').slice(0, 5000) });
  }
  if (f.add === '1') out.push({ id: 't' + Date.now().toString(36), name: 'New template', subject: 'Subject', body: '' });
  return out;
}

export function templatesPage({ page, user, list, scope = 'shop', flash = '' }) {
  const action = scope === 'shop' ? '/admin/templates' : '/me/templates';
  const inp = 'font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px';
  const rows = list.map((t, n) => `<div style="border:1px solid #e3e7ee;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px"><input type="hidden" name="id${n}" value="${esc(t.id)}">
<div style="display:grid;grid-template-columns:1fr 2fr;gap:8px"><label style="display:flex;flex-direction:column;font-size:12px">Name<input name="name${n}" value="${esc(t.name)}" style="${inp}"></label><label style="display:flex;flex-direction:column;font-size:12px">Subject<input name="subject${n}" value="${esc(t.subject)}" style="${inp}"></label></div>
<label style="display:flex;flex-direction:column;font-size:12px">Message<textarea name="body${n}" rows="5" style="font:inherit;border:1px solid #d5dbe5;border-radius:8px;padding:8px">${esc(t.body)}</textarea></label>
<label style="display:flex;gap:6px;align-items:center;font-size:12px;color:var(--mute)"><input type="checkbox" name="remove${n}"> Remove this template</label></div>`).join('');
  const body = `<div class="wrap" style="max-width:900px"><div class="bar" style="padding:14px 0"><h1>${scope === 'shop' ? 'Shop Email Templates' : 'My Email Templates'}</h1></div>${flash ? `<div class="note" style="margin:0 0 12px;background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}
<p style="margin:0 0 12px;font-size:13px">${scope === 'shop' ? 'Everyone in the shop can insert these.' : 'Only you see these.'} Merge fields: {{first_name}} {{company}} {{order_number}} {{salesperson}}. Pick a template in the email writer with Insert Template.</p>
<form method="post" action="${action}" style="display:flex;flex-direction:column;gap:10px">${rows || '<p style="color:var(--mute)">No templates yet.</p>'}<div style="display:flex;gap:8px"><button class="btn primary">Save Templates</button><button class="btn" name="add" value="1">+ Add Template</button></div></form></div>`;
  return page({ title: scope === 'shop' ? 'Shop Email Templates' : 'My Email Templates', user, tab: '', body });
}

export function templatePicker({ action, hidden = {}, shop = [], mine = [], current = '' }) {
  const opt = (pre, t) => `<option value="${pre}:${esc(t.id)}" ${current === `${pre}:${t.id}` ? 'selected' : ''}>${esc(t.name)}</option>`;
  return `<form method="get" action="${esc(action)}" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 8px">${Object.entries(hidden).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join('')}<label style="font-size:13px;font-weight:600;display:flex;gap:8px;align-items:center">Insert Template<select name="tpl" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px"><option value="">Pick one…</option><optgroup label="Shop">${shop.map((t) => opt('shop', t)).join('')}</optgroup>${mine.length ? `<optgroup label="Mine">${mine.map((t) => opt('mine', t)).join('')}</optgroup>` : ''}</select></label><button class="btn">Insert</button><a href="/me/templates" style="font-size:12px">My templates</a></form>`;
}
export function pickTemplate(key, shop = [], mine = []) {
  const [pre, id] = String(key || '').split(':');
  return ((pre === 'mine' ? mine : shop).find((t) => t.id === id)) || null;
}
export const textToHtml = (s) => esc(String(s || '')).replace(/\n/g, '<br>');
