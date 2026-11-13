// Buying agent: checks every vendor quote against what we are actually selling, and every PO against the quote,
// before money moves. Born from a real loss: the vendor quoted 2 signs, we sold 1, and the PO went out for 2.
// The AI reads the vendor's email/PDF into the `quote` shape below; these rules decide what a person must look at.
// Result levels: 'ok' (can be used), 'review' (a person confirms), 'block' (cannot be used until fixed).

const near = (a, b, tol) => Math.abs(Number(a) - Number(b)) <= tol;
const words = (s) => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9.\s/"-]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

// item: { qty, w, h, material, sides, dueDate }   (what the estimate sells)
// quote: { vendor, quoteNo, lines: [{ description, qty, unitPrice, total, w, h }], setup, freight, expires, leadDays }
export function checkQuote(item, quote, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const issues = [];
  const add = (level, code, say) => issues.push({ level, code, say });
  const lines = quote.lines || [];
  if (!lines.length) add('block', 'no_lines', 'The quote has no priced lines. Ask the vendor to resend it.');

  // 1. Quantity: the costly one.
  const quotedQty = lines.reduce((n, l) => n + (Number(l.qty) || 0), 0);
  if (lines.length && quotedQty !== Number(item.qty)) {
    add('block', 'qty_mismatch', `The vendor quoted ${quotedQty}, but the estimate sells ${item.qty}. Get a quote for ${item.qty} (price breaks change the unit price), or change the estimate.`);
  }

  // 2. The vendor's own math.
  for (const l of lines) {
    if (l.unitPrice != null && l.total != null && !near(l.unitPrice * l.qty, l.total, 0.01)) {
      add('review', 'math', `Line "${l.description}": ${l.qty} × ${money(l.unitPrice)} is ${money(l.unitPrice * l.qty)}, not the ${money(l.total)} quoted.`);
    }
  }

  // 3. Size (either orientation, ¼ inch tolerance).
  for (const l of lines) {
    if (item.w && item.h && l.w && l.h) {
      const same = (near(l.w, item.w, 0.25) && near(l.h, item.h, 0.25)) || (near(l.w, item.h, 0.25) && near(l.h, item.w, 0.25));
      if (!same) add('block', 'size_mismatch', `Quoted size ${l.w}×${l.h} in does not match the estimate's ${item.w}×${item.h} in.`);
    }
  }

  // 4. Material and sides: look for the key words of what we sold in what they quoted.
  const quotedText = lines.map((l) => l.description).join(' ');
  const want = [...words(item.material)].filter((w) => !['and', 'with', 'the'].includes(w));
  const missing = want.filter((w) => !words(quotedText).has(w));
  if (want.length && missing.length > want.length / 2) add('review', 'material', `The quote may not be for "${item.material}" (it never mentions ${missing.slice(0, 3).join(', ')}). Confirm the material.`);
  if (item.sides === 2 && !/double|2[- ]?sided|two[- ]sided|d\/s|\bds\b/i.test(quotedText)) add('review', 'sides', 'The estimate is double-sided; the quote does not say double-sided.');

  // 5. Extra charges that must reach the estimate.
  for (const [k, label] of [['setup', 'setup'], ['freight', 'freight']]) {
    if (Number(quote[k]) > 0) add('review', k, `The vendor charges ${money(quote[k])} ${label}. It is included in the cost below; make sure the estimate covers it.`);
  }

  // 6. Dates.
  if (quote.expires && quote.expires < today) add('block', 'expired', `This quote expired on ${quote.expires}. Ask the vendor to re-confirm the price.`);
  else if (quote.expires && daysBetween(today, quote.expires) <= 5) add('review', 'expiring', `This quote expires on ${quote.expires}, before most customers approve. Note it on the estimate or ask for an extension.`);
  if (quote.leadDays && item.dueDate && daysBetween(today, item.dueDate) < quote.leadDays + 2) add('review', 'lead_time', `The vendor needs ${quote.leadDays} days; the due date (${item.dueDate}) leaves too little room.`);

  // The cost to put on the estimate: for the quantity we sell, never the quantity they quoted.
  const unit = lines.length === 1 ? lines[0].unitPrice ?? (lines[0].total / (lines[0].qty || 1)) : null;
  const cost = unit == null ? null : Math.round((unit * Number(item.qty) + Number(quote.setup || 0) + Number(quote.freight || 0)) * 100) / 100;
  const level = issues.some((i) => i.level === 'block') ? 'block' : issues.length ? 'review' : 'ok';
  return { level, issues, cost, quotedQty, note: cost == null ? 'Several lines: a person picks which lines apply.' : `Cost for ${item.qty}: ${money(cost)}` };
}

// PO check: the order we send must match what we sold and what the vendor quoted. Nothing goes out on 'block'.
export function checkPurchaseOrder({ item, quote, accepted, po }) {
  const issues = [];
  const add = (level, code, say) => issues.push({ level, code, say });
  if (Number(po.qty) !== Number(item.qty)) add('block', 'po_qty', `The PO orders ${po.qty}, but the customer bought ${item.qty}.`);
  if (accepted && accepted.cost != null && po.total > accepted.cost + 0.01) add('block', 'po_over_quote', `The PO total ${money(po.total)} is more than the accepted cost ${money(accepted.cost)}. A manager must approve.`);
  if (quote && po.quoteNo && quote.quoteNo && po.quoteNo !== quote.quoteNo) add('review', 'quote_ref', `The PO references quote ${po.quoteNo}, but the accepted quote is ${quote.quoteNo}.`);
  if (accepted && accepted.level === 'block') add('block', 'quote_unresolved', 'The vendor quote still has a blocking problem. Fix it before ordering.');
  return { level: issues.some((i) => i.level === 'block') ? 'block' : issues.length ? 'review' : 'ok', issues };
}
