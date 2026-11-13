// Admin > Modifier Price List, and Prospects (claim rules) for the test copy.
// Settings live in the app's DynamoDB table (pk LOC#<location>, sk CONFIG#<name>) so no new permissions are needed.
import { readFileSync } from 'node:fs';
import { page, esc } from './views.mjs';
import { LOCATION } from './data.mjs';
import { modFields, priceRows, clean } from './modui.mjs';
import { canClaim, claimStatus, CLAIM_RULES } from './claims.mjs';

let D;
async function db() {
  if (globalThis.__SMX_FAKE_DB) return globalThis.__SMX_FAKE_DB;
  if (!D) { const m = await import('@aws-sdk/client-dynamodb'); D = { ...m, client: new m.DynamoDBClient({}) }; }
  return D;
}
const TABLE = process.env.TABLE;
export async function getConfig(name, fallback) {
  const { client, GetItemCommand } = await db();
  const out = await client.send(new GetItemCommand({ TableName: TABLE, Key: { pk: { S: `LOC#${LOCATION}` }, sk: { S: `CONFIG#${name}` } } }));
  return out.Item ? JSON.parse(out.Item.data.S) : fallback;
}
export async function putConfig(name, value) {
  const { client, PutItemCommand } = await db();
  await client.send(new PutItemCommand({ TableName: TABLE, Item: { pk: { S: `LOC#${LOCATION}` }, sk: { S: `CONFIG#${name}` }, data: { S: JSON.stringify(value) }, at: { S: new Date().toISOString() } } }));
}

let SUGG;
export function suggestions(load = () => JSON.parse(readFileSync(new URL('./mod-price-suggestions.json', import.meta.url), 'utf8'))) {
  if (!SUGG) { try { SUGG = load().items || []; } catch { SUGG = []; } }
  return SUGG;
}
const unq = clean;
const key = (g, f, c) => `${g}|${f}|${c}`;

// Merge one group's posted rows into the saved list. Blank price = not priced (entry removed).
export function mergePriceForm(list, group, form) {
  const keep = list.filter((e) => e.group !== group);
  const n = Math.min(500, Number(form.rows) || 0);
  for (let i = 0; i < n; i++) {
    const price = form[`p${i}`] === '' || form[`p${i}`] == null ? null : Number(form[`p${i}`]);
    if (price == null || !(price >= 0)) continue;
    const cost = form[`c${i}`] === '' || form[`c${i}`] == null ? null : Number(form[`c${i}`]);
    const how = ['sign', 'qty', 'min', 'order'].includes(form[`h${i}`]) ? form[`h${i}`] : 'sign';
    keep.push({ group, field: String(form[`f${i}`] || '').slice(0, 120), choice: String(form[`o${i}`] || '').slice(0, 120), how, cost: cost >= 0 ? cost : null, price });
  }
  return keep;
}

