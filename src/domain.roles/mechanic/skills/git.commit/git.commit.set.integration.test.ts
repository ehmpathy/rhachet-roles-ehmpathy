import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';
import { seedTestSponsor } from '@src/.test/seedTestSponsor';

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
    // null = bind NO sponsor, so the commit guard refuses. undefined = the default
    // sponsor, which is what nearly every case needs.
    sponsor?: {
      name: string;
      email: string;
      // which grove bound it — a laptop's `--who @me` writes `me`, a cloud
      // tree's `--who @stdin` writes `supplied`. `[case44]` is the one case
      // that varies it (the byte-identical proof); every other case defaults.
      source?: 'me' | 'supplied';
    } | null;
    // raw bytes for the sponsor state file, written INSTEAD of a seeded sponsor.
    // .why = a corrupt file is not a sponsor, so seedTestSponsor cannot express
    //        one — it exists to write the valid shape. this option keeps the
    //        third state (present, unreadable) inside the ONE spawn path rather
    //        than a hand-rolled spawn beside it.
    sponsorRaw?: string;
    // run the REAL `git.commit.sponsor set` skill instead of a direct seed.
    // .why = seedTestSponsor writes the json shape by hand, so every other case
    //        proves two contracts that merely AGREE ON A SHAPE. this option
    //        chains them: the bind a human runs, then the commit that reads it.
    //        a divergence in the written shape goes red here and nowhere else.
    sponsorViaSkill?: { who: string; stdin?: string };
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

    // configure git user — git needs one to make a commit at all.
    // .note = this is NO LONGER the identity the trailer names. the SPONSOR is,
    //         and it is seeded below. the two were one value until the sponsor
    //         landed, which is exactly the defect: git config names the human on
    //         a laptop and the clone on a cloud grove.
    if (args.gitUser) {
      configureTestGitUser({
        cwd: tempDir,
        name: args.gitUser.name,
        email: args.gitUser.email,
      });
    } else {
      configureTestGitUser({ cwd: tempDir });
    }

    // bind the sponsor through the REAL skill, exactly as a human would
    if (args.sponsorViaSkill) {
      const bound = spawnSync(
        'bash',
        [
          path.join(__dirname, 'git.commit.sponsor.sh'),
          'set',
          '--who',
          args.sponsorViaSkill.who,
        ],
        {
          cwd: tempDir,
          encoding: 'utf-8' as BufferEncoding, // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          input: args.sponsorViaSkill.stdin ?? '',
          env: { ...process.env, __I_AM_HUMAN: 'true' },
        },
      );
      // fail LOUD here rather than let the commit refuse for an unrelated
      // reason — a silent bind failure would read as a commit-guard defect
      if (bound.status !== 0)
        throw new Error(
          `sponsorViaSkill failed (exit ${bound.status}): ${bound.stdout}${bound.stderr}`,
        );
    }

    // bind the sponsor the commit will name (null = bind none, so it refuses)
    else if (args.sponsor !== null && args.sponsorRaw === undefined) {
      seedTestSponsor({ cwd: tempDir, ...(args.sponsor ?? {}) });
    }

    // or write the state file byte-for-byte, for the present-and-unreadable case
    if (args.sponsorRaw !== undefined) {
      const meterDir = path.join(tempDir, '.meter');
      fs.mkdirSync(meterDir, { recursive: true });
      fs.writeFileSync(
        path.join(meterDir, 'git.commit.sponsor.jsonc'),
        args.sponsorRaw,
      );
    }

    // force the base branch to `main` so base-branch detection is deterministic
    // regardless of the runner's git init.defaultBranch (main on a dev box, master
    // on some ci runners). without this, a repo whose default is already `master`
    // collapses a `master` head branch (case43) onto the detected base — set.sh's
    // ON_BASE guard then fires instead of push.sh's master guard, so the outcome
    // diverges local↔ci (rule.require.hermetic-tests). -M is a force-rename, and a
    // no-op when the branch is already main.
    spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });

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

  given('[case2] commit with push, and the tree has NO remote', () => {
    when('[t0] push is allowed and requested', () => {
      // .why = this test read `if (result.exitCode === 0) { expect(…) }`,
      //        so it verified naught on the only path it ever took. the
      //        temp repo has no remote, so the push ALWAYS fails and the
      //        exit is ALWAYS 1 — the guarded branch never once ran, and
      //        the test passed while it asserted no contract at all
      //        (rule.forbid.failhide, the test-side rule).
      //
      // .why = its name said `outputs cowabunga`. the skill prints
      //        `righteous` here, because the commit landed and the push
      //        did not. ⇒ the name asserted the OPPOSITE of the truth, and
      //        no run could contradict it while the branch stayed dark.
      //
      // .what = the real contract on a remote-less tree is a partial
      //         success: the commit is real, the push is not, the exit is
      //         non-zero, and the render says so on both streams.
      //
      // .why one spawn = both `then`s observe the SAME commit+push attempt
      //        (rule.forbid.redundant-expensive-operations).
      const result = useThen('the commit and push are attempted', () =>
        runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'allow' },
          commitArgs: [
            '--message',
            'fix(api): handle edge case',
            '--push',
            '--mode',
            'apply',
          ],
        }),
      );

      then(
        'the commit LANDS and the failed push is reported, never hidden',
        () => {
          // the push failed, so the exit is non-zero — never swallowed to 0
          expect(result.exitCode).toBe(1);

          // ...and the failure is NAMED, rather than left for the reader to
          // infer from the exit code alone (rule.require.failloud)
          expect(result.stdout).toContain('push: error: git push failed');
          // rule.require.skill-output-streams — a failure rides both streams
          expect(result.stderr).toContain('push: error: git push failed');

          // the COMMIT still landed, and the header says so
          expect(result.stdout).toContain('🐢 righteous!');
          const log = spawnSync('git', ['log', '--format=%s', '-1'], {
            cwd: result.tempDir,
            encoding: 'utf-8',
          });
          expect(log.stdout.trim()).toBe('fix(api): handle edge case');
        },
      );

      then('the quota IS spent — the commit was real', () => {
        // .why = the mirror of the refusal cases, and the reason it is worth
        //        its own assertion: a refused commit spends no quota, and a
        //        landed one spends it even where the push that followed it
        //        failed. the meter tracks COMMITS, never pushes.
        const meter = JSON.parse(
          fs.readFileSync(
            path.join(result.tempDir, '.meter', 'git.commit.uses.jsonc'),
            'utf-8',
          ),
        );
        expect(meter.uses).toBe(1);
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
      // .why = both `then`s below observe the SAME refused commit — one
      //        facet is the render, the other the absence of a new commit
      //        in git log (rule.forbid.redundant-expensive-operations).
      const result = useThen('the commit is refused', () =>
        runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 0, push: 'block' },
          commitArgs: ['--message', 'fix(test): some fix', '--mode', 'apply'],
        }),
      );

      then('outputs bummer dude', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('🐢 bummer dude...');
        expect(result.stdout).toContain('no commit uses left');
        expect(result.stdout).toContain(
          'git.commit.uses set --quant N --push allow|block',
        );
        expect(result.stdout).toMatchSnapshot();
      });

      then('no commit is created', () => {
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
      // .why = one spawn, two assertions. both `then` blocks read a different
      //        facet of the SAME refusal, so a re-run per `then` would pay a
      //        subprocess plus a git init to observe a result already in hand
      //        (rule.forbid.redundant-expensive-operations).
      const result = useThen('the commit refuses', () =>
        runInTempGitRepo({
          meterState: { uses: 2, push: 'block' },
          commitArgs: ['--message', 'fix(test): some fix'],
        }),
      );

      then('exits with error', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('no changes to commit');
      });

      then('uses are not decremented', () => {
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

  given('[case6] no sponsor bound to the tree', () => {
    when('[t0] a commit is attempted with no sponsor', () => {
      // .why = one spawn, four assertions. each `then` below reads a
      //        different facet of the SAME refusal, so a re-run per `then`
      //        would pay a subprocess plus a git init to observe a result
      //        already in hand (rule.forbid.redundant-expensive-operations).
      const result = useThen('the commit refuses', () =>
        runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'block' },
          sponsor: null,
          commitArgs: ['--message', 'fix(test): some fix'],
        }),
      );

      then('refuses, and addresses the human', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('no sponsor is bound to this tree');
        expect(result.stdout).toContain('you cannot fix this yourself');
        expect(result.stdout).toContain('ask your human to run');
        expect(result.stdout).toMatchSnapshot();
      });

      then('the refusal names @stdin and the literal, never @me', () => {
        // .why = @me reads the gh session on THIS host, which on a cloud grove
        //        is the clone's. a mandatory block must print only the forms
        //        that hold on every grove.
        expect(result.stdout).toContain('--who @stdin');
        expect(result.stdout).toContain('--who "Name <email>"');
        expect(result.stdout).not.toContain('--who @me');
      });

      then('spends NO quota', () => {
        // .why = a refused commit that decremented the meter would let a tree
        //        burn its grant on refusals, so recovery would need TWO human
        //        grants — this guard would manufacture a second blocker out of
        //        the first. the guard therefore runs BEFORE the meter write.
        const state = JSON.parse(
          fs.readFileSync(
            path.join(result.tempDir, '.meter', 'git.commit.uses.jsonc'),
            'utf-8',
          ),
        );
        expect(state.uses).toBe(2);
      });

      then('the failure lands on BOTH streams', () => {
        expect(result.stderr).toContain('no sponsor is bound to this tree');
      });
    });

    when('[t0b] the refused commit was told to --unstaged include', () => {
      then('🔴 it stages not one file — the tree is as it was found', () => {
        // 🔴 .why = `--unstaged include` runs `git add -A` in apply mode, and
        //        the sponsor guard used to sit AFTER it. so a tree with no
        //        sponsor had EVERY change staged and was then refused: a
        //        mutation on the path that reports failure, and one the human
        //        never sees reported (rule.forbid.hidden-side-effects).
        //
        // .why = git.commit.sponsor already holds this invariant, and its
        //        suite states it outright — "a refused bind must leave the
        //        tree exactly as it found it". a refused COMMIT owes the same.
        //
        // .why = the clamp reads `git diff --cached --name-only` rather than
        //        the render, because the defect leaves the render untouched.
        //        the refusal text was correct under the defect too; only the
        //        INDEX told the truth.
        // .why = `filesUnstaged` is the harness seam that leaves a file OUT of
        //        the index — `files` is staged for you. the clamp needs a file
        //        `git add -A` would newly pick up; an already-staged one
        //        proves naught, since it reads the same on both sides of the
        //        defect. ⚠️ the first draft of this clamp used `files` and so
        //        measured the harness rather than the skill.
        const refused = runInTempGitRepo({
          files: { 'base.txt': 'base content' },
          filesUnstaged: { 'sneaky.txt': 'never asked to be staged' },
          meterState: { uses: 2, push: 'block' },
          sponsor: null,
          commitArgs: [
            '--message',
            'fix(test): some fix',
            '--mode',
            'apply',
            '--unstaged',
            'include',
          ],
        });

        expect(refused.exitCode).toBe(2);
        expect(refused.stdout).toContain('no sponsor is bound to this tree');

        const staged = spawnSync('git', ['diff', '--cached', '--name-only'], {
          cwd: refused.tempDir,
          encoding: 'utf-8', // note: library api requires this term
        });
        expect(staged.stdout).not.toContain('sneaky.txt');
      });
    });

    when('[t1] the sponsor is cleared between two commits', () => {
      then('the very NEXT commit refuses — the read is never cached', () => {
        // .why = a value read once per session would let a cleared tree keep
        //        its commit, on an authorization no longer held — a stale
        //        authorization, which is the defect's own shape.
        const bound = runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['--message', 'fix(test): some fix', '--mode', 'apply'],
        });
        expect(bound.exitCode).toBe(0);

        // clear the sponsor, then commit again in the SAME tree
        fs.rmSync(
          path.join(bound.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
        );
        fs.writeFileSync(path.join(bound.tempDir, 'next.txt'), 'more content');
        spawnSync('git', ['add', 'next.txt'], { cwd: bound.tempDir });

        // .note = the harness auto-injects a body; this direct call must
        //         supply its own (header + blank line + body).
        // .note = `cont(` because the branch already carries a behavioral
        //         commit — that guard runs ahead of the sponsor guard, so a
        //         second `fix(` would stop short of the check under test.
        const after = spawnSync(
          'bash',
          [scriptPath, '--message', 'cont(test): another fix\n\n- test change'],
          {
            cwd: bound.tempDir,
            encoding: 'utf-8', // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            // .note = reuse the harness's isolated HOME, else the real global
            //         blocker state decides the outcome instead of the sponsor.
            env: { ...process.env, HOME: bound.isolatedHome },
          },
        );

        expect(after.status).toBe(2);
        expect(after.stdout).toContain('no sponsor is bound to this tree');
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
      // .why = one spawn, two assertions. both `then` blocks read a different
      //        facet of the SAME refusal, so a re-run per `then` would pay a
      //        subprocess plus a git init to observe a result already in hand
      //        (rule.forbid.redundant-expensive-operations).
      const result = useThen('the commit refuses', () =>
        runInTempGitRepo({
          files: { 'staged.txt': 'staged content' },
          filesUnstaged: { 'unstaged.txt': 'unstaged content' },
          meterState: { uses: 2, push: 'block' },
          commitArgs: ['--message', 'fix(test): some fix'],
        }),
      );

      then('exits with error about unstaged changes', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('unstaged changes detected');
        expect(result.stdout).toContain('unstaged.txt');
      });

      then('no commit is created', () => {
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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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
      // .why = one spawn, three assertions. each `then` below reads a
      //        different facet of the SAME refusal, so a re-run per `then`
      //        would pay a subprocess plus a git init to observe a result
      //        already in hand (rule.forbid.redundant-expensive-operations).
      const result = useThen('the commit refuses', () =>
        runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          bindLevel: 'fix',
          commitArgs: [
            '--message',
            'feat(api): add endpoint',
            '--mode',
            'apply',
          ],
        }),
      );

      then('exits with level mismatch error', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain("level is bound to 'fix'");
        expect(result.stdout).toContain('commit prefix is');
        expect(result.stdout).toMatchSnapshot();
      });

      then('no commit is created', () => {
        const log = spawnSync('git', ['log', '--oneline'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        expect(log.stdout).not.toContain('feat(api): add endpoint');
      });

      then('uses are not decremented', () => {
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
      // .why = one spawn, three assertions. each `then` below reads a
      //        different facet of the SAME refusal, so a re-run per `then`
      //        would pay a subprocess plus a git init to observe a result
      //        already in hand (rule.forbid.redundant-expensive-operations).
      //        branch: null keeps the tree on main, where the guard fires.
      const result = useThen('the commit refuses', () =>
        runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 2, push: 'allow' },
          commitArgs: ['--message', 'fix(test): on main', '--push'],
          branch: null, // stay on main
        }),
      );

      then('exits with error about base branch', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('🐢 bummer dude...');
        expect(result.stdout).toContain('cannot commit to base branch');
        expect(result.stdout).toContain('git checkout -b feat/my-feature');
        expect(result.stdout).toMatchSnapshot();
      });

      then('no commit is created', () => {
        const log = spawnSync('git', ['log', '--oneline'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        // only initial commits, no new commit
        expect(log.stdout.trim().split('\n').length).toBe(3);
        expect(log.stdout).not.toContain('fix(test): on main');
      });

      then('uses are not decremented', () => {
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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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
      // .why = one spawn, three assertions. each `then` below reads a
      //        different facet of the SAME refusal, so a re-run per `then`
      //        would pay a subprocess plus a git init to observe a result
      //        already in hand (rule.forbid.redundant-expensive-operations).
      const result = useThen('the commit refuses', () =>
        runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['-m', '@stdin', '--mode', 'apply'],
          stdin:
            'fix(api): with adhoc coauthor\n\n- some change\n\nCo-authored-by: Someone <someone@example.com>',
        }),
      );

      then('exits with error about adhoc co-author', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain('adhoc Co-authored-by forbidden');
        expect(result.stdout).toMatchSnapshot();
      });

      then('no commit is created', () => {
        // genTempDir({ git: true }) creates initial commit + gitignore setup; verify no new one was added
        const logResult = spawnSync('git', ['log', '--oneline'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding,
        });
        expect(logResult.stdout.trim().split('\n').length).toBe(3);
        expect(logResult.stdout).not.toContain('adhoc coauthor');
      });

      then('uses are not decremented', () => {
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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

          // configure git user, and bind the sponsor the commit will name
          configureTestGitUser({ cwd: tempDir });
          seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // configure git user, and bind the sponsor the commit will name
        configureTestGitUser({ cwd: tempDir });
        seedTestSponsor({ cwd: tempDir });

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

        // malfunction — the file is damaged, not the caller's input
        expect(result.status).toBe(1);
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

  given('[case28] git config is never read for an identity', () => {
    /**
     * .note = this case ASSERTED THE OPPOSITE until the sponsor landed. it
     *         used to prove that a placeholder `git config user.name` blocked
     *         a commit — a guard that only made sense while git config WAS
     *         the identity source. that is the defect: git config names the
     *         human on a laptop and the CLONE on a cloud grove.
     * .note = the placeholder guard did not vanish; it MOVED to bind time,
     *         where a human is present to fix the value, rather than commit
     *         time where only a clone reads the complaint. it is proven at
     *         git.commit.sponsor.integration.test.ts [case5] [t2].
     * .why  = what this case clamps now is invariant 8 — no code path reads
     *         `git config` for an identity, so the fallback is unreachable
     *         rather than merely guarded.
     */
    when(
      '[t0] the git config is a placeholder, a real sponsor is bound',
      () => {
        // .why = both `then`s below observe the SAME commit — one facet is
        //        the render, the other the trailer git actually wrote
        //        (rule.forbid.redundant-expensive-operations).
        const result = useThen('the commit lands, sponsor named', () =>
          runInTempGitRepo({
            files: { 'test.txt': 'content' },
            staged: true,
            meterState: { uses: 3, push: 'block' },
            gitUser: { name: 'Test User', email: 'test@example.com' },
            sponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
            commitArgs: ['-m', 'fix(api): test\n\n- change', '--mode', 'apply'],
          }),
        );

        then('the commit succeeds — git config decides naught', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('righteous');
        });

        then('the trailer names the SPONSOR, never the git config', () => {
          const log = spawnSync('git', ['log', '-1', '--format=%B'], {
            cwd: result.tempDir,
            encoding: 'utf-8', // note: library api requires this term
          });
          expect(log.stdout).toContain(
            'Co-authored-by: Ada Lovelace <ada@example.com>',
          );
          expect(log.stdout).not.toContain('Test User');
          expect(log.stdout).not.toContain('test@example.com');
        });
      },
    );

    when('[t1] NODE_ENV is production', () => {
      then('still commits — the old env-gated guard is gone', () => {
        // .why = the extant placeholder guard was skipped under NODE_ENV=test,
        //        so its behavior forked on an env var. the bind-time guard has
        //        no such fork: it runs the same everywhere, because a human is
        //        present at a bind by construction.
        const result = runInTempGitRepo({
          files: { 'test.txt': 'content' },
          staged: true,
          meterState: { uses: 3, push: 'block' },
          gitUser: { name: 'Test User', email: 'test@example.com' },
          sponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
          commitArgs: ['-m', 'fix(api): test\n\n- change', '--mode', 'apply'],
          env: { NODE_ENV: 'production' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous');
      });
    });

    when('[t2] a plan is run with a placeholder git config', () => {
      then('the plan tree names the sponsor', () => {
        // .why = the OLD code exited 2 here with "cannot determine patron".
        //        a placeholder git config is now irrelevant to attribution.
        const result = runInTempGitRepo({
          files: { 'test.txt': 'content' },
          staged: true,
          meterState: { uses: 3, push: 'block' },
          gitUser: { name: 'Test User', email: 'test@example.com' },
          sponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
          commitArgs: ['-m', 'fix(api): test\n\n- change'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('name: Ada Lovelace');
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
    '[case36] a sponsorless commit short-circuits before the identity fetch',
    () => {
      when(
        '[t0] NODE_ENV=production would otherwise make the keyrack fetch reachable',
        () => {
          then('it refuses for the sponsor, and never reaches keyrack', () => {
            // 🔴 .why = the sponsor guard's own comment states, as a
            //        load-bearing invariant, that it sits ABOVE the keyrack
            //        token fetch — because `fetch_github_token`'s fallback
            //        runs `keyrack unlock`, a write to a store that outlives
            //        this process. a refused commit must perform no mutation.
            //
            // 🔴 .why the env override is REQUIRED = the fetch is gated on
            //        `as-ehmpath && NODE_ENV != test`, so under jest's default
            //        it never runs at all. every other no-sponsor test
            //        therefore passes whether the guard sits above the fetch
            //        or below it ⇒ a regression that moved the fetch back
            //        ahead of the refusal would ship GREEN.
            //
            // .note = the shape is `[case34]`'s, which clamps the same class
            //         of precondition for `--help` (rule.require.clamp-edge-cases).
            const result = runInTempGitRepo({
              meterState: { uses: 3, push: 'allow' },
              sponsor: null, // bind none, so the commit refuses
              stdin: 'fix(scope): summary\n\n- detail',
              commitArgs: [
                '-m',
                '@stdin',
                '--mode',
                'apply',
                '--auth',
                'as-ehmpath',
              ],
              env: { NODE_ENV: 'production' },
            });

            expect(result.exitCode).toBe(2);
            expect(result.stdout).toContain('no sponsor is bound to this tree');

            // the fetch, if reached, emits a keyrack heads-up when it fails —
            // and in a hermetic temp repo with no keyrack it WOULD fail. its
            // absence on both streams is the proof the refusal came first.
            expect(result.stdout).not.toContain('keyrack token wasnt fetched');
            expect(result.stderr).not.toContain('keyrack token wasnt fetched');
          });
        },
      );
    },
  );

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

  given('[case45] the sponsor state file is present and unreadable', () => {
    when('[t0] a commit is attempted against it', () => {
      // .why = a corrupt file was read with `jq … 2>/dev/null || echo ""`,
      //        which discarded jq's exit status. the empty result then fell
      //        into the unbound-tree refusal, so the render named a cause
      //        that was not the cause, and sent the human to bind a sponsor
      //        that was already bound — a loop, since the re-bind writes a
      //        valid file only if the human happens to overwrite the corrupt
      //        one (rule.forbid.failhide).
      //
      // .why = the CLAMP is the pair of assertions below: `not.toContain`
      //        the old wrong text is what goes red under the old code, and
      //        a test that only asserted the new text would pass on both.
      //
      // .why one spawn = both `then`s observe the SAME refused attempt
      //        (rule.forbid.redundant-expensive-operations).
      const result = useThen('the commit is attempted', () =>
        runInTempGitRepo({
          files: { 'test.txt': 'content' },
          staged: true,
          meterState: { uses: 3, push: 'block' },
          sponsorRaw: '{ "sponsor": { "name": "Ada',
          commitArgs: ['-m', '@stdin', '--mode', 'apply'],
          stdin: 'fix(x): y\n\n- z',
        }),
      );

      then('it names the CORRUPT FILE, never "no sponsor is bound"', () => {
        // a corrupt state file is a MALFUNCTION (exit 1), never the
        // constraint (exit 2) an unbound tree raises
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('sponsor state file corrupt');
        expect(result.stdout).toContain('.meter/git.commit.sponsor.jsonc');
        // 🔴 the clamp: the OLD code printed exactly this, and it was wrong
        expect(result.stdout).not.toContain('no sponsor is bound to this tree');
        // the remedy names the inspect/clear, never a re-bind
        expect(result.stdout).toContain('git.commit.sponsor del');
        // .why = BOTH bind forms, to match the twin render in `sponsor get`.
        //        this copy listed the piped form alone, so a human on the
        //        COMMON path (a refused commit) saw fewer routes than one who
        //        ran `get` — and the absent one was the literal, which `F10`
        //        already found undiscoverable once. @me is absent on purpose.
        expect(result.stdout).toContain('--who @stdin');
        expect(result.stdout).toContain('--who "Name <email>"');
        expect(result.stdout).not.toContain('--who @me');
        // .why = rule.require.skill-output-streams — a failure rides both
        expect(result.stderr).toContain('sponsor state file corrupt');
        expect(result.stdout).toMatchSnapshot();
      });

      then('the quota is NOT spent on a refused commit', () => {
        // the sponsor guard sits ahead of the meter write for exactly this
        // reason; the corrupt branch is a new exit and must honor it too,
        // else a corrupt file would burn a grant the human must re-issue
        const meter = JSON.parse(
          fs.readFileSync(
            path.join(result.tempDir, '.meter', 'git.commit.uses.jsonc'),
            'utf-8',
          ),
        );
        expect(meter.uses).toBe(3);
      });
    });
  });

  given(
    '[case46] the sponsor state file PARSES but carries no identity',
    () => {
      when('[t0] a commit is attempted against it', () => {
        // .why = the sharper twin of [case45]. that file did not parse, so a
        //        parse gate caught it. THIS file is valid json — it parses
        //        clean and holds no name and no email, so a parse gate waves
        //        it through and leaves both vars empty. the reader then
        //        returned 0, which its own contract says means "a sponsor is
        //        bound; the vars hold it", and the caller read the empty vars
        //        as an unbound tree. ⇒ the identical wrong remedy as [case45],
        //        one degree off: a human with a DAMAGED file told to bind a
        //        sponsor, when the file is what needs a look
        //        (rule.forbid.failhide).
        //
        // .why = it is damage rather than an absence because the skill cannot
        //        produce it: `set` always writes both fields, and `del` removes
        //        the file. only a hand-edit or a write cut short lands here.
        //
        // .why = the CLAMP is `not.toContain` on the old wrong text. a test
        //        that asserted only the new text would pass under both codes.
        //
        // .why one spawn = this `then` and 'the quota is NOT spent' below
        //        observe the SAME refused attempt against the SAME fixture
        //        (rule.forbid.redundant-expensive-operations). the
        //        half-written-identity `then` uses a DIFFERENT fixture, so
        //        it keeps its own call.
        const result = useThen('the commit is attempted', () =>
          runInTempGitRepo({
            files: { 'test.txt': 'content' },
            staged: true,
            meterState: { uses: 3, push: 'block' },
            sponsorRaw: '{ "sponsor": {} }',
            commitArgs: ['-m', '@stdin', '--mode', 'apply'],
            stdin: 'fix(x): y\n\n- z',
          }),
        );

        then('it names the CORRUPT FILE, never "no sponsor is bound"', () => {
          // a damaged file is a MALFUNCTION (exit 1), never the constraint
          // (exit 2) an unbound tree raises
          expect(result.exitCode).toBe(1);
          expect(result.stdout).toContain('sponsor state file corrupt');
          expect(result.stdout).toContain('.meter/git.commit.sponsor.jsonc');
          // 🔴 the clamp: the OLD reader returned 0 here, and this is what printed
          expect(result.stdout).not.toContain(
            'no sponsor is bound to this tree',
          );
          expect(result.stdout).toContain('git.commit.sponsor del');
          // rule.require.skill-output-streams — a failure rides both streams
          expect(result.stderr).toContain('sponsor state file corrupt');
          expect(result.stdout).toMatchSnapshot();
        });

        then('a HALF-written identity is caught too', () => {
          // .why = the name is present and the email is absent. a check that
          //        asked only "is the sponsor object there?" would pass this,
          //        and the trailer would render `Ada <>` — a co-author line git
          //        accepts and no human can be reached at. both fields carry the
          //        identity, so both are required.
          const result = runInTempGitRepo({
            files: { 'test.txt': 'content' },
            staged: true,
            meterState: { uses: 3, push: 'block' },
            sponsorRaw: '{ "sponsor": { "name": "Ada Lovelace" } }',
            commitArgs: ['-m', '@stdin', '--mode', 'apply'],
            stdin: 'fix(x): y\n\n- z',
          });

          expect(result.exitCode).toBe(1);
          expect(result.stdout).toContain('sponsor state file corrupt');
          expect(result.stdout).not.toContain(
            'no sponsor is bound to this tree',
          );
          // .why pinned = this fixture drives the SAME `sponsor_status -eq 1`
          //      branch as the `then` above, so the two trees are
          //      byte-identical today — which is the hazard, not the
          //      reassurance. a leaf added or reordered on this damaged-fixture
          //      path alone would ship green under partial-text asserts.
          expect(result.stdout).toMatchSnapshot();
        });

        then('the quota is NOT spent on a refused commit', () => {
          const meter = JSON.parse(
            fs.readFileSync(
              path.join(result.tempDir, '.meter', 'git.commit.uses.jsonc'),
              'utf-8',
            ),
          );
          expect(meter.uses).toBe(3);
        });
      });
    },
  );

  given('[case47] the CHAINED paved path — bind, then commit', () => {
    /**
     * .what = the two contracts meet: `git.commit.sponsor set` writes the
     *         state, then `git.commit.set` reads it and names the human.
     *
     * .why = every other case seeds the sponsor with `seedTestSponsor`, a
     *        direct json write. so ~20 cases prove two contracts that AGREE
     *        ON A SHAPE, and none proves the shape one writes is the shape
     *        the other reads. a field renamed on one side alone would ship
     *        green across the whole suite.
     *
     *        the vision's `case=7` asks for exactly this — a journey, since
     *        per-cell tests cannot catch a transition defect.
     *
     * .note = the seed deliberately uses `Test Human`, a value the REAL bind
     *         guard refuses as a placeholder. so this case must supply a name
     *         that survives the bind — which is itself part of what it proves.
     */
    when('[t0] a human pipes the sponsor in, then the clone commits', () => {
      const result = useThen('the chain runs end to end', () =>
        runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          sponsorViaSkill: {
            who: '@stdin',
            stdin: 'Ada Lovelace <ada@example.com>',
          },
          commitArgs: [
            '--message',
            'fix(api): validate input',
            '--mode',
            'apply',
          ],
        }),
      );

      then('the commit succeeds', () => {
        expect(result.exitCode).toBe(0);
      });

      then('the trailer names the human the BIND wrote', () => {
        const trailer = spawnSync('git', ['log', '-1', '--format=%B'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding, // note: library api requires this term
        });

        // 🔴 the clamp: this is the ONE assertion in the suite that fails if
        //    the two skills drift on the state shape
        expect(trailer.stdout).toContain(
          'Co-authored-by: Ada Lovelace <ada@example.com>',
        );
      });

      then('the author is still the clone — the sponsor is a CO-author', () => {
        const author = spawnSync('git', ['log', '-1', '--format=%an <%ae>'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding, // note: library api requires this term
        });

        // the sponsor answers for the change; the clone wrote it. two
        // parties, two slots — a sponsor that displaced the author would
        // erase who did the work
        expect(author.stdout).toContain('seaturtle');
        expect(author.stdout).not.toContain('Ada Lovelace');
      });
    });
  });

  given('[case48] the sponsor state file carries a CONTROL character', () => {
    /**
     * .what = a hand-edited state file whose `.name` or `.email` holds a raw
     *         newline. the reader must refuse it as damage.
     *
     * .why = the trailer is built by interpolation:
     *          FULL_MESSAGE="$MESSAGE\n\nCo-authored-by: $NAME <$EMAIL>"
     *        so ONE field with a newline in it becomes TWO lines in the commit
     *        message. the second line is attacker-chosen and trailer-shaped —
     *        a whole extra `Co-authored-by:` that github credits on its own, or
     *        a `BREAKING CHANGE:` / `Fixes #N` that downstream tooling parses.
     *
     * .why = the design ACCEPTS that a clone with repo-write can hand-edit the
     *        file to name an arbitrary human, on the ground that the forgery is
     *        "one visible, disputable line". a newline breaks that premise
     *        structurally: one field becomes many lines, so the blast radius is
     *        message-injection rather than identity-forgery. ⇒ strictly larger
     *        than the risk the design reasoned about, so it is not covered by
     *        that acceptance.
     *
     * .why = neither prior gate caught it. `SPONSOR_EMAIL_PATTERN` is a
     *        DENY-list (`[^ @]`) and `[^ @]` matches `\n` in both engines; the
     *        name half is checked for `type == "string"` and non-empty only, on
     *        purpose ("a human name has no legal form to check"). a deny-list is
     *        exactly where this class hides.
     *
     * .why = the writer already strips `\n`/`\r` (`as_identity_trimmed`), so
     *        `sponsor set` can never PRODUCE this file. the reader was looser
     *        than its writer — the same asymmetry six rounds closed for
     *        json-type and email-shape, left open for control characters.
     */
    when('[t0] the NAME holds a newline that forms a second trailer', () => {
      const result = useThen('the commit is attempted', () =>
        runInTempGitRepo({
          files: { 'test.txt': 'content' },
          staged: true,
          meterState: { uses: 3, push: 'block' },
          // the `\\n` here is a JSON escape, so the file on disk holds a REAL
          // newline once jq parses it — which is the attack, not a test artifact
          sponsorRaw:
            '{ "sponsor": { "name": "Ada\\nCo-authored-by: Mal <mal@x.dev>", "email": "ada@example.com", "source": "supplied" } }',
          commitArgs: ['-m', '@stdin', '--mode', 'apply'],
          stdin: 'fix(x): y\n\n- z',
        }),
      );

      then('it is refused as a damaged file', () => {
        // a damaged file is a MALFUNCTION (exit 1), never the constraint
        // (exit 2) an unbound tree raises — same verdict as [case45]/[case46]
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('sponsor state file corrupt');
        expect(result.stderr).toContain('sponsor state file corrupt');
      });

      then('🔴 the injected trailer NEVER renders', () => {
        // the clamp with the teeth. under the un-fixed reader this value
        // passed every gate and the plan tree rendered the second trailer
        expect(result.stdout).not.toContain('mal@x.dev');
        expect(result.stdout).not.toContain('Co-authored-by: Mal');
        // .why ALSO pinned = the two `not.toContain`s prove the payload is
        //      absent from the spots i thought to name. the pin proves the
        //      whole render, so a leak into a spot neither check reaches —
        //      or a border/format regression on this branch alone — goes red
        //      rather than green (rule.require.contract-snapshot-exhaustiveness).
        expect(result.stdout).toMatchSnapshot();
      });

      then('no commit was written', () => {
        const log = spawnSync('git', ['log', '--oneline'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as BufferEncoding, // note: library api requires this term
        });
        expect(log.stdout).not.toContain('fix(x): y');
      });
    });

    when('[t1] the EMAIL holds a carriage return', () => {
      /**
       * 🔴 .why a `\r` rather than the `\n` the NAME row uses = MEASURED, and
       *        the measurement changed this row. a `\n` in the email is already
       *        refused with the control-character gate removed, so a `\n` row
       *        here would be a clamp with NO TEETH — it would read as coverage
       *        and guard not one thing (rule.require.clamp-edge-cases).
       *
       *        two mechanisms cover the email's `\n` by accident:
       *          1. `^…$` under jq's perl-syntax anchors refuses an EMBEDDED
       *             newline, since `$` holds at end-of-string or before a
       *             FINAL newline only — never at end-of-line
       *          2. `$(…)` command substitution strips a TRAILING newline
       *             before the value is ever read
       *
       * ⇒ 🔴 a `\r` defeats BOTH. `[^ @]` admits it, `$` is unmoved by it, and
       *        `$(…)` strips newlines alone — so the value reaches the trailer
       *        intact, and a terminal render returns the cursor to column 0 and
       *        overwrites the line that carries it.
       *
       * ⇒ this is why the guard names the CLASS `[[:cntrl:]]` rather than the
       *        two characters the review named: the email's live exposure was
       *        never the character in the report.
       */
      const result = useThen('the commit is attempted', () =>
        runInTempGitRepo({
          files: { 'test.txt': 'content' },
          staged: true,
          meterState: { uses: 3, push: 'block' },
          sponsorRaw:
            '{ "sponsor": { "name": "Ada Lovelace", "email": "ada@example.com\\rOVERWRITE", "source": "supplied" } }',
          commitArgs: ['-m', '@stdin', '--mode', 'apply'],
          stdin: 'fix(x): y\n\n- z',
        }),
      );

      then('it is refused as a damaged file', () => {
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('sponsor state file corrupt');
      });

      then('🔴 the payload NEVER reaches a render', () => {
        expect(result.stdout).not.toContain('OVERWRITE');
        // .why ALSO pinned = same reason as the `[t0]` row above. and the CR
        //      is the sharper case: a stray `\r` that survived would be
        //      INVISIBLE to a reader of the terminal (it returns the cursor
        //      to column 0), so a partial-text assert is the weakest possible
        //      guard here and the pin is the strongest.
        expect(result.stdout.includes('\r')).toBe(false);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case49] a refusal PRINTS a command, and the command WORKS', () => {
    /**
     * .what = walk each refusal's own remedy end to end: refuse → run exactly
     *         what the refusal printed → commit → succeed.
     *
     * .why = `.dream/v2026_09_12.fix.a-refusal-that-names-a-command-is-an-
     *        untested-promise.md` states the obligation: an error that names a
     *        command is a coverage obligation. every other case asserts the
     *        refusal's TEXT — that `--who @stdin` appears — and not one runs it.
     *        ⇒ the suite proves a string is printed, never that it works.
     *
     * .why = the wish names *"a refusal with no copy-paste command to fix it"*
     *        as a failure. a command that IS printed and does NOT work is one
     *        step worse: the human runs it, fails, and doubts the feature rather
     *        than their tree. ⇒ the promise is the deliverable, not the text.
     *
     * .why = this is also the ONE shape that catches a drift between the render
     *        and the parser. a flag renamed on the skill with the refusal text
     *        left behind ships green across all ~40 other sponsor cases, since
     *        each asserts one side alone.
     *
     * .note = `[case47]` chains bind→commit and is the closest neighbour. it
     *         starts from a HUMAN who already knows the command; these start
     *         from the REFUSAL, and take the command from what it printed.
     */
    const sponsorPath = path.join(__dirname, 'git.commit.sponsor.sh');

    // 🔴 .why = every follow-up spawn MUST inherit the harness's isolated HOME.
    //        the global commit blocker lives under `$HOME/.rhachet/storage/…`,
    //        so a spawn on the real HOME reads the DEVELOPER's blocker and
    //        refuses with `commits blocked globally` — a refusal about the host,
    //        read as a refusal about the tree (rule.require.hermetic-tests).
    //
    // .note = this walk cost a run to learn that, which is itself the argument
    //         for it: the same leak would make this suite pass on a machine with
    //         no blocker set and fail on one that has it.
    const envFor = (home: string) => ({
      ...process.env,
      HOME: home,
      __I_AM_HUMAN: 'true',
    });

    when('[t0] the no-sponsor refusal → its LITERAL bind form → commit', () => {
      const walked = useThen('the whole walk runs', () => {
        // step 1 — the refusal
        const refused = runInTempGitRepo({
          files: { 'test.txt': 'content' },
          staged: true,
          meterState: { uses: 3, push: 'block' },
          sponsor: null,
          commitArgs: ['-m', '@stdin', '--mode', 'apply'],
          stdin: 'fix(x): y\n\n- z',
        });

        // step 2 — run the form the refusal printed, with a real identity in
        // the slot it shows. 🔴 the LITERAL form on purpose: `F10` already found
        // it undiscoverable once, and `[case47]` walks the piped form alone
        const bound = spawnSync(
          'bash',
          [sponsorPath, 'set', '--who', 'Ada Lovelace <ada@example.com>'],
          {
            cwd: refused.tempDir,
            encoding: 'utf-8' as BufferEncoding, // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            env: envFor(refused.isolatedHome),
          },
        );

        // step 3 — the same commit, same tree, no other change
        const after = spawnSync(
          'bash',
          [scriptPath, '-m', '@stdin', '--mode', 'apply'],
          {
            cwd: refused.tempDir,
            encoding: 'utf-8' as BufferEncoding, // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            input: 'fix(x): y\n\n- z',
            env: envFor(refused.isolatedHome),
          },
        );

        const trailer = spawnSync('git', ['log', '-1', '--format=%B'], {
          cwd: refused.tempDir,
          encoding: 'utf-8' as BufferEncoding, // note: library api requires this term
        });

        return { refused, bound, after, trailer };
      });

      then('the refusal names the literal form', () => {
        expect(walked.refused.exitCode).toBe(2);
        expect(walked.refused.stdout).toContain('--who "Name <email>"');
      });

      then('🔴 the printed command SUCCEEDS', () => {
        // the clamp. a renamed flag, a changed value grammar, or a stale
        // refusal text all land here and nowhere else
        expect(walked.bound.status).toBe(0);
      });

      then('🔴 and the commit then goes through, human named', () => {
        expect(walked.after.status).toBe(0);
        expect(walked.trailer.stdout).toContain(
          'Co-authored-by: Ada Lovelace <ada@example.com>',
        );
      });
    });

    when(
      '[t1] the corrupt-sponsor refusal → its `del`, then bind → commit',
      () => {
        const walked = useThen('the whole walk runs', () => {
          // step 1 — the refusal, against a file that cannot be parsed
          const refused = runInTempGitRepo({
            files: { 'test.txt': 'content' },
            staged: true,
            meterState: { uses: 3, push: 'block' },
            sponsorRaw: '{ "sponsor": { "name": "Ada',
            commitArgs: ['-m', '@stdin', '--mode', 'apply'],
            stdin: 'fix(x): y\n\n- z',
          });

          // step 2 — the remedy it prints puts `del` FIRST, never a re-bind.
          // that sequence is the whole point of the corrupt branch, so the
          // walk keeps it
          const cleared = spawnSync('bash', [sponsorPath, 'del'], {
            cwd: refused.tempDir,
            encoding: 'utf-8' as BufferEncoding, // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            env: envFor(refused.isolatedHome),
          });

          // 🔴 .why captured HERE, never in a `then` = the walk runs to
          //        completion before any assertion does, and step 3 RE-CREATES
          //        this file. a `fs.existsSync` in a `then` therefore reads the
          //        state after the bind and reports `del` as a no-op — which it
          //        is not. ⇒ a mid-walk observation must be taken mid-walk.
          const clearedTheFile = !fs.existsSync(
            path.join(refused.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
          );

          // step 3 — then the piped bind form, the other command it printed
          const bound = spawnSync(
            'bash',
            [sponsorPath, 'set', '--who', '@stdin'],
            {
              cwd: refused.tempDir,
              encoding: 'utf-8' as BufferEncoding, // note: library api requires this term
              stdio: ['pipe', 'pipe', 'pipe'],
              input: 'Ada Lovelace <ada@example.com>',
              env: envFor(refused.isolatedHome),
            },
          );

          const after = spawnSync(
            'bash',
            [scriptPath, '-m', '@stdin', '--mode', 'apply'],
            {
              cwd: refused.tempDir,
              encoding: 'utf-8' as BufferEncoding, // note: library api requires this term
              stdio: ['pipe', 'pipe', 'pipe'],
              input: 'fix(x): y\n\n- z',
              env: envFor(refused.isolatedHome),
            },
          );

          return { refused, cleared, clearedTheFile, bound, after };
        });

        then('the refusal names `del` and the bind forms', () => {
          expect(walked.refused.exitCode).toBe(1);
          expect(walked.refused.stdout).toContain('git.commit.sponsor del');
          expect(walked.refused.stdout).toContain('--who @stdin');
        });

        then('🔴 `del` SUCCEEDS against a file it cannot parse', () => {
          // .why = the sharpest row. `del` is told to remove state the reader
          //        refuses to read — so an implementation that read the file
          //        before it removed it would refuse the very remedy it
          //        printed, and strand the human in a loop
          expect(walked.cleared.status).toBe(0);
          expect(walked.clearedTheFile).toBe(true);
        });

        then('🔴 the bind then succeeds, and the commit goes through', () => {
          expect(walked.bound.status).toBe(0);
          expect(walked.after.status).toBe(0);
        });
      },
    );
  });

  given('[case50] the GLOBAL blocker file is damaged', () => {
    /**
     * .what = the gate that pauses ALL commits in ALL repos, against a file
     *         that is present and unreadable. it must fail CLOSED.
     *
     * .why = `check_global_blocker` was the one permission gate this change
     *        never hardened, and it failed OPEN on the two damaged shapes the
     *        same change taught every other reader in the family to refuse:
     *          1. a DIRECTORY at the path — `[[ ! -f ]]` is a regular-file
     *             test, so it read as "no blocker set" ⇒ permissive
     *          2. a 0-BYTE file — jq on empty input exits 0 with an empty
     *             capture, so `"" == "true"` was false ⇒ permissive
     *
     * 🔴 .why it is worse than the same defect elsewhere = this gate is a
     *        PERMISSION surface, and the one with the widest blast radius in
     *        the family. a sponsor reader that fails open names the wrong
     *        human; this one lets a paused fleet commit
     *        (rule.require.safe-by-default).
     *
     * ⚠️ .note = the note at `read_org_meter_key` CLAIMED it mirrored this gate,
     *         *"which already treats an unparseable file as blocked"*. that was
     *         false for the empty-input case ⇒ a comment that vouched for a
     *         guarantee its neighbour did not give, which is exactly why the
     *         claim is now a test rather than a sentence.
     */
    const globalMeterPath = (home: string) =>
      path.join(
        home,
        '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        'git.commit.uses.jsonc',
      );

    const commitAgainstGlobal = (write: (at: string) => void) => {
      // a first run to stand up the tree and its isolated HOME
      const scene = runInTempGitRepo({
        files: { 'test.txt': 'content' },
        staged: true,
        meterState: { uses: 3, push: 'block' },
        commitArgs: ['-m', '@stdin', '--mode', 'plan'],
        stdin: 'fix(x): y\n\n- z',
      });

      // then damage the global blocker and run the real commit
      write(globalMeterPath(scene.isolatedHome));

      return spawnSync(
        'bash',
        [scriptPath, '-m', '@stdin', '--mode', 'apply'],
        {
          cwd: scene.tempDir,
          encoding: 'utf-8' as BufferEncoding, // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          input: 'fix(x): y\n\n- z',
          env: { ...process.env, HOME: scene.isolatedHome },
        },
      );
    };

    when('[t0] the global blocker file is 0 bytes', () => {
      then('🔴 the commit is REFUSED — the gate fails closed', () => {
        const result = commitAgainstGlobal((at) => {
          fs.mkdirSync(path.dirname(at), { recursive: true });
          fs.writeFileSync(at, '');
        });

        // 🔴 the clamp. under the old gate this exited 0 and COMMITTED. this
        //    state is a malfunction (the file is damaged), not a constraint
        //    (bad caller input) — exit 1, per the family's own convention
        //    for a permission file that will not parse.
        expect(result.status).toBe(1);
        expect(result.stdout).toContain('global blocker file corrupt');

        // 🔴 .why stderr too = a permission denial that reaches stdout alone
        //        is one no aggregator, parent process, or ci hook can audit —
        //        they see the exit code beside an empty stream
        //        (rule.require.skill-output-streams).
        expect(result.stderr).toContain('global blocker file corrupt');

        // 🔴 .why the REMEDY is asserted = the fail-closed gate made this state
        //        reachable, and the line printed beside it is
        //        `uses allow --global` — the remedy for a blocker a HUMAN set,
        //        which cannot clear a file that will not parse. a refusal whose
        //        fix does not fix is the defect, never the exit code
        //        (rule.require.errors-name-the-fix).
        expect(result.stdout).toContain(
          'the global blocker file cannot be read',
        );
      });
    });

    when('[t1] a DIRECTORY sits at the global blocker path', () => {
      then('🔴 the commit is REFUSED — damage is not absence', () => {
        const result = commitAgainstGlobal((at) => {
          fs.mkdirSync(at, { recursive: true });
        });

        // 🔴 the clamp. `[[ ! -f ]]` read this as "no blocker set" ⇒ permissive.
        //    exit 1 — a damaged file is a malfunction, not a constraint.
        expect(result.status).toBe(1);
        expect(result.stdout).toContain('global blocker file corrupt');
        expect(result.stderr).toContain('global blocker file corrupt');

        // 🔴 .why THIS row carries the remedy hardest = the note used to print
        //        `git.commit.uses allow --global`, which runs `rm -f` and
        //        cannot remove a DIRECTORY. so on this exact shape the printed
        //        fix handed the human a second refusal.
        expect(result.stdout).toContain(
          'the global blocker file cannot be read',
        );

        // 🔴 the clamp for that. `rm -r` is the one command that holds for
        //    every shape this gate classifies, and it is the same command its
        //    org twin prints for the identical job
        expect(result.stdout).toContain('rm -r');
        expect(result.stdout).not.toContain('allow --global');
      });
    });

    when('[t2] the global blocker file is well-formed and permissive', () => {
      then('🔴 the commit still goes through — the gate is not blanket', () => {
        // the counter-clamp. a gate that refused every present file would pass
        // both rows above and pause every commit in the fleet
        const result = commitAgainstGlobal((at) => {
          fs.mkdirSync(path.dirname(at), { recursive: true });
          fs.writeFileSync(at, JSON.stringify({ blocked: false }));
        });

        expect(result.status).toBe(0);
        expect(result.stdout).not.toContain('global blocker file corrupt');

        // 🔴 the counter-clamp for the STREAM half, distinct from the one for
        //    the GATE half above it. a refusal block that emitted on every
        //    path — never only on the failure — would satisfy the two stderr
        //    assertions above while it proved naught about the gate.
        expect(result.stderr).not.toContain('global blocker file corrupt');
        expect(result.stdout).not.toContain(
          'the global blocker file cannot be read',
        );
      });
    });
  });

  given(
    '[case51] the ORG meter is damaged, and a clone tries to commit',
    () => {
      /**
       * 🔴 .what = the org twin of [case50], on the surface a human actually
       *         meets. the fail-closed change made `org meter file corrupt`
       *         newly reachable on the COMMIT gate, and that render had no
       *         snapshot — only the uses-suite copies were pinned.
       *
       * 🔴 .why the remedy is the point = the note printed here named `rm`, and
       *        the corrupt state it renders is classified to INCLUDE a directory
       *        at the path (the `-e` versus `-f` split in `check_org_blocker`).
       *        a bare `rm` cannot remove a directory ⇒ **the printed fix dies on
       *        one of the very shapes that produced the refusal.**
       *
       * ⚠️ .why it survived = the peer guard in `git.commit.uses.org.sh` already
       *         printed `rm -r` for the identical damage. two remedies for one
       *         state, and the WRONG one sat on the common path — a refused
       *         commit — while the right one sat on the surface a human reaches
       *         second (rule.require.errors-name-the-fix).
       */
      const orgMeterPath = (home: string) =>
        path.join(
          home,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
          'git.commit.uses.org.jsonc',
        );

      const commitAgainstOrg = (write: (at: string) => void) => {
        // a first run to stand up the tree and its isolated HOME
        const scene = runInTempGitRepo({
          files: { 'test.txt': 'content' },
          staged: true,
          meterState: { uses: 3, push: 'block' },
          commitArgs: ['-m', '@stdin', '--mode', 'plan'],
          stdin: 'fix(x): y\n\n- z',
        });

        // then damage the org meter and run the real commit
        write(orgMeterPath(scene.isolatedHome));

        return spawnSync(
          'bash',
          [scriptPath, '-m', '@stdin', '--mode', 'apply'],
          {
            cwd: scene.tempDir,
            encoding: 'utf-8' as BufferEncoding, // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            input: 'fix(x): y\n\n- z',
            env: { ...process.env, HOME: scene.isolatedHome },
          },
        );
      };

      when('[t0] the org meter will not parse', () => {
        then('🔴 the commit is REFUSED, and the whole render is pinned', () => {
          const result = commitAgainstOrg((at) => {
            fs.mkdirSync(path.dirname(at), { recursive: true });
            fs.writeFileSync(at, '{ "orgs": { "ehmpathy": "allo');
          });

          // malfunction — the file is damaged, not the caller's input
          expect(result.status).toBe(1);
          expect(result.stdout).toContain('org meter file corrupt');
          expect(result.stderr).toContain('org meter file corrupt');

          // the two remedies are EXCLUSIVE — `allow --org` writes a key into a
          // file that cannot be parsed, so it must NOT print beside this state
          expect(result.stdout).toContain('the org meter file cannot be read');
          expect(result.stdout).not.toContain('ask your human to allow');

          // 🔴 the resnap-proof half. a blind resnap would absorb a reflow; these
          //    two survive it, and the second is the defect this case was
          //    written for
          expect(result.stdout).toContain('rm -r');

          // 🔴 the whole render, so a dropped `cat` line or a reworded lead
          //    cannot ship green (rule.require.snapshots)
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t1] a DIRECTORY sits at the org meter path', () => {
        then('🔴 the printed remedy can actually clear THIS shape', () => {
          // 🔴 .why this row carries the remedy hardest = a directory is the one
          //    corrupt shape a bare `rm` cannot remove. under the old note the
          //    human was told to run a command that dies on the exact damage it
          //    was printed for.
          const result = commitAgainstOrg((at) => {
            // .why the rm first = the scene's own first run stands up a healthy
            //      org meter at this path, so the mkdir would hit EEXIST
            fs.rmSync(at, { force: true });
            fs.mkdirSync(at, { recursive: true });
          });

          // malfunction — the file is damaged, not the caller's input
          expect(result.status).toBe(1);
          expect(result.stdout).toContain('org meter file corrupt');
          expect(result.stdout).toContain('rm -r');
        });
      });

      when('[t2] the org meter is well-formed and allows this org', () => {
        then(
          '🔴 the commit still goes through — the gate is not blanket',
          () => {
            // the counter-clamp. a gate that refused every present org meter would
            // pass both rows above while it paused every commit in the fleet
            const result = commitAgainstOrg((at) => {
              fs.mkdirSync(path.dirname(at), { recursive: true });
              fs.writeFileSync(
                at,
                JSON.stringify({ orgs: { '@all': 'allowed' } }),
              );
            });

            expect(result.status).toBe(0);
            expect(result.stdout).not.toContain('org meter file corrupt');
            expect(result.stderr).not.toContain('org meter file corrupt');
          },
        );
      });
    },
  );

  given(
    '[case44] the grove axis is inert — the commit tree is byte-identical on a cloud tree and a laptop',
    () => {
      // 🎯 .why = this is `1.vision.experience.case=2 [t3]`, the wish's own
      //        stated proof: *"the output is byte-identical — source: bound
      //        (this tree), same human"* … *"the grove axis is inert. that
      //        equality IS the fix"*.
      //
      // 🔴 .what the two groves actually differ on = HOW the bind happened.
      //        a cloud tree has no github session to read, so a human pipes the
      //        name in (`--who @stdin`) and the state records `supplied`. on a
      //        laptop the human runs `--who @me` and it records `me`.
      //
      // ⇒ so `source` in the STATE file genuinely varies by grove. the claim
      //        under test is that the commit TREE does not — it reports where
      //        the value came from (`bound (this tree)`), never how it was
      //        typed, so the two renders match byte for byte.
      //
      // ⚠️ .why it is a real clamp = it goes red the moment the tree renders
      //        `$SPONSOR_SOURCE` instead of the constant — which is exactly the
      //        change a reader of `git.commit.sponsor get` would reach for,
      //        since that skill's own `source:` leaf DOES print `me`/`supplied`.
      const renderOnGrove = (source: 'me' | 'supplied') =>
        runInTempGitRepo({
          files: { 'fix.txt': 'fixed content' },
          meterState: { uses: 3, push: 'block' },
          sponsor: { name: 'Test Human', email: 'human@test.com', source },
          commitArgs: ['--message', 'fix(api): validate input\n\n- detail'],
        });

      when('[t0] the same commit is planned on each grove', () => {
        // .why = both `then`s below need the 'me' grove's render; a re-run per
        //        `then` would pay a full git-init + commit twice for the SAME
        //        output (rule.forbid.redundant-expensive-operations). the
        //        'supplied' grove is read only once, so it stays inline.
        //
        // .note = `useThen` wraps the FULL result object here, never a bare
        //         string — a primitive return proxies into a character-indexed
        //         object rather than the string itself.
        const laptop = useThen('the laptop grove renders', () =>
          renderOnGrove('me'),
        );

        then('the two trees are byte-identical', () => {
          const onCloudTree = renderOnGrove('supplied').stdout;

          // the teeth: the two groves' state files differ on `source`, so an
          // equality here is a claim about the RENDER, not about the input
          expect(laptop.stdout).toBe(onCloudTree);
        });

        then('both name the human, and state the value was bound', () => {
          const onLaptop = laptop.stdout;
          expect(onLaptop).toContain('name: Test Human');
          expect(onLaptop).toContain('email: human@test.com');
          expect(onLaptop).toContain('source: bound (this tree)');

          // ⛔ and NEITHER grove-specific word may reach the commit tree —
          //    the moment one does, `[t0]` above is the test that goes red
          expect(onLaptop).not.toContain('source: me');
          expect(onLaptop).not.toContain('source: supplied');
        });
      });
    },
  );
});
