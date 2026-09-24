import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { asEditJson } from './asEditJson';
import { asWriteJson } from './asWriteJson';
import { genHookTempCwd } from './genHookTempCwd';
import { runHookIn } from './runHookIn';

/**
 * .what = integration tests for pretooluse.forbid-terms.gerunds.sh
 * .why = verify the hook blocks -ing words, honors its one-word allowlist, and
 *        honors the HARDNUDGE retry window
 *
 * .note = replaces pretooluse.forbid-terms.gerunds.test.sh, whose assertions are
 *         carried forward case for case (rule.require.jest-tests-for-skills)
 * .note = each run gets its own temp cwd, so the nudge file it writes never
 *         touches the repo's own .claude dir (rule.require.hermetic-tests)
 * .note = the fixtures below are the words the hook must flag, so this file
 *         necessarily holds terms both hooks forbid. that is test data, not prose.
 */
describe('pretooluse.forbid-terms.gerunds.sh', () => {
  const hookPath = path.join(__dirname, 'pretooluse.forbid-terms.gerunds.sh');

  /**
   * .what = a hermetic cwd with its own .claude dir
   * .why = find_claude_dir walks up from PWD; a temp cwd keeps each run's nudge
   *        state isolated from the repo and from other tests
   *
   * .note = the root comes from test-fns `genTempDir`, never an adhoc `mkdtemp`
   *         (rule.forbid.adhoc-gentempdir-reimpl). the `.claude` write below is
   *         net-new content, not a reimpl — genTempDir provides clone/symlink/git
   *         and no arbitrary-file option.
   */
  // 🔴 .note = the nudge filename below is what keeps this hook's clock SEPARATE
  //            from the blocklist's. `case=2` requires two clocks: one shared
  //            record would let a gerund override permit a blocklisted term.
  //            ⇒ the shared `genHookTempCwd` takes it as a REQUIRED arg for
  //            exactly this reason, so the extraction cannot weld them together
  //            by omission.
  const genTempCwd = (): string =>
    genHookTempCwd({
      slug: 'hook-gerunds',
      nudgeFileName: 'terms.gerunds.nudges.local.json',
    });

  const runHook = (input: {
    json: unknown;
    cwd?: string;
  }): { stdout: string; stderr: string; exitCode: number; cwd: string } =>
    runHookIn({
      hookPath,
      json: input.json,
      cwd: input.cwd ?? genTempCwd(),
    });

  given('[case1] a Write that holds an -ing word', () => {
    when('[t0] it is the first attempt', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asWriteJson({
            filePath: 'test.ts',
            content: 'const runningTotal = 1;',
          }),
        }),
      );

      then('the hook exits 2 — blocked', () => {
        expect(result.exitCode).toEqual(2);
      });

      then('stderr names the detected word, split out of camelCase', () => {
        expect(result.stderr).toContain('running');
      });

      then('the message goes to stderr, never stdout', () => {
        expect(result.stdout).toEqual('');
      });

      then('the WHOLE message is snapshotted — acceptance #4', () => {
        // 🔴 rule.require.snapshots: "key for user-faced outputs", and
        //    "CRITICAL: use both snapshot AND explicit assertions".
        //
        //    the toContain above pins one word. acceptance #4 asks the message
        //    be "unchanged in substance" — the header, the file line, the
        //    per-word `→ consider:` alternative, the rationale, the retry hint.
        //    a fragment assertion cannot see a line dropped from between two it
        //    checks, and the alternative is chosen by a 120-arm `case` that no
        //    other assertion touches at all.
        //
        // .note = deterministic by construction: the only interpolated value is
        //         file_path, and this case supplies a fixed one.
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case2] a Write that holds an -ing word, twice', () => {
    when('[t0] the same file is written again inside the nudge window', () => {
      const outcome = useBeforeAll(async () => {
        const json = asWriteJson({
          filePath: 'test.ts',
          content: 'const runningTotal = 1;',
        });
        const first = runHook({ json });
        const second = runHook({ json, cwd: first.cwd });
        return { first, second };
      });

      then('the first attempt blocks', () => {
        expect(outcome.first.exitCode).toEqual(2);
      });

      then('the retry lands — HARDNUDGE, acceptance #3', () => {
        expect(outcome.second.exitCode).toEqual(0);
      });

      then('the nudge RECORD keeps its shape — acceptance #3, clause 3', () => {
        // 🔴 the peer of the blocklist's clamp, and it owes its own: acceptance
        //    #3 binds BOTH hooks, and the two write SEPARATE files (the vision's
        //    constraint #1). a clamp on one proves naught about the other.
        //
        //    the file outlives the hook that wrote it — a human blocked mid-window
        //    upgrades the role, then retries. the new hook reads the OLD record.
        //    rename a key and `jq '.[$key].time // 0'` takes its fallback ⇒
        //    elapsed reads as huge ⇒ the deliberate retry is REFUSED. every
        //    exit-code test stays green, since a hook is self-consistent with
        //    whatever format it writes.
        const record = JSON.parse(
          readFileSync(
            path.join(
              outcome.first.cwd,
              '.claude',
              'terms.gerunds.nudges.local.json',
            ),
            'utf-8',
          ),
        );

        const keys = Object.keys(record);
        expect(keys).toHaveLength(1);

        // the key is sha256(file_path) — 64 lowercase hex chars
        expect(keys[0]).toMatch(/^[0-9a-f]{64}$/);

        const entry = record[keys[0]!];
        expect(Object.keys(entry).sort()).toEqual(['path', 'terms', 'time']);
        expect(typeof entry.time).toEqual('number');
        expect(entry.path).toEqual('test.ts');
        expect(entry.terms).toEqual(['running']);
      });
    });
  });

  given('[case3] a Write that holds the one allowlisted word', () => {
    when('[t0] the content holds "string"', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asWriteJson({
            filePath: 'test.ts',
            content: "const myVar: string = 'hi';",
          }),
        }),
      );

      then('the hook exits 0 — the allowlist holds', () => {
        expect(result.exitCode).toEqual(0);
      });
    });
  });

  given('[case4] a Write that holds an -ing word used as a noun', () => {
    // 🔴 the hook flags every -ing WORD, never every gerund. its allowlist holds
    //    one entry, so "building", "sibling", "ceiling", "during" all block.
    //    that is POLICY under acceptance #2 ("no policy change either direction"),
    //    so the false positives must be preserved exactly. a collapse that swapped
    //    the -ing scan for a real-gerund dictionary would look like a cleanup and
    //    would breach the wish. see Q10.
    when('[t0] the content holds "building"', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asWriteJson({
            filePath: 'test.ts',
            content: 'const building = new Building();',
          }),
        }),
      );

      then('the hook exits 2 — there are no noun exceptions', () => {
        expect(result.exitCode).toEqual(2);
      });
    });

    when('[t1] the content holds "ceiling"', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asWriteJson({
            filePath: 'test.ts',
            content: 'const ceiling = 10;',
          }),
        }),
      );

      then('the hook exits 2 — the same policy, not a gerund at all', () => {
        expect(result.exitCode).toEqual(2);
      });
    });
  });

  given('[case5] an Edit whose new_string holds an -ing word', () => {
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asEditJson({
            filePath: 'test.ts',
            oldString: 'old code',
            newString: 'const pendingQueue = [];',
          }),
        }),
      );

      then('the hook exits 2 — blocked', () => {
        expect(result.exitCode).toEqual(2);
      });

      then('stderr names the detected word', () => {
        expect(result.stderr).toContain('pending');
      });
    });
  });

  given('[case6] an Edit whose -ing word sits only in old_string', () => {
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asEditJson({
            filePath: 'test.ts',
            oldString: 'const loadingState = true;',
            newString: 'const stateLoaded = true;',
          }),
        }),
      );

      then('the hook exits 0 — only additions are scanned', () => {
        expect(result.exitCode).toEqual(0);
      });
    });
  });

  given('[case7] a Write that holds no -ing word at all', () => {
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asWriteJson({
            filePath: 'test.ts',
            content: 'const userFound = findUser();',
          }),
        }),
      );

      then('the hook exits 0 — the write lands', () => {
        expect(result.exitCode).toEqual(0);
      });

      then('it emits no output at all', () => {
        expect(result.stdout).toEqual('');
        expect(result.stderr).toEqual('');
      });
    });
  });

  given('[case8] a Bash tool call that holds an -ing word', () => {
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: {
            tool_name: 'Bash',
            tool_input: { command: 'npm run buildingBlocks' },
          },
        }),
      );

      then('the hook exits 0 — it gates Write and Edit only', () => {
        expect(result.exitCode).toEqual(0);
      });
    });
  });

  given('[case9] a Write that holds several -ing words', () => {
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asWriteJson({
            filePath: 'test.ts',
            content: 'const runningTotal = 1; const loadingState = false;',
          }),
        }),
      );

      then('the hook exits 2 — blocked', () => {
        expect(result.exitCode).toEqual(2);
      });

      then('stderr names EVERY detected word, never just the first', () => {
        expect(result.stderr).toContain('running');
        expect(result.stderr).toContain('loading');
      });

      then(
        'the WHOLE multi-word message is snapshotted — acceptance #4',
        () => {
          // 🔴 the n>=2 render is a DISTINCT output variant a caller reaches on
          //    any write that trips two -ing words, and [case1] snaps only n=1.
          //    the per-word loop accumulates one ⛔ line per word, so the shape
          //    at n>=2 is one no other key holds
          //    (rule.require.contract-snapshot-exhaustiveness).
          //
          //    the twin of blocklist [case9], repaired at i002-r002. the render
          //    is deterministic by construction — only `file_path` interpolates,
          //    and it is fixed at 'test.ts' above — so no mask is owed.
          expect(result.stderr).toMatchSnapshot();
        },
      );

      then('the nudge record carries a WELL-FORMED multi-term array', () => {
        // 🔴 the arity the `${TERMS_JSON:+,}` join needed, and the one no case
        //    held. every other case trips exactly ONE word — the single arity
        //    at which a join emits no separator, so the join is a no-op there.
        //    the `:+,` form REPLACED an if/else, and the two differ ONLY here.
        //
        //    a broken separator yields `["running""loading"]`, which is not
        //    valid json ⇒ `jq` fails ⇒ `|| rm -f` discards the write ⇒ the
        //    record silently keeps its PRIOR content, and the exit code stays
        //    2 either way. stderr above would not notice: it is built from a
        //    different accumulator.
        const record = JSON.parse(
          readFileSync(
            path.join(result.cwd, '.claude', 'terms.gerunds.nudges.local.json'),
            'utf-8',
          ),
        );

        const keys = Object.keys(record);
        expect(keys).toHaveLength(1);

        const entry = record[keys[0]!];

        // .note = alphabetical, never source order — `sort -u` (:103) both
        //         dedupes and orders. the blocklist hook differs here: it walks
        //         its terms in LIST order. two hooks, two orders, on purpose.
        expect(entry.terms).toEqual(['loading', 'running']);
      });
    });
  });

  given('[case10] stdin is empty', () => {
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () => {
        const spawned = spawnSync('bash', [hookPath], {
          encoding: 'utf-8',
          input: '',
          cwd: genTempCwd(),
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        return { exitCode: spawned.status ?? 1, stderr: spawned.stderr ?? '' };
      });

      then('the hook exits 2 — it fails fast on absent input', () => {
        expect(result.exitCode).toEqual(2);
      });

      then('stderr says what went wrong', () => {
        expect(result.stderr).toContain('no input');
      });

      // .note = rule.require.errors-name-the-fix. a symptom alone leaves the
      //         caller to guess the payload shape, and a hook is invoked by
      //         hand exactly when a prior step already went wrong.
      then('stderr names the fix, not the symptom alone', () => {
        expect(result.stderr).toContain('fix:');
        expect(result.stderr).toContain('tool_name');
      });

      then('the WHOLE message is snapshotted — a human contract', () => {
        // the twin of blocklist [case10]. the two fragment assertions above
        // pass on a message whose lines were reordered or whose copy-paste
        // example no longer parses.
        //
        // .note = `${BASH_SOURCE[0]}` is absolute and per-machine, so it is
        //         masked rather than omitted — its presence and position are
        //         part of the contract, only its prefix is not.
        // .note = split/join, never String.replaceAll — the tsconfig lib target
        //         predates es2021, so replaceAll does not typecheck here.
        expect(result.stderr.split(hookPath).join('<hook>')).toMatchSnapshot();
      });
    });
  });

  given('[case11] the pre-scan and the real scan must agree', () => {
    // the pre-scan drops the \b anchors and the camelCase split, so it
    // OVER-approximates. a false "maybe" costs one parse and is safe; a false
    // "no" would be a silent policy hole. these two pin the direction.
    when('[t0] an -ing word hides inside camelCase', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asWriteJson({
            filePath: 'test.ts',
            content: 'const xPendingY = 1;',
          }),
        }),
      );

      then('the pre-scan passes it to the real scan, which blocks', () => {
        expect(result.exitCode).toEqual(2);
        expect(result.stderr).toContain('Pending');
      });
    });

    when('[t1] an "ing" sequence sits inside a longer word', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asWriteJson({
            filePath: 'test.ts',
            content: 'const ingest = 1;',
          }),
        }),
      );

      then('the write lands — the real scan stays the authority', () => {
        // "ingest" holds "ing" but is no -ing WORD, so the pre-scan may say
        // "maybe" while the real scan says no. over-approximation, as designed.
        expect(result.exitCode).toEqual(0);
      });
    });

    when('[t2] the -ing word is uppercase', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asWriteJson({
            filePath: 'test.ts',
            content: 'const RUNNING = 1;',
          }),
        }),
      );

      then('the write lands — BOTH scans are case-SENSITIVE', () => {
        // 🔴 the asymmetry no case pinned. the blocklist hook greps with `-i`
        //    (:109, :144); this hook does NOT (:74, :102). so `RUNNING` trips
        //    the blocklist's shape of gate and never this one, and that is the
        //    policy as it stands — acceptance #2 freezes it either direction.
        //
        //    the regression this catches is the TIDY one: a sweep that adds
        //    `-i` to both scans "for consistency with the blocklist hook".
        //    that widens what this gate refuses, which acceptance #2 forbids.
        //
        // .note = `-i` on the REAL scan ALONE is a no-op, verified by a staged
        //         run: the pre-scan is strictly the narrower filter, so it
        //         rejects `RUNNING` before the real scan is ever reached. an
        //         earlier draft of this comment called that case a silent
        //         policy hole; it is not one, and this assertion is green
        //         under it. the pre-scan dominates whatever it rejects.
        expect(result.exitCode).toEqual(0);
      });
    });
  });

  given('[case13] the per-word alternative arms', () => {
    // 🔴 the block message picks its `→ consider:` text from a ~120-arm `case`,
    //    and [case1] exercises exactly one arm of it (`running`).
    //
    //    each arm is a distinct prompt a human reads at the moment they are
    //    refused, so a dropped or mistyped arm is a user-faced defect — and it
    //    drifts green while no assertion reads any arm but one.
    //
    // 🟡 the proportionate clamp is NOT 120 cases. it is one arm that is matched
    //    by a glob, plus the `*` FALLBACK — which is the arm most humans hit,
    //    and the only one whose loss would silently degrade every unlisted word
    //    to no suggestion at all.
    when('[t0] a write trips a matched arm and the fallback together', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asWriteJson({
            filePath: 'surf.ts',
            // `loading` and `parsing` each match their own glob arm;
            // `sibling` matches no arm, so it lands on `*`.
            content: 'const a = loading; const b = parsing; const c = sibling;',
          }),
        }),
      );

      then('the hook exits 2', () => {
        expect(result.exitCode).toEqual(2);
      });

      then('a matched arm renders its OWN suggestion', () => {
        expect(result.stderr).toContain('loading → consider: load, loaded');
        expect(result.stderr).toContain('parsing → consider: parse, parsed');
      });

      then('an unmatched word falls back, never to an empty suggestion', () => {
        // 🔴 the arm that matters most. a `case` with a broken `*` emits the
        //    word with NO advice, which reads as a refusal with no way out.
        expect(result.stderr).toContain('sibling → consider: remove -ing');
      });

      then('the WHOLE message is snapshotted', () => {
        // .note = deterministic: the words are sorted by `sort -u`, and the only
        //         other interpolated value is the fixed file_path above.
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case12] the allowlist file is absent entirely', () => {
    // 🔴 the vision's case=5 and its constraint #2: "two config paths must stay
    //    two". the two hooks fail in OPPOSITE directions on an absent config:
    //
    //      blocklist : absent list -> INERT    (fail-OPEN,   [case13] there)
    //      gerunds   : absent list -> STRICTER  (fail-CLOSED, this case)
    //
    //    one shared "config absent" guard would retire one of the two gates, and
    //    it would do so SILENTLY — the suite stays green either way unless both
    //    directions are pinned. so both are, one in each file, on purpose.
    //
    // .note = the hook reads its allowlist from ${BASH_SOURCE[0]%/*}, so a copy
    //         of the hook into a temp dir with NO .jsonc beside it is what
    //         exercises the absent-config path (rule.require.hermetic-tests)

    /**
     * .what = a temp dir with a copy of the hook and no allowlist beside it
     * .why = the hook resolves its allowlist adjacent to itself
     */
    const genSandboxWithoutAllowlist = (): string => {
      const dir = genTempDir({ slug: 'hook-gerunds-noallow' });
      mkdirSync(path.join(dir, '.claude'), { recursive: true });
      writeFileSync(
        path.join(dir, '.claude', 'terms.gerunds.nudges.local.json'),
        '{}',
      );
      copyFileSync(
        hookPath,
        path.join(dir, 'pretooluse.forbid-terms.gerunds.sh'),
      );
      return dir;
    };

    when('[t0] a write holds the ONE word the real allowlist permits', () => {
      const result = useBeforeAll(async () => {
        const dir = genSandboxWithoutAllowlist();
        const spawned = spawnSync(
          'bash',
          [path.join(dir, 'pretooluse.forbid-terms.gerunds.sh')],
          {
            encoding: 'utf-8',
            input: JSON.stringify(
              asWriteJson({
                filePath: 'test.ts',
                content: "const myVar: string = 'hi';",
              }),
            ),
            cwd: dir,
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );
        return { exitCode: spawned.status ?? 1, stderr: spawned.stderr ?? '' };
      });

      then('the hook exits 2 — absent allowlist means a STRICTER gate', () => {
        // 🔴 the exact inverse of the blocklist's absent-config verdict. with
        //    its real allowlist present ([case3]) this same content exits 0.
        expect(result.exitCode).toEqual(2);
      });

      then('stderr names the word it now refuses', () => {
        expect(result.stderr).toContain('string');
      });

      then('the WHOLE degraded refusal is snapshotted', () => {
        // 🔴 every authored block on this hook earns a whole-message snapshot
        //    ([case1], [case10], [case11], [case13], [case17], [case20]), and
        //    this one most of all — it is the refusal a human meets under a
        //    degraded config, which `toContain('string')` alone cannot pin.
        //
        // ⚠️ what the snapshot makes VISIBLE is the point: `string` falls to the
        //    suggestion table's `*` arm, so the advice a human reads is
        //    "consider: remove -ing suffix" — nonsense for a type name. that is
        //    the extant render, frozen by acceptance #4, so it is PINNED rather
        //    than repaired. a reviewer READS the bad advice in the diff rather
        //    than deduce it from an assertion that only counts words.
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] the allowlist is present but MALFORMED', () => {
      // 🔴 the twin of [t0]'s absent-config verdict, reachable by one stray
      //    comma in a human-edited file.
      //
      //    the two are distinct code paths: `-f` is true here, so the loader
      //    RUNS and its `2>/dev/null … || true` swallows the parse error. the
      //    verdict coincides with [t0], which is exactly why one test for both
      //    would be a coincidence rather than a proof.
      //
      // ⚠️ deliberately NOT a repair, same as blocklist [case16]: A8/F5 ruled
      //    the failhide out of scope. a later repair turns this red, which is
      //    the point — the decision becomes visible instead of silent.
      const result = useBeforeAll(async () => {
        const dir = genSandboxWithoutAllowlist();
        writeFileSync(
          path.join(dir, 'terms.gerunds.allowlist.jsonc'),
          '{ "allowed": [ "string", ] }', // a stray comma
        );
        const spawned = spawnSync(
          'bash',
          [path.join(dir, 'pretooluse.forbid-terms.gerunds.sh')],
          {
            encoding: 'utf-8',
            input: JSON.stringify(
              asWriteJson({
                filePath: 'test.ts',
                content: "const myVar: string = 'hi';",
              }),
            ),
            cwd: dir,
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );
        return { exitCode: spawned.status ?? 1, stderr: spawned.stderr ?? '' };
      });

      then(
        'the hook exits 2 — a malformed allowlist is a STRICTER gate',
        () => {
          // fail-CLOSED, the mirror of the blocklist's malformed fail-OPEN
          // ([case16] there). the two hooks must keep their opposite directions
          // — vision constraint #2 — and that holds on the malformed path
          // exactly as it does on the absent one.
          expect(result.exitCode).toEqual(2);
        },
      );

      then('stderr names the word it now refuses', () => {
        expect(result.stderr).toContain('string');
      });

      then('the WHOLE degraded refusal is snapshotted', () => {
        // the malformed path is a DIFFERENT code path from [t0] (`-f` is true,
        // so the loader runs and swallows the parse error), so its render owes
        // its own pin. two snapshots that happen to agree is a PROOF the two
        // paths converge; one snapshot reused across both would be a guess.
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = a cwd whose nudge file already holds one record, aged N seconds
   * .why = the clock cannot be advanced, so the RECORD is aged instead. that
   *        exercises the same arithmetic (`NOW - LAST_ATTEMPT`) with no fake
   *        clock and no sleep, and it gives [case16] a stamp of KNOWN value to
   *        assert against.
   */
  const genAgedNudge = (input: { secondsAgo: number; filePath: string }) => {
    const cwd = genTempCwd();
    const key = createHash('sha256').update(input.filePath).digest('hex');
    const time = Math.floor(Date.now() / 1000) - input.secondsAgo;
    writeFileSync(
      path.join(cwd, '.claude', 'terms.gerunds.nudges.local.json'),
      JSON.stringify({
        [key]: { time, path: input.filePath, terms: ['running'] },
      }),
    );
    return { cwd, key, time };
  };

  /**
   * .what = the nudge record this hook wrote, parsed
   * .why = three cases below assert on the ARTIFACT rather than the exit code,
   *        because that is the only place their regressions are visible
   */
  const readNudgeRecord = (cwd: string): Record<string, { time: number }> =>
    JSON.parse(
      readFileSync(
        path.join(cwd, '.claude', 'terms.gerunds.nudges.local.json'),
        'utf-8',
      ),
    );

  given('[case14] the nudge window CLOSES, and stale records are swept', () => {
    // 🔴 the twin of blocklist [case17]. this hook carries the IDENTICAL
    //    300s/3600s mechanism verbatim (gerunds.sh:25-26,159-174), so it owes
    //    the identical two assertions.
    //
    // 🔴 ⇒ a shared mechanism owes an assertion in EVERY file that holds a copy
    //    of it. pin it in ONE of the two and the suite reads as covered while a
    //    regression in the unpinned copy ships fully green.

    when('[t0] the retry comes 310s after the block — past the window', () => {
      const outcome = useBeforeAll(async () => {
        const aged = genAgedNudge({ secondsAgo: 310, filePath: 'test.ts' });
        return {
          result: runHook({
            json: asWriteJson({
              filePath: 'test.ts',
              content: 'const runningTotal = 1;',
            }),
            cwd: aged.cwd,
          }),
        };
      });

      then('the hook exits 2 — the window closed, so it blocks again', () => {
        expect(outcome.result.exitCode).toEqual(2);
      });
    });

    when(
      '[t1] the retry comes 290s after the block — inside the window',
      () => {
        // 🟡 the positive control on [t0]. 290/310 rather than 299/301: the age
        //    is stamped by the TEST and read by the HOOK, so the wall clock
        //    advances between them and a 1s margin flakes on a busy box —
        //    measured, on blocklist [case17].
        const outcome = useBeforeAll(async () => {
          const aged = genAgedNudge({ secondsAgo: 290, filePath: 'test.ts' });
          return {
            result: runHook({
              json: asWriteJson({
                filePath: 'test.ts',
                content: 'const runningTotal = 1;',
              }),
              cwd: aged.cwd,
            }),
          };
        });

        then('the hook exits 0 — the deliberate retry still lands', () => {
          expect(outcome.result.exitCode).toEqual(0);
        });
      },
    );

    when(
      '[t2] a record older than the stale threshold sits in the file',
      () => {
        const outcome = useBeforeAll(async () => {
          // STALE_THRESHOLD_SECONDS is 3600. the record names a DIFFERENT path,
          // so the sweep is the only thing that could remove it.
          const aged = genAgedNudge({ secondsAgo: 4000, filePath: 'old.ts' });
          const result = runHook({
            json: asWriteJson({
              filePath: 'test.ts',
              content: 'const runningTotal = 1;',
            }),
            cwd: aged.cwd,
          });
          return {
            result,
            record: readNudgeRecord(aged.cwd),
            staleKey: aged.key,
          };
        });

        then('the hook blocks on this write', () => {
          expect(outcome.result.exitCode).toEqual(2);
        });

        then('the stale record is swept, though it names another file', () => {
          expect(Object.keys(outcome.record)).not.toContain(outcome.staleKey);
        });

        then('this write own record is stamped', () => {
          // ⚠️ the sweep must not take the fresh record with it. an off-by-one in
          //    the predicate drops either ALL records or none, and only an
          //    assertion in both directions tells those two apart.
          expect(Object.keys(outcome.record)).toHaveLength(1);
        });
      },
    );
  });

  given('[case15] the nudge clock is keyed per file path', () => {
    // 🔴 the vision's case=3 names this cell outright — "the retry lands 4s
    //    later, but on a DIFFERENT file path → exits 2 — the clock is keyed
    //    per path" — so it owes a test that drives two paths in one window.
    //
    // 🔴 the harm if NUDGE_KEY coarsens (to a constant, the cwd, the tool
    //    name): one deliberate retry blesses EVERY file for 5 minutes, so a
    //    forbidden word lands unrefused in a file nobody nudged for. a
    //    single-path assertion stays green throughout.

    when(
      '[t0] a blocked file is retried, then a SECOND file is written',
      () => {
        const outcome = useBeforeAll(async () => {
          const first = runHook({
            json: asWriteJson({
              filePath: 'reef.ts',
              content: 'const runningTotal = 1;',
            }),
          });
          const retry = runHook({
            json: asWriteJson({
              filePath: 'reef.ts',
              content: 'const runningTotal = 1;',
            }),
            cwd: first.cwd,
          });
          const other = runHook({
            json: asWriteJson({
              filePath: 'shore.ts',
              content: 'const runningTotal = 1;',
            }),
            cwd: first.cwd,
          });
          return { first, retry, other };
        });

        then('the first write blocks', () => {
          expect(outcome.first.exitCode).toEqual(2);
        });

        then('its own retry lands — the nudge applies to THAT path', () => {
          // 🟡 the positive control. without it, a hook that blocked every write
          //    would satisfy the assertion below and prove naught about keying.
          expect(outcome.retry.exitCode).toEqual(0);
        });

        then('the second file still BLOCKS — the nudge did not travel', () => {
          expect(outcome.other.exitCode).toEqual(2);
        });
      },
    );
  });

  given('[case16] a permitted retry does NOT re-stamp the record', () => {
    // 🔴 the harm a re-stamp does: the window extends itself on every retry and
    //    never closes, so "block once, allow ONE deliberate retry, re-block
    //    after 5 min" silently becomes "block once, never again".
    //
    // 🔴 every exit-code assertion stays green under that regression — a
    //    re-stamp is invisible there. only a test that opens the written
    //    artifact can see it, the same blindness blocklist [case18] names in
    //    the nudge WRITE.
    //
    // .the code = gerunds.sh:172-174 exits 0 INSIDE the window, ahead of the
    //             stamp at :189-192. so the stamp is on the block path alone.
    //
    // .how = the record is SEEDED at a known age rather than written by a first
    //        run, so the expected stamp is an exact number. a two-run form
    //        would need a sleep to part two whole-second stamps, and a sleep in
    //        a test is a flake with a delay on it.

    when('[t0] a retry lands 100s into the window', () => {
      const outcome = useBeforeAll(async () => {
        const aged = genAgedNudge({ secondsAgo: 100, filePath: 'point.ts' });
        const retry = runHook({
          json: asWriteJson({
            filePath: 'point.ts',
            content: 'const runningTotal = 1;',
          }),
          cwd: aged.cwd,
        });
        return {
          retry,
          seeded: aged.time,
          stamped: readNudgeRecord(aged.cwd)[aged.key]!.time,
        };
      });

      then('the retry lands', () => {
        expect(outcome.retry.exitCode).toEqual(0);
      });

      then('the stamp is UNCHANGED — the window does not extend itself', () => {
        // 🔴 the assertion that bites. move the stamp ahead of the window check
        //    and this reads ~100s later, while the exit code above stays 0.
        expect(outcome.stamped).toEqual(outcome.seeded);
      });
    });
  });

  given('[case17] the nudge STATE FILE is unparseable json', () => {
    // 🔴 the twin of blocklist [case21]. it must live in BOTH files for the
    //    reason [case14] exists at all: a mechanism pinned in one of the two
    //    files that hold it reads as covered, and the unpinned copy ships
    //    green.
    //
    // ⚠️ the A8/F5 boundary is what makes this a repair rather than a clamp:
    //    that verdict governs the malformed CONFIG list (a policy input). this
    //    is the nudge STATE file, written AFTER the verdict is rendered, so a
    //    loud failure changes no block and no permit.
    when('[t0] a write trips an -ing word', () => {
      const outcome = useBeforeAll(async () => {
        const cwd = genTempCwd();
        writeFileSync(
          path.join(cwd, '.claude', 'terms.gerunds.nudges.local.json'),
          '{ "broken": ', // truncated — jq cannot parse it
        );
        return runHook({
          json: asWriteJson({
            filePath: 'test.ts',
            content: 'const runningTotal = 1;',
          }),
          cwd,
        });
      });

      then('the hook still exits 2 — the verdict is unchanged', () => {
        expect(outcome.exitCode).toEqual(2);
      });

      then('stderr says the record was NOT saved', () => {
        expect(outcome.stderr).toContain('HARDNUDGE record NOT saved');
      });

      then('stderr names the EFFECT and the FIX, not just the symptom', () => {
        expect(outcome.stderr).toContain('RE-BLOCK');
        expect(outcome.stderr).toContain('rm ');
      });

      then('the block message itself still renders in full', () => {
        // the diagnostic is ADDITIVE — acceptance #4's substance is intact.
        expect(outcome.stderr).toContain('ConstraintError');
        expect(outcome.stderr).toContain('running');
      });

      then('the WHOLE stderr reads as a human would meet it', () => {
        // 🔴 the twin of the blocklist's whole-message snapshot. it lands here
        //    too for the reason [case14] exists: a mechanism pinned in ONE of
        //    the two files that share it reads as covered, and the unpinned
        //    copy ships green.
        //
        //    the toContain calls above pin tokens and are blind to the shape
        //    between them — a reorder, or a dropped `effect:`/`fix:` line,
        //    ships green while the human meets a partial refusal.
        //
        // .note = the one interpolated value is $NUDGE_FILE, an absolute path
        //         under a per-run temp cwd. masked, never omitted: the
        //         `fix: rm '<path>'` line must stay copy-pasteable.
        // 🔴 .note = masked by PATTERN, never by `split(outcome.cwd)` — that
        //            form FLAKES: genTempDir's path resolves through a symlink
        //            and the hook derives NUDGE_FILE from an already-resolved
        //            `$PWD`, so the two never match. see the blocklist twin.
        expect(
          outcome.stderr.replace(
            /\/\S*terms\.gerunds\.nudges\.local\.json/g,
            '<nudge-file>',
          ),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case18] the stdin PAYLOAD is present but unparseable json', () => {
    // ⚠️ a CLAMP, never a repair — the twin of the blocklist's [case22].
    //
    //    the payload read ends `2>/dev/null || echo ""`, so an unparseable
    //    payload yields an empty TOOL_NAME, the `!= Write/Edit` guard reads
    //    true, and the hook exits 0 — a silent permit.
    //
    // 🔴 the asymmetry worth a note: on the CONFIG side these two hooks fail
    //    in OPPOSITE directions (an absent blocklist is inert; an absent
    //    allowlist is stricter). on the PAYLOAD side they agree — both
    //    permit. so this clamp is a genuine twin, and the config clamps
    //    deliberately are not.
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () => {
        const cwd = genTempCwd();
        const spawned = spawnSync('bash', [hookPath], {
          encoding: 'utf-8',
          input: '{ "tool_name": "Write", ', // truncated — jq cannot parse it
          cwd,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        return {
          exitCode: spawned.status ?? 1,
          stdout: spawned.stdout ?? '',
          stderr: spawned.stderr ?? '',
        };
      });

      then('the hook exits 0 — the declared verdict is PERMIT', () => {
        expect(result.exitCode).toEqual(0);
      });

      then('it emits no word on either stream', () => {
        expect(result.stdout).toEqual('');
        expect(result.stderr).toEqual('');
      });
    });
  });

  given(
    '[case19] the nudge file is VALID but the write to it cannot land',
    () => {
      // 🔴 the twin of the blocklist's [case26], and the sharpest kind of hole
      //    — it lives in the REPAIR, never in the code the repair replaces.
      //
      //    `if jq …; then mv …; else <warn> fi` puts `mv` in a `then` branch as
      //    a STANDALONE command, and under `set -euo pipefail` such a command
      //    exits the shell with its own status. so when jq succeeds (the state
      //    file parses) and `mv` fails, the hook dies at status 1 — before the
      //    block message and before `exit 2`. claude code reads a non-2 exit as
      //    NOT BLOCKED, so the gerund lands, silently.
      //
      // .how = the dir goes 0o555 and the file 0o444, which closes BOTH of mv's
      //        paths — rename() needs write on the dir, and the cross-device copy
      //        fallback needs write on the dest file. one alone leaves the other
      //        route open and the clamp does not bite.
      when(
        '[t0] a first write trips a gerund and the record cannot be stamped',
        () => {
          const result = useBeforeAll(async () => {
            const cwd = genTempCwd();
            const nudgeFile = path.join(
              cwd,
              '.claude',
              'terms.gerunds.nudges.local.json',
            );
            chmodSync(nudgeFile, 0o444);
            chmodSync(path.join(cwd, '.claude'), 0o555);
            const outcome = runHook({
              json: asWriteJson({
                filePath: '/tmp/surfboard.ts',
                content: 'the tide is rising at dawn',
              }),
              cwd,
            });
            // restore perms so the temp tree stays removable
            chmodSync(path.join(cwd, '.claude'), 0o755);
            chmodSync(nudgeFile, 0o644);
            return outcome;
          });

          then('the hook still BLOCKS — exit 2, never a fail-open 1', () => {
            expect(result.exitCode).toEqual(2);
          });

          then('the block message is still emitted in full', () => {
            expect(result.stderr).toContain('ConstraintError');
            expect(result.stderr).toContain('rising');
          });

          then('the lost stamp is reported loudly', () => {
            expect(result.stderr).toContain('HARDNUDGE record NOT saved');
          });

          then('the WHOLE warn+block render is snapshotted', () => {
            // 🔴 the twin of blocklist [case26], landed in the SAME turn — a
            //    repair to one of a mirrored pair is half a repair, and that
            //    lesson cost this stone two rounds at i004.
            //
            //    the write-blocked variant carries its OWN bytes: a word of
            //    `rising`, with a suggestion arm no other key holds. [case17]
            //    pins the warn+block SHAPE on the unparseable path; this pins
            //    the full render of the write-failed path
            //    (rule.require.contract-snapshot-exhaustiveness).
            //
            // .note = TWO masks, and the second is one [case17] does not need.
            //         [1] the nudge path — the hook derives NUDGE_FILE from
            //             `$PWD`, so the raw per-run path would land here.
            //         [2] 🔴 `mv`'s OWN stderr names its mkdtemp source file
            //             (`/tmp/tmp.XXXXXXXXXX`), which is fresh every run.
            //             [case17] never reaches `mv` — its jq fails first — so
            //             this line exists on the write-failed path ALONE, and
            //             a copy of [case17]'s single mask would have shipped a
            //             snapshot that flakes on its very next run.
            //         `file:` needs no mask — `/tmp/surfboard.ts` is a fixed
            //         literal in the fixture above.
            expect(
              result.stderr
                .replace(
                  /\/\S*terms\.gerunds\.nudges\.local\.json/g,
                  '<nudge-file>',
                )
                .replace(/\/tmp\/tmp\.\S+/g, '<mv-temp-file>'),
            ).toMatchSnapshot();
          });
        },
      );
    },
  );

  given(
    '[case20] arms a broader glob ABSORBS — the current text, pinned',
    () => {
      // 🔴 the `→ consider:` text comes from a ~120-arm `case`, walked
      //    TOP-DOWN, so an arm whose glob is a SUBSTRING of a later arm's glob
      //    absorbs that later arm outright.
      //
      //    three pairs are absorbed today, read from the live source:
      //
      //      :397 *connecting*  absorbs  :398 *disconnecting*
      //      :428 *wrapping*    absorbs  :429 *unwrapping*
      //      :430 *locking*     absorbs  :431 *unlocking*
      //
      //    plus a fourth class with no arm of its own: `rebinding` lands on
      //    :405 *binding* and is handed back "bind, bound, binder".
      //
      //    ⇒ each of the four hands a human the INVERTED verb. told to
      //      "consider: connect" for `disconnecting`, a human reads advice that
      //      means the opposite of the word they wrote.
      //
      // ✅ verified FIRST-HAND, never modeled: the hook refused this very file on
      //    its first write and handed back all four inversions in the block
      //    message. the assertions below are transcribed from that refusal.
      //
      // 🔴 the repair is FORBIDDEN here, and that is precisely why this clamp is
      //    owed. acceptance #4 binds "the same per-term alternatives", so a
      //    reorder of the arms would change block-message text and breach the
      //    wish outright. the defect is deferred to
      //    `.dream/v2026_09_12.fix.gerund-suggestion-table-shadowed-case-arms.md`.
      //
      // ⚠️ so this case pins the CURRENT, WRONG output ON PURPOSE. it does not
      //    assert the text is right. it asserts what "unchanged" MEANS for these
      //    four words — so the later wish that does repair them meets a red test
      //    to turn green, rather than a silent diff nobody reads.
      //
      // 🔴 the transferable part: r10 parted the DEFERRAL from the CLAMP, and the
      //    two are independent. a correctly-deferred defect still owes a test of
      //    what is deferred, or the deferral is indistinguishable from a miss.
      when('[t0] a write trips all four absorbed words at once', () => {
        const result = useBeforeAll(async () =>
          runHook({
            json: asWriteJson({
              filePath: 'surf.ts',
              content: 'disconnecting unwrapping unlocking rebinding the leash',
            }),
          }),
        );

        then('the hook exits 2', () => {
          expect(result.exitCode).toEqual(2);
        });

        then('an absorbed word is handed its ABSORBER\u2019s verb', () => {
          // the inversion, stated as an assertion so it cannot drift in silence
          expect(result.stderr).toContain(
            'disconnecting → consider: connect, connected, connector',
          );
          expect(result.stderr).toContain(
            'unwrapping → consider: wrap, wrapped, wrapper',
          );
          expect(result.stderr).toContain(
            'unlocking → consider: lock, locked, locker',
          );
        });

        then('a word with NO arm of its own takes the nearest glob', () => {
          expect(result.stderr).toContain(
            'rebinding → consider: bind, bound, binder',
          );
        });

        then('none of the four reaches the `*` fallback', () => {
          // 🟡 the control that keeps this case honest. were the four to fall
          //    through to `*`, every assertion above would read as a pass of a
          //    different mechanism — the absorption would be untested and this
          //    case would vouch for it anyway.
          expect(result.stderr).not.toContain(
            'disconnecting → consider: remove',
          );
          expect(result.stderr).not.toContain('unwrapping → consider: remove');
          expect(result.stderr).not.toContain('unlocking → consider: remove');
          expect(result.stderr).not.toContain('rebinding → consider: remove');
        });

        then('the WHOLE message is snapshotted', () => {
          expect(result.stderr).toMatchSnapshot();
        });
      });
    },
  );

  given('[case21] the nudge file CANNOT be created', () => {
    // 🔴 a REPAIR rather than a clamp of extant behavior. the bootstrap
    //    `echo '{}' > "$NUDGE_FILE"` as a bare simple command under
    //    `set -euo pipefail` exits the shell at status 1 on a failed redirect —
    //    BEFORE the block message and BEFORE `exit 2`. claude code reads a
    //    non-2 exit as NOT BLOCKED ⇒ the gerund lands silently, on the one path
    //    where a gate must not yield.
    //
    // 🔴 .note = the twin of the blocklist's `[case29]`, and it must live in
    //            BOTH files for the same reason `[case17]`/`[case21]` do: the
    //            ~140 lines of HARDNUDGE bash are duplicated per hook (F11), so
    //            a repair applied to one copy and not the other is invisible to
    //            a suite that tests only one. an `elapsed`/`ELAPSED` drift
    //            between these same two copies is the measured precedent.
    //
    // 🔴 .note = the fixture puts a DIRECTORY at the nudge file's path rather
    //            than a read-only parent. `chmod` is defeated by a root test
    //            runner — in CI that would make this clamp pass vacuously
    //            against BOTH the fixed and the broken hook. a redirect onto a
    //            directory fails as `Is a directory` for every uid.
    when('[t0] a write trips a gerund and the state dir is unwritable', () => {
      const result = useBeforeAll(async () => {
        const cwd = genHookTempCwd({
          slug: 'hook-gerunds-nonudge',
          nudgeFileName: null,
        });
        mkdirSync(
          path.join(cwd, '.claude', 'terms.gerunds.nudges.local.json'),
          {
            recursive: true,
          },
        );
        return runHook({
          json: asWriteJson({
            filePath: 'surf.ts',
            content: 'const y = processing;',
          }),
          cwd,
        });
      });

      then('the hook exits 2 — it fails CLOSED, never open', () => {
        // 🔴 THE assertion. without the `|| true` on the bootstrap this is 1,
        //    and claude code admits the write.
        expect(result.exitCode).toEqual(2);
      });

      then('the human still reads the ordinary refusal', () => {
        // the state loss must not degrade the message — none of what
        // acceptance #4 pins lives in the nudge file.
        expect(result.stderr).toContain('processing');
        expect(result.stderr).toContain('consider:');
      });
    });
  });
});
