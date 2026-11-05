import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maySkip } from '../scripts/vercel-build-guard.mjs';
const sha = 'a'.repeat(40);
const paths = (...names) => () => names.join('\0') + '\0';
test('documentation and management changes skip', () => {
  assert.equal(maySkip(sha, paths('docs/guide.md', 'README.md', 'docs/DEVELOPMENT_LEDGER.md')), true);
});
test('application and mixed changes build', () => {
  for (const name of ['app/page.tsx', 'public/icon.png', 'vercel.json', 'package.json', 'scripts/unknown.py', 'docs/evidence/image.png']) {
    assert.equal(maySkip(sha, paths('docs/guide.md', name)), false, name);
  }
});
test('unknown baseline, empty diff and Git failures build', () => {
  for (const previous of [undefined, '', 'invalid']) assert.equal(maySkip(previous, paths('README.md')), false);
  assert.equal(maySkip(sha, () => ''), false);
  assert.equal(maySkip(sha, () => { throw Error('missing shallow history'); }), false);
});
test('diff uses previous deployed SHA, catches deletions and disables rename detection', () => {
  assert.equal(maySkip(sha, args => {
    assert.deepEqual(args, ['diff', '--name-only', '--no-renames', '-z', sha, 'HEAD', '--']);
    return 'app/deleted.tsx\0docs/renamed.md\0';
  }), false);
});
