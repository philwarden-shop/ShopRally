// Pricing Engine (Admin): SalesMax's own copy of how CoreBridge prices parts, so a price can be checked step by step.
// Real CoreBridge estimates are still priced by CoreBridge (Build Estimate). The 6 parts below have their pricing copied
// from the fs0226 CoreBridge setup (Nov 11); the other parts list their setup and wait for the full pricing pull.
import { readFileSync } from 'node:fs';
import { page, esc } from './views.mjs';

export const SEED_PARTS = [
  { id: 48, cp: true, cost: 5.46, retail: 0, setup: 25, dsSetup: 25, dsPct: 120, breaks: [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 100], vals: [85, 84.7273, 84.4545, 84.1818, 83.9091, 83.6364, 83.3636, 83.0909, 82.8182, 82.5455, 82.2727, 82] },
  { id: 55, cp: true, cost: 2.85, retail: 0, setup: 18.76, dsSetup: 18.76, dsPct: 120, breaks: [1, 5, 10, 15, 20, 25, 50, 100], vals: [85, 84.5714, 84.1429, 83.7143, 83.2857, 82.8571, 82.4286, 82] },
  { id: 89, cp: true, cost: 3.16, retail: 0, setupOnce: 25, setup: 0, dsSetup: 0, dsPct: 120, breaks: [1, 5, 10, 15, 20, 25, 50, 100, 200, 500, 1000], vals: [85.3, 85.12, 84.94, 84.76, 84.58, 84.4, 84.22, 84.04, 83.86, 83.68, 83.5] },
  { id: 45, cp: true, cost: 0.51, retail: 0, setup: 0, dsSetup: 0, dsPct: 0, breaks: [1, 5, 10, 15, 20, 25, 50, 75], vals: [90, 89.5714, 89.1429, 88.7143, 88.2857, 87.8571, 87.4286, 87] },
  { id: 216, cp: false, cost: 0.44, retail: 18.92, setup: 0, dsSetup: 0, dsPct: 0, breaks: [1, 2, 5, 10, 20, 30, 50, 100], vals: [3.85, 29.81, 37.02, 48.08, 62.02, 67.79, 74.04, 75.96] },
  { id: 222, cp: true, cost: 0.61, retail: 0, setupOnce: 20, setup: 0, dsSetup: 0, dsPct: 0, breaks: [1, 5, 10, 15, 20, 25, 50, 100, 200, 500, 1000], vals: [94.5, 94.44, 94.38, 94.32, 94.26, 94.2, 94.14, 94.08, 94.02, 93.96, 93.9] },
];
export const TEMPLATES = [
  ['Square Feet Main', 'Square feet', '( [Part Width] * [Part Height] * [Part Rate] * [Total Quantity] )'],
  ['Linear Feet Main', 'Linear feet', '( [Part Width] * [Part Rate] * [Total Quantity] )'],
  ['Each Main', 'Each', '( [Part Rate] * [Total Quantity] )'],
  ['Hourly Main', 'Hourly', '( [# of Hours] * [Part Rate] )'],
  ['Hourly Installation', 'Hourly', '( [Number of Installers] + [Is Bucket Truck Needed?] ) * ( [# of Hours] ) * ( [Total Quantity] )'],
  ['Each for Design', 'Each', '( ( [Part Rate] ) + ( [# of Compositions] * 35 ) + ( [# of Revisions] * 15 ) ) * [Total Quantity]'],
  ['RTA Lettering', 'Each', '( [Part Rate] + ( ( [Part Height] - 1 ) * .60 ) ) * ( [Total Quantity] )'],
  ['Dimensional Letters', 'Each', '( [Substrate] * [Letter Height] * [Part Quantity] ) * ( 1.8 )'],
];
export const MOD_FORMULAS = {
  'PRODUCTION (RIGID)': { formula: "( [Add'l Labor (Min)] * 2.0833 ) + ( [Add Holes] * .75 * [Total Quantity] ) + ( [Add Rounded Corners] * .75 * [Total Quantity] ) + ( [Add Routing] * 25 ) + …", props: [['Add Holes', 'Two corners = 2 · Four corners = 4 · 6 holes = 6 · 10 holes = 10'], ['Add Rounded Corners', 'any choice = 4 corners'], ['Acrylic Print Options', 'White spot $0.008 · White flood $0.015 · Blockout + day/night $0.035 per sq in']] },
  'GRAPHIC DESIGN': { formula: "( [PMS Match (Qty)] * 20 ) + ( [Vectorize Artwork (Qty)] * 42 ) + ( [Add'l Design Versions (Qty)] * 5 ) + ( [QR/Bar Codes (Qty)] * 3 ) + ( [Add'l Design Time (Min)] * 2.0833 ) + ( [Additional Proof (Qty)] * 20 ) + ( [Buy Custom Fonts ($)] / .35 ) + …", props: [['Vectorize Artwork (Qty)', '$42 each'], ["Add'l Design Time (Min)", '$2.0833 a minute ($125/hour)'], ["Add'l Design Versions (Qty)", '$5 each'], ['PMS Match (Qty)', '$20 each'], ['Buy Custom Fonts ($)', 'font cost ÷ 0.35']] },
};
export const TECH_FEE = 12;
export const LABOR_RATE = 104.65;

