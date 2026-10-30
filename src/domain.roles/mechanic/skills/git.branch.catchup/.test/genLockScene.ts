import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
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
 * .what = regenerate pnpm-lock.yaml in a clone, lockfile only
 */
const genLockfile = (input: { cwd: string }): void => {
  const result = spawnSync('pnpm', ['install', '--lockfile-only'], {
    cwd: input.cwd,
    encoding: 'utf-8',
  });
  if (result.status !== 0)
    throw new MalfunctionError('fixture pnpm install --lockfile-only failed', {
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
  manifest: string;
  files: Record<string, string>;
  message: string;
}): void => {
  fs.writeFileSync(path.join(input.cwd, 'package.json'), input.manifest);
  genLockfile({ cwd: input.cwd });
  commitFiles({ cwd: input.cwd, files: input.files, message: input.message });
};

/**
 * .what = a scene with a pnpm repo; main and the branch each change deps
 *         (and, optionally, other files)
 */
export const genLockScene = (input: {
  slug: string;
  base?: Record<string, string>;
  mainManifest: string;
  mainFiles?: Record<string, string>;
  branchManifest: string;
  branchFiles?: Record<string, string>;
}): CatchupScene => {
  // fail fast: the lock path needs a real pnpm
  if (spawnSync('pnpm', ['--version']).status !== 0)
    throw new ConstraintError('pnpm is required for the lock refresh suites', {
      hint: 'install pnpm (npm i -g pnpm), then rerun',
    });

  const scene = genCatchupScene({
    slug: input.slug,
    base: {
      ...LOCAL_PACKAGES,
      ...(input.base ?? {}),
      'package.json': asManifest({
        deps: { a: 'file:./pkgs/a' },
        devDeps: { c0: 'file:./pkgs/c0' },
      }),
    },
    ahead: null,
    beforeBaseCommit: genLockfile,
  });

  // the branch's own dep change
  commitManifest({
    cwd: scene.workDir,
    manifest: input.branchManifest,
    files: input.branchFiles ?? {},
    message: 'feat(deps): the branch dep change',
  });

  // main's dep change
  runGit({ cwd: scene.upstreamDir, args: ['pull', '-q', 'origin', 'main'] });
  commitManifest({
    cwd: scene.upstreamDir,
    manifest: input.mainManifest,
    files: input.mainFiles ?? {},
    message: 'feat(deps): the main dep change',
  });
  runGit({ cwd: scene.upstreamDir, args: ['push', '-q', 'origin', 'main'] });
  return scene;
};

/**
 * .what = the files git holds as unmerged in the scene's clone
 */
export const getConflictFiles = (scene: CatchupScene): string =>
  runGit({
    cwd: scene.workDir,
    args: ['diff', '--name-only', '--diff-filter=U'],
  });