const INP = 'font:inherit;font-size:13px;min-height:34px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px;background:#fff;width:100%;box-sizing:border-box';
export function priceListPage({ user, group, list, fill = false, flash = '' }) {
  const mf = modFields();
  const groups = Object.keys(mf.groups).filter((g) => priceRows(g, mf).length).sort();
  const g = groups.includes(group) ? group : (groups.includes('PRODUCTION (RIGID)') ? 'PRODUCTION (RIGID)' : groups[0]);
  const saved = new Map(list.filter((e) => e.group === g).map((e) => [key(e.group, e.field, e.choice), e]));
  const sug = new Map(suggestions().map((s) => [key(unq(s.group), unq(s.field), unq(s.choice)), s]));
  const rows = g ? priceRows(g, mf) : [];
  const body = `<div class="wrap"><div class="panel">
  <h1 style="margin:0 0 4px">Modifier Price List</h1>
  <p style="color:var(--mute);margin:0 0 12px">What each modifier choice adds to an estimate. SalesMax works out the charge and sends it to CoreBridge as a priced line on the product. Fields and choices come from your CoreBridge order history${mf.pulled ? ` (pulled ${esc(mf.pulled)})` : ''}.</p>
  ${flash ? `<div class="note">${esc(flash)}</div>` : ''}
  <form method="get" action="/admin/modifier-prices" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px">
    <label style="font-size:13px;font-weight:600">Modifier group <select name="g" style="${INP};width:auto">${groups.map((x) => `<option${x === g ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
    <button class="btn">Show</button>
    <button class="btn" name="fill" value="1" title="Fills empty prices with what CoreBridge charged on past orders. Nothing is saved until you click Save.">Fill from Past Orders</button>
  </form>
  ${fill ? '<div class="note">Suggested prices from past orders are filled in where the price was empty. Check them, then Save. Nothing is saved yet.</div>' : ''}
  <form method="post" action="/admin/modifier-prices?g=${encodeURIComponent(g || '')}">
  <input type="hidden" name="group" value="${esc(g)}"><input type="hidden" name="rows" value="${rows.length}">
  <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:760px">
  <thead><tr style="text-align:left;color:#5a6478;font-size:12px"><th style="padding:6px 8px 6px 0">Field</th><th>Choice</th><th style="width:150px">Charged</th><th style="width:90px">Cost</th><th style="width:90px">Price</th><th>Past orders</th></tr></thead>
  <tbody>${rows.map((r, i) => {
    const e = saved.get(key(g, r.field, r.choice)); const s = sug.get(key(g, r.field, r.choice));
    const price = e ? e.price : (fill && s ? s.suggestedPrice : '');
    const how = e ? e.how : r.how;
    return `<tr style="border-top:1px solid #eef1f5"><td style="padding:6px 8px 6px 0;font-weight:600">${esc(r.field)}<input type="hidden" name="f${i}" value="${esc(r.field)}"><input type="hidden" name="o${i}" value="${esc(r.choice)}"></td>
      <td>${r.choice === '*' ? '<span style="color:#5a6478">Amount typed</span>' : esc(r.choice)}</td>
      <td><select name="h${i}" style="${INP}">${[['sign', 'Per sign'], ['qty', 'Per number typed'], ['min', 'Per minute'], ['order', 'Once per order']].map(([v, t]) => `<option value="${v}"${v === how ? ' selected' : ''}>${t}</option>`).join('')}</select></td>
      <td><input name="c${i}" inputmode="decimal" value="${e && e.cost != null ? esc(e.cost) : ''}" placeholder="$" style="${INP}"></td>
      <td><input name="p${i}" inputmode="decimal" value="${esc(price)}" placeholder="$" style="${INP}${fill && !e && s ? ';background:#fdf8e7' : ''}"></td>
      <td style="color:#5a6478">${s ? `$${Number(s.suggestedPrice).toFixed(2)}${r.choice === '*' ? (r.how === 'min' ? '/min' : ' each') : ''} · ${s.basedOn} lines` : '—'}</td></tr>`;
  }).join('')}</tbody></table></div>
  <div style="display:flex;gap:10px;align-items:center;margin-top:12px"><button class="btn primary" name="do" value="save">Save Prices<span style="font-weight:500"> · ${esc(g)}</span></button><span style="font-size:12px;color:var(--mute)">Blank price = not priced yet; the estimate will flag it. Changes apply to new estimates only.</span></div>
  </form></div></div>`;
  return page({ title: 'Modifier Price List', user, tab: '', body });
}

// --- Prospects: claim untapped businesses within the rules ---
export const DEMO_BUSINESSES = [
  ['crestview-dental', 'Crestview Hills Family Dental', 'Dental & medical offices', 6.2, 94],
  ['nky-ford', 'Northern Kentucky Ford', 'Auto dealers & repair', 4.8, 91],
  ['boone-builders', 'Boone County Builders Supply', 'Construction & contractors', 3.1, 89],
  ['hebron-park', 'Hebron Commerce Park', 'Manufacturing & warehouses', 7.5, 88],
  ['florence-ortho', 'Florence Orthodontics', 'Dental & medical offices', 2.4, 86],
  ['ludlow-realty', 'Ludlow Realty Partners', 'Real estate', 9.8, 81],
].map(([id, name, industry, miles, score]) => ({ id, name, industry, miles, score }));
export const DEMO_CLAIMS = [
  { business: 'nky-ford', owner: 'kristin', claimedAt: '2026-11-03', touches: [{ type: 'call', at: '2026-11-04' }] },
  { business: 'ludlow-realty', owner: 'marcus', claimedAt: '2026-10-01', touches: [{ type: 'personal_email', at: '2026-10-02' }] },
];
export const personOf = (user) => String(user?.email || 'me').split('@')[0].split('.')[0].toLowerCase();

export function prospectsPage({ user, claims, today, flash = '' }) {
  const me = personOf(user);
  const rows = DEMO_BUSINESSES.map((b) => {
    const open = claims.find((c) => c.business === b.id && !c.releasedAt);
    const can = canClaim({ person: me, business: b.id, claims, today });
    let action;
    if (open && open.owner === me) { const st = claimStatus(open, today); action = `<span style="font-size:12px;font-weight:600;color:#1f6a43;background:#e6f2ec;border-radius:10px;padding:3px 9px">Yours · ${esc(st.why)}</span> <button class="btn" name="release" value="${esc(b.id)}">Release</button> <button class="btn" name="touch" value="${esc(b.id)}" title="Log a call (demo)">Log a call</button>`; }
    else if (open) { const st = claimStatus(open, today); action = `<span style="font-size:12px;color:#5a6478">${esc(open.owner)} is working this · back in the pool by ${esc(st.progressBy)} without a meeting or quote</span>`; }
    else action = can.ok ? `<button class="btn primary" name="claim" value="${esc(b.id)}">Add as Prospect</button>` : `<span style="font-size:12px;color:#874511">${esc(can.say)}</span>`;
    return `<li style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:10px 0;border-top:1px solid #eef1f5"><b style="width:40px">${b.score}</b><div style="flex:1 1 260px"><div style="font-weight:600">${esc(b.name)}</div><div style="font-size:12px;color:#5a6478">${esc(b.industry)} · ${b.miles} mi</div></div><div>${action}</div></li>`;
  }).join('');
  const mine = claims.filter((c) => c.owner === me && !c.releasedAt).length;
  const actions = claims.filter((c) => !c.releasedAt).map((c) => ({ c, st: claimStatus(c, today) })).filter((x) => x.st.action);
  const body = `<div class="wrap"><div class="panel">
  <h1 style="margin:0 0 4px">Untapped Businesses</h1>
  <p style="color:var(--mute);margin:0 0 10px">You have ${mine} of ${CLAIM_RULES.maxOpen} open prospects (${CLAIM_RULES.maxPerWeek} new claims a week). Claim only what you can work: a real first touch within ${CLAIM_RULES.firstTouchBizDays} business days, a touch every ${CLAIM_RULES.keepAliveDays} days, and a meeting or quote within ${CLAIM_RULES.progressDays} days, or it goes back to the pool.</p>
  ${flash ? `<div class="note">${esc(flash)}</div>` : ''}
  <form method="post" action="/prospects"><ol style="list-style:none;margin:0;padding:0">${rows}</ol></form>
  <h2 style="font-size:15px;margin:18px 0 6px">Tonight's Claim Check <span style=\"font-weight:500;font-size:12px;color:#5a6478\">· what the nightly job would do</span></h2>
  ${actions.length ? `<ul style="margin:0;padding-left:18px;line-height:1.7;font-size:13px">${actions.map(({ c, st }) => `<li><b>${esc(st.action === 'release' ? 'Return to pool' : st.action === 'alert_manager' ? 'Alert manager' : 'Remind')}</b>: ${esc(DEMO_BUSINESSES.find((b) => b.id === c.business)?.name || c.business)} (${esc(c.owner)}). ${esc(st.why)}</li>`).join('')}</ul>` : '<p style="font-size:13px;color:var(--mute)">Nothing due.</p>'}
  <p style="font-size:12px;color:var(--mute)">Test copy: no messages are sent. <form method="post" action="/prospects" style="display:inline"><button class="btn" name="reset" value="1">Reset Demo Claims</button></form></p>
  </div></div>`;
  return page({ title: 'Untapped Businesses', user, tab: 'Customers', body });
}

