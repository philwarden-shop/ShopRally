// Fails the build if anything that looks like a key, token or private key is saved in the code.
// Keys live only in AWS's locked storage (Secrets Manager / SSM), never in the repository.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}/, 'GitHub token'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/sk_live_[A-Za-z0-9]{16,}/, 'live payment key'],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
];
function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    if (['.git', 'node_modules', 'snaps'].includes(n)) return [];
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}
test('no keys, tokens or private keys are saved in the code', () => {
  const hits = [];
  for (const f of files(root)) {
    if (f.endsWith('nosecrets.test.mjs')) continue;
    const s = readFileSync(f, 'utf8');
    for (const [re, what] of PATTERNS) if (re.test(s)) hits.push(`${f.slice(root.length + 1)}: looks like a ${what}`);
  }
  assert.deepEqual(hits, []);
});
