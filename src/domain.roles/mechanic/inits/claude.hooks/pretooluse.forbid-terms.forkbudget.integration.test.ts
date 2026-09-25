import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { ConstraintError } from 'helpful-errors';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { asResolvedToolPaths } from './asResolvedToolPaths';
import { asSubshellSites } from './asSubshellSites';
import { asTallyByTool } from './asTallyByTool';
import { genHookTempCwd } from './genHookTempCwd';

/**
 * .what = clamps the fork budget of the two forbid-terms hooks
 * .why = acceptance #1 sets a bar (under 10 processes per hook, clean path) and
 *        acceptance #6 demands the count be held by a TEST, never by a number in
 *        a doc — "a count that is only measured in a yield drifts back on the
 *        next edit to the file"
 *
 * .how = a PATH shim at the head of PATH: one small wrapper per external tool,
 *        each appends its own name to a tally file, then execs the real binary
 *        by absolute path.
 *        - behavior-neutral: the shim execs, so no verdict can shift
 *        - fork-neutral: exec replaces the process, so the shim adds no fork
 *        - deterministic: it counts discrete events, never elapsed time, so it
 *          cannot flake under load — the exact condition this wish exists for
 *
 * .note = the shim counts external command EXECS. a bare $( ) around a pure-bash
 *         function forks without an exec and stays invisible to it. execs
 *         dominate the cost, so this is a floor rather than a total.
 *
 * 🔴 .note = that floor is why `[case5]` exists. the exec tally and the STATIC
 *            subshell tally are two halves of one bar: the shim sees every fork
 *            that execs a tool, and `[case5]` sees every fork that does not.
 *            neither alone holds acceptance #1's word "processes" — together
 *            they leave no fork unheld.
 */
