// Data for the Projects slice. Every record carries its location (multi-location from day one).
// "demo" = made-up sample customers, safe to show anyone. "live" = read from CoreBridge, cached here.
import { cbRead, toProject } from './cb.mjs';

let D;
async function db() {
  if (globalThis.__SMX_FAKE_DB) return globalThis.__SMX_FAKE_DB;
  if (!D) { const m = await import('@aws-sdk/client-dynamodb'); D = { ...m, client: new m.DynamoDBClient({}) }; }
  return D;
}
const TABLE = process.env.TABLE;
// Current location for this request. Lambda runs one request at a time per container; index.mjs sets it on every request.
export let LOCATION = 'nky';
export function setLocation(l) { LOCATION = ['nky', 'two'].includes(l) ? l : 'nky'; }

export const LANES = [
  { key: 'prospect', name: 'Prospect' },
  { key: 'estimate', name: 'Estimate' },
  { key: 'progress', name: 'In production' },
  { key: 'built', name: 'Built' },
  { key: 'complete', name: 'Complete' },
];

const d = (offset) => { const t = new Date(Date.now() + offset * 86400000); return t.toISOString().slice(0, 10); };

// Sample data only in the test copy. Production sets DATA_MODE=live so no sample record ever shows.
export const sampleData = () => process.env.DATA_MODE !== 'live';

export function demoProjects() {
  if (!sampleData()) return [];
  const p = (id, lane, name, company, contact, total, due, priority, status, insight, items = []) =>
    ({ id: `demo-${id}`, location: LOCATION, lane, name, company, contact, total, due, priority, status, insight, items, salesperson: 'Kristin Ames', source: 'demo' });
  return [
    p(1, 'prospect', 'Hebron office signage', 'Riverbend Dental', 'Dana Ruiz', 6800, d(55), 'High', 'Site visit booked', 'Opening a 4th office in spring; wayfinding likely.'),
    p(2, 'prospect', 'Warehouse wall graphics', 'Tri-State Logistics', 'Marcus Lee', 14200, d(83), 'High', 'Visit 2 today', 'New Hebron warehouse opens Feb 1.'),
    p(3, 'prospect', 'Library event banners', 'Kenton County Library', 'Ann Cho', 1200, d(30), 'Medium', 'No visit yet', 'Seasonal events; repeat buyer last spring.'),
    p(4, 'estimate', 'Patio menu boards', 'Oakline Café', 'Sam Ortiz', 2350, d(21), 'Low', 'Estimate sent', 'Estimate opened twice, no reply in 4 days.'),
    p(5, 'estimate', 'Fleet vehicle wraps (3)', 'Northside HVAC', 'Gary Pike', 11900, d(40), 'High', 'Awaiting approval', 'Asked about financing; follow up today.'),
    { ...p(6, 'progress', 'Lobby sign and desk logo', 'Riverbend Dental', 'Dana Ruiz', 4280, d(3), 'High', 'Awaiting proof approval', 'Proof v3 sent this morning.',
      [{ name: 'Lobby sign, 26″ wide', status: 'AWAITING PROOF APPROVAL' }, { name: 'Desk logo, dimensional', status: 'IN PRODUCTION' }]), hardDue: true },
    p(7, 'progress', 'Grand opening banners', 'Florence Fitness', 'Jo Patel', 1640, d(5), 'Medium', 'In production', 'Install Friday 9 AM.',
      [{ name: '3×8 ft vinyl banner (2)', status: 'IN PRODUCTION' }]),
    p(8, 'built', 'ADA room signs (24)', 'Boone Medical Group', 'Lee Grant', 3920, d(2), 'Medium', 'Awaiting installation', 'Install scheduled Thursday.',
      [{ name: 'ADA signs with braille', status: 'AWAITING INSTALLATION' }]),
    p(9, 'complete', 'Window graphics', 'Main Street Books', 'Ivy Chen', 980, d(-6), 'Low', 'Installed', 'Ask for a review next week.'),
    p(10, 'progress', 'Wayfinding signs (8)', 'Kenton County Library', 'Ann Cho', 3150, d(2), 'Medium', 'Sales proof review', 'Repeat buyer; approved fast last time.'),
    p(11, 'progress', 'Warehouse wall graphic', 'Hartwell Builders', 'Mark Ellis', 5400, d(5), 'High', 'Production files', 'Mark approved v2 on the first send.'),
    p(12, 'progress', 'Spring event signage', 'Florence Realty Group', 'Lisa Moore', 2875, d(3), 'Medium', 'In production', 'One item waiting on artwork.'),
    p(13, 'progress', 'Menu board inserts', 'Oakline Café', 'Sam Ortiz', 640, d(0), 'Low', 'Proof review', 'Due today.'),
    p(14, 'progress', 'Van wraps (2)', 'Northside HVAC', 'Gary Pike', 7200, d(6), 'High', 'Planning', 'Needs vehicle photos before design.'),
  ];
}

