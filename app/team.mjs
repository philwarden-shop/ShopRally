// Team members: who works here, their role and home location. Used for assigning tasks and Preview As.
// Sign-in access for the test copy is still managed by the owner in AWS; this list does not create logins.
import { page, esc } from './views.mjs';
import { sampleData } from './data.mjs';

export const ROLES = ['Owner', 'Sales', 'Design', 'Production', 'Permits', 'Purchasing', 'Installer'];
export const keyOf = (name) => String(name || '').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');

export function demoTeam() {
  if (!sampleData()) return [];
  const m = (name, role, loc = 'nky', email = '') => ({ key: keyOf(name), name, role, loc, email });
  return [m('Phil Warden', 'Owner', 'nky', 'phil.warden@fastsigns.com'), m('Kristin Ames', 'Sales'), m('Abbey', 'Design'), m('Justin', 'Design'), m('Mike', 'Production'), m('Install crew A', 'Installer'), m('Marcus', 'Sales', 'two')];
}

export function addMember(list, f) {
  const name = String(f.name || '').trim();
  if (name.length < 2) throw new Error('add their name');
  if (!ROLES.includes(f.role)) throw new Error('pick a role');
  const email = String(f.email || '').trim();
  if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error('that email address does not look right');
  const key = keyOf(name);
  if (!key) throw new Error('add their name');
  if (list.some((x) => x.key === key)) throw new Error(`someone called ${name.split(' ')[0]} is already on the team`);
  return [...list, { key, name: name.slice(0, 60), role: f.role, loc: f.loc === 'two' ? 'two' : 'nky', email: email.slice(0, 120) }];
}
export function removeMember(list, key, me) {
  if (key === me) throw new Error('you cannot remove yourself');
  if (!list.some((x) => x.key === key)) throw new Error('that person is not on the team');
  return list.filter((x) => x.key !== key);
}

export function teamAdminPage({ user, team, flash = '' }) {
  const rows = team.map((m) => `<tr><td><b>${esc(m.name)}</b>${m.email ? `<div style="font-size:12px;color:var(--mute)">${esc(m.email)}</div>` : ''}</td><td>${esc(m.role)}</td><td>${m.loc === 'two' ? 'Second location' : 'Northern Kentucky'}</td><td><details><summary class="btn" style="list-style:none" aria-label="Remove ${esc(m.name)}">Remove…</summary><form method="post" action="/admin/team" style="margin:6px 0 0;display:flex;gap:6px;align-items:center;flex-wrap:wrap"><input type="hidden" name="remove" value="${esc(m.key)}"><span style="font-size:12px;color:#8f2a34">Remove ${esc(m.name)}?</span><button class="btn" style="color:#8f2a34;border-color:#a8343f">Yes, Remove</button></form></details></td></tr>`).join('');
  const sel = (n, l, opts) => `<label style="display:flex;flex-direction:column;font-size:12px">${l}<select name="${n}" style="font:inherit;min-height:36px">${opts}</select></label>`;
  const body = `<div class="wrap"><div class="bar" style="padding:14px 0"><h1>Team Members</h1></div>${flash ? `<div class="note" style="margin:0 0 12px;background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}
<section class="panel"><table><thead><tr><th>Person</th><th>Role</th><th>Home location</th><th></th></tr></thead><tbody>${rows}</tbody></table></section>
<section class="panel"><h2 style="margin:0 0 8px;font-size:15px">Add a Team Member</h2><form method="post" action="/admin/team" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;align-items:end">
<label style="display:flex;flex-direction:column;font-size:12px">Name<input name="name" required style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><label style="display:flex;flex-direction:column;font-size:12px">Email<input name="email" type="email" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label>
${sel('role', 'Role', ROLES.map((r) => `<option${r === 'Sales' ? ' selected' : ''}>${r}</option>`).join(''))}${sel('loc', 'Home location', '<option value="nky">Northern Kentucky</option><option value="two">Second location</option>')}<button class="btn primary">Add Person</button></form>
<p style="font-size:12px;color:var(--mute);margin:8px 0 0">Adding someone here lets you assign them work. Sign-in access is set up separately.</p></section></div>`;
  return page({ title: 'Team Members', user, tab: '', body });
}

// Owners (and anyone listed as Owner on the team) can open Admin, Billing and the money reports.
export function isOwner(email, team, ownerEmail = process.env.OWNER_EMAIL) {
  const e = String(email || '').toLowerCase();
  if (!e) return false;
  if (ownerEmail && e === String(ownerEmail).toLowerCase()) return true;
  return (team || []).some((m) => m.role === 'Owner' && String(m.email || '').toLowerCase() === e);
}
