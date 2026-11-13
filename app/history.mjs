// Full CoreBridge history import (READ ONLY): customers, contacts, estimates, orders. Runs a couple of calls a
// minute from a schedule (about 120 calls an hour) so it never crowds the shared CoreBridge limit, and picks up
// where it left off. Each record is kept as CB#<entity>#<id> in the SalesMax table.
import { esc } from './views.mjs';
import { phoneEntries } from './phones.mjs';
import { indexEntries } from './cbindex.mjs';

export const ENTITIES = [
  { key: 'customers', label: 'Customers', op: 'searchCustomers', id: 'accountId', mode: 'body', first: 0 },
  { key: 'contacts', label: 'Contacts', op: 'searchContacts', id: 'contactId', mode: 'body', first: 0 },
  { key: 'estimates', label: 'Estimates', op: 'getEstimate', id: 'id', mode: 'params', first: 1 },
  { key: 'orders', label: 'Orders', op: 'searchOrders', id: 'orderId', mode: 'body', first: 0 },
];

export function newState() { return { i: 0, page: ENTITIES[0].first, counts: {}, totals: {}, calls: 0, done: false, startedAt: null, lastRunAt: null, lastError: '' }; }

const rowsOf = (res) => (Array.isArray(res) ? res : (res && (res.data || res.Data)) || []);
const idOf = (row, e) => row[e.id] ?? row.Id ?? row.ID ?? row.estimateId ?? row.EstimateId;

export async function historyStep({ read, save, state, maxCalls = 2, pageSize = 100, now = () => Date.now(), budgetMs = 16000 }) {
  const s = { ...newState(), ...(state || {}) };
  if (s.done) return s;
  const t0 = now();
  s.startedAt = s.startedAt || new Date(t0).toISOString();
  let calls = 0;
  while (calls < maxCalls && !s.done && now() - t0 < budgetMs) {
    const e = ENTITIES[s.i];
    const req = e.mode === 'body' ? { body: { page: s.page, pageSize } } : { params: { page: s.page, pageSize, sort: 'id', direction: 'asc' } };
    const res = await read(e.op, req);
    calls++;
    const rows = rowsOf(res);
    if (res && res.count != null) s.totals[e.key] = Number(res.count);
    if (rows.length) { await save(e.key, rows.map((r) => ({ id: String(idOf(r, e)), data: r })).filter((r) => r.id && r.id !== 'undefined')); s.counts[e.key] = (s.counts[e.key] || 0) + rows.length; }
    // CoreBridge caps the page size (contacts: 50), so trust its pageCount when it sends one.
    const eff = Number(res && res.pageSize) || pageSize;
    const pc = res && res.pageCount != null ? Number(res.pageCount) : null;
    const last = !rows.length || (pc != null ? s.page - e.first + 1 >= pc : rows.length < eff);
    if (last) { s.i += 1; if (s.i >= ENTITIES.length) s.done = true; else s.page = ENTITIES[s.i].first; } else s.page += 1;
  }
  s.calls += calls;
  s.lastRunAt = new Date(now()).toISOString();
  return s;
}

export function historyPanel(st = newState(), { on = false } = {}) {
  const s = { ...newState(), ...st };
  const rows = ENTITIES.map((e, n) => {
    const got = s.counts[e.key] || 0, tot = s.totals[e.key] || 0;
    const pct = s.done || n < s.i ? 100 : tot ? Math.min(99, Math.round((got / tot) * 100)) : 0;
    return `<div style="display:grid;grid-template-columns:110px 1fr 150px;gap:10px;align-items:center;font-size:13px"><b>${e.label}</b><div style="height:10px;background:#eef1f5;border-radius:5px;overflow:hidden" role="progressbar" aria-label="${e.label} imported" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div style="height:100%;width:${pct}%;background:#1f6a43"></div></div><span>${got.toLocaleString('en-US')}${tot ? ' of ' + tot.toLocaleString('en-US') : ''}</span></div>`;
  }).join('');
  const status = s.done ? 'Finished' : on ? (s.calls ? 'Running About 3 Calls a Minute' : 'Starting') : s.calls ? 'Paused' : 'Not Started';
  return `<section class="panel" aria-label="Full history import" id="history"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h2 style="margin:0;font-size:15px">Full History Import</h2><span class="pill" style="background:${s.done ? '#e6f2ec' : on ? '#e8f0fb' : '#eef1f5'};color:${s.done ? '#1f6a43' : on ? '#1d4f91' : '#3d4658'}">${status}</span></div>
<p style="margin:6px 0 10px;font-size:13px;color:var(--mute)">Customers, contacts, estimates and orders, read-only. Paced so it never crowds CoreBridge. ${s.calls.toLocaleString('en-US')} calls so far${s.lastRunAt ? ' · last run ' + esc(new Date(s.lastRunAt).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) : ''}.${s.lastError ? ' Last problem: ' + esc(s.lastError) : ''}</p>
<div style="display:flex;flex-direction:column;gap:8px">${rows}</div>
<form method="post" action="/admin/history" style="margin-top:10px"><input type="hidden" name="on" value="${on ? '0' : '1'}"><button class="btn${on ? '' : ' primary'}">${on ? 'Pause Import' : s.calls ? 'Resume Import' : 'Start Full History Import'}</button></form></section>`;
}

let D;
export async function saveRecords(entity, recs, { table = process.env.TABLE, loc = 'nky' } = {}) {
  if (!D) { const m = await import('@aws-sdk/client-dynamodb'); D = { m, c: new m.DynamoDBClient({}) }; }
  const phones = recs.flatMap((r) => phoneEntries(entity, r.data)).map((e) => ({ sk: `PHONE#${e.phone}`, data: e }));
  const idx = recs.flatMap((r) => indexEntries(entity, r.data));
  const all = [...recs.map((r) => ({ sk: `CB#${entity}#${r.id}`, data: r.data })), ...phones, ...idx];
  for (let n = 0; n < all.length; n += 25) {
    const chunk = all.slice(n, n + 25);
    let req = { [table]: chunk.map((r) => ({ PutRequest: { Item: { pk: { S: `LOC#${loc}` }, sk: { S: r.sk }, location: { S: loc }, data: { S: JSON.stringify(r.data) } } } })) };
    for (let tries = 0; tries < 5 && req && Object.keys(req).length; tries++) {
      const out = await D.c.send(new D.m.BatchWriteItemCommand({ RequestItems: req }));
      req = out.UnprocessedItems && Object.keys(out.UnprocessedItems).length ? out.UnprocessedItems : null;
      if (req) await new Promise((r) => setTimeout(r, 200 * (tries + 1)));
    }
  }
}