// Apply a claim/release/touch to the claims list (pure).
export function applyClaimAction(claims, { action, business, person, today }) {
  if (action === 'claim') {
    const can = canClaim({ person, business, claims, today });
    if (!can.ok) return { claims, flash: can.say };
    return { claims: [...claims, { business, owner: person, claimedAt: today, touches: [] }], flash: 'Added as your prospect. First real touch is due in 2 business days.' };
  }
  const i = claims.findIndex((c) => c.business === business && c.owner === person && !c.releasedAt);
  if (i < 0) return { claims, flash: 'That one is not yours.' };
  const next = claims.slice();
  if (action === 'release') { next[i] = { ...next[i], releasedAt: today, releasedBy: person }; return { claims: next, flash: 'Released back to the pool.' }; }
  if (action === 'touch') { next[i] = { ...next[i], touches: [...(next[i].touches || []), { type: 'call', at: today }] }; return { claims: next, flash: 'Call logged.' }; }
  return { claims, flash: '' };
}

// Reset the sample data people changed while trying the test copy. Keeps Admin settings, prices and the published workflow.
export const KEEP_ON_RESET = ['admin-settings', 'modifier-prices', 'workflow-published', 'feedback'];
export async function resetDemoConfig(keep = KEEP_ON_RESET) {
  const { client, QueryCommand, BatchWriteItemCommand } = await db();
  const out = await client.send(new QueryCommand({ TableName: TABLE, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)', ExpressionAttributeValues: { ':pk': { S: `LOC#${LOCATION}` }, ':sk': { S: 'CONFIG#' } } }));
  const del = (out.Items || []).filter((i) => !keep.includes(i.sk.S.slice(7)));
  for (let n = 0; n < del.length; n += 25) await client.send(new BatchWriteItemCommand({ RequestItems: { [TABLE]: del.slice(n, n + 25).map((i) => ({ DeleteRequest: { Key: { pk: i.pk, sk: i.sk } } })) } }));
  return del.length;
}
