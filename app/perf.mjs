// Performance (goals vs actual, team wins, fireworks preview) and Team (stuck work + escalations, workload).
import { page, esc } from './views.mjs';

const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');

export function salesStats(projects, person) {
  const mine = person ? projects.filter((p) => String(p.salesperson || '').toLowerCase().startsWith(person)) : projects;
  const won = mine.filter((p) => ['complete', 'built', 'progress'].includes(p.lane));
  const quoted = mine.filter((p) => p.lane === 'estimate');
  const lost = mine.filter((p) => p.lane === 'lost');
  const closeRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
  return { sold: won.reduce((a, p) => a + (Number(p.total) || 0), 0), wonCount: won.length, quoted: quoted.reduce((a, p) => a + (Number(p.total) || 0), 0), quoteCount: quoted.length, closeRate };
}

export function teamWins(stats, goals) {
  const w = [];
  if (stats.sold >= goals.monthSales) w.push(`Monthly sales goal hit: ${money(stats.sold)}`);
  if (stats.closeRate >= goals.closeRate) w.push(`Close rate at ${stats.closeRate}%`);
  return w;
}

function fireworks() {
  const colors = ['#f2b84b', '#e06b74', '#4fb3c9', '#9fd0b2', '#c9b6f0'];
  let s = '';
  for (let b = 0; b < 8; b++) {
    const x = 10 + ((b * 23) % 80), y = 15 + ((b * 37) % 50), d = (b * 0.55).toFixed(2);
    for (let r = 0; r < 12; r++) s += `<i style="left:${x}%;top:${y}%;background:${colors[(b + r) % colors.length]};--a:${r * 30}deg;animation-delay:${d}s"></i>`;
  }
  return `<div class="fw" aria-hidden="true">${s}</div><div class="fw-banner" role="status">Goal hit! 🎆</div>
<style>.fw{position:fixed;inset:0;pointer-events:none;z-index:60}.fw i{position:absolute;width:6px;height:6px;border-radius:3px;opacity:0;animation:burst 1.2s ease-out forwards}
@keyframes burst{0%{opacity:1;transform:rotate(var(--a)) translateX(0)}100%{opacity:0;transform:rotate(var(--a)) translateX(90px)}}
.fw-banner{position:fixed;left:50%;top:20%;transform:translateX(-50%);background:#16213a;color:#fff;font-weight:800;font-size:22px;border-radius:14px;padding:12px 22px;z-index:61;animation:fade 5s forwards}
@keyframes fade{0%,85%{opacity:1}100%{opacity:0;visibility:hidden}}@media (prefers-reduced-motion:reduce){.fw{display:none}}</style>`;
}

const PCSS = `.p2col{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px}.p2col>.pcard{margin:0}.pfw{max-width:1240px;margin:0 auto;padding:28px 32px 48px;display:flex;flex-direction:column;gap:20px}.pfw .vh{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0)}.pfw .sub{margin:0;color:#3d4658;font-size:14px}
.ptiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}.ptile{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px 20px;display:flex;flex-direction:column;gap:6px;min-width:0}.ptile .l{font-size:13px;color:var(--mute);font-weight:500}.ptile .v{font-size:30px;font-weight:700;line-height:1.1}.ptile .h{font-size:12px;color:var(--mute)}.ptile .m{height:6px;background:#eef1f5;border-radius:3px;overflow:hidden}.ptile .m i{display:block;height:6px}
.pcard{background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}.pcard>h2{margin:0;padding:14px 18px;border-bottom:1px solid var(--line);font-size:16px}.pcard>ul,.pcard>p{margin:0;padding:12px 18px 14px 36px}.pcard>p{padding-left:18px}.pcard table td,.pcard table th{padding:10px 18px}
.bar2{height:8px;background:#eef1f5;border-radius:4px;overflow:hidden;min-width:120px}.bar2 i{display:block;height:8px;background:#1d4f91}`;
// Sales by month: past months = sold (orders by due month); future months = booked orders at full value
// plus likely (estimates x chance to close). today = YYYY-MM-DD.
export function monthlySales(projects, today, { back = 3, ahead = 2, chance = 0.4 } = {}) {
  const ym = (d) => String(d || '').slice(0, 7);
  const base = new Date(today.slice(0, 7) + '-15T12:00:00Z');
  const months = [];
  for (let i = -back; i <= ahead; i++) { const d = new Date(base); d.setUTCMonth(d.getUTCMonth() + i); months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), future: i > 0, current: i === 0, sold: 0, booked: 0, likely: 0 }); }
  for (const p of projects) {
    const m = months.find((x) => x.key === ym(p.due)); if (!m) continue;
    const v = Number(p.total) || 0;
    if (['complete', 'built', 'progress'].includes(p.lane)) { if (m.future) m.booked += v; else m.sold += v; }
    else if (p.lane === 'estimate') m.likely += v * chance;
  }
  return months;
}
export function funnel(projects) {
  const n = (f) => projects.filter(f);
  const sum = (l) => l.reduce((a, p) => a + (Number(p.total) || 0), 0);
  return [['Prospects', n((p) => p.lane === 'prospect')], ['Estimates out', n((p) => p.lane === 'estimate')], ['In production', n((p) => p.lane === 'progress')], ['Built / complete', n((p) => ['built', 'complete'].includes(p.lane))], ['Lost', n((p) => p.lane === 'lost')]].map(([k, l]) => ({ k, count: l.length, value: sum(l) }));
}

