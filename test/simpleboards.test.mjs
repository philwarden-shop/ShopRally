import test from 'node:test';
import assert from 'node:assert/strict';

const SB = await import('../app/simpleboards.mjs');

test('permits: moves only to real columns; Approved needs a Permit #', () => {
  const r = SB.demoRecords('permits');
  assert.throws(() => SB.moveRecord(r, 'pm1', 'approved', 'permits'), /Permit #/);
  assert.throws(() => SB.moveRecord(r, 'pm1', 'tv', 'permits'), /column does not exist/);
  assert.throws(() => SB.moveRecord(r, 'zz', 'review', 'permits'), /not here/);
  assert.equal(SB.moveRecord(r, 'pm1', 'submitted', 'permits').find((x) => x.id === 'pm1').col, 'submitted');
  let r2 = SB.updateFields(r, 'pm1', { permitNo: 'P-1', issued: '2026-11-12', expires: '2027-05-12' }, 'permits');
  assert.equal(SB.moveRecord(r2, 'pm1', 'approved', 'permits').find((x) => x.id === 'pm1').col, 'approved');
});

test('permits: field edits validate dates and order', () => {
  const r = SB.demoRecords('permits');
  assert.throws(() => SB.updateFields(r, 'pm1', { issued: 'soon' }, 'permits'), /needs a date/);
  assert.throws(() => SB.updateFields(r, 'pm1', { issued: '2026-11-12', expires: '2026-11-01' }, 'permits'), /after Issued/);
});

test('boards: board and list views, no TV mode, drag script, escaped, purchasing has no permit fields', () => {
  const recs = SB.demoRecords('permits').map((x) => (x.id === 'pm1' ? { ...x, name: '<b>x</b>' } : x));
  const b = SB.simpleBoardPage({ user: {}, board: 'permits', records: recs, view: 'board' });
  assert.ok(b.includes('draggable="true"') && b.includes('/static/board.js') && !b.includes('<b>x</b>'));
  assert.ok(!/TV mode|>TV</.test(b));
  const l = SB.simpleBoardPage({ user: {}, board: 'permits', records: recs, view: 'list' });
  for (const s of ['Application #', 'Permit #', 'Issued', 'Expires']) assert.ok(l.includes(s), s);
  assert.ok(!SB.simpleBoardPage({ user: {}, board: 'purchasing', records: SB.demoRecords('purchasing') }).includes('Permit Details'));
});
