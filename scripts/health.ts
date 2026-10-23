// Run by `npm run build`: writes public/health, what /health answers. It says the host is up and
// which build it serves. A file, as everything on this host is: no Worker code runs, so none can
// read a share link's path.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface Health {
  status: 'ok';
  /** package.json's. */
  version: string;
  commit: string | null;
  /** ISO 8601, UTC. */
  builtAt: string;
}

/**
 * The commit being built. Workers Builds names it; a local build asks [git], and marks a tree with
 * changes not committed. Null outside git.
 */
export function commitOf(env: Record<string, string | undefined>, git: (...args: string[]) => string): string | null {
  if (env.WORKERS_CI_COMMIT_SHA) return env.WORKERS_CI_COMMIT_SHA;
  try {
    const sha = git('rev-parse', 'HEAD').trim();
    return git('status', '--porcelain').trim() ? `${sha}-dirty` : sha;
  } catch {
    return null;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] ?? fileURLToPath(new URL('../public/health', import.meta.url));
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
  const git = (...args: string[]) =>
    execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const health: Health = { status: 'ok', version, commit: commitOf(process.env, git), builtAt: new Date().toISOString() };
  writeFileSync(out, `${JSON.stringify(health)}\n`);
}
