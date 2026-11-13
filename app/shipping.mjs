// Hand-off destination address on the project (shown on the estimate and invoice), and XPS shipping charges.
// XPS: when the label is bought, its cost comes back. SalesMax adds cost + Admin markup (+ handling) as a Shipping line,
// and the order cannot be marked Complete until that charge is on the CoreBridge order (writes are off in the test copy).
import { esc } from './views.mjs';

export const HANDOFFS = ['Pickup', 'Install', 'Deliver', 'Ship'];
const ZIP = /^\d{5}(-\d{4})?$/;

export function setDestination(f0, saved = []) {
  const pick = f0.saved !== undefined && f0.saved !== '' ? saved[Number(f0.saved)] : null;
  const f = pick ? { ...f0, name: pick.name, phone: f0.phone || pick.phone || '', street: pick.street, city: pick.city, state: pick.state, zip: pick.zip } : f0;
  const type = HANDOFFS.includes(f.type) ? f.type : null;
  if (!type) throw new Error('pick how this order is handed off');
  if (type === 'Pickup') return { type, name: '', street: '', city: '', state: '', zip: '', note: String(f.note || '').trim().slice(0, 200) };
  const d = { type, name: String(f.name || '').trim().slice(0, 80), street: String(f.street || '').trim().slice(0, 120), city: String(f.city || '').trim().slice(0, 60), state: String(f.state || '').trim().toUpperCase(), zip: String(f.zip || '').trim(), phone: String(f.phone || '').trim().slice(0, 25), note: String(f.note || '').trim().slice(0, 200) };
  if (d.phone && !/^[0-9()+.\-\s]{7,25}$/.test(d.phone)) throw new Error('the phone number should be digits, like 859-555-0100');
  if (d.street.length < 4) throw new Error(`add the ${type.toLowerCase()} street address`);
  if (d.city.length < 2) throw new Error('add the city');
  if (!/^[A-Z]{2}$/.test(d.state)) throw new Error('use the 2-letter state, like KY');
  if (!ZIP.test(d.zip)) throw new Error('the ZIP code should be 5 digits');
  return d;
}

export function addressLines(d, shop = 'FASTSIGNS of Northern Kentucky (pickup at the shop)') {
  if (!d) return [];
  if (d.type === 'Pickup') return [`Pickup: ${shop}`];
  return [`${d.type} to:`, d.name, d.street, `${d.city}, ${d.state} ${d.zip}`, d.phone ? `Phone: ${d.phone}` : '', d.note].filter(Boolean);
}

export function addressBlock(d) {
  if (!d) return '<p style="margin:0;color:#7a4e00">No hand-off address yet.</p>';
  return `<address style="font-style:normal;line-height:1.5">${addressLines(d).map(esc).join('<br>')}</address>`;
}

