import test from 'node:test';
import assert from 'node:assert/strict';

const N = await import('../app/create.mjs');

test('new project: prospect by default, validated, value parsed', () => {
  const l = N.newProject([], { name: 'Truck wrap', company: 'NKY Plumbing', total: '$4,500' }, { id: 'new-1', salesperson: 'Phil' });
  assert.deepEqual([l[0].lane, l[0].total, l[0].status], ['prospect', 4500, 'New']);
  assert.equal(N.newProject([], { name: 'Banner', company: 'Acme', lane: 'estimate' }, { id: 'x' })[0].lane, 'estimate');
  assert.equal(N.newProject([], { name: 'Banner', company: 'Acme', lane: 'complete' }, { id: 'x' })[0].lane, 'prospect');
  assert.throws(() => N.newProject([], { name: '', company: 'Acme' }), /name/);
  assert.throws(() => N.newProject([], { name: 'Banner', company: '' }), /customer/);
  assert.throws(() => N.newProject([], { name: 'Banner', company: 'Acme', total: 'lots' }), /number/);
});

test('+ New menu: one place to create things', () => {
  const h = N.newMenu();
  assert.ok(h.includes('>New<svg') && h.includes('/projects/new') && h.includes('/activities?new=1'));
  assert.ok(N.newProjectPage({ user: {}, error: '<b>x</b>' }).includes('&lt;b&gt;x'));
});
