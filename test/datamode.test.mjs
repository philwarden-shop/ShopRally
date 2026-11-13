import test from 'node:test';
import assert from 'node:assert/strict';

const D = await import('../app/data.mjs');
const A = await import('../app/activities.mjs');
const SB = await import('../app/simpleboards.mjs');
const I = await import('../app/items.mjs');
const T = await import('../app/team.mjs');
const X = await import('../app/portalx.mjs');

test('DATA_MODE=live: no sample record anywhere (production safety)', () => {
  const was = process.env.DATA_MODE;
  process.env.DATA_MODE = 'live';
  try {
    assert.equal(D.sampleData(), false);
    assert.deepEqual([D.demoProjects(), A.demoTasks('2026-11-12'), SB.demoRecords('permits'), I.demoItems(), T.demoTeam()], [[], [], [], [], []]);
    assert.equal(X.demoPriceChange('demo-10'), null);
  } finally { if (was === undefined) delete process.env.DATA_MODE; else process.env.DATA_MODE = was; }
  assert.equal(D.sampleData(), true);
  assert.ok(D.demoProjects().length > 5);
});