export function destinationPanel(projectId, d, { saved = [], company = '' } = {}) {
  const v = d || {};
  const def = saved.findIndex((a) => a.default);
  // Mockup ShippingFlow: the hand-off type is a row of buttons and saved addresses are cards to pick from.
  const curSaved = d ? '' : String(Math.max(0, def));
  const pickSel = saved.length ? `<fieldset style="grid-column:1/-1;border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:6px"><legend style="font-size:12px;margin-bottom:4px">Address from the company profile</legend>${saved.map((a, n) => `<label class="adrc"><input type="radio" name="saved" value="${n}" ${curSaved === String(n) ? 'checked' : ''}><span><b>${esc(a.label)}${a.default ? ' (default ship-to)' : ''}</b><small>${esc([a.name, a.street, a.city + ', ' + a.state + ' ' + a.zip].filter(Boolean).join(' · '))}</small></span></label>`).join('')}<label class="adrc"><input type="radio" name="saved" value="" ${curSaved === '' ? 'checked' : ''}><span><b>Enter a different address</b><small>Type it below for this order only, or save it to the company profile</small></span></label></fieldset>` : '';
  const inp = (n, l, w = '100%') => `<label style="display:flex;flex-direction:column;font-size:12px">${l}<input name="${n}" value="${esc(v[n] || '')}" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px;width:${w}"></label>`;
  return `<section class="panel" aria-label="Hand-off and address"><div style="display:flex;gap:8px;align-items:center"><h2 style="margin:0 0 8px;font-size:15px">Type and Location</h2><a class="btn" style="margin-left:auto" href="/projects/${esc(projectId)}/invoice">Invoice Preview</a></div>${addressBlock(d)}
<details style="margin-top:8px" ${d ? '' : 'open'}><summary style="cursor:pointer;font-weight:700">${d ? 'Change' : 'Set the Hand-Off'}</summary><form method="post" action="/projects/${esc(projectId)}/destination" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;align-items:end;margin-top:8px">
<fieldset style="grid-column:1/-1;border:0;margin:0;padding:0"><legend style="font-size:12px;margin-bottom:6px">Hand-off</legend><div class="hseg">${HANDOFFS.map((h, n) => `<label><input type="radio" name="type" value="${h}" ${(v.type ? v.type === h : n === 0) ? 'checked' : ''}><span>${h}</span></label>`).join('')}</div></fieldset>
${pickSel}${inp('name', 'Ship to (name, company)')}${inp('phone', 'Phone')}${inp('street', 'Street')}${inp('city', 'City')}${inp('state', 'State')}${inp('zip', 'ZIP')}<div style="grid-column:1/-1">${inp('note', 'Notes (dock, door, hours)')}</div>
${saved.length ? `<label style="display:flex;gap:8px;align-items:center;font-size:13px;grid-column:1/-1"><input type="checkbox" name="saveToProfile" style="width:18px;height:18px"> Also save this address to the ${esc(company || 'customer')} company profile</label>` : ''}<button class="btn primary">Save Address</button></form></details><style>.hseg{display:inline-flex;gap:6px;flex-wrap:wrap}.hseg label{position:relative}.hseg input{position:absolute;opacity:0;width:1px;height:1px}.hseg span{display:inline-flex;align-items:center;min-height:36px;padding:0 16px;border:1px solid #d5dbe5;border-radius:18px;font-size:13px;font-weight:600;cursor:pointer;background:#fff}.hseg input:checked+span{background:#16213a;color:#fff;border-color:#16213a}.hseg input:focus-visible+span{outline:2px solid #1d4f91;outline-offset:2px}.adrc{display:flex;gap:10px;align-items:flex-start;border:1px solid #e3e7ee;border-radius:10px;padding:8px 12px;cursor:pointer}.adrc:has(input:checked){border-color:#1d4f91;background:#f5f8fd}.adrc input{margin-top:3px;accent-color:#1d4f91}.adrc b{display:block;font-size:13px}.adrc small{font-size:12px;color:#5a6478}</style><p style="margin:8px 0 0;font-size:12px;color:var(--mute)">Prints on the estimate and the invoice, and is used for the shipping label on Ship orders. Pickup needs no address.${saved.length ? ' Addresses come from the company profile automatically. The ship-to default is picked for you.' : ''}</p></section>`;
}

const money = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const round2 = (n) => Math.round(n * 100) / 100;

export function shippingCharge(labelCost, markupPct = 20, handling = 0) {
  const c = Number(labelCost);
  if (!(c > 0)) throw new Error('enter the label cost from XPS');
  return round2(c * (1 + Number(markupPct) / 100) + Number(handling || 0));
}

// A label from XPS (by hand today; the XPS connection fills this in later).
export function recordLabel(prev, f, { markupPct, handling, at, by }) {
  const tracking = String(f.tracking || '').trim();
  if (tracking.length < 6) throw new Error('enter the tracking number');
  const cost = Number(String(f.cost || '').replace(/[$,\s]/g, ''));
  const charge = shippingCharge(cost, markupPct, handling);
  const labels = [...((prev && prev.labels) || []), { carrier: String(f.carrier || '').trim().slice(0, 30) || 'UPS', service: String(f.service || '').trim().slice(0, 40), tracking: tracking.slice(0, 40), cost: round2(cost), charge, at, by }];
  return { labels, total: round2(labels.reduce((a, l) => a + l.charge, 0)), inCoreBridge: false };
}

