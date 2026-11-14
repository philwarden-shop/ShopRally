// Payment policy (Phil, Nov 14): the payment rule keeps an order from moving forward until it's met. Configured in
// Admin › Customer Page & Payments › Payment Policy. Modeled on CoreBridge's payment policy; to be checked against
// CoreBridge's own settings screen and adjusted.
import { esc } from './views.mjs';

export const GATE_AT = [['design', 'Before design starts'], ['production', 'Before production starts']];
// Item steps that count as "started" for each gate.
const DESIGN_ON = ['indesign', 'proofqc', 'salesrev', 'proofwait', 'files', 'wip', 'vended', 'qc', 'built', 'done'];
const PROD_ON = ['wip', 'vended', 'qc', 'built', 'done'];

export function policyDefaults(settings = {}) {
  return { on: true, depositPct: Number(settings.depositPct ?? 50), fullPayUnder: 2500, termsPO: true, gateAt: 'design', override: 'Managers and Owners' };
}
export function readPolicy(saved, settings = {}) { return { ...policyDefaults(settings), ...(saved || {}) }; }

export function mergePolicy(prev, f, settings = {}) {
  const p = readPolicy(prev, settings);
  const pct = Number(f.depositPct), under = Number(f.fullPayUnder);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new Error('deposit must be 0 to 100%');
  if (!Number.isFinite(under) || under < 0 || under > 1000000) throw new Error('the paid-in-full amount must be $0 to $1,000,000');
  return { ...p, on: f.on === 'on', depositPct: Math.round(pct), fullPayUnder: Math.round(under), termsPO: f.termsPO === 'on', gateAt: GATE_AT.some(([k]) => k === f.gateAt) ? f.gateAt : p.gateAt };
}

// What the customer must pay (or send) before work starts.
export function requirement(project, policy, { terms = '' } = {}) {
  const total = Number(project.total) || 0;
  if (!policy.on) return { kind: 'none', amount: 0, text: 'No payment rule' };
  if (policy.termsPO && /net|terms/i.test(String(terms || project.terms || ''))) return { kind: 'po', amount: 0, text: 'A PO (customer has terms)' };
  if (total < policy.fullPayUnder) return { kind: 'full', amount: total, text: `Paid in full (under $${policy.fullPayUnder.toLocaleString('en-US')})` };
  const amount = Math.round(total * policy.depositPct) / 100;
  return { kind: 'deposit', amount, text: `${policy.depositPct}% deposit` };
}

// paid: dollars received so far; po: a PO is on file. Returns { ok, need } where need is a sentence for the team.
export function paymentGate(project, policy, { paid = 0, po = false, terms = '' } = {}) {
  const r = requirement(project, policy, { terms });
  if (r.kind === 'none') return { ok: true, req: r };
  if (r.kind === 'po') return po ? { ok: true, req: r } : { ok: false, req: r, need: 'a PO from the customer (they have terms)' };
  const left = Math.max(0, Math.round((r.amount - (Number(paid) || 0)) * 100) / 100);
  if (left <= 0.009 || po && policy.termsPO && /net|terms/i.test(String(terms))) return { ok: true, req: r };
  return { ok: false, req: r, need: `${r.text}: $${left.toLocaleString('en-US', { minimumFractionDigits: 2 })} still to pay` };
}

// True when moving an item from `from` to `to` crosses the payment gate.
export function crossesGate(policy, from, to) {
  if (!policy.on) return false;
  const on = policy.gateAt === 'production' ? PROD_ON : DESIGN_ON;
  return on.includes(to) && !on.includes(from);
}

export function policyCard(pol, { back = '/admin?tab=orders' } = {}) {
  const IN = 'font:inherit;font-size:13px;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 10px;box-sizing:border-box';
  const row = (a, b, c) => `<div style="display:grid;grid-template-columns:minmax(170px,1fr) minmax(0,2fr) auto;gap:12px;align-items:center;padding:8px 0;border-bottom:1px solid #eef1f5;font-size:13px"><span style="font-weight:600">${a}</span><span style="color:#3d4658;line-height:1.45">${b}</span>${c}</div>`;
  return `<section aria-labelledby="paypol-h" style="background:#ffffff;border:1px solid #e3e7ee;border-radius:12px"><div style="padding:16px 20px;border-bottom:1px solid #e3e7ee"><h2 id="paypol-h" style="margin:0;font-size:16px;font-weight:700">Payment Policy</h2><p style="margin:4px 0 0;font-size:13px;color:#5a6478;line-height:1.5">What a customer must pay before work starts. Until it's met, the order can't move past the point you pick below. Applies to orders approved in the shop and online.</p></div>
<form method="post" action="/admin/paypolicy?back=${encodeURIComponent(back)}" style="margin:0;padding:6px 20px 14px">
${row(`<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="on"${pol.on ? ' checked' : ''} style="width:16px;height:16px;accent-color:#a8343f">Payment rule is on</label>`, 'Turn off only while testing; nothing is held when it is off.', '')}
${row('Paid in full under', 'Smaller orders are paid in full before work starts.', `<label style="display:flex;gap:4px;align-items:center">$<input name="fullPayUnder" inputmode="numeric" value="${esc(pol.fullPayUnder)}" aria-label="Paid in full under (dollars)" style="${IN};width:100px"></label>`)}
${row('Deposit on larger orders', 'Customers can pay the deposit or the full amount; the balance is due at completion.', `<label style="display:flex;gap:4px;align-items:center"><input name="depositPct" inputmode="numeric" value="${esc(pol.depositPct)}" aria-label="Deposit percent" style="${IN};width:64px">%</label>`)}
${row(`<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="termsPO"${pol.termsPO ? ' checked' : ''} style="width:16px;height:16px;accent-color:#a8343f">Terms customers send a PO</label>`, 'Customers with Net 15 / Net 30 terms send a PO instead of a deposit.', '')}
${row('Hold the order', 'Where the order stops until the payment rule is met.', `<select name="gateAt" style="${IN};background:#fff">${GATE_AT.map(([k, l]) => `<option value="${k}"${pol.gateAt === k ? ' selected' : ''}>${l}</option>`).join('')}</select>`)}
${row('Who can override', 'They see a note on the card; every override is logged with their name.', `<span style="font-size:12px;font-weight:700;background:#e8f0fb;color:#1d4f91;border-radius:10px;padding:2px 9px">${esc(pol.override)}</span>`)}
<div style="padding-top:10px"><button style="font:inherit;font-size:13px;font-weight:700;color:#fff;background:#a8343f;border:0;border-radius:8px;padding:0 14px;min-height:36px;cursor:pointer">Save Payment Policy</button></div></form></section>`;
}
