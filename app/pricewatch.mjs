// Price protection (Phil, Nov 12; works like CoreBridge). Each open estimate/order keeps the prices it was shared
// with. When an admin changes the price list, every open job whose lines would change gets a "Prices changed" box and a
// To Do: Keep Shared Price (an override, logged with who and when) or Update to Latest (a new version to approve).
// Orders already in production keep their shared prices automatically; the box just says so.
import { esc } from './views.mjs';

export const priceKey = (e) => `${e.group}|${e.field}|${e.choice}`;
const money = (n) => `$${(Math.round(Number(n || 0) * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const r2 = (n) => Math.round(n * 100) / 100;

export function diffPriceLists(before = [], after = []) {
  const b = new Map(before.map((e) => [priceKey(e), e]));
  const out = [];
  for (const e of after) {
    const old = b.get(priceKey(e));
    const from = old ? old.price : null;
    if (from !== e.price && !(from == null && e.price == null)) out.push({ key: priceKey(e), label: `${e.field}${e.choice === '*' ? '' : ` – ${e.choice}`}`, group: e.group, from, to: e.price });
  }
  for (const [k, old] of b) if (!after.some((e) => priceKey(e) === k) && old.price != null) out.push({ key: k, label: `${old.field}${old.choice === '*' ? '' : ` – ${old.choice}`}`, group: old.group, from: old.price, to: null });
  return out;
}

// shared: { projectId: { at, lines: [{ key, line, qty, price }] } }; projects: [{ id, name, company, lane }]
export function findAffected({ shared = {}, changes = [], projects = [], at, by }) {
  const byKey = new Map(changes.map((c) => [c.key, c]));
  const alerts = {};
  for (const p of projects) {
    if (['complete', 'lost'].includes(p.lane)) continue;
    const s = shared[p.id];
    if (!s || !Array.isArray(s.lines)) continue;
    const lines = s.lines.filter((l) => byKey.has(l.key) && byKey.get(l.key).to != null).map((l) => {
      const c = byKey.get(l.key);
      return { key: l.key, line: l.line, what: `${c.label}: ${money(l.price)} → ${money(c.to)} each`, shared: r2(l.price * l.qty), latest: r2(c.to * l.qty), latestUnit: c.to };
    });
    if (!lines.length) continue;
    const delta = r2(lines.reduce((a, l) => a + l.latest - l.shared, 0));
    const inProduction = ['progress', 'built'].includes(p.lane);
    alerts[p.id] = { projectId: p.id, name: p.name, company: p.company, at, by, lines, delta, inProduction, status: inProduction ? 'kept-auto' : 'open' };
  }
  return alerts;
}

export function resolveAlert(alerts = {}, shared = {}, projectId, choice, { by, at }) {
  const a = alerts[projectId];
  if (!a || a.status !== 'open') throw new Error('there is nothing to decide on this job');
  if (choice === 'keep') return { alerts: { ...alerts, [projectId]: { ...a, status: 'kept', decidedBy: by, decidedAt: at } }, shared };
  if (choice === 'update') {
    const s = shared[projectId] || { lines: [] };
    const upd = new Map(a.lines.map((l) => [l.key, l.latestUnit]));
    const lines = s.lines.map((l) => (upd.has(l.key) ? { ...l, price: upd.get(l.key) } : l));
    return { alerts: { ...alerts, [projectId]: { ...a, status: 'updated', decidedBy: by, decidedAt: at, version: (s.version || 1) + 1 } }, shared: { ...shared, [projectId]: { ...s, lines, version: (s.version || 1) + 1, at } } };
  }
  throw new Error('pick Keep Shared Price or Update to Latest');
}

export function priceTodos(alerts = {}, today) {
  return Object.values(alerts).filter((a) => a.status === 'open').map((a) => ({ id: `price-${a.projectId}`, kind: 'task', title: `Prices changed on ${a.name}: keep the shared price or update (${a.delta >= 0 ? '+' : '−'}${money(Math.abs(a.delta))})`, customer: a.company, projectId: a.projectId, due: today, done: false, label: 'Price change' }));
}

const nice = (iso) => (iso ? new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' }) : '');
export function priceBox(a, projectId) {
  if (!a) return '';
  if (a.status !== 'open') {
    const t = a.status === 'kept-auto' ? `Price list changed ${nice(a.at)}. This order is already in production, so it keeps the prices the customer agreed to.`
      : a.status === 'kept' ? `✓ Shared prices kept (override by ${esc(a.decidedBy || 'someone')}, ${nice(a.decidedAt)}). The price-list change applies to new estimates only.`
        : `✓ Updated to the latest prices. A new version (v${a.version || 2}) is ready to send for approval.`;
    return `<div role="status" style="margin:8px 0;font-size:12px;color:#1f6a43;background:#e6f2ec;border-radius:8px;padding:6px 10px">${t}</div>`;
  }
  const rows = a.lines.map((l) => `<tr style="border-top:1px solid #f2d29b"><td style="padding:6px 0">${esc(l.line)}</td><td style="padding:6px 0">${esc(l.what)}</td><td style="padding:6px 0;text-align:right">${money(l.shared)}</td><td style="padding:6px 0;text-align:right;font-weight:700">${money(l.latest)}</td></tr>`).join('');
  const sign = a.delta >= 0 ? '+' : '−';
  return `<section role="alert" aria-label="Price list changed" style="margin:8px 0;border:1px solid #f2d29b;background:#fff8ec;border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px">
<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap"><b style="font-size:14px;color:#5c3a0c">Prices changed since this estimate was sent</b><span style="font-size:12px;color:#7a5600">${nice(a.at)} price list update · affects ${a.lines.length} line${a.lines.length === 1 ? '' : 's'} · would ${a.delta >= 0 ? 'add' : 'take off'} ${money(Math.abs(a.delta))}</span></div>
<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;color:#7a5600"><th style="padding:4px 0">Line</th><th style="padding:4px 0">What changed</th><th style="padding:4px 0;text-align:right">Shared price</th><th style="padding:4px 0;text-align:right">Latest price</th></tr></thead><tbody>${rows}</tbody></table>
<form method="post" action="/projects/${esc(projectId)}/prices" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0"><button class="btn primary" name="do" value="keep">Keep Shared Price</button><button class="btn" name="do" value="update">Update to Latest (${sign}${money(Math.abs(a.delta))})</button><span style="font-size:12px;color:#7a5600">Keeping it locks these prices as an override, with your name and the date. Updating shows the customer a new version to approve.</span></form></section>`;
}

// Demo: prices the sample jobs were shared at (test copy only), using the sample price list entries.
export const DEMO_SHARED = {
  'demo-6': { at: '2026-11-03', lines: [{ key: 'PRODUCTION (RIGID)|Add Holes|Four Corners', line: 'Lobby sign: Add Holes – Four Corners', qty: 2, price: 6 }, { key: "PRODUCTION (RIGID)|Add'l Labor (Min)|*", line: "Lobby sign: Add'l Labor", qty: 30, price: 1.25 }] },
  'demo-3': { at: '2026-11-05', lines: [{ key: "GRAPHIC DESIGN|Add'l Design Time (Min)|*", line: 'Monument refresh: extra design time', qty: 60, price: 1.5 }, { key: 'GRAPHIC DESIGN|Vectorize Artwork (Qty)|*', line: 'Monument refresh: vectorize logo', qty: 1, price: 45 }] },
  'demo-4': { at: '2026-11-06', lines: [{ key: 'PRODUCTION (RIGID)|Add Holes|Four Corners', line: 'Jobsite banners: grommets/holes', qty: 12, price: 6 }] },
};
