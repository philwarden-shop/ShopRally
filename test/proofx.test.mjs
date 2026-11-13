import test from 'node:test';
import assert from 'node:assert/strict';

const P = await import('../app/proofx.mjs');

test('proof versions: Google Drive links only, numbering continues after existing versions', () => {
  let l = P.addProofVersion([], { link: 'https://drive.google.com/file/d/abc/view', note: 'Bigger logo' }, { by: 'phil@x.com', at: 't', startAt: 3 });
  assert.equal(l[0].v, 4);
  l = P.addProofVersion(l, { link: 'https://docs.google.com/presentation/d/x' }, { by: 'p', at: 't' });
  assert.equal(P.latestLink(l).v, 5);
  assert.throws(() => P.addProofVersion(l, { link: 'https://dropbox.com/x' }, {}), /Google Drive link/);
  assert.throws(() => P.addProofVersion(l, { link: 'javascript:alert(1)' }, {}), /Google Drive link/);
  const h = P.versionsHtml('i61', l, [{ v: 1, file: 'v1.pdf' }]);
  assert.ok(h.includes('Proof Versions · 3') && h.includes('Open in Google Drive') && h.includes('+ Add New Proof Version'));
  assert.ok(h.indexOf('v5') < h.indexOf('v4') && h.indexOf('v4') < h.indexOf('v1'));
});
