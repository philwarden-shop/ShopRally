// XPS Ship connection (eCommerce REST API v1). Read only: SalesMax finds the labels bought for an order and brings back
// tracking + label cost. Auth header: "Authorization: RSIS <apiKey>". Decimals arrive as strings.
// Search: POST /restapi/v1/customers/:customerId/searchShipments  { keyword }  -> { shipments: [...] } (max 100)
export const XPS_BASE = 'https://xpsshipper.com/restapi/v1';

export async function xpsSearch({ customerId, apiKey, keyword, fetchFn = fetch }) {
  if (!customerId || !apiKey) throw new Error('XPS is not connected yet');
  const res = await fetchFn(`${XPS_BASE}/customers/${encodeURIComponent(customerId)}/searchShipments`, {
    method: 'POST', headers: { Authorization: `RSIS ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword: String(keyword) }),
  });
  if (!res.ok) { let msg = `XPS said ${res.status}`; try { const j = await res.json(); if (j && j.errorCategory) msg += ` (${j.errorCategory})`; } catch { /* ignore */ } throw new Error(msg); }
  const j = await res.json();
  return Array.isArray(j.shipments) ? j.shipments : [];
}

const ref = (s) => [s.shipperReference, s.shipperReference2, s.shipmentReference, s.fulfillment && s.fulfillment.orderId, ...(s.orderIds || [])].filter((x) => x != null).map(String);

// Shipments for this order: not voided, and the order number is in one of the reference fields.
export function matchShipments(shipments, orderNumber) {
  const o = String(orderNumber || '').trim();
  if (!o) return [];
  return shipments.filter((s) => !s.voided && ref(s).some((r) => r === o || r.replace(/^#/, '') === o));
}

export function shipmentToLabel(s) {
  const cost = Number(String(s.totalShippingCost ?? '').replace(/[$,]/g, ''));
  return { carrier: String(s.carrierCode || '').toUpperCase(), service: String(s.serviceCode || ''), tracking: String(s.trackingNumber || (s.trackingNumbers || [])[0] || ''), cost, bookNumber: s.bookNumber, date: s.shipmentDate || '' };
}

// Only labels we have not recorded yet (by tracking number, else book number).
export function newLabels(existing, shipments) {
  const seen = new Set(((existing && existing.labels) || []).map((l) => l.tracking || l.bookNumber));
  return shipments.map(shipmentToLabel).filter((l) => l.cost > 0 && (l.tracking || l.bookNumber) && !seen.has(l.tracking || l.bookNumber));
}

// Packages recorded by production (weight in lb, dimensions in inches). XPS wants numbers as strings.
export function packagesFromForm(f) {
  const out = [];
  for (let n = 0; n < 10; n++) {
    const w = String(f[`w${n}`] ?? '').trim();
    if (!w) continue;
    const num = (v, label) => { const s = String(v ?? '').trim(); if (!s) return null; if (!/^\d+(\.\d+)?$/.test(s) || Number(s) <= 0) throw new Error(`box ${n + 1}: ${label} must be a number`); return s; };
    const weight = num(w, 'weight');
    const length = num(f[`l${n}`], 'length'), width = num(f[`d${n}`], 'width'), height = num(f[`h${n}`], 'height');
    if ([length, width, height].filter(Boolean).length % 3 !== 0) throw new Error(`box ${n + 1}: enter all three sizes or none`);
    out.push({ weight, length, width, height, insuranceAmount: null, declaredValue: null });
  }
  if (!out.length) throw new Error('enter at least one box weight');
  return out;
}

// PUT /restapi/v1/customers/:customerId/integrations/:integrationId/orders/:orderId
export function buildPutOrder({ orderNumber, project, dest, packages, today, service = 'Standard' }) {
  if (!orderNumber) throw new Error('this project has no CoreBridge order number yet');
  if (!dest || !['Ship', 'Deliver'].includes(dest.type)) throw new Error('set the hand-off to Ship with an address first');
  if (!packages || !packages.length) throw new Error('record the boxes (weight and size) first');
  return {
    orderId: String(orderNumber), orderNumber: String(orderNumber), orderDate: today, orderGroup: null, fulfillmentStatus: 'pending', shippingService: service, shippingTotal: null, dueByDate: project.due || null,
    shipperReference: String(orderNumber), weightUnit: 'lb', dimUnit: 'in',
    receiver: { name: dest.name || project.contact || project.company, company: project.company || null, address1: dest.street, address2: null, city: dest.city, state: dest.state, zip: dest.zip, country: 'US', phone: null, email: null },
    packages, items: [{ productId: String(orderNumber), sku: null, title: String(project.name || '').slice(0, 100), price: String(project.total ?? '0'), quantity: 1, weight: null, imgUrl: null, htsNumber: null, countryOfOrigin: 'US', lineId: '1' }],
  };
}

export async function xpsPutOrder({ customerId, integrationId, apiKey, body, fetchFn = fetch }) {
  if (!customerId || !integrationId || !apiKey) throw new Error('XPS is not connected yet. Add the keys in Admin > Connected Apps');
  const res = await fetchFn(`${XPS_BASE}/customers/${encodeURIComponent(customerId)}/integrations/${encodeURIComponent(integrationId)}/orders/${encodeURIComponent(body.orderId)}`, { method: 'PUT', headers: { Authorization: `RSIS ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) { let msg = `XPS said ${res.status}`; try { const j = await res.json(); if (j && j.errorCategory) msg += ` (${j.errorCategory})`; } catch { /* ignore */ } throw new Error(msg); }
  return true;
}

// Phil's rule (Nov 12): to avoid duplicate XPS orders, a Ship order is NOT moved to BUILT in CoreBridge until the
// XPS label is bought (CoreBridge's own XPS integration fires on BUILT). It then stays BUILT until the daily reconciliation.
export function holdBuiltInCoreBridge(dest, ship) {
  return !!(dest && dest.type === 'Ship' && !(ship && ship.labels && ship.labels.length));
}

// Phil (Nov 12, 10:20): production moves each product line to Built. When every line is Built the order is Built,
// and that is what sends the order to XPS. Never in parallel mode, never twice, and only for Ship hand-offs with boxes.
export function xpsTrigger({ items, dest, ship, parallel, rules = {} }) {
  if (!items || !items.length || !items.every((i) => i.step === 'built' || i.step === 'done')) return { action: 'wait' };
  if (!dest || !(rules.types || ['Ship']).includes(dest.type)) return { action: 'skip' };
  if (rules.autoSend === false) return { action: 'skip', message: 'Automatic shipping is turned off (Workflow Builder).' };
  if (parallel) return { action: 'skip', message: 'Parallel mode is on, so nothing was sent for shipping.' };
  if (ship && ship.xpsOrder && ship.xpsOrder.ok) return { action: 'skip', message: 'This order was already sent for shipping.' };
  if (!ship || !ship.packages || !ship.packages.length) return { action: 'skip', message: 'The order is Built, but no shipping details are saved yet. Save them and it is sent for shipping.' };
  return { action: 'push' };
}
