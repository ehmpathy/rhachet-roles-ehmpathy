import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import {
  SPONSOR_STATE_FILENAME,
  seedTestSponsor,
} from '../../../../.test/seedTestSponsor';
import { getPtyModulePath, spawnInPty } from '../../../../.test/spawnInPty';

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
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'git-commit-sponsor-test', git: true });

    // .why = the same helper the ~20 git.commit.set call sites use. an inline
    //        write here would be a SECOND mechanism for one state file, and a
    //        change to the state shape would then need two edits — with only
    //        one of them caught by a failed test.
    if (args.seedSponsor)
      seedTestSponsor({ cwd: tempDir, ...args.seedSponsor });

    const result = spawnSync('bash', [scriptPath, ...args.sponsorArgs], {
      cwd: tempDir,
      encoding: 'utf-8', // note: library api requires this term
      stdio: ['pipe', 'pipe', 'pipe'],
      input: args.stdin ?? '',
      env: {
        ...process.env,
        ...(args.asHuman === false ? {} : { __I_AM_HUMAN: 'true' }),
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

  /**
   * .what = run `set --who @me` against a `gh` whose behavior is supplied here.
   *
   * .why = the two boundary clamps below differ only in what gh does, so one
   *        runner with a `ghScript` seam beats two near-identical helpers —
   *        this is the third call shape of the same stub in this file.
   */
  const runAtMeWithGhStub = (args: {
    slug: string;
    ghScript: string;
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: `sponsor-${args.slug}`, git: true });
    const fakeBin = genTempDir({
      slug: `sponsor-${args.slug}-bin`,
      git: false,
    });

    fs.writeFileSync(path.join(fakeBin, 'gh'), args.ghScript);
    fs.chmodSync(path.join(fakeBin, 'gh'), '755');

    const result = spawnSync('bash', [scriptPath, 'set', '--who', '@me'], {
      cwd: tempDir,
      encoding: 'utf-8', // note: library api requires this term
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH}`,
        __I_AM_HUMAN: 'true',
      },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

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
          expect(readB.stdout).toContain('sponsor: (none)');
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

    when('[t1] no sponsor is bound', () => {
      then('reports (none) and names the fix', () => {
        const result = runInTempGitRepo({ sponsorArgs: ['get'] });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('sponsor: (none)');
        // .why = `get` carries no actor guard, so a HUMAN reads this line as
        //        often as a clone does. "ask your human to…" commands a human
        //        who is frequently the reader; this states who may bind, and
        //        fits both. the imperative stays correct in `git.commit.set`,
        //        which a clone runs and a human does not.
        expect(result.stdout).toContain("a human binds this tree's sponsor");
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
      });
    });

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

      then('refuses, and addresses the human', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('only humans can run this command');
        expect(result.stdout).toContain('ask your human to run');
        expect(result.stdout).toMatchSnapshot();
      });

      then('writes no state', () => {
        // .why = a refused bind must leave the tree exactly as it found it
        expect(
          fs.existsSync(
            path.join(result.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
          ),
        ).toBe(false);
      });

      then('the refusal never prints @me', () => {
        // .why = @me reads the gh session on THIS host, which on a cloud grove
        //        is the clone's. a mandatory block that printed it would hand
        //        the reader a second refusal.
        expect(result.stdout).not.toContain('--who @me');
      });

      then('the failure lands on BOTH streams', () => {
        expect(result.stderr).toContain('only humans can run this command');
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
        expect(result.stdout).toContain('only humans can run this command');
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
        //        `only humans can run this command` asserted above is true of
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
        expect(scene.output).not.toContain('only humans can run this command');
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
      const stem = 'error: that identity cannot answer for a change';

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
          //        the clone holds a `gh auth login` session as. an identity
          //        MATCH needs no attribute to work, which is the whole
          //        reason it survives Q10's refutations.
          //
          // .why = the vision requires this refusal (case=1 [t3], case=5):
          //        a cloud grove carries no human session, so `--who @me`
          //        there must refuse rather than name whoever it found. a
          //        bind of this account would put the clone in its own
          //        Co-authored-by trailer — the defect (#645) restored under
          //        the paved flag.
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
        expect(result.stdout).toContain('sponsor: (none)');
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

  given('[case9] --who @me when the host cannot answer', () => {
    when('[t0] the gh session lookup fails', () => {
      /**
       * .why = this clamps a defect the green suite did not catch. the @me
       *        resolver used to emit its refusal INSIDE a `$( )` command
       *        substitution, so the stdout half was captured into the
       *        variable rather than shown — the human saw the failure on
       *        stderr only, a silent rule.require.skill-output-streams
       *        breach. the exit code was 2 either way, so a coarse assert
       *        would have passed.
       *
       * .mock = a `gh` stub that exits non-zero, shadowed onto PATH.
       * .why  = the gh-failure branch cannot be reached in a hermetic
       *         harness any other way — the runner's own gh IS logged in,
       *         so the real call succeeds.
       *
       * .note = this stub fails SILENTLY: exit 1, no stderr. [t1c] is its
       *         complement, where gh does say why. the pair is what proves
       *         the refusal reports gh's words when there are words, and
       *         invents none when there are not.
       */
      const runWithBrokenGh = (): {
        stdout: string;
        stderr: string;
        exitCode: number;
      } => {
        const tempDir = genTempDir({
          slug: 'git-commit-sponsor-nogh',
          git: true,
        });
        const fakeBin = genTempDir({ slug: 'sponsor-fake-bin', git: false });
        fs.writeFileSync(
          path.join(fakeBin, 'gh'),
          '#!/usr/bin/env bash\nexit 1\n',
        );
        fs.chmodSync(path.join(fakeBin, 'gh'), '755');

        const result = spawnSync('bash', [scriptPath, 'set', '--who', '@me'], {
          cwd: tempDir,
          encoding: 'utf-8', // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            PATH: `${fakeBin}:${process.env.PATH}`,
            __I_AM_HUMAN: 'true',
          },
        });
        return {
          stdout: result.stdout ?? '',
          stderr: result.stderr ?? '',
          exitCode: result.status ?? 1,
        };
      };

      const result = useThen('the bind refuses', () => runWithBrokenGh());

      then('the refusal lands on BOTH streams', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('gh failed (exit 1)');
        expect(result.stderr).toContain('gh failed (exit 1)');
      });

      then('🔴 it names what it MEASURED, never a cause it assumed', () => {
        // 🔴 .why = this assert used to read `found no github session on this
        //        host`, and that is what it CLAMPED: a specific cause the
        //        skill never measured, asserted for every nonzero gh exit.
        //        ⇒ the test did not merely miss the defect — it pinned it,
        //        so a repair would have had to break a green test to land.
        //
        // .why = this stub exits 1 and says NOTHING on stderr, which is the
        //        sharp half: with no words from gh, the refusal must still
        //        decline to invent a cause.
        expect(result.stdout).not.toContain('found no github session');
        expect(result.stderr).not.toContain('found no github session');
      });

      then('🔴 it never points at words gh did not say', () => {
        // 🔴 .why = the lead read "read gh's words above" UNCONDITIONALLY,
        //        while the body leaf is omitted when gh's stderr is empty.
        //        this stub is exactly that case — exit 1, silent — so the
        //        refusal rendered an instruction to read text that is not on
        //        screen, and a human stops to hunt for it on an already-failing
        //        path (rule.forbid.surprises).
        //
        // ⇒ the same output ALSO carries the correct remedy, so an assert on
        //        the remedy passes in both worlds. the teeth have to be on the
        //        claim about evidence, which is the only part that differs.
        //
        // .note = [t1c] is the complement: there gh DOES speak, and the lead
        //        must point at its words. the pair pins both directions, so a
        //        repair that hard-codes either lead breaks one of the two.
        expect(result.stdout).not.toContain("read gh's words above");
        expect(result.stderr).not.toContain("read gh's words above");
        expect(result.stdout).toContain('gh said no more');
      });

      then('it offers the two grove-agnostic forms', () => {
        expect(result.stdout).toContain('--who @stdin');
        expect(result.stdout).toContain('--who "Name <email>"');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] the gh session resolves to a clone', () => {
      /**
       * .why = the vision's `case=1 [t3]` — @me must REFUSE where the
       *        session is not yours, never substitute. two adjacent tests
       *        each cover half of it: [case5][t1] proves the backstop
       *        refuses a clone identity SUPPLIED as a literal, and
       *        [case9][t0] proves @me refuses when the lookup FAILS.
       *        neither walks @me through to the backstop, so a junior who
       *        wired @me to write state ahead of the guard would leave both
       *        green — and ship the defect under the paved path's own flag.
       *
       * .why = it is also the only clamp on the VIA_AT_ME branch: the lead
       *        swap and the grove note fire nowhere else, so every extant
       *        test leaves those four lines dead.
       *
       * .mock = a `gh` stub that SUCCEEDS with the app-bot payload.
       * .why  = the runner's own gh answers as whoever it is logged in as,
       *         so a session that reads as a clone cannot be reached in a
       *         hermetic harness any other way.
       */
      const runWithCloneGh = (): {
        stdout: string;
        stderr: string;
        exitCode: number;
      } => {
        const tempDir = genTempDir({
          slug: 'git-commit-sponsor-clonegh',
          git: true,
        });
        const fakeBin = genTempDir({ slug: 'sponsor-clone-bin', git: false });
        // .note = the stub matches the ONE signature the skill invokes, and
        //         exits 64 on any other. a blanket stub would answer a future
        //         second `gh` call with this payload, and the test would pass
        //         for the wrong reason (howto.mock-cli-via-path, key point 4).
        fs.writeFileSync(
          path.join(fakeBin, 'gh'),
          `#!/usr/bin/env bash\n[[ "$1" == "api" ]] || { echo "unexpected gh call: $*" >&2; exit 64; }\ncat << 'JSON'\n{"login":"ehm-a-seaturtle[bot]","name":"ehm-a-seaturtle[bot]","id":295111357,"email":null}\nJSON\n`,
        );
        fs.chmodSync(path.join(fakeBin, 'gh'), '755');

        const result = spawnSync('bash', [scriptPath, 'set', '--who', '@me'], {
          cwd: tempDir,
          encoding: 'utf-8', // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            PATH: `${fakeBin}:${process.env.PATH}`,
            __I_AM_HUMAN: 'true',
          },
        });
        return {
          stdout: result.stdout ?? '',
          stderr: result.stderr ?? '',
          exitCode: result.status ?? 1,
        };
      };

      const result = useThen('the bind refuses', () => runWithCloneGh());

      then('it refuses as a robot, never substitutes', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'error: that identity cannot answer for a change',
        );
        expect(result.stdout).toContain('...and it is a robot.');
        expect(result.stderr).toContain('...and it is a robot.');
      });

      then('the lead names the SESSION, never "you named"', () => {
        // .why = @me did not ask the human for a value, so a refusal that
        //        said "you named:" would blame them for the host's answer.
        expect(result.stdout).toContain(
          'the github session on this host reads:',
        );
        expect(result.stdout).not.toContain('you named:');
      });

      then('it states the cloud-grove fact, and claims no grove', () => {
        // .why = the skill runs no grove-detect, so the note reports what a
        //        cloud grove IS, never what THIS host is.
        expect(result.stdout).toContain(
          "on a cloud grove that session is the clone's, never yours",
        );
      });

      then('the whole @me render is pinned', () => {
        // 🔴 .why = the @me refusal is TEXTUALLY DIFFERENT from the literal
        //        one `[case5][t3]` snapshots: it swaps the lead to "the github
        //        session on this host reads:" and adds the grove note. so the
        //        snapshotted literal case does NOT protect these lines, and a
        //        regression in the lead/note swap would ship green — the same
        //        "four lines no test executed" class the ladder already caught
        //        once this drive.
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when("[t1b] the gh session resolves to the clone's own ACCOUNT", () => {
      /**
       * 🔴 .why = THE case the vision names, and the one [t1] does not reach.
       *        [t1] stubs the APP BOT payload, whose name carries `[bot]` —
       *        so it proves only that the `[bot]` marker survives the @me
       *        path. the account a cloud grove is actually logged in as
       *        carries NO marker: name `Seaturtle of'Ehmpathy`, type "User".
       *
       * .why = so this walks the exact measured payload of case=1 [t3]
       *        through `--who @me` end to end. it is the clamp on the roster
       *        entry: revert SEATURTLE_CLONE_* out of is_identity_robot and
       *        this test binds the clone as its own sponsor, exit 0.
       *
       * .mock = a `gh` stub with the MEASURED cloud-grove payload.
       * .why  = verified first-party 2026-09-10 —
       *         `gh api -X GET user` → {"id":259600029,"login":"ehm-seaturtle",
       *         "name":"Seaturtle of'Ehmpathy","type":"User"}. a stub is the
       *         only way to pin it, since the runner's gh answers as whoever
       *         it is logged in as.
       */
      const runWithCloneAccountGh = (): {
        stdout: string;
        stderr: string;
        exitCode: number;
        tempDir: string;
      } => {
        const tempDir = genTempDir({
          slug: 'git-commit-sponsor-cloneacct',
          git: true,
        });
        const fakeBin = genTempDir({
          slug: 'sponsor-cloneacct-bin',
          git: false,
        });
        // .note = signature-matched, as above: exit 64 on any call but `api`
        fs.writeFileSync(
          path.join(fakeBin, 'gh'),
          `#!/usr/bin/env bash\n[[ "$1" == "api" ]] || { echo "unexpected gh call: $*" >&2; exit 64; }\ncat << 'JSON'\n{"login":"ehm-seaturtle","name":"Seaturtle of'Ehmpathy","id":259600029,"email":null}\nJSON\n`,
        );
        fs.chmodSync(path.join(fakeBin, 'gh'), '755');

        const result = spawnSync('bash', [scriptPath, 'set', '--who', '@me'], {
          cwd: tempDir,
          encoding: 'utf-8', // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            PATH: `${fakeBin}:${process.env.PATH}`,
            __I_AM_HUMAN: 'true',
          },
        });
        return {
          stdout: result.stdout ?? '',
          stderr: result.stderr ?? '',
          exitCode: result.status ?? 1,
          tempDir,
        };
      };

      const cloneAcct = useThen('the bind refuses', () =>
        runWithCloneAccountGh(),
      );

      then('it REFUSES — it never binds the clone as its own sponsor', () => {
        expect(cloneAcct.exitCode).toBe(2);
        expect(cloneAcct.stdout).toContain(
          'error: that identity cannot answer for a change',
        );
        expect(cloneAcct.stdout).toContain('...and it is a robot.');
        expect(cloneAcct.stderr).toContain('...and it is a robot.');
      });

      then(
        'NO state is written — a refused bind leaves the tree unbound',
        () => {
          // .why = the sharpest half. a refusal that still wrote the file would
          //        leave the clone bound as its own sponsor and every later
          //        commit would name it — a refusal in the render only.
          expect(
            fs.existsSync(
              path.join(
                cloneAcct.tempDir,
                '.meter',
                'git.commit.sponsor.jsonc',
              ),
            ),
          ).toBe(false);
        },
      );

      then('the whole @me render is pinned', () => {
        // 🔴 .why = THE linchpin cell of the vision, walked through the real
        //        @me path. `[case5][t3]` snapshots the same refusal reached by
        //        a LITERAL value, and that render omits the lead swap and the
        //        grove note — so it protects none of the lines this path adds.
        expect(cloneAcct.stdout).toMatchSnapshot();
      });
    });

    when('[t1c] gh FAILS for a cause that is not a logged-out session', () => {
      /**
       * 🔴 .why = the refusal used to assert one cause — "found no github
       *        session on this host" — for EVERY nonzero gh exit, because
       *        `2>/dev/null` had thrown away the only fact that names the
       *        real one. a rate limit, a dropped network, and an expired
       *        token all read identically, and a human whose session works
       *        was sent to `gh auth login`.
       *
       * .why = the clamp asserts BOTH halves, and the second is the one that
       *        bites: gh's own words must reach the human, AND the wrong
       *        diagnosis must NOT be spoken. a test that only checked for the
       *        remedy would pass under the defect too.
       *
       * .mock = a `gh` stub that exits 4 with a rate-limit message on stderr.
       * ⚠️ .why = the user ID is FAKE. gh's real rate-limit text carries the
       *        caller's own numeric id, so a message copied from a live
       *        terminal would pin a real account into this snapshot
       *        (`rule.forbid.real-identities-in-fixtures`). the assert grades
       *        that gh's words are RELAYED, and a fake id relays identically.
       */
      const ghRateLimited = useThen('the bind refuses', () =>
        runAtMeWithGhStub({
          slug: 'ghfail',
          ghScript: `#!/usr/bin/env bash\necho "gh: API rate limit exceeded for user ID 1234567." >&2\nexit 4\n`,
        }),
      );

      then("gh's own words reach the human, on BOTH streams", () => {
        expect(ghRateLimited.exitCode).toBe(2);
        expect(ghRateLimited.stdout).toContain('gh said:');
        expect(ghRateLimited.stdout).toContain('API rate limit exceeded');
        expect(ghRateLimited.stderr).toContain('API rate limit exceeded');
        // .why = the stub's message is fixed, so the whole render is
        //        hermetic — no host, no path, no timestamp
        expect(ghRateLimited.stdout).toMatchSnapshot();
      });

      then('the exit code gh reported is named, never swallowed', () => {
        expect(ghRateLimited.stdout).toContain('gh failed (exit 4)');
      });

      then('🔴 the lead POINTS at the words, since there are words', () => {
        // .why = the other half of the [t0] pair. gh spoke here, so the lead
        //        must send the reader to what it said. together the two pin
        //        that the lead TRACKS the body rather than a fixed string —
        //        a repair that hard-codes either one breaks the other.
        expect(ghRateLimited.stdout).toContain("read gh's words above");
        expect(ghRateLimited.stdout).not.toContain('gh said no more');
      });

      then('🔴 the WRONG diagnosis is never spoken', () => {
        // .why = the clamp's teeth. restore `2>/dev/null` plus the old text
        //        and this line goes red — the refusal claims a logged-out
        //        session that was never measured.
        expect(ghRateLimited.stdout).not.toContain('found no github session');
        expect(ghRateLimited.stderr).not.toContain('found no github session');
      });

      then('no state is written', () => {
        expect(
          fs.existsSync(
            path.join(
              ghRateLimited.tempDir,
              '.meter',
              'git.commit.sponsor.jsonc',
            ),
          ),
        ).toBe(false);
      });
    });

    when('[t1e] gh FAILS with an ESC and a CR carried in its stderr', () => {
      /**
       * 🔴 .what = the RENDER-side twin of `[t2b]` above. that clamp proves
       *        the sponsored VALUE is guarded against a control character;
       *        this one proves the TEXT BESIDE it — gh's own stderr, routed
       *        through `as_gh_said_body` — is guarded too.
       *
       * .why BOTH bytes = an ESC (`\x1b`) is what lets an injected sequence
       *        rewrite a terminal; a CR (`\r`) is what lets it happen with
       *        no visible trace, by moving the cursor to column 0 and then
       *        writing over the very line that names the fix. a clamp on
       *        only one byte would miss the defect the other reintroduces.
       *
       * .mock = a `gh` stub whose stderr carries a real ESC clear-line
       *         sequence, then a bare CR, around its message.
       */
      const ghHostile = useThen('the bind refuses', () =>
        runAtMeWithGhStub({
          slug: 'ghhostile',
          ghScript:
            '#!/usr/bin/env bash\nprintf "safe\\x1b[2Kmessage\\rhidden" >&2\nexit 4\n',
        }),
      );

      then("gh's message reaches the human, with no control bytes", () => {
        expect(ghHostile.exitCode).toBe(2);
        expect(ghHostile.stdout).toContain('gh said:');
        expect(ghHostile.stdout).toContain('safe');
        expect(ghHostile.stdout).toContain('message');
        expect(ghHostile.stdout).toContain('hidden');
        // the teeth: neither control byte survives into the render. these run
        // on the RAW stdout, so the mask below weakens no safety assert.
        expect(ghHostile.stdout.includes('\x1b')).toBe(false);
        expect(ghHostile.stdout.includes('\r')).toBe(false);

        // .why the MASK = the stripped payload lands as `safe[2Kmessagehidden`
        //        — an honest render of a hostile input, and still a visual
        //        blemish in a committed snapshot, which
        //        rule.forbid.snapshot-visual-blemishes grades a contract
        //        defect regardless of how it was produced. the one volatile-
        //        looking fragment is MASKED, never carved out, so the tree
        //        around it (the `gh said:` lead, the remedy list, the key
        //        order) stays pinned in full per
        //        rule.require.contract-snapshot-exhaustiveness. the literal
        //        bytes remain asserted above, where a reader meets them with
        //        the explanation beside them rather than alone in a .snap.
        const masked = ghHostile.stdout.replace(
          'safe[2Kmessagehidden',
          '<STRIPPED ADVERSARY PAYLOAD — the ESC/CR remnant, see the asserts above>',
        );
        expect(masked).not.toContain('safe[2Kmessagehidden');
        expect(masked).toMatchSnapshot();
      });
    });

    when('[t1d] gh exits 0 with a reply that carries no identity', () => {
      /**
       * 🔴 .why = a zero exit says the CALL completed, and makes no claim at
       *        all about the body. the bare `jq -r` reads in the transformer
       *        would then exit nonzero under `set -euo pipefail` and the
       *        skill would die with jq's raw parse text — no command named,
       *        no remedy, no semantic exit code.
       *
       * .why = the identical un-curated-crash class the shared state reader
       *        was built to remove, one boundary out: there the file was the
       *        untrusted input, here it is the api reply.
       *
       * .mock = a `gh` stub that exits 0 and emits a non-json body.
       */
      const ghJunkBody = useThen('the bind refuses', () =>
        runAtMeWithGhStub({
          slug: 'ghjunk',
          ghScript: `#!/usr/bin/env bash\necho "<html>502 Bad Gateway</html>"\nexit 0\n`,
        }),
      );

      then('the refusal is curated, and the exit code is semantic', () => {
        expect(ghJunkBody.exitCode).toBe(2);
        expect(ghJunkBody.stdout).toContain(
          'error: --who @me got a reply from gh that carries no identity',
        );
        expect(ghJunkBody.stdout).toContain('502 Bad Gateway');
        expect(ghJunkBody.stdout).toMatchSnapshot();
      });

      then("🔴 jq's raw parse text NEVER reaches the human", () => {
        // .why = the clamp's teeth, and it asserts the ABSENCE rather than
        //        the good message — a test that checked only for the curated
        //        line would pass while the crash printed alongside it.
        expect(ghJunkBody.stdout).not.toContain('parse error');
        expect(ghJunkBody.stderr).not.toContain('parse error');
        expect(ghJunkBody.stderr).not.toContain('jq: error');
      });

      then('no state is written', () => {
        expect(
          fs.existsSync(
            path.join(ghJunkBody.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
          ),
        ).toBe(false);
      });
    });

    when('[t1f] gh exits 0 with an EMPTY body', () => {
      /**
       * 🔴 .why = MEASURED, and the shape gate USED TO PASS THIS. `jq -e`
       *        reports on the last OUTPUT value, and empty input produces no
       *        value at all — so the filter never runs and there is no
       *        `false` to report:
       *          $ printf '%s' ''   | jq -e '<filter>'   → exit 0   🔴
       *          $ printf '%s' '{}' | jq -e '<filter>'   → exit 1   ✅
       *        ⇒ the gate said "usable" about a body it never read, and the
       *        transformer then minted `<+@users.noreply.github.com>` — an
       *        address for a human who does not exist, bound as a sponsor.
       *
       * 🔴 .why = [t1d] is the twin and it does NOT cover this. an html body
       *        fails to PARSE, which jq reports; an empty body produces no
       *        value, which jq does not. two different jq behaviors behind
       *        one gate, and only one of them was clamped.
       *
       * .why = a zero exit with zero bytes is real — a proxy that answers an
       *        empty 200, or any wrapper that swallows the body. it is also
       *        what a stalled `gh` yields once its stall is not bounded,
       *        which is how this was found.
       *
       * .mock = a `gh` stub that exits 0 and emits no bytes at all.
       */
      const ghEmptyBody = useThen('the bind refuses', () =>
        runAtMeWithGhStub({
          slug: 'ghempty',
          ghScript: `#!/usr/bin/env bash\nexit 0\n`,
        }),
      );

      then('the refusal names the absent identity, never a bad shape', () => {
        expect(ghEmptyBody.exitCode).toBe(2);
        expect(ghEmptyBody.stdout).toContain(
          'error: --who @me got a reply from gh that carries no identity',
        );
        expect(ghEmptyBody.stdout).toMatchSnapshot();
      });

      then('🔴 NO address is ever fabricated from the absent fields', () => {
        // 🔴 the clamp's teeth. revert the gate to a bare `jq -e` and this
        //    line goes red: the run reaches the far `Name <email>` guard and
        //    shows the human `<+@users.noreply.github.com>` — a value they
        //    never supplied, for a person who does not exist.
        expect(ghEmptyBody.stdout).not.toContain('users.noreply.github.com');
        expect(ghEmptyBody.stderr).not.toContain('users.noreply.github.com');
        expect(ghEmptyBody.stdout).not.toContain("not a 'Name <email>'");
      });

      then('no state is written', () => {
        expect(
          fs.existsSync(
            path.join(
              ghEmptyBody.tempDir,
              '.meter',
              'git.commit.sponsor.jsonc',
            ),
          ),
        ).toBe(false);
      });
    });

    when('[t2] the gh session resolves to a human', () => {
      /**
       * .why = the OTHER half of the `source` enum. without it only
       *        `supplied` is proven, so a hardcoded `"supplied"` would pass
       *        every other test in this file. provenance is part of the
       *        value (domain.terms/sponsor.md), and a value that always
       *        reports one origin carries no provenance at all.
       *
       * .mock = a `gh` stub with a human payload, shadowed onto PATH.
       * .why  = the runner's own gh answers as whoever it is logged in as,
       *         so a deterministic human session needs a stub. it also
       *         keeps the assert off the CI runner's identity.
       *
       * 🔴 .why = the payload is a PLAINLY FAKE human, and that is load-
       *        bearing rather than taste. this case wants a human distinct
       *        from the clone, and the path of least resistance is to reach
       *        for a real one — the exact habit
       *        `rule.forbid.real-identities-in-fixtures` names. a real
       *        login+id here DERIVES a real noreply address and pins it into
       *        a COMMITTED snapshot, which ships to every clone and fork and
       *        cannot be un-shipped once it lands on a remote.
       *        ⚠️ the suite does not care WHOSE name renders, only that a
       *        name renders — so a real identity buys no coverage at all and
       *        costs a leak.
       */
      const runWithHumanGh = (): {
        stdout: string;
        exitCode: number;
        tempDir: string;
      } => {
        const tempDir = genTempDir({
          slug: 'git-commit-sponsor-humangh',
          git: true,
        });
        const fakeBin = genTempDir({ slug: 'sponsor-human-bin', git: false });
        // .note = signature-matched, as above: exit 64 on any call but `api`
        fs.writeFileSync(
          path.join(fakeBin, 'gh'),
          `#!/usr/bin/env bash\n[[ "$1" == "api" ]] || { echo "unexpected gh call: $*" >&2; exit 64; }\ncat << 'JSON'\n{"login":"ada-lovelace","name":"Ada Lovelace","id":1234567,"email":null}\nJSON\n`,
        );
        fs.chmodSync(path.join(fakeBin, 'gh'), '755');

        const result = spawnSync('bash', [scriptPath, 'set', '--who', '@me'], {
          cwd: tempDir,
          encoding: 'utf-8', // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            PATH: `${fakeBin}:${process.env.PATH}`,
            __I_AM_HUMAN: 'true',
          },
        });
        return {
          stdout: result.stdout ?? '',
          exitCode: result.status ?? 1,
          tempDir,
        };
      };

      const result = useThen('the bind succeeds', () => runWithHumanGh());

      then('the source reads "me" — a session this host answered', () => {
        expect(result.exitCode).toBe(0);
        expect(JSON.parse(readState(result.tempDir)).sponsor.source).toBe('me');
        expect(result.stdout).toContain('source: me');
      });

      then('the email derives from id+login when gh reports none', () => {
        // .why = `gh api user` returns a null email for most accounts, so
        //        the noreply address is derived. the shape is github's own,
        //        and it is what the trailer will carry.
        expect(JSON.parse(readState(result.tempDir)).sponsor.email).toBe(
          '1234567+ada-lovelace@users.noreply.github.com',
        );
      });

      then('the whole SUCCESS render is pinned', () => {
        // 🔴 .why = this is `case=6`, the local-grove happy path, and it was
        //        the ONE @me render asserted by fields alone while every
        //        refusal path snapshots. a field assert proves each value is
        //        present; only a snapshot proves the tree still reads right —
        //        the order of its leaves, its header, and that no line was
        //        wedged between them.
        //
        // ⚠️ .why = the asymmetry mattered in the direction a reader would
        //        least expect: the SHARP paths were all pinned and the HAPPY
        //        one was not, so a human who reads a diff could eyeball every
        //        refusal and not the success they are all built to reach.
        expect(result.stdout).toMatchSnapshot();
      });

      then('`get` renders the me-sourced value back', () => {
        // 🔴 .why = `source` has exactly TWO legal values and every seed
        //        writes `supplied`, so the `get` line `source: $SPONSOR_SOURCE`
        //        was only ever exercised with one of them. the assert above
        //        pins the SET render; this runs the bound tree through the
        //        OTHER command that reads it.
        //
        // .why = a regression that rendered `me` as `supplied` in `get`, or
        //        dropped the line on me-bound trees, would ship green — the
        //        set render would still be right. two commands read this
        //        state and both owe coverage of both values.
        const read = spawnSync('bash', [scriptPath, 'get'], {
          cwd: result.tempDir,
          encoding: 'utf-8', // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(read.status).toBe(0);
        expect(read.stdout).toContain('source: me');
        expect(read.stdout).toMatchSnapshot();
      });
    });

    when('[t3] the gh cli is absent from the host', () => {
      /**
       * .why = the FIRST branch of @me, and the only one no test reached.
       *        both neighbours are covered — [t0] a failed lookup, [t1] a
       *        clone session — so this guard shipped as an untested claim.
       *
       * .why = it is a MESSAGE guarantee, never a safety one: delete it and
       *        the bare `gh` call still fails into [t0]'s refusal, at the
       *        same exit 2. what the human loses is the sentence that names
       *        the absent cli, and a refusal that misnames its cause sends
       *        the reader to `gh auth login` for a cli they do not have.
       *
       * .why = PATH becomes a shim dir and no other entry, so `gh` is absent
       *        wherever the host keeps it. a filter over the real PATH looked
       *        cheaper and was wrong: `gh` shares /usr/bin with `dirname`,
       *        which line 29 needs to find its own SCRIPT_DIR — so the drop
       *        killed the run at exit 1 before any guard spoke.
       *
       * .why = the shim carries the exact deps this path uses, resolved from
       *        the host by absolute route (rule.forbid.bare-host-deps: a test
       *        provisions what it needs). a tool absent from the host is
       *        skipped rather than fatal, so the list may be generous.
       */
      const result = useThen('the bind refuses', () => {
        const shimBin = genTempDir({ slug: 'sponsor-no-gh-bin', git: false });
        // .note = `bash` and `env` belong on this list. spawnSync resolves the
        //         CHILD executable against the CHILD env's PATH, so a shim
        //         without bash fails the spawn itself — status null, stdout
        //         empty, exit 1. that reads exactly like a skill that crashed,
        //         which is how it cost two runs to spot.
        for (const tool of [
          'bash',
          'env',
          'git',
          'dirname',
          'cat',
          'tr',
          'jq',
          'rm',
        ]) {
          const resolved = spawnSync('bash', ['-c', `command -v ${tool}`], {
            encoding: 'utf-8', // note: library api requires this term
          }).stdout.trim();
          if (resolved) fs.symlinkSync(resolved, path.join(shimBin, tool));
        }
        const pathNoGh = shimBin;

        const tempDir = genTempDir({ slug: 'sponsor-no-gh', git: true });
        const spawned = spawnSync('bash', [scriptPath, 'set', '--who', '@me'], {
          cwd: tempDir,
          encoding: 'utf-8', // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, PATH: pathNoGh, __I_AM_HUMAN: 'true' },
        });
        return {
          stdout: spawned.stdout ?? '',
          stderr: spawned.stderr ?? '',
          exitCode: spawned.status ?? 1,
        };
      });

      then('it names the absent cli, on BOTH streams', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('needs the gh cli, and it is absent');
        expect(result.stderr).toContain('needs the gh cli, and it is absent');
      });

      then('it never sends the reader to gh auth login', () => {
        // .why = [t0]'s refusal offers `gh auth login`, which is the right
        //        move for a failed session and the wrong one for an absent
        //        cli. the two refusals must stay distinct.
        expect(result.stdout).not.toContain('gh auth login');
        expect(result.stdout).toContain('--who @stdin');
        expect(result.stdout).toContain('--who "Name <email>"');
      });

      then('the whole refusal render is pinned', () => {
        // 🔴 .why = this was the ONE `@me` refusal asserted by `toContain`
        //        alone, while every twin — [t0], [t1], [t1b], [t1c], [t1d] —
        //        and the success [t2] all snapshot. so a reviewer could
        //        eyeball every other blocked state in a diff and not this one.
        //
        // 🔴 .why = and the guarantee this branch carries IS its text. the
        //        `then` above proves `gh auth login` is absent TODAY; only a
        //        snapshot catches the reverse drift, where a reworded refusal
        //        sends a reader to authenticate a cli they do not have.
        //        a `toContain` set proves each phrase is present; only a
        //        snapshot proves no line was wedged between them.
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t4] gh STALLS, and the timeout is lowered to 1s', () => {
      /**
       * 🔴 .why = the skill's own comment calls a stall "the one outcome worse
       *        than an error, because it reports naught at all", and says the
       *        stall lands on the ONE act that unblocks a sponsorless tree.
       *        that is the sharpest guarantee on this branch — and every
       *        extant `@me` test drives a gh that RETURNS (fails fast, or
       *        answers). so a regression that dropped the `timeout` wrapper
       *        would leave the whole suite green and ship an unbounded
       *        network call on the paved path (rule.require.clamp-edge-cases).
       *
       * .why = the precedent this mirrors IS clamped — the keyrack fetch's
       *        own bound is proven at `git.commit.push.integration.test.ts`
       *        [case32] with a stalled fake `rhachet` and the same lowered
       *        constant. this branch cites that discipline in its `.note` and
       *        had no equivalent of its own.
       *
       * .mock = a `gh` stub that SLEEPS. with EXTERNAL_CALL_TIMEOUT=1 the call
       *         is bound to ~1s and `timeout` kills it with exit 124; without
       *         the wrapper the stub runs to completion and exits 0 with an
       *         EMPTY body, which routes to a different refusal entirely.
       *         ⇒ that divergence is what separates the two, and it is a
       *         difference in TEXT rather than in elapsed time — so the clamp
       *         needs no clock (rule.forbid.time-assumptions).
       */
      const result = useThen('the bind refuses, fast', () => {
        const tempDir = genTempDir({
          slug: 'git-commit-sponsor-stallgh',
          git: true,
        });
        const fakeBin = genTempDir({ slug: 'sponsor-stall-bin', git: false });
        fs.writeFileSync(
          path.join(fakeBin, 'gh'),
          '#!/usr/bin/env bash\nsleep 10\nexit 0\n',
        );
        fs.chmodSync(path.join(fakeBin, 'gh'), '755');

        const spawned = spawnSync('bash', [scriptPath, 'set', '--who', '@me'], {
          cwd: tempDir,
          encoding: 'utf-8', // note: library api requires this term
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            PATH: `${fakeBin}:${process.env.PATH}`,
            __I_AM_HUMAN: 'true',
            EXTERNAL_CALL_TIMEOUT: '1',
          },
        });
        return {
          stdout: spawned.stdout ?? '',
          stderr: spawned.stderr ?? '',
          exitCode: spawned.status ?? 1,
        };
      });

      then('🔴 the stall becomes a bounded refusal, on BOTH streams', () => {
        // 🔴 THIS is the assert that bites, and it bites without a clock.
        //    `124` is what `timeout` exits when it KILLS the child, so the
        //    status is evidence the bound fired — it cannot be reached any
        //    other way. the refusal reports the MEASURED status and never
        //    invents a cause.
        //
        // 🔴 .why = MEASURED, by removal of the `timeout` wrapper. this file
        //    once carried a wall-clock assert beside this one, whose comment
        //    claimed it was "the assert that bites" and that "every other
        //    assert above still passes" without the wrapper. ⚠️ BOTH claims
        //    were false. with the wrapper dropped, THREE asserts go red and
        //    this is one of them:
        //
        //      ✕ the stall becomes a bounded refusal, on BOTH streams
        //      ✕ the bound actually FIRES, well under the 10s stall
        //      ✕ it still offers the two grove-agnostic forms
        //
        //    ⇒ the mechanism the old comment missed: an unwrapped `gh` exits
        //    0 with an EMPTY body, so the run never reaches "gh failed" at
        //    all — it reaches the no-identity refusal instead, and every
        //    assert about the timeout text fails with it.
        //
        // ⇒ .why = so the wall-clock assert was REDUNDANT, and it was a time
        //    assumption sensitive to spawn cost and CI load
        //    (rule.forbid.time-assumptions). the deterministic asserts carry
        //    the whole clamp, so the clock is gone and the teeth remain.
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('gh failed (exit 124)');
        expect(result.stderr).toContain('gh failed (exit 124)');
      });

      then('it still offers the two grove-agnostic forms', () => {
        expect(result.stdout).toContain('--who @stdin');
        expect(result.stdout).toContain('--who "Name <email>"');
        // the killed child writes no stderr, so both streams are deterministic
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] the REAL gh cli answers — no stub, no PATH shadow', () => {
      /**
       * 🔴 .what = the one external contract this skill holds
       *        (`gh api -X GET user`, the github REST API) walked end to end
       *        against the REAL service, with the runner's real credentials.
       *
       * .why = every other `--who @me` test in [case9] shims `gh` onto PATH
       *        — a needed clamp for the FAILURE shapes (a dead session, a
       *        rate limit, a killed timeout), none of which the real service
       *        will hand us on demand. but the SUCCESS path never needs a
       *        shim: the runner's own `gh` answers with a real session on
       *        every host this suite runs on (dev sandbox and CI alike — see
       *        the `[t1]` comment above, "the runner's own gh IS logged in,
       *        so the real call succeeds"). that fact, stated but never
       *        exercised, is what left the whole external boundary covered
       *        only by a fake — rule.require.external-contract-integration-tests.
       *
       * .why the assert is on the ROBOT refusal, never a bare success = the
       *        real session on every runner this repo owns belongs to a
       *        clone (a seaturtle bot or the seaturtle account itself), so a
       *        live call HERE always resolves to the identity `[t1b]`
       *        measured and pinned by hand. that is not a weaker test — it
       *        is the one outcome a real call to this boundary can prove on
       *        infrastructure we control, and it is the exact drift class
       *        the rule guards against: a live `gh api user` shape change
       *        (a renamed field, an added required scope) would surface
       *        here as either a real refusal-shape mismatch or a real
       *        gh-call failure, never silently, because nothing on this path
       *        is scripted.
       */
      const result = useThen('the real gh call resolves', () =>
        runInTempGitRepo({ sponsorArgs: ['set', '--who', '@me'] }),
      );

      then('gh answered for real, and the identity it named is refused', () => {
        // exit 2 either way: a real session that answers is a robot here, and
        // is refused (case=1 [t3] / [t1b] above); an absent real session
        // would refuse via the gh-failure path proven in [t0]/[t1c]/[t1e] —
        // both are legitimate outcomes of a REAL call, never a crash
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('🐢 bummer dude...');
      });

      then('the refusal traces to a REAL gh call, never a fixture', () => {
        // .why = the two real, mutually-exclusive shapes this boundary can
        //        return on infra we control. either is acceptable; a THIRD
        //        shape (a crash, an invented identity, a bare success) is not
        //        — and would fail this assert.
        //
        // 🔴 .note = "either is acceptable" is the whole contract of a live
        //        boundary, and it is why this block pins no snapshot. see the
        //        measured note below.
        const refusedAsRobot = result.stdout.includes(
          'error: that identity cannot answer for a change',
        );
        const ghCallFailed = result.stdout.includes(
          'error: --who @me asked gh for your identity, and gh failed',
        );
        expect(refusedAsRobot || ghCallFailed).toBe(true);

        // 🔴 .why NO snapshot here, though every peer in this file pins one
        //        = a snapshot pins ONE render, and the assert above declares
        //        TWO are legal. which one a live call produces is decided by
        //        the host's ambient `gh auth` state — a value this test READS
        //        and does not CONTROL. ⇒ to pin either makes the suite grade
        //        the runner's login rather than the skill
        //        (rule.require.hermetic-tests).
        //
        // ⚠️ .measured = an earlier draft snapshotted a masked render. it went
        //        green on a dev host (gh logged in → the robot refusal) and
        //        RED in ci (no session → the gh-failure refusal). the same
        //        commit, two verdicts, one ambient input.
        //
        // ✅ .why no coverage is lost = both literal renders are ALREADY
        //        pinned, by the scripted twins that can hold `gh` still:
        //        `[t0]` (logged-out), `[t1]` (a clone session), `[t1c]` (a
        //        non-auth gh failure). ⇒ exhaustiveness is satisfied there,
        //        where the input is controlled; this `[t2]` exists to prove
        //        the call is REAL, and that is what it asserts.
        //
        // ⇒ so the structural shell is asserted directly, on the parts BOTH
        //   legal shapes share — a real claim, and one no host can flip.
        expect(result.stdout).toContain('🐢 bummer dude...');
        expect(result.stdout).toContain('🐚 git.commit.sponsor set');
        expect(result.stdout).toContain('   └─ error: ');

        // .why = the remedy carries the weight of any refusal, and both
        //        shapes owe the two grove-agnostic forms — never `@me`, which
        //        is what just failed (case=3's rule)
        expect(result.stdout).toContain(
          "$ printf 'Name <email>' | rhx git.commit.sponsor set --who @stdin",
        );
        expect(result.stdout).toContain(
          '$ rhx git.commit.sponsor set --who "Name <email>"',
        );
      });

      then('no state is written on a refused real bind', () => {
        expect(
          fs.existsSync(
            path.join(result.tempDir, '.meter', 'git.commit.sponsor.jsonc'),
          ),
        ).toBe(false);
      });
    });
  });

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
        expect(result.stdout).toContain('--who @me');
        expect(result.stdout).toContain("YOUR OWN 'gh auth login'");
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
