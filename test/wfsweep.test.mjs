import { test } from 'node:test';
import assert from 'node:assert/strict';
import { builderPage, baseline, addRule, rushWalk, flowMap, BUSINESS_RULES, interpret } from '../app/wfbuilder.mjs';
import { STEPS, STEP_TARGET_DAYS } from '../app/workflow.mjs';
import { shipRulesPanel } from '../app/shipping.mjs';

const base = baseline(STEPS, STEP_TARGET_DAYS);
const user = { email: 'phil@example.com', name: 'Phil', role: 'admin' };

test('workflow builder shows the mockup labels', () => {
  const h = builderPage({ user, published: base, draft: base, rules: ['Banners need a manager OK'] });
  for (const l of ['Test with an Order', 'History', 'Publish Changes', 'Start Over With Interview', 'Prefer to Drag? Show the Parts', 'Drag Onto the Map', 'Business Rules', '+ Add Rule', 'Walk me through a rush job', 'Workflow Map', 'Needs design?', 'In-house or vended?', 'Nothing goes live until you click Publish Changes', 'Banners need a manager OK']) assert.ok(h.includes(l), l);
  assert.ok(!h.includes('Redo the Setup Interview'));
  assert.ok(shipRulesPanel().includes('Hand-off &amp; Shipping'));
});

test('test panel only when asked', () => {
  assert.ok(!builderPage({ user, published: base, draft: base }).includes('id="wf-test"'));
  assert.ok(builderPage({ user, published: base, draft: base, test: true }).includes('Test with an Order: Rush Job'));
});

test('rush walk halves targets and skips vended', () => {
  const d = [{ id: 'prep', name: 'Prep', owner: 'Sales', days: 3 }, { id: 'vended', name: 'Vended', owner: 'Sales', days: 5 }, { id: 'qc', name: 'QC', owner: 'Sales', days: 1 }];
  const w = rushWalk(d);
  assert.equal(w.lines.length, 2);
  assert.equal(w.total, 3);
  assert.equal(w.normal, 4);
  assert.match(interpret(base, 'walk me through a rush job').reply, /rush job/i);
});

test('add rule checks length and duplicates', () => {
  assert.deepEqual(addRule([], ' Big  banners need OK '), ['Big banners need OK']);
  assert.throws(() => addRule([], 'no'));
  assert.throws(() => addRule([], BUSINESS_RULES[0]));
  assert.throws(() => addRule(['Big banners need OK'], 'big banners need ok'));
});

test('flow map escapes names', () => {
  assert.ok(!flowMap([{ id: 'prep', name: '<x>', owner: 'a', days: 1 }]).includes('<x>'));
});
