// CoreBridge history import (READ ONLY). Runs in small resumable batches so it never hogs the shared CoreBridge slot.
// It only runs when the owner turns on "Allow history import" in Admin > Connections.
import { page, esc } from './views.mjs';
import { toProject } from './cb.mjs';

export async function importBatch({ read, save, state = {}, maxCalls = 20, pageSize = 50 }) {
  const s = { estimatesPage: 1, ordersPage: 1, estimatesDone: false, ordersDone: false, imported: 0, calls: 0, ...state };
  let calls = 0;
  while (calls < maxCalls && !(s.estimatesDone && s.ordersDone)) {
    const est = !s.estimatesDone;
    const op = est ? 'getEstimate' : 'getOrders';
    const pageKey = est ? 'estimatesPage' : 'ordersPage';
    const res = await read(op, { page: s[pageKey], pageSize, sort: 'id', direction: 'desc' });
    calls++;
    const rows = Array.isArray(res) ? res : (res && res.data) || [];
    if (rows.length) { const projects = rows.map(toProject).filter((p) => p.lane !== 'closed'); if (projects.length) await save(projects); s.imported += projects.length; }
    if (rows.length < pageSize) s[est ? 'estimatesDone' : 'ordersDone'] = true; else s[pageKey] += 1;
  }
  s.calls += calls;
  s.done = s.estimatesDone && s.ordersDone;
  return s;
}

export function importPage({ user, state = {}, allowed = false, flash = '' }) {
  const st = { imported: 0, calls: 0, ...state };
  const body = `<div class="wrap" style="max-width:760px"><div class="bar" style="padding:14px 0"><h1>Import From CoreBridge</h1></div>${flash ? `<div class="note" style="margin:0 0 12px;background:#e6f2ec;color:#1f6a43">${esc(flash)}</div>` : ''}
<section class="panel"><p style="margin:0 0 8px">Brings your estimates and orders into SalesMax, read-only. Nothing is changed in CoreBridge.</p>
<p style="margin:0 0 8px;font-size:13px;color:var(--mute)">It shares CoreBridge’s limit with your other automations (about 500 calls an hour), so each batch uses only 2 calls (up to 100 estimates or orders) and picks up where it left off.</p>
<div class="kv"><div>Imported so far</div><div>${st.imported} projects</div><div>CoreBridge calls used</div><div>${st.calls}</div><div>Status</div><div>${st.done ? 'Finished' : st.calls ? 'Part way' : 'Not started'}</div></div></section>
${allowed ? `<form method="post" action="/admin/import"><button class="btn primary" ${st.done ? 'disabled' : ''}>Run the Next Batch</button></form>` : '<div class="note" style="margin:0;background:#fdf3dc;color:#5c4300">Turned off. The owner can allow it in Admin Settings, Connections.</div>'}</div>`;
  return page({ title: 'Import From CoreBridge', user, tab: '', body });
}
