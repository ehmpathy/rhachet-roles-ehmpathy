import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';
import {
  SPONSOR_STATE_FILENAME,
  seedTestSponsor,
} from '@src/.test/seedTestSponsor';
import { getPtyModulePath, spawnInPty } from '@src/.test/spawnInPty';

/**
 * .what = integration tests for git.commit.sponsor.sh
 * .why = the sponsor is the only mechanism that names a human on a commit, so
 *        every guard around it must be proven rather than assumed
 */
describe('git.commit.sponsor.sh', () => {
  const scriptPath = path.join(__dirname, 'git.commit.sponsor.sh');

  /**
   * .note = spawnSync pipes all three stdio streams, so NO stream is a tty.
   *         that is precisely the clone's situation, so `asHuman: false` is
   *         how we exercise the actor guard, and `asHuman: true` (the
   *         __I_AM_HUMAN escape) is how we exercise each guard behind it.
   */
  const runInTempGitRepo = (args: {
    sponsorArgs: string[];
    asHuman?: boolean;
    stdin?: string;
    seedSponsor?: { name: string; email: string };
    gitConfig?: { name: string | null; email: string | null };
    // extra env for the subprocess (e.g. a PATH with a gh trap first on it)
    env?: Record<string, string>;
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'git-commit-sponsor-test', git: true });

    // .why = the same helper the ~20 git.commit.set call sites use. an inline
    //        write here would be a SECOND mechanism for one state file, and a
    //        change to the state shape would then need two edits — with only
    //        one of them caught by a failed test.
    if (args.seedSponsor)
      seedTestSponsor({ cwd: tempDir, ...args.seedSponsor });

    // .why = `@self` and `get` read this repo's git config. genTempDir seeds
    //        `test-fns <test-fns@test.local>`; a case that names its own
    //        identity overrides it here, and `null` unsets that half. global
    //        and system config are already `/dev/null` (jest.integration.env.ts),
    //        so the repo's own config is the whole identity.
    if (args.gitConfig)
      configureTestGitUser({ cwd: tempDir, ...args.gitConfig });

    const result = spawnSync('bash', [scriptPath, ...args.sponsorArgs], {
      cwd: tempDir,
      encoding: 'utf-8', // note: library api requires this term
      stdio: ['pipe', 'pipe', 'pipe'],
      input: args.stdin ?? '',
      env: {
        ...process.env,
        ...(args.asHuman === false ? {} : { __I_AM_HUMAN: 'true' }),
        ...(args.env ?? {}),
      },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

  const readState = (tempDir: string): string =>
    fs.readFileSync(
      path.join(tempDir, '.meter', 'git.commit.sponsor.jsonc'),
      'utf-8',
    );

  given('[case1] a fresh tree, the supervisor pipes the requester in', () => {
    when('[t0] set --who @stdin', () => {
      then('binds the sponsor', () => {
        const result = runInTempGitRepo({
          sponsorArgs: ['set', '--who', '@stdin'],
          stdin: 'Ada Lovelace <ada@example.com>',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('shell yeah, sponsor bound');
        expect(result.stdout).toContain('name: Ada Lovelace');
        expect(result.stdout).toContain('email: ada@example.com');
        expect(result.stdout).toMatchSnapshot();
      });

      then('the piped form survives a newline at the end', () => {
        const result = runInTempGitRepo({
          sponsorArgs: ['set', '--who', '@stdin'],
          stdin: 'Ada Lovelace <ada@example.com>\n',
        });

        expect(result.exitCode).toBe(0);
        // .why = toEqual, never toMatchObject: the state shape is asserted in
        //        FULL, so a field added or dropped goes red here rather than
        //        drift from the term declaration unnoticed.
        expect(JSON.parse(readState(result.tempDir)).sponsor).toEqual({
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          source: 'supplied',
        });
      });
    });

    when('[t1] set --who "Name <email>" — the literal', () => {
      const result = useThen('the bind succeeds', () =>
        runInTempGitRepo({
          sponsorArgs: ['set', '--who', 'Ada Lovelace <ada@example.com>'],
        }),
      );

      then('binds the same sponsor', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('shell yeah, sponsor bound');
        expect(JSON.parse(readState(result.tempDir)).sponsor.name).toBe(
          'Ada Lovelace',
        );
        // .why = the literal form's success tree is its own caller-visible
        //        render. it is byte-identical to the piped form's tree TODAY,
        //        which is the whole hazard: a leaf added on one path, or a
        //        reorder of one tree, would ship green under field asserts
        //        alone. the pin is what makes the two trees provably one.
        expect(result.stdout).toMatchSnapshot();
      });

      then('the source reads "supplied" — a value handed in', () => {
        // .why = provenance is part of the value (domain.terms/sponsor.md).
        //        a literal is handed in, exactly as a pipe is, so both read
        //        `supplied` — the enum splits on WHO ANSWERED, never on the
        //        keystrokes that carried it.
        expect(JSON.parse(readState(result.tempDir)).sponsor.source).toBe(
          'supplied',
        );
        expect(result.stdout).toContain('source: supplied');
      });
    });
  });

  given('[case2] the sponsor state is per-worktree and never committed', () => {
    when('[t0] a sponsor is bound', () => {
      // .why = one spawn (subprocess + git init), two facets observed —
      //        a re-run per `then` would pay the cost twice for the SAME
      //        bind (rule.forbid.redundant-expensive-operations).
      const result = useThen('the bind lands', () =>
        runInTempGitRepo({
          sponsorArgs: ['set', '--who', 'Ada Lovelace <ada@example.com>'],
        }),
      );

      then('the state lands FLAT in .meter, not nested', () => {
        // .why = the permission guard is `Write(.meter/*)`, and that glob does
        //        NOT cross a `/`. a "tidier" nested path would silently lose
        //        the guard (invariant 2).
        const flat = path.join(
          result.tempDir,
          '.meter',
          'git.commit.sponsor.jsonc',
        );
        expect(fs.existsSync(flat)).toBe(true);
      });

      then('the state dir self-bootstraps its own .gitignore', () => {
        // .why = the state holds a human's name and email — pii. the push
        //        skill already strips this exact value from pr bodies, so a
        //        design that committed it would publish what push guards.
        const ignore = path.join(result.tempDir, '.meter', '.gitignore');
        expect(fs.existsSync(ignore)).toBe(true);
        expect(fs.readFileSync(ignore, 'utf-8')).toContain('*');
      });
    });

    when('[t1] a SECOND worktree of the same clone', () => {
      /**
       * .what = bind in worktree A, then read from worktree B.
       *
       * .why = invariant 5 rests entirely on `git rev-parse --show-toplevel`
       *        rather than `--git-dir` / `--git-common-dir`. those two return
       *        the SHARED parent `.git`, so a swap would give every worktree of
       *        a clone one sponsor — a human named on work they never saw,
       *        which is the `F2` fabrication at smaller scale.
       *
       *        every other test in this file runs in a single temp repo, so
       *        none of them can tell the two primitives apart. this one can.
       */
      then(
        'sees NO sponsor — the bind is per-worktree, never per-clone',
        () => {
          const treeA = genTempDir({ slug: 'sponsor-worktree-a', git: true });
          const treeB = `${treeA}-wt`;

          const git = (cwd: string, argv: string[]) =>
            spawnSync('git', argv, {
              cwd,
              encoding: 'utf-8', // note: library api requires this term
            });

          // a worktree needs a HEAD to branch from
          fs.writeFileSync(path.join(treeA, 'base.txt'), 'base');
          git(treeA, ['add', '-A']);
          const committed = git(treeA, [
            '-c',
            'user.name=Test Clone',
            '-c',
            'user.email=clone@test.dev',
            'commit',
            '-m',
            'chore: base',
          ]);
          expect(committed.status).toBe(0);

          const added = git(treeA, [
            'worktree',
            'add',
            '-b',
            'sponsor-worktree-b',
            treeB,
          ]);
          expect(added.status).toBe(0);

          const runIn = (cwd: string, argv: string[]) =>
            spawnSync('bash', [scriptPath, ...argv], {
              cwd,
              encoding: 'utf-8', // note: library api requires this term
              stdio: ['pipe', 'pipe', 'pipe'],
              input: '',
              env: { ...process.env, __I_AM_HUMAN: 'true' },
            });

          // bind in A, and ONLY in A
          const bound = runIn(treeA, [
            'set',
            '--who',
            'Ada Lovelace <ada@example.com>',
          ]);
          expect(bound.status).toBe(0);
          expect(bound.stdout).toContain('name: Ada Lovelace');

          // B must not see it — neither through the skill nor on disk
          const readB = runIn(treeB, ['get']);
          expect(readB.stdout).toContain('sponsor: (none bound)');
          expect(readB.stdout).not.toContain('Ada Lovelace');
          expect(
            fs.existsSync(
              path.join(treeB, '.meter', 'git.commit.sponsor.jsonc'),
            ),
          ).toBe(false);

          // and A still reads its own, so this is isolation rather than a
          // bind that simply failed to land
          const readA = runIn(treeA, ['get']);
          expect(readA.stdout).toContain('name: Ada Lovelace');
        },
      );
    });
  });

  given('[case3] get — a read carries no actor guard', () => {
    when('[t0] a sponsor is bound', () => {
      then('reports the bound human', () => {
        const result = runInTempGitRepo({
          sponsorArgs: ['get'],
          seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('name: Ada Lovelace');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1a] no bind, and git config names a human', () => {
      // .mock = the gh cli, as a trap first on PATH that marks a file if run
      // .why  = the vision: gh is read on no sponsor path. an absence cannot be
      //         observed on a real gh — only a trap that records a call proves
      //         the call never happened
      // .real = all else is real: a real temp repo, real git config, the real
      //         skill. the sponsor path has no gh call left to exercise
      const fakeBin = genTempDir({ slug: 'sponsor-get-gh-trap', git: false });
      const ghMark = path.join(fakeBin, 'gh.was.called');
      fs.writeFileSync(
        path.join(fakeBin, 'gh'),
        `#!/usr/bin/env bash\ntouch "${ghMark}"\nexit 1\n`,
      );
      fs.chmodSync(path.join(fakeBin, 'gh'), '755');

      // one read, the trap on PATH, shared by both assertions below
      const result = useThen('the read runs', () =>
        runInTempGitRepo({
          sponsorArgs: ['get'],
          gitConfig: { name: 'Kai Nalu', email: 'kai@example.com' },
          env: { PATH: `${fakeBin}:${process.env.PATH}` },
        }),
      );

      then('🔴 no gh command ran', () => {
        expect(fs.existsSync(ghMark)).toBe(false);
      });

      then('reports the git config default commits will name', () => {
        // .why = with no bind, a commit takes the human from git config. a
        //        `get` that said only "(none)" would imply commits refuse,
        //        which is false on a human's machine (rule.forbid.surprises)
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('sponsor: (none bound)');
        expect(result.stdout).toContain('commits: use git config');
        expect(result.stdout).toContain('name: Kai Nalu');
        expect(result.stdout).toContain('email: kai@example.com');
        expect(result.stdout).not.toContain('commits will refuse');
        expect(result.stdout).not.toContain('@me');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when(
      "[t1] no bind, and git config names a clone — the clone's machine",
      () => {
        then(
          'reports (none bound), says commits will refuse, and names the fix',
          () => {
            const result = runInTempGitRepo({
              sponsorArgs: ['get'],
              gitConfig: {
                name: 'seaturtle[bot]',
                email: 'seaturtle@ehmpath.com',
              },
            });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('sponsor: (none bound)');
            expect(result.stdout).toContain(
              "git config: names a clone — the clone's machine",
            );
            expect(result.stdout).toContain('commits: will refuse');
            // .why = `get` carries no actor guard, so a HUMAN reads this line as
            //        often as a clone does. "ask your human to…" commands a human
            //        who is frequently the reader; this states who may bind, and
            //        fits both. the imperative stays correct in `git.commit.set`,
            //        which a clone runs and a human does not.
            expect(result.stdout).toContain(
              "a human binds this tree's sponsor",
            );
            expect(result.stdout).not.toContain('ask your human to bind one');

            // 🔴 .why the 🥥 is ASSERTED, not merely snapshotted = it is the one
            //        mark that separates this OPTIONAL next move from the
            //        MANDATORY remedies the refusals carry, and the two render
            //        near-identical command lists otherwise. a snapshot alone
            //        would let the mark vanish under a resnap nobody re-reads
            //        (rule.require.coconut-hints).
            expect(result.stdout).toContain('🥥 did you know?');

            // .why = the coconut opens with its own blank line, so an `echo ""`
            //        ahead of it at the call site would render a double gap. this
            //        pins the single-gap shape (forbid.snapshot-visual-blemishes).
            expect(result.stdout).not.toContain('\n\n\n');
            expect(result.stdout).toMatchSnapshot();
          },
        );
      },
    );

    when('[t2] the caller has NO tty — a clone', () => {
      then('the read is still permitted', () => {
        const result = runInTempGitRepo({
          sponsorArgs: ['get'],
          asHuman: false,
          seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
        });

        // .why = invariant 3. the clone must be able to explain its own state,
        //        and a read is not a mutation.
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('name: Ada Lovelace');
      });
    });
  });

  given('[case4] the ACTOR guard — a clone cannot bind or clear', () => {
    when('[t0] set with no tty on any stream', () => {
      // .why = one spawn, four assertions. each `then` below reads a
      //        different facet of the SAME refusal, so a re-run per `then`
      //        would pay a subprocess plus a git init to observe a result
      //        already in hand (rule.forbid.redundant-expensive-operations).
      const result = useThen('the bind refuses', () =>
        runInTempGitRepo({
          sponsorArgs: ['set', '--who', 'Ada Lovelace <ada@example.com>'],
          asHuman: false,
        }),
      );

      then('refuses, and names the channel as the cause', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('no terminal on this command');
        expect(result.stdout).toContain('run it from your own terminal');
        expect(result.stdout).toMatchSnapshot();
      });

      then('🔴 it speaks to a human at a claude `!` prompt too', () => {
        // 🔴 .why = a human's `!` command and a clone's tool call arrive with
        //        no terminal and identical claude env markers (measured), so
        //        they meet THIS render. the prior "only humans can run this
        //        command" told a human they were not one. the render must name
        //        the `!` channel, so that reader learns the fix.
        expect(result.stdout).toContain('a claude `!` command');
        expect(result.stdout).toContain('cannot be told apart');
      });

      then('writes no state', () => {
        // .why = a refused bind must leave the tree exactly as it found it
        expect(
          fs.existsSync(
            path.join(result.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
          ),
        ).toBe(false);
      });

      then('the refusal never prints @self or @me', () => {
        // .why = `@self` reads THIS machine's git config, which on the clone's
        //        machine names the clone — a mandatory block that printed it
        //        would hand the reader a second refusal. `@me` is a silent
        //        alias, never named on any render.
        expect(result.stdout).not.toContain('--who @self');
        expect(result.stdout).not.toContain('@me');
      });

      then('the failure lands on BOTH streams', () => {
        expect(result.stderr).toContain('no terminal on this command');
      });

      then('it shuts the "retry with a better name" loop', () => {
        // 🔴 .why = the reader here is a clone that reasons about its own
        //        rejection, so the refusal must say WHY a value that reads
        //        correct is still wrong. absent this, the lesson it draws is
        //        "the VALUE was rejected" and it retries with a real human's
        //        name — the fabrication case, whose record READS authorized
        //        and is therefore worse than an absent one.
        //
        // .why ASSERTED, not snapshot-only = a resnap nobody re-reads would
        //        drop the paragraph in silence, and every other assert in
        //        this block stays green without it.
        expect(result.stdout).toContain("even for a real human's name");
        expect(result.stdout).toContain('fabrication');
      });
    });

    when('[t1] del with no tty', () => {
      then('refuses too, and leaves the sponsor bound', () => {
        const result = runInTempGitRepo({
          sponsorArgs: ['del'],
          asHuman: false,
          seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
        });

        // .why = a permissive del is a permissive set plus one step
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('no terminal on this command');
        expect(JSON.parse(readState(result.tempDir)).sponsor.name).toBe(
          'Ada Lovelace',
        );

        // 🔴 .why the whole render is pinned = the `set` twin above pins its
        //        own, and the two are NOT byte-identical. this one carries the
        //        difference that matters: **the remedy must name `del`**.
        //
        // 🔴 .why = this arm once printed `set`'s two-line bind remedy, so a
        //        human who asked to CLEAR a sponsor was handed the command to
        //        BIND one — a refusal whose fix does the opposite of the act it
        //        refused (rule.require.errors-name-the-fix). the shared phrase
        //        `no terminal on this command` asserted above is true of
        //        both renders, so it could never have caught it.
        expect(result.stdout).toMatchSnapshot();
        expect(result.stdout).toContain('rhx git.commit.sponsor del');
        expect(result.stdout).not.toContain('--who');

        // 🔴 .why the fabrication paragraph is ABSENT here = it answers
        //        "why is a better name still wrong?", and a refused `del`
        //        offered no name at all. to print it would hand this reader
        //        a rebuttal to an argument it never made.
        //
        //        ⇒ this is the clamp on the ARM SPLIT. drop the `!= "del"`
        //        branch in `refuse_actor` and only this assert goes red —
        //        the `set` twin above stays green either way.
        expect(result.stdout).not.toContain("even for a real human's name");
      });
    });
  });

  given('[case14] the ACTOR guard, under a REAL pseudo-terminal', () => {
    /**
     * 🔴 .why = `[case4]` above proves the guard REFUSES a clone. it cannot
     *        prove the guard ACCEPTS a human, because `spawnSync` pipes every
     *        stream — so the whole suite reaches the accept branch only via the
     *        `__I_AM_HUMAN` escape, which proves the escape works.
     *
     *        ⇒ these two are the first tests in the repo to exercise
     *        `isatty()` for real, and they grade the one invariant the whole
     *        wish rests on: "only a human mutates the sponsor."
     *
     * .note = `__I_AM_HUMAN: ''` is how each case below DISABLES the escape —
     *         the guard reads `== "true"`, so an empty value is inert. every
     *         accept below is therefore earned by the tty alone.
     */
    when('[t0] a human at a terminal binds, with the escape DISABLED', () => {
      const scene = useThen('the bind lands', async () => {
        const tempDir = genTempDir({ slug: 'sponsor-pty-accept', git: true });
        const result = await spawnInPty({
          command: 'bash',
          args: [scriptPath, 'set', '--who', 'Ada Lovelace <ada@example.com>'],
          cwd: tempDir,
          env: { __I_AM_HUMAN: '' },
        });
        return { ...result, tempDir };
      });

      then('🔴 the guard ACCEPTS a real tty — exit 0, no escape hatch', () => {
        expect(scene.timedOut).toBe(false);
        expect(scene.exitCode).toBe(0);
        expect(scene.output).toContain('shell yeah, sponsor bound');

        // .why = the pty stream is its OWN caller-visible render — a merged
        //        stdout+stderr surface no piped test ever observes. a
        //        `toContain` proves one line and would let a pty-specific
        //        artifact (a prompt echo, a doubled header, a stray byte)
        //        through green. the two volatile classes a pty adds are
        //        MASKED, never carved out, per
        //        rule.require.contract-snapshot-exhaustiveness:
        //          1. CR — a pty terminates lines `\r\n`, a pipe `\n`
        //          2. the temp dir — a fresh path per run
        const masked = scene.output
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '')
          .split(scene.tempDir)
          .join('<TEMP DIR>');
        expect(masked).toMatchSnapshot();
      });

      then('the sponsor is on disk, named', () => {
        expect(JSON.parse(readState(scene.tempDir)).sponsor.name).toBe(
          'Ada Lovelace',
        );
      });

      then('it never took the refusal branch', () => {
        // .why = an accept that ALSO printed the refusal would mean the guard
        //        ran twice with two verdicts. one spawn, one verdict.
        expect(scene.output).not.toContain('no terminal on this command');
      });
    });

    when('[t1] --who @stdin at a terminal, with no pipe', () => {
      const result = useThen('it comes back at all', async () => {
        const tempDir = genTempDir({ slug: 'sponsor-pty-nopipe', git: true });
        return await spawnInPty({
          command: 'bash',
          args: [scriptPath, 'set', '--who', '@stdin'],
          cwd: tempDir,
          env: { __I_AM_HUMAN: '' },
          timeoutMs: 8_000,
        });
      });

      then('🔴 it REFUSES rather than hangs', () => {
        // .why = a hang is the one outcome worse than an error, because it
        //        reports naught at all. `sponsor.sh`'s `[[ -t 0 ]]` branch is
        //        the only guard between a human and a terminal that sits dark.
        //        ⚠️ the assert is on `timedOut`, never on elapsed time
        //        (`rule.forbid.time-assumptions`).
        expect(result.timedOut).toBe(false);
        expect(result.exitCode).toBe(2);
      });

      then('the refusal names the fix', () => {
        expect(result.output).toContain('expects a pipe');
      });
    });

    when('[t2] the harness itself', () => {
      then('🔴 loads node-pty from INSIDE this repo, never an ancestor', () => {
        // .why = node resolution walks UP past the repo root. a copy in an ancestor
        //        would satisfy the require on a laptop and be absent in ci —
        //        a green suite that proves the guards on no host but one.
        //        ⇒ this tells "it loads" apart from "it loads from a
        //        dependency this repo declares", and the two DIFFERED here
        //        until node-pty was declared directly.
        const repoRoot = path.join(__dirname, '../../../../..');
        expect(getPtyModulePath()).toContain(repoRoot);
      });
    });
  });

  given(
    '[case5] the identity BACKSTOP refuses a party that cannot answer',
    () => {
      const stem =
        '✋ ConstraintError: that identity cannot answer for a change';

      when('[t0] the value names a github app', () => {
        then('refuses as a robot', () => {
          const result = runInTempGitRepo({
            sponsorArgs: [
              'set',
              '--who',
              'rhelease[bot] <249629030+rhelease[bot]@users.noreply.github.com>',
            ],
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(stem);
          expect(result.stdout).toContain('...and it is a robot.');
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t1] the value names this repo own clone identity', () => {
        then('refuses as a robot', () => {
          const result = runInTempGitRepo({
            sponsorArgs: [
              'set',
              '--who',
              'seaturtle[bot] <seaturtle@ehmpath.com>',
            ],
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(stem);
          expect(result.stdout).toContain('...and it is a robot.');
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t2] the value names a placeholder', () => {
        const result = useThen('the bind refuses', () =>
          runInTempGitRepo({
            sponsorArgs: ['set', '--who', 'Test User <test@example.com>'],
          }),
        );

        then('refuses as a placeholder, on the SAME stem', () => {
          expect(result.exitCode).toBe(2);
          // .why = one guard speaks ONCE. the stem states the CLASS the guard
          //        checks; only the detail line states the instance.
          expect(result.stdout).toContain(stem);
          expect(result.stdout).toContain('...and it is a placeholder.');
          expect(result.stdout).toMatchSnapshot();
        });

        then('it lists the value forms that remain, and never @me', () => {
          // .why = an assertion ABOUT this refusal, so it reads the same
          //        result rather than a second spawn of it. the general
          //        claim is carried across the suite — [case4][t0] and
          //        [case9][t0] assert it on their own refusals.
          expect(result.stdout).toContain('--who @stdin');
          expect(result.stdout).toContain('--who "Name <email>"');
          expect(result.stdout).not.toContain('--who @me');
        });
      });

      when("[t3] the value names the clone's own github ACCOUNT", () => {
        then('refuses as a robot — the account is on the roster', () => {
          const result = runInTempGitRepo({
            sponsorArgs: [
              'set',
              '--who',
              "Seaturtle of'Ehmpathy <259600029+ehm-seaturtle@users.noreply.github.com>",
            ],
          });

          // 🔴 .why = this test once asserted the OPPOSITE — that the bind
          //        succeeds — on the argument that no identity ATTRIBUTE
          //        separates a clone from a human. that argument is sound
          //        and it answered the wrong question. Q10 refuted three
          //        ATTRIBUTE predicates (the email domain, the derived
          //        address shape, and `.type`, which reads "User" for this
          //        account); it never asked whether this specific account
          //        belonged on the roster the guard ALREADY keeps.
          //
          // .why = it does. the guard names two clone identities declared in
          //        keyrack.operations.sh, and this is the third — the account
          //        the clone works as on its own machine. an identity MATCH
          //        needs no attribute to work, which is the whole reason it
          //        survives Q10's refutations.
          //
          // .why = a bind of this account would put the clone in its own
          //        Co-authored-by trailer — the defect (#645). the same roster
          //        is what marks the clone's machine when it sits in git
          //        config ([case9][t5]).
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(stem);
          expect(result.stdout).toContain('...and it is a robot.');
          // rule.require.skill-output-streams — a failure rides both streams
          expect(result.stderr).toContain('...and it is a robot.');
          // 🔴 .why = the snapshot on the feature's LINCHPIN refusal. the
          //        `toContain` asserts above pin two lines; the bytes around
          //        them — the value echoed back, the cloud-grove note, the
          //        remedy list — are what a human actually reads, and a
          //        dropped line there ships green without this.
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t4] the roster EMAIL half, isolated from the name half', () => {
        /**
         * 🔴 .why = the backstop asks two questions of one roster — is this
         *        NAME ours, is this EMAIL ours — and for a while only the
         *        name half went through `keyrack.operations.sh`'s predicate
         *        while the email half compared against its constants inline.
         *        a third identity added there would have been caught by name
         *        and MISSED by email.
         *
         * 🔴 .note = MEASURED, and it is why this case has ONE row rather than
         *        four. three of the four roster constants carry `[bot]` in
         *        their own text — `seaturtle[bot]`, `ehm-a-seaturtle[bot]`,
         *        and the app bot's address, which embeds its login. so the
         *        `[bot]` MARKER check, which runs first, SHADOWS them: a row
         *        built from any of the three refuses whether the roster
         *        predicate fires or not, and grades naught.
         *
         *        ⇒ `seaturtle@ehmpath.com` is the ONE roster value with no
         *        `[bot]` in it, so it is the only value that can reach the
         *        email predicate and prove it live. paired with a plainly
         *        human name, so the name half cannot answer for it either.
         *
         * ⚠️ .note = the shadowing also means `is_one_seaturtle_identity_name`
         *        adds no refusal TODAY — both its names carry the marker. it
         *        earns its keep on the first roster entry that does not, which
         *        is exactly the drift this symmetry exists to survive.
         */
        then('🔴 refuses on the EMAIL alone, via the shared predicate', () => {
          const result = runInTempGitRepo({
            sponsorArgs: [
              'set',
              '--who',
              'Ada Lovelace <seaturtle@ehmpath.com>',
            ],
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(stem);
          expect(result.stdout).toContain('...and it is a robot.');
        });
      });
    },
  );

  given('[case6] del clears the sponsor', () => {
    when('[t0] a sponsor was bound', () => {
      then('removes the state file', () => {
        const result = runInTempGitRepo({
          sponsorArgs: ['del'],
          seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('groovy, sponsor cleared');
        expect(
          fs.existsSync(
            path.join(result.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
          ),
        ).toBe(false);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] no sponsor was bound', () => {
      then('succeeds as a no-op', () => {
        const result = runInTempGitRepo({ sponsorArgs: ['del'] });

        expect(result.exitCode).toBe(0);
        // the same words `get` uses for the same state — no bind exists
        expect(result.stdout).toContain('sponsor: (none bound)');
        // .why = a `toContain` pins ONE phrase; the render a human reads is a
        //        whole tree, and a dropped or reworded line around that phrase
        //        ships green. the snapshot is what a reviewer eyeballs in the
        //        pr diff (rule.forbid.friction-hazards).
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] a DIRECTORY sits at the state path', () => {
      then('🔴 clears the damaged entry, never reports it clear', () => {
        // 🔴 .why = `read_sponsor_state` classifies a directory here as DAMAGE
        //        (status 1) and its curated refusal names `del` as the one
        //        remedy. `del` gated on `-f` — a REGULAR-file test — so it
        //        answered that remedy with "already clear", removed no entry,
        //        and exited 0.
        //
        // ⇒ the human runs the repair they were just handed, it no-ops, and
        //        the `set` that follows dies at `mv` on a directory. damage
        //        reported as absence, on the REMEDY path itself.
        //
        // ⇒ the teeth are TWO asserts that the old code passes separately and
        //        cannot pass together: the entry must be gone, AND the
        //        "already clear" render must not appear.
        const scene = runInTempGitRepo({ sponsorArgs: ['get'] });
        const statePath = path.join(
          scene.tempDir,
          '.meter',
          SPONSOR_STATE_FILENAME,
        );
        fs.rmSync(statePath, { force: true });
        fs.mkdirSync(statePath, { recursive: true });
        fs.writeFileSync(path.join(statePath, 'stray.txt'), 'x');

        const after = spawnSync('bash', [scriptPath, 'del'], {
          cwd: scene.tempDir,
          encoding: 'utf-8', // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, __I_AM_HUMAN: 'true' },
        });

        expect(after.status).toBe(0);
        expect(after.stdout).toContain('groovy, sponsor cleared');
        expect(after.stdout).not.toContain('already clear');
        expect(fs.existsSync(statePath)).toBe(false);
        expect(after.stdout).toMatchSnapshot();
      });
    });

    when('[t3] a DIRECTORY sits at the state path, and `set` is run', () => {
      then('🔴 refuses, never reports a bind that never landed', () => {
        // 🔴 .what = the `set`-side twin of `[t2]` above. `del`'s directory
        //        case is proven; `set`'s was not — and `set` is the arm
        //        whose false success is worse: `mv` MOVES a temp file INTO a
        //        directory rather than fail on it, so the write "succeeds"
        //        and exits 0 while the state path is still a directory.
        //
        // ⇒ the teeth are the two asserts a false-success render would fail:
        //        the refusal, not the bind-succeeded render, AND no state
        //        landed anywhere the reader would trust next.
        const scene = runInTempGitRepo({ sponsorArgs: ['get'] });
        const statePath = path.join(
          scene.tempDir,
          '.meter',
          SPONSOR_STATE_FILENAME,
        );
        fs.rmSync(statePath, { force: true });
        fs.mkdirSync(statePath, { recursive: true });

        const after = spawnSync(
          'bash',
          [scriptPath, 'set', '--who', 'Ada Lovelace <ada@example.com>'],
          {
            cwd: scene.tempDir,
            encoding: 'utf-8', // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, __I_AM_HUMAN: 'true' },
          },
        );

        expect(after.status).toBe(1);
        expect(after.stdout).toContain('the sponsor state path is not a file');
        expect(after.stdout).not.toContain('shell yeah, sponsor bound');
        expect(fs.statSync(statePath).isDirectory()).toBe(true);
        expect(after.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case7] malformed input', () => {
    when('[t0] --who is absent', () => {
      then('refuses and names the fix', () => {
        const result = runInTempGitRepo({ sponsorArgs: ['set'] });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--who is required');
        expect(result.stdout).toContain('--who @stdin');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t0b] --who is given with NO value — the bare flag', () => {
      then('🔴 it refuses like [t0], never crashes on a bad shift', () => {
        // 🔴 .why = `--who` as the last arg leaves one positional, and the
        //        parse loop did `shift 2`. under `set -euo pipefail` that
        //        exits non-zero and bash kills the skill with its own
        //        `shift: shift count out of range` — raw, unactionable, at
        //        exit 1, which reads as a MALFUNCTION where every other
        //        malformed input is a constraint at exit 2.
        //
        // ⇒ .why = the curated `--who is required` message already existed
        //        and was reachable ONLY when the flag was absent entirely.
        //        the bare flag — the commoner typo — crashed ahead of it.
        //        ⇒ so this asserts the two cases converge, which is the
        //        whole repair: one malformed-input class, one refusal.
        const result = runInTempGitRepo({ sponsorArgs: ['set', '--who'] });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--who is required');
        // the clamp's teeth: bash's raw text must never reach the human
        expect(result.stderr).not.toContain('shift count out of range');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t0c] --who is followed by ANOTHER FLAG', () => {
      /**
       * 🔴 .what = `--who` must not swallow the flag that follows it
       *
       * .why = the parse took `${2:-}` unconditionally, so `set --who --help`
       *        bound the literal `--help` as the sponsor's NAME. help never
       *        printed, and the human met "not a Name <email>" about a value
       *        they never supplied — a refusal that describes an input nobody
       *        typed (rule.forbid.surprises).
       *
       * ⇒ .why = the guard is `"$1" != --*`. an unconsumed flag stays in the
       *        arg list and reaches its own arm, so each input below meets the
       *        message it should — and none of those messages is new.
       *
       * 🔴 .why TWO dashes, never ONE = MEASURED, and `[case12]` is what
       *        measured it. a `!= -*` guard is wider and turns that clamp RED:
       *        it binds `-e Ada\nLovelace <ada@example.com>`, a legal name
       *        that opens with a single dash on purpose. ⇒ a parser may
       *        reserve a syntax position and may not decide which human names
       *        are plausible, so the guard stops at the shape no name has.
       *
       * ⚠️ .note = `--who -h` is therefore a KNOWN GAP, and it is not silent:
       *        it falls to the shape gate, which names the value and the three
       *        forms. the wider guard would close it at the cost of a legal
       *        name, and a legal name refused is the worse of the two.
       */
      then('🔴 `--who --help` prints HELP, never a bad-name refusal', () => {
        const result = runInTempGitRepo({
          sponsorArgs: ['set', '--who', '--help'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'name the human who answers for this tree',
        );
        // 🔴 the teeth: the swallowed flag used to surface as a rejected NAME
        expect(result.stdout).not.toContain('not a Name <email>');
      });

      then('🔴 an unknown flag after --who is refused AS A FLAG', () => {
        const result = runInTempGitRepo({
          sponsorArgs: ['set', '--who', '--bogus'],
        });

        expect(result.exitCode).toBe(2);
        // 🔴 the teeth: the refusal must be about `--bogus` as an OPTION, never
        //        about `--bogus` as a name the human meant to bind
        expect(result.stdout).toContain('unknown option: --bogus');
        expect(result.stdout).not.toContain('not a Name <email>');
      });

      then('🔴 a legal name that opens with ONE dash still binds', () => {
        // 🔴 .why = the counter-clamp, and it is the reason the guard stops at
        //        two dashes. `[case12]` proves the TRANSFORMER emits such a
        //        name verbatim; this proves the PARSER still lets one reach it.
        //        ⇒ the two together bound the guard from both sides, so a
        //        later widen to `-*` cannot pass as a tighter guard.
        const result = runInTempGitRepo({
          sponsorArgs: ['set', '--who', '-e Ada <ada@example.com>'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('name: -e Ada');
      });

      then('🔴 no flag is ever bound as a sponsor NAME', () => {
        // .why = the outcome that actually matters. a swallowed flag that
        //        passed the shape gate would land verbatim in a commit
        //        trailer — the fabricated identity this whole change forbids.
        const result = runInTempGitRepo({
          sponsorArgs: ['set', '--who', '--help'],
        });
        const statePath = path.join(
          result.tempDir,
          '.meter',
          'git.commit.sponsor.jsonc',
        );

        expect(fs.existsSync(statePath)).toBe(false);
      });
    });

    when('[t1] the value is not a Name <email>', () => {
      then('refuses and shows what was given', () => {
        const result = runInTempGitRepo({
          sponsorArgs: ['set', '--who', 'Ada Lovelace'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain("not a 'Name <email>'");
        expect(result.stdout).toContain('Ada Lovelace');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] the piped value is empty', () => {
      then('refuses rather than binds an empty sponsor', () => {
        const result = runInTempGitRepo({
          sponsorArgs: ['set', '--who', '@stdin'],
          stdin: '',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('resolved to an empty value');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2b] the value holds a CONTROL character', () => {
      /**
       * .what = the WRITER half of the control-character guard. the READER
       *         half lives at `git.commit.set` `[case48]`.
       *
       * .why = the two halves must be SYMMETRIC. a reader stricter than its
       *        writer is the same defect mirrored — it would let a human bind
       *        a value that then refuses every commit, with a "corrupt file"
       *        render naming damage the skill itself wrote.
       *
       * .why = `as_identity_trimmed` already strips `\n`/`\r`, so a newline
       *        never reached the state file. it is NOT the whole class: an
       *        ESC (`\x1b`) survives that trim untouched, so a terminal escape
       *        could ride into a refusal render and rewrite the very message
       *        that refuses it. ⇒ the guard is `[[:cntrl:]]`, never a deny-list
       *        of two characters — the defect WAS a deny-list.
       */
      then('refuses an ESC-bearing value, and does NOT echo it back', () => {
        const result = runInTempGitRepo({
          sponsorArgs: ['set', '--who', '@stdin'],
          // a real ESC, followed by a sequence that would clear the line it
          // lands on — which is what makes an echoed value dangerous
          stdin: 'Ada\u001b[2KLovelace <ada@example.com>',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('holds a control character');
        // 🔴 the clamp with the teeth: the refusal must not carry the payload
        //    into its own render. an `echo "$SPONSOR_NAME"` here would let the
        //    rejected value rewrite the message that rejects it
        expect(result.stdout).not.toContain('\u001b[2K');
        // rule.require.skill-output-streams — a failure rides both
        expect(result.stderr).toContain('holds a control character');
        // 🔴 .why a SNAPSHOT beside the two asserts = `not.toContain` proves
        //        one byte sequence is absent; it proves naught about what IS
        //        present. this is a caller-facing refusal render, and a dropped
        //        or reworded remedy line ships green under `toContain` alone
        //        (rule.forbid.friction-hazards). the snapshot also makes the
        //        absence of the ESC visible to a human who reads the pr, rather
        //        than asserted in a line they must trust.
        expect(result.stdout).toMatchSnapshot();
      });

      then('binds NOT ONE value — no state file is written', () => {
        const result = runInTempGitRepo({
          sponsorArgs: ['set', '--who', '@stdin'],
          stdin: 'Ada\u001b[2KLovelace <ada@example.com>',
        });
        const statePath = path.join(
          result.tempDir,
          '.meter',
          'git.commit.sponsor.jsonc',
        );

        expect(fs.existsSync(statePath)).toBe(false);
      });

      then('🔴 a value that ALSO fails the shape gate is not echoed', () => {
        // 🔴 .why = the hole the guard's first placement left, one branch wide.
        //        the guard sat BELOW `as_identity_parts`, on the split parts —
        //        so a value that carried an ESC *and* failed the shape check
        //        never reached it, and the shape refusal ECHOES `$SPONSOR_RAW`.
        //        ⇒ the escape sequence rendered, in the message that rejected it.
        //
        // .why = `Evil` has no ` <…>` at all, so it cannot parse as an identity.
        //        that is the point: this value's ONLY route used to be the
        //        branch that echoes.
        const result = runInTempGitRepo({
          sponsorArgs: ['set', '--who', '@stdin'],
          stdin: 'Ada\u001b[2KEvil',
        });

        expect(result.exitCode).toBe(2);
        // the control-char guard answers it, never the shape gate
        expect(result.stdout).toContain('holds a control character');
        expect(result.stdout).not.toContain("not a 'Name <email>'");
        // 🔴 the clamp: the payload never reaches the render
        expect(result.stdout).not.toContain('\u001b[2K');
      });

      then('🔴 a clean value still binds — the guard is not blanket', () => {
        // the counter-clamp. a guard that refused every value would pass the
        // two rows above and break the paved path
        const result = runInTempGitRepo({
          sponsorArgs: ['set', '--who', '@stdin'],
          stdin: 'Ada Lovelace <ada@example.com>',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('holds a control character');
      });
    });

    when('[t3] no subcommand', () => {
      /**
       * .why = the assertion was 'command required', a message this skill
       *        hand-rolled. it now uses validate_enum_arg — the extant helper
       *        — so the text is the repo's standard one AND the refusal rides
       *        both streams (rule.require.skill-output-streams); the
       *        hand-rolled echo was stdout-only.
       *
       * .note = strengthened, never relaxed: it still asserts exit 2, it now
       *         asserts the valid options are named (rule.require.discoverability),
       *         and it adds the stderr half the prior assertion never checked.
       */
      then('refuses on BOTH streams, and names the valid commands', () => {
        const result = runInTempGitRepo({ sponsorArgs: [] });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          "command must be 'set' or 'get' or 'del'",
        );
        expect(result.stderr).toContain(
          "command must be 'set' or 'get' or 'del'",
        );
        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t4] an unknown option', () => {
      // .why = the same stdout-only defect lived on this path too
      then('refuses on BOTH streams, and names the option', () => {
        const result = runInTempGitRepo({ sponsorArgs: ['get', '--nope'] });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('unknown option: --nope');
        expect(result.stderr).toContain('unknown option: --nope');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given(
    "[case9] --who @self reads this machine's git config, and only that",
    () => {
      /**
       * .what = run `set --who <form>` with a named git identity, and a `gh` on
       *         PATH that leaves a mark if any caller runs it.
       *
       * .mock = the gh cli, as a trap first on PATH that marks a file if run
       * 🔴 .why = the wish forbids gh on this path in any form. a stub that
       *        fails would only prove the skill survives gh; a stub that MARKS
       *        proves gh was never run. every case below asserts the mark is
       *        absent.
       * .real = all else is real: a real temp repo, real git config, the real
       *         skill. the `@self` path has no gh call left to exercise
       */
      const runSelf = (args: {
        slug: string;
        who: '@self' | '@me';
        gitConfig: { name: string | null; email: string | null };
        // default true — false runs with no tty and no escape hatch, as a
        // clone's tool call or a claude `!` command does
        asHuman?: boolean;
      }) => {
        const tempDir = genTempDir({ slug: `sponsor-${args.slug}`, git: true });
        const fakeBin = genTempDir({
          slug: `sponsor-${args.slug}-bin`,
          git: false,
        });
        const ghMark = path.join(fakeBin, 'gh.was.called');
        // .why = GIT_TRACE logs each git command the skill runs, so a case can
        //        prove the identity was never read
        const gitTrace = path.join(fakeBin, 'git.trace');

        fs.writeFileSync(
          path.join(fakeBin, 'gh'),
          `#!/usr/bin/env bash\ntouch "${ghMark}"\nexit 1\n`,
        );
        fs.chmodSync(path.join(fakeBin, 'gh'), '755');
        configureTestGitUser({ cwd: tempDir, ...args.gitConfig });

        const result = spawnSync(
          'bash',
          [scriptPath, 'set', '--who', args.who],
          {
            cwd: tempDir,
            encoding: 'utf-8', // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              PATH: `${fakeBin}:${process.env.PATH}`,
              GIT_TRACE: gitTrace,
              __I_AM_HUMAN: args.asHuman === false ? '' : 'true',
            },
          },
        );

        return {
          stdout: result.stdout ?? '',
          stderr: result.stderr ?? '',
          exitCode: result.status ?? 1,
          tempDir,
          ghCalled: fs.existsSync(ghMark),
          gitTraceLog: fs.existsSync(gitTrace)
            ? fs.readFileSync(gitTrace, 'utf-8')
            : '',
        };
      };

      const statePathOf = (tempDir: string) =>
        path.join(tempDir, '.meter', 'git.commit.sponsor.jsonc');

      when('[t0] git config names a human', () => {
        const result = useThen('the bind lands', () =>
          runSelf({
            slug: 'self-human',
            who: '@self',
            gitConfig: { name: 'Kai Nalu', email: 'kai@example.com' },
          }),
        );

        then('binds the git config identity, source: self', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('name: Kai Nalu');
          expect(result.stdout).toContain('email: kai@example.com');
          expect(result.stdout).toContain('source: self');
          expect(result.stdout).toMatchSnapshot();
        });

        then('the state on disk records source: self', () => {
          const state = JSON.parse(readState(result.tempDir));
          expect(state.sponsor).toEqual({
            name: 'Kai Nalu',
            email: 'kai@example.com',
            source: 'self',
          });
        });

        then('🔴 gh was never run', () => {
          expect(result.ghCalled).toBe(false);
        });
      });

      when('[t1] git config user.email is unset', () => {
        const result = useThen('the bind refuses', () =>
          runSelf({
            slug: 'self-no-email',
            who: '@self',
            gitConfig: { name: 'Kai Nalu', email: null },
          }),
        );

        then('refuses, names the absent half and its fix', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            '--who @self found no git identity on this machine',
          );
          expect(result.stdout).toContain('git config user.email is unset.');
          expect(result.stdout).toContain(
            '$ git config --global user.email "you@example.com"',
          );
          expect(result.stdout).not.toContain('user.name is unset');
          expect(result.stdout).toMatchSnapshot();
        });

        then('the failure lands on both streams', () => {
          expect(result.stderr).toContain('git config user.email is unset.');
        });

        then('writes no state, and gh was never run', () => {
          expect(fs.existsSync(statePathOf(result.tempDir))).toBe(false);
          expect(result.ghCalled).toBe(false);
        });
      });

      when('[t2] git config user.name is unset', () => {
        then('refuses and names user.name — never guesses a name', () => {
          const result = runSelf({
            slug: 'self-no-name',
            who: '@self',
            gitConfig: { name: null, email: 'kai@example.com' },
          });

          // .why = the email's local part is never used as a name — a guessed
          //        half is a fabricated identity
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('git config user.name is unset.');
          expect(result.stdout).toContain(
            '$ git config --global user.name "Your Name"',
          );
          expect(result.stdout).not.toContain('user.email is unset');
          expect(fs.existsSync(statePathOf(result.tempDir))).toBe(false);
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t3] both halves are unset', () => {
        then('refuses and names both, with one fix line per half', () => {
          const result = runSelf({
            slug: 'self-no-identity',
            who: '@self',
            gitConfig: { name: null, email: null },
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('git config user.name is unset.');
          expect(result.stdout).toContain('git config user.email is unset.');
          expect(result.stdout).toContain('git config --global user.name');
          expect(result.stdout).toContain('git config --global user.email');
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when(
        "[t4] git config names a seaturtle bot — the clone's machine",
        () => {
          const result = useThen('the bind refuses', () =>
            runSelf({
              slug: 'self-clone-bot',
              who: '@self',
              gitConfig: {
                name: 'seaturtle[bot]',
                email: 'seaturtle@ehmpath.com',
              },
            }),
          );

          then("refuses: this is the clone's machine", () => {
            expect(result.exitCode).toBe(2);
            expect(result.stdout).toContain(
              "--who @self read a clone's identity on this machine",
            );
            expect(result.stdout).toContain("this machine's git config reads:");
            expect(result.stdout).toContain(
              'seaturtle[bot] <seaturtle@ehmpath.com>',
            );
            expect(result.stdout).toMatchSnapshot();
          });

          then(
            'the remedy names the portable forms, never @self or @me',
            () => {
              // .why = `@self` would read this same git config and refuse again.
              //        the ERROR line names `--who @self` (the form the human typed);
              //        the claim here is that no remedy COMMAND offers it.
              expect(result.stdout).toContain('--who @stdin');
              expect(result.stdout).toContain('--who "Name <email>"');
              expect(result.stdout).not.toContain('sponsor set --who @self');
              expect(result.stdout).not.toContain('@me');
            },
          );

          then('writes no state, and gh was never run', () => {
            expect(fs.existsSync(statePathOf(result.tempDir))).toBe(false);
            expect(result.ghCalled).toBe(false);
          });
        },
      );

      when("[t5] git config names the clone's own github account", () => {
        then(
          "refuses: the account is on the roster, so it is the clone's machine",
          () => {
            // .why = the clone's account is human-shaped (no `[bot]`); only the
            //        roster separates it. this is the roster's `clone` entry, live
            //        through git config
            const result = runSelf({
              slug: 'self-clone-account',
              who: '@self',
              gitConfig: {
                name: "Seaturtle of'Ehmpathy",
                email: '259600029+ehm-seaturtle@users.noreply.github.com',
              },
            });

            expect(result.exitCode).toBe(2);
            expect(result.stdout).toContain(
              "--who @self read a clone's identity on this machine",
            );
            expect(fs.existsSync(statePathOf(result.tempDir))).toBe(false);
            expect(result.ghCalled).toBe(false);
            expect(result.stdout).toMatchSnapshot();
          },
        );
      });

      when('[t6] git config names a placeholder', () => {
        then(
          'refuses as a placeholder, and says where the value came from',
          () => {
            const result = runSelf({
              slug: 'self-placeholder',
              who: '@self',
              gitConfig: { name: 'Test User', email: 'test@example.com' },
            });

            expect(result.exitCode).toBe(2);
            expect(result.stdout).toContain('...and it is a placeholder.');
            expect(result.stdout).toContain("this machine's git config reads:");
            expect(result.stdout).not.toContain('you named:');
            // a real name fixes a placeholder — the fix leads the bind forms
            expect(result.stdout).toContain(
              '$ git config --global user.name "Your Name"',
            );
            expect(result.stdout).toMatchSnapshot();
          },
        );
      });

      when('[t7] git config email is not an address', () => {
        then('refuses, and the lead names git config — not "you gave"', () => {
          // .why = the human typed no value; a lead of "you gave:" would
          //        describe an input they never supplied (rule.forbid.surprises)
          const result = runSelf({
            slug: 'self-malformed',
            who: '@self',
            gitConfig: { name: 'Kai Nalu', email: 'kai@localhost' },
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            '--who @self read a malformed git identity',
          );
          expect(result.stdout).toContain("this machine's git config reads:");
          expect(result.stdout).toContain('Kai Nalu <kai@localhost>');
          expect(result.stdout).not.toContain('you gave:');
          expect(result.stdout).toContain('git config --global user.email');
          expect(result.stdout).not.toContain('git config --global user.name');
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t7b] git config name holds a control character', () => {
        then('🔴 the fix names user.name, never the email that is fine', () => {
          // 🔴 .why = the fix line must name the half at fault. a fixed
          //        `user.email` line here would send the human to change the
          //        one value that holds no defect (rule.require.errors-name-the-fix)
          const result = runSelf({
            slug: 'self-malformed-name',
            who: '@self',
            gitConfig: { name: 'Kai\u0007Nalu', email: 'kai@example.com' },
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            '--who @self read a malformed git identity',
          );
          expect(result.stdout).toContain('(holds a control character)');
          expect(result.stdout).toContain('git config --global user.name');
          expect(result.stdout).not.toContain('git config --global user.email');
          expect(result.stdout).not.toContain('\u0007');
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t8] --who @me — the silent alias', () => {
        const result = useThen('the bind lands', () =>
          runSelf({
            slug: 'self-alias-me',
            who: '@me',
            gitConfig: { name: 'Kai Nalu', email: 'kai@example.com' },
          }),
        );

        then('binds exactly as @self does — source: self', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('name: Kai Nalu');
          expect(result.stdout).toContain('source: self');
        });

        then('🔴 the output never names @me', () => {
          // .why = the alias must never teach itself (wisher: "we shouldnt
          //        even mention that @me works anywhere")
          expect(result.stdout).not.toContain('@me');
          expect(result.stdout).not.toContain('source: me');
          expect(result.stdout).toMatchSnapshot();
        });

        then('gh was never run', () => {
          expect(result.ghCalled).toBe(false);
        });
      });

      when('[t9] --who @me where git config cannot answer', () => {
        then('the refusal names @self, never @me', () => {
          const result = runSelf({
            slug: 'self-alias-me-refused',
            who: '@me',
            gitConfig: { name: 'Kai Nalu', email: null },
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('--who @self found no git identity');
          expect(result.stdout).not.toContain('@me');
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when("[t9b] --who @self with no terminal — a clone's tool call", () => {
        const refused = useThen('the bind refuses', () =>
          runSelf({
            slug: 'self-no-tty',
            who: '@self',
            gitConfig: { name: 'Kai Nalu', email: 'kai@example.com' },
            asHuman: false,
          }),
        );
        const allowed = useThen('the control bind lands', () =>
          runSelf({
            slug: 'self-no-tty-control',
            who: '@self',
            gitConfig: { name: 'Kai Nalu', email: 'kai@example.com' },
          }),
        );

        then('refuses on the channel, and writes no state', () => {
          expect(refused.exitCode).toBe(2);
          expect(refused.stdout).toContain('no terminal on this command');
          expect(fs.existsSync(statePathOf(refused.tempDir))).toBe(false);
        });

        then('🔴 no git config identity read, and no gh call, was made', () => {
          // 🔴 .why = vision case=2: the actor guard fires AHEAD of any
          //        identity read. a guard moved below the read would still
          //        refuse, and only this assert would go red.
          expect(refused.gitTraceLog).not.toMatch(/user\\?\.\(?name/);
          expect(refused.ghCalled).toBe(false);
        });

        then(
          'the control proves the trace sees a read when one happens',
          () => {
            // .why = without it, an empty trace would pass the assert above
            expect(allowed.exitCode).toBe(0);
            expect(allowed.gitTraceLog).toMatch(/user\\?\.\(?name/);
          },
        );
      });

      when('[t10] a bind written before the rename carries source: me', () => {
        then('get renders it as source: self', () => {
          const result = runInTempGitRepo({ sponsorArgs: ['get'] });
          seedTestSponsor({
            cwd: result.tempDir,
            name: 'Kai Nalu',
            email: 'kai@example.com',
            source: 'me',
          });
          const read = spawnSync('bash', [scriptPath, 'get'], {
            cwd: result.tempDir,
            encoding: 'utf-8', // note: library api requires this term
            env: { ...process.env },
          });

          expect(read.status).toBe(0);
          expect(read.stdout).toContain('source: self');
          expect(read.stdout).not.toContain('source: me');
          expect(read.stdout).toMatchSnapshot();
        });
      });

      when('[t11] --who @self binds, then git config changes', () => {
        then('🔴 the bind still names the human it pinned', () => {
          // 🔴 .why = vision case=9 [t4]: `@self` binds a SNAPSHOT of git
          //        config. a bind that stored a pointer, or a reader that
          //        re-read live git config, would follow the edit — and only
          //        this assert would go red.
          const bound = runSelf({
            slug: 'self-pinned',
            who: '@self',
            gitConfig: { name: 'Kai Nalu', email: 'kai@example.com' },
          });
          configureTestGitUser({
            cwd: bound.tempDir,
            name: 'Jo Rivera',
            email: 'jo@example.com',
          });
          const read = spawnSync('bash', [scriptPath, 'get'], {
            cwd: bound.tempDir,
            encoding: 'utf-8', // note: library api requires this term
            env: { ...process.env },
          });

          expect(bound.exitCode).toBe(0);
          expect(read.status).toBe(0);
          expect(read.stdout).toContain('name: Kai Nalu');
          expect(read.stdout).toContain('email: kai@example.com');
          expect(read.stdout).toContain('source: self');
          expect(read.stdout).not.toContain('Jo Rivera');
        });
      });
    },
  );

  given('[case12] a name that `echo` would have mangled', () => {
    when('[t0] the name starts with what a shell reads as a FLAG', () => {
      then('the value survives byte for byte', () => {
        // 🔴 .why = `as_identity_trimmed` normalized with `echo "$raw" | tr`.
        //        `echo` is not portable for arbitrary data: some shells read
        //        a leading `-n`/`-e` as a flag and some expand backslash
        //        escapes, so this exact value could be ALTERED before the
        //        shape check — a silent corruption of the one thing this
        //        skill exists to preserve. now `printf '%s'`, which emits
        //        verbatim bytes on every shell.
        //
        // .why = the value is absurd as a human name and that is the point:
        //        a transformer must not decide which byte sequences are
        //        plausible. the clamp asks only that what went in comes out.
        const result = runInTempGitRepo({
          sponsorArgs: ['set', '--who', '-e Ada\\nLovelace <ada@example.com>'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('name: -e Ada\\nLovelace');

        const state = JSON.parse(
          fs.readFileSync(
            path.join(result.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
            'utf-8',
          ),
        );
        // the state holds the literal backslash-n, never a real newline
        expect(state.sponsor.name).toBe('-e Ada\\nLovelace');
        expect(state.sponsor.email).toBe('ada@example.com');
      });
    });
  });

  given('[case8] --help', () => {
    when('[t0] --help is asked for', () => {
      then('leads with a .what, then the three value forms', () => {
        const result = runInTempGitRepo({ sponsorArgs: ['--help'] });

        expect(result.exitCode).toBe(0);
        // .why = rule.require.help-on-demand wants a one-line .what before
        //        the usage. a reader who has not yet decided they want this
        //        command learns naught from a call shape.
        expect(result.stdout).toContain(
          "git.commit.sponsor — name the human who answers for this tree's commits",
        );
        expect(result.stdout).toContain('--who @stdin');
        // .why = the literal was once absent from every refusal, so a human
        //        could not discover it. help is its last surface — assert it
        //        by name rather than leave it to the snapshot alone.
        expect(result.stdout).toContain('--who "Name <email>"');
        expect(result.stdout).toContain('--who @self');
        // .why = the help names the default: on a human's own machine no bind
        //        is needed, and a bind wins over git config
        expect(result.stdout).toContain('commits need no bind');
        expect(result.stdout).toContain('a bind wins over git config');
        // .why = `@me` is a silent alias, never named on any render
        expect(result.stdout).not.toContain('@me');
        expect(result.stdout).not.toContain('gh auth');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case10] the cwd is not a git repo', () => {
    when('[t0] any command is run outside a tree', () => {
      /**
       * .why = the skill's FIRST exit, and no test reached it. the sponsor
       *        is per-WORKTREE, so a run with no worktree has no state file
       *        to scope — `git rev-parse --show-toplevel` on the next line
       *        would fail under `set -e` and kill the run at exit 128 with
       *        a bare git message, where the contract promises exit 2.
       *
       * .why = it is asserted on `get`, the one command with no actor guard.
       *        that proves the check runs BEFORE the guards rather than
       *        behind them — a repo check placed after the tty guard would
       *        pass this same assertion only for `get`.
       */
      const result = useThen('the run refuses', () => {
        const tempDir = genTempDir({ slug: 'sponsor-no-repo', git: false });
        const spawned = spawnSync('bash', [scriptPath, 'get'], {
          cwd: tempDir,
          encoding: 'utf-8', // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, __I_AM_HUMAN: 'true' },
        });
        return {
          stdout: spawned.stdout ?? '',
          stderr: spawned.stderr ?? '',
          exitCode: spawned.status ?? 1,
        };
      });

      then('it exits 2 rather than dies on the rev-parse', () => {
        expect(result.exitCode).toBe(2);
      });

      then('it names the cause, on BOTH streams', () => {
        expect(result.stdout).toContain('not in a git repository');
        expect(result.stderr).toContain('not in a git repository');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case11] the sponsor state file is present and unreadable', () => {
    when('[t0] get is run against it', () => {
      /**
       * .why = a file that EXISTS and will not parse is a third state, and
       *        it was handled as neither of the two. `get` read it with a
       *        bare `jq -r`, so under `set -euo pipefail` a corrupt file
       *        killed the run with jq's own parse text — no file named, no
       *        remedy, and an exit code jq picked rather than this skill.
       *
       * .why = it asserts the file PATH is printed. that is the whole value
       *        of the message: a human who does not know where the state
       *        lives cannot inspect or clear it, so a refusal that omits
       *        the path names a fault it does not let them fix.
       */
      const result = useThen('a well-formed file reads clean', () =>
        runInTempGitRepo({
          sponsorArgs: ['get'],
          seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
        }),
      );

      then(
        'a corrupt file exits 1 — a malfunction, never an unbound tree',
        () => {
          const corrupted = runInTempGitRepo({
            sponsorArgs: ['get'],
            seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
          });
          fs.writeFileSync(
            path.join(corrupted.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
            '{ "sponsor": { "name": "Ada',
          );
          const after = spawnSync('bash', [scriptPath, 'get'], {
            cwd: corrupted.tempDir,
            encoding: 'utf-8', // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, __I_AM_HUMAN: 'true' },
          });

          expect(after.status).toBe(1);
          expect(after.stdout).toContain('sponsor state file corrupt');
          expect(after.stdout).toContain('.meter/git.commit.sponsor.jsonc');
          // the remedy names the CLEAR, never a re-bind: a re-bind over a
          // corrupt file was the loop the old text sent the human into
          expect(after.stdout).toContain('git.commit.sponsor del');
          // .why = rule.require.skill-output-streams — a failure is on both
          expect(after.stderr).toContain('sponsor state file corrupt');
          // 🔴 .why = `get` is the surface a human reaches to DIAGNOSE a tree
          //        whose every commit refuses, so its corrupt render is the
          //        one a human reads under the most pressure. its set-side
          //        twin is snapped; this was the last caller-faced variant
          //        of the third state that was not.
          expect(after.stdout).toMatchSnapshot();
        },
      );

      then(
        'a file whose `.sponsor` is a STRING is caught, never crashed on',
        () => {
          // 🔴 .why = the shape that does not merely mislead — it CRASHES.
          //        `jq -r '.sponsor.name'` on `{"sponsor": "Ada"}` exits
          //        non-zero with `Cannot index string with "name"`, and under
          //        `set -euo pipefail` that raw text kills the skill: no file
          //        named, no remedy, and an exit code jq picked. ⇒ the exact
          //        un-curated crash this reader exists to remove, one shape
          //        further out than the two it already caught.
          //
          // .why = the fix is that gate 1 asks `(.sponsor | type) == "object"`
          //        rather than a bare `jq empty`. a type test subsumes a parse
          //        test, so a file that will not parse fails it too.
          //
          // ⚠️ .note = this comment once continued "...and it makes the field
          //        reads below unable to fail". that was FALSE, and the test
          //        two blocks down is the shape that disproved it. gate 1 now
          //        tests the LEAF types as well, which is what finally earns
          //        the claim the comment had been making since i003.
          const corrupted = runInTempGitRepo({
            sponsorArgs: ['get'],
            seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
          });
          fs.writeFileSync(
            path.join(corrupted.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
            '{ "sponsor": "Ada" }',
          );
          const after = spawnSync('bash', [scriptPath, 'get'], {
            cwd: corrupted.tempDir,
            encoding: 'utf-8', // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, __I_AM_HUMAN: 'true' },
          });

          expect(after.status).toBe(1);
          expect(after.stdout).toContain('sponsor state file corrupt');
          expect(after.stdout).toContain('.meter/git.commit.sponsor.jsonc');
          // 🔴 the clamp: jq's raw parse text must NEVER reach the human
          expect(after.stdout).not.toContain('Cannot index string');
          expect(after.stderr).not.toContain('Cannot index string');
        },
      );

      then(
        '🔴 a file whose `.name` is an OBJECT is caught — one shape further',
        () => {
          // 🔴 .why = the shape that slipped past the object-only gate 1, and
          //        the comment above USED to claim the gate made "the field
          //        reads below unable to fail". it did not.
          //
          // 🔴 .why = MEASURED by removal of the leaf tests, and the mechanism
          //        is NOT the crash it looks like it should be:
          //          1. `// empty` does not fire — an object is truthy
          //          2. and `jq -r` does not fail on an object either. it
          //             prints it as compact json ⇒ name = `{"nested":1}`
          //          3. gate 2 sees a NON-EMPTY name and returns 0
          //        ⇒ `get` exits 0 and reports a bound sponsor named
          //        `{"nested":1}`, and a commit would then carry
          //        `Co-authored-by: {"nested":1} <a@b.c>`.
          //
          // ⇒ 🔴 so the clamp's teeth are the STATUS and the fabricated value,
          //        never an absent jq error. there is no jq error to look for
          //        — which is exactly what makes the shape dangerous: it is
          //        silent, and it ends in a commit trailer that names a human
          //        who does not exist.
          const corrupted = runInTempGitRepo({
            sponsorArgs: ['get'],
            seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
          });
          fs.writeFileSync(
            path.join(corrupted.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
            '{ "sponsor": { "name": { "nested": 1 }, "email": "a@b.c" } }',
          );
          const after = spawnSync('bash', [scriptPath, 'get'], {
            cwd: corrupted.tempDir,
            encoding: 'utf-8', // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, __I_AM_HUMAN: 'true' },
          });

          expect(after.status).toBe(1);
          expect(after.stdout).toContain('sponsor state file corrupt');
          // 🔴 the sharpest assert: the json blob must never reach the render
          expect(after.stdout).not.toContain('nested');
          expect(after.stderr).not.toContain('nested');
        },
      );

      then('🔴 a file that is EMPTY (0 bytes) is caught as DAMAGE', () => {
        // 🔴 .why = a file cut short — an interrupted write, a truncate, a
        //        disk that filled — is DAMAGE, never an unbound tree. the two
        //        carry opposite remedies: damage asks for `del` + a re-bind,
        //        absence asks for a first bind onto a clear path.
        //
        // ⚠️ .note on this clamp's TEETH, stated plainly because it has less
        //        than its siblings. gate 1 and gate 2 both `return 1`, so this
        //        assert holds under EITHER gate alone. it clamps the OUTCOME
        //        of the pair, which is real and was uncovered — it does NOT
        //        isolate gate 1's `-s`.
        //
        // 🔴 .why = and gate 1's `-s` is not separately observable HERE by
        //        construction, which is the honest read rather than a gap:
        //        a bare `jq -e` reports on the last OUTPUT value, and empty
        //        input produces no value, so the filter never runs and jq
        //        exits 0. ⇒ gate 1 was a NO-OP on this input and gate 2 alone
        //        carried the verdict. `-s` slurps to `[]`, so `.[0]` is `null`
        //        — a real value the gate can reject on its own.
        //
        // ⇒ the repair makes gate 1 honest about a case it silently let
        //        through. the behavior it guards is clamped here; that the
        //        guard is now the gate's own rather than borrowed from its
        //        neighbour is a claim about STRUCTURE, and no outcome assert
        //        can hold it (rule.require.clamp-edge-cases).
        const corrupted = runInTempGitRepo({
          sponsorArgs: ['get'],
          seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
        });
        fs.writeFileSync(
          path.join(corrupted.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
          '',
        );
        const after = spawnSync('bash', [scriptPath, 'get'], {
          cwd: corrupted.tempDir,
          encoding: 'utf-8', // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, __I_AM_HUMAN: 'true' },
        });

        expect(after.status).toBe(1);
        expect(after.stdout).toContain('sponsor state file corrupt');
        expect(after.stdout).toContain('.meter/git.commit.sponsor.jsonc');

        // 🔴 the assert that separates DAMAGE from ABSENCE. an empty file read
        //        as "no sponsor bound" would send the human to bind onto a path
        //        that already holds a broken file (rule.forbid.failhide).
        expect(after.stdout).not.toContain('no sponsor is bound');

        // .why = no raw jq text may reach the human, on either stream
        expect(after.stderr).not.toContain('jq:');
      });

      then(
        '🔴 a file whose `.email` is a STRING but not an ADDRESS is caught',
        () => {
          // 🔴 .why = the shortest route to the SAME fabricated trailer the
          //        object case above describes, and the gates used to miss it
          //        entirely: gate 1 asked only `type == "string"`, and
          //        `"not-an-email"` answers yes. gate 2 asked only non-empty,
          //        and it is non-empty. ⇒ `get` reported a BOUND sponsor and a
          //        commit would carry `Co-authored-by: Ada <not-an-email>`.
          //
          // 🔴 .why = the cause is a DISAGREEMENT between two paths, never a
          //        missed case: `set` refuses this exact value at
          //        `as_identity_parts`, so the file is one the writer would
          //        never produce — and the reader accepted it anyway. the two
          //        now share `SPONSOR_EMAIL_PATTERN`, so a reader looser than
          //        the writer is unreachable rather than merely absent.
          //
          // ⇒ the teeth: the status must be the CORRUPT malfunction (1), and
          //        the bad address must never render as a bound sponsor.
          const corrupted = runInTempGitRepo({
            sponsorArgs: ['get'],
            seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
          });
          fs.writeFileSync(
            path.join(corrupted.tempDir, '.meter', SPONSOR_STATE_FILENAME),
            '{ "sponsor": { "name": "Ada", "email": "not-an-email" } }',
          );
          const after = spawnSync('bash', [scriptPath, 'get'], {
            cwd: corrupted.tempDir,
            encoding: 'utf-8', // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, __I_AM_HUMAN: 'true' },
          });

          expect(after.status).toBe(1);
          expect(after.stdout).toContain('sponsor state file corrupt');
          // 🔴 the sharpest assert: the bad address must never read as bound
          expect(after.stdout).not.toContain('not-an-email');
          expect(after.stdout).not.toContain('name: Ada');
        },
      );

      then('🔴 a file whose `.source` is an ARRAY is caught too', () => {
        // .why = `.source` reads through a `// $sourceDefault` fallback, so it
        //        is the one leaf where `null` is LEGAL — a file bound before
        //        the field existed. that makes a bare string test wrong for it,
        //        and it is why the gate tests `(.sponsor.source //
        //        $sourceDefault)`: byte-for-byte the expression the read
        //        performs, with both bound from the shared SPONSOR_SOURCE_*
        //        constant rather than from two literals.
        //
        // .why = `.name` and `.email` are valid strings here, so this reaches
        //        past both leaf tests above and lands on `.source` alone.
        const corrupted = runInTempGitRepo({
          sponsorArgs: ['get'],
          seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
        });
        fs.writeFileSync(
          path.join(corrupted.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
          '{ "sponsor": { "name": "Ada", "email": "a@b.c", "source": ["me"] } }',
        );
        const after = spawnSync('bash', [scriptPath, 'get'], {
          cwd: corrupted.tempDir,
          encoding: 'utf-8', // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, __I_AM_HUMAN: 'true' },
        });

        expect(after.status).toBe(1);
        expect(after.stdout).toContain('sponsor state file corrupt');
        // the same teeth as the block above: with the leaf tests removed,
        // `source` renders as the literal `["me"]` in the bound record
        expect(after.stdout).not.toContain('["me"]');
        expect(after.stderr).not.toContain('["me"]');
      });

      then(
        '🔴 a DIRECTORY at the state path is DAMAGE, never an absence',
        () => {
          // 🔴 .why = the absence test used to be a bare `[[ ! -f ]]`, a
          //        REGULAR-file test. a directory at the state path fails `-f`,
          //        so the reader returned 2 and every caller rendered "no
          //        sponsor is bound to this tree".
          //
          // ⇒ the human is then sent to BIND onto a path that holds a
          //        directory, so the one remedy offered cannot work. damage
          //        reported as absence is the failhide the status split exists
          //        to prevent.
          //
          // ⇒ the teeth: status must be 1 (corrupt), and the unbound render —
          //        which names the bind command — must NOT appear.
          const scene = runInTempGitRepo({ sponsorArgs: ['get'] });
          const statePath = path.join(
            scene.tempDir,
            '.meter',
            SPONSOR_STATE_FILENAME,
          );
          fs.rmSync(statePath, { force: true });
          fs.mkdirSync(statePath, { recursive: true });

          const after = spawnSync('bash', [scriptPath, 'get'], {
            cwd: scene.tempDir,
            encoding: 'utf-8', // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, __I_AM_HUMAN: 'true' },
          });

          expect(after.status).toBe(1);
          expect(after.stdout).toContain('sponsor state file corrupt');
          expect(after.stdout).not.toContain('no sponsor is bound');
        },
      );

      then('🔴 an UNREADABLE file leaks no raw system text', () => {
        // 🔴 .why = the read is `cat "$file"`. on a chmod-000 file `cat`
        //        writes `cat: …: Permission denied` to the caller's stderr,
        //        and every caller inherits it — so the human met the curated
        //        refusal AND a raw system message beside it.
        //
        // ⇒ the refusal was always correct; the DEFECT is the extra text.
        //        so the teeth are on stderr, never on the status: a check
        //        that only read the exit code would pass in both worlds.
        const scene = runInTempGitRepo({
          sponsorArgs: ['get'],
          seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
        });
        const statePath = path.join(
          scene.tempDir,
          '.meter',
          SPONSOR_STATE_FILENAME,
        );
        fs.chmodSync(statePath, 0o000);

        const after = spawnSync('bash', [scriptPath, 'get'], {
          cwd: scene.tempDir,
          encoding: 'utf-8', // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, __I_AM_HUMAN: 'true' },
        });
        fs.chmodSync(statePath, 0o644); // so the temp dir stays removable

        expect(after.status).toBe(1);
        expect(after.stdout).toContain('sponsor state file corrupt');
        // 🔴 the teeth: no raw `cat` text on either stream
        expect(after.stderr).not.toContain('Permission denied');
        expect(after.stdout).not.toContain('Permission denied');
        expect(after.stderr).not.toContain('cat:');
      });

      then('a file with NO sponsor key at all is caught too', () => {
        // .why = `{"foo": 1}` parses, and `.sponsor` reads null — so a bare
        //        `jq empty` passes it and the identity vars come back empty.
        //        the type test refuses it: null is not an object.
        const corrupted = runInTempGitRepo({
          sponsorArgs: ['get'],
          seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
        });
        fs.writeFileSync(
          path.join(corrupted.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
          '{ "foo": 1 }',
        );
        const after = spawnSync('bash', [scriptPath, 'get'], {
          cwd: corrupted.tempDir,
          encoding: 'utf-8', // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, __I_AM_HUMAN: 'true' },
        });

        expect(after.status).toBe(1);
        expect(after.stdout).toContain('sponsor state file corrupt');
      });

      then('a file that PARSES but carries no identity is caught too', () => {
        // .why = the sharper twin of the case above. this file is valid json,
        //        so a parse gate waves it through and leaves the identity vars
        //        empty — and `get` would then render a bound sponsor whose
        //        name and email are both blank, which reads as a successful
        //        read of a sponsor that is not there (rule.forbid.failhide).
        //
        // .why = it is damage rather than an absence because the skill cannot
        //        write it: `set` always emits both fields and `del` removes
        //        the file. only a hand-edit lands here.
        const corrupted = runInTempGitRepo({
          sponsorArgs: ['get'],
          seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
        });
        fs.writeFileSync(
          path.join(corrupted.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
          '{ "sponsor": {} }',
        );
        const after = spawnSync('bash', [scriptPath, 'get'], {
          cwd: corrupted.tempDir,
          encoding: 'utf-8', // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, __I_AM_HUMAN: 'true' },
        });

        expect(after.status).toBe(1);
        expect(after.stdout).toContain('sponsor state file corrupt');
        // 🔴 the clamp: a parse-only gate rendered the empty bind as a read
        expect(after.stdout).not.toContain('name: (none)');
        expect(after.stderr).toContain('sponsor state file corrupt');
      });

      then(
        'a WELL-FORMED file still reads clean — the guard is not blanket',
        () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('name: Ada Lovelace');
          expect(result.stdout).not.toContain('corrupt');
        },
      );

      then('a control character in `.sponsor.source` is caught too', () => {
        // 🔴 .why = gate 1 refused a control character in `.name`/`.email`
        //        from the start, but `.source` was only type-checked as a
        //        string — and `get` echoes it verbatim
        //        (`echo "   └─ source: $SPONSOR_SOURCE"`). an ESC there
        //        reaches the render exactly as it would from `.name`, on a
        //        field the reader was never hardened against.
        const corrupted = runInTempGitRepo({
          sponsorArgs: ['get'],
          seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
        });
        fs.writeFileSync(
          path.join(corrupted.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
          '{ "sponsor": { "name": "Ada", "email": "a@b.c", "source": "me\\u001b[2K" } }',
        );
        const after = spawnSync('bash', [scriptPath, 'get'], {
          cwd: corrupted.tempDir,
          encoding: 'utf-8', // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, __I_AM_HUMAN: 'true' },
        });

        expect(after.status).toBe(1);
        expect(after.stdout).toContain('sponsor state file corrupt');
        // the teeth: the ESC never reaches the render
        expect(after.stdout.includes('\x1b')).toBe(false);
      });
    });
  });

  given('[case15] a refusal PRINTS a command, and the command WORKS', () => {
    /**
     * .what = the `sponsor`-side twin of `git.commit.set`'s `[case49]` — walk
     *         a refusal's own remedy end to end, rather than assert its text.
     *
     * .why = `.dream/v2026_09_12.fix.a-refusal-that-names-a-command-is-an-
     *        untested-promise.md` and fulcrum F12 ask 5 name this exact gap:
     *        every other case in `[case4]`/`[case11]` asserts the refusal's
     *        TEXT and never runs the command it names. a command that IS
     *        printed and does NOT work is worse than an absent one — the
     *        human runs it, fails, and doubts the feature rather than their
     *        tree (rule.require.errors-name-the-fix).
     */
    when(
      '[t0] a corrupt `get` render → its own `del` → bind → clean `get`',
      () => {
        const walked = useThen('the whole walk runs', () => {
          // step 1 — the refusal: a corrupt file, read via `get`
          const scene = runInTempGitRepo({
            sponsorArgs: ['get'],
            seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
          });
          fs.writeFileSync(
            path.join(scene.tempDir, '.meter', SPONSOR_STATE_FILENAME),
            '{ "sponsor": { "name": "Ada',
          );
          const refused = spawnSync('bash', [scriptPath, 'get'], {
            cwd: scene.tempDir,
            encoding: 'utf-8', // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, __I_AM_HUMAN: 'true' },
          });

          // step 2 — the remedy it prints puts `del` first
          const cleared = spawnSync('bash', [scriptPath, 'del'], {
            cwd: scene.tempDir,
            encoding: 'utf-8', // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, __I_AM_HUMAN: 'true' },
          });

          // step 3 — then the bind the remedy names
          const bound = spawnSync(
            'bash',
            [scriptPath, 'set', '--who', 'Ada Lovelace <ada@example.com>'],
            {
              cwd: scene.tempDir,
              encoding: 'utf-8', // note: library api requires this term
              stdio: ['pipe', 'pipe', 'pipe'],
              env: { ...process.env, __I_AM_HUMAN: 'true' },
            },
          );

          // step 4 — `get` now reads clean
          const after = spawnSync('bash', [scriptPath, 'get'], {
            cwd: scene.tempDir,
            encoding: 'utf-8', // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, __I_AM_HUMAN: 'true' },
          });

          return { refused, cleared, bound, after };
        });

        then('the corrupt render names `del` as the remedy', () => {
          expect(walked.refused.status).toBe(1);
          expect(walked.refused.stdout).toContain('git.commit.sponsor del');
        });

        then('🔴 `del` SUCCEEDS', () => {
          expect(walked.cleared.status).toBe(0);
        });

        then('🔴 the bind that follows SUCCEEDS', () => {
          expect(walked.bound.status).toBe(0);
        });

        then('🔴 and `get` now reads clean, human named', () => {
          expect(walked.after.status).toBe(0);
          expect(walked.after.stdout).toContain('name: Ada Lovelace');
          expect(walked.after.stdout).not.toContain('corrupt');
        });
      },
    );

    when(
      '[t1] an actor-guard refusal → the LITERAL bind it names → bind',
      () => {
        const walked = useThen('the whole walk runs', () => {
          // step 1 — the refusal: no tty on any stream
          const refused = runInTempGitRepo({
            sponsorArgs: ['set', '--who', 'Ada Lovelace <ada@example.com>'],
            asHuman: false,
          });

          // step 2 — the literal form the refusal's remedy names, now as a
          // human (the `__I_AM_HUMAN` escape stands in for a real tty; the
          // guard itself is proven against a real pty in `[case14]`)
          const bound = spawnSync(
            'bash',
            [scriptPath, 'set', '--who', 'Ada Lovelace <ada@example.com>'],
            {
              cwd: refused.tempDir,
              encoding: 'utf-8', // note: library api requires this term
              stdio: ['pipe', 'pipe', 'pipe'],
              env: { ...process.env, __I_AM_HUMAN: 'true' },
            },
          );

          return { refused, bound };
        });

        then('the refusal names the literal form', () => {
          expect(walked.refused.exitCode).toBe(2);
          expect(walked.refused.stdout).toContain('--who "Name <email>"');
        });

        then('🔴 the printed command SUCCEEDS once a human runs it', () => {
          expect(walked.bound.status).toBe(0);
          expect(
            JSON.parse(readState(walked.refused.tempDir)).sponsor.name,
          ).toBe('Ada Lovelace');
        });
      },
    );

    when(
      '[t2] an actor-guard refusal → the STDIN bind form it names → bind',
      () => {
        /**
         * .what = the SIBLING remedy `[t1]` leaves untested: `set`'s refusal
         *         names TWO forms (`SPONSOR_BIND_REMEDY` prints stdin, then
         *         literal). a walk of the literal alone proves only half the
         *         printed block works.
         */
        const walked = useThen('the whole walk runs', () => {
          // step 1 — the refusal: no tty on any stream
          const refused = runInTempGitRepo({
            sponsorArgs: ['set', '--who', 'Ada Lovelace <ada@example.com>'],
            asHuman: false,
          });

          // step 2 — the piped form the refusal's remedy names, as a human
          const bound = spawnSync(
            'bash',
            [scriptPath, 'set', '--who', '@stdin'],
            {
              cwd: refused.tempDir,
              encoding: 'utf-8', // note: library api requires this term
              stdio: ['pipe', 'pipe', 'pipe'],
              input: 'Ada Lovelace <ada@example.com>',
              env: { ...process.env, __I_AM_HUMAN: 'true' },
            },
          );

          return { refused, bound };
        });

        then('the refusal names the stdin form', () => {
          expect(walked.refused.exitCode).toBe(2);
          expect(walked.refused.stdout).toContain('--who @stdin');
        });

        then('🔴 the piped command SUCCEEDS once a human runs it', () => {
          expect(walked.bound.status).toBe(0);
          expect(
            JSON.parse(readState(walked.refused.tempDir)).sponsor.name,
          ).toBe('Ada Lovelace');
        });
      },
    );

    when(
      '[t3] a `del` actor-guard refusal → the `del` it names → succeeds',
      () => {
        /**
         * .what = `del`'s remedy is a DIFFERENT command than `set`'s (its own
         *         name, never a bind — `refuse_actor`'s branch at
         *         git.commit.sponsor.sh:278). the walk above never exercises
         *         this branch; a bare assertion of its text is all this
         *         command ever had.
         */
        const walked = useThen('the whole walk runs', () => {
          // step 1 — the refusal: no tty on any stream, a sponsor is bound
          const refused = runInTempGitRepo({
            sponsorArgs: ['del'],
            asHuman: false,
            seedSponsor: { name: 'Ada Lovelace', email: 'ada@example.com' },
          });

          // step 2 — the exact command the refusal names, as a human
          const cleared = spawnSync('bash', [scriptPath, 'del'], {
            cwd: refused.tempDir,
            encoding: 'utf-8', // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, __I_AM_HUMAN: 'true' },
          });

          return { refused, cleared };
        });

        then('the refusal names `del`, never a bind', () => {
          expect(walked.refused.exitCode).toBe(2);
          expect(walked.refused.stdout).toContain('git.commit.sponsor del');
        });

        then('🔴 the printed `del` SUCCEEDS once a human runs it', () => {
          expect(walked.cleared.status).toBe(0);
        });

        then('🔴 the sponsor is actually cleared', () => {
          expect(() => readState(walked.refused.tempDir)).toThrow();
        });
      },
    );
  });

  given('[case13] the state filename is ONE name across two languages', () => {
    /**
     * .what = assert the shell constant and the typescript constant agree.
     *
     * .why = three shell skills now share `SPONSOR_STATE_FILENAME` from
     *        `git.commit.operations.sh`, so a rename there moves all three at
     *        once. `seedTestSponsor.ts` cannot source a bash file, so it holds
     *        the literal a SECOND time — and a rename applied to the shell
     *        alone would leave the seed on a path nobody reads. every seeded
     *        test would then stay green against a stale file, which is the
     *        worst shape a drift can take: the suite vouches for a path the
     *        product abandoned.
     */
    when('[t0] both declarations are read', () => {
      then('they name the same file', () => {
        const operations = fs.readFileSync(
          path.join(__dirname, 'git.commit.operations.sh'),
          'utf-8',
        );

        expect(operations).toContain(
          `SPONSOR_STATE_FILENAME="${SPONSOR_STATE_FILENAME}"`,
        );
      });
    });
  });
});
