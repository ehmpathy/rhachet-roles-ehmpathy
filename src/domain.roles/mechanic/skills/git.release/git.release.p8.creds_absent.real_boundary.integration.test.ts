/**
 * .what = the git.release suite with no mock at the external boundary: the
 *         real `gh` stays on PATH, the real `fetch_github_token` runs, and the
 *         credential is absent
 *
 * .why  = `rule.require.external-contract-integration-tests` asks for at least
 *         one real integration test, with at least the lack-of-creds failure
 *         case. that case needs the credential's absence, not a grant, so it
 *         runs anywhere. json shape drift needs a real token and is deferred
 *         (.dream/2026_09_26.add-real-gh-contract-test-for-git-release.dream.md)
 *
 * .note = no part of the fixture simulates a failure. `fetch_github_token`
 *         resolves `<repo>/node_modules/.bin/rhachet`, which this suite never
 *         creates, so the credential source is truly absent. a stub that
 *         returns "no credential" would pass whatever the product did
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

import { asSnapshotReady } from './.test/infra/snapshotOps';

// the credential gate fails fast (an absent file, not a network wait), but the
// real `gh` may be consulted on the plan path, so allow room
jest.setTimeout(150000);

const SKILL_PATH = path.join(
  __dirname,
  '../../../../../dist/domain.roles/mechanic/skills/git.release/git.release.sh',
);

/**
 * .what = the two files this suite's verdict turns on, as (src, dist) pairs
 * .why  = the suite runs the gitignored `dist/` copy, so an unbuilt `src/`
 *         edit would read as a product defect. build freshness is a
 *         precondition, asserted. the build copies `*.sh` verbatim, so
 *         byte-equality is the test
 */
const BUILT_PAIRS: { name: string; src: string; dist: string }[] = [
  'git.release.sh',
  'git.release.operations.sh',
].map((name) => ({
  name,
  src: path.join(__dirname, name),
  dist: path.join(path.dirname(SKILL_PATH), name),
}));

/**
 * .what = a temp git repo with no gh mock and no rhachet stub
 * .why  = the absence IS the fixture. see the header: a stub cannot fail for
 *         the reason this suite exists to check
 */
const setupRealBoundaryRepo = (input: {
  slug: string;
}): { tempDir: string; emptyBinDir: string } => {
  const tempDir = genTempDir({ slug: input.slug, git: true });

  // an empty bin dir: no `gh` mock, no `rhachet` stub, so the real `gh` runs
  const emptyBinDir = path.join(tempDir, '.emptybin');
  fs.mkdirSync(emptyBinDir, { recursive: true });

  configureTestGitUser({ cwd: tempDir });
  spawnSync(
    'git',
    ['remote', 'add', 'origin', 'https://github.com/test/repo'],
    { cwd: tempDir },
  );
  spawnSync(
    'git',
    ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main'],
    { cwd: tempDir },
  );
  spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], { cwd: tempDir });

  const meterDir = path.join(tempDir, '.meter');
  fs.mkdirSync(meterDir, { recursive: true });
  fs.writeFileSync(
    path.join(meterDir, 'git.commit.uses.jsonc'),
    JSON.stringify({ uses: 'infinite', push: 'allow', stage: 'allow' }),
  );

  // `${tempDir}/node_modules/.bin/rhachet` is never created: fetch_github_token
  // resolves that path, so the credential is truly unavailable
  return { tempDir, emptyBinDir };
};

const runSkillWithNoCreds = (
  args: string[],
  env: { tempDir: string; emptyBinDir: string },
): { stdout: string; stderr: string; status: number } => {
  const result = spawnSync('bash', [SKILL_PATH, ...args], {
    cwd: env.tempDir,
    env: {
      ...process.env,
      PATH: `${env.emptyBinDir}:${process.env.PATH}`,
      TERM: 'dumb',
      HOME: env.tempDir,
      GIT_RELEASE_TEST_MODE: 'true',
      // every credential channel cleared (the skill also unsets GITHUB_TOKEN)
      GH_TOKEN: '',
      GITHUB_TOKEN: '',
      EHMPATHY_SEATURTLE_GITHUB_TOKEN: '',
      // keep the keyrack timeout short: an absent binary returns at once, but
      // this bounds the suite if a future change makes the call reach a network
      FETCH_TOKEN_TIMEOUT: '10',
    },
    encoding: 'utf-8',
    timeout: 120000,
  });

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? -1,
  };
};

/**
 * .what = replace the lines the real `gh` wrote with a stable token
 * .why  = gh's own text belongs to the installed gh build, not to this
 *         skill; the snapshot must pin only the frame the skill authors, so a
 *         gh upgrade that rewords its auth hint cannot redden the run.
 *         the gh text itself stays pinned by intent in an explicit assertion
 */
