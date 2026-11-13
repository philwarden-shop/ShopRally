// Customer order page extras: comments, price-change approval above the Admin threshold, phone note + "Email Me the Link".
import { esc } from './views.mjs';
import { sampleData } from './data.mjs';

export const DEFAULT_PRICE_THRESHOLD = 25;
const money = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function demoPriceChange(projectId) {
  if (!sampleData()) return null;
  return projectId === 'demo-10' ? { amount: 45, reason: 'Brushed aluminum standoffs instead of clear, as you asked on the call.', status: 'pending' } : null;
}

// Changes at or under the threshold apply without asking; above it the customer must approve.
export function needsApproval(pc, threshold = DEFAULT_PRICE_THRESHOLD) {
  return !!pc && pc.status === 'pending' && Math.abs(Number(pc.amount) || 0) > Number(threshold);
}

export function decidePrice(pc, decision, { by, at, threshold = DEFAULT_PRICE_THRESHOLD, staff = false } = {}) {
  if (staff) throw new Error('only the customer can approve a new price');
  if (!needsApproval(pc, threshold)) throw new Error('there is no price change waiting for you');
  if (!['approve', 'decline'].includes(decision)) throw new Error('pick approve or decline');
  return { ...pc, status: decision === 'approve' ? 'approved' : 'declined', by, at };
}

export function addComment(list, text, { who, at }) {
  const t = String(text || '').trim();
  if (t.length < 2) throw new Error('please type a comment first');
  if (t.length > 2000) throw new Error('please keep comments under 2,000 characters');
  return [...(list || []), { text: t, who, at }].slice(-100);
}

export function extrasHtml({ token, comments = [], priceChange, threshold = DEFAULT_PRICE_THRESHOLD, emailed = false }) {
  const base = `/p/${esc(token)}`;
  const btn = 'font:inherit;font-weight:700;min-height:44px;border-radius:10px;cursor:pointer;padding:0 14px';
  const phone = `<div class="phone-only" role="note" style="background:#eef4fc;border:1px solid #c9daf2;border-radius:12px;padding:12px;font-size:14px;color:#1d3a63">💻 Approving proofs works best on a computer or tablet.
<form method="post" action="${base}/email-link" style="display:inline"><button style="font:inherit;font-weight:700;color:#1d4f91;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer">${emailed ? 'Link Sent to Your Email ✓' : 'Email Me the Link'}</button></form></div>`;
  let price = '';
  if (needsApproval(priceChange, threshold)) {
    price = `<section style="background:#fdf3dc;border:1px solid #f2d79a;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px"><h2 style="margin:0;font-size:16px;color:#5c4300">Please Approve a Price Change</h2><p style="margin:0;color:#5c4300">${esc(priceChange.reason)}</p>
<div style="display:flex;gap:8px;flex-wrap:wrap"><form method="post" action="${base}/price"><input type="hidden" name="decision" value="approve"><button style="${btn};border:0;background:#a8343f;color:#fff">Approve New Price (+${money(priceChange.amount)})</button></form>
<form method="post" action="${base}/price"><input type="hidden" name="decision" value="decline"><button style="${btn};border:1px solid #5c4300;background:#fff;color:#5c4300">Call Me First</button></form></div></section>`;
  } else if (priceChange && priceChange.status !== 'pending') {
    price = `<div style="background:#fff;border-radius:12px;padding:12px;font-size:14px">Price change ${priceChange.status === 'approved' ? 'approved' : 'declined. We will call you'}.</div>`;
  }
  const list = comments.map((c) => `<li style="padding:8px 0;border-top:1px solid #eef1f5"><div style="font-size:12px;color:#5a6478">${esc(c.who)} · ${esc(new Date(c.at).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}</div>${esc(c.text)}</li>`).join('');
  const comm = `<section style="background:#fff;border-radius:12px;padding:12px 16px"><h2 style="font-size:15px;margin:4px 0 8px">Comments</h2>${list ? `<ul style="list-style:none;margin:0 0 8px;padding:0">${list}</ul>` : ''}
<details><summary style="cursor:pointer;font-weight:700;color:#1d4f91;min-height:40px;display:flex;align-items:center">+ Add Comment</summary><form method="post" action="${base}/comment" style="display:flex;flex-direction:column;gap:8px"><label for="cmt" style="font-size:14px">Your comment</label><textarea id="cmt" name="text" rows="3" required minlength="2" maxlength="2000" style="font:inherit;font-size:15px;border:1px solid #d5dbe5;border-radius:8px;padding:8px"></textarea><button style="${btn};border:0;background:#1d4f91;color:#fff">Send Comment</button></form></details></section>`;
  return `<style>.phone-only{display:none}@media (max-width:600px){.phone-only{display:block}}</style>${phone}${price}${comm}`;
}

