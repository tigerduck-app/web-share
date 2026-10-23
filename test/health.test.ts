import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { commitOf } from '../scripts/health.ts';

const SHA = '0123456789abcdef0123456789abcdef01234567';

/** git answering [answers] by its first argument, or failing as it does outside a repository. */
const gitAnswering = (answers: Record<string, string>) => (...args: string[]) => {
  const answer = answers[args[0]];
  if (answer === undefined) throw new Error('not a git repository');
  return answer;
};

test('a Workers Builds build is the commit it names', () => {
  assert.equal(commitOf({ WORKERS_CI_COMMIT_SHA: SHA }, gitAnswering({})), SHA);
});

test('a local build asks git, and says so when the tree has changes not committed', () => {
  assert.equal(commitOf({}, gitAnswering({ 'rev-parse': `${SHA}\n`, status: '' })), SHA);
  assert.equal(commitOf({}, gitAnswering({ 'rev-parse': `${SHA}\n`, status: ' M public/index.html\n' })), `${SHA}-dirty`);
});

test('outside git there is no commit to name', () => {
  assert.equal(commitOf({}, gitAnswering({})), null);
});

test('the build writes what /health answers', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'health-')), 'health');
  execFileSync(process.execPath, [new URL('../scripts/health.ts', import.meta.url).pathname, out], {
    env: { ...process.env, WORKERS_CI_COMMIT_SHA: SHA },
  });
  const health = JSON.parse(readFileSync(out, 'utf8'));
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  assert.deepEqual(Object.keys(health), ['status', 'version', 'commit', 'builtAt']);
  assert.equal(health.status, 'ok');
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(health.version, version);
  assert.equal(health.commit, SHA);
  assert.ok(Math.abs(Date.parse(health.builtAt) - Date.now()) < 60_000, health.builtAt);
});