export async function listProjects(mode) {
  if (mode !== 'live' && sampleData()) {
    let extra = [];
    try { const { client, GetItemCommand } = await db(); const out = await client.send(new GetItemCommand({ TableName: TABLE, Key: { pk: { S: `LOC#${LOCATION}` }, sk: { S: 'CONFIG#extra-projects' } } })); extra = out.Item ? JSON.parse(out.Item.data.S) : []; } catch { /* demo only */ }
    let ov = {};
    try { const { client, GetItemCommand } = await db(); const out = await client.send(new GetItemCommand({ TableName: TABLE, Key: { pk: { S: `LOC#${LOCATION}` }, sk: { S: 'CONFIG#lane-overrides' } } })); ov = out.Item ? JSON.parse(out.Item.data.S) : {}; } catch { /* none */ }
    return { projects: [...demoProjects(), ...extra].map((p) => (ov[p.id] ? { ...p, lane: ov[p.id].lane, status: ov[p.id].status } : p)), syncedAt: null };
  }
  const { client: ddb, QueryCommand, GetItemCommand } = await db();
  const out = await ddb.send(new QueryCommand({
    TableName: TABLE, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
    ExpressionAttributeValues: { ':pk': { S: `LOC#${LOCATION}` }, ':sk': { S: 'PROJECT#' } },
  }));
  const projects = (out.Items || []).map((i) => JSON.parse(i.data.S));
  const meta = await ddb.send(new GetItemCommand({ TableName: TABLE, Key: { pk: { S: `LOC#${LOCATION}` }, sk: { S: 'SYNC#projects' } } }));
  return { projects, syncedAt: meta.Item ? meta.Item.at.S : null };
}

export async function getProject(id, mode) {
  const { projects } = await listProjects(mode);
  return projects.find((x) => x.id === id) || null;
}

// Pull the newest estimates from CoreBridge into the cache. Read-only toward CoreBridge.
export async function syncFromCoreBridge({ deadline = Date.now() + 22000 } = {}) {
  const res = await cbRead('getEstimate', { page: 1, pageSize: 25, sort: 'id', direction: 'desc' }, { deadline });
  const rows = Array.isArray(res) ? res : (res.data || []);
  const { client: ddb, BatchWriteItemCommand, PutItemCommand } = await db();
  const projects = rows.map(toProject).filter((p) => p.lane !== 'closed').map((p) => ({ ...p, location: LOCATION }));
  for (let i = 0; i < projects.length; i += 25) {
    const chunk = projects.slice(i, i + 25);
    await ddb.send(new BatchWriteItemCommand({ RequestItems: { [TABLE]: chunk.map((p) => ({ PutRequest: { Item: {
      pk: { S: `LOC#${LOCATION}` }, sk: { S: `PROJECT#${p.id}` }, location: { S: LOCATION }, data: { S: JSON.stringify(p) },
    } } })) } }));
  }
  const at = new Date().toISOString();
  await ddb.send(new PutItemCommand({ TableName: TABLE, Item: { pk: { S: `LOC#${LOCATION}` }, sk: { S: 'SYNC#projects' }, at: { S: at }, count: { N: String(projects.length) } } }));
  return { count: projects.length, at };
}

export function groupByLane(projects) {
  return LANES.map((l) => {
    const items = projects.filter((p) => p.lane === l.key);
    return { ...l, items, total: items.reduce((s, p) => s + (p.total || 0), 0) };
  });
}

// Save imported projects into the cache that Live mode reads.
export async function saveProjects(projects) {
  const { client: ddb, BatchWriteItemCommand } = await db();
  const list = projects.map((p) => ({ ...p, location: LOCATION }));
  for (let i = 0; i < list.length; i += 25) {
    await ddb.send(new BatchWriteItemCommand({ RequestItems: { [TABLE]: list.slice(i, i + 25).map((p) => ({ PutRequest: { Item: { pk: { S: `LOC#${LOCATION}` }, sk: { S: `PROJECT#${p.id}` }, location: { S: LOCATION }, data: { S: JSON.stringify(p) } } } })) } }));
  }
  return list.length;
}
