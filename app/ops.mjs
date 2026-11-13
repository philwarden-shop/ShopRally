// PO check, Coordinator panel ("Coming Up Today", "Handled For You Today"), My Projects tiles.
import { esc } from './views.mjs';
import { sampleData } from './data.mjs';

const money = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cents = (n) => Math.round((Number(n) || 0) * 100);

// PO amount vs order. Exact match passes. A gap that is exactly the tax passes too:
// tax-exempt customers are not charged tax, and for everyone else "it's just tax" is skipped (bill with tax).
export function poCheck({ poAmount, total, tax = 0, taxExempt = false }) {
  const po = cents(poAmount), t = cents(total), tx = cents(tax);
  if (!po) return { ok: false, level: 'error', msg: 'Enter the PO amount.' };
  if (po === t) return { ok: true, level: 'ok', msg: 'PO matches the order total.' };
  if (taxExempt && po === t - tx) return { ok: true, level: 'ok', msg: 'PO matches. Customer is tax exempt, so no tax is charged.' };
  if (!taxExempt && tx && po === t - tx) return { ok: true, level: 'note', msg: `PO is ${money(tx / 100)} short, which is just the tax. OK to go ahead; invoice with tax.` };
  const diff = (po - t) / 100;
  return { ok: false, level: 'error', msg: `PO is ${diff > 0 ? 'over' : 'under'} the order by ${money(Math.abs(diff))}. Ask the customer for a corrected PO before production.` };
}

export function poPanel(projectId, po = {}, result) {
  const tone = { ok: ['#e6f2ec', '#1f6a43'], note: ['#fdf3dc', '#5c4300'], error: ['#fbeaec', '#8f2a34'] }[result?.level || 'ok'];
  return `<section class="panel" aria-label="Customer PO"><h2 style="margin:0 0 10px;font-size:15px">Customer PO</h2>
${result ? `<div role="status" style="background:${tone[0]};color:${tone[1]};border-radius:8px;padding:8px 10px;margin-bottom:10px;font-size:13px">${esc(result.msg)}</div>` : ''}
<form method="post" action="/projects/${esc(projectId)}/po" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end"><label style="display:flex;flex-direction:column;font-size:12px">PO #<input name="poNumber" value="${esc(po.poNumber || '')}" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label>
<label style="display:flex;flex-direction:column;font-size:12px">PO amount ($)<input name="poAmount" inputmode="decimal" value="${esc(po.poAmount || '')}" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px;width:140px"></label><button class="btn">Check PO</button></form></section>`;
}

// Coming Up Today: installs, pickups and deliveries due today, with what is ready and what is not.
export function comingUpToday(items, today) {
  const due = items.filter((i) => i.due === today && !['complete', 'done'].includes(i.step));
  return due.map((i) => {
    const ready = ['built'].includes(i.step);
    const gaps = [];
    if (!ready) gaps.push('not built yet');
    const dest = i.handoff || i.destination || 'Pickup';
    if (dest === 'Ship' && !i.tracking) gaps.push('no tracking yet');
    if (dest === 'Install' && !(i.crew || /crew/i.test(i.person || ''))) gaps.push('no install crew assigned');
    return { id: i.id, name: i.name, projectId: i.projectId, destination: dest, ready: ready && !gaps.length, gaps };
  });
}

export function demoHandled(today) {
  if (!sampleData()) return [];
  return [
    'Sent a proof reminder to Hartwell Builders (no answer in 2 days)',
    'Moved the Riverbend Dental desk logo to Production files after approval',
    'Asked Florence Realty Group for their shipping account',
    'Logged the Oakline Café deposit and released it to production',
    'Flagged the Kenton County Library permit application for follow-up',
  ].map((t, n) => ({ text: t, at: `${today}T${String(8 + n).padStart(2, '0')}:15:00` }));
}