export function confirmInCoreBridge(ship, { by, at }) {
  if (!ship || !ship.labels || !ship.labels.length) throw new Error('there is no shipping charge to add yet');
  return { ...ship, inCoreBridge: true, confirmedBy: by, confirmedAt: at };
}

// The gate: an order that ships can't be marked Complete until shipping is on the CoreBridge order.
export function completeBlocked(dest, ship) {
  if (!dest || dest.type !== 'Ship') return '';
  if (!ship || !ship.labels || !ship.labels.length) return 'This order ships. Add the shipping label and shipping charge before marking it Complete.';
  if (!ship.inCoreBridge) return `Add the shipping charge (${money(ship.total)}) to the CoreBridge order before marking it Complete.`;
  return '';
}

export function shippingPanel(projectId, dest, ship, { markupPct = 20, handling = 0 } = {}) {
  if (!dest || dest.type !== 'Ship') return '';
  const labels = (ship && ship.labels) || [];
  const rows = labels.map((l) => `<tr><td>${esc(l.carrier)} ${esc(l.service)} <span class="pill" style="background:${l.by === 'XPS' ? '#e8f0fb' : '#f3f0fa'};color:${l.by === 'XPS' ? '#1d4f91' : '#4a3373'}">${l.by === 'XPS' ? 'Automatic' : 'Added by hand'}</span></td><td>${esc(l.tracking)}</td><td style="text-align:right">${money(l.cost)}</td><td style="text-align:right"><b>${money(l.charge)}</b></td></tr>`).join('');
  const status = !labels.length ? '<span class="pill" style="background:#fdf3dc;color:#7a4e00">Waiting on the shipping label</span>'
    : ship.inCoreBridge ? '<span class="pill" style="background:#e6f2ec;color:#1f6a43">Shipping is on the CoreBridge order</span>'
      : '<span class="pill" style="background:#fbeaec;color:#8f2a34">Add shipping to CoreBridge before Complete</span>';
  return `<section class="panel" aria-label="Shipping"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h2 style="margin:0;font-size:15px">Shipping Labels &amp; Tracking</h2>${status}</div>
<p style="margin:6px 0 8px;font-size:12px;color:var(--mute)">Customer is charged the label cost plus ${Number(markupPct)}% markup${Number(handling) ? ` plus ${money(handling)} handling` : ''} (Admin, Pricing).</p>
${labels.length ? `<table><thead><tr><th>Carrier</th><th>Tracking</th><th style="text-align:right">Cost (internal)</th><th style="text-align:right">Retail</th></tr></thead><tbody>${rows}</tbody></table><p style="text-align:right;margin:6px 0"><b>Shipping on invoice: ${money(ship.total)}</b><br><span style="font-size:12px;color:var(--mute)">The customer only sees the retail price, on the Shipping line under Discount. The label cost never shows on the invoice.</span></p><p style="margin:0 0 8px;font-size:12px;color:var(--mute)">Automatic rows come in on their own when the label is bought. Retail = cost + ${Number(markupPct)}% markup. The customer only sees retail.</p>` : ''}
${boxesForm(projectId, ship)}<form method="post" action="/projects/${esc(projectId)}/xps" style="margin:0 0 8px"><button class="btn">Check for New Labels</button></form><details><summary style="cursor:pointer;font-weight:700">+ Add Tracking</summary><p style="margin:6px 0 0;font-size:12px;color:var(--mute)">For freight / LTL booked in ATS, or any shipment added by hand.</p><form method="post" action="/projects/${esc(projectId)}/label" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;align-items:end;margin-top:8px">
<label style="display:flex;flex-direction:column;font-size:12px">Carrier<input name="carrier" value="UPS" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><label style="display:flex;flex-direction:column;font-size:12px">Service<input name="service" placeholder="Ground" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label>
<label style="display:flex;flex-direction:column;font-size:12px">Tracking / PRO #<input name="tracking" required style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><label style="display:flex;flex-direction:column;font-size:12px">Cost (internal, $)<input name="cost" inputmode="decimal" required style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label>
<button class="btn">Add Tracking</button></form></details>
${labels.length && !ship.inCoreBridge ? `<form method="post" action="/projects/${esc(projectId)}/shipping-confirm" style="margin-top:8px"><button class="btn primary">Shipping Is on the CoreBridge Order</button><span style="font-size:12px;color:var(--mute);margin-left:8px">Test copy: CoreBridge writes are off, so add it in CoreBridge by hand, then confirm here.</span></form>` : ''}</section>`;
}