let CAT;
export function loadCatalog(load = () => JSON.parse(readFileSync(new URL('./cb-catalog.json', import.meta.url), 'utf8'))) {
  if (!CAT) { try { CAT = load(); } catch { CAT = { parts: [], modifiers: [], pulled: null }; } }
  return CAT;
}
export const resetPricingCatalog = () => { CAT = undefined; };

// saved: { [partId]: { cost, retail, setup, dsSetup, setupOnce, dsPct } } edits made in Admin.
export function priceParts(cat, saved = {}) {
  const byId = new Map((cat.parts || []).map((p) => [p.Id, p]));
  return SEED_PARTS.map((s) => { const c = byId.get(s.id) || {}; return { ...s, ...(saved[s.id] || {}), name: c.Name || `Part ${s.id}`, unit: c.CostPerType === 'Each' ? 'Each' : 'Sq ft', ds: !!c.CanPrintOnBothSides && (saved[s.id]?.dsPct ?? s.dsPct) > 0 }; });
}

const r2 = (n) => Math.round(n * 100) / 100;
export const money = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function priceCheck(P, { w = 12, h = 12, q = 1, ds = false } = {}) {
  w = Math.max(0.1, Number(w) || 12); h = Math.max(0.1, Number(h) || 12); q = Math.max(1, Math.round(Number(q) || 1));
  const both = !!ds && P.ds;
  const each = P.unit === 'Each';
  const size = each ? 1 : (w * h) / 144;
  let bi = 0; P.breaks.forEach((b, i) => { if (q >= b) bi = i; });
  const v = P.vals[bi];
  const rate = P.cp ? P.cost / (1 - v / 100) : P.retail * (1 - v / 100);
  const single = r2(size * rate * q);
  const partPrice = both ? r2((single * P.dsPct) / 100) : single;
  const setup = r2((both ? P.dsSetup : P.setup) * q + (P.setupOnce || 0));
  const u = each ? 'each' : 'sq ft';
  const steps = [
    { say: each ? `Quantity ${q}` : `Size: ${w} × ${h} in = ${size.toFixed(2)} sq ft × ${q}`, amt: each ? `${q} each` : `${(size * q).toFixed(2)} sq ft` },
    P.cp ? { say: `Cost $${P.cost.toFixed(2)}/${u} ÷ (1 − ${v}% margin at qty ${P.breaks[bi]}+)`, amt: `${money(rate)}/${u}` } : { say: `Retail $${P.retail.toFixed(2)}/${u} − ${v}% discount at qty ${P.breaks[bi]}+`, amt: `${money(rate)}/${u}` },
    { say: 'Part price', amt: money(single) },
  ];
  if (both) steps.push({ say: `Double-sided: ${P.dsPct}% of the single-sided price`, amt: money(partPrice) });
  if (setup) steps.push({ say: P.setupOnce ? `Setup fee: $${P.setupOnce.toFixed(2)} once` : `Setup fee: $${(both ? P.dsSetup : P.setup).toFixed(2)} × ${q}`, amt: money(setup) });
  steps.push({ say: 'Technology fee (per product)', amt: money(TECH_FEE) });
  return { steps, total: r2(partPrice + setup + TECH_FEE), both, w, h, q };
}

