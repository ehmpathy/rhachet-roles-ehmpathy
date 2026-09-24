import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  utimesSync,
  writeFileSync,
} from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { asWriteJson } from './asWriteJson';
import { genHookTempCwd } from './genHookTempCwd';
import { runHookIn } from './runHookIn';

/**
 * .what = the two vision experience cases that span MORE than one invocation
 * .why = every other suite here grades one hook on one call. `case=4` and
 *        `case=8` are claims about a SEQUENCE, and a sequence claim cannot be
 *        assembled from single-call tests — two green tests in one file do not
 *        prove the second call saw the first.
 *
 * 🔴 .why a file of its own = both cases are otherwise demonstrated by
 *         INFERENCE. `case=4` is true by construction (no cache ships, F3
 *         rejected) and that is not a demonstration of a sequence; `case=8`'s
 *         compound claim would be inferred from each hook's clock test in
 *         isolation. ⇒ `rule.require.experience-catalog-evolution` makes a
 *         critipath owe a REAL test by the time verification passes, and
 *         inference is not one.
 *
 * ⚠️ .note = "true by construction" is the reason these clamps are CHEAP, never a
 *            reason to skip them. the construction that makes them true is the
 *            unconditional list re-read — the exact line this wish was asked to
 *            cut. a future optimization that reinstates a cache turns every
 *            assertion here red, which is the whole point of a record.
 *
 * ⚠️ .note = the fixtures below hold a REAL blocklisted term and a REAL gerund,
 *            because a gate test that trips no gate proves naught. both hooks
 *            refused this file as it was authored, which is the mechanism at
 *            work rather than a defect.
 */