export function invoicePage({ page, user, p, dest, ship, items = [], depositPaid = 0, prefix = '' }) {
  const ship$ = (ship && ship.total) || 0;
  const total = round2((Number(p.total) || 0) + ship$);
  const lines = items.map((i) => `<tr><td>${esc(i.name)}</td><td style="text-align:right">${esc(i.qty || 1)}</td></tr>`).join('');
  const body = `<div class="wrap" style="max-width:800px"><div class="bar" style="padding:14px 0"><a href="/projects/${esc(p.id)}?mode=demo">← ${esc(p.name)}</a><span class="pill" style="margin-left:auto;background:#eef1f5;color:#3d4658">Invoice preview · test copy</span></div>
<section class="panel"><div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap"><div><h1 data-free style="font-size:20px">Invoice · ${esc(prefix && (p.orderId || /^\d+$/.test(String(p.id))) ? (String(p.orderId || p.id).startsWith(prefix + '-') ? String(p.orderId || p.id) : prefix + '-' + (p.orderId || p.id)) : (p.orderId || p.id))}</h1><div>${esc(p.company)}<br>${esc(p.contact || '')}</div></div><div>${addressBlock(dest)}</div></div></section>
<section class="panel"><table><thead><tr><th>Item</th><th style="text-align:right">Qty</th></tr></thead><tbody>${lines || '<tr><td colspan="2">Order items</td></tr>'}</tbody></table>
<div style="display:grid;grid-template-columns:1fr auto;gap:4px 16px;margin-top:10px;justify-items:end"><span>Subtotal</span><b>${money(p.total)}</b><span>Discount</span><b>${p.discount ? '−' + money(p.discount) : money(0)}</b>${ship$ ? `<span>Shipping</span><b>${money(ship$)}</b>` : ''}<span>Total</span><b>${money(total - (Number(p.discount) || 0))}</b>${depositPaid ? `<span>Deposit paid</span><b>−${money(depositPaid)}</b>` : ''}<span>Balance due</span><b style="font-size:18px">${money(total - (Number(p.discount) || 0) - depositPaid)}</b></div></section></div>`;
  return page({ title: 'Invoice', user, tab: 'Projects', body });
}

// Production records the boxes here; "Send Order to XPS" passes them with the hand-off address so shipping
// only picks the service and buys the label in XPS.
export function boxesForm(projectId, ship) {
  const pk = (ship && ship.packages) || [];
  const inp = (n, k, l, v) => `<label style="display:flex;flex-direction:column;font-size:12px">${l}<input name="${k}${n}" inputmode="decimal" value="${esc(v || '')}" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px;width:100%"></label>`;
  const row = (n) => { const b = pk[n] || {}; return `<div style="display:grid;grid-template-columns:repeat(4,minmax(70px,1fr));gap:6px;margin-bottom:6px" aria-label="Box ${n + 1}">${inp(n, 'w', `Box ${n + 1} · Weight (lb)`, b.weight)}${inp(n, 'l', 'Length (in)', b.length)}${inp(n, 'd', 'Width (in)', b.width)}${inp(n, 'h', 'Height (in)', b.height)}</div>`; };
  const shown = Math.min(10, Math.max(2, pk.length));
  const rows = Array.from({ length: shown }, (_, n) => row(n)).join('') + (shown < 10 ? `<details style="margin:0 0 8px"><summary style="cursor:pointer;font-weight:700;font-size:13px">+ Add Box</summary><div style="margin-top:6px">${row(shown)}</div></details>` : '');
  const totalLb = Math.round(pk.reduce((n, b) => n + (Number(b.weight) || 0), 0) * 10) / 10;
  const sent = ship && ship.xpsOrder ? `<p style="margin:6px 0 0;font-size:12px;color:var(--mute)">${esc(ship.xpsOrder.note)}</p>` : '';
  return `<div style="border:1px solid #e3e7ee;border-radius:10px;padding:10px;margin:0 0 10px"><b style="font-size:13px">Shipping Details</b> <span style="font-size:12px;color:var(--mute)">${pk.length ? `${pk.length} box${pk.length > 1 ? 'es' : ''} · ${totalLb} lb total` : 'Enter boxes first to move to Built'}</span><br><span style="font-size:12px;color:var(--mute)">Production enters these on their Production board card when it’s packed.</span>
<form method="post" action="/projects/${esc(projectId)}/boxes" style="margin-top:8px">${rows}<button class="btn">Save</button></form>
${ship && ship.xpsOrder && !ship.xpsOrder.ok && ship.xpsOrder.failed ? `<form method="post" action="/projects/${esc(projectId)}/xps-order" style="margin-top:8px"><button class="btn primary">Send for Shipping Again</button></form>` : ''}
<p style="margin:6px 0 0;font-size:12px;color:var(--mute)">Needed before a line can move to Built. When every product line is Built, the order is sent for shipping with the hand-off address and these details. Off in parallel mode.</p>${sent}</div>`;
}

