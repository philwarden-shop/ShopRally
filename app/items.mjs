// Items (product lines) and where they are in the workflow. Each item moves on its own.
// Demo items are sample data; their moves are saved so a demo can be walked through and reset.
import { stepById, nextSteps, orderCbStatus } from './workflow.mjs';
import { LOCATION, demoProjects, sampleData } from './data.mjs';

let D;
async function db() {
  if (globalThis.__SMX_FAKE_DB) return globalThis.__SMX_FAKE_DB;
  if (!D) { const m = await import('@aws-sdk/client-dynamodb'); D = { ...m, client: new m.DynamoDBClient({}) }; }
  return D;
}
const TABLE = process.env.TABLE;

const day = (n) => { const t = new Date(Date.now() + n * 86400000); return t.toISOString().slice(0, 10); };

// Sample items tied to the demo projects (demo-6 to demo-14).
export function demoItems() {
  if (!sampleData()) return [];
  const it = (id, projectId, order, idx, name, step, person, due, extra = {}) => ({ id, projectId, ref: `Order ${order} · Item ${idx}`, name, step, person, due, location: LOCATION, ...extra });
  return [
    it('i61', 'demo-6', 9840, 1, 'Lobby sign, 26″ wide', 'proofwait', 'Kristin Wellbrock', day(1), { rush: true, note: 'Proof v3 sent this morning.', proof: 'V3' }),
    it('i62', 'demo-6', 9840, 2, 'Desk logo, dimensional', 'vended', 'Phil Warden', day(3), { note: 'Acrylic from vendor arrives Wed.', station: 'Vendor', qty: 1, vendorEta: day(6) }),
    it('i63', 'demo-6', 9840, 3, 'Installation', 'built', 'Install crew A', day(4), { handoff: 'Install', note: 'Fri 9:00 AM, rear door.' }),
    it('i71', 'demo-7', 9858, 1, 'Grand opening banner 3×8 (2)', 'wip', 'Mike (print)', day(2), { station: 'Solvent', qty: 2, handoff: 'Install' }),
    it('i72', 'demo-7', 9858, 2, 'Window perf, front door', 'indesign', 'Abbey', day(1), { note: 'Use the new logo file.' }),
    it('i81', 'demo-8', 9848, 1, 'ADA room signs (24)', 'built', 'Install crew A', day(2), { handoff: 'Install', qty: 24, note: 'Install Thursday.' }),
    it('i91', 'demo-9', 9833, 1, 'Window graphics', 'done', 'Abbey', day(-6), { handoff: 'Install' }),
    it('i51', 'demo-14', 9861, 1, 'Van wrap, driver side', 'prep', 'Justin', day(6), { note: 'Need vehicle photos.' }),
    it('i52', 'demo-14', 9861, 2, 'Van wrap, passenger side', 'queue', 'Unassigned', day(6), { note: 'Photos in; ready for a designer.' }),
    it('i41', 'demo-13', 9862, 1, 'Patio menu board inserts', 'proofqc', 'Abbey', day(0), { note: 'Automatic check running.' }),
    it('i11', 'demo-10', 9863, 1, 'Wayfinding set (8)', 'salesrev', 'Kristin Wellbrock', day(2), { qty: 8 }),
    it('i21', 'demo-11', 9864, 1, 'Warehouse wall graphic', 'files', 'Kristin Wellbrock', day(5), { note: 'Approved v2 by Mark.' }),
    it('i31', 'demo-12', 9865, 1, 'Event banners (4)', 'wip', 'Mike (print)', day(3), { station: 'Solvent', qty: 4, handoff: 'Pickup' }),
    it('i32', 'demo-12', 9865, 2, 'A-frame inserts (2)', 'wip', 'Luis (fab)', day(-1), { station: 'Router', qty: 2, handoff: 'Pickup', note: 'Router bit replaced; back on track.' }),
    it('i33', 'demo-12', 9865, 3, 'Yard signs (50)', 'qc', 'Phil Warden', day(0), { station: 'Flatbed', qty: 50, handoff: 'Pickup' }),
    it('i34', 'demo-12', 9865, 4, 'Easel sign', 'hold', 'Mike (print)', day(1), { holdReason: 'Waiting for artwork', heldFrom: 'wip' }),
  ];
}

export function customerOf(projectId) {
  return demoProjects().find((p) => p.id === projectId)?.company || '';
}