export function performancePage({ user, projects, person, goals = { monthSales: 40000, closeRate: 50 }, preview = false, celebrations = true, today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) }) {
  const reps = [...new Set(projects.map((p) => p.salesperson).filter(Boolean))].sort();
  const mineP = person ? projects.filter((p) => String(p.salesperson || '').toLowerCase().startsWith(person)) : projects;
  const s = salesStats(projects, person);
  const tile = (label, value, goal, pct) => `<div class="ptile"><span class="l">${esc(label)}</span><span class="v" style="color:${pct >= 100 ? '#1f6a43' : 'var(--ink)'}">${esc(value)}</span>${pct != null ? `<div class="m" aria-hidden="true"><i style="width:${Math.min(100, Math.round(pct))}%;background:${pct >= 100 ? '#1f6a43' : '#1d4f91'}"></i></div>` : ''}${goal ? `<span class="h">Goal ${esc(goal)}</span>` : ''}</div>`;
  const wins = teamWins(s, goals);
  const mon = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'America/New_York' });
  const months = monthlySales(mineP, today);
  const maxV = Math.max(goals.monthSales || 1, ...months.map((m) => m.sold + m.booked + m.likely)) * 1.1;
  const H = 180, W = 64, gap = 26, x0 = 40;
  const y = (v) => H - (v / maxV) * H;
  const bars = months.map((m, i) => { const x = x0 + i * (W + gap); let top = H; const seg = (v, c) => { if (!v) return ''; const h = (v / maxV) * H; top -= h; return `<rect x="${x}" y="${top}" width="${W}" height="${h}" rx="3" fill="${c}"></rect>`; }; const total = m.sold + m.booked + m.likely; return `${seg(m.sold, m.current ? '#a8343f' : '#16213a')}${seg(m.booked, '#4b6aa8')}${seg(m.likely, '#b9c6e2')}<text x="${x + W / 2}" y="${top - 6}" text-anchor="middle" font-size="11" fill="#3d4658">${total ? '$' + Math.round(total / 100) / 10 + 'k' : ''}</text><text x="${x + W / 2}" y="${H + 16}" text-anchor="middle" font-size="12" fill="#5a6478">${m.label}</text>`; }).join('');
  const gy = y(goals.monthSales || 0);
  const chart = `<svg viewBox="0 0 ${x0 + months.length * (W + gap)} ${H + 24}" width="100%" style="max-width:640px" role="img" aria-label="Sales by month with forecast"><line x1="${x0 - 10}" x2="${x0 + months.length * (W + gap) - gap + 10}" y1="${gy}" y2="${gy}" stroke="#a8343f" stroke-dasharray="5 4"></line>${bars}</svg>`;
  const legend = [['#16213a', 'Sold'], ['#a8343f', 'Sold this month'], ['#4b6aa8', 'Booked: orders at full value'], ['#b9c6e2', 'Likely: estimates × chance to close']].map(([c, l]) => `<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:10px;height:10px;border-radius:2px;background:${c};display:inline-block"></i>${l}</span>`).join('') + `<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:14px;border-top:2px dashed #a8343f;display:inline-block"></i>${money(goals.monthSales)} monthly goal</span>`;
  const short = months.filter((m) => m.future && m.sold + m.booked + m.likely < goals.monthSales);
  const salesCard = `<section class="pcard" aria-label="Sales by month"><h2>Sales by Month · Past and Forecast</h2><div style="padding:12px 18px;display:flex;flex-direction:column;gap:10px"><div style="font-size:12px;color:var(--mute)">Future months placed by each order's or estimate's due date</div>${chart}<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:#3d4658">${legend}</div>${short.length ? `<div style="font-size:13px">${esc(short[0].label)} looks short by about ${money(goals.monthSales - (short[0].sold + short[0].booked + short[0].likely))}.</div>` : ''}</div></section>`;
  const fn = funnel(mineP);
  const fmax = Math.max(1, ...fn.map((f) => f.count));
  const funnelCard = `<section class="pcard" aria-label="Pipeline"><h2>Where Your Pipeline Stands</h2><div style="padding:12px 18px;display:flex;flex-direction:column;gap:8px">${fn.map((f) => `<div style="display:grid;grid-template-columns:150px 1fr 120px;gap:10px;align-items:center;font-size:13px"><span>${esc(f.k)}</span><div class="bar2"><i style="width:${Math.round((f.count / fmax) * 100)}%;background:${f.k === 'Lost' ? '#a8343f' : '#1d4f91'}"></i></div><span style="text-align:right"><b>${f.count}</b> · ${money(f.value)}</span></div>`).join('')}</div></section>`;
  // Mockup MyPerformance: "Why deals were lost", from the reason picked when a project is marked lost.
  const lostP = mineP.filter((p) => p.lane === 'lost');
  const byR = {}; for (const p of lostP) { const r = p.reason || String(p.status || '').replace(/^Lost:\s*/, '') || 'No reason picked'; (byR[r] = byR[r] || { n: 0, v: 0 }); byR[r].n++; byR[r].v += Number(p.total) || 0; }
  const lr = Object.entries(byR).sort((a, b) => b[1].n - a[1].n); const lmax = Math.max(1, ...lr.map(([, x]) => x.n));
  const lostCard = `<section class="pcard" aria-label="Why deals were lost"><h2>Why Deals Were Lost</h2><div style="padding:12px 18px;display:flex;flex-direction:column;gap:8px">${lr.length ? lr.map(([r, x]) => `<div style="display:grid;grid-template-columns:150px 1fr 110px;gap:10px;align-items:center;font-size:13px"><span>${esc(r)}</span><div class="bar2"><i style="width:${Math.round((x.n / lmax) * 100)}%;background:#a8343f"></i></div><span style="text-align:right"><b>${x.n}</b> · ${money(x.v)}</span></div>`).join('') : '<p style="margin:0;font-size:13px;color:var(--mute)">No lost deals yet. When a project is marked lost, its reason shows here.</p>'}</div></section>`;
  const gapV = (goals.monthSales || 0) - s.sold;
  const gapCard = `<section class="ptile" aria-label="Goal" style="flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap"><div><span class="l">${person ? esc(reps.find((r) => r.toLowerCase().startsWith(person)) || 'Salesperson') : 'Everyone'} · this month</span><div style="font-size:28px;font-weight:700">${money(s.sold)} <span style="font-size:15px;font-weight:500;color:var(--mute)">of ${money(goals.monthSales)}</span></div></div><div style="text-align:right"><span class="l">${gapV > 0 ? 'Still to go' : 'Goal hit'}</span><div style="font-size:22px;font-weight:700;color:${gapV > 0 ? '#874511' : '#1f6a43'}">${gapV > 0 ? money(gapV) : '🎯 ' + money(-gapV) + ' over'}</div></div></section>`;
  const controls = `<form method="get" action="/performance" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--mute)">Salesperson<select name="rep" data-autosubmit style="font:inherit;font-size:14px;border:1px solid #d5dbe5;border-radius:8px;padding:0 10px;min-height:38px;background:#fff;color:var(--ink)"><option value="">Everyone</option>${reps.map((r) => `<option value="${esc(r.toLowerCase())}" ${person && r.toLowerCase().startsWith(person) ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label><noscript><button class="btn">Show</button></noscript><a class="btn" href="/admin?tab=sales">Edit My Goal</a></form>`;
  const body = `<div class="pfw"><header style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><h1 class="vh">Performance</h1><p class="sub">${esc(mon)} · from SalesMax orders and estimates</p></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${controls}${celebrations ? `<a class="btn" href="/performance?preview=1">Preview 🎆</a>` : ''}</div></header>${gapCard}
<section class="ptiles" aria-label="This month">${tile('Sold (open + done)', money(s.sold), money(goals.monthSales), goals.monthSales ? (s.sold / goals.monthSales) * 100 : null)}${tile('Orders won', String(s.wonCount))}${tile('Quotes out', `${s.quoteCount} · ${money(s.quoted)}`)}${tile('Close rate', s.closeRate + '%', goals.closeRate + '%', goals.closeRate ? (s.closeRate / goals.closeRate) * 100 : null)}${tile('Average order', s.wonCount ? money(Math.round(s.sold / s.wonCount)) : '—')}</section>
${salesCard}<div class="p2col">${funnelCard}${lostCard}</div><p style="margin:0;font-size:12px;color:var(--mute)">How your activity turns into sales (calls, emails and visits per order) appears once Gmail is connected; Clarity calls are already coming in.</p>
<section class="pcard"><h2>Team Wins</h2>${wins.length ? `<ul style="margin:0;padding-left:18px">${wins.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : '<p style="margin:0;color:var(--mute)">No wins logged yet this month. They show here as goals are hit.</p>'}</section></div>${preview && celebrations ? fireworks() : ''}`;
  return page({ title: 'Performance', user, tab: 'Performance', body: body + `<style>${PCSS}</style>` });
}

// Team: "Slipping Through the Cracks" across everyone (past-due tasks, unanswered email, projects with no next step,
// stuck items, quiet customers) and a By Salesperson table. tasksBy / mailBy are keyed by team member key.
const firstKey0 = (name) => String(name || '').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
// Match a person by their team entry (full name) before falling back to first name (review fix).
const keyIn = (team) => (name) => { const n = String(name || '').trim().toLowerCase(); const m = (team || []).find((x) => String(x.name || '').trim().toLowerCase() === n); return m ? m.key : firstKey0(name); };
export function slipping({ projects = [], tasksBy = {}, mailBy = {}, stuck = [], warm = [], team = [], today }) {
  const firstKey = keyIn(team);
  const nameOf = (k) => (team.find((t) => t.key === k) || {}).name || k;
  const out = [];
  const daysSince = (d) => Math.max(0, Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(String(d).slice(0, 10) + 'T12:00:00Z')) / 864e5));
  for (const [k, tasks] of Object.entries(tasksBy)) for (const t of tasks) if (!t.done && t.due && t.due < today) out.push({ type: 'Task', title: t.title, why: `${t.customer ? t.customer + ' · ' : ''}due ${t.due}`, owner: nameOf(k), ownerKey: k, age: `${daysSince(t.due)} day${daysSince(t.due) === 1 ? '' : 's'} late`, days: daysSince(t.due), href: t.projectId ? `/projects/${t.projectId}?mode=demo` : '/activities', hot: true });
  for (const [k, mail] of Object.entries(mailBy)) for (const m of mail) if (m.folder === 'inbox' && daysSince(m.at) >= 1) out.push({ type: 'Email', title: m.subject || '(no subject)', why: `${m.name || m.from} · no reply yet`, owner: nameOf(k), ownerKey: k, age: `${daysSince(m.at)} day${daysSince(m.at) === 1 ? '' : 's'}`, days: daysSince(m.at), href: m.customer ? `/customers/${String(m.customer).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}?tab=email` : '/activities', hot: daysSince(m.at) >= 2 });
  const withTask = new Set(Object.values(tasksBy).flat().filter((t) => !t.done).map((t) => t.projectId));
  for (const pr of projects) if (!['complete', 'lost'].includes(pr.lane) && !withTask.has(pr.id) && !pr.onBoard) out.push({ type: 'Project', title: pr.name, why: `${pr.company} · no next step${pr.total ? ' · $' + Math.round(pr.total).toLocaleString('en-US') : ''}`, owner: pr.salesperson || 'Unassigned', ownerKey: firstKey(pr.salesperson), age: 'No task', days: 1, href: `/projects/${pr.id}?mode=demo`, hot: false });
  for (const s of stuck) out.push({ type: 'Project', title: s.name || s.id, why: `Stuck in ${s.stepName || s.step}${s.holdReason ? ' · ' + s.holdReason : ''}`, owner: s.person || 'Unassigned', ownerKey: firstKey(s.person), age: s.days != null ? `${s.days} days` : 'Stuck', days: s.days || 0, href: s.projectId ? `/projects/${s.projectId}?mode=demo` : '/boards/production', hot: !!s.escalate });
  for (const c of warm) if (c.state === 'Dormant' || c.state === 'Keep warm') out.push({ type: 'Customer', title: `${c.name} going quiet`, why: c.reason || c.state, owner: c.salesperson || '—', ownerKey: firstKey(c.salesperson), age: c.state, days: 0, href: `/customers/${c.id}`, hot: false });
  return out.sort((a, b) => (b.hot - a.hot) || b.days - a.days);
}
export function repRows({ projects = [], tasksBy = {}, mailBy = {}, stuck = [], today, goal = 0, team = [] }) {
  const firstKey = keyIn(team);
  const won = (pr) => ['complete', 'built', 'progress'].includes(pr.lane);
  // Everyone with work on their list shows up, so the table adds up to the tiles above it (review fix).
  const sales = [...new Set(projects.map((pr) => pr.salesperson).filter(Boolean))];
  const busy = [...Object.keys(tasksBy), ...Object.keys(mailBy)].filter((k) => !sales.some((n) => firstKey(n) === k) && ((tasksBy[k] || []).some((t) => !t.done) || (mailBy[k] || []).some((m) => m.folder === 'inbox')));
  const names = [...sales, ...[...new Set(busy)].map((k) => (team.find((m) => m.key === k) || {}).name || k.charAt(0).toUpperCase() + k.slice(1))].sort();
  const withTask = new Set(Object.values(tasksBy).flat().filter((t) => !t.done).map((t) => t.projectId));
  return names.map((name) => {
    const k = firstKey(name); const mine = projects.filter((pr) => pr.salesperson === name);
    const sold = mine.filter(won).reduce((a, pr) => a + (Number(pr.total) || 0), 0);
    const lost = mine.filter((pr) => pr.lane === 'lost').length; const wonN = mine.filter(won).length;
    return { name, key: k, sold, goal, pct: goal ? Math.round((sold / goal) * 100) : 0, pipe: mine.filter((pr) => ['prospect', 'estimate'].includes(pr.lane)).reduce((a, pr) => a + (Number(pr.total) || 0), 0), close: wonN + lost ? Math.round((wonN / (wonN + lost)) * 100) : 0, missing: mine.filter((pr) => !['complete', 'lost'].includes(pr.lane) && !withTask.has(pr.id)).length, pastDue: (tasksBy[k] || []).filter((t) => !t.done && t.due && t.due < today).length, unanswered: (mailBy[k] || []).filter((m) => m.folder === 'inbox').length, stuck: stuck.filter((s) => firstKey(s.person) === k).length };
  });
}