// Admin › Workflow Builder: Hand-off & shipping rules (Phil, Nov 12).
export const SHIP_RULES_DEFAULT = { requireDetails: true, autoSend: true, types: ['Ship'] };
export function mergeShipRules(f) { return { requireDetails: f.requireDetails === 'on', autoSend: f.autoSend === 'on', types: f.types === 'Ship,Deliver' ? ['Ship', 'Deliver'] : ['Ship'] }; }
export function shipRulesPanel(r = SHIP_RULES_DEFAULT) {
  const cb = (n, l, on) => `<label style="display:flex;gap:10px;align-items:center;min-height:40px;font-size:14px"><input type="checkbox" name="${n}" ${on ? 'checked' : ''} style="width:20px;height:20px"> ${l}</label>`;
  return `<div class="wrap" style="max-width:900px"><section class="panel" aria-label="Shipping rules" id="ship-rules"><h2 style="margin:0 0 6px;font-size:15px">Hand-off &amp; Shipping</h2>
<form method="post" action="/admin/ship-rules" style="display:flex;flex-direction:column;gap:4px">
${cb('requireDetails', 'Shipping details required before Built', r.requireDetails !== false)}
${cb('autoSend', 'Send parcel orders for shipping automatically when every line is Built', r.autoSend !== false)}
<label style="display:flex;flex-direction:column;font-size:12px;max-width:320px">Hand-off types that use shipping<select name="types" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"><option value="Ship" ${(r.types || ['Ship']).length === 1 ? 'selected' : ''}>Ship only</option><option value="Ship,Deliver" ${(r.types || []).includes('Deliver') ? 'selected' : ''}>Ship and Deliver</option></select></label>
<p style="margin:4px 0;font-size:12px;color:var(--mute)">Freight and LTL (booked in ATS) are never sent automatically. Add their tracking by hand on the project.</p>
<button class="btn primary" style="align-self:flex-start">Save Shipping Rules</button></form></section></div>`;
}

// Addresses on the company profile (from CoreBridge history or added here). Demo customers get sample ones.
export function addressesFor(profile = {}, company = '', sample = false) {
  const list = Array.isArray(profile.addresses) ? profile.addresses : [];
  if (list.length || !sample) return list;
  if (/riverbend/i.test(company)) return [{ label: 'Main office', name: 'Dana Ruiz, Riverbend Dental', street: '120 Main St, Suite 4', city: 'Florence', state: 'KY', zip: '41042', default: true }, { label: 'Hebron office', name: 'Front Desk, Riverbend Dental', street: '2250 Litton Ln', city: 'Hebron', state: 'KY', zip: '41048' }];
  return [];
}
export function addProfileAddress(profile = {}, d) {
  const list = Array.isArray(profile.addresses) ? profile.addresses : [];
  if (list.some((a) => a.street === d.street && a.zip === d.zip)) return profile;
  return { ...profile, addresses: [...list, { label: d.name || 'Ship-to', name: d.name, street: d.street, city: d.city, state: d.state, zip: d.zip, default: !list.length }].slice(0, 20) };
}
