// Imported CoreBridge customers (CB#customers#<id>), read-only. Paged 50 at a time; search matches the name as typed,
// lower case or Title Case (DynamoDB "contains" is case-sensitive).
import { esc } from './views.mjs';

export const variants = (q) => { const s = String(q || '').trim(); if (!s) return []; const t = s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); return [...new Set([s, s.toLowerCase(), t, s.toUpperCase()])]; };
export const encTok = (k) => (k ? Buffer.from(JSON.stringify(k)).toString('base64url') : '');
export const decTok = (t) => { try { return t ? JSON.parse(Buffer.from(String(t), 'base64url').toString()) : undefined; } catch { return undefined; } };

let D;
export async function listImported({ entity = 'customers', q = '', token = '', limit = 50, loc = 'nky', table = process.env.TABLE, send } = {}) {
  if (!send) { if (!D) { const m = await import('@aws-sdk/client-dynamodb'); D = { m, c: new m.DynamoDBClient({}) }; } send = (input) => D.c.send(new D.m.QueryCommand(input)); }
  const vs = variants(q);
  const base = { TableName: table, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)', ExpressionAttributeValues: { ':pk': { S: `LOC#${loc}` }, ':sk': { S: `CB#${entity}#` } } };
  if (vs.length) { base.FilterExpression = vs.map((_, n) => `contains(#d, :q${n})`).join(' OR '); base.ExpressionAttributeNames = { '#d': 'data' }; vs.forEach((v, n) => { base.ExpressionAttributeValues[`:q${n}`] = { S: v }; }); }
  const rows = []; let start = decTok(token); let pages = 0;
  do {
    const out = await send({ ...base, ...(start ? { ExclusiveStartKey: start } : {}), Limit: vs.length ? 1000 : limit - rows.length });
    let filled = null;
    for (const it of out.Items || []) { try { rows.push(JSON.parse(it.data.S)); } catch { continue; } if (rows.length >= limit) { filled = { pk: it.pk, sk: it.sk }; break; } }
    start = filled || out.LastEvaluatedKey;
    pages++;
  } while (start && rows.length < limit && pages < 30);
  return { rows: rows.slice(0, limit), next: rows.length >= limit && start ? encTok(start) : '' };
}

