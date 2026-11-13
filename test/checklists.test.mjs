import test from 'node:test';
import assert from 'node:assert/strict';
const K = await import('../app/checklists.mjs');
test('stage checklists: defaults, admin edit with * for required, required items gate the move, card shows progress', () => {
  assert.deepEqual(K.missingRequired(null, 'qc', [0]), ['Count matches the order']);
  assert.deepEqual(K.missingRequired(null, 'built', [0]), []);
  const saved = K.parseChecklistForm({ s_qc: '* Photo\nWipe down\n\n* Count' });
  assert.deepEqual(saved.qc, [['Photo', 1], ['Wipe down', 0], ['Count', 1]]);
  let c = K.toggleCheck({}, 'qc', 0); c = K.toggleCheck(c, 'qc', 2);
  assert.deepEqual(K.missingRequired(saved, 'qc', c.qc), []);
  assert.deepEqual(K.toggleCheck(c, 'qc', 0).qc, [2]);
  assert.match(K.cardChecklist({ id: 'i1', step: 'qc' }, saved, c, '/boards/production'), /Checklist · 2\/3/);
  assert.equal(K.cardChecklist({ id: 'i1', step: 'queue' }, saved, {}, '/x'), '');
  assert.match(K.checklistsPage({ page: ({ body }) => body, user: {}, saved }), /\* Photo\nWipe down\n\* Count/);
});

test('checklists: Sales board stages and custom stages get a definition of done', () => {
  const custom = [{ id: 'permit-check', name: 'Permit check', board: 'production' }, { id: 'bad id!', name: 'x' }];
  const cat = K.stageCatalog(custom);
  assert.ok(cat.some((s) => s.id === 'sales-estimate' && s.board === 'sales'));
  assert.ok(cat.some((s) => s.id === 'permit-check' && s.custom) && !cat.some((s) => s.id === 'bad id!'));
  const saved = K.parseChecklistForm({ 's_permit-check': '* Permit number on file', 's_sales-estimate': '* Estimate sent' }, custom);
  assert.deepEqual(K.missingRequired(saved, 'permit-check', []), ['Permit number on file']);
  assert.match(K.cardChecklist({ id: 'demo-3', step: 'sales-estimate' }, saved, {}, '/projects?mode=demo', '/projects/demo-3/check?lane=estimate'), /action="\/projects\/demo-3\/check\?lane=estimate"/);
  const h = K.checklistsPage({ page: ({ body }) => body, user: {}, saved, custom });
  assert.ok(h.includes('Sales Board') && h.includes('Permit check') && h.includes('Custom'));
});

test('checklists: Permits and Purchasing columns are stages too', () => {
  const cat = K.stageCatalog([]);
  assert.ok(cat.some((s) => s.id === 'permits-submitted' && s.board === 'permits') && cat.some((s) => s.id === 'purchasing-ordered' && s.board === 'purchasing'));
  assert.deepEqual(K.missingRequired(null, 'purchasing-ordered', [0]), ['Expected date entered']);
  const h = K.checklistsPage({ page: ({ body }) => body, user: {}, saved: null });
  assert.ok(h.includes('Permits Board') && h.includes('Purchasing Board'));
});
test('production board: Installs This Week groups install items by day', async () => {
  const Bd = await import('../app/boards.mjs');
  const h = Bd.installsWeek([{ id: 'a', name: 'Lobby sign', customer: 'Riverbend', handoff: 'Install', step: 'built', due: '2026-11-14', projectId: 'p' }, { id: 'b', name: 'Banner', customer: 'X', handoff: 'Pickup', step: 'built', due: '2026-11-14' }, { id: 'c', name: 'Far', customer: 'Y', handoff: 'Install', step: 'wip', due: '2026-12-30' }], '2026-11-13');
  assert.match(h, /1 install in the next 7 days[\s\S]*Lobby sign[\s\S]*Built, ready/);
  assert.ok(!h.includes('Banner') && !h.includes('Far'));
});
