// Customer email drafts SalesMax prepares (nothing is sent from the test copy):
// shipping-account request, order completed (invoice + review request), past due reminder with pay link.
import { page, esc } from './views.mjs';
import { sampleData } from './data.mjs';

const money = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const first = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';

// Admin can replace any email with their own words. {placeholders} are filled in; unknown ones are left as typed.
export function fillTemplate(tpl, vars) {
  return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null && vars[k] !== '' ? String(vars[k]) : m));
}

export function needsShippingAccount(items, profile = {}, settings = {}) {
  if (settings.shippingAccountRequest === false) return false;
  const ships = items.some((i) => /ship/i.test(i.handoff || i.destination || ''));
  const has = Object.values(profile.shipping || {}).some((s) => s && s.acct);
  return ships && !has;
}

export function shippingDraft(p, tpl = '') {
  if (tpl) return { key: 'shipping', title: 'Ask for a Shipping Account', subject: `Shipping account for ${p.name}`, body: fillTemplate(tpl, { first: first(p.contact), project: p.name }) };
  return {
    key: 'shipping', title: 'Ask for a Shipping Account',
    subject: `Shipping account for ${p.name}`,
    body: `Hi ${first(p.contact)},\n\n${p.name} will ship when it's finished. If you'd like it billed to your own UPS or FedEx account, please reply with the carrier and account number, and whether you want ground or express.\n\nIf you'd rather we ship it on our account, just say so and we'll add the shipping cost to the invoice.`,
  };
}

export function orderComplete(items) { return items.length > 0 && items.every((i) => ['built', 'done', 'complete'].includes(i.step)); }

export function completedDraft(p, { mode = 'Invoice + review request', reviewLink = '', payLink = '', tpl = '' } = {}) {
  if (mode === 'Nothing') return null;
  if (tpl) return { key: 'completed', title: 'Order Completed', subject: `${p.name} is complete · invoice attached`, body: fillTemplate(tpl, { first: first(p.contact), project: p.name, total: money(p.total), paylink: payLink, review: mode === 'Invoice + review request' ? reviewLink : '' }) };
  const review = mode === 'Invoice + review request'
    ? `\n\nIf you're happy with how it turned out, would you leave us a quick review? ${reviewLink || '[review link]'} It helps other local businesses find us.` : '';
  return {
    key: 'completed', title: 'Order Completed',
    subject: `${p.name} is complete · invoice attached`,
    body: `Hi ${first(p.contact)},\n\n${p.name} is complete. Your invoice for ${money(p.total)} is attached${payLink ? `, and you can pay online here: ${payLink}` : ''}.${review}\n\nThanks for working with us.`,
  };
}

export function pastDueDraft(inv, payLink, tpl = '') {
  if (tpl) return { key: `pastdue-${inv.id}`, title: 'Past Due Reminder', subject: `Invoice ${inv.number} is past due`, body: fillTemplate(tpl, { first: first(inv.contact), invoice: inv.number, balance: money(inv.balance), due: inv.due, paylink: payLink }) };
  return {
    key: `pastdue-${inv.id}`, title: 'Past Due Reminder',
    subject: `Invoice ${inv.number} is past due`,
    body: `Hi ${first(inv.contact)},\n\nInvoice ${inv.number} for ${money(inv.balance)} was due ${inv.due}. You can pay by card or bank account here: ${payLink}\n\nIf it's already on its way, thank you, and please ignore this note. If something on the invoice looks wrong, reply and we'll sort it out.`,
  };
}

export function demoInvoices(today) {
  if (!sampleData()) return [];
  const back = (n) => new Date(new Date(today + 'T12:00:00Z').getTime() - n * 86400000).toISOString().slice(0, 10);
  return [
    { id: 'inv1', number: '75710', projectId: 'demo-4', customer: 'Oakline Café', contact: 'Sam Ortiz', balance: 640, due: back(9) },
    { id: 'inv2', number: '75688', projectId: 'demo-7', customer: 'Florence Fitness', contact: 'Lena Park', balance: 1210.5, due: back(23) },
  ];
}

export function draftCard(d) {
  return `<details class="panel" style="margin-bottom:10px"><summary style="cursor:pointer;font-weight:700">${esc(d.title)} <span style="font-weight:500;color:var(--mute)">· Draft ready</span></summary>
<div style="margin-top:8px;font-size:13px"><div><b>Subject:</b> ${esc(d.subject)}</div><pre style="white-space:pre-wrap;font:inherit;background:#f4f6f9;border-radius:8px;padding:10px;margin:8px 0">${esc(d.body)}</pre>
<span style="font-size:12px;color:var(--mute)">Test copy: nothing is sent. Copy it into your email for now.</span></div></details>`;
}

export function draftsPanel(drafts) {
  if (!drafts.length) return '';
  return `<section aria-label="Customer emails"><h2 style="margin:0 0 8px;font-size:15px">Customer Emails</h2>${drafts.map(draftCard).join('')}</section>`;
}

export function pastDuePage({ user, invoices, today, links, remindersOn = true, tpl = '' }) {
  const days = (d) => Math.round((new Date(today + 'T12:00:00Z') - new Date(d + 'T12:00:00Z')) / 86400000);
  const rows = invoices.map((inv) => `<tr><td>${esc(inv.number)}</td><td>${esc(inv.customer)}</td><td style="text-align:right">${money(inv.balance)}</td><td>${days(inv.due)} days</td></tr>`).join('');
  const body = `<div class="wrap"><div class="bar" style="padding:14px 0"><h1>Past Due Invoices</h1><a class="btn" href="/reports/past-due.csv" style="margin-left:8px">Download CSV</a><span class="pill" style="margin-left:auto;background:${remindersOn ? '#e6f2ec' : '#eef1f5'};color:${remindersOn ? '#1f6a43' : '#5a6478'}">Reminders ${remindersOn ? 'On' : 'Off'}</span></div>
<section class="panel"><table><thead><tr><th>Invoice</th><th>Customer</th><th style="text-align:right">Balance</th><th>Past due</th></tr></thead><tbody>${rows || '<tr><td colspan="4" style="color:var(--mute)">Nothing past due.</td></tr>'}</tbody></table></section>
${invoices.map((inv) => draftCard(pastDueDraft(inv, links[inv.id] || '[pay link]', tpl))).join('')}</div>`;
  return page({ title: 'Past Due Invoices', user, tab: '', body });
}
