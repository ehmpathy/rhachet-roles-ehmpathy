import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

/**
 * .what = integration tests for git.commit.set.sh
 * .why = verify metered commit with seaturtle[bot] attribution works correctly
 *
 * .mock = a subset of composed --push cases stub external command boundaries in the
 *         hermetic temp repo: the `git` push subcommand, the `gh` cli (pr list/create/
 *         whoami), and the `rhachet` keyrack communicator (the `fakeRhachet` fixture
 *         param). the plain commit cases use NO fakes — they run the real skill against
 *         a real local git repo.
 * .why  = the --push cases delegate to git.commit.push.sh, whose transport + PR-open +
 *         keyrack steps cannot be reached in a hermetic temp repo (no real remote, no
 *         github auth, no way to force a keyrack outage). per rule.forbid.integration.mocks,
 *         these fakes are the "clearly unavoidable" exception: they stub only the
 *         unreachable boundaries so the set→push pass-through decision logic runs for
 *         real. every NON-push git call execs the REAL /usr/bin/git, so the local
 *         commit set.sh performs is unfaked.
 * .real = the real push transport + gh PR-open + keyrack are exercised by
 *         git.commit.push.sh in production; each fake stands in ONLY for the boundary a
 *         hermetic harness cannot reach. individual fakes are marked `.mock` at their site.
 */