// Apply saved moves on top of the seed.
export async function listItems({ loadState = loadSavedState } = {}) {
  const saved = await loadState();
  return demoItems().map((it) => ({ ...it, ...(saved[it.id] || {}), customer: customerOf(it.projectId) }));
}

async function loadSavedState() {
  const { client, QueryCommand } = await db();
  const out = await client.send(new QueryCommand({
    TableName: TABLE, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
    ExpressionAttributeValues: { ':pk': { S: `LOC#${LOCATION}` }, ':sk': { S: 'DEMOITEM#' } },
  }));
  const map = {};
  for (const i of out.Items || []) map[i.sk.S.slice(9)] = JSON.parse(i.data.S);
  return map;
}

// Decide what a move does. Pure, so it can be tested. Returns the new item fields and the log line.
export function planMove(item, toId, { reason, by, note, now = new Date().toISOString() } = {}) {
  const to = stepById(toId);
  if (!to) throw new Error('unknown step');
  const allowed = nextSteps(item.step, item.heldFrom).some((s) => s.id === toId);
  if (!allowed) throw new Error(`can't move from ${stepById(item.step)?.name} to ${to.name}`);
  if (toId === 'hold' && !reason) throw new Error('pick a hold reason');
  const fields = { step: toId, movedAt: now, holdReason: toId === 'hold' ? reason : null, heldFrom: toId === 'hold' ? item.step : null };
  // Sent back to In design after a proof exists = a Design Revision. The tag counts rounds and clears once the proof is approved.
  if (toId === 'indesign' && ['proofqc', 'salesrev', 'proofwait', 'qc'].includes(item.step)) fields.revision = (item.revision || 0) + 1;
  if (toId === 'files') fields.revision = 0;
  if (note) fields.note = String(note).slice(0, 1000);
  // Only Built and Complete are sent to CoreBridge; every other move stays in SalesMax.
  const cb = to.cb || null;
  const log = { itemId: item.id, from: item.step, to: toId, by, at: now, cbWouldPush: cb, reason: reason || null };
  return { fields, log };
}

export async function moveItem(id, toId, { reason, by, note } = {}) {
  const items = await listItems();
  const item = items.find((x) => x.id === id);
  if (!item) throw new Error('item not found');
  const { fields, log } = planMove(item, toId, { reason, by, note });
  const { client, PutItemCommand } = await db();
  await client.send(new PutItemCommand({ TableName: TABLE, Item: { pk: { S: `LOC#${LOCATION}` }, sk: { S: `DEMOITEM#${id}` }, location: { S: LOCATION }, data: { S: JSON.stringify(fields) } } }));
  await client.send(new PutItemCommand({ TableName: TABLE, Item: { pk: { S: `LOC#${LOCATION}` }, sk: { S: `LOG#${log.at}#${id}` }, location: { S: LOCATION }, data: { S: JSON.stringify(log) } } }));
  return { item: { ...item, ...fields }, log };
}

export async function recentLog(limit = 12) {
  const { client, QueryCommand } = await db();
  const out = await client.send(new QueryCommand({
    TableName: TABLE, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)', ScanIndexForward: false, Limit: limit,
    ExpressionAttributeValues: { ':pk': { S: `LOC#${LOCATION}` }, ':sk': { S: 'LOG#' } },
  }));
  return (out.Items || []).map((i) => JSON.parse(i.data.S));
}

export async function resetDemo() {
  const { client, QueryCommand, BatchWriteItemCommand } = await db();
  for (const prefix of ['DEMOITEM#', 'LOG#']) {
    const out = await client.send(new QueryCommand({
      TableName: TABLE, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)', ProjectionExpression: 'pk, sk',
      ExpressionAttributeValues: { ':pk': { S: `LOC#${LOCATION}` }, ':sk': { S: prefix } },
    }));
    const keys = out.Items || [];
    for (let i = 0; i < keys.length; i += 25) {
      await client.send(new BatchWriteItemCommand({ RequestItems: { [TABLE]: keys.slice(i, i + 25).map((k) => ({ DeleteRequest: { Key: { pk: k.pk, sk: k.sk } } })) } }));
    }
  }
}

export function projectCbStatus(items, projectId) {
  return orderCbStatus(items.filter((i) => i.projectId === projectId));
}
