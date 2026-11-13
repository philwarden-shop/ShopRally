import test from 'node:test';
import assert from 'node:assert/strict';
const T = await import('../app/templates.mjs');
test('email templates: 5 prebuilt shop templates, edit/add/remove, insert with merge fields', () => {
  const d = T.withTemplateDefaults(null);
  assert.equal(d.length, 5);
  const saved = T.mergeTemplateForm([], { id0: 'proof', name0: 'Proof ready', subject0: 'Proof {{order_number}}', body0: 'Hi {{first_name}}', name1: 'Old', subject1: 'x y', remove1: 'on', add: '1' });
  assert.deepEqual(saved.map((t) => t.name), ['Proof ready', 'New template']);
  assert.throws(() => T.mergeTemplateForm([], { name0: 'A' }), /name/);
  const t = T.pickTemplate('shop:proof', saved, []);
  assert.equal(T.fillT(t.subject, { order_number: '226-75148' }), 'Proof 226-75148');
  assert.equal(T.textToHtml('a\n<b>'), 'a<br>&lt;b&gt;');
  assert.match(T.templatePicker({ action: '/customers/x', hidden: { tab: 'email' }, shop: d, mine: [{ id: 'm1', name: 'Mine' }] }), /Insert Template[\s\S]*optgroup label="Mine"/);
});