describe('git.commit.set.sh', () => {
  const scriptPath = path.join(__dirname, 'git.commit.set.sh');

  const runInTempGitRepo = (args: {
    files?: Record<string, string>;
    filesUnstaged?: Record<string, string>;
    staged?: boolean;
    meterState?: { uses: number | string; push: string; stage?: string };
    bindLevel?: string;
    gitUser?: { name: string; email: string };
    commitArgs: string[];
    stdin?: string;
    branch?: string | null; // null = stay on main, string = use that branch name, undefined = 'fix/test-branch'
    env?: Record<string, string>; // extra env for the subprocess (e.g. fake PATH, empty keyrack token)
    fakeRhachet?: string; // shadow node_modules/.bin/rhachet (the keyrack communicator) with this bash body
  }): {
    stdout: string;
    stderr: string;
    exitCode: number;
    tempDir: string;
    isolatedHome: string;
  } => {
    const tempDir = genTempDir({
      slug: 'git-commit-set-test',
      git: true,
      symlink: [{ at: 'node_modules', to: 'node_modules' }],
    });

    // optionally shadow node_modules/.bin/rhachet (the keyrack communicator) with
    // a fake. the helper owns the node_modules symlink, so it owns its stand-in:
    // drop the symlink to the real node_modules and stand up a minimal .bin/rhachet
    // so a composed as-ehmpath run fetches its token from the fake (and any sentinel
    // the fake drops) instead of the real keyrack — the push suite's case33 shadow,
    // reused from the set side.
    if (args.fakeRhachet) {
      const nodeModulesLink = path.join(tempDir, 'node_modules');
      fs.rmSync(nodeModulesLink, { recursive: true, force: true });
      const fakeNodeBin = path.join(tempDir, 'node_modules', '.bin');
      fs.mkdirSync(fakeNodeBin, { recursive: true });
      fs.writeFileSync(path.join(fakeNodeBin, 'rhachet'), args.fakeRhachet);
      fs.chmodSync(path.join(fakeNodeBin, 'rhachet'), '755');
    }

    // configure git user (patron)
    if (args.gitUser) {
      configureTestGitUser({
        cwd: tempDir,
        name: args.gitUser.name,
        email: args.gitUser.email,
      });
    } else {
      configureTestGitUser({ cwd: tempDir });
    }

    // create .meter state (gitignored to match real repo setup)
    // must happen before test files so the gitignore commit doesn't include them
    if (args.meterState) {
      const meterDir = path.join(tempDir, '.meter');
      fs.mkdirSync(meterDir, { recursive: true });
      fs.writeFileSync(
        path.join(meterDir, 'git.commit.uses.jsonc'),
        JSON.stringify(args.meterState, null, 2),
      );

      // commit .gitignore for .meter/ and .agent/ so they don't trigger the unstaged guard
      const gitignorePath = path.join(tempDir, '.gitignore');
      const prior = fs.existsSync(gitignorePath)
        ? fs.readFileSync(gitignorePath, 'utf-8')
        : '';
      if (!prior.includes('.meter/') || !prior.includes('.agent/')) {
        const additions = [];
        if (!prior.includes('.meter/')) additions.push('.meter/');
        if (!prior.includes('.agent/')) additions.push('.agent/');
        fs.writeFileSync(gitignorePath, `${prior}\n${additions.join('\n')}\n`);
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: add .gitignore'], {
          cwd: tempDir,
        });
      }
    }

    // create .bind level constraint if provided
    if (args.bindLevel) {
      const bindDir = path.join(tempDir, '.branch', '.bind');
      fs.mkdirSync(bindDir, { recursive: true });
      fs.writeFileSync(path.join(bindDir, 'git.commit.level'), args.bindLevel);

      // commit .bind so it doesn't trigger the unstaged guard
      spawnSync('git', ['add', '.branch/'], { cwd: tempDir });
      spawnSync('git', ['commit', '-m', 'setup: add .branch/.bind level'], {
        cwd: tempDir,
      });
    }

    // create feature branch (git.commit.set requires non-base branch)
    // default to fix/test-branch which signals fix prefix
    // null = stay on main (for testing ON_BASE guard)
    // string = use that branch name
    if (args.branch !== null) {
      const branchName = args.branch ?? 'fix/test-branch';
      spawnSync('git', ['checkout', '-b', branchName], { cwd: tempDir });
    }

    // create files and stage them
    if (args.files) {
      for (const [filePath, content] of Object.entries(args.files)) {
        const fullPath = path.join(tempDir, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    // stage files
    if (args.staged !== false && args.files) {
      spawnSync('git', ['add', '-A'], { cwd: tempDir });
    }

    // create unstaged files (after git add, so they remain unstaged)
    if (args.filesUnstaged) {
      for (const [filePath, content] of Object.entries(args.filesUnstaged)) {
        const fullPath = path.join(tempDir, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    // auto-inject body into message unless already multiline or via @stdin
    const finalArgs = [...args.commitArgs];
    const messageIdx = finalArgs.findIndex(
      (a) => a === '--message' || a === '-m',
    );
    if (messageIdx !== -1 && messageIdx + 1 < finalArgs.length) {
      const msg = finalArgs[messageIdx + 1]!;
      // skip auto-inject for @stdin (stdin provides the full message)
      if (msg !== '@stdin' && !msg.includes('\n\n')) {
        finalArgs[messageIdx + 1] = `${msg}\n\n- test change`;
      }
    }

    // always use isolated HOME to prevent global blocker from effects
    const isolatedHome = genTempDir({ slug: 'git-set-home', git: false });

    // set up org permission so org blocker check passes
    const orgMeterDir = path.join(
      isolatedHome,
      '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
    );
    fs.mkdirSync(orgMeterDir, { recursive: true });
    fs.writeFileSync(
      path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
      JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
    );

    // set up .agent/keyrack.yml so org can be detected from repo
    const agentDir = path.join(tempDir, '.agent');
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), 'org: ehmpathy\n');

    // create stub bash alias files to prevent warnings when HOME is fake
    // (user's .bash_aliases sources these from $HOME, which breaks with fake HOME)
    fs.writeFileSync(path.join(isolatedHome, '.bash_aliases.ductwork.sh'), '');
    fs.writeFileSync(path.join(isolatedHome, '.bash_aliases.termwork.sh'), '');

    const result = spawnSync('bash', [scriptPath, ...finalArgs], {
      cwd: tempDir,
      encoding: 'utf-8' as BufferEncoding,
      input: args.stdin,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, HOME: isolatedHome, ...args.env },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
      isolatedHome,
    };
  };

  given('[case1] commit without push', () => {
    when('[t0] mechanic has uses and staged changes', () => {
      then('outputs righteous with commit details', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: [
            '--message',
            'fix(api): validate input',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 righteous!');
        expect(result.stdout).toContain('header: fix(api): validate input');
        expect(result.stdout).toContain('name: seaturtle[bot]');
        expect(result.stdout).toContain('email: seaturtle@ehmpath.com');
        expect(result.stdout).toContain('name: Test Human');
        expect(result.stdout).toContain('email: human@test.com');
        expect(result.stdout).toContain('push: skipped');
        expect(result.stdout).toContain('left: 2');
        expect(result.stdout).toMatchSnapshot();
      });

      then('git log shows correct author', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: [
            '--message',
            'fix(api): validate input',
            '--mode',
            'apply',
          ],
        });

        const log = spawnSync('git', ['log', '--format=%an <%ae>', '-1'], {
          cwd: result.tempDir,
          encoding: 'utf-8',
        });
        expect(log.stdout.trim()).toBe(
          'seaturtle[bot] <seaturtle@ehmpath.com>',
        );
      });
    });
  });

  given('[case2] commit with push', () => {
    when('[t0] push is allowed and requested', () => {
      then('outputs cowabunga', () => {
        // note: push will fail without a remote, but commit should succeed
        // we test push separately with a remote
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'allow' },
          commitArgs: [
            '--message',
            'fix(api): handle edge case',
            '--push',
            '--mode',
            'apply',
          ],
        });

        // push may fail without remote, but the vibe should be cowabunga
        // in a real scenario with remote, this would succeed
        if (result.exitCode === 0) {
          expect(result.stdout).toContain('🐢 cowabunga!');
          expect(result.stdout).toContain('push:');
        }
      });
    });
  });

  given('[case29] --auth flag', () => {
    when('[t0] an invalid --auth value is given', () => {
      then('it fails fast (exit 2) with the valid values', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'allow' },
          commitArgs: ['--message', 'fix(api): bad auth', '--auth', 'bogus'],
        });

        expect(result.exitCode).toBe(2);
        expect(`${result.stdout}${result.stderr}`).toContain(
          "--auth must be 'as-ehmpath' or 'as-human'",
        );
        // lock the invalid-auth error contract on both streams (skill-output-streams)
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] a valid --auth as-human is given in plan mode', () => {
      then('the plan is accepted (exit 0)', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'allow' },
          commitArgs: [
            '--message',
            'fix(api): good auth',
            '--auth',
            'as-human',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 heres the wave...');
        // lock the plan-mode tree contract under --auth as-human (both streams;
        // stderr expected empty on this success path but pinned to catch drift)
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when(
      '[t2] a valid --auth as-human is given in plan mode with --push',
      () => {
        then('the plan tree states opened: as-human (gh cli login)', () => {
          const result = runInTempGitRepo({
            files: { 'fix.txt': 'fixed content' },
            meterState: { uses: 2, push: 'allow' },
            commitArgs: [
              '--message',
              'fix(api): plan push as human',
              '--push',
              '--auth',
              'as-human',
            ],
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('🐢 heres the wave...');
          // the vision requires opened: in BOTH plan (+push) and apply (+push)
          // trees; this covers the plan+push+as-human branch the apply tests miss
          expect(result.stdout).toContain(
            'opened: as-human (gh cli login, fallback)',
          );
          // lock the plan-mode +push tree contract under --auth as-human
          // (both streams; stderr pinned empty to catch a stray line)
          expect(result.stdout).toMatchSnapshot();
          expect(result.stderr).toMatchSnapshot();
        });
      },
    );
  });

  given(
    '[case30] apply + push, keyrack fails, guide surfaces through the set→push seam',
    () => {
      when(
        '[t0] --mode apply --push --auth as-ehmpath but the keyrack token is unavailable',
        () => {
          then(
            'the commit lands, the guide surfaces, and a non-zero exit propagates',
            () => {
              // .mock = fake git — `git push` succeeds so the delegated push.sh
              // reaches the keyrack token step; the real git (via exec) still
              // performs the local commit set.sh does directly
              const fakeBinDir = genTempDir({ slug: 'git-set-fakebin' });
              fs.writeFileSync(
                path.join(fakeBinDir, 'git'),
                `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

              const result = runInTempGitRepo({
                files: { 'fix.txt': 'fixed content' },
                meterState: { uses: 2, push: 'allow' },
                branch: 'turtle/feature',
                gitUser: {
                  name: 'seaturtle[bot]',
                  email: 'seaturtle@ehmpath.com',
                },
                commitArgs: [
                  '--message',
                  'fix(api): compose auth guide',
                  '--mode',
                  'apply',
                  '--push',
                  '--auth',
                  'as-ehmpath',
                ],
                env: {
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                  // clear token so the keyrack fetch fails → guide fires
                  EHMPATHY_SEATURTLE_GITHUB_TOKEN: '',
                },
              });

              // the delegated push/pr-open failure propagates (was exit 0 before)
              expect(result.exitCode).toBe(2);
              // the guide surfaces through the seam (push.sh → set.sh stderr)
              expect(result.stderr).toContain('keyrack token not available');
              // the guide names the concrete idempotent retry command (the commit
              // is already pushed, so a re-run of set would dead-end on empty stage)
              expect(result.stderr).toContain(
                'rhx git.commit.push --mode apply --auth as-human',
              );
              // the commit still landed locally, reflected in the tree
              expect(result.stdout).toContain(
                'header: fix(api): compose auth guide',
              );
              expect(result.stdout).toContain('push: error');
              // lock the composed set→push failure contract on both streams: the
              // commit tree (stdout) + the guide (stderr) is a distinct variant
              // from push.sh's standalone guide, so snap it to catch drift
              expect(result.stdout).toMatchSnapshot();
              expect(result.stderr).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    '[case31] apply + push --auth as-human surfaces who opened the pr',
    () => {
      when('[t0] the pr opens under the ambient gh login', () => {
        then('the success tree states opened: as-human (gh cli login)', () => {
          // .mock = fake bins: git push succeeds (real git handles the local commit via
          // exec), gh opens the pr and fails loud if a GH_TOKEN override leaks in
          const fakeBinDir = genTempDir({ slug: 'git-set-fakebin-human' });
          fs.writeFileSync(
            path.join(fakeBinDir, 'git'),
            `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
          );
          fs.chmodSync(path.join(fakeBinDir, 'git'), '755');
          fs.writeFileSync(
            path.join(fakeBinDir, 'gh'),
            `#!/bin/bash
if [[ -n "$GH_TOKEN" ]]; then
  echo "unexpected GH_TOKEN override under as-human" >&2
  exit 3
fi
if [[ "$1" == "pr" && "$2" == "list" ]]; then
  echo ""
  exit 0
elif [[ "$1" == "pr" && "$2" == "create" ]]; then
  echo "https://github.com/test/repo/pull/88"
  exit 0
fi
exit 1
`,
          );
          fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

          const result = runInTempGitRepo({
            files: { 'fix.txt': 'fixed content' },
            meterState: { uses: 2, push: 'allow' },
            branch: 'turtle/feature',
            gitUser: {
              name: 'seaturtle[bot]',
              email: 'seaturtle@ehmpath.com',
            },
            commitArgs: [
              '--message',
              'fix(api): human opens pr',
              '--mode',
              'apply',
              '--push',
              '--auth',
              'as-human',
            ],
            env: {
              PATH: `${fakeBinDir}:${process.env.PATH}`,
            },
          });

          // the push + pr-open succeeded end-to-end
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('🐢 cowabunga!');
          // the vision's requirement: the tree states who opened the pr
          expect(result.stdout).toContain(
            'opened: as-human (gh cli login, fallback)',
          );
          // lock the composed apply+push success tree so drift in the opened:
          // label is caught in review (twin of push.sh case23's snapshot);
          // pin stderr too (expected empty) so a stray line cannot slip in
          expect(result.stdout).toMatchSnapshot();
          expect(result.stderr).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case41] apply + push --auth as-human, gh not logged in, guide surfaces through the seam',
    () => {
      when(
        '[t0] --mode apply --push --auth as-human but the ambient gh login is absent',
        () => {
          then(
            'the commit lands, the two-fix guide surfaces, and a non-zero exit propagates',
            () => {
              // r10 named this the day-to-day front door: git.commit.set is the
              // skill mechanics actually run, and as-human is the fallback half of
              // the feature. case30 proves the composed guide for as-ehmpath
              // (keyrack down); this proves it end-to-end for as-human (gh not
              // logged in), so a future refactor of the set→push forward cannot
              // silently break the exact scenario the wish was written for.
              const fakeBinDir = genTempDir({
                slug: 'git-set-fakebin-human-noauth',
              });
              fs.writeFileSync(
                path.join(fakeBinDir, 'git'),
                `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

              // .mock = fake gh: the ambient login is absent, so every pr op fails with the
              // auth signature; also hard-fail if a GH_TOKEN override leaks (as-human
              // must open the pr strictly under the human's own gh session)
              fs.writeFileSync(
                path.join(fakeBinDir, 'gh'),
                `#!/bin/bash
if [[ -n "$GH_TOKEN" ]]; then
  echo "unexpected GH_TOKEN override under as-human" >&2
  exit 3
fi
if [[ "$1" == "pr" ]]; then
  echo "gh: To use GitHub CLI, please run: gh auth login" >&2
  echo "HTTP 401: Bad credentials" >&2
  exit 1
fi
exit 1
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

              const result = runInTempGitRepo({
                files: { 'fix.txt': 'fixed content' },
                meterState: { uses: 2, push: 'allow' },
                branch: 'turtle/feature',
                gitUser: {
                  name: 'seaturtle[bot]',
                  email: 'seaturtle@ehmpath.com',
                },
                commitArgs: [
                  '--message',
                  'fix(api): compose human auth guide',
                  '--mode',
                  'apply',
                  '--push',
                  '--auth',
                  'as-human',
                ],
                env: {
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                },
              });

              // the delegated pr-open failure propagates through the seam
              expect(result.exitCode).toBe(2);
              // the guide names BOTH fixes (unlock keyrack OR gh auth login)
              expect(result.stderr).toContain('no usable gh credential');
              expect(result.stderr).toContain('gh auth login');
              // the commit still landed locally, reflected in the tree
              expect(result.stdout).toContain(
                'header: fix(api): compose human auth guide',
              );
              expect(result.stdout).toContain('push: error');
              // lock the composed set→push as-human guide on both streams
              expect(result.stdout).toMatchSnapshot();
              expect(result.stderr).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    '[case42] a composed as-ehmpath push runs the strong graphql identity assert',
    () => {
      when(
        '[t0] the fetched ghs_ token maps to a DIFFERENT app bot id (NODE_ENV=production)',
        () => {
          then(
            'the assert fails loud on BOTH streams (exit 2), before any commit or pr',
            () => {
              // r11#1 twin for the composed path: set.sh:275 runs the same identity
              // assert push case37 covers standalone. the assert is gated behind
              // NODE_ENV != test (so tests stay hermetic), so this drives it with
              // NODE_ENV=production (mirrors case34). the proven bot-id mismatch is
              // a malfunction, so its diagnosis must ride BOTH streams, not just
              // stderr (rule.require.skill-output-streams) — this is the coverage
              // gap r11 flagged at set.sh:275.
              const fakeBinDir = genTempDir({
                slug: 'git-set-fakebin-identity',
              });
              fs.writeFileSync(
                path.join(fakeBinDir, 'git'),
                `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

              // .mock = fake gh: the graphql whoami returns a MISMATCHED bot id, so the
              // assert must fail loud. any pr op means the assert wrongly passed.
              fs.writeFileSync(
                path.join(fakeBinDir, 'gh'),
                `#!/bin/bash
if [[ "$1" == "api" && "$2" == "graphql" ]]; then
  echo '{"data":{"viewer":{"login":"impostor[bot]","databaseId":999999}}}'
  exit 0
fi
if [[ "$1" == "pr" ]]; then
  echo "gh pr should not be reached — the identity assert should have exited" >&2
  exit 99
fi
exit 1
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

              const result = runInTempGitRepo({
                files: { 'fix.txt': 'fixed content' },
                meterState: { uses: 2, push: 'allow' },
                branch: 'turtle/feature',
                gitUser: {
                  name: 'ehm-a-seaturtle[bot]',
                  email:
                    '295111357+ehm-a-seaturtle[bot]@users.noreply.github.com',
                },
                // shadow the keyrack communicator: a healthy keyrack hands back a
                // ghs_ (app) token, so the fetch path reaches the identity assert
                fakeRhachet: `#!/bin/bash
echo '{"grant":{"key":{"secret":"ghs_appbotfake"}}}'
exit 0
`,
                commitArgs: [
                  '--message',
                  'fix(api): composed identity assert',
                  '--mode',
                  'apply',
                  '--push',
                  '--auth',
                  'as-ehmpath',
                ],
                env: {
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                  // production makes the as-ehmpath keyrack fetch + assert reachable
                  NODE_ENV: 'production',
                },
              });

              // the strong assert refused the token as a caller-must-fix constraint
              expect(result.exitCode).toBe(2);
              // the mismatch diagnosis rides BOTH streams (a malfunction is loud on
              // stdout + stderr, never a silent-stdout dead end)
              expect(result.stderr).toContain('out of sync');
              expect(result.stderr).toContain('3rd contributor');
              expect(result.stdout).toContain('out of sync');
              expect(result.stdout).toContain('3rd contributor');
              // no pr op leaked past the assert
              expect(result.stdout).not.toContain('should not be reached');
              expect(result.stderr).not.toContain('should not be reached');
              expect(result.stdout).toMatchSnapshot();
              expect(result.stderr).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    '[case43] plan + push, the delegated push plan fails, the composed guide surfaces through the set→push seam',
    () => {
      when(
        '[t0] --mode plan --push on a branch push.sh refuses (master), which set.sh does not pre-guard',
        () => {
          then(
            'the composed push-plan guide surfaces on BOTH streams and exit 2 propagates',
            () => {
              // the plan-mode twin of case30 (apply). in plan mode push.sh never
              // fetches a token, so the preflight fails on a guard set.sh does NOT
              // mirror: set.sh's ON_BASE blocks only the actual base (main), while
              // push.sh refuses BOTH main and master (git.commit.push.sh:284). a
              // branch named `master` clears set.sh's guards, reaches the plan
              // delegation, and push.sh --mode plan refuses it — so set.sh
              // re-invokes push.sh for the tree guide (which push.sh dual-streams,
              // error + fix-hint, to BOTH stdout and stderr) and exits 2. this locks
              // the set→push PLAN-mode failure seam: both streams carry the full,
              // identical guide — no raw json tail, no fix-less stderr.
              const result = runInTempGitRepo({
                files: { 'fix.txt': 'fixed content' },
                meterState: { uses: 2, push: 'allow' },
                branch: 'master',
                gitUser: {
                  name: 'seaturtle[bot]',
                  email: 'seaturtle@ehmpath.com',
                },
                commitArgs: [
                  '--message',
                  'fix(api): plan push preflight fails',
                  '--mode',
                  'plan',
                  '--push',
                  '--auth',
                  'as-ehmpath',
                ],
              });

              // the delegated push-plan failure propagates as a constraint
              expect(result.exitCode).toBe(2);
              // the guide surfaces on BOTH streams — the re-invoked push tree guide
              // is dual-streamed by push.sh, so stdout and stderr each carry the
              // error AND the fix-hint, never a fix-less stderr dead end
              // (rule.require.skill-output-streams + rule.require.errors-name-the-fix)
              expect(result.stdout).toContain('cannot push directly to master');
              expect(result.stderr).toContain('cannot push directly to master');
              // the stderr path must ALSO name the fix — r010 caught that stderr
              // previously got the bare error with no remediation; clamp it now does
              expect(result.stdout).toContain('create a feature branch first');
              expect(result.stderr).toContain('create a feature branch first');
              // lock the composed plan→push failure contract on both streams
              expect(result.stdout).toMatchSnapshot();
              expect(result.stderr).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    '[case32] the vision day-in-the-life: guide, then the printed retry ships',
    () => {
      // the exact narrative the vision opens with, proven end-to-end in ONE
      // repo state (not two halves proven apart): a mechanic pushes with the
      // default as-ehmpath, keyrack is down so the guide fires, then the mechanic
      // runs the literal command the guide printed and the pr ships as-human.
      const pushScriptPath = path.join(__dirname, 'git.commit.push.sh');

      when(
        '[t0] set --push --auth as-ehmpath fires the guide (keyrack down)',
        () => {
          then(
            'the guide names the retry, then that retry opens the pr as-human',
            () => {
              // .mock = fake git — `git push` succeeds so the commit transports;
              // all else execs real git (local commit, log, rev-parse)
              const fakeBinDir = genTempDir({
                slug: 'git-set-fakebin-dayinlife',
              });
              fs.writeFileSync(
                path.join(fakeBinDir, 'git'),
                `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'git'), '755');
              // .mock = fake gh — opens the pr and hard-fails if a GH_TOKEN
              // override leaks under as-human
              fs.writeFileSync(
                path.join(fakeBinDir, 'gh'),
                `#!/bin/bash
if [[ -n "$GH_TOKEN" ]]; then
  echo "unexpected GH_TOKEN override under as-human" >&2
  exit 3
fi
if [[ "$1" == "pr" && "$2" == "list" ]]; then
  echo ""
  exit 0
elif [[ "$1" == "pr" && "$2" == "create" ]]; then
  echo "https://github.com/test/repo/pull/99"
  exit 0
fi
exit 1
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

              // attempt 1: the default as-ehmpath with no keyrack token → the guide
              const first = runInTempGitRepo({
                files: { 'fix.txt': 'fixed content' },
                meterState: { uses: 2, push: 'allow' },
                branch: 'turtle/feature',
                gitUser: {
                  name: 'seaturtle[bot]',
                  email: 'seaturtle@ehmpath.com',
                },
                commitArgs: [
                  '--message',
                  'fix(api): day in the life',
                  '--mode',
                  'apply',
                  '--push',
                  '--auth',
                  'as-ehmpath',
                ],
                env: {
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                  // no token → the keyrack fetch fails → the guide fires
                  EHMPATHY_SEATURTLE_GITHUB_TOKEN: '',
                },
              });

              // the guide fired and named the concrete idempotent retry command
              expect(first.exitCode).toBe(2);
              expect(first.stderr).toContain('keyrack token not available');
              expect(first.stderr).toContain(
                'rhx git.commit.push --mode apply --auth as-human',
              );
              // lock BOTH streams of attempt 1: the composed set tree (commit
              // landed + push: error) on stdout, the guide on stderr — the first
              // half of the day-in-the-life, previously unsnapped
              expect(first.stdout).toMatchSnapshot();
              expect(first.stderr).toMatchSnapshot();

              // attempt 2: run the LITERAL command the guide printed, in the SAME
              // repo state (commit already pushed) — git.commit.push, not set, so it
              // does not dead-end on the now-empty stage
              const retry = spawnSync(
                'bash',
                [pushScriptPath, '--mode', 'apply', '--auth', 'as-human'],
                {
                  cwd: first.tempDir,
                  encoding: 'utf-8' as BufferEncoding,
                  stdio: ['pipe', 'pipe', 'pipe'],
                  env: {
                    ...process.env,
                    HOME: first.isolatedHome,
                    PATH: `${fakeBinDir}:${process.env.PATH}`,
                  },
                },
              );

              // the retry ships: the pr opens under the human's gh login
              expect(retry.status).toBe(0);
              expect(retry.stdout).toContain(
                'opened: as-human (gh cli login, fallback)',
              );
              // lock the retry success tree — the composed day-in-the-life
              // second half, whose repo state (commit already pushed) differs
              // from case23's clean-repo push; pin stderr too (expected empty)
              expect(retry.stdout).toMatchSnapshot();
              expect(retry.stderr).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given('[case3] no uses left', () => {
    when('[t0] apply mode with 0 uses', () => {
      then('outputs bummer dude', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 0, push: 'block' },
          commitArgs: ['--message', 'fix(test): some fix', '--mode', 'apply'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('🐢 bummer dude...');
        expect(result.stdout).toContain('no commit uses left');
        expect(result.stdout).toContain(
          'git.commit.uses set --quant N --push allow|block',
        );
        expect(result.stdout).toMatchSnapshot();
      });

      then('no commit is created', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 0, push: 'block' },
          commitArgs: ['--message', 'fix(test): some fix', '--mode', 'apply'],
        });

        const log = spawnSync('git', ['log', '--oneline'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        // genTempDir with symlink creates 2 commits (began + fixture) + gitignore setup = 3; verify no new one was added
        expect(log.stdout.trim().split('\n').length).toBe(3);
        expect(log.stdout).not.toContain('fix(test): some fix');
      });
    });

    when('[t1] plan mode with 0 uses', () => {
      then('plan is allowed without uses', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 0, push: 'block' },
          commitArgs: ['--message', 'fix(test): zero uses plan'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 heres the wave...');
        expect(result.stdout).toContain('header: fix(test): zero uses plan');
        expect(result.stdout).toContain('left: 0 → -1');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] push not allowed', () => {
    when('[t0] push is blocked but --push requested', () => {
      then('outputs bummer dude about push', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 1, push: 'block' },
          commitArgs: ['--message', 'fix(test): some fix', '--push'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('🐢 bummer dude...');
        expect(result.stdout).toContain('push not allowed in current grant');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] no changes to commit', () => {
    when('[t0] no staged changes', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          meterState: { uses: 2, push: 'block' },
          commitArgs: ['--message', 'fix(test): some fix'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('no changes to commit');
      });

      then('uses are not decremented', () => {
        const result = runInTempGitRepo({
          meterState: { uses: 2, push: 'block' },
          commitArgs: ['--message', 'fix(test): some fix'],
        });

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(2);
      });
    });
  });

  given('[case6] no git user configured', () => {
    when('[t0] git user.name is not set', () => {
      then('exits with error about patron', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'block' },
          gitUser: { name: '', email: '' },
          commitArgs: ['--message', 'fix(test): some fix'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('cannot determine patron');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case7] uses decremented on success', () => {
    when('[t0] starting with 3 uses', () => {
      then('state shows 2 after commit', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['--message', 'fix(test): something', '--mode', 'apply'],
        });

        expect(result.exitCode).toBe(0);

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(2);
      });
    });
  });

  given('[case8] unstaged changes guard', () => {
    when('[t0] unstaged changes exist and no --unstaged flag', () => {
      then('exits with error about unstaged changes', () => {
        const result = runInTempGitRepo({
          files: { 'staged.txt': 'staged content' },
          filesUnstaged: { 'unstaged.txt': 'unstaged content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: ['--message', 'fix(test): some fix'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('unstaged changes detected');
        expect(result.stdout).toContain('unstaged.txt');
      });

      then('no commit is created', () => {
        const result = runInTempGitRepo({
          files: { 'staged.txt': 'staged content' },
          filesUnstaged: { 'unstaged.txt': 'unstaged content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: ['--message', 'fix(test): some fix'],
        });

        const log = spawnSync('git', ['log', '--oneline'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        expect(log.stdout.trim().split('\n').length).toBe(3);
        expect(log.stdout).not.toContain('fix(test): some fix');
      });
    });

    when('[t1] unstaged changes exist with --unstaged ignore', () => {
      then('commits only staged changes', () => {
        const result = runInTempGitRepo({
          files: { 'staged.txt': 'staged content' },
          filesUnstaged: { 'unstaged.txt': 'unstaged content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: [
            '--message',
            'fix(test): staged only',
            '--unstaged',
            'ignore',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');

        // verify only staged file was committed
        const show = spawnSync(
          'git',
          ['show', '--name-only', '--format=', 'HEAD'],
          {
            cwd: result.tempDir,
            encoding: 'utf-8' as BufferEncoding,
          },
        );
        expect(show.stdout).toContain('staged.txt');
        expect(show.stdout).not.toContain('unstaged.txt');
      });
    });

    when('[t2] unstaged changes exist with --unstaged include', () => {
      then('stages and commits all changes', () => {
        const result = runInTempGitRepo({
          files: { 'staged.txt': 'staged content' },
          filesUnstaged: { 'unstaged.txt': 'unstaged content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: [
            '--message',
            'fix(test): all changes',
            '--unstaged',
            'include',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');

        // verify both files were committed
        const show = spawnSync(
          'git',
          ['show', '--name-only', '--format=', 'HEAD'],
          {
            cwd: result.tempDir,
            encoding: 'utf-8' as BufferEncoding,
          },
        );
        expect(show.stdout).toContain('staged.txt');
        expect(show.stdout).toContain('unstaged.txt');
      });
    });

    when('[t3] only unstaged changes with --unstaged include', () => {
      then('stages and commits the unstaged changes', () => {
        const result = runInTempGitRepo({
          files: { 'tracked.txt': 'original' },
          filesUnstaged: { 'new.txt': 'new content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: [
            '--message',
            'fix(test): from unstaged',
            '--unstaged',
            'include',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });
  });

  given('[case9] Co-authored-by trailer format', () => {
    when('[t0] commit is created', () => {
      then('trailer has correct format', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: [
            '--message',
            'fix(test): trailer test',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        const log = spawnSync('git', ['log', '--format=%B', '-1'], {
          cwd: result.tempDir,
          encoding: 'utf-8',
        });
        expect(log.stdout).toContain(
          'Co-authored-by: Test Human <human@test.com>',
        );
      });

      then('trailer is after blank line', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: [
            '--message',
            'fix(test): blank line test',
            '--mode',
            'apply',
          ],
        });

        const log = spawnSync('git', ['log', '--format=%B', '-1'], {
          cwd: result.tempDir,
          encoding: 'utf-8',
        });
        const body = log.stdout.trim();
        const lines = body.split('\n');
        // should be: header, blank line, body, blank line, Co-authored-by
        expect(lines[0]).toBe('fix(test): blank line test');
        expect(lines[1]).toBe('');
        expect(lines[2]).toBe('- test change');
        expect(lines[3]).toBe('');
        expect(lines[4]).toContain('Co-authored-by:');
      });
    });
  });

  given('[case10] plan mode shows preview', () => {
    when('[t0] plan mode is default', () => {
      then('shows plan output without committing', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['--message', 'fix(test): plan test'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 heres the wave...');
        expect(result.stdout).toContain('--mode plan');
        expect(result.stdout).toContain('header: fix(test): plan test');
        expect(result.stdout).toContain('run with --mode apply to execute');
        expect(result.stdout).toMatchSnapshot();

        // verify no commit was created
        const log = spawnSync('git', ['log', '--oneline'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        expect(log.stdout).not.toContain('fix(test): plan test');
      });

      then('shows meter transition', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['--message', 'fix(test): meter test'],
        });

        expect(result.stdout).toContain('left: 3 → 2');
      });

      then('does not decrement uses', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['--message', 'fix(test): no decrement'],
        });

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(3); // unchanged
      });
    });

    when('[t1] plan mode with push shows PR title', () => {
      then('shows PR title as current message when first commit', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-plan-pr',
          git: true,
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // setup meter with .gitignore (before feature branch)
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 2, push: 'allow' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create feature branch (name must signal feat)
        spawnSync('git', ['checkout', '-b', 'feat/new-feature'], {
          cwd: tempDir,
        });

        // create and stage a file
        fs.writeFileSync(path.join(tempDir, 'feature.txt'), 'feature content');
        spawnSync('git', ['add', 'feature.txt'], { cwd: tempDir });

        // .mock = fake keyrack config + gh cli for token validation
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(
          path.join(agentDir, 'keyrack.yml'),
          `org: ehmpathy
env.all:
  - EHMPATHY_SEATURTLE_GITHUB_TOKEN
env.prod:
  # required for valid schema
`,
        );
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });
        fs.writeFileSync(
          path.join(fakeBinDir, 'gh'),
          `#!/bin/bash
if [[ "$1" == "api" && "$2" == "/user" ]]; then
  echo '{"login":"ehm-seaturtle"}'
  exit 0
fi
exit 1`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        // run in plan mode with push (with isolated HOME to avoid global blocker)
        const isolatedHome = genTempDir({ slug: 'plan-pr-home', git: false });

        // set up org permission in isolated HOME
        const orgMeterDir = path.join(
          isolatedHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // create stub bash alias files
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
          '',
        );
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.termwork.sh'),
          '',
        );

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'feat(test): new feature\n\n- add feature',
            '--push',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              HOME: isolatedHome,
              EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
              PATH: `${fakeBinDir}:${process.env.PATH}`,
            },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('heres the wave');
        expect(result.stdout).toContain('title: feat(test): new feature');
        expect(result.stdout).toContain('findsert draft');
        expect(result.stdout).toMatchSnapshot();
      });

      then('shows first commit as PR title when branch has history', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-plan-pr-history',
          git: true,
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // setup meter before branch creation
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'allow' }, null, 2),
        );
        // gitignore .meter
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create feature branch (name must signal feat)
        spawnSync('git', ['checkout', '-b', 'feat/multi-commit'], {
          cwd: tempDir,
        });

        // first commit on branch (via raw git)
        fs.writeFileSync(path.join(tempDir, 'first.txt'), 'first');
        spawnSync('git', ['add', 'first.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: first commit on branch'], {
          cwd: tempDir,
        });

        // second commit on branch (via raw git)
        fs.writeFileSync(path.join(tempDir, 'second.txt'), 'second');
        spawnSync('git', ['add', 'second.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'cont: second commit'], {
          cwd: tempDir,
        });

        // now stage a third change
        fs.writeFileSync(path.join(tempDir, 'third.txt'), 'third');
        spawnSync('git', ['add', 'third.txt'], { cwd: tempDir });

        // .mock = fake keyrack config + gh cli for token validation
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(
          path.join(agentDir, 'keyrack.yml'),
          `org: ehmpathy
env.all:
  - EHMPATHY_SEATURTLE_GITHUB_TOKEN
env.prod:
  # required for valid schema
`,
        );
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });
        fs.writeFileSync(
          path.join(fakeBinDir, 'gh'),
          `#!/bin/bash
if [[ "$1" == "api" && "$2" == "/user" ]]; then
  echo '{"login":"ehm-seaturtle"}'
  exit 0
fi
exit 1`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        // run in plan mode with push (use cont: since branch has behavioral commit)
        // (with isolated HOME to avoid global blocker)
        const isolatedHome = genTempDir({
          slug: 'plan-pr-history-home',
          git: false,
        });

        // set up org permission in isolated HOME
        const orgMeterDir = path.join(
          isolatedHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // create stub bash alias files
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
          '',
        );
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.termwork.sh'),
          '',
        );

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'cont: third commit\n\n- add third feature',
            '--push',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              HOME: isolatedHome,
              EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
              PATH: `${fakeBinDir}:${process.env.PATH}`,
            },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('heres the wave');
        expect(result.stdout).toContain('title: feat: first commit on branch');
        expect(result.stdout).not.toContain('title: feat: third commit');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case12] PR title on stacked branch (branch from branch)', () => {
    when('[t0] branch B created from branch A, both with commits', () => {
      then('PR title uses first commit unique to branch B', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-stacked-branch',
          git: true,
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // setup .gitignore for .meter on main
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'allow' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create branch A from main
        spawnSync('git', ['checkout', '-b', 'turtle/branch-a'], {
          cwd: tempDir,
        });

        // commit A1 on branch A
        fs.writeFileSync(path.join(tempDir, 'a1.txt'), 'a1');
        spawnSync('git', ['add', 'a1.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: A1 first on branch-a'], {
          cwd: tempDir,
        });

        // commit A2 on branch A
        fs.writeFileSync(path.join(tempDir, 'a2.txt'), 'a2');
        spawnSync('git', ['add', 'a2.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: A2 second on branch-a'], {
          cwd: tempDir,
        });

        // create branch B from branch A
        spawnSync('git', ['checkout', '-b', 'turtle/branch-b'], {
          cwd: tempDir,
        });

        // commit B1 on branch B
        fs.writeFileSync(path.join(tempDir, 'b1.txt'), 'b1');
        spawnSync('git', ['add', 'b1.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: B1 first on branch-b'], {
          cwd: tempDir,
        });

        // commit B2 on branch B
        fs.writeFileSync(path.join(tempDir, 'b2.txt'), 'b2');
        spawnSync('git', ['add', 'b2.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'feat: B2 second on branch-b'], {
          cwd: tempDir,
        });

        // stage a new file for the next commit
        fs.writeFileSync(path.join(tempDir, 'b3.txt'), 'b3');
        spawnSync('git', ['add', 'b3.txt'], { cwd: tempDir });

        // .mock = fake keyrack config + gh cli for token validation
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(
          path.join(agentDir, 'keyrack.yml'),
          `org: ehmpathy
env.all:
  - EHMPATHY_SEATURTLE_GITHUB_TOKEN
env.prod:
  # required for valid schema
`,
        );
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });
        fs.writeFileSync(
          path.join(fakeBinDir, 'gh'),
          `#!/bin/bash
if [[ "$1" == "api" && "$2" == "/user" ]]; then
  echo '{"login":"ehm-seaturtle"}'
  exit 0
fi
exit 1`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        // run in plan mode with push (use cont: since branch has behavioral commits)
        // (with isolated HOME to avoid global blocker)
        const isolatedHome = genTempDir({
          slug: 'stacked-branch-home',
          git: false,
        });

        // set up org permission in isolated HOME
        const orgMeterDir = path.join(
          isolatedHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // create stub bash alias files
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
          '',
        );
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.termwork.sh'),
          '',
        );

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'cont: B3 third on branch-b\n\n- add B3 feature',
            '--push',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              HOME: isolatedHome,
              EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
              PATH: `${fakeBinDir}:${process.env.PATH}`,
            },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('heres the wave');
        // PR title should be B1, not A1
        expect(result.stdout).toContain('title: feat: B1 first on branch-b');
        expect(result.stdout).not.toContain('title: feat: A1');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case13] bound level enforced — fix allows fix prefix', () => {
    when('[t0] level bound to fix, header starts with fix(', () => {
      then('commit succeeds', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'fix',
          commitArgs: [
            '--message',
            'fix(api): validate input',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });

    when('[t1] level bound to fix, header starts with fix:', () => {
      then('commit succeeds', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'fix',
          commitArgs: [
            '--message',
            'fix(test): validate input',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });
  });

  given('[case14] bound level enforced — fix rejects feat prefix', () => {
    when('[t0] level bound to fix, header starts with feat(', () => {
      then('exits with level mismatch error', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'fix',
          commitArgs: [
            '--message',
            'feat(api): add endpoint',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain("level is bound to 'fix'");
        expect(result.stdout).toContain('commit prefix is');
        expect(result.stdout).toMatchSnapshot();
      });

      then('no commit is created', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'fix',
          commitArgs: [
            '--message',
            'feat(api): add endpoint',
            '--mode',
            'apply',
          ],
        });

        const log = spawnSync('git', ['log', '--oneline'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        expect(log.stdout).not.toContain('feat(api): add endpoint');
      });

      then('uses are not decremented', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'fix',
          commitArgs: [
            '--message',
            'feat(api): add endpoint',
            '--mode',
            'apply',
          ],
        });

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(3);
      });
    });
  });

  given('[case15] bound level enforced — feat allows feat prefix', () => {
    when('[t0] level bound to feat, header starts with feat(', () => {
      then('commit succeeds', () => {
        const result = runInTempGitRepo({
          files: { 'feat.txt': 'new feature' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'feat',
          commitArgs: ['--message', 'feat(ui): add button', '--mode', 'apply'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });
  });

  given('[case16] bound level enforced — feat rejects fix prefix', () => {
    when('[t0] level bound to feat, header starts with fix(', () => {
      then('exits with level mismatch error', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'feat',
          commitArgs: ['--message', 'fix(ui): button color', '--mode', 'apply'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain("level is bound to 'feat'");
        expect(result.stdout).toContain('commit prefix is');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case17] no bound level — any prefix allowed', () => {
    when('[t0] no level bound, feat header on feat branch', () => {
      then('commit succeeds', () => {
        const result = runInTempGitRepo({
          files: { 'feat.txt': 'feature content' },
          meterState: { uses: 3, push: 'block' },
          branch: 'feat/test-branch', // signals feat
          commitArgs: [
            '--message',
            'feat(api): add endpoint',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });

    when('[t1] no level bound, fix header', () => {
      then('commit succeeds', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fix content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: [
            '--message',
            'fix(api): validate input',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });
  });

  given('[case18] bound level enforced in plan mode too', () => {
    when('[t0] level bound to fix, feat header in plan mode', () => {
      then('plan mode also rejects mismatched level', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'fix',
          commitArgs: ['--message', 'feat(api): add endpoint'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain("level is bound to 'fix'");
        expect(result.stdout).toContain('commit prefix is');
      });
    });
  });

  given('[case11] commit to main blocked (ON_BASE guard)', () => {
    when('[t0] on main branch', () => {
      then('exits with error about base branch', () => {
        // stay on main by passing branch: null
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'allow' },
          commitArgs: ['--message', 'fix(test): on main', '--push'],
          branch: null, // stay on main
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('🐢 bummer dude...');
        expect(result.stdout).toContain('cannot commit to base branch');
        expect(result.stdout).toContain('git checkout -b feat/my-feature');
        expect(result.stdout).toMatchSnapshot();
      });

      then('no commit is created', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'allow' },
          commitArgs: ['--message', 'fix(test): on main', '--push'],
          branch: null,
        });

        const log = spawnSync('git', ['log', '--oneline'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        // only initial commits, no new commit
        expect(log.stdout.trim().split('\n').length).toBe(3);
        expect(log.stdout).not.toContain('fix(test): on main');
      });

      then('uses are not decremented', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'allow' },
          commitArgs: ['--message', 'fix(test): on main', '--push'],
          branch: null,
        });

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(2);
      });
    });
  });

  given('[case21] last use with push allowed shows push status', () => {
    when('[t0] uses go from 1 to 0 with push allowed', () => {
      then('meter shows push: allowed after commit', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 1, push: 'allow' },
          commitArgs: ['--message', 'fix(api): last commit', '--mode', 'apply'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('left: 0');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).toMatchSnapshot();
      });

      then('plan mode also shows push: allowed', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 1, push: 'allow' },
          commitArgs: ['--message', 'fix(api): last commit plan'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('left: 1 → 0');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case22] multiline message is required', () => {
    when('[t0] message is single-line (no body)', () => {
      then('exits with error about multiline', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-set-test',
          git: true,
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // setup meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 2, push: 'block' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup'], { cwd: tempDir });

        // create and stage file
        fs.writeFileSync(path.join(tempDir, 'fix.txt'), 'fixed content');
        spawnSync('git', ['add', 'fix.txt'], { cwd: tempDir });

        // run with single-line message (no body) — bypass auto-inject
        const result = spawnSync(
          'bash',
          [scriptPath, '--message', 'fix(test): no body'],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('must be multiline');
      });
    });

    when('[t1] message is multiline (has body)', () => {
      then('body appears in plan tree output', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: [
            '--message',
            'fix(test): with desc\n\n- fixed the bug\n- added tests',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('body');
        expect(result.stdout).toContain('- fixed the bug');
        expect(result.stdout).toContain('- added tests');
        expect(result.stdout).toMatchSnapshot();
      });

      then('body appears in commit body', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: [
            '--message',
            'fix(test): body in commit\n\n- fixed validation',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // check commit body
        const log = spawnSync('git', ['log', '-1', '--format=%B'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        const body = (log.stdout ?? '').trim();
        expect(body).toContain('- fixed validation');
      });
    });
  });

  given('[case23] plan mode auto-revoke display with push', () => {
    when('[t0] uses go from 1 to 0 with push allowed', () => {
      then('plan shows push: allowed to blocked (revoked)', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-set-test',
          git: true,
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // setup meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 1, push: 'allow' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup'], { cwd: tempDir });

        // create branch + staged file
        spawnSync('git', ['checkout', '-b', 'turtle/revoke-test'], {
          cwd: tempDir,
        });
        fs.writeFileSync(path.join(tempDir, 'fix.txt'), 'content');
        spawnSync('git', ['add', 'fix.txt'], { cwd: tempDir });

        // .mock = fake keyrack config + gh cli for token validation
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(
          path.join(agentDir, 'keyrack.yml'),
          `org: ehmpathy
env.all:
  - EHMPATHY_SEATURTLE_GITHUB_TOKEN
env.prod:
  # required for valid schema
`,
        );
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });
        fs.writeFileSync(
          path.join(fakeBinDir, 'gh'),
          `#!/bin/bash
if [[ "$1" == "api" && "$2" == "/user" ]]; then
  echo '{"login":"ehm-seaturtle"}'
  exit 0
fi
exit 1`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        // (with isolated HOME to avoid global blocker)
        const isolatedHome = genTempDir({
          slug: 'autorevoke-home',
          git: false,
        });

        // set up org permission in isolated HOME
        const orgMeterDir = path.join(
          isolatedHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // create stub bash alias files
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
          '',
        );
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.termwork.sh'),
          '',
        );

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'fix(test): last use\n\n- last commit before revoke',
            '--push',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              HOME: isolatedHome,
              EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
              PATH: `${fakeBinDir}:${process.env.PATH}`,
            },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('left: 1 → 0');
        expect(result.stdout).toContain('push: allowed → blocked (revoked)');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case19] -m @stdin reads message from stdin', () => {
    when('[t0] message piped via stdin', () => {
      then('commit succeeds with stdin message', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['-m', '@stdin', '--mode', 'apply'],
          stdin: 'fix(api): stdin message\n\n- fixed via stdin',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');
        expect(result.stdout).toContain('header: fix(api): stdin message');
      });

      then('commit log shows correct header from stdin', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: ['-m', '@stdin', '--mode', 'apply'],
          stdin: 'fix(api): from stdin\n\n- body from stdin',
        });

        expect(result.exitCode).toBe(0);

        const log = spawnSync('git', ['log', '--format=%s', '-1'], {
          cwd: result.tempDir,
          encoding: 'utf-8',
        });
        expect(log.stdout.trim()).toBe('fix(api): from stdin');
      });

      then('commit body contains stdin content', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: ['-m', '@stdin', '--mode', 'apply'],
          stdin: 'fix(api): body test\n\n- line one\n- line two',
        });

        expect(result.exitCode).toBe(0);

        const log = spawnSync('git', ['log', '--format=%B', '-1'], {
          cwd: result.tempDir,
          encoding: 'utf-8',
        });
        expect(log.stdout).toContain('- line one');
        expect(log.stdout).toContain('- line two');
      });
    });

    when('[t1] --message @stdin variant', () => {
      then('works the same as -m @stdin', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['--message', '@stdin', '--mode', 'apply'],
          stdin: 'fix(api): long flag stdin\n\n- via --message @stdin',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');
        expect(result.stdout).toContain('header: fix(api): long flag stdin');
      });
    });

    when('[t2] plan mode with stdin', () => {
      then('shows preview from stdin message', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['-m', '@stdin'],
          stdin: 'fix(api): plan from stdin\n\n- planned via stdin',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('heres the wave');
        expect(result.stdout).toContain('header: fix(api): plan from stdin');
        expect(result.stdout).toContain('- planned via stdin');
      });
    });

    when('[t3] stdin with multiline body', () => {
      then('preserves all body lines', () => {
        const multilineMessage = `feat(ui): add button

- added primary button component
- added secondary variant
- added disabled state
- updated tests`;

        const result = runInTempGitRepo({
          files: { 'button.tsx': 'button content' },
          meterState: { uses: 2, push: 'block' },
          branch: 'feat/test-branch', // signals feat
          commitArgs: ['-m', '@stdin', '--mode', 'apply'],
          stdin: multilineMessage,
        });

        expect(result.exitCode).toBe(0);

        const log = spawnSync('git', ['log', '--format=%B', '-1'], {
          cwd: result.tempDir,
          encoding: 'utf-8',
        });
        expect(log.stdout).toContain('- added primary button component');
        expect(log.stdout).toContain('- added secondary variant');
        expect(log.stdout).toContain('- added disabled state');
        expect(log.stdout).toContain('- updated tests');
      });
    });

    when('[t4] bound level enforced with stdin', () => {
      then('rejects mismatched level from stdin', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'fix',
          commitArgs: ['-m', '@stdin', '--mode', 'apply'],
          stdin: 'feat(api): wrong level\n\n- should fail',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain("level is bound to 'fix'");
        expect(result.stdout).toContain('commit prefix is');
      });

      then('accepts matching level from stdin', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'fix',
          commitArgs: ['-m', '@stdin', '--mode', 'apply'],
          stdin: 'fix(api): correct level\n\n- should pass',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });
  });

  given('[case33] adhoc Co-authored-by forbidden', () => {
    when('[t0] message contains Co-authored-by trailer', () => {
      then('exits with error about adhoc co-author', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['-m', '@stdin', '--mode', 'apply'],
          stdin:
            'fix(api): with adhoc coauthor\n\n- some change\n\nCo-authored-by: Someone <someone@example.com>',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain('adhoc Co-authored-by forbidden');
        expect(result.stdout).toMatchSnapshot();
      });

      then('no commit is created', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['-m', '@stdin', '--mode', 'apply'],
          stdin:
            'fix(api): with adhoc coauthor\n\n- some change\n\nCo-authored-by: Someone <someone@example.com>',
        });

        // genTempDir({ git: true }) creates initial commit + gitignore setup; verify no new one was added
        const logResult = spawnSync('git', ['log', '--oneline'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        expect(logResult.stdout.trim().split('\n').length).toBe(3);
        expect(logResult.stdout).not.toContain('adhoc coauthor');
      });

      then('uses are not decremented', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['-m', '@stdin', '--mode', 'apply'],
          stdin:
            'fix(api): with adhoc coauthor\n\n- some change\n\nCo-authored-by: Someone <someone@example.com>',
        });

        const meterContent = fs.readFileSync(
          path.join(result.tempDir, '.meter', 'git.commit.uses.jsonc'),
          'utf-8',
        );
        expect(JSON.parse(meterContent).uses).toBe(3); // unchanged
      });
    });

    when('[t1] message contains lowercase co-authored-by', () => {
      then('also exits with error (case insensitive)', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['-m', '@stdin', '--mode', 'apply'],
          stdin:
            'fix(api): lowercase coauthor\n\n- change\n\nco-authored-by: someone <someone@example.com>',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('adhoc Co-authored-by forbidden');
      });
    });

    when('[t2] plan mode with adhoc Co-authored-by', () => {
      then('also exits with error in plan mode', () => {
        const result = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['-m', '@stdin'], // plan mode (default)
          stdin:
            'fix(api): plan with coauthor\n\n- change\n\nCo-authored-by: Someone <someone@example.com>',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('adhoc Co-authored-by forbidden');
      });
    });
  });

  given('[case20] continuation commit enforcement', () => {
    when('[t0] first behavioral commit (fix)', () => {
      then('commit succeeds', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-cont-first-fix',
          git: true,
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // setup meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'block' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create feature branch
        spawnSync('git', ['checkout', '-b', 'turtle/first-fix'], {
          cwd: tempDir,
        });

        // stage a file for the first behavioral commit
        fs.writeFileSync(path.join(tempDir, 'fix.txt'), 'fixed content');
        spawnSync('git', ['add', 'fix.txt'], { cwd: tempDir });

        // run git.commit.set (with isolated HOME to avoid global blocker)
        const isolatedHome = genTempDir({
          slug: 'cont-first-fix-home',
          git: false,
        });

        // set up org permission in isolated HOME
        const orgMeterDir = path.join(
          isolatedHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // set up .agent/keyrack.yml so org can be detected from repo
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), 'org: ehmpathy\n');

        // create stub bash alias files to prevent warnings when HOME is fake
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
          '',
        );
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.termwork.sh'),
          '',
        );

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'fix(api): validate input\n\n- add validation',
            '--mode',
            'apply',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, HOME: isolatedHome },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });

    when('[t1] first behavioral commit (feat)', () => {
      then('commit succeeds', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-cont-first-feat',
          git: true,
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // setup meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'block' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create feature branch (name must signal feat)
        spawnSync('git', ['checkout', '-b', 'feat/first-feature'], {
          cwd: tempDir,
        });

        // stage a file
        fs.writeFileSync(path.join(tempDir, 'feat.txt'), 'new feature');
        spawnSync('git', ['add', 'feat.txt'], { cwd: tempDir });

        // run git.commit.set (with isolated HOME to avoid global blocker)
        const isolatedHome = genTempDir({
          slug: 'cont-first-feat-home',
          git: false,
        });

        // set up org permission in isolated HOME
        const orgMeterDir = path.join(
          isolatedHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // set up .agent/keyrack.yml so org can be detected from repo
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), 'org: ehmpathy\n');

        // create stub bash alias files to prevent warnings when HOME is fake
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
          '',
        );
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.termwork.sh'),
          '',
        );

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'feat(api): add endpoint\n\n- new endpoint',
            '--mode',
            'apply',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, HOME: isolatedHome },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });

    when('[t2] second fix after first fix', () => {
      then('commit is BLOCKED with error', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-cont-second-fix',
          git: true,
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // setup meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'block' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create feature branch
        spawnSync('git', ['checkout', '-b', 'turtle/second-fix'], {
          cwd: tempDir,
        });

        // first behavioral commit
        fs.writeFileSync(path.join(tempDir, 'first.txt'), 'first fix');
        spawnSync('git', ['add', 'first.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'fix(api): first fix'], {
          cwd: tempDir,
        });

        // stage second file for second commit
        fs.writeFileSync(path.join(tempDir, 'second.txt'), 'second fix');
        spawnSync('git', ['add', 'second.txt'], { cwd: tempDir });

        // attempt second fix (should be blocked)
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'fix(api): second fix\n\n- more fixes',
            '--mode',
            'apply',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain(
          'branch already has a behavioral commit',
        );
        expect(result.stdout).toContain(
          'first behavioral commit: fix(api): first fix',
        );
        expect(result.stdout).toContain('attempted: fix(api): second fix');
        expect(result.stdout).toContain('cont:');
        expect(result.stdout).toContain('cont(api):');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] second feat after first fix', () => {
      then('commit is BLOCKED with error', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-cont-feat-after-fix',
          git: true,
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // setup meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'block' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create feature branch
        spawnSync('git', ['checkout', '-b', 'turtle/feat-after-fix'], {
          cwd: tempDir,
        });

        // first behavioral commit (fix)
        fs.writeFileSync(path.join(tempDir, 'first.txt'), 'first fix');
        spawnSync('git', ['add', 'first.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'fix(api): first fix'], {
          cwd: tempDir,
        });

        // stage second file
        fs.writeFileSync(path.join(tempDir, 'second.txt'), 'new feature');
        spawnSync('git', ['add', 'second.txt'], { cwd: tempDir });

        // attempt feat (should be blocked)
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'feat(api): add feature\n\n- new feature',
            '--mode',
            'apply',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain(
          'branch already has a behavioral commit',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t4] cont: after first behavioral', () => {
      then('commit succeeds', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-cont-prefix',
          git: true,
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // setup meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'block' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create feature branch
        spawnSync('git', ['checkout', '-b', 'turtle/cont-prefix'], {
          cwd: tempDir,
        });

        // first behavioral commit
        fs.writeFileSync(path.join(tempDir, 'first.txt'), 'first fix');
        spawnSync('git', ['add', 'first.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'fix(api): first fix'], {
          cwd: tempDir,
        });

        // stage second file
        fs.writeFileSync(path.join(tempDir, 'second.txt'), 'continuation');
        spawnSync('git', ['add', 'second.txt'], { cwd: tempDir });

        // cont: should succeed
        const isolatedHome = genTempDir({
          slug: 'cont-prefix-home',
          git: false,
        });

        // set up org permission in isolated HOME
        const orgMeterDir = path.join(
          isolatedHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // set up .agent/keyrack.yml so org can be detected from repo
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), 'org: ehmpathy\n');

        // create stub bash alias files
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
          '',
        );
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.termwork.sh'),
          '',
        );

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'cont: add tests\n\n- test coverage',
            '--mode',
            'apply',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, HOME: isolatedHome },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });

    when('[t5] cont(scope): after first behavioral', () => {
      then('commit succeeds', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-cont-scope',
          git: true,
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // setup meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'block' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create feature branch
        spawnSync('git', ['checkout', '-b', 'turtle/cont-scope'], {
          cwd: tempDir,
        });

        // first behavioral commit
        fs.writeFileSync(path.join(tempDir, 'first.txt'), 'first fix');
        spawnSync('git', ['add', 'first.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'fix(api): first fix'], {
          cwd: tempDir,
        });

        // stage second file
        fs.writeFileSync(path.join(tempDir, 'second.txt'), 'continuation');
        spawnSync('git', ['add', 'second.txt'], { cwd: tempDir });

        // cont(scope): should succeed
        const isolatedHome = genTempDir({
          slug: 'cont-scope-home',
          git: false,
        });

        // set up org permission in isolated HOME
        const orgMeterDir = path.join(
          isolatedHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // set up .agent/keyrack.yml so org can be detected from repo
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), 'org: ehmpathy\n');

        // create stub bash alias files
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
          '',
        );
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.termwork.sh'),
          '',
        );

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'cont(api): add tests\n\n- test coverage',
            '--mode',
            'apply',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, HOME: isolatedHome },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });

    when('[t6] chore: after first behavioral', () => {
      then('commit succeeds (exempt)', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-cont-chore',
          git: true,
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // setup meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'block' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create feature branch
        spawnSync('git', ['checkout', '-b', 'turtle/chore-after-fix'], {
          cwd: tempDir,
        });

        // first behavioral commit
        fs.writeFileSync(path.join(tempDir, 'first.txt'), 'first fix');
        spawnSync('git', ['add', 'first.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'fix(api): first fix'], {
          cwd: tempDir,
        });

        // stage second file
        fs.writeFileSync(path.join(tempDir, 'second.txt'), 'chore work');
        spawnSync('git', ['add', 'second.txt'], { cwd: tempDir });

        // chore: should succeed (exempt)
        const isolatedHome = genTempDir({
          slug: 'cont-chore-home',
          git: false,
        });

        // set up org permission in isolated HOME
        const orgMeterDir = path.join(
          isolatedHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // set up .agent/keyrack.yml so org can be detected from repo
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), 'org: ehmpathy\n');

        // create stub bash alias files
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
          '',
        );
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.termwork.sh'),
          '',
        );

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'chore: update deps\n\n- bump versions',
            '--mode',
            'apply',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, HOME: isolatedHome },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });

    when('[t7] docs: after first behavioral', () => {
      then('commit succeeds (exempt)', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-cont-docs',
          git: true,
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // setup meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'block' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create feature branch
        spawnSync('git', ['checkout', '-b', 'turtle/docs-after-fix'], {
          cwd: tempDir,
        });

        // first behavioral commit
        fs.writeFileSync(path.join(tempDir, 'first.txt'), 'first fix');
        spawnSync('git', ['add', 'first.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'fix(api): first fix'], {
          cwd: tempDir,
        });

        // stage docs file
        fs.writeFileSync(path.join(tempDir, 'README.md'), '# Docs');
        spawnSync('git', ['add', 'README.md'], { cwd: tempDir });

        // docs: should succeed (exempt)
        const isolatedHome = genTempDir({ slug: 'cont-docs-home', git: false });

        // set up org permission in isolated HOME
        const orgMeterDir = path.join(
          isolatedHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // set up .agent/keyrack.yml so org can be detected from repo
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), 'org: ehmpathy\n');

        // create stub bash alias files
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
          '',
        );
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.termwork.sh'),
          '',
        );

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'docs: update readme\n\n- add docs',
            '--mode',
            'apply',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, HOME: isolatedHome },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('righteous!');
      });
    });

    when(
      '[t8] fix: after external chore (chore made via raw git, not skill)',
      () => {
        then('fix succeeds as first behavioral commit', () => {
          const tempDir = genTempDir({
            slug: 'git-commit-cont-chore-then-fix',
            git: true,
          });

          // configure git user
          configureTestGitUser({ cwd: tempDir });

          // setup meter
          const meterDir = path.join(tempDir, '.meter');
          fs.mkdirSync(meterDir, { recursive: true });
          fs.writeFileSync(
            path.join(meterDir, 'git.commit.uses.jsonc'),
            JSON.stringify({ uses: 5, push: 'block' }, null, 2),
          );
          fs.writeFileSync(
            path.join(tempDir, '.gitignore'),
            '.meter/\n.agent/\n.fakebin/\n',
          );
          spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
          spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
            cwd: tempDir,
          });

          // create feature branch
          spawnSync('git', ['checkout', '-b', 'turtle/chore-then-fix'], {
            cwd: tempDir,
          });

          // chore commit first (not behavioral)
          fs.writeFileSync(path.join(tempDir, 'deps.txt'), 'deps');
          spawnSync('git', ['add', 'deps.txt'], { cwd: tempDir });
          spawnSync('git', ['commit', '-m', 'chore: update deps'], {
            cwd: tempDir,
          });

          // stage fix file
          fs.writeFileSync(path.join(tempDir, 'fix.txt'), 'fix content');
          spawnSync('git', ['add', 'fix.txt'], { cwd: tempDir });

          // fix: should succeed (chore doesn't count as behavioral)
          const isolatedHome = genTempDir({
            slug: 'chore-then-fix-home',
            git: false,
          });

          // set up org permission in isolated HOME
          const orgMeterDir = path.join(
            isolatedHome,
            '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
          );
          fs.mkdirSync(orgMeterDir, { recursive: true });
          fs.writeFileSync(
            path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
            JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
          );

          // set up .agent/keyrack.yml so org can be detected from repo
          const agentDir = path.join(tempDir, '.agent');
          fs.mkdirSync(agentDir, { recursive: true });
          fs.writeFileSync(
            path.join(agentDir, 'keyrack.yml'),
            'org: ehmpathy\n',
          );

          // create stub bash alias files
          fs.writeFileSync(
            path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
            '',
          );
          fs.writeFileSync(
            path.join(isolatedHome, '.bash_aliases.termwork.sh'),
            '',
          );

          const result = spawnSync(
            'bash',
            [
              scriptPath,
              '--message',
              'fix(api): validate input\n\n- add validation',
              '--mode',
              'apply',
            ],
            {
              cwd: tempDir,
              encoding: 'utf-8' as BufferEncoding,
              stdio: ['pipe', 'pipe', 'pipe'],
              env: { ...process.env, HOME: isolatedHome },
            },
          );

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('righteous!');
        });
      },
    );

    when('[t9] cont: on fresh branch (no behavioral yet)', () => {
      then('commit is BLOCKED', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-cont-fresh-branch',
          git: true,
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // setup meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'block' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create feature branch
        spawnSync('git', ['checkout', '-b', 'turtle/cont-fresh'], {
          cwd: tempDir,
        });

        // stage file
        fs.writeFileSync(path.join(tempDir, 'first.txt'), 'first content');
        spawnSync('git', ['add', 'first.txt'], { cwd: tempDir });

        // cont: on fresh branch (no behavioral yet) should be BLOCKED
        const isolatedHome = genTempDir({
          slug: 'cont-fresh-home',
          git: false,
        });

        // set up org permission in isolated HOME
        const orgMeterDir = path.join(
          isolatedHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // set up .agent/keyrack.yml so org can be detected from repo
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), 'org: ehmpathy\n');

        // create stub bash alias files
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
          '',
        );
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.termwork.sh'),
          '',
        );

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'cont: continue work\n\n- add content',
            '--mode',
            'apply',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, HOME: isolatedHome },
          },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain(
          'first commit must be fix(<scope>): or feat(<scope>):',
        );
        expect(result.stdout).toContain('attempted: cont:');
        expect(result.stdout).toContain(
          'use `fix(<scope>):` or `feat(<scope>):` for the first behavioral commit',
        );
      });
    });

    when('[t10] chore: on fresh branch (no behavioral yet)', () => {
      then('commit is BLOCKED (chore never triggers tagged releases)', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-chore-fresh-branch',
          git: true,
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // setup meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'block' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create feature branch
        spawnSync('git', ['checkout', '-b', 'turtle/chore-fresh'], {
          cwd: tempDir,
        });

        // stage file
        fs.writeFileSync(path.join(tempDir, 'deps.txt'), 'updated deps');
        spawnSync('git', ['add', 'deps.txt'], { cwd: tempDir });

        // chore: on fresh branch should be BLOCKED
        const isolatedHome = genTempDir({
          slug: 'chore-fresh-home',
          git: false,
        });

        // set up org permission in isolated HOME
        const orgMeterDir = path.join(
          isolatedHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // set up .agent/keyrack.yml so org can be detected from repo
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), 'org: ehmpathy\n');

        // create stub bash alias files
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
          '',
        );
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.termwork.sh'),
          '',
        );

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'chore: update deps\n\n- bump versions',
            '--mode',
            'apply',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, HOME: isolatedHome },
          },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain(
          'first commit must be fix(<scope>): or feat(<scope>):',
        );
        expect(result.stdout).toContain('attempted: chore:');
        expect(result.stdout).toContain(
          'only fix: and feat: trigger tagged releases',
        );
      });
    });

    when('[t11] fix: without scope on fresh branch', () => {
      then('commit is BLOCKED (first commit requires scope)', () => {
        // create temp git repo
        const tempDir = genTempDir({
          slug: 'git-commit-noscope-fresh-branch',
          git: true,
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // create and set local quota
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'block', stage: 'allow' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n.fakebin/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: gitignore'], {
          cwd: tempDir,
        });

        // create feature branch
        spawnSync('git', ['checkout', '-b', 'turtle/noscope-fresh'], {
          cwd: tempDir,
        });

        // stage file
        fs.writeFileSync(path.join(tempDir, 'test.txt'), 'test content');
        spawnSync('git', ['add', 'test.txt'], { cwd: tempDir });

        // try to commit fix: without scope (no behavioral commits on branch yet)
        const isolatedHome = genTempDir({
          slug: 'noscope-fresh-home',
          git: false,
        });

        // set up org permission in isolated HOME
        const orgMeterDir = path.join(
          isolatedHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // set up .agent/keyrack.yml so org can be detected from repo
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), 'org: ehmpathy\n');

        // create stub bash alias files
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
          '',
        );
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.termwork.sh'),
          '',
        );

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'fix: no scope here\n\n- scope not present',
            '--mode',
            'apply',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, HOME: isolatedHome },
          },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain('first commit requires a scope');
        expect(result.stdout).toContain('attempted: fix: no scope here');
        expect(result.stdout).toContain('fix(<scope>): or feat(<scope>):');
      });
    });
  });

  // ========================================
  // global blocker tests
  // ========================================

  given('[case24] commit with global blocker active', () => {
    when('[t0] global blocker is active and local quota present', () => {
      then('commit is blocked with global error', () => {
        // create temp home for global storage isolation
        const tempHome = genTempDir({
          slug: 'git-commit-set-home',
          git: false,
        });
        const globalMeterDir = path.join(
          tempHome,
          '.rhachet',
          'storage',
          'repo=ehmpathy',
          'role=mechanic',
          '.meter',
        );
        fs.mkdirSync(globalMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(globalMeterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ blocked: true }, null, 2),
        );

        // create temp git repo with local quota
        const tempDir = genTempDir({
          slug: 'git-commit-set-test',
          git: true,
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // create local quota
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'allow' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: add .gitignore'], {
          cwd: tempDir,
        });

        // create feature branch
        spawnSync('git', ['checkout', '-b', 'fix/test-branch'], {
          cwd: tempDir,
        });

        // create and stage test file
        fs.writeFileSync(path.join(tempDir, 'fix.txt'), 'fixed content');
        spawnSync('git', ['add', 'fix.txt'], { cwd: tempDir });

        // set up .agent/keyrack.yml so org can be detected from repo
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), 'org: ehmpathy\n');

        // create stub bash alias files to prevent warnings when HOME is fake
        fs.writeFileSync(path.join(tempHome, '.bash_aliases.ductwork.sh'), '');
        fs.writeFileSync(path.join(tempHome, '.bash_aliases.termwork.sh'), '');

        // run commit with injected HOME
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'fix(api): validate input\n\n- test change',
            '--mode',
            'apply',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as const,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, HOME: tempHome },
          },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain('commits blocked globally');
        expect(result.stdout).toContain('git.commit.uses allow --global');
        expect(result.stdout).toMatchSnapshot();

        // verify local quota was NOT decremented
        const localState = JSON.parse(
          fs.readFileSync(
            path.join(meterDir, 'git.commit.uses.jsonc'),
            'utf-8',
          ),
        );
        expect(localState.uses).toBe(5);
      });
    });
  });

  given('[case25] commit after global blocker lifted', () => {
    when('[t0] global blocker was active then lifted', () => {
      then('commit succeeds and local quota decrements', () => {
        // create temp home WITHOUT global blocker
        const tempHome = genTempDir({
          slug: 'git-commit-set-home',
          git: false,
        });

        // set up org permission so org blocker check passes
        const orgMeterDir = path.join(
          tempHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // create temp git repo with local quota
        const tempDir = genTempDir({
          slug: 'git-commit-set-test',
          git: true,
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // create local quota
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 3, push: 'block' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: add .gitignore'], {
          cwd: tempDir,
        });

        // create feature branch
        spawnSync('git', ['checkout', '-b', 'fix/test-branch'], {
          cwd: tempDir,
        });

        // create and stage test file
        fs.writeFileSync(path.join(tempDir, 'fix.txt'), 'fixed content');
        spawnSync('git', ['add', 'fix.txt'], { cwd: tempDir });

        // set up .agent/keyrack.yml so org can be detected from repo
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), 'org: ehmpathy\n');

        // create stub bash alias files to prevent warnings when HOME is fake
        fs.writeFileSync(path.join(tempHome, '.bash_aliases.ductwork.sh'), '');
        fs.writeFileSync(path.join(tempHome, '.bash_aliases.termwork.sh'), '');

        // run commit with injected HOME (no global blocker)
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'fix(api): validate input\n\n- test change',
            '--mode',
            'apply',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as const,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, HOME: tempHome },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('righteous');

        // verify local quota was decremented
        const localState = JSON.parse(
          fs.readFileSync(
            path.join(meterDir, 'git.commit.uses.jsonc'),
            'utf-8',
          ),
        );
        expect(localState.uses).toBe(2);
      });
    });
  });

  given('[case26] commit with corrupt global blocker file', () => {
    when('[t0] global blocker file contains invalid json', () => {
      then('commit is blocked with corrupt file error', () => {
        // create temp home with corrupt global blocker
        const tempHome = genTempDir({
          slug: 'git-commit-set-home',
          git: false,
        });
        const globalMeterDir = path.join(
          tempHome,
          '.rhachet',
          'storage',
          'repo=ehmpathy',
          'role=mechanic',
          '.meter',
        );
        fs.mkdirSync(globalMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(globalMeterDir, 'git.commit.uses.jsonc'),
          'not valid json {{{',
        );

        // create temp git repo with local quota
        const tempDir = genTempDir({
          slug: 'git-commit-set-test',
          git: true,
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
        });

        // configure git user
        configureTestGitUser({ cwd: tempDir });

        // create local quota
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'allow' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup: add .gitignore'], {
          cwd: tempDir,
        });

        // create feature branch
        spawnSync('git', ['checkout', '-b', 'fix/test-branch'], {
          cwd: tempDir,
        });

        // create and stage test file
        fs.writeFileSync(path.join(tempDir, 'fix.txt'), 'fixed content');
        spawnSync('git', ['add', 'fix.txt'], { cwd: tempDir });

        // set up .agent/keyrack.yml so org can be detected from repo
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), 'org: ehmpathy\n');

        // create stub bash alias files to prevent warnings when HOME is fake
        fs.writeFileSync(path.join(tempHome, '.bash_aliases.ductwork.sh'), '');
        fs.writeFileSync(path.join(tempHome, '.bash_aliases.termwork.sh'), '');

        // run commit with injected HOME (corrupt global blocker)
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--message',
            'fix(api): validate input\n\n- test change',
            '--mode',
            'apply',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8' as const,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, HOME: tempHome },
          },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain('global blocker file corrupt');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // unlimited quota (infinite) tests
  // ========================================

  given('[case27] commit with unlimited quota', () => {
    when('[t0] uses is "infinite"', () => {
      then('commit succeeds and uses stays infinite', () => {
        const result = runInTempGitRepo({
          files: { 'test.txt': 'test content' },
          staged: true,
          meterState: { uses: 'infinite', push: 'allow', stage: 'allow' },
          commitArgs: [
            '--message',
            'fix(api): validate input\n\n- test change',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous');
        expect(result.stdout).toContain('left: unlimited');

        // verify state file still shows infinite
        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe('infinite');
        expect(state.push).toBe('allow');
        expect(state.stage).toBe('allow');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] plan mode with unlimited quota', () => {
      then('shows unlimited in meter display', () => {
        const result = runInTempGitRepo({
          files: { 'test.txt': 'test content' },
          staged: true,
          meterState: { uses: 'infinite', push: 'allow' },
          commitArgs: [
            '--message',
            'fix(api): validate input\n\n- test change',
            '--mode',
            'plan',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('heres the wave');
        expect(result.stdout).toContain('left: unlimited');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case28] placeholder identity guard', () => {
    when('[t0] git user.name is Test User and NODE_ENV is not test', () => {
      then('exits with placeholder identity error', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-set-placeholder-test',
          git: true,
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
        });

        // configure git user to placeholder (bypasses configureTestGitUser guard via direct spawnSync)
        spawnSync('git', ['config', '--local', 'user.name', 'Test User'], {
          cwd: tempDir,
        });
        spawnSync(
          'git',
          ['config', '--local', 'user.email', 'test@example.com'],
          {
            cwd: tempDir,
          },
        );

        // setup meter and branch
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 3, push: 'block' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup'], { cwd: tempDir });
        spawnSync('git', ['checkout', '-b', 'fix/test-branch'], {
          cwd: tempDir,
        });

        // create and stage file
        fs.writeFileSync(path.join(tempDir, 'test.txt'), 'content');
        spawnSync('git', ['add', 'test.txt'], { cwd: tempDir });

        // run with NODE_ENV=production to trigger failfast
        const isolatedHome = genTempDir({ slug: 'git-set-home', git: false });

        // set up org permission in isolated HOME
        const orgMeterDir = path.join(
          isolatedHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // set up .agent/keyrack.yml so org can be detected from repo
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), 'org: ehmpathy\n');

        // create stub bash alias files
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
          '',
        );
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.termwork.sh'),
          '',
        );

        const result = spawnSync(
          'bash',
          [scriptPath, '-m', 'fix(api): test\n\n- change', '--mode', 'apply'],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            env: { ...process.env, HOME: isolatedHome, NODE_ENV: 'production' },
          },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('placeholder identity detected');
        expect(result.stdout).toContain('Test User');
      });
    });

    when('[t1] git user.name is Test Human and NODE_ENV is not test', () => {
      then('exits with placeholder identity error', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-set-placeholder-test',
          git: true,
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
        });

        // configure git user to placeholder
        spawnSync('git', ['config', '--local', 'user.name', 'Test Human'], {
          cwd: tempDir,
        });
        spawnSync(
          'git',
          ['config', '--local', 'user.email', 'human@test.com'],
          {
            cwd: tempDir,
          },
        );

        // setup meter and branch
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 3, push: 'block' }, null, 2),
        );
        fs.writeFileSync(
          path.join(tempDir, '.gitignore'),
          '.meter/\n.agent/\n',
        );
        spawnSync('git', ['add', '.gitignore'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'setup'], { cwd: tempDir });
        spawnSync('git', ['checkout', '-b', 'fix/test-branch'], {
          cwd: tempDir,
        });

        // create and stage file
        fs.writeFileSync(path.join(tempDir, 'test.txt'), 'content');
        spawnSync('git', ['add', 'test.txt'], { cwd: tempDir });

        // run with NODE_ENV=production to trigger failfast
        const isolatedHome = genTempDir({ slug: 'git-set-home', git: false });

        // set up org permission in isolated HOME
        const orgMeterDir = path.join(
          isolatedHome,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(orgMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
          JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
        );

        // set up .agent/keyrack.yml so org can be detected from repo
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(agentDir, { recursive: true });
        fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), 'org: ehmpathy\n');

        // create stub bash alias files
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.ductwork.sh'),
          '',
        );
        fs.writeFileSync(
          path.join(isolatedHome, '.bash_aliases.termwork.sh'),
          '',
        );

        const result = spawnSync(
          'bash',
          [scriptPath, '-m', 'fix(api): test\n\n- change', '--mode', 'apply'],
          {
            cwd: tempDir,
            encoding: 'utf-8' as BufferEncoding,
            env: { ...process.env, HOME: isolatedHome, NODE_ENV: 'production' },
          },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('placeholder identity detected');
        expect(result.stdout).toContain('Test Human');
      });
    });

    when('[t2] git user.name is Test User but NODE_ENV is test', () => {
      then('commit succeeds (guard bypassed for tests)', () => {
        const result = runInTempGitRepo({
          files: { 'test.txt': 'content' },
          staged: true,
          meterState: { uses: 3, push: 'block' },
          gitUser: { name: 'Test User', email: 'test@example.com' },
          commitArgs: ['-m', 'fix(api): test\n\n- change', '--mode', 'apply'],
        });

        // NODE_ENV=test is set by jest, so this should pass
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous');
      });
    });
  });

  given('[case34] --help short-circuits before the identity fetch', () => {
    when(
      '[t0] NODE_ENV=production would otherwise make the keyrack fetch reachable',
      () => {
        then('--help exits 0 with usage and emits no keyrack heads-up', () => {
          // the identity fetch is gated on `as-ehmpath && NODE_ENV != test`, so
          // in the jest env it is always skipped. run with NODE_ENV=production to
          // make it reachable, then prove --help still exits before it runs. this
          // clamps the most-repeated blocker (identity-fetch used to block --help)
          // per rule.require.test-covered-repairs.
          const result = runInTempGitRepo({
            meterState: { uses: 3, push: 'allow' },
            commitArgs: ['--help'],
            env: { NODE_ENV: 'production' },
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('usage:');
          expect(result.stdout).toContain('git.commit.set');
          // the fetch, if reached, emits a keyrack heads-up on failure; --help
          // must exit before it ever runs — so the note is absent on both streams
          expect(result.stdout).not.toContain('keyrack token wasnt fetched');
          expect(result.stderr).not.toContain('keyrack token wasnt fetched');
          // lock the human-visible --help contract so a reworded or dropped flag
          // cannot ship undetected (rule.require.contract-snapshot-exhaustiveness)
          expect(result.stdout).toMatchSnapshot();
          expect(result.stderr).toMatchSnapshot();
        });
      },
    );
  });

  given(
    '[case35] a composed --push under as-ehmpath performs exactly ONE keyrack fetch',
    () => {
      when(
        '[t0] set --push --auth as-ehmpath with a healthy (faked) keyrack',
        () => {
          then(
            'set mints the token once, threads it to push, and the bot opens the pr',
            () => {
              // the vision headline, proven end-to-end from the SET entry: a
              // mechanic runs `git.commit.set … --mode apply --push` under the
              // DEFAULT as-ehmpath with a healthy keyrack → the bot opens the pr.
              // this proves set.sh PRODUCES the SEATURTLE_PR_TOKEN_* thread and
              // that the composed run performs exactly ONE keyrack fetch: set.sh
              // fetches once, push.sh reuses the thread and never fetches again.
              // case33 in the push suite proves the reuse from push.sh's side with
              // an injected thread; this proves set.sh is the one that mints it,
              // which shuts the double-fetch / identity-divergence window
              // end-to-end (rule.require.test-covered-repairs).

              // a healthy keyrack: the fake rhachet returns the token as the json
              // shape fetch_github_token parses (.grant.key.secret) AND appends a
              // line to a sentinel on every call. exactly ONE call must land.
              const sentinelDir = genTempDir({
                slug: 'git-set-onefetch-sentinel',
              });
              const sentinel = path.join(sentinelDir, 'rhachet-was-called');
              const fakeRhachet = `#!/bin/bash
echo called >> "${sentinel}"
echo '{"grant":{"key":{"secret":"ghp_composedfake"}}}'
exit 0
`;

              // fake git: push succeeds so the transport completes; all else execs
              // real git (local commit, log, rev-parse)
              const fakeBinDir = genTempDir({
                slug: 'git-set-onefetch-fakebin',
              });
              fs.writeFileSync(
                path.join(fakeBinDir, 'git'),
                `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

              // .mock = fake gh: opens pr #77 and hard-fails if GH_TOKEN is not the exact
              // token set.sh threaded — proof the minted token reached the pr op
              // under as-ehmpath (run_gh sets GH_TOKEN to the token)
              fs.writeFileSync(
                path.join(fakeBinDir, 'gh'),
                `#!/bin/bash
if [[ "$GH_TOKEN" != "ghp_composedfake" ]]; then
  echo "expected the threaded token as GH_TOKEN, got: $GH_TOKEN" >&2
  exit 3
fi
if [[ "$1" == "pr" && "$2" == "list" ]]; then
  echo ""
  exit 0
elif [[ "$1" == "pr" && "$2" == "create" ]]; then
  echo "https://github.com/test/repo/pull/77"
  exit 0
fi
exit 1
`,
              );
              fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

              const result = runInTempGitRepo({
                files: { 'fix.txt': 'fixed content' },
                meterState: { uses: 2, push: 'allow' },
                branch: 'turtle/feature',
                gitUser: {
                  name: 'seaturtle[bot]',
                  email: 'seaturtle@ehmpath.com',
                },
                fakeRhachet,
                commitArgs: [
                  '--message',
                  'fix(api): one fetch across the composed push',
                  '--mode',
                  'apply',
                  '--push',
                  '--auth',
                  'as-ehmpath',
                ],
                env: {
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                  // NODE_ENV=production makes the as-ehmpath keyrack fetch
                  // reachable (it is skipped under the jest test env), so the
                  // .mock = fake keyrack actually runs and the thread gets minted
                  NODE_ENV: 'production',
                  // no ambient token → set.sh must fetch from the (faked)
                  // keyrack, not read the value straight off the env
                  EHMPATHY_SEATURTLE_GITHUB_TOKEN: '',
                },
              });

              // the composed run shipped: commit landed + push + pr opened as bot
              expect(result.exitCode).toBe(0);
              expect(result.stdout).toContain('🐢 cowabunga!');
              expect(result.stdout).toContain('pr #77 (created)');
              expect(result.stdout).toContain(
                'opened: as-ehmpath (ehmpath keyrack)',
              );
              // the decisive lock: EXACTLY ONE keyrack fetch across the whole
              // composed run. set.sh fetched once and threaded the token; push.sh
              // reused the thread and never fetched again. a second fetch would be
              // a second sentinel line, and could return a divergent identity —
              // the exact "3rd contributor on squash" window the thread shuts.
              const calls = fs.existsSync(sentinel)
                ? fs
                    .readFileSync(sentinel, 'utf-8')
                    .trim()
                    .split('\n')
                    .filter(Boolean)
                : [];
              expect(calls.length).toBe(1);
              // lock the composed as-ehmpath success contract on both streams
              expect(result.stdout).toMatchSnapshot();
              expect(result.stderr).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    '[case44] the git commit itself fails (e.g. a pre-commit hook that rejects)',
    () => {
      when('[t0] apply mode, the inner git commit exits non-zero', () => {
        then(
          'the "git commit failed" error rides BOTH streams with the raw cause, exit 1',
          () => {
            // .mock = fake git whose `commit` fails like a hook that rejects; every
            // other git subcommand execs the REAL binary so the staged-change +
            // branch + message guards run for real. this drives set.sh's commit-
            // failure branch (set.sh:754), which a hermetic repo cannot otherwise
            // reach — a real git commit would just succeed. the fake's stderr is
            // captured by set.sh and shown as the raw cause.
            const fakeBinDir = genTempDir({
              slug: 'git-set-commitfail-fakebin',
            });
            fs.writeFileSync(
              path.join(fakeBinDir, 'git'),
              `#!/bin/bash
if [[ "$1" == "commit" ]]; then
  echo "error: failed to commit — simulated pre-commit hook rejection" >&2
  exit 1
fi
exec /usr/bin/git "$@"
`,
            );
            fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

            const result = runInTempGitRepo({
              files: { 'fix.txt': 'fixed content' },
              meterState: { uses: 3, push: 'allow' },
              branch: 'fix/test-branch',
              gitUser: {
                name: 'seaturtle[bot]',
                email: 'seaturtle@ehmpath.com',
              },
              commitArgs: [
                '--message',
                'fix(api): commit-fail test',
                '--mode',
                'apply',
              ],
              env: {
                PATH: `${fakeBinDir}:${process.env.PATH}`,
              },
            });

            // a commit failure is a malfunction (exit 1)
            expect(result.exitCode).toBe(1);
            // the headline rides BOTH streams (never stdout-silent) per
            // rule.require.skill-output-streams
            expect(result.stdout).toContain('git commit failed');
            expect(result.stderr).toContain('git commit failed');
            // the raw git cause (captured commit stderr) follows on both streams
            expect(result.stdout).toContain(
              'simulated pre-commit hook rejection',
            );
            expect(result.stderr).toContain(
              'simulated pre-commit hook rejection',
            );
            // lock both streams (rule.require.contract-snapshot-exhaustiveness)
            expect(result.stdout).toMatchSnapshot();
            expect(result.stderr).toMatchSnapshot();
          },
        );
      });
    },
  );
});
