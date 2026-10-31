import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { MalfunctionError } from 'helpful-errors';
import * as path from 'path';
import { genTempDir } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';
import { seedTestSponsor } from '@src/.test/seedTestSponsor';

const SKILL_DIR = path.join(__dirname, '..');

/**
 * .what = a catch-up scene: a bare origin, the mechanic's clone on a feature
 *         branch, and an upstream clone that moves origin/main
 * .why = every catchup suite needs main to move under a pushed branch; one
 *        fixture keeps the shape the same across suites
 */
export interface CatchupScene {
  baseDir: string;
  bareDir: string;
  workDir: string;
  upstreamDir: string;
  homeDir: string;
  branch: string;
}

/**
 * .what = run git in a dir, and fail loud if it did not work
 * .why = a half-built fixture reads as a skill defect downstream
 */
export const runGit = (input: { cwd: string; args: string[] }): string => {
  const result = spawnSync('git', input.args, {
    cwd: input.cwd,
    encoding: 'utf-8',
  });
  if (result.status !== 0)
    throw new MalfunctionError('fixture git command failed', {
      args: input.args,
      cwd: input.cwd,
      stderr: result.stderr,
    });
  return result.stdout.trim();
};

/**
 * .what = write files, then commit them, in a clone
 */
export const commitFiles = (input: {
  cwd: string;
  files: Record<string, string>;
  message: string;
}): void => {
  for (const [rel, content] of Object.entries(input.files)) {
    const abs = path.join(input.cwd, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  runGit({ cwd: input.cwd, args: ['add', '-A'] });
  runGit({ cwd: input.cwd, args: ['commit', '-m', input.message] });
};

/**
 * .what = move origin/main: commit in the upstream clone, then push
 */
export const moveMain = (input: {
  scene: CatchupScene;
  files: Record<string, string>;
  message: string;
}): void => {
  runGit({ cwd: input.scene.upstreamDir, args: ['pull', '-q', 'origin', 'main'] });
  commitFiles({
    cwd: input.scene.upstreamDir,
    files: input.files,
    message: input.message,
  });
  runGit({ cwd: input.scene.upstreamDir, args: ['push', '-q', 'origin', 'main'] });
};

/**
 * .what = write the local commit quota in the mechanic's clone
 */
export const writeMeter = (input: {
  scene: CatchupScene;
  uses: number | 'infinite';
  stage?: 'allow' | 'block';
  push?: 'allow' | 'block';
}): void => {
  const meterDir = path.join(input.scene.workDir, '.meter');
  fs.mkdirSync(meterDir, { recursive: true });
  fs.writeFileSync(
    path.join(meterDir, 'git.commit.uses.jsonc'),
    JSON.stringify(
      {
        uses: input.uses,
        push: input.push ?? 'allow',
        stage: input.stage ?? 'allow',
      },
      null,
      2,
    ),
  );
};

/**
 * .what = read the uses value of the local commit quota
 */
export const readMeterUses = (input: {
  scene: CatchupScene;
}): number | string => {
  const raw = fs.readFileSync(
    path.join(input.scene.workDir, '.meter', 'git.commit.uses.jsonc'),
    'utf-8',
  );
  return JSON.parse(raw).uses;
};

/**
 * .what = build a scene: origin with one commit on main, the work clone on
 *         `branch` with its own commits pushed, an upstream clone for main
 */
export const genCatchupScene = (input: {
  slug: string;
  branch?: string;
  base?: Record<string, string>;
  ahead?: Record<string, string> | null;
  uses?: number | 'infinite' | null;
  stage?: 'allow' | 'block';
  // runs in the clone after the base files land, before the base commit
  // (e.g. to generate a lockfile the base must hold)
  beforeBaseCommit?: (input: { cwd: string }) => void;
}): CatchupScene => {
  const branch = input.branch ?? 'turtle/feat-wave-report';
  const baseDir = genTempDir({ slug: input.slug, git: false });
  const bareDir = path.join(baseDir, 'origin.git');
  const workDir = path.join(baseDir, 'work');
  const upstreamDir = path.join(baseDir, 'upstream');
  const homeDir = path.join(baseDir, 'home');

  // a hermetic HOME: the org grant the commit gates read, no global blocker
  const orgMeterDir = path.join(
    homeDir,
    '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
  );
  fs.mkdirSync(orgMeterDir, { recursive: true });
  fs.writeFileSync(
    path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
    JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
  );

  // the bare origin, on main
  fs.mkdirSync(bareDir, { recursive: true });
  runGit({ cwd: bareDir, args: ['init', '-q', '--bare', '-b', 'main'] });

  // the mechanic's clone: one commit on main, pushed
  runGit({ cwd: baseDir, args: ['clone', '-q', bareDir, workDir] });
  configureTestGitUser({ cwd: workDir });
  runGit({ cwd: workDir, args: ['checkout', '-q', '-B', 'main'] });
  const baseFiles: Record<string, string> = {
    '.gitignore': '.meter\nnode_modules\n',
    // the org the commit gates read, as a real repo commits it
    '.agent/keyrack.yml': 'org: ehmpathy\n',
    'readme.md': '# wave report\n',
    ...(input.base ?? {}),
  };
  for (const [rel, content] of Object.entries(baseFiles)) {
    fs.mkdirSync(path.dirname(path.join(workDir, rel)), { recursive: true });
    fs.writeFileSync(path.join(workDir, rel), content);
  }
  input.beforeBaseCommit?.({ cwd: workDir });
  commitFiles({
    cwd: workDir,
    files: {},
    message: 'feat(init): seed the wave report',
  });
  runGit({ cwd: workDir, args: ['push', '-q', '-u', 'origin', 'main'] });

  // the upstream clone, which moves main later
  runGit({ cwd: baseDir, args: ['clone', '-q', bareDir, upstreamDir] });
  configureTestGitUser({ cwd: upstreamDir });

  // the feature branch, with its own commits, pushed
  runGit({ cwd: workDir, args: ['checkout', '-q', '-b', branch] });
  const ahead =
    input.ahead === undefined ? { 'src/spot.ts': 'export const spot = "pipeline";\n' } : input.ahead;
  if (ahead) {
    commitFiles({
      cwd: workDir,
      files: ahead,
      message: 'feat(spot): add the spot',
    });
  }
  runGit({ cwd: workDir, args: ['push', '-q', '-u', 'origin', branch] });

  // the sponsor and the quota
  seedTestSponsor({ cwd: workDir });
  const scene: CatchupScene = {
    baseDir,
    bareDir,
    workDir,
    upstreamDir,
    homeDir,
    branch,
  };
  if (input.uses !== null)
    writeMeter({ scene, uses: input.uses ?? 4, stage: input.stage });
  return scene;
};

/**
 * .what = sanitize output for stable snapshots
 * .why = shas and temp paths change on each run
 */
export const asStableOutput = (output: string): string =>
  output
    .replace(/\b[0-9a-f]{7,40}\b/g, 'HASH123')
    // mask the temp root through its timestamped dir; the subpath after it stays in the snap
    .replace(/\/[^\s']*\.temp\/(?:[^\s'/]+\/)*?\d{4}-\d{2}-\d{2}T[^\s'/]+/g, '/TEMP');

/**
 * .what = run the catchup dispatcher in the scene's clone
 * .why = tests exercise the real entry point, with a hermetic HOME
 */
export const runCatchup = (input: {
  scene: CatchupScene;
  args: string[];
  env?: Record<string, string>;
  // a dir under the clone to run from (default: the clone root)
  subdir?: string;
}): { stdout: string; stderr: string; exitCode: number } => {
  const result = spawnSync(
    'bash',
    [path.join(SKILL_DIR, 'git.branch.catchup.sh'), ...input.args],
    {
      cwd: path.join(input.scene.workDir, input.subdir ?? ''),
      encoding: 'utf-8',
      env: { ...process.env, HOME: input.scene.homeDir, ...input.env },
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
};

/**
 * .what = HEAD facts: parent count, author, full message
 */
export const getHeadFacts = (input: {
  scene: CatchupScene;
}): { sha: string; parents: number; author: string; message: string } => {
  const cwd = input.scene.workDir;
  const parentsLine = runGit({ cwd, args: ['log', '-1', '--format=%P'] });
  return {
    sha: runGit({ cwd, args: ['rev-parse', 'HEAD'] }),
    parents: parentsLine.split(' ').filter(Boolean).length,
    author: runGit({ cwd, args: ['log', '-1', '--format=%an <%ae>'] }),
    message: runGit({ cwd, args: ['log', '-1', '--format=%B'] }),
  };
};

/**
 * .what = point the clone at a commit-msg hook that rejects every commit
 * .why = proves the commit step fails loud and leaves the merge in flight,
 *        as when husky's commitlint refuses a message
 */
export const setCommitMsgHookToReject = (input: {
  scene: CatchupScene;
}): void => {
  const hooksDir = path.join(input.scene.baseDir, 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  fs.writeFileSync(
    path.join(hooksDir, 'commit-msg'),
    '#!/bin/sh\necho "commitlint: the header was refused" >&2\necho "commitlint: see the commit convention" >&2\nexit 1\n',
    { mode: 0o755 },
  );
  runGit({
    cwd: input.scene.workDir,
    args: ['config', 'core.hooksPath', hooksDir],
  });
};

/**
 * .what = the files git holds as unmerged in the scene's clone
 */
export const getConflictFiles = (scene: CatchupScene): string =>
  runGit({
    cwd: scene.workDir,
    args: ['diff', '--name-only', '--diff-filter=U'],
  });

/**
 * .what = is a merge in flight in the scene's clone?
 */
export const isMergeInFlight = (input: { scene: CatchupScene }): boolean =>
  spawnSync('git', ['rev-parse', '-q', '--verify', 'MERGE_HEAD'], {
    cwd: input.scene.workDir,
  }).status === 0;
