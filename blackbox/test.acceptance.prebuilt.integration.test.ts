import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

/**
 * .what = integration tests for the repo skill `test.acceptance.prebuilt.sh`
 * .why = the skill lives under `.agent/`, which the jest configs exclude, so its proof lives here
 *
 * .note = each case runs the skill inside a temp git repo; a stand-in `jest` bin there echoes the
 *         argv it receives, so the argv the skill builds is proven without a real jest run
 */

const SKILL = path.join(
  __dirname,
  '..',
  '.agent/repo=.this/role=any/skills/test.acceptance.prebuilt.sh',
);

const runSkill = (input: {
  cwd: string;
  args: string[];
  jestExit?: number;
}): { stdout: string; stderr: string; code: number } => {
  const result = spawnSync('bash', [SKILL, ...input.args], {
    cwd: input.cwd,
    env: { ...process.env, JEST_EXIT: String(input.jestExit ?? 0) },
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 60_000,
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    code: result.status ?? 1,
  };
};

/**
 * .what = a temp git repo, optionally with a built dist/ and a stand-in jest bin
 */
const genSkillRepo = (input: {
  slug: string;
  withDist: boolean;
}): { dir: string } => {
  const dir = genTempDir({ slug: input.slug, git: true });
  if (!input.withDist) return { dir };
  fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'dist', 'index.js'), '');
  const binDir = path.join(dir, 'node_modules', '.bin');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    path.join(binDir, 'jest'),
    '#!/usr/bin/env bash\necho "jest argv: $*"\nexit "${JEST_EXIT:-0}"\n',
    { mode: 0o755 },
  );
  return { dir };
};

describe('test.acceptance.prebuilt.sh', () => {
  given('[case1] a repo with a built dist/', () => {
    const repo = useBeforeAll(async () =>
      genSkillRepo({ slug: 'tap-built', withDist: true }),
    );

    when('[t0] the crew runs it with --scope and --resnap', () => {
      const res = useThen('it hands jest the acceptance config, exit 0', () => {
        const result = runSkill({
          cwd: repo.dir,
          args: ['--scope', 'blackbox/reef.acceptance.test.ts', '--resnap'],
        });
        expect(result.code).toEqual(0);
        return result;
      });

      then('the argv carries the config, the update flag, and the scope', () => {
        expect(res.stdout).toContain(
          'jest argv: -c ./jest.acceptance.config.ts --forceExit --verbose --runInBand --passWithNoTests --updateSnapshot blackbox/reef.acceptance.test.ts',
        );
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t1] the call carries the rhx --skill, --repo and --role flags', () => {
      then('the skill drops them, and jest never sees them', () => {
        const result = runSkill({
          cwd: repo.dir,
          args: [
            '--skill',
            'test.acceptance.prebuilt',
            '--repo',
            '.this',
            '--role',
            'any',
            '--scope',
            'blackbox/reef.acceptance.test.ts',
          ],
        });
        expect(result.code).toEqual(0);
        expect(result.stdout).toContain(
          'jest argv: -c ./jest.acceptance.config.ts --forceExit --verbose --runInBand --passWithNoTests blackbox/reef.acceptance.test.ts',
        );
        expect(result.stdout).not.toContain('--skill');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] an unknown flag is given', () => {
      then('it is refused on both streams, exit 2, before jest runs', () => {
        const result = runSkill({ cwd: repo.dir, args: ['--wave', 'big'] });
        expect(result.code).toEqual(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: unknown flag --wave (flags: --scope, --resnap)',
        );
        expect(result.stderr).toContain(
          '✋ ConstraintError: unknown flag --wave',
        );
        expect(result.stdout).not.toContain('jest argv');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] help is asked for', () => {
      then('it prints its usage, exit 0', () => {
        const result = runSkill({ cwd: repo.dir, args: ['--help'] });
        expect(result.code).toEqual(0);
        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toContain('--scope git.package.patch --resnap');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t4] jest fails', () => {
      then('its exit code passes through, and the output reaches both streams', () => {
        const result = runSkill({
          cwd: repo.dir,
          args: ['--scope', 'blackbox/reef.acceptance.test.ts'],
          jestExit: 1,
        });
        expect(result.code).toEqual(1);
        expect(result.stdout).toContain('jest argv:');
        expect(result.stderr).toContain('jest argv:');
        expect(result.stderr).toContain('🐢 bummer dude... jest exited 1');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] a repo with no built dist/', () => {
    const repo = useBeforeAll(async () =>
      genSkillRepo({ slug: 'tap-unbuilt', withDist: false }),
    );

    when('[t0] the crew runs it', () => {
      then('it is refused on both streams, exit 2, and names the build', () => {
        const result = runSkill({ cwd: repo.dir, args: [] });
        expect(result.code).toEqual(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: dist/index.js is absent',
        );
        expect(result.stdout).toContain(
          'npm run build:compile && npm run build:complete:dist',
        );
        expect(result.stderr).toContain('dist/index.js is absent');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
