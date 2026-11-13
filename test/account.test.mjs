import test from 'node:test';
import assert from 'node:assert/strict';

const AC = await import('../app/account.mjs');

test('account prefs: defaults, cookie round-trip, unknown values refused', () => {
  assert.deepEqual(AC.readPrefs({}), { theme: 'Classic', loc: 'nky', as: 'sales' });
  const [[n, v]] = AC.prefChange({ theme: 'Warm Sand' });
  assert.equal(AC.readPrefs({ [n]: v }).theme, 'Warm Sand');
  assert.deepEqual(AC.prefChange({ loc: 'two' }), [['smx_loc', 'two']]);
  assert.throws(() => AC.prefChange({ theme: '<x>' }), /unknown theme/);
  assert.throws(() => AC.prefChange({ as: 'boss' }), /unknown role/);
  assert.equal(AC.readPrefs({ smx_theme: 'Nope', smx_loc: 'mars' }).loc, 'nky');
});

test('account menu: 5 themes, both locations, preview roles only when allowed, themes change page background', () => {
  const h = AC.accountMenu({ email: 'phil.warden@fastsigns.com' }, { theme: 'Dark', loc: 'two', as: 'design' });
  assert.equal((h.match(/ theme"/g) || []).length, 5);
  assert.ok(h.includes('Northern Kentucky') && h.includes('Second location') && h.includes('PREVIEW SALESMAX AS'));
  assert.ok(!AC.accountMenu({}, undefined, { canPreview: false }).includes('PREVIEW'));
  assert.match(AC.themeCss('Dark'), /--bg:#12161f/);
  assert.match(AC.themeCss('whatever'), /--bg:#f4f6f9/);
});
