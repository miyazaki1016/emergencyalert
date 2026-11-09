// Vercel ignoreCommand: 0 skips; 1 builds. No dependencies required.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const managementFiles = new Set([
  ".github/workflows/development-preflight.yml",
  "scripts/development_preflight.py",
  "tests/test_development_preflight.py",
  ".github/workflows/development-inventory.yml",
  "docs/DEVELOPMENT_LEDGER.md",
  "docs/DEVELOPMENT_OPERATIONS_INDEX.md",
  "scripts/development_inventory.py",
  "scripts/development_inventory_delta.py",
  "scripts/pr_approval_routing.py",
  "scripts/pr_review_handoff.py"
]);
export function maySkip(previous, git = (args) => execFileSync('git', args, {encoding: 'utf8', timeout: 20000})) {
  if (!/^[a-f0-9]{40}$/i.test(previous || '')) return false;
  try {
    const paths = git(['diff', '--name-only', '--no-renames', '-z', previous, 'HEAD', '--']).split('\0').filter(Boolean);
    return paths.length > 0 && paths.every(path => managementFiles.has(path) ||
      (path.startsWith('docs/') && /\.(md|mdx|txt)$/i.test(path)) ||
      (!path.includes('/') && /\.md$/i.test(path)));
  } catch { return false; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Manual CLI deployments remain available, including docs-only redeploys.
  const manual = process.env.FORCE_VERCEL_BUILD === '1';
  const skip = !manual && maySkip(process.env.VERCEL_GIT_PREVIOUS_SHA);
  console.log(skip ? 'Skip: documentation/management-only change.' : 'Build: application change, manual deployment, or unavailable baseline.');
  process.exit(skip ? 0 : 1);
}
