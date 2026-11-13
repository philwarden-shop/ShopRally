// Customers > Prospects: CoreBridge prospects grouped by city, a visit route you can send to Google Maps,
// and market penetration by city from your own order history. Read-only from CoreBridge.
// The summary is built by the minute job (marketJob) at most every 6 hours, because it reads every imported customer.
import { esc } from './views.mjs';

export function normCity(c) {
  let s = String(c || '').trim().replace(/[.,]+$/, '').replace(/\s+/g, ' ');
  if (!s) return 'No City';
  s = s.toLowerCase().replace(/\b\w/g, (x) => x.toUpperCase());
  return s.replace(/^(Fort|Ft)\.?\s+/, 'Ft. ').replace(/^(Saint|St)\.?\s+/, 'St. ');
}
const addDays = (ymd, n) => { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const addrOf = (a) => (a ? [a.address1, a.address2].filter(Boolean).join(' ') : '');

// customers: CoreBridge customer records. orders: { [accountId]: { last: 'YYYY-MM-DD', n } }.
export function buildMarket(customers, orders, today, { maxProspects = 1200 } = {}) {
  const yearAgo = addDays(today, -365);
  const cities = {}; const prospects = [];
  for (const c of customers) {
    if (!c || c.accountId == null) continue;
    const a = c.defaultCustomerAddress || c.billingAddress || {};
    const city = normCity(a.city);
    const row = (cities[city] = cities[city] || { city, active: 0, past: 0, never: 0, prospects: 0 });
    const o = orders[c.accountId];
    const isProspect = /prospect/i.test(String(c.accountType || ''));
    if (isProspect && !o) {
      row.prospects++;
      const pc = c.primaryAccountContact || {};
      prospects.push({ id: c.accountId, n: c.companyName || '', city, st: String(a.state || '').toUpperCase(), a: addrOf(a), z: a.postalCode || '', ph: c.companyPhone || pc.officePhone || pc.cellPhone || '', ct: [pc.firstName, pc.lastName].filter(Boolean).join(' '), in: c.industryType || '', d: String(c.createdDate || '').slice(0, 10) });
    } else if (o && o.last >= yearAgo) row.active++;
    else if (o) row.past++;
    else row.never++;
  }
  prospects.sort((x, y) => (y.d || '').localeCompare(x.d || '') || x.n.localeCompare(y.n));
  const list = Object.values(cities).map((r) => ({ ...r, total: r.active + r.past + r.never + r.prospects })).sort((x, y) => y.total - x.total);
  return { at: new Date().toISOString(), today, cities: list, prospects: prospects.slice(0, maxProspects), prospectTotal: prospects.length };
}

// Google Maps directions link (no key needed). Up to 9 stops after the shop.
export function mapsUrl(stops, origin) {
  const fmt = (s) => [s.a, s.city !== 'No City' ? s.city : '', s.st, s.z].filter(Boolean).join(', ');
  const pts = stops.slice(0, 9).map(fmt).filter(Boolean);
  if (!pts.length) return '';
  const dest = pts[pts.length - 1];
  const way = pts.slice(0, -1);
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}${way.length ? '&waypoints=' + encodeURIComponent(way.join('|')) : ''}&travelmode=driving`;
}

export function applyRoute(route = { ids: [] }, f = {}) {
  const ids = [...(route.ids || [])];
  const id = Number(f.id);
  if (f.do === 'clear') return { ids: [] };
  if (!Number.isInteger(id) || id <= 0) throw new Error('pick a prospect');
  if (f.do === 'remove') return { ids: ids.filter((x) => x !== id) };
  if (ids.includes(id)) return { ids };
  if (ids.length >= 9) throw new Error('a route holds 9 stops. Remove one first');
  return { ids: [...ids, id] };
}
export function applyHide(hidden = [], f = {}) {
  const id = Number(f.id);
  if (!Number.isInteger(id) || id <= 0) throw new Error('pick a prospect');
  return f.do === 'unhide' ? hidden.filter((x) => x !== id) : [...new Set([...hidden, id])];
}

export const viewToggle = (view) => `<div role="group" aria-label="View" style="display:inline-flex;background:#fff;border:1px solid #d5dbe5;border-radius:8px;padding:3px;margin:0 0 12px">${[['', 'Accounts'], ['prospects', 'Prospects']].map(([v, l]) => `<a href="/customers${v ? '?view=' + v : ''}" aria-current="${view === v}" style="font-size:13px;font-weight:600;border-radius:6px;padding:0 14px;min-height:32px;display:inline-flex;align-items:center;text-decoration:none;background:${view === v ? '#16213a' : 'transparent'};color:${view === v ? '#fff' : '#1b2436'}">${l}</a>`).join('')}</div>`;

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export function prospectsView({ market, route = { ids: [] }, hidden = [], city = '', q = '', showHidden = false, origin = 'FASTSIGNS of Northern Kentucky, Florence, KY', flash = '' }) {
  if (!market || !market.cities) {
    return `${viewToggle('prospects')}<section class="cpanel" aria-label="Prospects"><h2>Prospects</h2><p style="margin:0;font-size:14px">SalesMax is building this list from the imported CoreBridge customers. It refreshes every few hours; check back in a few minutes.</p></section>`;
  }
  const hid = new Set(hidden);
  const s = String(q).toLowerCase().trim();
  const all = market.prospects.filter((p) => (showHidden ? hid.has(p.id) : !hid.has(p.id)));
  const shown = all.filter((p) => (!city || p.city === city) && (!s || `${p.n} ${p.ct} ${p.a} ${p.in}`.toLowerCase().includes(s)));
  const byCity = {};
  for (const p of shown) (byCity[p.city] = byCity[p.city] || []).push(p);
  const cityOrder = Object.keys(byCity).sort((a, b) => byCity[b].length - byCity[a].length || a.localeCompare(b));
  const inRoute = new Set(route.ids || []);
  const stops = (route.ids || []).map((id) => market.prospects.find((p) => p.id === id)).filter(Boolean);
  const link = (extra) => { const u = new URLSearchParams({ view: 'prospects', ...(city ? { city } : {}), ...(q ? { q } : {}), ...(showHidden ? { hidden: '1' } : {}), ...extra }); return `/customers?${u}`; };
  const back = link({});
  const act = (path, id, d, label, primary) => `<form method="post" action="/customers/prospects/${path}" style="margin:0"><input type="hidden" name="id" value="${id}"><input type="hidden" name="do" value="${d}"><input type="hidden" name="back" value="${esc(back)}"><button class="btn${primary ? ' primary' : ''}" style="min-height:34px;font-size:13px">${label}</button></form>`;
  const totals = market.cities.reduce((a, r) => ({ active: a.active + r.active, past: a.past + r.past, never: a.never + r.never, prospects: a.prospects + r.prospects }), { active: 0, past: 0, never: 0, prospects: 0 });
  const tile = (l, v, h, color = 'var(--ink)') => `<div class="ctile"><div class="l">${l}</div><div class="v" style="color:${color}">${v}</div><div class="h">${h}</div></div>`;
  const tiles = `<section aria-label="Prospect summary" class="ctiles">${tile('Prospects', all.length.toLocaleString(), `${market.prospectTotal.toLocaleString()} in CoreBridge with no orders`)}${tile('Active customers', totals.active.toLocaleString(), 'Ordered in the last 12 months', '#1f6a43')}${tile('Past customers', totals.past.toLocaleString(), 'Ordered before, not in 12 months · Win-back', '#a8343f')}${tile('Your route', `${stops.length} of 9`, stops.length ? 'Send it to Google Maps below' : 'Add stops from the list')}</section>`;
  const routeHtml = `<section class="cpanel" aria-label="Your route" id="route"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h2 style="margin:0">Your Route</h2>${stops.length ? `<span style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn primary" href="${esc(mapsUrl(stops, origin))}" target="_blank" rel="noopener">Send All to Google Maps</a>${act('route', 0, 'clear', 'Clear Route', false)}</span>` : ''}</div>${stops.length ? `<ol style="margin:10px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:6px">${stops.map((p) => `<li style="font-size:14px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><span><a href="/customers/imported/${p.id}"><b>${esc(p.n)}</b></a> · ${esc(p.a || 'No street address')}, ${esc(p.city)}</span>${act('route', p.id, 'remove', 'Remove', false)}</div></li>`).join('')}</ol><p style="margin:8px 0 0;font-size:12px;color:var(--mute)">Starts from ${esc(origin)}. Google Maps lets you reorder stops for the fastest drive.</p>` : '<p style="margin:8px 0 0;font-size:13px;color:var(--mute)">Pick prospects below with Add to Route. Group visits by city to save driving.</p>'}</section>`;
  const cityOpts = market.cities.filter((r) => r.prospects).map((r) => `<option value="${esc(r.city)}" ${r.city === city ? 'selected' : ''}>${esc(r.city)} (${r.prospects})</option>`).join('');
  const filters = `<form method="get" action="/customers" class="cpanel" style="display:flex;gap:10px;flex-wrap:wrap;align-items:end"><input type="hidden" name="view" value="prospects">${showHidden ? '<input type="hidden" name="hidden" value="1">' : ''}<label style="display:flex;flex-direction:column;font-size:12px">City<select name="city" style="font:inherit;min-height:38px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"><option value="">All cities</option>${cityOpts}</select></label><label style="display:flex;flex-direction:column;font-size:12px;flex:1 1 220px">Search<input type="search" name="q" value="${esc(q)}" placeholder="Company, contact, street or industry" style="font:inherit;min-height:38px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><button class="btn primary">Filter</button>${city || q ? `<a class="btn" href="/customers?view=prospects">Clear</a>` : ''}<a class="btn" href="${esc(showHidden ? '/customers?view=prospects' : '/customers?view=prospects&hidden=1')}" style="margin-left:auto">${showHidden ? 'Back to Prospects' : `Not a Fit (${hidden.length})`}</a></form>`;
  const LIMIT = 300; let shownN = 0;
  const groups = cityOrder.map((cName) => {
    const rows = byCity[cName].filter(() => shownN++ < LIMIT);
    if (!rows.length) return '';
    return `<tbody><tr><th scope="rowgroup" colspan="4" class="cgrp"><div><span style="font-weight:700">${esc(cName)}</span><span>${byCity[cName].length} prospect${byCity[cName].length === 1 ? '' : 's'}</span></div></th></tr>${rows.map((p) => `<tr><td style="padding:10px 20px;border-bottom:1px solid #eef1f5"><a href="/customers/imported/${p.id}" style="font-weight:600;color:var(--ink)">${esc(p.n)}</a><div style="font-size:12px;color:var(--mute)">${esc([p.ct, p.in].filter(Boolean).join(' · ') || 'No contact on file')}</div></td><td style="padding:10px 12px;border-bottom:1px solid #eef1f5;font-size:13px">${esc(p.a || 'No street address')}<div style="font-size:12px;color:var(--mute)">${esc([p.city, p.st, p.z].filter(Boolean).join(', '))}</div></td><td style="padding:10px 12px;border-bottom:1px solid #eef1f5;font-size:13px">${p.ph ? `<a href="tel:${esc(String(p.ph).replace(/[^\d+]/g, ''))}">${esc(p.ph)}</a>` : '<span style="color:var(--mute)">No phone</span>'}<div style="font-size:12px;color:var(--mute)">${p.d && p.d > '1901' ? 'Added ' + esc(p.d) : ''}</div></td><td style="padding:10px 12px;border-bottom:1px solid #eef1f5"><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${showHidden ? act('hide', p.id, 'unhide', 'Move Back', false) : `${inRoute.has(p.id) ? act('route', p.id, 'remove', 'On Route ✓', false) : act('route', p.id, 'add', 'Add to Route', true)}${act('hide', p.id, 'hide', 'Not a Fit', false)}`}</div></td></tr>`).join('')}</tbody>`;
  }).join('');
  const table = `<section class="cpanel" aria-label="Prospects by city" style="padding:0"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px;min-width:760px"><thead><tr style="text-align:left;color:var(--mute);font-size:12px"><th scope="col" style="padding:10px 20px;border-bottom:1px solid #e3e7ee">Prospect</th><th scope="col" style="padding:10px 12px;border-bottom:1px solid #e3e7ee">Address</th><th scope="col" style="padding:10px 12px;border-bottom:1px solid #e3e7ee">Phone</th><th scope="col" style="padding:10px 12px;border-bottom:1px solid #e3e7ee;text-align:right">Plan</th></tr></thead>${groups || '<tbody><tr><td colspan="4" style="padding:16px 20px;color:var(--mute)">No prospects match.</td></tr></tbody>'}</table></div>${shown.length > LIMIT ? `<p style="margin:0;padding:10px 20px;font-size:12px;color:var(--mute)">Showing the first ${LIMIT} of ${shown.length}. Pick a city or search to narrow it.</p>` : ''}</section>`;
  const mkt = market.cities.filter((r) => r.city !== 'No City').slice(0, 15);
  const market2 = `<section class="cpanel" aria-label="Market penetration"><h2>Market Penetration by City</h2><p style="margin:0 0 10px;font-size:13px;color:var(--mute)">From your own CoreBridge accounts and order history. Comparing against every business in each area needs business listings (Google Maps key), which is on the setup list.</p><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:620px"><thead><tr style="text-align:left;color:var(--mute);font-size:12px"><th scope="col" style="padding:6px 8px">City</th><th scope="col" style="padding:6px 8px;text-align:right">Active</th><th scope="col" style="padding:6px 8px;text-align:right">Past · Win-back</th><th scope="col" style="padding:6px 8px;text-align:right">Never ordered</th><th scope="col" style="padding:6px 8px;text-align:right">Prospects</th><th scope="col" style="padding:6px 8px;width:30%">Active share</th></tr></thead><tbody>${mkt.map((r) => `<tr><td style="padding:6px 8px;border-top:1px solid #eef1f5"><a href="/customers?view=prospects&city=${encodeURIComponent(r.city)}">${esc(r.city)}</a></td><td style="padding:6px 8px;border-top:1px solid #eef1f5;text-align:right">${r.active}</td><td style="padding:6px 8px;border-top:1px solid #eef1f5;text-align:right">${r.past}</td><td style="padding:6px 8px;border-top:1px solid #eef1f5;text-align:right">${r.never}</td><td style="padding:6px 8px;border-top:1px solid #eef1f5;text-align:right">${r.prospects}</td><td style="padding:6px 8px;border-top:1px solid #eef1f5"><div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:8px;background:#eef1f5;border-radius:4px;overflow:hidden"><div style="width:${pct(r.active, r.total)}%;height:100%;background:#1f6a43"></div></div><span style="font-size:12px;width:34px;text-align:right">${pct(r.active, r.total)}%</span></div></td></tr>`).join('')}</tbody></table></div><p style="margin:8px 0 0;font-size:12px;color:var(--mute)">Updated ${esc(new Date(market.at).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}. Orders are still importing, so Active and Past will grow.</p></section>`;
  return `${viewToggle('prospects')}${flash ? `<div class="note" style="margin:0 0 12px">${esc(flash)}</div>` : ''}${tiles}${routeHtml}${filters}${table}${market2}`;
}

// Reads every imported customer and order index item, then saves the summary. Injectable send for tests.
let D;
export async function marketJob({ getConfig, putConfig, today, send, table = process.env.TABLE, loc = 'nky', maxAgeMs = 6 * 3600e3, now = Date.now() }) {
  const cur = await getConfig('market-summary', null).catch(() => null);
  if (cur && cur.at && now - Date.parse(cur.at) < maxAgeMs) return cur;
  if (!send) { if (!D) { const m = await import('@aws-sdk/client-dynamodb'); D = { m, c: new m.DynamoDBClient({}) }; } send = (input) => D.c.send(new D.m.QueryCommand(input)); }
  const all = async (prefix, proj) => { const out = []; let start; do { const r = await send({ TableName: table, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)', ExpressionAttributeValues: { ':pk': { S: `LOC#${loc}` }, ':sk': { S: prefix } }, ...(proj ? { ProjectionExpression: proj } : {}), ExclusiveStartKey: start }); out.push(...(r.Items || [])); start = r.LastEvaluatedKey; } while (start); return out; };
  const orders = {};
  for (const it of await all('CO#', 'sk')) { const m = /^CO#(\d+)#(\d{4}-\d{2}-\d{2})#/.exec(it.sk.S); if (!m) continue; const o = (orders[m[1]] = orders[m[1]] || { last: '', n: 0 }); o.n++; if (m[2] > o.last) o.last = m[2]; }
  const customers = []; for (const it of await all('CB#customers#')) { try { customers.push(JSON.parse(it.data.S)); } catch { /* skip */ } }
  const sum = buildMarket(customers, orders, today);
  await putConfig('market-summary', sum);
  return sum;
}