describe('forbid-terms hooks · fork budget', () => {
  const hooksDir = __dirname;

  /**
   * .what = the wish's stated limit, acceptance #1
   * .why = the wisher set it; it is the pass/fail line
   */
  const BAR = 10;

  /**
   * .what = the ratchet, acceptance #6 — measured count plus small headroom
   * .why = a clamp set at the BAR alone does not ratchet. with a post-fix count
   *        of 4, an assertion of "< 10" lets a regression to 9 pass green while
   *        the wish's actual win leaks away beneath it.
   * .note = to RAISE this is fine, and is exactly the decision the clamp exists
   *         to force. what it forbids is a raise nobody noticed.
   */
  const RATCHET = { gerunds: 6, blocklist: 8 };

  /**
   * .what = the ratchet for a Write that DOES trip a term
   * .why = the wish's bar governs the clean path; the tripped path still owes a
   *        bound, or the loop it used to hold could creep back unnoticed
   * .note = measured at 25, against a 54-exec baseline. headroom of 3.
   */
  const TRIPPED_RATCHET = 28;

  /**
   * .what = the ratchet for a gerunds Write that DOES trip a word
   * .why = the gerunds tripped path forks a DIFFERENT tool mix than the
   *        blocklist's (sed/grep/sort for the scan, date/mktemp/jq for the nudge
   *        write), so it earns its own number. one shared ratchet would be slack
   *        for whichever hook is cheaper, and slack is what a ratchet forbids.
   * .note = measured at 20, headroom of 3. the number comes from the snapshot,
   *         never from a guess — a ratchet guessed high never ratchets.
   */
  const TRIPPED_RATCHET_GERUNDS = 23;

  /**
   * .what = every external command either hook can reach
   * .why = a command absent from this list would go uncounted, so the tally
   *        would silently under-report
   */
  const TALLIED = [
    'jq',
    'grep',
    'sed',
    'cat',
    'date',
    'mktemp',
    'mv',
    'rm',
    'sha256sum',
    'cut',
    'dirname',
    'sort',
    'tr',
    'mkdir',
    'sha1sum',
    'awk',
    'basename',
  ];

  /**
   * .what = a hermetic cwd that already holds its own .claude dir, no nudge file
   * .why = find_claude_dir walks UP from PWD. absent a local .claude the walk
   *        continues — and genTempDir's physical store can sit under the repo,
   *        so the walk could reach the repo's real .claude and write a nudge
   *        entry into it (rule.require.hermetic-tests).
   *
   * 🔴 .note = it COMPOSES `genHookTempCwd` rather than reimplement its
   *            `genTempDir` + `mkdirSync('.claude')` core. that is possible
   *            only because `nudgeFileName` takes `string | null`: a `string`
   *            contract has no way to say "seed none", so this caller would be
   *            forced back into a hand-written copy.
   *            ⇒ an extraction whose contract cannot express a real caller's
   *              case does not remove a duplication; it relocates it.
   */
  const genHermeticCwd = (input: { slug: string }): string =>
    genHookTempCwd({ slug: input.slug, nudgeFileName: null });

  /**
   * .what = build a shim dir + a hermetic cwd, run a hook, return its exec tally
   * .why = the tally is the instrument acceptance #6 rests on, so it must be
   *        built once and shared. a per-case shim would drift, and a drifted
   *        instrument reports a budget nobody actually measured.
   */
  const runWithTally = (input: {
    hook: 'gerunds' | 'blocklist';
    json: unknown;
    /**
     * .what = seed the hook's nudge file with one record, aged N seconds
     * .why = [case5] clamps the RETRY path, which only exists when a prior
     *        record sits in the window. a two-run form would tally BOTH runs
     *        into one file, so the retry's own count could not be read.
     */
    seedNudge?: { filePath: string; secondsAgo: number };
  }): {
    execs: string[];
    exitCode: number;
    byTool: Record<string, number>;
    stderr: string;
  } => {
    const sandbox = genHermeticCwd({ slug: 'hook-forkbudget' });
    const shimDir = path.join(sandbox, 'shim');
    const tallyFile = path.join(sandbox, 'tally.txt');
    mkdirSync(shimDir, { recursive: true });
    writeFileSync(tallyFile, '');

    if (input.seedNudge) {
      const key = createHash('sha256')
        .update(input.seedNudge.filePath)
        .digest('hex');
      writeFileSync(
        path.join(sandbox, '.claude', `terms.${input.hook}.nudges.local.json`),
        JSON.stringify({
          [key]: {
            time: Math.floor(Date.now() / 1000) - input.seedNudge.secondsAgo,
            path: input.seedNudge.filePath,
            terms: ['seeded'],
          },
        }),
      );
    }

    // look up each real binary ONCE, up front, so the shim never forks to find it
    const realPathOf = asResolvedToolPaths({ tools: TALLIED });

    // 🔴 .note = a tool absent from PATH gets NO shim, so the hook reaches the
    //            real binary and the tally never sees it. every `toEqual(0)`
    //            assertion below would then pass VACUOUSLY — a limbless
    //            instrument that reads as a clean budget.
    //            ⇒ this is the failhide the instrument is most exposed to,
    //            because the tally's whole claim is "what you do not see here,
    //            the hook did not do" (rule.forbid.failhide).
    // .why  = the floor caveat below is about SUBSHELLS, which are uncountable
    //         by construction. an absent tool differs in kind: it is countable,
    //         and the count is simply lost. so it fails loud.
    const toolsAbsent = TALLIED.filter((tool) => !realPathOf[tool]);
    if (toolsAbsent.length)
      throw new ConstraintError(
        'the fork-budget instrument is incomplete — a tallied tool is absent from PATH',
        {
          toolsAbsent,
          why: 'no shim is written for an absent tool, so its execs go uncounted and every toEqual(0) on it passes vacuously',
          hint: 'install the absent tool, or drop it from TALLIED with a note that states why the hooks can no longer reach it',
        },
      );

    // write one shim per tool: tally, then EXEC the real binary
    //
    // ⚠️ .note = both interpolated PATHS are quoted, and the quotes are not
    //            cosmetic. the sandbox root comes from `genTempDir` (under
    //            $TMPDIR) and the real binary from `command -v` — either may
    //            hold a space on some box. unquoted, the redirect target and
    //            the `exec` argument each split, and the shim silently stops
    //            to tally while `tool` is still present on PATH ⇒ the absent-
    //            tool guard above cannot see it, and every `toEqual(0)` below
    //            passes vacuously. the ONE failure the guard does not catch is
    //            a shim that is written and malformed, so it is quoted out of
    //            existence rather than guarded.
    for (const [tool, realPath] of Object.entries(realPathOf)) {
      const shimPath = path.join(shimDir, tool);
      writeFileSync(
        shimPath,
        `#!/bin/sh\nprintf '%s\\n' ${tool} >> "${tallyFile}"\nexec "${realPath}" "$@"\n`,
      );
      chmodSync(shimPath, 0o755);
    }

    const result = spawnSync(
      'bash',
      [path.join(hooksDir, `pretooluse.forbid-terms.${input.hook}.sh`)],
      {
        encoding: 'utf-8',
        input: JSON.stringify(input.json),
        cwd: sandbox,
        env: { ...process.env, PATH: `${shimDir}:${process.env.PATH ?? ''}` },
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );

    const execs = readFileSync(tallyFile, 'utf-8')
      .split('\n')
      .filter((line) => line.length > 0);

    const byTool = asTallyByTool({ execs });

    // .note = `stderr` is carried out beside the tally so [case5] can pin the
    //         RETRY's user-faced verdict — which for a permitted retry is the
    //         empty string, i.e. the absence of a second refusal. the tally
    //         alone cannot see it: a hook that refused and a hook that
    //         permitted can spend the same execs.
    return {
      execs,
      exitCode: result.status ?? 1,
      byTool,
      stderr: result.stderr ?? '',
    };
  };

  const genCleanWrite = () => ({
    tool_name: 'Write',
    tool_input: {
      file_path: 'notes.md',
      content: 'the surf report holds a clean forecast for dawn patrol.',
    },
  });

  const genTrippedWrite = () => ({
    tool_name: 'Write',
    tool_input: {
      file_path: 'deploy.sh',
      content: 'run the deploy script here',
    },
  });

  /**
   * .what = a payload that trips the GERUNDS hook, never the blocklist
   * .why = the two hooks scan for different things, so one fixture cannot drive
   *        both tripped paths. `-ing` words trip gerunds; the blocklist's nine
   *        terms trip it. a shared fixture would leave one hook on its CLEAN
   *        path while the case name claims it is tripped.
   * .note = SEVERAL words on purpose. the cost this clamps was O(candidates) —
   *         one `echo | tr` per word — so a single-word payload would bound the
   *         loop at 1 and read as bounded whether or not the loop came back.
   */
  const genTrippedGerundWrite = () => ({
    tool_name: 'Write',
    tool_input: {
      file_path: 'test.ts',
      content: 'const a = running; const b = loading; const c = pending;',
    },
  });

  given('[case1] a clean Write that trips no term — the hot path', () => {
    when('[t0] the gerunds hook runs under the shim', () => {
      const tally = useBeforeAll(async () =>
        runWithTally({ hook: 'gerunds', json: genCleanWrite() }),
      );

      then('the write lands', () => {
        expect(tally.exitCode).toEqual(0);
      });

      then(`the exec tally is under the wish bar of ${BAR}`, () => {
        // acceptance #1
        expect(tally.execs.length).toBeLessThan(BAR);
      });

      then(`the exec tally is under the ratchet of ${RATCHET.gerunds}`, () => {
        // acceptance #6 — the drift guard
        expect(tally.execs.length).toBeLessThan(RATCHET.gerunds);
      });

      then('the allowlist is never read — no list-file parse happens', () => {
        // the pre-scan's whole purpose: exit ahead of any list read
        expect(tally.byTool.sed ?? 0).toEqual(0);
      });

      then('the breakdown is snapshotted, so a shift shows in the diff', () => {
        expect(tally.byTool).toMatchSnapshot();
      });
    });

    when('[t1] the blocklist hook runs under the shim', () => {
      const tally = useBeforeAll(async () =>
        runWithTally({ hook: 'blocklist', json: genCleanWrite() }),
      );

      then('the write lands', () => {
        expect(tally.exitCode).toEqual(0);
      });

      then(`the exec tally is under the wish bar of ${BAR}`, () => {
        // acceptance #1
        expect(tally.execs.length).toBeLessThan(BAR);
      });

      then(
        `the exec tally is under the ratchet of ${RATCHET.blocklist}`,
        () => {
          // acceptance #6 — the drift guard
          expect(tally.execs.length).toBeLessThan(RATCHET.blocklist);
        },
      );

      then('ONE grep decides the verdict, never one per term', () => {
        // the collapse: 9 per-term greps folded into one alternation
        expect(tally.byTool.grep ?? 0).toEqual(1);
      });

      then('ONE jq reads the blocklist, never three per term', () => {
        // three total, and each is a distinct job:
        //   1. the stdin tsv (tool_name + file_path)
        //   2. the content (kept apart — content holds tabs and newlines)
        //   3. the blocklist parse (alternation + every term record, one pass)
        // it was 3 PER TERM for detail, plus one for the count: 28 for 9 terms.
        expect(tally.byTool.jq ?? 0).toEqual(3);
      });

      then('the nudge file is never touched on a clean write', () => {
        // the stale sweep now runs AFTER detection
        expect(tally.byTool.mktemp ?? 0).toEqual(0);
        expect(tally.byTool.date ?? 0).toEqual(0);
      });

      then('the breakdown is snapshotted, so a shift shows in the diff', () => {
        expect(tally.byTool).toMatchSnapshot();
      });
    });
  });

  given('[case2] a Write that DOES trip a term', () => {
    when('[t0] the blocklist hook runs under the shim', () => {
      const tally = useBeforeAll(async () =>
        runWithTally({ hook: 'blocklist', json: genTrippedWrite() }),
      );

      then('the hook blocks', () => {
        expect(tally.exitCode).toEqual(2);
      });

      then('the tripped path stays bounded too', () => {
        // the tripped path costs more than the clean one, and is still no storm.
        // measured at 25: 10 grep (1 alternation + 9 per-term), 6 jq, and the
        // nudge write — against a 54-exec baseline whose bulk was 33 jq for
        // detail. the per-term grep stays: it is what names WHICH term tripped,
        // and the block message owes that (acceptance #4).
        expect(tally.execs.length).toBeLessThan(TRIPPED_RATCHET);
      });

      then('the breakdown is snapshotted', () => {
        expect(tally.byTool).toMatchSnapshot();
      });
    });

    when('[t1] the GERUNDS hook runs under the shim', () => {
      // 🔴 vision case=6 [t1] asks for a tripped-path budget PER HOOK, and this
      //    is the gerunds half of it.
      //
      //    it carries real weight: the wish's own fact #2 names
      //    `echo "$word" | tr` PER CANDIDATE WORD as this hook's headline cost,
      //    and that loop lives on the TRIPPED path alone — the clean-path clamp
      //    ([case1] [t1]) exits at the pre-scan, well ahead of it.
      //    ⇒ without this, a re-introduced per-word loop is invisible to every
      //      assertion in the suite — the exact regression acceptance #6 exists
      //      to catch.
      const tally = useBeforeAll(async () =>
        runWithTally({ hook: 'gerunds', json: genTrippedGerundWrite() }),
      );

      then('the hook blocks', () => {
        expect(tally.exitCode).toEqual(2);
      });

      then('the tripped path stays bounded too', () => {
        expect(tally.execs.length).toBeLessThan(TRIPPED_RATCHET_GERUNDS);
      });

      then('no per-word tr survives — the wish fact-#2 loop is gone', () => {
        // the loop forked one `tr` PER CANDIDATE WORD. the rewrite lowercases
        // in-shell with ${x,,}, so the count is not "small" — it is ZERO, and
        // an exact assertion is what makes a single re-introduced fork visible.
        expect(tally.byTool.tr ?? 0).toEqual(0);
      });

      then('the breakdown is snapshotted', () => {
        expect(tally.byTool).toMatchSnapshot();
      });
    });
  });

  given('[case5] a permitted RETRY, inside the nudge window', () => {
    // 🔴 the clock is read ahead of the STALE SWEEP, never ahead of DETECTION.
    //
    //    ahead of the sweep: both already sit after detection, so the clean
    //    path is untouched and a retry stops to pay `mktemp` + `jq` + `mv` for
    //    a prune it is about to walk away from. a pure win.
    //
    //    ahead of detection: that costs the clean path 4 execs on every Write
    //    and Edit in the repo, and turns [case1]'s ratchet red.
    //
    // ⚠️ one symptom, two reorders, opposite verdicts. the axis is not "is the
    //    reorder good" but WHICH BOUNDARY it crosses — one moves work across
    //    the detection gate (where ~99% of invocations exit), the other across
    //    the window gate, which only tripped writes ever reach.
    //
    // .why a clamp = the reorder is verdict-neutral, so NO behavior test can
    //      see it. its whole effect is a cost, and a cost is visible to exactly
    //      one instrument in this repo — this one. undefended, the next edit
    //      re-sequences the sweep back and no assertion goes red.
    // measured, never guessed: blocklist 19, gerunds 14. +1 of headroom, on the
    // same convention RATCHET and TRIPPED_RATCHET use.
    //
    // ⚠️ these are NOT small, and that is r10's point standing: the retry still
    //    runs the whole detection walk. it saves the sweep and the record write,
    //    never the detect. ⇒ the assertion below pins the RELATION (a retry is
    //    cheaper than a block) rather than a claim that a retry is cheap.
    const RETRY_RATCHET = { gerunds: 15, blocklist: 20 };

    when('[t0] the blocklist hook runs under the shim', () => {
      const tally = useBeforeAll(async () =>
        runWithTally({
          hook: 'blocklist',
          json: genTrippedWrite(),
          seedNudge: { filePath: 'deploy.sh', secondsAgo: 100 },
        }),
      );

      then('the hook exits 0 — the deliberate retry lands', () => {
        expect(tally.exitCode).toEqual(0);
      });

      then(
        '🔴 and it says NAUGHT — vision case=3 [t0], no second refusal',
        () => {
          // 🔴 vision `case=3` `[t0]` pins TWO claims about the retry — the
          //    exit code above, and the silence. they are separable: a hook
          //    that exits 0 while it still prints a refusal passes every other
          //    assertion in this block, and an editor reads a block message on
          //    a write that landed. the exact "wait, what?" acceptance #3
          //    forbids.
          expect(tally.stderr).toEqual('');
        },
      );

      then('the retry costs FEWER execs than the block did', () => {
        // the sequence claim, as an enforced number rather than a comment.
        expect(tally.execs.length).toBeLessThan(RETRY_RATCHET.blocklist);
        // 🔴 and the RELATION, which is the half a lone number cannot hold: a
        //    retry must stay cheaper than the block it follows. raise the retry
        //    budget past the block budget and this goes red, where the bound
        //    above would happily follow it upward.
        expect(RETRY_RATCHET.blocklist).toBeLessThan(TRIPPED_RATCHET);
      });

      then('no mktemp and no mv — the sweep was never reached', () => {
        // 🔴 the pair that bites. re-sequence the sweep ahead of the window
        //    check and both read 1, while every behavior assertion in the repo
        //    stays green — the reorder changes no verdict, by construction.
        expect(tally.byTool.mktemp ?? 0).toEqual(0);
        expect(tally.byTool.mv ?? 0).toEqual(0);
      });

      then('the breakdown is snapshotted', () => {
        expect(tally.byTool).toMatchSnapshot();
      });
    });

    when('[t1] the GERUNDS hook runs under the shim', () => {
      const tally = useBeforeAll(async () =>
        runWithTally({
          hook: 'gerunds',
          json: genTrippedGerundWrite(),
          seedNudge: { filePath: 'test.ts', secondsAgo: 100 },
        }),
      );

      then('the hook exits 0 — the deliberate retry lands', () => {
        expect(tally.exitCode).toEqual(0);
      });

      then(
        '🔴 and it says NAUGHT — vision case=3 [t0], no second refusal',
        () => {
          // 🔴 vision `case=3` `[t0]` pins TWO claims about the retry — the
          //    exit code above, and the silence. they are separable: a hook
          //    that exits 0 while it still prints a refusal passes every other
          //    assertion in this block, and an editor reads a block message on
          //    a write that landed. the exact "wait, what?" acceptance #3
          //    forbids.
          expect(tally.stderr).toEqual('');
        },
      );

      then('the retry costs FEWER execs than the block did', () => {
        expect(tally.execs.length).toBeLessThan(RETRY_RATCHET.gerunds);
        expect(RETRY_RATCHET.gerunds).toBeLessThan(TRIPPED_RATCHET_GERUNDS);
      });

      then('no mktemp and no mv — the sweep was never reached', () => {
        expect(tally.byTool.mktemp ?? 0).toEqual(0);
        expect(tally.byTool.mv ?? 0).toEqual(0);
      });

      then('the breakdown is snapshotted', () => {
        expect(tally.byTool).toMatchSnapshot();
      });
    });
  });

  given('[case3] the shim itself', () => {
    when('[t0] a hook runs with and without it', () => {
      const outcome = useBeforeAll(async () => {
        const shimmed = runWithTally({
          hook: 'blocklist',
          json: genTrippedWrite(),
        });
        const bare = spawnSync(
          'bash',
          [path.join(hooksDir, 'pretooluse.forbid-terms.blocklist.sh')],
          {
            encoding: 'utf-8',
            input: JSON.stringify(genTrippedWrite()),
            cwd: genHermeticCwd({ slug: 'hook-bare' }),
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );
        return { shimmed, bareExit: bare.status ?? 1 };
      });

      then('the verdict is identical either way — the shim is neutral', () => {
        expect(outcome.shimmed.exitCode).toEqual(outcome.bareExit);
      });
    });
  });

  given(
    '[case6] the TALLIED list, against the hooks it claims to cover',
    () => {
      when('[t0] both hook sources are scanned for external commands', () => {
        // 🔴 the INVERSE of the shim's own guard. that guard covers one
        //    direction — a tallied tool absent from PATH throws (the
        //    ConstraintError above). this covers the other: a hook edit that
        //    reaches for a tool absent from TALLIED runs UNSHIMMED, so its
        //    execs are invisible to every tally and every ratchet stays green
        //    while the real fork count climbs.
        //
        // 🔴 the "instrument that lies" class, which this suite meets at four
        //    seams — `[case2]`'s vacuity, the shared-leaf desync, the mutated
        //    tally, and this. an instrument that under-counts reads exactly
        //    like one that works, and a ratchet is worth precisely what its
        //    instrument is worth.
        const CATALOG = [
          'jq',
          'grep',
          'sed',
          'cat',
          'date',
          'mktemp',
          'mv',
          'rm',
          'cut',
          'dirname',
          'sort',
          'tr',
          'mkdir',
          'awk',
          'basename',
          'sha1sum',
          'sha256sum',
          'head',
          'tail',
          'wc',
          'uniq',
          'find',
          'xargs',
          'cp',
          'ln',
          'touch',
          'stat',
          'readlink',
          'realpath',
          'md5sum',
          'env',
          'printf',
          'expr',
          'seq',
          'tee',
          'chmod',
          'diff',
          'comm',
          'paste',
          'python',
          'python3',
          'node',
          'perl',
          'ruby',
          'curl',
          'wget',
          'git',
        ];

        // .note = a plain helper, never `useBeforeAll`. that helper returns a
        //         PROXY that defers access, and a proxied array does not carry
        //         `.filter` — the scan here is two synchronous file reads, so the
        //         deferral buys naught and costs the array's own interface.
        const asReachedTools = (): string[] => {
          const sources = [
            'pretooluse.forbid-terms.blocklist.sh',
            'pretooluse.forbid-terms.gerunds.sh',
          ]
            .map((name) => readFileSync(path.join(hooksDir, name), 'utf-8'))
            .join('\n');

          // a command POSITION, never a mere mention: start of line, or right
          // after a pipe / `&&` / `||` / `$(` / `(` / `;`. this keeps the word
          // `date` inside a comment or a jq filter from a false read as an exec.
          //
          // 🔴 .note = the TRAILING half admits `)` as well as whitespace, and
          //            it must. the two most-used tools in both hooks are
          //            invoked BARE inside a substitution —
          //            `STDIN_INPUT=$(cat)`, `TMP_FILE=$(mktemp)` — so after
          //            the tool name comes `)`. demand `\s` and neither reads
          //            as reached.
          //
          //            ⇒ a new tool added in that same bare `$(tool)` idiom
          //            would escape the closure entirely, which is the exact
          //            regression this case exists to catch.
          return CATALOG.filter((tool) =>
            new RegExp(
              String.raw`(^|[|;(]|&&|\|\||\$\()\s*` +
                tool +
                String.raw`(\s|\)|;|\||&|$)`,
              'm',
            ).test(sources),
          );
        };

        then('every command either hook reaches is TALLIED', () => {
          // ⚠️ .note = the bound, stated rather than implied: this closes the
          //            CATALOG, never the universe. a hook that reaches for a tool
          //            absent from the list above still escapes the tally. the
          //            catalog holds the tools a bash hook plausibly reaches for,
          //            so the realistic regression — "someone added an `awk`" — is
          //            caught, and an exotic one is not.
          //
          //            a true closure would need a bash parser, and a parser in a
          //            test is a second instrument to distrust. ⇒ a partial guard
          //            whose bound is written down beats a total one nobody can
          //            check.
          expect(
            asReachedTools().filter((tool) => !TALLIED.includes(tool)),
          ).toEqual([]);
        });

        then(
          'the scan is not vacuous — it finds the tools we know are there',
          () => {
            // 🔴 the control on the control. the regex above is the whole instrument
            //    here, and a regex that matches naught would make the assertion above
            //    pass on an empty set — the identical vacuity the case exists to
            //    close, reintroduced one level down.
            expect(asReachedTools()).toContain('jq');
            expect(asReachedTools()).toContain('grep');

            // 🔴 and these two are the reason the control needed to grow. `jq` and
            //    `grep` alone are both invoked in the SAME shape — piped, with a
            //    space after the name — so a control that asserts only those two
            //    proves the regex works for one idiom and says naught about any
            //    other. it stayed green while `$(cat)` and `$(mktemp)` went unseen.
            //
            //    ⇒ a vacuity control must span the SHAPES the scan must handle,
            //    never merely prove the scan returns a non-empty set. one sample
            //    per idiom, or the control inherits the blind spot it guards.
            expect(asReachedTools()).toContain('cat'); // bare, `$(cat)`
            expect(asReachedTools()).toContain('mktemp'); // bare, `$(mktemp)`
          },
        );
      });
    },
  );

  // ⚠️ `[case4]` lives in `getMechanicRole.hooks-reachable.integration.test.ts`.
  //
  //    its subject is the role's whole 14-hook registry — every event key, the
  //    wrapper-drop invariant, path existence — and THIS file is named and
  //    scoped for the fork budget of two hooks. ⇒ held here, a regression in an
  //    unrelated hook's registered path is caught by a file nobody who debugs
  //    that hook would open.
  //
  // .note = the pointer stays because the case numbers here are a sequence, and
  //         a gap in a sequence reads as a case somebody dropped.

  // 🔴 .note = the labels in use are 1,2,3,5,6,7 — each exactly once, and the
  //         uniqueness is load-bearing: jest prints the label, so a duplicate
  //         leaves two subjects uncitable. vision `case=3` pins the [case5]
  //         retry-path clamp, and that pin must name exactly one cell.
  //
  //         ⚠️ the grep that checks it must be `\[caseN\]`, never
  //         `given\('\[case` — biome wraps a long `given(`, so its label lands
  //         on the NEXT line and the anchored form cannot see it.
  given('[case7] the hook source, read statically', () => {
    // 🔴 every clamp above this line counts EXECS under a PATH shim, and a shim
    //    structurally cannot see a `$( )` that runs only builtins or a shell
    //    function — `$(find_claude_dir)` is exactly that shape, and it forks.
    //
    //    ⇒ so an edit that adds a bare `$( )` raises the real process count
    //      toward acceptance #1's bar of 10 while every exec assertion stays
    //      green.
    //
    // ✅ this case makes that residue a HELD number, by a source read. the two
    //    tallies together bound every fork either hook can make.
    //
    // .note = the numbers below are the MEASURED site counts, not the bar. to
    //         raise one is a fine decision and exactly the decision this case
    //         exists to force into the diff — what it forbids is a raise that
    //         nobody noticed.
    const SUBSHELL_SITES = { gerunds: 8, blocklist: 10 };

    const asSiteCount = (hook: string): number =>
      asSubshellSites({
        source: readFileSync(path.join(hooksDir, hook), 'utf-8'),
      }).length;

    when('[t0] the gerunds hook is read', () => {
      then(`it holds ${SUBSHELL_SITES.gerunds} subshell sites`, () => {
        expect(asSiteCount('pretooluse.forbid-terms.gerunds.sh')).toEqual(
          SUBSHELL_SITES.gerunds,
        );
      });
    });

    when('[t1] the blocklist hook is read', () => {
      then(`it holds ${SUBSHELL_SITES.blocklist} subshell sites`, () => {
        expect(asSiteCount('pretooluse.forbid-terms.blocklist.sh')).toEqual(
          SUBSHELL_SITES.blocklist,
        );
      });
    });

    when('[t2] the GERUNDS residue alone is set against the wish bar', () => {
      // ⚠️ this is the LOOSEST of the three, deliberately. most of these sites
      //    sit on the tripped path, which the bar does not govern — so the
      //    count over-counts the clean path and a pass here proves less than
      //    [t0] and [t1] do. it is asserted anyway because it is the only place
      //    the wish's own number appears beside a static count, and a reader
      //    who finds the residue must find the bar in the same view.
      //
      // 🔴 the GERUNDS residue alone, never a SUM of the two. a sum cannot
      //    hold: 8 + 10 = 18 against a bar of 10, and the blocklist's own 10
      //    sits AT the bar rather than under it.
      //
      //    ⇒ that is no defect. the bar governs the CLEAN path, which [case1]
      //      measures dynamically at 4 execs; these static sites are mostly
      //      tripped-path forks the bar never claimed to bound. only the
      //      gerunds count can honestly be put to it.
      then('the static residue alone stays under the bar of 10', () => {
        expect(asSiteCount('pretooluse.forbid-terms.gerunds.sh')).toBeLessThan(
          BAR,
        );
      });
    });
  });
});