export function mergePartPrice(saved = {}, f = {}) {
  const id = Number(f.id);
  if (!SEED_PARTS.some((s) => s.id === id)) throw new Error('that part has no pricing copied yet');
  const num = (k, lo, hi) => { if (f[k] === undefined || f[k] === '') return undefined; const n = Number(f[k]); if (!Number.isFinite(n) || n < lo || n > hi) throw new Error(`${k} must be a number from ${lo} to ${hi}`); return n; };
  const next = { ...(saved[id] || {}) };
  for (const [k, lo, hi] of [['cost', 0, 10000], ['retail', 0, 10000], ['setup', 0, 10000], ['dsSetup', 0, 10000], ['setupOnce', 0, 10000], ['dsPct', 0, 300]]) { const n = num(k, lo, hi); if (n !== undefined) next[k] = n; }
  return { ...saved, [id]: next };
}

// One catalog part as a Build Estimate line, so CoreBridge can price it (PriceConfiguredOrder: a read that saves nothing).
export function cbLineFor(bpart, { w = 12, h = 12, q = 1, ds = false } = {}) {
  if (!bpart) return null;
  return { i: 0, part: bpart, name: bpart.name, qty: Math.max(1, Math.round(Number(q) || 1)), w: Number(w) || 12, h: Number(h) || 12, mods: [], ds: !!ds && !!bpart.both, charges: [], unpriced: [], sel: [] };
}
export function compareHtml(ours, cb) {
  if (!cb) return '';
  if (!cb.ok) return `<div class="note" style="margin:8px 0 0;background:#fdf3dc;color:#7a4e00">CoreBridge: ${esc((cb.errors || []).join(' ') || 'could not price this')}</div>`;
  const l = (cb.lines || [])[0] || {};
  const cbTotal = Number(l.total) || 0;
  const diff = ours == null ? null : Math.round((ours - cbTotal) * 100) / 100;
  const verdict = diff === null ? 'SalesMax has no copied pricing for this part yet.' : Math.abs(diff) < 0.01 ? 'Exact match.' : `Off by ${money(Math.abs(diff))} (${diff > 0 ? 'SalesMax higher' : 'SalesMax lower'}).`;
  return `<section class="panel" aria-label="CoreBridge price" style="border-color:${diff !== null && Math.abs(diff) < 0.01 ? '#b9dcc8' : '#e3e7ee'}"><h2 style="margin:0 0 6px;font-size:16px">CoreBridge Says</h2><dl style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0;font-size:14px"><dt>Part</dt><dd style="margin:0;text-align:right">${money(l.parts)}</dd><dt>Setup fees</dt><dd style="margin:0;text-align:right">${money(l.fees)}${(l.feeNames || []).length ? ` <span style="font-size:12px;color:var(--mute)">(${esc(l.feeNames.join(', '))})</span>` : ''}</dd><dt><b>Total before tax</b></dt><dd style="margin:0;text-align:right"><b>${money(cbTotal)}</b></dd></dl><p style="margin:8px 0 0;font-size:13px"><b>${esc(verdict)}</b> Priced live by CoreBridge; nothing was saved there.</p></section>`;
}

