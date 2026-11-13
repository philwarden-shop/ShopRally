// Modifier fields on the Build estimate screen and in Admin.
// CoreBridge's API returns only modifier *group* names (e.g. PRODUCTION (RIGID)), not the fields inside them.
// The fields and their choices come from this location's order history (CustomProperties on 2024-2026 order lines),
// pulled into mod-fields.json. SalesMax prices the choices itself (Admin > Modifier price list) and sends each
// charge to CoreBridge as a priced line (see modprices.mjs). Groups priced this way are NOT also sent as
// CoreBridge modifiers, so nothing is charged twice.
import { readFileSync } from 'node:fs';
import { esc } from './views.mjs';

// History text is JSON-escaped (\" for inches, \u201d) and some inch marks were cut to a lone trailing backslash.
export const clean = (s) => String(s).replace(/\\u201d/g, '\u201d').replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\$/, '"').trim();
let FIELDS;
export function modFields(load = () => JSON.parse(readFileSync(new URL('./mod-fields.json', import.meta.url), 'utf8'))) {
  if (!FIELDS) {
    try {
      const raw = load();
      const groups = {};
      for (const [g, list] of Object.entries(raw.groups || {})) {
        groups[clean(g)] = list.map((f) => ({ field: clean(f.field), type: f.type, choices: (f.choices || []).map(clean), uses: f.uses || 0 }));
      }
      FIELDS = { groups, pulled: raw.pulled || null };
    } catch { FIELDS = { groups: {}, pulled: null }; }
  }
  return FIELDS;
}
export const resetModFields = () => { FIELDS = undefined; };
export const fieldsFor = (group, mf = modFields()) => mf.groups[clean(group)] || [];
// Groups SalesMax prices itself (has history fields). Others keep CoreBridge's own modifier (with its option list).
export const pricedHere = (group, mf = modFields()) => fieldsFor(group, mf).length > 0;

// Read one item's modifier fields from the form. Field names: x{i}_{modId}_{k}.
export function readSelections(form, i, part, mf = modFields()) {
  const out = [];
  for (const m of part?.mods || []) {
    fieldsFor(m.name, mf).forEach((f, k) => {
      const raw = form[`x${i}_${m.id}_${k}`];
      if (raw === undefined || raw === '') return;
      const value = f.type === 'check' ? raw === '1' || raw === 'on' : String(raw).slice(0, 120);
      if (value === false) return;
      out.push({ group: clean(m.name), field: f.field, value, modId: m.id, k });
    });
  }
  return out;
}

const INP = 'font:inherit;min-height:34px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px;background:#fff;width:100%;box-sizing:border-box';
// The Modifiers area for one item: one closed panel per group the part allows; open one to fill its fields.
export function modifiersHtml(l, mf = modFields()) {
  const p = l.part;
  if (!p || !p.mods.length) return '';
  const groups = p.mods.filter((m) => pricedHere(m.name, mf));
  if (!groups.length) return '';
  return `<div style="margin-top:10px"><div style="font-size:12px;font-weight:700;color:#3d4658;margin-bottom:6px">Modifiers</div><div style="display:flex;flex-direction:column;gap:6px">${groups.map((m) => {
    const fields = fieldsFor(m.name, mf);
    const sel = (l.sel || []).filter((s) => s.modId === m.id);
    const val = (k) => sel.find((s) => s.k === k)?.value;
    return `<details style="border:1px solid #e3e7ee;border-radius:8px;background:#fafbfc"${sel.length ? ' open' : ''}>
      <summary style="cursor:pointer;padding:8px 12px;font-size:13px;font-weight:700;color:#1d4f91;min-height:24px">${esc(clean(m.name))}${sel.length ? ` <span style="font-weight:500;color:#5a6478">· ${sel.length} set</span>` : ''}</summary>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px 14px;padding:4px 12px 12px;align-items:end">${fields.map((f, k) => {
        const name = `x${l.i}_${m.id}_${k}`, v = val(k);
        if (f.type === 'check') return `<label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;min-height:34px"><input type="checkbox" name="${name}" value="1"${v ? ' checked' : ''} style="width:18px;height:18px;accent-color:#a8343f">${esc(f.field)}</label>`;
        if (f.type === 'select') return `<label style="font-size:12px;font-weight:600">${esc(f.field)}<select name="${name}" style="${INP}"><option value="">—</option>${f.choices.map((c) => `<option${v === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`;
        if (f.type === 'text') return `<label style="font-size:12px;font-weight:600;grid-column:span 2">${esc(f.field)}<input name="${name}" value="${esc(v ?? '')}" style="${INP}"></label>`;
        return `<label style="font-size:12px;font-weight:600">${esc(f.field)}<input name="${name}" type="number" min="0" step="any" value="${esc(v ?? '')}" style="${INP}"></label>`;
      }).join('')}</div></details>`;
  }).join('')}</div></div>`;
}

// Rows for Admin > Modifier price list: one per choice (or one "*" row for numbers). Text fields are not priced.
export function priceRows(group, mf = modFields()) {
  const rows = [];
  for (const f of fieldsFor(group, mf)) {
    if (f.type === 'text') continue;
    if (f.type === 'select') f.choices.forEach((c) => rows.push({ field: f.field, choice: c, how: 'sign' }));
    else if (f.type === 'check') rows.push({ field: f.field, choice: 'Yes', how: 'sign' });
    else rows.push({ field: f.field, choice: '*', how: f.type === 'min' ? 'min' : 'qty' });
  }
  return rows;
}