export function coordinatorHtml(upcoming, handled) {
  const up = upcoming.length
    ? upcoming.map((u) => `<li style="padding:6px 0;border-top:1px solid #eef1f5;display:flex;gap:8px;align-items:flex-start"><span aria-hidden="true">${u.ready ? '✅' : '⚠️'}</span><span><a href="/projects/${esc(u.projectId)}?mode=demo"><b>${esc(u.name)}</b></a> · ${esc(u.destination)}<br><small style="color:var(--mute)">${u.ready ? 'Prep pack ready' : 'Needs: ' + esc(u.gaps.join(', '))}</small></span></li>`).join('')
    : '<li style="color:var(--mute);font-size:13px">Nothing due out the door today.</li>';
  const hd = handled.map((h) => `<li style="padding:4px 0;font-size:13px">✓ ${esc(h.text)}</li>`).join('');
  return `<section class="panel" aria-label="Coming Up Today"><h2 style="margin:0 0 4px;font-size:15px">Coming Up Today · No Surprises</h2><ul style="list-style:none;margin:0;padding:0">${up}</ul></section>
<section class="panel" aria-label="Handled For You Today"><details><summary style="cursor:pointer;font-weight:700">Handled For You Today · ${handled.length}</summary><ul style="list-style:none;margin:8px 0 0;padding:0">${hd}</ul></details></section>`;
}

// My Projects tiles, in Phil's order.
export function projectTiles(projects, tasks, today, stuckIds = new Set()) {
  const openLanes = (p) => !['complete', 'lost'].includes(p.lane);
  const open = projects.filter(openLanes);
  const withTask = new Set(tasks.filter((t) => !t.done).map((t) => t.projectId));
  const sum = (l) => l.reduce((a, p) => a + (Number(p.total) || 0), 0);
  const stuck = open.filter((p) => stuckIds.has(p.id));
  const late = open.filter((p) => p.due && p.due < today);
  const onSched = open.filter((p) => !stuck.includes(p) && !late.includes(p));
  const missing = open.filter((p) => !withTask.has(p.id));
  const lost = projects.filter((p) => p.lane === 'lost');
  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
  return [
    { key: 'onschedule', label: 'On schedule', count: onSched.length, tone: '#1f6a43', hint: 'Tasks on time and inside stage targets', href: '/projects?mode=demo' },
    { key: 'stuck', label: 'Stuck', count: stuck.length + late.length, tone: '#a8343f', hint: `${stuck.length} past the stage time target · ${money(sum(stuck))}${late.length ? ` · ${late.length} past due` : ''}`, href: '/projects?mode=demo&show=stuck' },
    { key: 'missing', label: 'Missing a next step', count: missing.length, tone: '#7a4e00', hint: `${missing.length} of ${open.length} projects have no next-step task`, href: '/projects?mode=demo&show=nonext' },
    { key: 'lost', label: 'Lost pipeline', count: lost.length, value: sum(lost), tone: '#5a6478', hint: `${lost.length} estimate${lost.length === 1 ? '' : 's'} lost or abandoned` },
    { key: 'open', label: 'Open pipeline', count: open.length, value: sum(open), tone: '#1d4f91', hint: `${open.length} open project${open.length === 1 ? '' : 's'}` },
  ];
}

export function tilesHtml(tiles) {
  const box = (t) => `<span style="font-size:13px;color:var(--mute);font-weight:500">${esc(t.label)}</span><b style="font-size:26px;line-height:1.1;color:${t.key === 'onschedule' ? 'var(--ink)' : t.tone}">${t.value != null ? '$' + Math.round(t.value).toLocaleString('en-US') : t.count}</b>${t.hint ? `<span style="font-size:12px;color:var(--mute)">${esc(t.hint)}</span>` : ''}`;
  return `<div role="list" aria-label="My Projects" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;padding:0 20px 12px">${tiles.map((t) => `<div role="listitem" class="tile" style="background:#fff;border:1px solid var(--line);border-top:4px solid ${t.tone};border-radius:12px;padding:12px 14px">${t.href ? `<a href="${esc(t.href)}" style="display:flex;flex-direction:column;gap:4px;color:inherit;text-decoration:none">${box(t)}</a>` : `<div style="display:flex;flex-direction:column;gap:4px">${box(t)}</div>`}</div>`).join('')}</div>`;
}