const money = (n) => (Number(n) ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
export function importedPage({ page, user, rows, q = '', next = '', total = 0 }) {
  const tr = rows.map((c) => `<tr><td><a href="/customers/imported/${esc(c.accountId)}"><b>${esc(c.companyName || '')}</b></a><br><small style="color:var(--mute)">#${esc(c.accountId)} · ${esc(c.accountType || '')}${c.isActive === false ? ' · inactive' : ''}</small></td><td>${esc(c.companySalesperson || '')}</td><td>${esc(c.customerTerms || '')}</td><td style="text-align:right">${esc(money(c.balanceDue))}</td><td>${esc(c.industryType || '')}</td><td>${esc(String(c.modifiedDate || '').slice(0, 10))}</td></tr>`).join('');
  const body = `<div class="wrap"><div class="bar" style="padding:14px 0"><h1>CoreBridge Customers</h1><span class="pill" style="margin-left:8px;background:#e8f0fb;color:#1d4f91">Imported · read-only${total ? ' · ' + total.toLocaleString('en-US') + ' so far' : ''}</span><a class="btn" style="margin-left:auto" href="/customers">← SalesMax Customers</a></div>
<form method="get" action="/customers/imported" style="display:flex;gap:8px;margin:0 0 12px"><label style="flex:1;display:flex"><span style="position:absolute;left:-9999px">Search imported customers</span><input name="q" value="${esc(q)}" placeholder="Search by company, salesperson, terms…" style="font:inherit;flex:1;min-height:40px;border:1px solid #d5dbe5;border-radius:8px;padding:0 10px"></label><button class="btn primary">Search</button></form>
<section class="panel" style="overflow-x:auto"><table><thead><tr><th>Company</th><th>Salesperson</th><th>Terms</th><th style="text-align:right">Balance</th><th>Industry</th><th>Updated</th></tr></thead><tbody>${tr || '<tr><td colspan="6">No matches.</td></tr>'}</tbody></table>
${next ? `<p style="margin:10px 0 0"><a class="btn" href="/customers/imported?q=${encodeURIComponent(q)}&t=${encodeURIComponent(next)}">Next 50 →</a></p>` : ''}</section></div>`;
  return page({ title: 'CoreBridge Customers', user, tab: 'Customers', body });
}

// One imported CoreBridge customer, read-only: the record, its contacts (CC#) and newest orders (CO#).
export async function loadImported(id, { loc = 'nky', table = process.env.TABLE, send, get } = {}) {
  if (!send || !get) { if (!D) { const m = await import('@aws-sdk/client-dynamodb'); D = { m, c: new m.DynamoDBClient({}) }; } send = send || ((input) => D.c.send(new D.m.QueryCommand(input))); get = get || ((input) => D.c.send(new D.m.GetItemCommand(input))); }
  const pk = { S: `LOC#${loc}` };
  const one = await get({ TableName: table, Key: { pk, sk: { S: `CB#customers#${id}` } } });
  if (!one.Item) return null;
  const q = (prefix, limit, fwd = true) => send({ TableName: table, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)', ExpressionAttributeValues: { ':pk': pk, ':sk': { S: prefix } }, Limit: limit, ScanIndexForward: fwd });
  const parse = (out) => (out.Items || []).map((it) => { try { return JSON.parse(it.data.S); } catch { return null; } }).filter(Boolean);
  const [cs, os] = await Promise.all([q(`CC#${id}#`, 50), q(`CO#${id}#`, 25, false)]);
  return { c: JSON.parse(one.Item.data.S), contacts: parse(cs), orders: parse(os) };
}
const addr = (a) => (a ? [a.address1, a.address2, [a.city, a.state].filter(Boolean).join(', '), a.postalCode].filter(Boolean).join(' · ') : '');
export function importedDetailPage({ page, user, data, indexing = false }) {
  const { c, contacts = [], orders = [] } = data;
  const facts = [['Account #', c.accountId], ['Account type', c.accountType], ['Customer type', c.customerType], ['Industry', c.industryType], ['Salesperson', c.companySalesperson], ['Terms', c.customerTerms], ['Credit limit', c.creditLimit != null ? money(c.creditLimit) : ''], ['Balance due', c.balanceDue != null ? money(c.balanceDue) : ''], ['Tax group', c.taxGroupName], ['Tax exempt', c.taxExempt ? 'Yes' + (c.taxExemptExpirationDate ? ' until ' + String(c.taxExemptExpirationDate).slice(0, 10) : '') : 'No'], ['PO required', c.poNumberRequired ? 'Yes' : 'No'], ['Origination', c.originationType], ['Phone', c.companyPhone], ['Website', c.companyWebsite], ['Address', addr(c.defaultCustomerAddress || c.billingAddress)], ['Updated in CoreBridge', String(c.modifiedDate || '').slice(0, 10)]].filter(([, v]) => v != null && v !== '');
  const initials = String(c.companyName || '?').split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const people = contacts.length ? contacts : [c.primaryAccountContact, c.billingContact].filter(Boolean).map((x) => ({ name: [x.firstName, x.lastName].filter(Boolean).join(' '), email: x.email, phone: x.officePhone || x.cellPhone, primary: x.isPrimary, billing: x.isBilling, active: x.isActive !== false }));
  const seen = new Set(); const ppl = people.filter((p) => p.name && !seen.has(p.name) && seen.add(p.name));
  const ordRows = orders.map((o) => `<tr><td>${esc(o.invoice || o.orderId)}</td><td>${esc(o.desc)}</td><td>${esc(o.status)}</td><td>${esc(o.due)}</td><td style="text-align:right">${o.total != null ? money(o.total) : ''}</td><td style="text-align:right">${o.balance ? money(o.balance) : ''}</td></tr>`).join('');
  const body = `<div class="rw" style="max-width:1240px;margin:0 auto;padding:20px 32px 48px;display:flex;flex-direction:column;gap:20px"><div style="font-size:13px;color:var(--mute)"><a href="/customers/imported">CoreBridge Customers</a> › ${esc(c.companyName || '')}</div>
<header style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:20px 24px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:20px"><div style="display:flex;align-items:center;gap:16px"><div aria-hidden="true" style="width:52px;height:52px;border-radius:12px;background:#16213a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700">${esc(initials)}</div><div><h1 style="margin:0;font-size:24px">${esc(c.companyName || '')} <span class="pill" style="background:#e8f0fb;color:#1d4f91">From CoreBridge · read-only</span>${c.isActive === false ? ' <span class="pill" style="background:#eef1f5;color:#3d4658">Inactive</span>' : ''}</h1><div style="font-size:13px;color:var(--mute);margin-top:4px">${esc(c.companySalesperson || '')}${c.createdDate && !String(c.createdDate).startsWith('0001') ? ' · customer since ' + esc(String(c.createdDate).slice(0, 4)) : ''}</div></div></div>
<dl style="margin:0;display:grid;grid-template-columns:repeat(3,minmax(110px,auto));gap:28px"><div><dt style="font-size:12px;color:var(--mute)">Balance due</dt><dd style="margin:2px 0 0;font-size:22px;font-weight:700">${money(c.balanceDue)}</dd></div><div><dt style="font-size:12px;color:var(--mute)">Contacts</dt><dd style="margin:2px 0 0;font-size:22px;font-weight:700">${ppl.length}</dd></div><div><dt style="font-size:12px;color:var(--mute)">Orders shown</dt><dd style="margin:2px 0 0;font-size:22px;font-weight:700">${orders.length}</dd></div></dl></header>
${indexing ? '<div class="note" style="margin:0;background:#e8f0fb;color:#1d4f91">Still linking contacts and orders from the CoreBridge import; more will show here as it finishes.</div>' : ''}
<div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start"><aside style="flex:1 1 280px;max-width:360px;display:flex;flex-direction:column;gap:16px"><section style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:10px"><h2 style="margin:0;font-size:14px">People</h2>${ppl.map((p) => `<div style="font-size:13px"><b style="font-size:14px">${esc(p.name)}</b> <span style="font-size:12px;color:var(--mute)">${[p.primary && 'Primary', p.billing && 'Billing', p.position, p.active === false && 'Inactive'].filter(Boolean).map(esc).join(' · ')}</span>${p.email ? `<div><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></div>` : ''}${p.phone ? `<div>${esc(p.phone)}</div>` : ''}</div>`).join('') || '<p style="margin:0;color:var(--mute);font-size:13px">No contacts linked yet.</p>'}</section>
<section style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:8px"><h2 style="margin:0;font-size:14px">Account</h2>${facts.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:13px"><span style="color:var(--mute)">${esc(k)}</span><span style="font-weight:500;text-align:right">${esc(v)}</span></div>`).join('')}</section></aside>
<section style="flex:999 1 560px;min-width:0;background:#fff;border:1px solid var(--line);border-radius:12px;overflow-x:auto"><h2 style="margin:0;padding:14px 18px;border-bottom:1px solid var(--line);font-size:16px">Orders · newest first</h2><table><thead><tr><th>Invoice</th><th>Description</th><th>Status</th><th>Due</th><th style="text-align:right">Total</th><th style="text-align:right">Balance</th></tr></thead><tbody>${ordRows || '<tr><td colspan="6" style="color:var(--mute)">No orders linked yet.</td></tr>'}</tbody></table></section></div></div>`;
  return page({ title: c.companyName || 'CoreBridge customer', user, tab: 'Customers', body });
}
