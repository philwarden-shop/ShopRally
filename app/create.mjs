// One way to create things: + New menu, and a single New Project form (a prospect is a project in the Prospect stage).
import { page, esc } from './views.mjs';

export const NEW_MENU = [['New Project or Prospect', '/projects/new'], ['New Task', '/activities?new=1'], ['Claim an Untapped Business', '/prospects']];

export function newMenu() {
  return `<details class="newm" style="position:relative"><summary style="list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#fff;background:#a8343f;border:0;border-radius:8px;padding:0 12px;min-height:36px;margin-right:4px"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>New<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg></summary>
<div class="am-menu" role="menu" style="position:absolute;right:0;top:48px;z-index:80;width:240px;background:#fff;color:#1b2436;border:1px solid #e3e7ee;border-radius:12px;box-shadow:0 12px 32px rgba(22,33,58,.25);padding:6px">${NEW_MENU.map(([l, h]) => `<a role="menuitem" href="${h}" style="display:flex;align-items:center;min-height:40px;padding:0 10px;border-radius:8px;font-weight:600;color:inherit">${esc(l)}</a>`).join('')}</div></details>`;
}

export const STAGES = [['prospect', 'Prospect'], ['estimate', 'Estimate']];
export function newProject(list, f, { id = 'new-' + Date.now().toString(36), salesperson = '' } = {}) {
  const name = String(f.name || '').trim(), company = String(f.company || '').trim(), contact = String(f.contact || '').trim();
  if (name.length < 2) throw new Error('give the project a name');
  if (company.length < 2) throw new Error('add the customer or business name');
  const lane = STAGES.some(([k]) => k === f.lane) ? f.lane : 'prospect';
  const total = Number(String(f.total || '0').replace(/[$,\s]/g, ''));
  if (!Number.isFinite(total) || total < 0) throw new Error('the estimated value needs to be a number');
  const due = /^\d{4}-\d{2}-\d{2}$/.test(String(f.due || '')) ? f.due : '';
  const email = String(f.email || '').trim();
  if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error('that email address does not look right');
  const phone = String(f.phone || '').trim().slice(0, 30);
  const chance = [25, 50, 75].includes(Number(f.chance)) ? Number(f.chance) : 50;
  const temperature = ['Cold', 'Warm', 'Hot'].includes(f.temperature) ? f.temperature : 'Warm';
  const p = { id, lane, name: name.slice(0, 120), company: company.slice(0, 120), contact: contact.slice(0, 80), email, phone, chance, temperature, total, due, priority: 'Medium', status: lane === 'prospect' ? 'New' : 'Estimate started', insight: '', items: [], salesperson, source: 'salesmax' };
  return [...(list || []), p];
}

export function newProjectPage({ user, error = '', f = {} }) {
  const inp = (n, l, extra = '') => `<label style="display:flex;flex-direction:column;font-size:13px;gap:4px">${l}<input name="${n}" value="${esc(f[n] || '')}" ${extra} style="font:inherit;min-height:40px;border:1px solid #d5dbe5;border-radius:8px;padding:0 10px"></label>`;
  const body = `<div class="wrap" style="max-width:680px"><div class="bar" style="padding:14px 0"><h1>Add Prospect</h1></div>
${error ? `<div class="note" role="alert" style="margin:0 0 12px;background:#fbeaec;color:#8f2a34">${esc(error)}</div>` : ''}
<form method="post" action="/projects/new" class="panel" style="display:flex;flex-direction:column;gap:12px">
<p style="margin:0;font-size:13px;color:var(--mute)">A prospect and a project are the same record. Start it as a Prospect and it moves forward from there.</p>
<fieldset style="border:0;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px"><legend style="font-size:13px;font-weight:700;margin-bottom:6px">Who</legend>${inp('company', 'Company', 'required minlength="2"')}${inp('contact', 'Contact')}${inp('email', 'Email', 'type="email"')}${inp('phone', 'Phone', 'type="tel"')}</fieldset>
<fieldset style="border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:10px"><legend style="font-size:13px;font-weight:700;margin-bottom:6px">What They Need</legend>${inp('name', 'What they need', 'required minlength="2" placeholder="Lobby sign, truck wrap…"')}</fieldset>
<div style="display:flex;gap:12px;flex-wrap:wrap"><label style="display:flex;flex-direction:column;font-size:13px;gap:4px">Chance to close<select name="chance" style="font:inherit;min-height:40px">${[50, 25, 75].map((c) => `<option value="${c}" ${String(f.chance || 50) === String(c) ? 'selected' : ''}>${c}%</option>`).join('')}</select></label><label style="display:flex;flex-direction:column;font-size:13px;gap:4px">Temperature<select name="temperature" style="font:inherit;min-height:40px">${['Warm', 'Cold', 'Hot'].map((t) => `<option ${f.temperature === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
<div style="display:flex;gap:12px;flex-wrap:wrap"><label style="display:flex;flex-direction:column;font-size:13px;gap:4px">Stage<select name="lane" style="font:inherit;min-height:40px">${STAGES.map(([k, l]) => `<option value="${k}" ${f.lane === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
${inp('total', 'Rough value ($)', 'inputmode="decimal"')}<label style="display:flex;flex-direction:column;font-size:13px;gap:4px">Needed by<input type="date" name="due" value="${esc(f.due || '')}" style="font:inherit;min-height:40px;border:1px solid #d5dbe5;border-radius:8px;padding:0 10px"></label></div>
<div style="background:#f3f0fa;border-radius:10px;padding:10px 12px;font-size:13px;color:#3d4658"><b style="color:#4a3373">SalesMax will set up:</b> the project in the Prospect column, the customer record if this is a new company, and a reminder in Missing a Next Step until you add the first task.</div>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" style="min-height:44px">Add Prospect</button><button class="btn" name="go" value="estimate" style="min-height:44px">Add and Start an Estimate</button><a class="btn" href="/projects" style="min-height:44px">Cancel</a></div></form></div>`;
  return page({ title: 'New Project', user, tab: 'Projects', body });
}
