// Build Estimate: pick catalog parts, sizes and modifiers; CoreBridge prices it live (PriceConfiguredOrder, saves nothing).
// Learned in the Nov 10 tests: modifiers must belong to the part; sizes are inches; CoreBridge adds setup fees
// (e.g. Technology Fees $12) and tax; an estimate also needs a Source (OrderOriginationId).
// This is the screen the AI Estimator will fill in for the salesperson later.
import { readFileSync } from 'node:fs';
import { page, esc } from './views.mjs';
import { SOURCE_OPTIONS } from './origination.mjs';
import { chargePart } from './modprices.mjs';
import { readSelections, modifiersHtml, pricedHere } from './modui.mjs';

export const MAX_LINES = 10;
export const TEST_ACCOUNT = { accountId: 8211, contactId: 20251, salespersonId: 15, salesCenterId: 2, name: 'FASTSIGNS 226 (test account)' };

let CATALOG;
// Parts and modifiers CoreBridge marks "ready" for configured estimates. Bundled from the Nov 10 pull; refreshed by sync.
export function catalog(load = () => JSON.parse(readFileSync(new URL('./cb-catalog.json', import.meta.url), 'utf8'))) {
  if (!CATALOG) {
    try {
      const raw = load();
      const mods = new Map((raw.modifiers || []).map((m) => [m.Id, m]));
      const parts = (raw.parts || []).filter((p) => p.ConfiguredOrderReady !== false).map((p) => ({
        id: p.Id, name: p.Name, per: p.CostPerType, q: !!p.UsesQuantity, w: !!p.UsesWidth, h: !!p.UsesHeight, notes: !!p.UsesNotes, both: !!p.CanPrintOnBothSides,
        group: String(p.Name).split(' - ')[0].replace(/\s*\(.*$/, '').trim() || 'Other',
        mods: (p.Modifiers || []).map((m) => ({ id: m.Id, name: m.Name, options: (mods.get(m.Id)?.VariableRateOptions || []).map((o) => ({ id: o.Ordinal, label: o.Label })) })),
      })).sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
      CATALOG = { parts, byId: new Map(parts.map((p) => [p.id, p])), pulled: raw.pulled || null };
    } catch {
      CATALOG = { parts: [], byId: new Map(), pulled: null };
    }
  }
  return CATALOG;
}
export const resetCatalog = () => { CATALOG = undefined; };

// Read the posted form into lines. Field names: p0 part, n0 name, q0 qty, w0/h0 inches, m0_<modifierId> on, v0_<modifierId> option.
export function readLines(form = {}, cat = catalog()) {
  const count = Math.min(MAX_LINES, Math.max(1, Number(form.lines) || 3));
  const lines = [];
  for (let i = 0; i < count; i++) {
    const part = cat.byId.get(Number(form[`p${i}`])) || null;
    const mods = part ? part.mods.filter((m) => !pricedHere(m.name) && form[`m${i}_${m.id}`]).map((m) => ({ id: m.id, option: form[`v${i}_${m.id}`] !== undefined && form[`v${i}_${m.id}`] !== '' ? Number(form[`v${i}_${m.id}`]) : null })) : [];
    lines.push({ i, part, name: String(form[`n${i}`] || '').slice(0, 120), qty: Number(form[`q${i}`]) || 1, w: Number(form[`w${i}`]) || 0, h: Number(form[`h${i}`]) || 0, mods, ds: form[`s${i}`] === 'DS', charges: [], unpriced: [], sel: part ? readSelections(form, i, part) : [] });
  }
  return lines;
}

// Problems a salesperson must fix before pricing. Pure, so it can be tested.
export function checkLine(l) {
  const out = [];
  if (!l.part) return out;
  if (!(l.qty >= 1) || l.qty !== Math.round(l.qty)) out.push('Quantity must be a whole number, 1 or more.');
  if (l.part.w && !(l.w > 0)) out.push('Enter a width in inches.');
  if (l.part.h && !(l.h > 0)) out.push('Enter a height in inches.');
  if (l.ds && !l.part.both) out.push('CoreBridge says this part can\'t print on both sides. Pick its double-sided version, or switch to SS.');
  for (const m of l.mods) {
    const def = l.part.mods.find((x) => x.id === m.id);
    if (!def) out.push(`Modifier ${m.id} does not belong to this part.`);
    else if (def.options.length && m.option === null) out.push(`Pick an option for ${def.name}.`);
  }
  return out;
}

// The request CoreBridge prices (and later creates, with IsEstimate). Sizes in inches.
export function buildConfiguredRequest({ lines, account = TEST_ACCOUNT, taxGroupId = 11, originationId = null, description = '', create = false }) {
  const products = lines.filter((l) => l.part).map((l) => ({
    Name: (l.name || l.part.name).slice(0, 120),
    Quantity: Math.max(1, Math.round(l.qty)),
    Parts: [{
      PartId: l.part.id, ...(l.part.q ? { Quantity: 1 } : {}), // some pricing templates refuse a part quantity (Nov 10)
      ...(l.part.w ? { Width: l.w } : {}), ...(l.part.h ? { Height: l.h } : {}),
      ...(l.mods.length ? { Modifiers: l.mods.map((m) => (m.option === null ? { ModifierId: m.id } : { ModifierId: m.id, VariableRateOptionId: m.option })) } : {}),
      ...(l.ds && l.part.both ? { PrintOnBothSides: true } : {}), // CoreBridge applies the part's own second-side charge (Nov 10 test)
    }, ...(l.charges || []).map((c) => chargePart(c))], // modifier charges priced by SalesMax (Admin > Modifier Price List)
  }));
  const base = { AccountId: account.accountId, SalesCenterId: account.salesCenterId, TaxGroupId: taxGroupId, Products: products };
  if (!create) return base;
  return { ...base, IsEstimate: true, ContactId: account.contactId, SalespersonId: account.salespersonId, OrderOriginationId: originationId, Description: description.slice(0, 255) };
}

// CoreBridge price reply -> what the page shows.
export function readPrice(reply = {}) {
  if (reply.IsSuccess !== true) return { ok: false, errors: reply.Errors?.length ? reply.Errors : [reply.Message || 'CoreBridge could not price this.'] };
  return {
    ok: true,
    lines: (reply.Products || []).map((p) => ({ name: p.Name, qty: p.Quantity, parts: p.PartsTotal, fees: p.SetupFeeTotal, total: p.Total, feeNames: (p.SetupFees || []).filter((f) => f.Amount > 0).map((f) => `${f.Name} $${f.Amount.toFixed(2)}`) })),
    subtotal: reply.SubTotalPrice, tax: reply.TaxesPrice, total: reply.OrderTotal, warnings: reply.Warnings || [],
  };
}

const money = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const SEL = 'font:inherit;min-height:38px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px;background:#fff;max-width:100%';

function lineRow(l, cat) {
  const groups = [...new Set(cat.parts.map((p) => p.group))];
  const opts = groups.map((g) => `<optgroup label="${esc(g)}">${cat.parts.filter((p) => p.group === g).map((p) => `<option value="${p.id}"${l.part && l.part.id === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</optgroup>`).join('');
  const p = l.part;
  const problems = checkLine(l);
  const simple = p ? p.mods.filter((m) => !pricedHere(m.name)) : [];
  const mods = simple.length ? `<div style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px;font-size:13px">${simple.map((m) => {
    const on = l.mods.find((x) => x.id === m.id);
    const pick = m.options.length ? ` <select name="v${l.i}_${m.id}" aria-label="${esc(m.name)} option" style="${SEL};min-height:30px"><option value="">Choose…</option>${m.options.map((o) => `<option value="${o.id}"${on && on.option === o.id ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>` : '';
    return `<label style="display:inline-flex;align-items:center;gap:6px"><input type="checkbox" name="m${l.i}_${m.id}" value="1"${on ? ' checked' : ''} style="width:18px;height:18px;accent-color:#a8343f">${esc(m.name)}${pick}</label>`;
  }).join('')}</div>` : '';
  return `<fieldset style="border:1px solid #e3e7ee;border-radius:10px;padding:12px 14px;margin:0 0 10px">
    <legend style="font-size:12px;font-weight:700;color:#5a6478;padding:0 4px">Item ${l.i + 1}</legend>
    <div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,2fr) 80px 90px 90px 90px;gap:10px;align-items:end">
      <label style="font-size:12px;font-weight:600">Part<br><select name="p${l.i}" style="${SEL};width:100%"><option value="">Pick a part…</option>${opts}</select></label>
      <label style="font-size:12px;font-weight:600">Name on estimate<br><input name="n${l.i}" value="${esc(l.name)}" placeholder="${esc(p ? p.name : 'e.g. Front window decal')}" style="${SEL};width:100%;box-sizing:border-box"></label>
      <label style="font-size:12px;font-weight:600">Qty<br><input name="q${l.i}" type="number" min="1" step="1" value="${l.qty}" style="${SEL};width:100%;box-sizing:border-box"></label>
      <label style="font-size:12px;font-weight:600">Width (in)<br><input name="w${l.i}" type="number" min="0" step="0.25" value="${l.w || ''}"${p && !p.w ? ' disabled' : ''} style="${SEL};width:100%;box-sizing:border-box"></label>
      <label style="font-size:12px;font-weight:600">Height (in)<br><input name="h${l.i}" type="number" min="0" step="0.25" value="${l.h || ''}"${p && !p.h ? ' disabled' : ''} style="${SEL};width:100%;box-sizing:border-box"></label>
      <label style="font-size:12px;font-weight:600" title="${p && !p.both ? 'CoreBridge says this part prints on one side only' : 'Double-sided uses the part\'s own second-side charge in CoreBridge'}">Sides<br><select name="s${l.i}" style="${SEL};width:100%"${p && !p.both ? ' disabled' : ''}><option value="SS">SS</option><option value="DS"${l.ds ? ' selected' : ''}>DS</option></select></label>
    </div>
    ${p ? `<div style="font-size:12px;color:#5a6478;margin-top:6px">Priced per ${esc(String(p.per || 'each').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase())}${p.mods.length ? ' · options below are the ones CoreBridge allows on this part' : ''}</div>` : ''}
    ${mods}
    ${modifiersHtml(l)}
    ${(l.charges || []).length ? `<div style="margin-top:8px;font-size:12px;color:#1f6a43">Modifier charges added: ${l.charges.map((c) => esc(`${c.label} $${c.total.toFixed(2)}`)).join(' · ')}</div>` : ''}
    ${(l.unpriced || []).length ? `<div role="status" style="margin-top:6px;font-size:12px;color:#874511">Not priced yet (set in <a href="/admin/modifier-prices">Admin › Modifier Price List</a>): ${l.unpriced.map(esc).join(' · ')}</div>` : ''}
    ${problems.length ? `<div role="alert" style="margin-top:8px;font-size:13px;color:#8f2a34">${problems.map(esc).join(' ')}</div>` : ''}
  </fieldset>`;
}

function draftBox(d) {
  if (!d) return '';
  const li = (x) => `<li>${esc(x)}</li>`;
  const sec = (t, arr) => arr.length ? `<div style="margin-top:8px"><b style="font-size:13px">${esc(t)}</b><ul style="margin:4px 0 0;padding-left:20px;line-height:1.6;font-size:13px">${arr.join('')}</ul></div>` : '';
  return `<div class="panel" style="margin:0 0 14px;background:#f3f7fd;border:1px solid #c9daf2"><h2 style="margin:0 0 4px;font-size:15px">Estimator draft from the site survey</h2>
    <p style="margin:0;font-size:13px;color:var(--mute)">Filled in below. Check each item, then get the live price. Nothing is sent to CoreBridge until you click.</p>
    ${sec('Why each part was picked', d.drafts.filter((x) => x.kind === 'make').map((x) => li(`${x.from}: ${x.why}`)))}
    ${sec('Needs a vendor quote first (RFQ)', d.vendor.map((x) => li(`${x.from} × ${x.qty}: ${x.why}`)))}
    ${sec('A person needs to place these', d.person.map((x) => li(`${x.from} × ${x.qty}: ${x.why}`)))}
    ${sec('To check', d.notes.map(li))}</div>`;
}

export function builderPage({ user, p, lines, price = null, origin = null, flash = '', draft = null, hasSurvey = false }) {
  const cat = catalog();
  const n = lines.length;
  const priceBox = price ? (price.ok ? `<section aria-label="Live price" style="border:1px solid #c9e3d4;background:#f2faf5;border-radius:12px;padding:14px 16px;margin:14px 0">
      <h2 style="margin:0 0 8px;font-size:16px">CoreBridge price</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="text-align:left;color:#5a6478;font-size:12px"><th>Item</th><th>Qty</th><th style="text-align:right">Parts</th><th style="text-align:right">Fees</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${price.lines.map((x) => `<tr><td style="padding:6px 0">${esc(x.name)}${x.feeNames.length ? `<div style="font-size:12px;color:#5a6478">${esc(x.feeNames.join(', '))}</div>` : ''}</td><td>${x.qty}</td><td style="text-align:right">${money(x.parts)}</td><td style="text-align:right">${money(x.fees)}</td><td style="text-align:right;font-weight:600">${money(x.total)}</td></tr>`).join('')}</tbody></table>
      <div style="display:flex;justify-content:flex-end;gap:18px;margin-top:10px;font-size:14px"><span>Subtotal ${money(price.subtotal)}</span><span>Tax ${money(price.tax)}</span><b>Total ${money(price.total)}</b></div>
      <p style="margin:8px 0 0;font-size:12px;color:#5a6478">Priced live by CoreBridge from your parts and modifiers. Nothing was saved in CoreBridge.</p></section>`
    : `<div role="alert" style="background:#fbeaec;color:#8f2a34;border-radius:10px;padding:12px;margin:14px 0">${price.errors.map(esc).join('<br>')}</div>`) : '';
  const src = origin ? `<label style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13px">Source <select name="origination" style="${SEL}">${SOURCE_OPTIONS.map((o) => `<option value="${o.id}"${o.id === origin.id ? ' selected' : ''}>${esc(o.short)}</option>`).join('')}</select><span style="color:var(--mute)">Filled in for you: ${esc(origin.reason)}</span></label>` : '';
  const body = `<div class="wrap"><div class="bar" style="padding:14px 0"><a href="/projects/${esc(p.id)}?mode=demo">← ${esc(p.name)}</a></div>
  ${flash ? `<div class="note">${esc(flash)}</div>` : ''}
  <div class="panel"><h1 style="margin:0 0 4px">Build Estimate</h1>
  <p style="color:var(--mute);margin:0 0 12px">${esc(p.company)} · pick parts, sizes and options; CoreBridge works out the price. ${cat.parts.length} ready parts${cat.pulled ? ` (catalog from ${esc(cat.pulled)})` : ''}.</p>
  ${cat.parts.length ? '' : '<div class="note">The parts catalog is not loaded yet.</div>'}
  ${hasSurvey && !draft ? `<p style="margin:0 0 12px"><a class="btn" href="/projects/${esc(p.id)}/build?draft=1">Draft it from the site survey</a></p>` : ''}
  ${draftBox(draft)}
  <form method="post" action="/projects/${esc(p.id)}/build">
    <input type="hidden" name="lines" value="${n}">
    ${lines.map((l) => lineRow(l, cat)).join('')}
    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:4px 0 12px">
      <button class="btn" name="do" value="update">Update Options</button>
      ${n < MAX_LINES ? `<button class="btn" name="do" value="add">+ Add Item</button>` : ''}
      <button class="btn primary" name="do" value="price">Get Live Price</button>
    </div>
    ${src}
    ${priceBox}
    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px">
      <button class="btn primary" type="button" disabled title="Writes are off in the test copy">Create Estimate in CoreBridge</button>
      <span style="font-size:12px;color:var(--mute)">Test copy: prices on the ${esc(TEST_ACCOUNT.name)}; creating is off. When on, each estimate is created, read back to confirm, and needs a salesperson to click Create.</span>
    </div>
  </form></div></div>`;
  return page({ title: 'Build Estimate', user, tab: 'Projects', mode: 'demo', body });
}
