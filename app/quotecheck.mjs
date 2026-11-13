// Purchasing: check a vendor quote against what we sold (the Buying agent's rules) before anything is ordered.
import { esc } from './views.mjs';
import { checkQuote } from './buying.mjs';

export const SOLD = {
  pu1: { qty: 3, w: 60, h: 300, material: 'Cast wrap vinyl with laminate', sides: 1 },
  pu2: { qty: 8, w: 1, h: 1, material: 'Brushed aluminum standoffs', sides: 1 },
  pu3: { qty: 8, w: 24, h: 72, material: 'Aluminum post kit', sides: 2 },
  pu4: { qty: 1, w: 120, h: 96, material: 'Wall graphic media with laminate', sides: 1 },
};

const num = (v) => { const n = Number(String(v ?? '').replace(/[$,\s]/g, '')); return Number.isFinite(n) ? n : null; };

export function quoteFromForm(f) {
  const q = { vendor: String(f.vendor || '').trim().slice(0, 80), quoteNo: String(f.quoteNo || '').trim().slice(0, 40), lines: [], freight: num(f.freight) || 0, expires: /^\d{4}-\d{2}-\d{2}$/.test(String(f.expires || '')) ? f.expires : undefined, leadDays: num(f.leadDays) ?? undefined };
  if (String(f.description || '').trim() || num(f.qty)) q.lines.push({ description: String(f.description || '').trim().slice(0, 200), qty: num(f.qty) || 0, unitPrice: num(f.unitPrice), total: num(f.total), w: num(f.w) || undefined, h: num(f.h) || undefined });
  return q;
}

export function applyQuoteCheck(records, id, f, { today, due } = {}) {
  const r = records.find((x) => x.id === id);
  if (!r) throw new Error('that card is not here');
  const sold = { ...(SOLD[id] || r.sold || {}), dueDate: due || r.due };
  if (!sold.qty) throw new Error('this card has no estimate line to check against');
  const quote = quoteFromForm(f);
  const res = checkQuote(sold, quote, { today });
  return records.map((x) => (x.id === id ? { ...x, vendor: quote.vendor || x.vendor, quoteCheck: { level: res.level, cost: res.cost, issues: res.issues.map((i) => ({ level: i.level, say: i.say })), quoteNo: quote.quoteNo } } : x));
}

export function blockedForOrder(r, to) {
  return ['order', 'ordered'].includes(to) && r.quoteCheck && r.quoteCheck.level === 'block';
}

const LV = { ok: ['Quote OK', '#e6f2ec', '#1f6a43'], review: ['Check Quote', '#fdf3dc', '#7a4e00'], block: ['Quote Blocked', '#fbeaec', '#8f2a34'] };
export function quoteCard(r) {
  const s = SOLD[r.id] || r.sold;
  if (!s) return '';
  const qc = r.quoteCheck;
  const badge = qc ? `<span class="pill" style="background:${LV[qc.level][1]};color:${LV[qc.level][2]}">${LV[qc.level][0]}${qc.cost != null ? ` · cost $${Number(qc.cost).toFixed(2)}` : ''}</span>${qc.issues.length ? `<ul style="margin:4px 0 0;padding-left:16px;font-size:12px">${qc.issues.map((i) => `<li>${esc(i.say)}</li>`).join('')}</ul>` : ''}` : '';
  const inp = (n, l, w = '100%', t = 'text') => `<label style="display:flex;flex-direction:column;font-size:11px">${l}<input name="${n}" type="${t}" style="font:inherit;font-size:12px;min-height:28px;border:1px solid #d5dbe5;border-radius:6px;padding:0 6px;width:${w}"></label>`;
  return `<div style="font-size:12px;color:var(--mute)">Sold: ${s.qty} × ${esc(s.material)}${s.w > 1 ? ` · ${s.w}×${s.h} in` : ''}</div>${badge}
<details><summary style="cursor:pointer;font-size:12px;font-weight:600;color:#1d4f91">Check Vendor Quote</summary><form method="post" action="/boards/purchasing/${esc(r.id)}/quote" style="display:grid;grid-template-columns:1fr 1fr;gap:4px 6px;margin-top:6px">
${inp('vendor', 'Vendor')}${inp('quoteNo', 'Quote #')}<div style="grid-column:1/-1">${inp('description', 'What they quoted')}</div>${inp('qty', 'Qty', '100%', 'number')}${inp('unitPrice', 'Each $')}${inp('total', 'Line total $')}${inp('freight', 'Freight $')}${inp('w', 'Width in')}${inp('h', 'Height in')}${inp('expires', 'Expires', '100%', 'date')}${inp('leadDays', 'Lead days', '100%', 'number')}
<button class="btn" style="grid-column:1/-1;min-height:30px">Check Quote</button></form></details>`;
}
