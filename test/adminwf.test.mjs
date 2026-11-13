import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeExtra, extraDefaults } from '../app/adminx.mjs';
import { workflowExtras, parseChecklistRows } from '../app/adminwf.mjs';
import { settingsPage } from '../app/settings.mjs';

const user = { email: 'a@b.c', name: 'Phil', isAdmin: true, prefs: {} };

test('workflow tab shows every mockup section', () => {
  const h = settingsPage({ user, settings: {}, tab: 'work' });
  for (const s of ['Workflows and Boards', 'Project Stage Rules', 'Stage Time Targets', 'Reply Time Targets', 'Stage Checklists', 'Permit Document Checklists', 'Tags', 'Hold reasons', 'Into Estimate', 'Sign permit', 'City of Florence']) assert.ok(h.includes(s), s);
  assert.ok(h.includes('href="/admin/workflow"'));
});
test('sales tab has customer lists and import cards, settings tucked in Advanced', () => {
  const h = settingsPage({ user, settings: {}, tab: 'sales', lists: { source: ['A', 'B'] } });
  assert.ok(h.includes('Customer lists') && h.includes('2 values') && h.includes('Import customers') && h.includes('/admin/lists#import'));
  assert.ok(h.indexOf('Advanced') < h.indexOf('Sales Settings'));
});
test('stage rules save checks and override', () => {
  const { x } = mergeExtra(null, { do: 'stagerules', c_0_0: 'on', w_0: 'No one', w_1: 'Hacker' });
  assert.equal(x.stageRules[0].checks[0][1], 1);
  assert.equal(x.stageRules[0].checks[1][1], 0);
  assert.equal(x.stageRules[0].who, 'No one');
  assert.equal(x.stageRules[1].who, 'Owner/Admin');
});
test('tags add, retire, and Design Revision stays', () => {
  let { x } = mergeExtra(null, { do: 'tagadd', g: '1', name: 'Warranty' });
  assert.ok(x.tags[1].tags.includes('Warranty'));
  assert.throws(() => mergeExtra(x, { do: 'tagadd', g: '1', name: 'warranty' }));
  ({ x } = mergeExtra(x, { do: 'tagdel', g: '1', k: '0' }));
  assert.ok(!x.tags[1].tags.includes('Rush') && x.retired.includes('Rush'));
  const k = x.tags[1].tags.findIndex((t) => /automatic/.test(t));
  assert.throws(() => mergeExtra(x, { do: 'tagdel', g: '1', k: String(k) }));
});
test('permit docs edit, add, remove and city extras', () => {
  let { x } = mergeExtra(null, { do: 'permits', n_0_0: 'Signed app', n_0_new: 'Survey', s_0_new: 'Vendor', city_new: 'Covington', citydocs_new: 'Two copies' });
  assert.equal(x.permits[0].docs[0][0], 'Signed app');
  assert.deepEqual(x.permits[0].docs.at(-1), ['Survey', 'Vendor']);
  assert.equal(x.cities.at(-1).city, 'Covington');
  ({ x } = mergeExtra(x, { do: 'permits', del: '0:0' }));
  assert.equal(x.permits[0].docs[0][0], 'Site plan with setbacks');
  ({ x } = mergeExtra(x, { do: 'permadd', type: 'Banner permit' }));
  assert.equal(x.permits.at(-1).type, 'Banner permit');
});
test('checklist rows save, add and remove', () => {
  const f = { rows: '1', 't_sales-prospect_0': 'Contact entered', 'r_sales-prospect_0': 'on', 't_sales-prospect_1': 'Need-by', 't_sales-prospect_2': 'Survey', 't_sales-prospect_new': 'Budget known', 'r_sales-prospect_new': 'on' };
  const out = parseChecklistRows(f, null);
  assert.deepEqual(out['sales-prospect'], [['Contact entered', 1], ['Need-by', 0], ['Survey', 0], ['Budget known', 1]]);
  const out2 = parseChecklistRows({ ...f, 't_sales-prospect_new': '', del: 'sales-prospect:1' }, null);
  assert.deepEqual(out2['sales-prospect'].map((r) => r[0]), ['Contact entered', 'Survey']);
});
test('checklist board tabs switch boards and escape', () => {
  const w = workflowExtras(extraDefaults(), { clBoard: 'permits' });
  assert.ok(w.cl.includes('Application # recorded') && !w.cl.includes('Contact name, email'));
  const w2 = workflowExtras({ tags: [{ name: '<b>', hint: '', boards: '', task: '', tags: ['<i>'] }] });
  assert.ok(!w2.tags.includes('<i>') && w2.tags.includes('&lt;i&gt;'));
});
