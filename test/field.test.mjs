import test from 'node:test';
import assert from 'node:assert/strict';

const F = await import('../app/field.mjs');

test('field: checklist ticks save; complete only when every box is ticked; photos go to Google Drive', () => {
  const [visit, install] = F.demoJobs('2026-11-12');
  let s = F.tick({}, install, { c0: 'on', c1: 'on', notes: 'Wall was brick' });
  assert.equal(s.f2.complete, false); assert.deepEqual(s.f2.done, ['Arrived and checked in', 'Installed and level']);
  s = F.tick(s, install, { c0: 'on', c1: 'on', c2: 'on', c3: 'on', c4: 'on' });
  assert.equal(s.f2.complete, true);
  assert.match(F.driveLink(install), /^https:\/\/drive\.google\.com\/drive\/search\?q=Order%2075812$/);
  assert.match(F.driveLink(visit), /Tri-State/);
  const h = F.fieldPage({ user: {}, jobs: [{ ...visit, company: '<b>x</b>' }], state: s });
  assert.ok(h.includes('SALESMAX FIELD') && h.includes('Add Photos in Google Drive') && !h.includes('<b>x</b>'));
});
