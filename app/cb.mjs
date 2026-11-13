// CoreBridge READ access through the shared connector Lambda.
// The connector spaces every request across all automations, so a call can be
// "held" for a few seconds. We retry until a deadline, then give up cleanly.
import { randomUUID } from 'node:crypto';

// AWS SDK is loaded lazily so unit tests run without it.
let sdk;
async function aws() {
  if (!sdk) {
    const L = await import('@aws-sdk/client-lambda');
    const S = await import('@aws-sdk/client-s3');
    sdk = { L, S, lambda: new L.LambdaClient({}), s3: new S.S3Client({}) };
  }
  return sdk;
}
const FN = process.env.COREBRIDGE_READ_FUNCTION;
const BUCKET = process.env.COREBRIDGE_EVIDENCE_BUCKET;

export const READ_OPS = new Set([
  'getEstimate', 'getOrders', 'getOrderById', 'getOrderHistory', 'getOrderProductByPathId',
  'getAllStatus', 'getAvailableSubStatus', 'getDestinationsByOrderId', 'getCustomerPortalLink',
  'getCustomerById', 'getSalespersons', 'getLocations', 'getOrdersByStatusAndDate', 'getReferralTypes',
  // Nov 10: catalog lookups and the no-save price check for Build estimate.
  'searchParts', 'searchModifiers', 'priceConfiguredOrder', 'getOrderOriginations',
  // Nov 12: full history import (POST searches are reads in the connector registry).
  'searchCustomers', 'searchContacts', 'searchOrders',
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A held attempt can itself take ~10 s inside the connector (seen Nov 10), so only retry when there is room for another.
export const ATTEMPT_MS = 11000;
export async function cbRead(op, params, { body, interactive = false, deadline = Date.now() + 20000, invoke = rawInvoke, fetchEvidence = readEvidence, attemptMs = ATTEMPT_MS } = {}) {
  if (!READ_OPS.has(op)) throw new Error(`not an allowed read: ${op}`);
  while (Date.now() < deadline) {
    const res = await invoke({ operation: op, request_id: `salesmax2-${randomUUID()}`, ...(params ? { params } : {}), ...(body ? { body } : {}), ...(interactive ? { priority: 'interactive' } : {}) });
    if (res.reason === 'TenantRateHeld') { if (Date.now() + attemptMs + 1500 > deadline) break; await sleep(1500); continue; }
    if (res.status === 'http_error' && res.error_key) {
      // CoreBridge validation replies (e.g. "Modifier 11 is not related to part 45.") come back as 400s; pass them on.
      try { const j = JSON.parse(await fetchEvidence(res.error_key)); if (j && j.IsSuccess === false) return j; } catch { /* fall through */ }
    }
    if (res.status !== 'completed_read') {
      const err = new Error(`CoreBridge ${op} failed: ${res.status} ${res.http_status || ''} ${res.reason || ''}`.trim());
      err.code = res.http_status || res.reason || res.status;
      throw err;
    }
    const text = await fetchEvidence(res.evidence_key);
    return JSON.parse(text);
  }
  const err = new Error(`CoreBridge ${op} is busy; try again shortly`);
  err.code = 'busy';
  throw err;
}

async function rawInvoke(payload) {
  const { L, lambda } = await aws();
  const out = await lambda.send(new L.InvokeCommand({ FunctionName: FN, Payload: Buffer.from(JSON.stringify(payload)) }));
  return JSON.parse(Buffer.from(out.Payload).toString('utf8'));
}

async function readEvidence(key) {
  const { S, s3 } = await aws();
  const out = await s3.send(new S.GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return await out.Body.transformToString('utf8');
}

// CoreBridge dates come as { DateText, Year, Month, Day, Hour, Minute }.
export function cbDate(d) {
  if (!d || !d.Year || d.Year < 1900) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.Year}-${p(d.Month)}-${p(d.Day)}`;
}

// Map a CoreBridge estimate/order record onto a SalesMax project card.
export function toProject(o) {
  const status = String(o.Status || '').toUpperCase();
  const lane = laneFor(status);
  return {
    id: `cb-${o.OrderId}`,
    orderId: o.OrderId,
    name: o.OrderDescription || 'Untitled project',
    company: o.CompanyName || o.CompnayName || '',
    contact: o.OrderContact || '',
    salesperson: o.OrderSalesPerson || '',
    total: Number(o.OrderTotal || 0),
    status,
    lane,
    created: cbDate(o.DateCreated),
    due: cbDate(o.OrderDueDate) || cbDate(o.EstimateProjectedOrderDueDate),
    itemIds: o.ExOrderProductIDs || [],
    source: 'corebridge',
  };
}

export function laneFor(status) {
  if (status === 'ESTIMATE') return 'estimate';
  if (['BUILT'].includes(status)) return 'built';
  if (['COMPLETED', 'COMPLETE', 'CLOSED', 'INVOICED', 'PAID IN FULL'].includes(status)) return 'complete';
  if (['VOIDED', 'CANCELLED', 'LOST'].includes(status)) return 'closed';
  return 'progress';
}