const asGhDiagnosticMasked = (input: { stderr: string }): string => {
  const skillFrameStart = input.stderr.indexOf('error: could not query github');
  if (skillFrameStart <= 0) return input.stderr;
  return `<gh diagnostic>\n${input.stderr.slice(skillFrameStart)}`;
};

describe('git.release :: the real external boundary, with no credential', () => {
  given(
    '[case1] the real gh binary on PATH, and no credential reachable anywhere',
    () => {
      // a precondition: with no `gh`, the suite would test an absent binary
      then('the real gh binary is genuinely on PATH', () => {
        const probe = spawnSync('bash', ['-c', 'command -v gh'], {
          encoding: 'utf-8',
        });
        expect({
          resolved: (probe.stdout ?? '').trim().length > 0,
        }).toEqual({ resolved: true });
      });

      // a precondition: a stale dist names its own cause here, rather than
      // read as a product defect below (see BUILT_PAIRS)
      then('the dist build this suite runs is current with src', () => {
        const drifted = BUILT_PAIRS.filter(
          (pair) =>
            !fs.existsSync(pair.dist) ||
            fs.readFileSync(pair.src, 'utf-8') !==
              fs.readFileSync(pair.dist, 'utf-8'),
        ).map((pair) => pair.name);

        expect({
          drifted,
          hint:
            drifted.length === 0
              ? 'none'
              : 'dist is behind src — run `npm run build`, then re-run',
        }).toEqual({ drifted: [], hint: 'none' });
      });

      when('[t0] --mode apply reaches the credential gate', () => {
        const result = useThen('the skill runs to completion', () =>
          runSkillWithNoCreds(
            ['--into', 'main', '--mode', 'apply'],
            setupRealBoundaryRepo({ slug: 'git-release-nocreds-apply' }),
          ),
        );

        then('it does not exit clean', () => {
          expect({ didNotSucceed: result.status !== 0 }).toEqual({
            didNotSucceed: true,
          });
        });

        then(
          '🔴 a dead credential does NOT read as "no open branch pr"',
          () => {
            // the crickets frame would hide a dead credential behind "no pr",
            // and its remedy ("use git.commit.push") is the wrong next move
            expect({
              claimedNoPr: result.stdout.includes('no open branch pr'),
              claimedCrickets: result.stdout.includes('crickets'),
            }).toEqual({ claimedNoPr: false, claimedCrickets: false });
          },
        );

        then('the real gh auth failure reaches the caller', () => {
          // the real gh text reaches the caller (rule.require.failloud), which
          // also shows no mock stood in
          expect({
            carriesTheRealGhCause: result.stderr.includes('gh auth login'),
            namesTheQueryThatFailed: result.stderr.includes(
              'could not query github',
            ),
            saysItIsNotANoPr: result.stderr.includes(
              "NOT the same as 'no pr found'",
            ),
          }).toEqual({
            carriesTheRealGhCause: true,
            namesTheQueryThatFailed: true,
            saysItIsNotANoPr: true,
          });
        });

        then('the frame reads as a caller reads it', () => {
          // .note = gh's exit code and text vary by gh build; the steps
          //         above assert the failure and the gh text by intent, so the
          //         snap holds only the frame this skill authors
          expect({
            stdout: asSnapshotReady(result.stdout),
            stderr: asSnapshotReady(
              asGhDiagnosticMasked({ stderr: result.stderr }),
            ),
          }).toMatchSnapshot();
        });
      });

      when(
        '[t1] 🟢 CONTROL — a gh that SUCCEEDS and reports no PR still reads as crickets',
        () => {
          const result = useThen('the skill runs to completion', () => {
            const env = setupRealBoundaryRepo({
              slug: 'git-release-genuine-no-pr',
            });
            // the one mock here: a gh that exits 0 with no rows is a genuine
            // "no pr", which keeps its crickets frame
            fs.writeFileSync(
              path.join(env.emptyBinDir, 'gh'),
              '#!/bin/bash\nexit 0\n',
              { mode: 0o755 },
            );
            return runSkillWithNoCreds(['--into', 'main'], env);
          });

          then(
            'the crickets frame survives — the repair narrows the LIE, never the legitimate empty',
            () => {
              // the control for [t0]: a repair that deleted the crickets path
              // would pass [t0]; together they pin "tell the cases apart"
              expect({
                stillCrickets: result.stdout.includes('no open branch pr'),
                didNotClaimAQueryFailure: !result.stderr.includes(
                  'could not query github',
                ),
              }).toEqual({
                stillCrickets: true,
                didNotClaimAQueryFailure: true,
              });
            },
          );
        },
      );
    },
  );
});