// Customer enters their PO on the order page; staff see it on the project with the PO check.
export function customerPo(f) {
  const poNumber = String(f.poNumber || '').trim();
  const amt = String(f.poAmount || '').replace(/[$,\s]/g, '');
  if (poNumber.length < 2) throw new Error('please enter your PO number');
  if (!/^\d+(\.\d{1,2})?$/.test(amt)) throw new Error('please enter the PO amount');
  return { poNumber: poNumber.slice(0, 40), poAmount: amt, from: 'customer' };
}
export function poFormHtml(token, po) {
  const field = 'font:inherit;font-size:15px;min-height:44px;border:1px solid #d5dbe5;border-radius:8px;padding:0 10px';
  return `<section style="background:#fff;border-radius:12px;padding:12px 16px"><h2 style="font-size:15px;margin:4px 0 8px">Purchase Order</h2>${po && po.poNumber ? `<p style="margin:0 0 8px;font-size:14px">We have PO <b>${esc(po.poNumber)}</b>. Thank you.</p>` : ''}
<details ${po && po.poNumber ? '' : 'open'}><summary style="cursor:pointer;font-weight:700;color:#1d4f91;min-height:40px;display:flex;align-items:center">${po && po.poNumber ? 'Change the PO' : 'Enter Your PO'}</summary><form method="post" action="/p/${esc(token)}/po" style="display:flex;flex-direction:column;gap:8px"><label style="display:flex;flex-direction:column;font-size:14px;gap:4px">PO number<input name="poNumber" required style="${field}"></label><label style="display:flex;flex-direction:column;font-size:14px;gap:4px">PO amount ($)<input name="poAmount" inputmode="decimal" required style="${field}"></label><button style="font:inherit;font-weight:700;min-height:44px;border:0;border-radius:10px;background:#1d4f91;color:#fff;cursor:pointer">Send PO</button></form></details></section>`;
}

// "When will it be ready?" Most likely date = today + the slowest item's remaining target days (skipping weekends).
// No later than = the promised due date. Waiting on the customer is called out, because that part is up to them.
export function addBusinessDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  let left = n;
  while (left > 0) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w !== 0 && w !== 6) left--; }
  return d.toISOString().slice(0, 10);
}
export function readyForecast(items, { steps, targets, today, due }) {
  const order = steps.map((s) => s.id);
  const live = items.filter((i) => !['done'].includes(i.step));
  if (!live.length) return { state: 'ready', likely: today, due };
  if (live.every((i) => i.step === 'built')) return { state: 'ready', likely: today, due };
  let worst = 0, waitingOnYou = false;
  for (const i of live) {
    if (i.step === 'proofwait') waitingOnYou = true;
    const from = Math.max(0, order.indexOf(i.step === 'hold' ? 'prep' : i.step));
    const rest = order.slice(from, order.indexOf('built')).reduce((a, id) => a + (targets[id] ?? 1), 0);
    worst = Math.max(worst, rest);
  }
  let likely = addBusinessDays(today, worst);
  if (due && likely > due && !waitingOnYou) likely = due;
  return { state: 'progress', likely, due, waitingOnYou };
}
export function forecastHtml(f) {
  const nice = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  if (f.state === 'ready') return `<section style="background:#e6f2ec;border-radius:12px;padding:14px 16px"><span style="font-size:11px;font-weight:700;letter-spacing:.5px;color:#1f6a43">READY</span><div style="font-size:18px;font-weight:700">Your order is ready</div></section>`;
  return `<section style="background:#fff;border:1px solid #e3e7ee;border-radius:12px;padding:14px 16px"><span style="font-size:11px;font-weight:700;letter-spacing:.5px;color:#1d4f91">READY</span><div style="font-size:18px;font-weight:700">Most likely ${esc(nice(f.likely))}</div>${f.due ? `<div style="font-size:13px;color:#5a6478">No later than ${esc(nice(f.due))}.</div>` : ''}${f.waitingOnYou ? '<div style="font-size:13px;color:#5c4300;margin-top:4px">This date depends on your proof approval.</div>' : ''}</section>`;
}

// Customer approves the estimate online. It moves to In production in SalesMax with "deposit due"; the salesperson gets a task.
export function approveEstimateOnline(overrides, project, f, { at }) {
  if (project.lane !== 'estimate') throw new Error('this estimate is not waiting for approval');
  const signer = String(f.signer || '').trim();
  if (signer.length < 2) throw new Error('please type your name to approve');
  if (f.agree !== 'on') throw new Error('please tick the box to agree to the estimate and terms');
  return { ...(overrides || {}), [project.id]: { lane: 'progress', status: 'Approved online · deposit due', how: 'online', signer: signer.slice(0, 80), at } };
}
export function estimateApprovalHtml(token, project, { depositPct = 50, notes = '' } = {}) {
  if (project.lane !== 'estimate') return '';
  const dep = Math.round((Number(project.total) || 0) * depositPct) / 100;
  const field = 'font:inherit;font-size:15px;min-height:44px;border:1px solid #d5dbe5;border-radius:8px;padding:0 10px';
  return `<section style="background:#fff;border:2px solid #9fd0b2;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px"><h2 style="margin:0;font-size:17px">Approve Your Estimate</h2>
<div style="display:flex;justify-content:space-between"><span>Estimate total</span><b>$${(Number(project.total) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</b></div><div style="display:flex;justify-content:space-between;font-size:14px;color:#5a6478"><span>Deposit to start (${depositPct}%)</span><span>$${dep.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
${notes ? `<p style="margin:0;font-size:13px;color:#5a6478">${esc(notes)}</p>` : ''}
<form method="post" action="/p/${esc(token)}/approve-estimate" style="display:flex;flex-direction:column;gap:8px"><label style="display:flex;flex-direction:column;gap:4px;font-size:14px">Your name<input name="signer" required style="${field}"></label>
<label style="display:flex;gap:10px;align-items:flex-start;font-size:14px;min-height:40px"><input type="checkbox" name="agree" required style="width:20px;height:20px;margin-top:2px"> I approve this estimate and its terms.</label>
<button style="font:inherit;font-weight:700;font-size:16px;min-height:48px;border:0;border-radius:10px;background:#1f6a43;color:#fff;cursor:pointer">Approve Estimate</button></form></section>`;
}
