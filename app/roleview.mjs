// Activities for Design, Production, Permits and Purchasing (what "Preview SalesMax As" shows): each role's work, grouped by step.
import { page, esc } from './views.mjs';

export const ROLE_STEPS = {
  design: ['prep', 'queue', 'indesign', 'proofqc', 'files'],
  production: ['wip', 'vended', 'qc', 'built'],
};
export const ROLE_TITLE = { design: 'Design', production: 'Production', permits: 'Permits', purchasing: 'Purchasing' };

export function roleGroups(role, { items = [], records = [], stepName = (x) => x, cols = [] }) {
  if (ROLE_STEPS[role]) {
    return ROLE_STEPS[role].map((s) => ({ key: s, label: stepName(s), rows: items.filter((i) => i.step === s).map((i) => ({ id: i.id, name: i.name, sub: [i.person, i.due ? `due ${i.due}` : ''].filter(Boolean).join(' · '), href: `/projects/${i.projectId}?mode=demo`, rush: (i.tags || []).includes('rush') || i.rush })) }));
  }
  return cols.filter(([k]) => k !== 'approved' && k !== 'received').map(([k, l]) => ({ key: k, label: l, rows: records.filter((r) => r.col === k).map((r) => ({ id: r.id, name: r.name, sub: [r.company, r.city || r.vendor].filter(Boolean).join(' · '), href: `/boards/${role}` })) }));
}

export function roleActivitiesPage({ user, role, groups, side = '' }) {
  const total = groups.reduce((a, g) => a + g.rows.length, 0);
  const body = `<div class="bar"><h1>Activities</h1><span class="pill" style="background:#f3f0fa;color:#4a3373">Viewing as ${esc(ROLE_TITLE[role] || role)}</span></div>
<div style="max-width:1180px;margin:0 auto;padding:0 20px 40px;display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:16px;align-items:start" class="rv">
<section aria-label="My Work"><h2 style="margin:0 0 8px;font-size:17px">My Work · ${total}</h2>${groups.map((g) => `<div style="margin:14px 0 6px;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#3d4658">${esc(g.label)} <span style="display:inline-flex;min-width:20px;height:20px;border-radius:10px;align-items:center;justify-content:center;background:#dfe8f5;color:#2c4a73;font-size:11px">${g.rows.length}</span></div>
${g.rows.map((r) => `<a class="card" href="${esc(r.href)}" style="margin-bottom:6px"><b>${esc(r.name)}${r.rush ? ' <span class="pill" style="background:#f6e8ea;color:#a8343f">Rush</span>' : ''}</b><span class="co">${esc(r.sub)}</span></a>`).join('') || '<div style="font-size:12px;color:var(--mute)">Nothing here.</div>'}`).join('')}</section>
<aside>${side}</aside></div><style>@media (max-width:900px){.rv{grid-template-columns:1fr !important}}</style>`;
  return page({ mod: role.charAt(0).toUpperCase() + role.slice(1),  title: 'Activities', user, tab: 'Activities', body });
}
