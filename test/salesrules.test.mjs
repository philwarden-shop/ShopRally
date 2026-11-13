import { test } from 'node:test';
import assert from 'node:assert/strict';
const R = await import('../app/salesrules.mjs');

test('sales rules: stage targets save days + business/calendar; keeps existing target_ keys for Projects', () => {
  const a = R.mergeRules({}, { section: 'stages', d_prospect: '10', u_prospect: 'calendar', d_vendor: '12' });
  assert.equal(a.target_prospect, 10); assert.equal(a.stageUnits.prospect, 'calendar'); assert.equal(a.target_vendor, 12);
  assert.equal(R.stageTargets(a).find((s) => s.k === 'estimate').days, 7);
  assert.throws(() => R.mergeRules({}, { section: 'stages', d_built: '0' }), /whole number/);
  const r = R.mergeRules({}, { section: 'reply', n_lead: '2', u_lead: 'hours', dueSoon: '50' });
  assert.deepEqual(r.replySla.lead, { n: 2, unit: 'hours' }); assert.equal(r.dueSoon, '50');
  const w = R.mergeRules({}, { section: 'warm', keepWarmDays: '60', dormantDays: '200', prospectNudgeDays: '14', r_news: 'on' });
  assert.equal(w.keepWarmDays, 60); assert.equal(w.reasonSources.news, true); assert.equal(w.reasonSources.social, false);
  assert.throws(() => R.mergeRules({}, { section: 'warm', keepWarmDays: '200', dormantDays: '100', prospectNudgeDays: '14' }), /Dormant/);
  const h = R.rulesPage({ user: {}, adm: a });
  assert.ok(['Stage Time Targets', 'Reply Time Targets', 'Business Hours', 'Keep-Warm Rules', 'Production · vendor'].every((x) => h.includes(x)));
});

test('customer lists + CSV check (nothing saved)', () => {
  const l = R.mergeLists({}, { source: 'Referral\nWebsite\nReferral\n', inactiveMonths: '24' });
  assert.deepEqual(l.source, ['Referral', 'Website']); assert.equal(l.inactiveMonths, 24); assert.equal(l.ctype.length, 5);
  assert.throws(() => R.mergeLists({}, { industry: '  ' }), /at least one/);
  assert.deepEqual(R.parseCsv('a,b\n"x, y","say ""hi""\"\n'), [['a', 'b'], ['x, y', 'say "hi"']]);
  const c = R.checkImport('customers', 'Company,Email\nAcme,a@b.com\n,bad\n');
  assert.equal(c.total, 2); assert.equal(c.problemN, 2); assert.deepEqual(c.missing, []);
  assert.deepEqual(R.checkImport('contacts', 'Company,Email\nAcme,a@b.com').missing, ['First']);
  assert.throws(() => R.checkImport('customers', 'Company'), /header row/);
  const h = R.listsPage({ user: {}, check: c });
  assert.ok(h.includes('Customer Lists') && h.includes('Import Customers') && h.includes('2 rows to fix') && h.includes('Nothing was saved'));
});
