import test from 'node:test';
import assert from 'node:assert/strict';

const X = await import('../app/portalx.mjs');
const steps = ['prep', 'queue', 'indesign', 'proofqc', 'salesrev', 'proofwait', 'files', 'wip', 'vended', 'qc', 'built', 'done'].map((id) => ({ id }));
const targets = { prep: 2, queue: 2, indesign: 3, proofqc: 1, salesrev: 1, proofwait: 3, files: 1, wip: 4, vended: 10, qc: 1, built: 3 };

test('ready forecast: business days from the slowest item; capped at due unless waiting on the customer', () => {
  assert.equal(X.addBusinessDays('2026-11-13', 1), '2026-11-16'); // Friday + 1 = Monday
  let f = X.readyForecast([{ step: 'qc' }], { steps, targets, today: '2026-11-12', due: '2026-11-30' });
  assert.deepEqual([f.state, f.likely], ['progress', '2026-11-13']);
  f = X.readyForecast([{ step: 'wip' }, { step: 'qc' }], { steps, targets, today: '2026-11-12', due: '2026-11-14' });
  assert.equal(f.likely, '2026-11-14');
  f = X.readyForecast([{ step: 'proofwait' }], { steps, targets, today: '2026-11-12', due: '2026-11-13' });
  assert.ok(f.waitingOnYou && f.likely > '2026-11-13');
  assert.equal(X.readyForecast([{ step: 'built' }], { steps, targets, today: '2026-11-12' }).state, 'ready');
  assert.match(X.forecastHtml(f), /Most likely[\s\S]*No later than[\s\S]*depends on your proof approval/);
});