export function teamPage({ user, stuck, items, stepName = (id) => id, slip = [], reps = [], show = '', flash = '' }) {
  const byPerson = {};
  for (const i of items.filter((x) => !['complete', 'done'].includes(x.step))) byPerson[i.person || 'Unassigned'] = (byPerson[i.person || 'Unassigned'] || 0) + 1;
  const rows = stuck.map((x) => `<tr><td>${x.escalate ? '<span class="pill" style="background:#f6e8ea;color:#a8343f">Escalate</span>' : '<span class="pill" style="background:#fdf3dc;color:#7a4e00">Follow up</span>'}</td><td><a href="/projects/${esc(x.projectId)}?mode=demo">${esc(x.name || x.id)}</a></td><td>${esc(stepName(x.step))}${x.holdReason ? ` · ${esc(x.holdReason)}` : ''}</td><td>${esc(x.person || '')}</td><td>${esc(x.days != null ? x.days + ' days' : '')}</td></tr>`).join('');
  const maxL = Math.max(1, ...Object.values(byPerson));
  const load = Object.entries(byPerson).sort((a, b) => b[1] - a[1]).map(([p, n]) => `<tr><td>${esc(p)}</td><td>${n}</td><td><div class="bar2" aria-hidden="true"><i style="width:${Math.round((n / maxL) * 100)}%"></i></div></td></tr>`).join('');
  const openN = Object.values(byPerson).reduce((a, b) => a + b, 0);
  const tileT = (l, v, h, c = 'var(--ink)') => `<div class="ptile"><span class="l">${l}</span><span class="v" style="color:${c}">${v}</span><span class="h">${h}</span></div>`;
  const TY = { Email: ['#e8f0fb', '#1d4f91'], Task: ['#fbeaec', '#8f2a34'], Project: ['#fdeedf', '#874511'], Customer: ['#f1ebf8', '#5b3f8c'], Lead: ['#e6f2ec', '#1f6a43'] };
  const counts = Object.fromEntries(Object.keys(TY).map((k) => [k, slip.filter((x) => x.type === k).length]));
  const shown = slip.filter((x) => !show || x.type === show);
  const showSel = `<form method="get" action="/team" style="margin:0"><label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--mute)">Show<select name="show" data-autosubmit style="font:inherit;font-size:13px;font-weight:600;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px;min-height:34px;background:#fff;color:var(--ink)"><option value="">All ${slip.length}</option>${[['Email', 'Emails'], ['Task', 'Tasks'], ['Project', 'Projects'], ['Customer', 'Customers']].map(([k, l]) => `<option value="${k}" ${show === k ? 'selected' : ''}>${l} ${counts[k]}</option>`).join('')}</select></label><noscript><button class="btn">Show</button></noscript></form>`;
  const slipRows = shown.slice(0, 40).map((r) => `<div style="display:flex;align-items:center;gap:14px;padding:12px 18px;border-top:1px solid #eef1f5;flex-wrap:wrap"><span style="flex:0 0 76px;text-align:center;font-size:11px;font-weight:700;padding:3px 0;border-radius:10px;background:${TY[r.type][0]};color:${TY[r.type][1]}">${r.type}</span><div style="flex:1 1 320px;min-width:0"><div style="font-size:14px;font-weight:600">${esc(r.title)}</div><div style="font-size:12px;color:var(--mute)">${esc(r.why)}</div></div><span style="font-size:13px;width:130px"><b>${esc(r.owner)}</b><span style="display:block;font-size:12px;font-weight:600;color:${r.hot ? '#a8343f' : '#3d4658'}">${esc(r.age)}</span></span><span style="display:flex;gap:6px">${r.ownerKey ? `<form method="post" action="/team/nudge" style="margin:0"><input type="hidden" name="to" value="${esc(r.ownerKey)}"><input type="hidden" name="title" value="${esc(r.title)}"><input type="hidden" name="href" value="${esc(r.href)}"><button class="btn" style="min-height:36px">Nudge</button></form>` : ''}<a class="btn" href="${esc(r.href)}" style="min-height:36px">Open</a></span></div>`).join('');
  const slipCard = `<section class="pcard" aria-label="Slipping through the cracks"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line)"><div><h2 style="margin:0;font-size:16px">Slipping Through the Cracks</h2><div style="font-size:12px;color:var(--mute);margin-top:2px">Most at-risk first</div></div>${showSel}</div>${slipRows || '<p style="margin:0;padding:14px 18px;color:var(--mute)">Nothing slipping right now.</p>'}<div style="padding:10px 18px;font-size:12px;color:var(--mute)">Nudge puts a task on that person's Activities. Open goes to the record.</div></section>`;
  const red = '#a8343f';
  const repCard = reps.length ? `<section class="pcard" aria-label="Salespeople"><h2>By Salesperson</h2><div style="overflow-x:auto"><table style="min-width:900px"><thead><tr><th>Salesperson</th><th style="width:220px">Sold vs. goal</th><th style="text-align:right">Open pipeline</th><th style="text-align:right">Close rate</th><th style="text-align:right">Missing a next step</th><th style="text-align:right">Past-due tasks</th><th style="text-align:right">Unanswered</th><th style="text-align:right">Stuck</th></tr></thead><tbody>${reps.map((r) => `<tr><th scope="row" style="text-align:left"><a href="/performance?rep=${encodeURIComponent(r.name.toLowerCase())}">${esc(r.name)}</a></th><td><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><b>${money(r.sold)}</b><span style="color:var(--mute)">${r.pct}% of ${money(r.goal)}</span></div><div class="bar2" aria-hidden="true"><i style="width:${Math.min(100, r.pct)}%;background:${r.pct >= 100 ? '#1f6a43' : '#16213a'}"></i></div></td><td style="text-align:right">${money(r.pipe)}</td><td style="text-align:right">${r.close}%</td><td style="text-align:right;font-weight:600;color:${r.missing > 5 ? red : 'inherit'}">${r.missing}</td><td style="text-align:right;font-weight:600;color:${r.pastDue > 2 ? red : 'inherit'}">${r.pastDue}</td><td style="text-align:right;font-weight:600;color:${r.unanswered > 3 ? red : 'inherit'}">${r.unanswered}</td><td style="text-align:right">${r.stuck}</td></tr>`).join('')}</tbody></table></div><p>Click a name to see their Performance.</p></section>` : '';
  const atRisk = slip.filter((x) => x.type === 'Project').length;
  const body = `<div class="pfw"><header style="display:flex;align-items:center;gap:6px"><h1 class="vh">Team</h1><p class="sub">${reps.length} ${reps.length === 1 ? 'salesperson' : 'salespeople'} · who is working on what, and what is slipping</p><span title="Only owners and managers see this tab." aria-label="Only owners and managers see this tab." style="display:inline-flex;width:18px;height:18px;border-radius:9px;background:#eef1f5;color:#3d4658;font-size:11px;font-weight:700;align-items:center;justify-content:center">i</span></header>${flash ? `<div class="note" style="margin:0">${esc(flash)}</div>` : ''}
<section class="ptiles" aria-label="Team summary">${tileT('Customers waiting on us', counts.Email, 'Emails with no reply for a day or more', counts.Email ? red : '#1f6a43')}${tileT('Missing a next step', slip.filter((x) => x.age === 'No task').length, 'projects with no next step', '#874511')}${tileT('Past-due tasks', counts.Task, 'Across everyone', counts.Task ? '#874511' : '#1f6a43')}${tileT('Stuck items', stuck.length, 'Products past their step target · ' + stuck.filter((x) => x.escalate).length + ' 5+ days', stuck.length ? red : '#1f6a43')}${tileT('Slipping through the cracks', slip.length, `${slip.filter((x) => x.hot).length} urgent today`, slip.length ? red : '#1f6a43')}</section>
${slipCard}${repCard}
<section class="pcard"><h2>Stuck · ${stuck.length}</h2><table><thead><tr><th></th><th>Item</th><th>Where</th><th>Who</th><th>How long</th></tr></thead><tbody>${rows || '<tr><td colspan="5" style="color:var(--mute)">Nothing stuck. Nice.</td></tr>'}</tbody></table></section>
<section class="pcard"><h2>Open Work by Person</h2><table><thead><tr><th>Person</th><th>Open items</th><th style="width:40%"></th></tr></thead><tbody>${load}</tbody></table></section></div>`;
  return page({ title: 'Team', user, tab: 'Team', body: body + `<style>${PCSS}</style>` });
}