// Mockup look (Main.dc.html): one purple panel, Coming Up Today | Handled For You Today, with × to hide until something new happens.
export const coordSig = (upcoming, handled) => JSON.stringify([upcoming.map((u) => u.id + (u.ready ? '1' : '0')), handled.map((h) => h.text)]).length + ':' + [...upcoming.map((u) => u.id), ...handled.map((h) => h.text)].join('|').slice(0, 400);
export function coordinatorPanel(upcoming, handled) {
  const row = (u, n) => `<div style="display:flex;gap:10px;align-items:center;background:#ffffff;border:1px solid #e2d9f3;border-radius:10px;padding:8px 10px"><span style="font-weight:700;font-size:14px;white-space:nowrap;min-width:64px">${esc(u.when || u.destination)}</span><span style="flex:1 1 auto;min-width:0;font-size:13px"><b>${esc(u.name)}</b><span style="display:block;font-size:12px;color:#5a6478">${esc(u.detail || (u.ready ? 'Ready to go out the door' : 'Needs: ' + u.gaps.join(', ')))}</span></span><a href="/projects/${esc(u.projectId)}?mode=demo" style="font-size:12px;font-weight:700;border-radius:8px;padding:0 10px;min-height:30px;display:inline-flex;align-items:center;white-space:nowrap;text-decoration:none;${n === 0 ? 'color:#ffffff;background:#5b3f8c;border:0' : 'color:#5b3f8c;background:#ffffff;border:1px solid #c9b8e8'}">${n === 0 ? 'Open Prep Pack' : 'Prep Pack'}</a></div>`;
  const up = upcoming.length ? upcoming.map(row).join('') : '<div style="font-size:13px;color:#5a6478;background:#ffffff;border:1px solid #e2d9f3;border-radius:10px;padding:8px 10px">Nothing due out the door today.</div>';
  const hd = handled.map((h) => `<li>✓ ${esc(h.text)}</li>`).join('') || '<li>Nothing yet today.</li>';
  return `<section aria-label="Your coordinator" style="background:#f3f0fa;border:1px solid #e2d9f3;border-radius:12px;padding:12px 44px 12px 16px;position:relative;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:16px" class="coordg">
<form method="post" action="/activities/coord-dismiss" style="position:absolute;top:6px;right:6px;margin:0"><button aria-label="Dismiss until something new happens" title="Dismiss until something new happens" style="width:34px;height:34px;border:0;border-radius:8px;background:transparent;color:#4a3373;font-size:18px;line-height:1;cursor:pointer">×</button></form>
<div style="display:flex;flex-direction:column;gap:6px;min-width:0"><h2 style="margin:0;font-size:14px;font-weight:700;color:#4a3373">✦ Coming Up Today · No Surprises</h2>${up}<span style="font-size:11px;color:#5b3f8c">Anything new on your calendar gets a heads-up right away and a reminder 1 hour before.</span></div>
<div style="display:flex;flex-direction:column;gap:6px;min-width:0"><h2 style="margin:0;font-size:14px;font-weight:700;color:#4a3373">✦ Handled For You Today · ${handled.length}</h2><ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px;font-size:12px;color:#3d4658">${hd}</ul><span style="font-size:11px;color:#5b3f8c">Routine steps run on their own. Anything with money, promises or judgment comes to you first. <a href="/log" style="color:#5b3f8c;font-weight:700;text-decoration:underline">See all activity</a></span></div></section><style>@media (max-width:800px){.coordg{grid-template-columns:1fr!important}}</style>`;
}
