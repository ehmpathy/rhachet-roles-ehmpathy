import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
import * as os from 'os';
import * as path from 'path';

import {
  CatchupScene,
  commitFiles,
  genCatchupScene,
  runGit,
} from './genCatchupScene';

/**
 * .what = the local packages the manifests depend on, by file: path
 * .why = file: deps need no registry, so pnpm writes a real lock with no
 *        network in the test
 */
const LOCAL_PACKAGES: Record<string, string> = {
  'pkgs/a/package.json': '{ "name": "a", "version": "1.0.0" }\n',
  'pkgs/b/package.json': '{ "name": "b", "version": "1.0.0" }\n',
  'pkgs/b2/package.json': '{ "name": "b2", "version": "1.0.0" }\n',
  'pkgs/c0/package.json': '{ "name": "c0", "version": "1.0.0" }\n',
};

/**
 * .what = a package.json with deps far apart from devDeps, so an edit to
 *         each merges clean while the lockfile still conflicts
 */
export const asManifest = (input: {
  deps: Record<string, string>;
  devDeps: Record<string, string>;
}): string =>
  `${JSON.stringify(
    {
      name: 'wave-report',
      version: '1.0.0',
      dependencies: input.deps,
      description: 'surf conditions for the crew',
      license: 'MIT',
      private: true,
      devDependencies: input.devDeps,
    },
    null,
    2,
  )}\n`;

/**
 * .what = the package managers lock refresh knows, each with the lockfile it
 *         writes and the install that writes it
 * .why = each pm is a real external cli; a scene per pm proves lock refresh
 *        against each one for real
 */
export type LockPm = 'pnpm' | 'npm' | 'yarn';
export const LOCK_FILE_OF_PM: Record<LockPm, string> = {
  pnpm: 'pnpm-lock.yaml',
  npm: 'package-lock.json',
  yarn: 'yarn.lock',
};
const LOCK_INSTALL_OF_PM: Record<LockPm, string[]> = {
  pnpm: ['install', '--lockfile-only'],
  npm: ['install', '--package-lock-only'],
  yarn: ['install'],
};

/**
 * .what = the env a pm cli needs to run with no prompt, under any HOME
 * .why = on a host where yarn is corepack's shim, corepack asks before its first
 *        download, and a spawn with no tty reads that as a refusal; its cache sits
 *        under HOME, which a scene swaps for a hermetic one. a pinned cache dir and
 *        no prompt let the real yarn run on every host that has node
 */
export const LOCK_ENV_OF_PM: Record<LockPm, Record<string, string>> = {
  pnpm: {},
  npm: {},
  yarn: {
    COREPACK_ENABLE_DOWNLOAD_PROMPT: '0',
    COREPACK_HOME:
      process.env.COREPACK_HOME ?? path.join(os.homedir(), '.cache/node/corepack'),
  },
};

/**
 * .what = regenerate the pm's lockfile in a clone
 */
const genLockfile = (input: { cwd: string; pm: LockPm }): void => {
  const result = spawnSync(input.pm, LOCK_INSTALL_OF_PM[input.pm], {
    cwd: input.cwd,
    encoding: 'utf-8', // note: library api requires this term
    env: { ...process.env, ...LOCK_ENV_OF_PM[input.pm] },
  });
  if (result.status !== 0)
    throw new MalfunctionError(`fixture ${input.pm} lockfile install failed`, {
      cwd: input.cwd,
      stderr: result.stderr,
      stdout: result.stdout,
    });
};

/**
 * .what = edit the manifest (plus any files) in a clone, regenerate its lock,
 *         commit all of it
 */
const commitManifest = (input: {
  cwd: string;
  pm: LockPm;
  manifest: string;
  files: Record<string, string>;
  message: string;
}): void => {
  fs.writeFileSync(path.join(input.cwd, 'package.json'), input.manifest);
  genLockfile({ cwd: input.cwd, pm: input.pm });
  commitFiles({ cwd: input.cwd, files: input.files, message: input.message });
};

/**
 * .what = a scene with a pnpm repo; main and the branch each change deps
 *         (and, optionally, other files)
 */
export const genLockScene = (input: {
  slug: string;
  pm?: LockPm;
  base?: Record<string, string>;
  baseManifest?: string;
  mainManifest: string;
  mainFiles?: Record<string, string>;
  branchManifest: string;
  branchFiles?: Record<string, string>;
  beforeBaseCommit?: (input: { cwd: string }) => void;
}): CatchupScene => {
  const pm = input.pm ?? 'pnpm';

  // fail fast: the lock path needs the real pm. probe outside this repo: its
  // package.json pins pnpm, and corepack refuses any other pm under that pin
  const probe = spawnSync(pm, ['--version'], {
    cwd: os.tmpdir(),
    env: { ...process.env, ...LOCK_ENV_OF_PM[pm] },
  });
  if (probe.status !== 0)
    throw new ConstraintError(`${pm} is required for the lock refresh suites`, {
      hint: `install ${pm} (npm i -g ${pm}), then rerun`,
      status: probe.status,
      stderr: probe.stderr?.toString() ?? null,
      error: probe.error?.message ?? null,
    });

  const scene = genCatchupScene({
    slug: input.slug,
    base: {
      ...LOCAL_PACKAGES,
      ...(input.base ?? {}),
      'package.json':
        input.baseManifest ??
        asManifest({
          deps: { a: 'file:./pkgs/a' },
          devDeps: { c0: 'file:./pkgs/c0' },
        }),
    },
    ahead: null,
    // the caller's own setup (e.g. a role link) lands in the base commit too
    beforeBaseCommit: ({ cwd }) => {
      input.beforeBaseCommit?.({ cwd });
      genLockfile({ cwd, pm });
    },
  });

  // the branch's own dep change
  commitManifest({
    cwd: scene.workDir,
    pm,
    manifest: input.branchManifest,
    files: input.branchFiles ?? {},
    message: 'feat(deps): the branch dep change',
  });

  // main's dep change
  runGit({ cwd: scene.upstreamDir, args: ['pull', '-q', 'origin', 'main'] });
  commitManifest({
    cwd: scene.upstreamDir,
    pm,
    manifest: input.mainManifest,
    files: input.mainFiles ?? {},
    message: 'feat(deps): the main dep change',
  });
  runGit({ cwd: scene.upstreamDir, args: ['push', '-q', 'origin', 'main'] });
  return scene;
};
