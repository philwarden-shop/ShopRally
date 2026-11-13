import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinationPanel, shippingPanel, boxesForm, setDestination, addressLines } from '../app/shipping.mjs';

test('hand-off panel uses the mockup labels', () => {
  const saved = [{ label: 'Main office', name: 'Dana Ruiz', street: '120 Main St', city: 'Florence', state: 'KY', zip: '41042', default: true }];
  const h = destinationPanel('p1', null, { saved, company: 'Riverbend <Dental>' });
  for (const l of ['Type and Location', 'Ship to (name, company)', 'Phone', 'Also save this address to the Riverbend &lt;Dental&gt; company profile', 'used for the shipping label on Ship orders', 'The ship-to default is picked for you.', 'Invoice Preview']) assert.ok(h.includes(l), l);
});

test('shipping details show box totals and add box', () => {
  const ship = { labels: [{ carrier: 'UPS', service: 'Ground', tracking: '1Z999', cost: 20, charge: 24, by: 'XPS' }], total: 24, packages: [{ weight: '10' }, { weight: '5.5' }] };
  const b = boxesForm('p1', ship);
  for (const l of ['Shipping Details', '2 boxes · 15.5 lb total', 'Box 1', 'Box 2', '+ Add Box', '>Save<', 'Production board card']) assert.ok(b.includes(l), l);
  assert.ok(boxesForm('p1', {}).includes('Enter boxes first to move to Built'));
  const h = shippingPanel('p1', { type: 'Ship' }, ship);
  for (const l of ['Shipping Labels &amp; Tracking', '+ Add Tracking', '>Retail<', 'The customer only sees retail.', 'For freight / LTL booked in ATS', 'Tracking / PRO #', 'Cost (internal']) assert.ok(h.includes(l), l);
});

test('hand-off keeps the phone number', () => {
  const d = setDestination({ type: 'Ship', name: 'Dana Ruiz', phone: '859-555-0100', street: '120 Main St', city: 'Florence', state: 'KY', zip: '41042' });
  assert.equal(d.phone, '859-555-0100');
  assert.ok(addressLines(d).includes('Phone: 859-555-0100'));
  assert.throws(() => setDestination({ type: 'Ship', phone: 'call me', street: '120 Main St', city: 'Florence', state: 'KY', zip: '41042' }));
  assert.equal(setDestination({ type: 'Ship', street: '120 Main St', city: 'Florence', state: 'KY', zip: '41042' }).phone, '');
});
