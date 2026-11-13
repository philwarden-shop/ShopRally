import { test } from 'node:test';
import assert from 'node:assert/strict';

test('performance: sales by month (sold past, booked + likely ahead), funnel, goal gap, salesperson filter', async () => {
  const P = await import('../app/perf.mjs');
  const projects = [
    { lane: 'complete', total: 1000, due: '2026-10-05', salesperson: 'Kristin Ames' },
    { lane: 'progress', total: 2000, due: '2026-11-20', salesperson: 'Kristin Ames' },
    { lane: 'progress', total: 3000, due: '2026-12-10', salesperson: 'Tom Butler' },
    { lane: 'estimate', total: 5000, due: '2027-01-10', salesperson: 'Tom Butler' },
    { lane: 'lost', total: 700, due: '2026-11-01', salesperson: 'Tom Butler' },
  ];
  const m = P.monthlySales(projects, '2026-11-13');
  assert.deepEqual(m.map((x) => x.key), ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01']);
  assert.equal(m[2].sold, 1000); assert.equal(m[3].sold, 2000); assert.equal(m[4].booked, 3000); assert.equal(m[5].likely, 2000);
  const f = P.funnel(projects);
  assert.deepEqual(f.map((x) => x.count), [0, 1, 2, 1, 1]);
  const h = P.performancePage({ user: {}, projects, person: 'tom', goals: { monthSales: 30000, closeRate: 50 }, today: '2026-11-13' });
  assert.ok(h.includes('Sales by Month · Past and Forecast') && h.includes('Where Your Pipeline Stands') && h.includes('Edit My Goal') && h.includes('Still to go'));
  assert.ok(h.includes('<option value="tom butler" selected>'));
});
