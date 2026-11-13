import { test } from 'node:test';
import assert from 'node:assert/strict';
const P = await import('../app/pricing.mjs');
const cat = P.loadCatalog();

test('pricing: 1/4" acrylic 12x12 matches CoreBridge ($61.40 single, $68.68 double + $12 fee)', () => {
  const parts = P.priceParts(cat);
  const a = parts.find((p) => p.id === 48);
  assert.equal(P.priceCheck(a, { w: 12, h: 12, q: 1 }).total, 73.40);
  assert.equal(P.priceCheck(a, { w: 12, h: 12, q: 1, ds: true }).total, 80.68);
  const banner = parts.find((p) => p.id === 45);
  assert.equal(P.priceCheck(banner, { w: 12, h: 12, q: 1, ds: true }).both, false, 'banner is single-sided only');
  const yard = parts.find((p) => p.id === 216);
  assert.match(P.priceCheck(yard, { w: 18, h: 24, q: 10 }).steps[1].say, /Retail \$18\.92/);
});

test('pricing: edits validated and saved per part; page shows all four sections', () => {
  const s = P.mergePartPrice({}, { id: '48', cost: '6.00', setup: '' });
  assert.equal(s[48].cost, 6); assert.equal(s[48].setup, undefined);
  assert.throws(() => P.mergePartPrice({}, { id: '999', cost: '1' }), /no pricing/);
  assert.throws(() => P.mergePartPrice({}, { id: '48', cost: '-1' }), /number/);
  assert.equal(P.priceParts(cat, s).find((p) => p.id === 48).cost, 6);
  for (const tab of ['check', 'parts', 'templates', 'mods']) assert.ok(P.pricingPage({ user: {}, tab }).includes('Pricing Engine'), tab);
  assert.ok(P.pricingPage({ user: {}, tab: 'check', f: { part: '48', w: '12', h: '12', q: '1' } }).includes('Matches CoreBridge exactly'));
  assert.ok(P.pricingPage({ user: {}, tab: 'mods' }).includes('GRAPHIC DESIGN'));
});

test('pricing: Compare With CoreBridge shows CoreBridge total, exact match or the gap; other parts are CoreBridge-only', () => {
  const ok = { ok: true, lines: [{ parts: 61.40, fees: 12, total: 73.40, feeNames: ['Technology Fees $12.00'] }] };
  assert.match(P.compareHtml(73.40, ok), /Exact match/);
  assert.match(P.compareHtml(80, ok), /Off by \$6\.60 \(SalesMax higher\)/);
  assert.match(P.compareHtml(null, ok), /no copied pricing/);
  assert.match(P.compareHtml(1, { ok: false, errors: ['busy'] }), /CoreBridge: busy/);
  const h = P.pricingPage({ user: {}, tab: 'check', f: { part: '999999' } });
  assert.ok(h.includes('Compare With CoreBridge') && h.includes('CoreBridge price only'));
  const other = cat.parts.find((c) => ![48, 55, 89, 45, 216, 222].includes(c.Id));
  assert.ok(P.pricingPage({ user: {}, tab: 'check', f: { part: String(other.Id) } }).includes('pricing copied yet'));
  const bp = { id: 48, name: 'Acrylic', w: true, h: true, both: true };
  assert.deepEqual([P.cbLineFor(bp, { w: '24', h: '12', q: '2', ds: true }).qty, P.cbLineFor(bp, { ds: true }).ds], [2, true]);
  assert.equal(P.cbLineFor(null), null);
});
