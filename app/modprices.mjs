// Modifier price list (Admin > Modifier price list) and how a chosen modifier becomes a charge on the estimate.
// CoreBridge ignores a price sent on a modifier (Nov 10 test: modifier 235 priced $0). It DOES price the
// "Product - Manually Entered Pricing" part from VendorCost x Quantity x (1 + VendorMarkup%) (Nov 10: 10 x 2 at 100% = $40).
// So SalesMax prices each modifier choice itself and sends it as that part, on the same product, named after the modifier.
export const MANUAL_PRICE_PART = 298; // fs0226 "Product - Manually Entered Pricing"; each location maps its own in Admin

// Each entry: group, field, choice ('*' = any value typed), how it is charged, and cost/price per unit.
//   how: 'sign' (per sign on the product), 'qty' (per number typed), 'min' (per minute typed), 'order' (once)
// Prices are blank until set in Admin; a blank price means "not priced yet" and the estimate says so.
export const DEMO_PRICE_LIST = [
  { group: 'PRODUCTION (RIGID)', field: 'Add Holes', choice: 'Four Corners', how: 'sign', cost: null, price: null },
  { group: 'PRODUCTION (RIGID)', field: 'Add Holes', choice: 'Two Centered', how: 'sign', cost: null, price: null },
  { group: 'PRODUCTION (RIGID)', field: "Add'l Labor (Min)", choice: '*', how: 'min', cost: null, price: null },
  { group: 'GRAPHIC DESIGN', field: "Add'l Design Time (Min)", choice: '*', how: 'min', cost: null, price: null },
  { group: 'GRAPHIC DESIGN', field: 'Vectorize Artwork (Qty)', choice: '*', how: 'qty', cost: null, price: null },
];

const findEntry = (list, group, field, value) =>
  list.find((e) => e.group === group && e.field === field && e.choice === String(value)) ||
  list.find((e) => e.group === group && e.field === field && e.choice === '*');

// selections: [{ group, field, value }] for one product; signs = how many signs the product makes.
// Returns { charges: [{ label, qty, cost, price, total }], unpriced: [label], unknown: [label] }
export function modifierCharges(selections, { list = DEMO_PRICE_LIST, signs = 1 } = {}) {
  const out = { charges: [], unpriced: [], unknown: [] };
  for (const s of selections) {
    if (s.value === '' || s.value === false || s.value == null || s.value === 0 || s.value === '0') continue;
    const label = `${s.group}: ${s.field}${s.value === true ? '' : ` – ${s.value}`}`;
    const e = findEntry(list, s.group, s.field, s.value === true ? 'Yes' : s.value);
    if (!e) { out.unknown.push(label); continue; }
    if (e.price == null) { out.unpriced.push(label); continue; }
    // CoreBridge multiplies part quantity by the product quantity, so a per-sign charge is 1 per sign here (to confirm on a live create).
    const qty = e.how === 'sign' ? signs : e.how === 'order' ? 1 : Number(s.value) || 0;
    if (!qty) continue;
    out.charges.push({ label, qty, cost: e.cost ?? 0, price: e.price, total: Math.round(e.price * qty * 100) / 100 });
  }
  return out;
}

// One charge -> the CoreBridge part that carries it. Markup is a percent on top of cost.
// With no cost on file, cost = price and markup 0 (the price is right; the margin report will show 0 until a cost is set).
export function chargePart(c, partId = MANUAL_PRICE_PART) {
  const cost = c.cost > 0 ? c.cost : c.price;
  const markup = c.cost > 0 ? Math.round((c.price / c.cost - 1) * 10000) / 100 : 0;
  return { PartId: partId, Quantity: c.qty, VendorCost: cost, VendorMarkup: markup, Notes: c.label.slice(0, 255) };
}
