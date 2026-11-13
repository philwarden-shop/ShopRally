import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedVisit, visitAct, visitPage, startPage } from '../app/sitevisit.mjs';
import { fieldPage, demoJobs } from '../app/field.mjs';

const user = { email: 'phil@example.com', name: 'Phil', role: 'admin' };
const p = { id: 'demo-2', company: 'Tri-State Logistics', name: 'Warehouse wall graphics' };
const noInline = (h) => { assert.ok(!/<script(?![^>]*\bsrc=)(?![^>]*application\/json)[^>]*>/i.test(h.replace(/<script src="\/static\/ui.js" defer><\/script>/g, ''))); assert.ok(!/\son[a-z]+=/i.test(h)); };

test('site visit shows the mockup labels', () => {
  const h = visitPage({ user, p, v: seedVisit(p) });
  for (const l of ['SITE SURVEY', 'Tri-State Logistics', '+ Visit', 'Item # = estimate line #', 'MEASUREMENTS', 'INSTALL NOTES', '+ Measurement', 'Bring Back', 'Split', 'Drop', 'Exterior building sign', 'Parking lot and directional signs', 'Floor marking tape', 'Lobby logo wall (next year)', 'Other Needs Spotted', 'Saved to the company', 'LED lighting for the monument sign', 'Finish Visit', 'Item numbers lock once the estimate is created.']) assert.ok(h.includes(l), l);
  noInline(h);
});

test('start page shows the mockup labels', () => {
  const s = startPage({ user, today: [{ id: 'demo-2', company: 'Tri-State Logistics', name: 'Visit 2', where: 'Hebron' }] });
  for (const l of ['NEW SITE VISIT', 'Where Are You?', 'Search customers and prospects', 'On Your List Today', 'Start →', '+ New project and start visit', '+ New customer and visit', 'Every visit belongs to a project']) assert.ok(s.includes(l), l);
  noInline(s);
  const zs = startPage({ user, q: '<zz>' }); assert.ok(!zs.includes('<zz>') && zs.includes('&lt;zz&gt;'));
});

test('split, drop, bring back, numbering and finish', () => {
  let r = visitAct(seedVisit(p), { do: 'split', n: '2' });
  assert.deepEqual(r.v.items.map((i) => i.n), ['1', '2a', '2b', '3', '4']);
  assert.throws(() => visitAct(r.v, { do: 'split', n: '2a' }));
  r = visitAct(r.v, { do: 'item', name: 'Dock door numbers' });
  assert.equal(r.v.items.at(-1).n, '5');
  r = visitAct(r.v, { do: 'drop', n: '3' });
  assert.ok(r.v.items.find((i) => i.n === '3').dropped);
  r = visitAct(r.v, { do: 'bring', n: '3' });
  assert.ok(!r.v.items.find((i) => i.n === '3').dropped);
  r = visitAct(r.v, { do: 'meas', n: '1', kind: 'Width', value: '10 ft' });
  assert.equal(r.v.items[0].meas.length, 2);
  assert.equal(visitAct(r.v, { do: 'need', label: 'Window graphics' }).need, 'Window graphics');
  r = visitAct(r.v, { do: 'finish' });
  assert.ok(r.v.finished);
  assert.throws(() => visitAct(r.v, { do: 'item', name: 'Another sign' }));
  assert.ok(visitPage({ user, p, v: r.v }).includes('Reopen Visit'));
  assert.throws(() => visitAct(seedVisit({ company: 'New Co' }), { do: 'finish' }));
});

test('field page links to site visits', () => {
  const h = fieldPage({ user, jobs: demoJobs('2026-11-13') });
  if (demoJobs('2026-11-13').length) assert.ok(h.includes('/projects/demo-2/visit') && h.includes('Start Site Visit'));
  assert.ok(h.includes('+ New Site Visit'));
});