describe('pretooluse.forbid-terms — the multi-call journeys', () => {
  const hookBlocklist = path.join(
    __dirname,
    'pretooluse.forbid-terms.blocklist.sh',
  );
  const hookGerunds = path.join(
    __dirname,
    'pretooluse.forbid-terms.gerunds.sh',
  );

  /**
   * .what = the vision's `case=4` — a term list change binds on the NEXT edit
   * .why = the invariant is acceptance #2 ("every term either hook blocks today,
   *        it still blocks"), and nobody set it deliberately — the hooks hold it
   *        by ACCIDENT, because their wasteful unconditional read makes freshness
   *        free. this pins the property so the accident becomes a contract.
   */
  given('[case4] a maintainer changes a word list between two edits', () => {
    const TERM = 'kelpwrangle';

    /**
     * .what = a temp dir with a copy of the blocklist hook and a list we control
     * .why = the hook resolves its list from `${BASH_SOURCE[0]%/*}`, so a copy of
     *        the hook into a temp dir reads the list beside it — which is how a
     *        list edit is staged without a write to the repo's own
     *        (`rule.require.hermetic-tests`).
     */
    const genSandbox = (): string => {
      const dir = genTempDir({ slug: 'hook-freshness' });
      mkdirSync(path.join(dir, '.claude'), { recursive: true });
      writeFileSync(
        path.join(dir, '.claude', 'terms.blocklist.nudges.local.json'),
        '{}',
      );
      copyFileSync(
        hookBlocklist,
        path.join(dir, 'pretooluse.forbid-terms.blocklist.sh'),
      );
      return dir;
    };

    const setList = (input: { dir: string; terms: string[] }): void =>
      writeFileSync(
        path.join(input.dir, 'terms.blocklist.jsonc'),
        // ⚠️ the key is `terms`, matching the hook's `(.terms // [])`. an earlier
        //    draft wrote `blocked`, which loaded ZERO terms and opened the gate.
        //    [t2]'s own assertion ("the retirement binds, exit 0") then passed
        //    VACUOUSLY — it was the `before` CONTROL that caught the fixture bug.
        //    ⇒ that is why each sequence case asserts its setup step blocked
        //      before it asserts the payoff step permitted.
        JSON.stringify({
          terms: input.terms.map((term) => ({
            term,
            why: `${term} is a test term`,
            alt: ['seaweed', 'kelp'],
          })),
        }),
      );

    /**
     * .what = one hook run against a NAMED file path
     * .why = 🔴 `filePath` is required, and it is the whole reason this helper
     *        takes a second arg. the HARDNUDGE key is `sha256(file_path)`, so two
     *        steps of a sequence that share a path share a nudge record — and the
     *        SECOND step is then permitted by the 300s retry window rather than
     *        by the list change the case means to measure.
     *
     * 🔴 .note = found by `[t5]`, which went red because its third step was
     *            permitted by a clock rather than by its list. ⚠️ the same
     *            confound sat under `[t2]`, where it was INVISIBLE — its payoff
     *            assertion expects exit 0, which is what BOTH the retirement and
     *            the retry window produce. ⇒ `[t2]` was green for a reason it did
     *            not name, and only the case whose payoff expects a BLOCK could
     *            surface it. a distinct path per step removes the variable.
     */
    const runIn = (input: { dir: string; filePath: string }) =>
      runHookIn({
        hookPath: path.join(input.dir, 'pretooluse.forbid-terms.blocklist.sh'),
        json: asWriteJson({
          filePath: input.filePath,
          content: `const note = '${TERM}';`,
        }),
        cwd: input.dir,
      });

    when('[t1] the maintainer ADDS a term, then an editor writes it', () => {
      const outcome = useBeforeAll(async () => {
        const dir = genSandbox();
        setList({ dir, terms: [TERM] });
        return runIn({ dir, filePath: 'surf-a.ts' });
      });

      then('the hook exits 2 — the new term binds at once', () => {
        // 🔴 acceptance #2. no rebuild, no restart, no cache flush between the
        //    list write and the edit — the very next invocation honors it.
        expect(outcome.exitCode).toEqual(2);
      });

      then('stderr names the new term, with ITS why and ITS alt', () => {
        // the detail travels with the term. a cache keyed on anything coarser
        // than the list itself could serve the right VERDICT with stale DETAIL,
        // so the detail is asserted rather than the exit code alone.
        expect(outcome.stderr).toContain(TERM);
        expect(outcome.stderr).toContain(`${TERM} is a test term`);
        expect(outcome.stderr).toContain('seaweed');
      });

      then('and the WHOLE refusal render is snapshotted', () => {
        // 🔴 the three fragments above prove the term, its why, and its alt
        //    each APPEAR somewhere in the render —
        //    they cannot see whether the three are PAIRED under one `⛔`, nor
        //    whether a freshly-added term renders in the same shape a ported
        //    one does. that equivalence is the whole claim of `case=4` `[t0]`,
        //    and it is a shape claim, so it needs a shape assertion.
        //
        // .note = deterministic by construction: `filePath` is the fixed
        //         relative `surf-a.ts` and every rendered term comes from the
        //         fixture list set above, so the sandbox path reaches no line.
        expect(outcome.stderr).toMatchSnapshot();
      });
    });

    when(
      '[t2] the maintainer RETIRES the term, then the same edit runs',
      () => {
        const outcome = useBeforeAll(async () => {
          const dir = genSandbox();
          setList({ dir, terms: [TERM] });
          const before = runIn({ dir, filePath: 'surf-a.ts' });

          // the maintainer's edit: the term is dropped from the list
          setList({ dir, terms: ['otherterm'] });
          // 🔴 a DIFFERENT path, so no nudge record from `before` can permit this
          const after = runIn({ dir, filePath: 'surf-b.ts' });

          return { before, after };
        });

        then('the FIRST edit was refused — the control', () => {
          // ⚠️ without this, [t2] could pass because the hook never blocks at all.
          //    the pair is the proof; the second call alone is a coin with one face.
          expect(outcome.before.exitCode).toEqual(2);
        });

        then('the SECOND edit exits 0 — the retirement binds at once', () => {
          // 🔴 the inverse direction, and the one a stale cache breaks LOUDLY
          //    rather than silently. it is pinned because acceptance #2 is
          //    two-directional: "every term either hook PERMITS today, it still
          //    permits".
          expect(outcome.after.exitCode).toEqual(0);
        });
      },
    );

    when('[t5] the list is restored with an OLDER mtime', () => {
      // 🔴 the hazard the vision found only at its review r5, and the one that
      //    is PERMANENT rather than self-healing: `cp -p`, `rsync -a`, `tar -xp`
      //    and `touch -r` all restore a file with an mtime in the PAST. a cache
      //    keyed on "did the mtime change?" reads such a list as fresh forever —
      //    no later edit clears it, only a delete of the cache file.
      //
      // ✅ it holds by construction today: no cache shipped, so the list on disk
      //    is the list that governs regardless of its clock. that is exactly the
      //    argument that retired the cache (F3), and this is its clamp.
      const outcome = useBeforeAll(async () => {
        const dir = genSandbox();
        // 🔴 three steps, three DISTINCT paths. each is a first attempt, so the
        //    list on disk is the only variable across them.
        setList({ dir, terms: [TERM] });
        const before = runIn({ dir, filePath: 'surf-a.ts' });

        setList({ dir, terms: ['otherterm'] });
        const permitted = runIn({ dir, filePath: 'surf-b.ts' });

        // the restore, with a clock a full day in the past
        setList({ dir, terms: [TERM] });
        const aDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        utimesSync(path.join(dir, 'terms.blocklist.jsonc'), aDayAgo, aDayAgo);
        const after = runIn({ dir, filePath: 'surf-c.ts' });

        return { before, permitted, after };
      });

      then('the two control steps behaved as [t1] and [t2] did', () => {
        expect(outcome.before.exitCode).toEqual(2);
        expect(outcome.permitted.exitCode).toEqual(0);
      });

      then('the RESTORED list governs, despite its older clock', () => {
        // the restored list forbids the term again, so the write is refused
        // again. a mtime-keyed cache would answer 0 here — permanently.
        expect(outcome.after.exitCode).toEqual(2);
        expect(outcome.after.stderr).toContain(TERM);
      });
    });
  });

  /**
   * .what = the vision's `case=8` — the dense journey, as ONE sequence
   * .why = it is the centered demo by boundary density, and its compound claim
   *        is the one no single-hook test can reach: an override taken at one
   *        gate must NOT open the other.
   */
  given('[case8] one file, one session, both gates', () => {
    const genSharedCwd = (): string => {
      // 🔴 `null`, then BOTH nudge files written explicitly. the two clocks are
      //    the subject of this case, so they are seeded at the call site where a
      //    reader can see there are two of them — never behind a default.
      const dir = genHookTempCwd({
        slug: 'hook-journey',
        nudgeFileName: null,
      });
      writeFileSync(
        path.join(dir, '.claude', 'terms.blocklist.nudges.local.json'),
        '{}',
      );
      writeFileSync(
        path.join(dir, '.claude', 'terms.gerunds.nudges.local.json'),
        '{}',
      );
      return dir;
    };

    const FILE = 'surf.ts';
    const WITH_TERM = "const x = 'nothing';";
    const WITH_GERUND = 'const y = processing;';

    when(
      '[t0] an editor trips the blocklist, overrides, then trips gerunds',
      () => {
        const outcome = useBeforeAll(async () => {
          const cwd = genSharedCwd();

          // 1 — a write that trips the BLOCKLIST gate
          const blocked = runHookIn({
            hookPath: hookBlocklist,
            json: asWriteJson({ filePath: FILE, content: WITH_TERM }),
            cwd,
          });

          // 2 — the deliberate retry, which opens the BLOCKLIST clock for FILE
          const overridden = runHookIn({
            hookPath: hookBlocklist,
            json: asWriteJson({ filePath: FILE, content: WITH_TERM }),
            cwd,
          });

          // 3 — the SAME path, same session, now tripping the GERUNDS gate
          const gerundBlocked = runHookIn({
            hookPath: hookGerunds,
            json: asWriteJson({ filePath: FILE, content: WITH_GERUND }),
            cwd,
          });

          // 4 — and its own deliberate retry
          const gerundOverridden = runHookIn({
            hookPath: hookGerunds,
            json: asWriteJson({ filePath: FILE, content: WITH_GERUND }),
            cwd,
          });

          /**
           * .what = how many nudge records each hook's OWN file holds
           * .why = 🔴 an earlier draft read the .claude FILENAMES here and
           *        claimed that caught a weld. it does NOT — this harness seeds
           *        both filenames itself, so the read returns two either way.
           *        MEASURED: under a staged weld (the gerunds hook pointed at the
           *        blocklist's nudge file) that assertion stayed GREEN while step
           *        3 went red.
           *        ⇒ a clamp whose subject the FIXTURE supplies cannot observe
           *          the code. the records are written by the HOOKS, so a tally
           *          of those reads the axis instead of a stand-in for it.
           */
          const tallyRecords = (name: string): number =>
            Object.keys(
              JSON.parse(
                readFileSync(path.join(cwd, '.claude', name), 'utf-8'),
              ) as Record<string, unknown>,
            ).length;

          return {
            blocked,
            overridden,
            gerundBlocked,
            gerundOverridden,
            recordsBlocklist: tallyRecords('terms.blocklist.nudges.local.json'),
            recordsGerunds: tallyRecords('terms.gerunds.nudges.local.json'),
          };
        });

        then('step 1 — the blocklist gate refuses', () => {
          expect(outcome.blocked.exitCode).toEqual(2);
        });

        then('step 2 — the retry is permitted, within the window', () => {
          expect(outcome.overridden.exitCode).toEqual(0);
        });

        then('🔴 step 3 — the GERUNDS gate still refuses the same path', () => {
          // 🔴 THE compound claim, and the one that cannot be assembled from two
          //    single-hook tests. the blocklist override at step 2 wrote a nudge
          //    record keyed on sha256(surf.ts) — the SAME key the gerunds hook
          //    computes for the SAME path. only the FILE they write it to differs.
          //
          //    ⇒ so if the two hooks ever shared one nudge file, this call reads
          //      step 2's record as its own override and returns 0. a forbidden
          //      term would then land unrefused, at a gate nobody overrode. that
          //      is vision constraint #1, and this is the only assertion in the
          //      suite that can observe it.
          expect(outcome.gerundBlocked.exitCode).toEqual(2);
          expect(outcome.gerundBlocked.stderr).toContain('processing');
        });

        then('step 4 — the gerunds gate honors ITS OWN retry', () => {
          // the second clock works exactly like the first. independence is not
          // "the second gate never opens" — it is "each opens only for itself".
          expect(outcome.gerundOverridden.exitCode).toEqual(0);
        });

        then('and EACH clock file holds its own hook\u2019s record', () => {
          // the mechanism behind the behavior above, pinned at the axis. under a
          // weld the blocklist file holds BOTH records and the gerunds file
          // holds zero — so a `1, 1` split is the shape only two real clocks
          // produce.
          expect(outcome.recordsBlocklist).toEqual(1);
          expect(outcome.recordsGerunds).toEqual(1);
        });

        then(
          '🔴 the WHOLE four-step render is snapshotted — the centered demo',
          () => {
            // 🔴 every assertion above reads an exit code or one `toContain`
            //    fragment, so none makes the four steps' actual TEXT diffable
            //    — and that text is the whole of what a human experiences on
            //    this journey. the single-call suites snap their messages; the
            //    centered demo owes the same.
            //
            // ✅ one snapshot over all four steps, rather than four apart: the
            //    claim of `case=8` is about the SEQUENCE, so its render belongs
            //    in one view where the alternation of refuse/permit/refuse/permit
            //    is legible at a glance. a weld of the two clocks turns step 3
            //    from a refusal into an empty string, and that reads instantly
            //    here in a way four separate snapshots would scatter.
            //
            // .note = deterministic by construction: `FILE` is the fixed relative
            //         `surf.ts`, so the `file:` line carries no mkdtemp suffix,
            //         and the terms come from the ported lists rather than a
            //         fixture clock.
            expect({
              'step1.blocklist.refusal': outcome.blocked.stderr,
              'step2.blocklist.retry.permitted': outcome.overridden.stderr,
              'step3.gerunds.refusal': outcome.gerundBlocked.stderr,
              'step4.gerunds.retry.permitted': outcome.gerundOverridden.stderr,
            }).toMatchSnapshot();
          },
        );
      },
    );
  });
});
