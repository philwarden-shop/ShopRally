// Project record: "Where This Stands" (purple ✦ insight) and Customer Flags, stacked full-width under the header.
import { esc } from './views.mjs';

const DAY = 86400000;
const days = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / DAY);
const nice = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

const WAITING_CUSTOMER = ['proofwait'];
const HOLD = /^hold/;

export function whereThisStands(p, items = [], today) {
  const basedOn = [];
  const parts = [];
  let tone = 'ok';
  if (items.length) {
    basedOn.push(plural(items.length, 'item'));
    const built = items.filter((i) => ['built', 'done', 'complete'].includes(i.step)).length;
    const waiting = items.filter((i) => WAITING_CUSTOMER.includes(i.step));
    const held = items.filter((i) => HOLD.test(i.step || ''));
    if (built === items.length) parts.push('Everything is built and ready to hand off.');
    else parts.push(`${built} of ${plural(items.length, 'item')} built.`);
    if (waiting.length) { parts.push(`Waiting on the customer to approve ${waiting.map((i) => `“${i.name}”`).join(', ')}.`); tone = 'watch'; }
    if (held.length) { parts.push(`${plural(held.length, 'item')} on hold${held[0].holdReason ? ` (${held[0].holdReason})` : ''}.`); tone = 'risk'; }
  } else if (['prospect', 'estimate'].includes(p.lane)) {
    parts.push(p.lane === 'prospect' ? 'Still a prospect. Next step is a site walk or an estimate.' : 'Estimate is out. Next step is the customer’s approval and deposit.');
  }
  if (p.due && today) {
    basedOn.push('due date');
    const d = days(today, p.due);
    if (d < 0) { parts.push(`Past due by ${plural(-d, 'day')}.`); tone = 'risk'; }
    else if (d <= 2) { parts.push(`Due ${d === 0 ? 'today' : d === 1 ? 'tomorrow' : nice(p.due)}.`); if (tone === 'ok') tone = 'watch'; }
    else parts.push(`Due ${nice(p.due)}, ${plural(d, 'day')} away.`);
  }
  if (p.insight) { parts.push(p.insight); basedOn.push('recent notes'); }
  return { text: parts.join(' ') || 'Nothing to report yet.', basedOn: basedOn.length ? basedOn.join(', ') : 'project details', tone };
}

export function customerFlags(cu = {}) {
  const c = cu.company || cu;
  const f = [];
  const exempt = c.isTaxExempt ?? c.IsTaxExempt ?? c.taxExempt;
  if (exempt) f.push({ label: 'Tax Exempt', note: c.taxExemptNumber || c.TaxExemptNumber ? `Certificate ${c.taxExemptNumber || c.TaxExemptNumber}` : 'Certificate on file', tone: 'info' });
  if (c.poRequired || c.requiresPO) f.push({ label: 'PO Required', note: 'Get a PO before production', tone: 'watch' });
  if (c.terms) f.push({ label: `Terms: ${c.terms}`, note: 'Bill on completion', tone: 'info' });
  if (c.pastDue) f.push({ label: 'Past Due Balance', note: `$${Number(c.pastDue).toLocaleString('en-US')} open`, tone: 'risk' });
  if (c.strategic) f.push({ label: 'Strategic Priority', note: 'Owner watches this account', tone: 'info' });
  if (c.doNotMail) f.push({ label: 'Do Not Mail', note: 'No marketing emails', tone: 'watch' });
  return f;
}

const TONE = { ok: ['#f3f0fa', '#4a3373', '#d9cff0'], watch: ['#fdf3dc', '#5c4300', '#f2d79a'], risk: ['#f6e8ea', '#7d2530', '#e7c3c8'], info: ['#e8f0fb', '#1d4f91', '#c9daf2'] };

export function standingHtml(p, items, today, cu) {
  const w = whereThisStands(p, items, today);
  const flags = customerFlags(cu);
  const [bg, fg, bd] = TONE.ok;
  const flagHtml = flags.length
    ? flags.map((x) => { const [b, f2, d] = TONE[x.tone]; return `<span style="display:inline-flex;flex-direction:column;background:${b};color:${f2};border:1px solid ${d};border-radius:10px;padding:6px 10px;font-size:12px"><b>${esc(x.label)}</b><span>${esc(x.note)}</span></span>`; }).join('')
    : '<span style="font-size:12px;color:var(--mute)">No flags on this customer.</span>';
  return `<section class="panel" aria-label="Where This Stands" style="background:${bg};border-color:${bd};color:${fg}"><h2 style="margin:0 0 6px;font-size:15px">✦ Where This Stands</h2><p style="margin:0">${esc(w.text)}</p><p style="margin:6px 0 0;font-size:12px">Based on: ${esc(w.basedOn)}</p></section>
<section class="panel" aria-label="Customer Flags"><h2 style="margin:0 0 8px;font-size:15px">Customer Flags</h2><div style="display:flex;gap:8px;flex-wrap:wrap">${flagHtml}</div></section>`;
}