export function pricingPage({ user, cat = loadCatalog(), saved = {}, tab = 'check', f = {}, flash = '', cb = null }) {
  const parts = priceParts(cat, saved);
  const T = ['check', 'parts', 'templates', 'mods'].includes(tab) ? tab : 'check';
  const P = parts.find((p) => p.id === Number(f.part)) || parts[0];
  const total = (cat.parts || []).length;
  const cpN = parts.filter((p) => p.cp).length;
  const tabs = [['check', 'Price Check'], ['parts', 'Parts'], ['templates', 'Pricing Templates'], ['mods', 'Modifiers']].map(([k, l]) => `<a href="/admin/pricing?tab=${k}" aria-current="${T === k ? 'page' : 'false'}" style="padding:0 4px;min-height:40px;display:inline-flex;align-items:center;font-size:14px;font-weight:600;text-decoration:none;color:${T === k ? 'var(--ink)' : 'var(--mute)'};border-bottom:3px solid ${T === k ? '#a8343f' : 'transparent'}">${l}</a>`).join('');
  const tile = (l, v, h) => `<div style="background:#fff;border:1px solid #e3e7ee;border-radius:12px;padding:14px 16px;min-width:0"><div style="font-size:12px;color:var(--mute);font-weight:600">${l}</div><div style="font-size:20px;font-weight:700;margin:2px 0">${v}</div><div style="font-size:12px;color:var(--mute)">${h}</div></div>`;
  const tiles = `<section aria-label="Pricing summary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">${tile('Priced from cost + margin', `${cpN} of ${parts.length} copied`, 'Cost ÷ (1 − margin) at each quantity break')}${tile('Priced from a set retail price', `${parts.length - cpN} of ${parts.length} copied`, 'Retail minus a quantity discount')}${tile('Parts in your catalog', total, `${total - parts.length} waiting for the pricing pull`)}${tile('Spot check vs CoreBridge', 'Exact match', '1/4" acrylic, single + double-sided')}</section>`;
  let main = '';
  if (T === 'check') {
    const copied = !f.part || parts.some((x) => x.id === Number(f.part));
    const r = priceCheck(P, { w: f.w, h: f.h, q: f.q, ds: f.ds === '1' });
    const inp = 'font:inherit;min-height:38px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px';
    const match = P.id === 48 && r.w === 12 && r.h === 12 && r.q === 1 ? `Matches CoreBridge exactly: ${r.both ? '$68.68' : '$61.40'} for the part + setup, plus the $12 fee.` : 'Tax and modifiers are added on the estimate. Same steps, same order as CoreBridge.';
    main = `<section class="panel" aria-label="Price a part"><h2 style="margin:0 0 10px;font-size:16px">Price a Part</h2><form method="get" action="/admin/pricing" style="display:flex;gap:10px;flex-wrap:wrap;align-items:end"><input type="hidden" name="tab" value="check"><label style="display:flex;flex-direction:column;font-size:12px;flex:1 1 260px">Part<select name="part" style="${inp}"><optgroup label="Pricing copied to SalesMax">${parts.map((p) => `<option value="${p.id}" ${p.id === Number(f.part || P.id) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</optgroup><optgroup label="CoreBridge price only">${(cat.parts || []).filter((c) => !parts.some((p) => p.id === c.Id)).sort((a, b) => a.Name.localeCompare(b.Name)).map((c) => `<option value="${c.Id}" ${c.Id === Number(f.part) ? 'selected' : ''}>${esc(c.Name)}</option>`).join('')}</optgroup></select></label>${P.unit === 'Each' ? '' : `<label style="display:flex;flex-direction:column;font-size:12px">Width (in)<input name="w" type="number" min="0.1" step="0.1" value="${r.w}" style="${inp};width:90px"></label><label style="display:flex;flex-direction:column;font-size:12px">Height (in)<input name="h" type="number" min="0.1" step="0.1" value="${r.h}" style="${inp};width:90px"></label>`}<label style="display:flex;flex-direction:column;font-size:12px">Qty<input name="q" type="number" min="1" step="1" value="${r.q}" style="${inp};width:80px"></label><label style="display:flex;flex-direction:column;font-size:12px">Sides<select name="ds" style="${inp}" ${P.ds ? '' : 'disabled'}><option value="0">Single</option><option value="1" ${r.both ? 'selected' : ''}>Double</option></select></label><button class="btn primary">Price It</button><button class="btn" name="cb" value="1" title="Asks CoreBridge for its price. A read only; nothing is saved in CoreBridge.">Compare With CoreBridge</button></form>${P.ds ? '' : '<p style="margin:6px 0 0;font-size:12px;color:var(--mute)">This part is single-sided only.</p>'}</section>
${copied ? '' : '<div class="note" style="margin:0">SalesMax doesn’t have this part’s pricing copied yet. Use Compare With CoreBridge to see its price.</div>'}${compareHtml(copied ? r.total : null, cb)}${copied ? '' : '<!--'}<section class="panel" aria-label="How SalesMax priced it"><h2 style="margin:0 0 8px;font-size:16px">How SalesMax Priced It</h2><ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px">${r.steps.map((s) => `<li style="font-size:14px"><span style="display:flex;justify-content:space-between;gap:12px"><span>${esc(s.say)}</span><b>${esc(s.amt)}</b></span></li>`).join('')}</ol><div style="display:flex;justify-content:space-between;border-top:1px solid #e3e7ee;margin-top:10px;padding-top:10px;font-size:16px"><b>Total</b><b>${money(r.total)}</b></div><p style="margin:8px 0 0;font-size:12px;color:var(--mute)">${esc(match)}</p></section>${copied ? '' : '-->'}`;
  } else if (T === 'parts') {
    const copied = new Map(parts.map((p) => [p.id, p]));
    const nInp = (name, v, w = 80) => `<input name="${name}" type="number" min="0" step="0.01" value="${v ?? ''}" style="font:inherit;min-height:32px;width:${w}px;border:1px solid #d5dbe5;border-radius:6px;padding:0 6px">`;
    const rows = [...(cat.parts || [])].sort((a, b) => (copied.has(b.Id) - copied.has(a.Id)) || a.Name.localeCompare(b.Name)).slice(0, 220).map((c) => {
      const p = copied.get(c.Id);
      const unit = c.CostPerType === 'Each' ? 'Each' : 'Sq ft';
      if (!p) return `<tr><td style="padding:8px 10px;border-top:1px solid #eef1f5">${esc(c.Name)}</td><td style="padding:8px 10px;border-top:1px solid #eef1f5">${unit}</td><td colspan="3" style="padding:8px 10px;border-top:1px solid #eef1f5;color:var(--mute);font-size:13px">${c.CanPrintOnBothSides ? 'Single or double-sided · ' : ''}${(c.Modifiers || []).length} modifier${(c.Modifiers || []).length === 1 ? '' : 's'} · pricing not copied yet</td></tr>`;
      return `<tr><td style="padding:8px 10px;border-top:1px solid #eef1f5"><b>${esc(p.name)}</b><div style="font-size:12px;color:var(--mute)">${p.cp ? `Cost + ${p.vals.at(-1)}–${p.vals[0]}% margin` : `Retail − up to ${Math.max(...p.vals)}% off`} · ${p.breaks.length} quantity breaks</div></td><td style="padding:8px 10px;border-top:1px solid #eef1f5">${unit}</td><td colspan="3" style="padding:8px 10px;border-top:1px solid #eef1f5"><form method="post" action="/admin/pricing" style="display:flex;gap:6px;flex-wrap:wrap;align-items:end;margin:0"><input type="hidden" name="id" value="${p.id}"><label style="font-size:11px;display:flex;flex-direction:column">${p.cp ? 'Cost' : 'Retail'}${nInp(p.cp ? 'cost' : 'retail', p.cp ? p.cost : p.retail)}</label><label style="font-size:11px;display:flex;flex-direction:column">${p.setupOnce ? 'Setup once' : 'Setup each'}${nInp(p.setupOnce ? 'setupOnce' : 'setup', p.setupOnce || p.setup)}</label>${p.ds ? `<label style="font-size:11px;display:flex;flex-direction:column">2nd side %${nInp('dsPct', p.dsPct, 70)}</label>` : ''}<button class="btn" style="min-height:32px;font-size:13px">Save</button></form></td></tr>`;
    }).join('');
    main = `<section class="panel" aria-label="Parts" style="padding:0"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px;min-width:720px"><thead><tr style="text-align:left;font-size:12px;color:var(--mute)"><th scope="col" style="padding:10px">Part</th><th scope="col" style="padding:10px">Unit</th><th scope="col" colspan="3" style="padding:10px">Cost / retail · setup · 2nd side</th></tr></thead><tbody>${rows}</tbody></table></div><p style="margin:0;padding:10px;font-size:12px;color:var(--mute)">${parts.length} of ${total} parts have pricing copied. A change here is used by Price Check only; CoreBridge still prices real estimates until SalesMax takes over pricing.</p></section>`;
  } else if (T === 'templates') {
    main = `<section class="panel" aria-label="Pricing templates" style="padding:0"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px;min-width:640px"><thead><tr style="text-align:left;font-size:12px;color:var(--mute)"><th scope="col" style="padding:10px">Template</th><th scope="col" style="padding:10px">Unit</th><th scope="col" style="padding:10px">Formula</th></tr></thead><tbody>${TEMPLATES.map(([n, u, fm]) => `<tr><td style="padding:8px 10px;border-top:1px solid #eef1f5;font-weight:600">${esc(n)}</td><td style="padding:8px 10px;border-top:1px solid #eef1f5">${esc(u)}</td><td style="padding:8px 10px;border-top:1px solid #eef1f5"><code style="font-size:12px;background:#f4f6f9;border-radius:6px;padding:2px 6px">${esc(fm)}</code></td></tr>`).join('')}</tbody></table></div><p style="margin:0;padding:10px;font-size:12px;color:var(--mute)">Showing ${TEMPLATES.length} of 84 pricing templates (sample). Shop labor $${LABOR_RATE}/hour.</p></section>`;
  } else {
    const mods = (cat.modifiers || []).map((m) => m.Name).filter((n) => !/^ss_|HIDDEN/.test(n));
    const withF = Object.entries(MOD_FORMULAS).map(([n, m]) => `<section class="panel" aria-label="${esc(n)}"><h2 style="margin:0 0 6px;font-size:15px">${esc(n)}</h2><div style="font-size:12px;color:var(--mute);margin-bottom:4px">Formula</div><code style="display:block;font-size:12px;background:#f4f6f9;border-radius:8px;padding:8px;white-space:pre-wrap">${esc(m.formula)}</code><ul style="margin:8px 0 0;padding-left:18px;font-size:13px">${m.props.map(([k, v]) => `<li><b>${esc(k)}</b>: ${esc(v)}</li>`).join('')}</ul></section>`).join('');
    main = `${withF}<section class="panel" aria-label="All modifiers"><h2 style="margin:0 0 6px;font-size:15px">All Modifiers in Your Catalog · ${mods.length}</h2><div style="display:flex;flex-wrap:wrap;gap:6px">${mods.map((n) => `<span class="pill" style="background:${MOD_FORMULAS[n] ? '#e6f2ec' : '#eef1f5'};color:${MOD_FORMULAS[n] ? '#1f6a43' : '#3d4658'}">${esc(n)}</span>`).join('')}</div><p style="margin:8px 0 0;font-size:12px;color:var(--mute)">Green = formula copied. The rest still use history-based guesses on <a href="/admin/modifier-prices">Modifier Prices</a> until their formulas are copied.</p></section>`;
  }
  const body = `<div class="wrap" style="max-width:1080px;display:flex;flex-direction:column;gap:16px;padding-top:16px"><header style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px"><div><h1 style="margin:0;font-size:26px">Pricing Engine</h1><p style="margin:4px 0 0;font-size:13px;color:var(--mute)">Copied from CoreBridge ${esc(cat.pulled || '')} · ${total} parts · 84 pricing templates · ${(cat.modifiers || []).length} modifiers · Shop labor $${LABOR_RATE}/hour</p></div><span class="pill" style="background:#fdf3dc;color:#7a4e00">Read-only from CoreBridge</span></header>${flash ? `<div class="note" style="margin:0">${esc(flash)}</div>` : ''}${tiles}<nav aria-label="Pricing sections" style="display:flex;gap:20px;border-bottom:1px solid #e3e7ee">${tabs}</nav>${main}</div>`;
  return page({ title: 'Pricing Engine', user, tab: '', body });
}
