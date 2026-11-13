// Renders signed-in pages with sample data (in-memory table, test key) and writes HTML files for visual QA.
// Not part of the test run. Usage: node test/snapshot.mjs <outdir> <path> [<path> ...]
import { mkdirSync, writeFileSync } from 'node:fs';
process.env.ALLOWED_EMAILS = 'phil.warden@fastsigns.com'; process.env.TABLE = 'fake'; process.env.USER_POOL_ID = 'us-east-2_TEST';
class Cmd { constructor(input) { this.input = input; } }
class GetItemCommand extends Cmd {} class PutItemCommand extends Cmd {} class QueryCommand extends Cmd {} class BatchWriteItemCommand extends Cmd {} class DeleteItemCommand extends Cmd {}
const store = new Map(); const k = (key) => `${key.pk.S}|${key.sk.S}`;
const client = { async send(c) { const i = c.input;
  if (c instanceof GetItemCommand) return { Item: store.get(k(i.Key)) };
  if (c instanceof PutItemCommand) { store.set(k(i.Item), i.Item); return {}; }
  if (c instanceof QueryCommand) { const pk = i.ExpressionAttributeValues[':pk'].S, sk = i.ExpressionAttributeValues[':sk']?.S || ''; let it = [...store.values()].filter((x) => x.pk.S === pk && x.sk.S.startsWith(sk)); if (i.ScanIndexForward === false) it.reverse(); return { Items: i.Limit ? it.slice(0, i.Limit) : it }; }
  if (c instanceof BatchWriteItemCommand) { for (const reqs of Object.values(i.RequestItems)) for (const r of reqs) { if (r.PutRequest) store.set(k(r.PutRequest.Item), r.PutRequest.Item); if (r.DeleteRequest) store.delete(k(r.DeleteRequest.Key)); } return {}; }
  return {}; } };
globalThis.__SMX_FAKE_DB = { client, GetItemCommand, PutItemCommand, QueryCommand, BatchWriteItemCommand, DeleteItemCommand };
globalThis.__SMX_TEST_KEY = 'snapshot-key';
const { sign } = await import('../app/auth.mjs');
const { handler } = await import('../app/index.mjs');
const { portalToken } = await import('../app/proofs.mjs');
const host = 'salesmax-test.example';
const session = sign({ email: 'phil.warden@fastsigns.com', name: 'Phil Warden', exp: Date.now() + 3600000 }, 'snapshot-key');
const [out, ...paths] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
for (const p of paths) {
  let [path, qs] = p.split('?');
  let cookies = [`smx_session=${session}`];
  if (path === '/portal') { path = `/p/${portalToken('demo-10', 'snapshot-key')}`; cookies = []; }
  const r = await handler({ rawPath: path, queryStringParameters: qs ? Object.fromEntries(new URLSearchParams(qs)) : undefined, cookies, headers: { host }, requestContext: { http: { method: 'GET' } } });
  const name = (p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root') + '.html';
  writeFileSync(`${out}/${name}`, String(r.body || ''));
  console.log('SNAP', r.statusCode, name, String(r.body || '').length);
}
