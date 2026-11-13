import test from 'node:test';
import assert from 'node:assert/strict';

const Q = await import('../app/quotecheck.mjs');
const SB = await import('../app/simpleboards.mjs');

test('purchasing quote check: wrong quantity is blocked and cannot be ordered; a clean quote can', () => {
  let recs = SB.demoRecords('purchasing');
  recs = Q.applyQuoteCheck(recs, 'pu4', { vendor: 'Grimco', quoteNo: 'G-1', description: 'Wall graphic media with laminate', qty: '2', unitPrice: '300', total: '600', w: '120', h: '96' }, { today: '2026-11-12', due: '2026-12-01' });
  const r = recs.find((x) => x.id === 'pu4');
  assert.equal(r.quoteCheck.level, 'block');
  assert.ok(r.quoteCheck.issues.some((i) => /quoted 2, but the estimate sells 1/.test(i.say)));
  assert.ok(Q.blockedForOrder(r, 'ordered'));
  assert.throws(() => SB.moveRecord(recs, 'pu4', 'ordered', 'purchasing'), /quote/);
  recs = Q.applyQuoteCheck(recs, 'pu4', { vendor: 'Grimco', description: 'Wall graphic media with laminate', qty: '1', unitPrice: '300', total: '300', w: '120', h: '96' }, { today: '2026-11-12', due: '2026-12-01' });
  assert.notEqual(recs.find((x) => x.id === 'pu4').quoteCheck.level, 'block');
  assert.ok(Q.quoteCard(recs.find((x) => x.id === 'pu4')).includes('Check Vendor Quote'));
});
