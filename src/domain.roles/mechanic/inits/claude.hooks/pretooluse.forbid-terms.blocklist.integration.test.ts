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
 * .what = integration tests for pretooluse.forbid-terms.blocklist.sh
 * .why = verify the hook blocks blocklisted terms, honors the HARDNUDGE retry
 *        window, and holds its fork budget
 *
 * .note = replaces pretooluse.forbid-terms.blocklist.test.sh, whose assertions
 *         are carried forward case for case (rule.require.jest-tests-for-skills)
 * .note = each run gets its own temp cwd, so the nudge file it writes never
 *         touches the repo's own .claude dir (rule.require.hermetic-tests)
 */
describe('pretooluse.forbid-terms.blocklist.sh', () => {
  const hookPath = path.join(__dirname, 'pretooluse.forbid-terms.blocklist.sh');

  /**
   * .what = a term the SHIPPED blocklist holds, used as fixture content
   * .why = named once so a case reads as "a forbidden term" rather than as a
   *        bare word a later reader might mistake for prose and "fix"
   */
  const TERM_VAGUE = 'nothing';

  /**
   * .what = a hermetic cwd with its own .claude dir
   * .why = find_claude_dir walks up from PWD; a temp cwd keeps each run's
   *        nudge state isolated from the repo and from other tests
   *
   * .note = the root comes from test-fns `genTempDir`, never an adhoc `mkdtemp`
   *         (rule.forbid.adhoc-gentempdir-reimpl). the `.claude` write below is
   *         net-new content, not a reimpl — genTempDir provides clone/symlink/git
   *         and no arbitrary-file option.
   */
  const genTempCwd = (): string =>
    genHookTempCwd({
      slug: 'hook-blocklist',
      nudgeFileName: 'terms.blocklist.nudges.local.json',
    });

  /**
   * .what = run the hook against a payload, in a fresh or a supplied cwd
   * .why = the returned `cwd` is what lets a second call reuse the FIRST call's
   *        nudge state. that is the whole HARDNUDGE protocol, so it is returned
   *        rather than held in a closure — a shared closure would leak state
   *        between cases and make a retry test pass for the wrong reason.
   */
  const runHook = (input: {
    json: unknown;
    cwd?: string;
  }): { stdout: string; stderr: string; exitCode: number; cwd: string } =>
    runHookIn({
      hookPath,
      json: input.json,
      cwd: input.cwd ?? genTempCwd(),
    });

  /**
   * .what = build the stdin payload claude code hands a PreToolUse hook
   * .why = named args, never positional — `old` and `new` are the same type, so a
   *        positional pair swaps silently (rule.forbid.positional-args)
   */
  // .note = the payload builders are shared leaves now — `asWriteJson`,
  //         `asEditJson`. their shape is a CONTRACT with claude code, so two
  //         copies that drift produce two suites that test a payload the hook
  //         never receives.

  /**
   * .what = the Edit payload shape, whose scanned field is new_string
   * .why = a hook scans ONLY new_string on an Edit, so old_string must be a real
   *        peer field rather than a stub — `[case6]` proves a term present only
   *        in old_string is permitted, and that case needs both fields to differ.
   */

  /**
   * .what = a temp dir that holds a copy of the hook + a crafted blocklist
   * .why = the hook resolves its list from ${BASH_SOURCE[0]%/*}, so the only way
   *        to exercise a different list is to move the hook beside it — no edit
   *        to the real terms.blocklist.jsonc is ever needed
   *
   * .note = `terms: null` writes NO list file at all, which is the absent-config
   *         case. that path and the malformed-config path are distinct, and the
   *         vision requires both stay distinct from the gerunds hook's (case=5)
   */
  const genSandbox = (input: {
    terms: unknown[] | null;
    raw?: string;
  }): string => {
    const dir = genTempDir({ slug: 'hook-blocklist-sandbox' });
    mkdirSync(path.join(dir, '.claude'), { recursive: true });
    writeFileSync(
      path.join(dir, '.claude', 'terms.blocklist.nudges.local.json'),
      '{}',
    );
    copyFileSync(
      hookPath,
      path.join(dir, 'pretooluse.forbid-terms.blocklist.sh'),
    );
    // .note = `raw` writes the list file byte-for-byte, so a MALFORMED list can be
    //         exercised. `terms` cannot express one, since JSON.stringify always
    //         emits valid json — the exact reason the malformed path went unclamped.
    if (input.raw !== undefined)
      writeFileSync(path.join(dir, 'terms.blocklist.jsonc'), input.raw);
    else if (input.terms !== null)
      writeFileSync(
        path.join(dir, 'terms.blocklist.jsonc'),
        JSON.stringify({ terms: input.terms }, null, 2),
      );
    return dir;
  };

  /**
   * .what = run the hook COPY that sits inside a sandbox dir, never the real one
   * .why = the hook resolves its list from ${BASH_SOURCE[0]%/*}, so the list a
   *        run reads is decided by where the hook FILE sits. a run of the repo's
   *        hook with a sandbox cwd would silently read the REAL list and make a
   *        crafted-list case pass for the wrong reason.
   */
  const runIn = (input: {
    dir: string;
    content: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const spawned = spawnSync(
      'bash',
      [path.join(input.dir, 'pretooluse.forbid-terms.blocklist.sh')],
      {
        encoding: 'utf-8',
        input: JSON.stringify(
          asWriteJson({ filePath: 'notes.md', content: input.content }),
        ),
        cwd: input.dir,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    return {
      stdout: spawned.stdout ?? '',
      stderr: spawned.stderr ?? '',
      exitCode: spawned.status ?? 1,
    };
  };

  given('[case1] a Write that holds a blocklisted term', () => {
    when('[t0] it is the first attempt', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asWriteJson({
            filePath: 'deploy.sh',
            content: 'run the deploy script here',
          }),
        }),
      );

      then('the hook exits 2 — blocked', () => {
        expect(result.exitCode).toEqual(2);
      });

      then('stderr names the detected term', () => {
        expect(result.stderr).toContain('script');
      });

      then('stderr carries the why and the alt for that term', () => {
        // acceptance #4 — the block message keeps its substance
        expect(result.stderr).toContain('why:');
        expect(result.stderr).toContain('alt:');
      });

      then('the message goes to stderr, never stdout', () => {
        // claude code reads a hook's block reason from stderr
        expect(result.stdout).toEqual('');
      });

      then('the WHOLE message is snapshotted — acceptance #4', () => {
        // 🔴 rule.require.snapshots: "key for user-faced outputs", and
        //    "CRITICAL: use both snapshot AND explicit assertions".
        //
        //    the three toContain calls above pin three fragments. acceptance #4
        //    asks that the message be "unchanged in substance", which is a claim
        //    about the WHOLE text — the header, the file line, the per-term
        //    layout, the rationale line, the retry instruction. a fragment
        //    assertion cannot see a line dropped from between two it checks.
        //
        // .note = deterministic by construction: the only interpolated value is
        //         file_path, and this case supplies a fixed one.
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case2] a Write that holds a blocklisted term, twice', () => {
    when('[t0] the same file is written again inside the nudge window', () => {
      const outcome = useBeforeAll(async () => {
        const json = asWriteJson({
          filePath: 'deploy.sh',
          content: 'run the deploy script here',
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
        // 🔴 acceptance #3 has THREE clauses: first blocks · retry passes · "the
        //    nudge record keeps its shape". the two above cover the first two.
        //
        //    the third needs its own assertion because the file OUTLIVES the
        //    hook: a human mid-window upgrades the role, and the new hook reads
        //    a record the old one wrote. change the shape and
        //    `jq '.[$key].time // 0'` falls back to 0 ⇒ elapsed reads as huge ⇒
        //    the deliberate retry is REFUSED. and no exit-code test would see
        //    it, since a hook is self-consistent with whatever it writes.
        const record = JSON.parse(
          readFileSync(
            path.join(
              outcome.first.cwd,
              '.claude',
              'terms.blocklist.nudges.local.json',
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
        expect(entry.path).toEqual('deploy.sh');
        expect(entry.terms).toEqual(['script']);
      });
    });
  });

  given('[case3] a Write that holds no blocklisted term', () => {
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asWriteJson({
            filePath: 'deploy.sh',
            content: 'run the deploy command here',
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

  given('[case4] an Edit whose new_string holds a blocklisted term', () => {
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asEditJson({
            filePath: 'readme.md',
            oldString: 'old text',
            newString: 'run the script to deploy',
          }),
        }),
      );

      then('the hook exits 2 — blocked', () => {
        expect(result.exitCode).toEqual(2);
      });

      then('stderr names the detected term', () => {
        expect(result.stderr).toContain('script');
      });
    });
  });

  given('[case5] an Edit whose term sits only in old_string', () => {
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asEditJson({
            filePath: 'readme.md',
            oldString: 'run the script',
            newString: 'run the command',
          }),
        }),
      );

      then('the hook exits 0 — only additions are scanned', () => {
        expect(result.exitCode).toEqual(0);
      });
    });
  });

  given('[case6] a Bash tool call that holds a blocklisted term', () => {
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: {
            tool_name: 'Bash',
            tool_input: { command: 'npm run script' },
          },
        }),
      );

      then('the hook exits 0 — it gates Write and Edit only', () => {
        expect(result.exitCode).toEqual(0);
      });
    });
  });

  given('[case7] a Write where the term sits inside a longer word', () => {
    when('[t0] the content holds "typescript"', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asWriteJson({
            filePath: 'app.ts',
            content: "const x: typescript = 'hello';",
          }),
        }),
      );

      then('the hook exits 0 — the word boundary holds', () => {
        expect(result.exitCode).toEqual(0);
      });
    });
  });

  given('[case8] a Write that holds the term in uppercase', () => {
    when('[t0] the content holds "SCRIPT"', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: asWriteJson({
            filePath: 'readme.md',
            content: 'run the SCRIPT to deploy',
          }),
        }),
      );

      then('the hook exits 2 — the match is case-insensitive', () => {
        expect(result.exitCode).toEqual(2);
      });

      then('stderr names the term', () => {
        expect(result.stderr.toLowerCase()).toContain('script');
      });
    });
  });

  given('[case9] a Write that holds SEVERAL blocklisted terms', () => {
    // 🔴 the arity this suite never exercised. every other case trips exactly
    //    ONE term, so the comma-join that builds DETECTED_TERMS was covered
    //    only at n=1 — the one arity at which a join emits no separator at all.
    //
    //    that matters because `${DETECTED_TERMS:+,}` REPLACED an if/else, and
    //    the two forms differ ONLY at n>=2. a refactor whose sole point of
    //    divergence is untested is a refactor nobody verified.
    when('[t0] the hook runs', () => {
      const outcome = useBeforeAll(async () => {
        const json = asWriteJson({
          filePath: 'deploy.sh',
          content: 'the script will normalize the existing rows',
        });
        const first = runHook({ json });
        return { first };
      });

      then('the hook exits 2', () => {
        expect(outcome.first.exitCode).toEqual(2);
      });

      then('stderr names EVERY term, never only the first', () => {
        expect(outcome.first.stderr).toContain('script');
        expect(outcome.first.stderr).toContain('normalize');
        expect(outcome.first.stderr).toContain('existing');
      });

      then(
        'the WHOLE multi-term message is snapshotted — acceptance #4',
        () => {
          // 🔴 the n>=2 render is a DISTINCT output variant a caller reaches on
          //    any write that trips two terms, and [case1] snaps only n=1. the
          //    fragment assertions above prove each term APPEARS; they cannot
          //    diff the block's shape — the `⛔` line count, their order, the
          //    per-term why/alt pairing, the blank-line rhythm between them.
          //
          // .note = deterministic by construction: the only interpolated value
          //         is file_path, fixed at `deploy.sh` by the fixture above, so
          //         no mkdtemp suffix can reach the snapshot — the same ground
          //         [case1]'s snapshot stands on.
          expect(outcome.first.stderr).toMatchSnapshot();
        },
      );

      then('the nudge record carries a WELL-FORMED multi-term array', () => {
        // 🔴 this is the assertion the join needed. a broken separator yields
        //    `["script""normalize"]`, which is not valid json — so `jq` fails,
        //    the write is discarded by the `|| rm -f`, and the record silently
        //    keeps its PRIOR content. the exit code stays 2 either way.
        const record = JSON.parse(
          readFileSync(
            path.join(
              outcome.first.cwd,
              '.claude',
              'terms.blocklist.nudges.local.json',
            ),
            'utf-8',
          ),
        );

        const keys = Object.keys(record);
        expect(keys).toHaveLength(1);

        const entry = record[keys[0]!];
        expect(entry.terms).toEqual(['script', 'normalize', 'existing']);
      });
    });
  });

  given('[case10] stdin is empty', () => {
    when('[t0] the hook runs', () => {
      const result = useBeforeAll(async () => {
        const cwd = genTempCwd();
        const spawned = spawnSync('bash', [hookPath], {
          encoding: 'utf-8',
          input: '',
          cwd,
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
        // 🔴 the two fragment assertions above pass on a message whose lines
        //    were reordered, whose `why:` was dropped, or whose copy-paste
        //    example no longer parses. this is the message a human reads when
        //    they hand the hook a bad payload BY HAND — the one moment a prior
        //    step already went wrong — so it is snapped in full.
        //
        // .note = the one interpolated value is `${BASH_SOURCE[0]}`, an
        //         ABSOLUTE path that differs per machine. it is masked, never
        //         omitted: its presence and position are part of the contract
        //         (the example must be runnable), only its prefix is not.
        // .note = split/join, never String.replaceAll — the tsconfig lib target
        //         predates es2021, so replaceAll does not typecheck here.
        expect(result.stderr.split(hookPath).join('<hook>')).toMatchSnapshot();
      });
    });
  });

  given('[case11] the blocklist holds a term that is not a valid regex', () => {
    // 🔴 the ONE hole this rewrite would author, rather than inherit.
    //
    //    before: one `grep -iqE "\b${TERM}\b"` PER TERM. a term that holds a
    //    regex metacharacter errors ITS OWN grep (exit 2 => the `if` reads
    //    false), and the other eight terms still guard. a hole of size one.
    //
    //    after: the nine collapse into one `\b(a|b|c…)\b` alternation. that
    //    same term now errors the ONLY grep => no match => ALL NINE permit,
    //    with no signal at all. a hole of size nine.
    //
    //    so the collapse MUST part grep's exit 1 ("no match") from its exit 2
    //    ("bad pattern") and fail loud on 2 (rule.forbid.failhide). fold the
    //    two back together and this case goes green while the gate is wide
    //    open — which is exactly why it is clamped here.
    //
    // .note = the hook reads its list from ${BASH_SOURCE[0]%/*}, so a copy of
    //         the hook into a temp dir beside a crafted .jsonc is what lets a
    //         malformed list be exercised without any edit to the real one.

    // an unbalanced paren cannot compile inside the alternation
    const TERMS_MALFORMED = [
      { term: 'deploy', why: 'vague', alt: ['ship'] },
      { term: 'kook(swell', why: 'not a valid regex', alt: ['kook'] },
    ];

    when('[t0] a write trips no term at all', () => {
      const result = useBeforeAll(async () =>
        runIn({
          dir: genSandbox({ terms: TERMS_MALFORMED }),
          content: 'the surf report holds a clean forecast for dawn patrol.',
        }),
      );

      then('the hook exits 2 — it refuses to guess, it fails LOUD', () => {
        // 🔴 the assertion that bites. fold exit 2 into the exit-1 path and
        //    this reads 0: the write lands, and every blocklisted term is
        //    permitted silently.
        expect(result.exitCode).toEqual(2);
      });

      then('stderr names the malformed pattern as the cause', () => {
        expect(result.stderr).toContain('not a valid regex');
      });

      then('stderr names the fix, never only the symptom', () => {
        // rule.require.errors-name-the-fix
        expect(result.stderr).toContain('terms.blocklist.jsonc');
      });

      then('stderr says why it fails loud rather than opens', () => {
        expect(result.stderr).toContain('permit EVERY blocklisted term');
      });

      then('the WHOLE message is snapshotted — a NEW human contract', () => {
        // 🔴 the three assertions above are substring probes, so a regression
        //    that drops the `fix:` line or the retry-escape line ships green
        //    and no reviewer can vibecheck what a human actually reads.
        //
        //    it earns a snapshot more than the healthy block message does:
        //    [case1] snaps a message this diff INHERITED; this one the diff
        //    AUTHORED, and a message with no prior art has no baseline a
        //    reader could compare against.
        //
        // .note = deterministic — the only interpolated values are FILE_PATH
        //         (fixed by runIn) and the alternation (fixed by TERMS_MALFORMED).
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] a write trips a term that IS valid', () => {
      const result = useBeforeAll(async () =>
        runIn({
          dir: genSandbox({ terms: TERMS_MALFORMED }),
          content: 'run the deploy step here',
        }),
      );

      then('the hook still exits 2 — the gate never opens', () => {
        // the block reason differs (bad pattern, not the term), and the
        // outcome a human sees is the same: the write does not land.
        expect(result.exitCode).toEqual(2);
      });
    });

    when('[t2] every term in the list is a valid regex', () => {
      const result = useBeforeAll(async () =>
        runIn({
          dir: genSandbox({
            terms: [{ term: 'deploy', why: 'vague', alt: ['ship'] }],
          }),
          content: 'the surf report holds a clean forecast for dawn patrol.',
        }),
      );

      then(
        'the write lands — the guard fires only on a real bad pattern',
        () => {
          expect(result.exitCode).toEqual(0);
        },
      );
    });
  });

  given(
    '[case23] a term that breaks ONLY the per-term grep, not the alternation',
    () => {
      // 🔴 the two grep layers disagree about what a failure means, and this
      //    case proves the disagreement REACHABLE.
      //
      //    the trick is that the two layers wrap the term differently:
      //      alternation:  \b(deploy|)swell()\b   ← `(deploy|)` `swell` `()` — BALANCED
      //      per-term:     \b)swell(\b            ← a `)` up front — UNMATCHED
      //
      //    so `)swell(` compiles in the gate and fails in the walk. a malformed
      //    term of the ordinary shape ([case11]'s `kook(swell`) breaks the gate
      //    FIRST, which is why this hole reads as hypothetical until a term
      //    that parts the two layers is found.
      //
      // ⚠️ the VERDICT here is deliberately unchanged — the term is skipped, as
      //    it was before the collapse, because acceptance #2 bars a policy move
      //    in either direction. what changed is that the skip is no longer
      //    SILENT.
      const TERMS_HALF_MALFORMED = [
        { term: 'deploy', why: 'vague', alt: ['ship'] },
        { term: ')swell(', why: 'breaks only the walk', alt: ['swell'] },
      ];

      when('[t0] a write trips ONLY the good term', () => {
        const result = useBeforeAll(async () =>
          runIn({
            dir: genSandbox({ terms: TERMS_HALF_MALFORMED }),
            content: 'we deploy at dawn.',
          }),
        );

        // 🔴🔴 THE HOLE, PINNED. this was found here, and it is WORSE than the
        //      asymmetry r007 described.
        //
        //      `)swell(` does not merely fail its own grep. it re-parses the WHOLE
        //      alternation into a different pattern:
        //
        //        intended:  \b(deploy|)swell()\b  =  "deploy" OR ")swell("
        //        actual:    \b(deploy|)swell()\b  =  ("deploy" or empty) then "swell"
        //
        //      ⇒ the gate now demands the literal `swell`, so `deploy` — a perfectly
        //      valid term — goes COMPLETELY UNGUARDED. it compiles, so the Q11
        //      exit-2 guard never fires, and no signal is raised anywhere.
        //
        // ⚠️ this is a hole the COLLAPSE authored: before it, `deploy` had its own
        //    grep and blocked regardless of what a neighbour term held.
        //
        // 🟡 it is NOT closed here. the only cheap detection is a compile-check per
        //    term, which costs N execs on the CLEAN path and breaches acceptance #1
        //    outright. ⇒ caught as a dream + fulcrum, and pinned here so the next
        //    traveler reads the behavior rather than rediscovers it.
        then('🔴 the good term goes UNGUARDED — a known, dreamed hole', () => {
          expect(result.exitCode).toEqual(0);
        });

        then('and it is silent — no signal at all', () => {
          // the tell that exit-2 detection cannot reach this: the pattern is VALID.
          expect(result.stderr).toEqual('');
        });
      });

      when('[t1] a write trips the corrupted pattern, so the walk runs', () => {
        const result = useBeforeAll(async () =>
          runIn({
            dir: genSandbox({ terms: TERMS_HALF_MALFORMED }),
            content: 'we deploy swell at dawn.',
          }),
        );

        then('the hook BLOCKS, and names the good term', () => {
          expect(result.exitCode).toEqual(2);
          expect(result.stderr).toContain('deploy');
        });

        then('stderr reports the broken term as SKIPPED', () => {
          // 🔴 the assertion that bites. drop the `elif [[ $? -gt 1 ]]` branch and
          //    this reads empty while the block above stays green — exactly the
          //    silent-skip shape r007 named, now reached and clamped.
          expect(result.stderr).toContain('SKIPPED');
          expect(result.stderr).toContain(')swell(');
        });

        then('the report names the blast radius and the fix', () => {
          // rule.require.errors-name-the-fix: a maintainer must learn that the
          // OTHER terms still guard, or they will over-react to the report.
          expect(result.stderr).toContain('only this one is blind');
          expect(result.stderr).toContain('terms.blocklist.jsonc');
        });

        then('the WHOLE stderr reads as a maintainer would meet it', () => {
          // 🔴 the four `toContain`s above prove PRESENCE and prove naught
          //    about SHAPE — reorder the lines, or drop the `why:` or `effect:`
          //    line, and all four stay green while the maintainer meets a
          //    report with a hole in it.
          //
          //    every authored message on this hook earns a whole-message
          //    snapshot ([case10] no-input, [case11] bad-regex block, [case21]
          //    record-not-saved), and this one most of all: a maintainer meets
          //    it at the worst moment — a term of theirs has gone silently
          //    blind.
          //
          // .note = no mask is owed. the only interpolated value is `${TERM}`,
          //         fixed by the fixture above, and this branch writes no path.
          //         ⇒ deterministic by construction, unlike [case21]'s, which
          //         must mask a temp nudge path.
          expect(result.stderr).toMatchSnapshot();
        });
      });
    },
  );

  given('[case24] a record whose `term` field is absent', () => {
    // 🔴 `([$t[].term] | join("|"))` carries no `// ""` default, unlike `.why`
    //    and `.alt` — so a null term could abort the whole jq, empty
    //    BLOCKLIST_LINES, and open the gate. this measures whether it does.
    const TERMS_NO_TERM_FIELD = [
      { term: 'deploy', why: 'vague', alt: ['ship'] },
      { why: 'this record has no term field at all' },
    ];

    when('[t0] a write trips the neighbour term', () => {
      const result = useBeforeAll(async () =>
        runIn({
          dir: genSandbox({ terms: TERMS_NO_TERM_FIELD }),
          content: 'we deploy at dawn.',
        }),
      );

      then(
        'the neighbour term still BLOCKS — one bad record is tolerated',
        () => {
          expect(result.exitCode).toEqual(2);
          expect(result.stderr).toContain('deploy');
        },
      );
    });
  });

  given('[case28] a record whose `term` is an EMPTY STRING', () => {
    // 🔴 an empty term is INERT, never universal — and this case is what
    //    settles it, because the derivation points the other way.
    //
    //    derived: `strings` drops a null and KEEPS `""`, so the alternation
    //    renders `deploy|`, and `\b(deploy|)\b` has an empty branch that hits
    //    at every word boundary ⇒ "every Write/Edit blocks."
    //
    //    the jq half of that is right — the alternation really does render
    //    `deploy|`. the last step is not: GNU grep does not fire on the empty
    //    branch. an empty alternative is UNDEFINED in posix ERE, and grep
    //    resolves it as never-fires rather than always-fires. nor is it an
    //    ERROR: status is 1 (no hit), never 2, so the bad-regex guard is
    //    untouched.
    //
    // ⚠️ ⇒ a regex claim derived rather than RUN is a hypothesis. reason about
    //    `\b(…)\b` yields one right prediction (the alternation text) and one
    //    wrong one (what grep does with it); only an exec parts them.
    //
    // ⚠️ .note = the number is 28 rather than 26 — 26 and 27 are taken. the
    //            placement is by SUBJECT, never by index.
    const TERMS_EMPTY_TERM = [
      { term: 'deploy', why: 'vague', alt: ['ship'] },
      { term: '', why: 'a cleared value', alt: ['none'] },
    ];

    when('[t0] a write that trips NO term is attempted', () => {
      const result = useBeforeAll(async () =>
        runIn({
          dir: genSandbox({ terms: TERMS_EMPTY_TERM }),
          content: 'the surf was clean and the water warm.',
        }),
      );

      then('the hook PERMITS it — the empty branch fires on naught', () => {
        expect(result.exitCode).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });

    when('[t1] a write that trips the NEIGHBOUR term is attempted', () => {
      // 🔴 the positive control, and it is what gives [t0] its meaning.
      //    [t0] alone cannot part "the empty branch is inert" from "the fixture
      //    never loaded" — both render exit 0. this proves the config WAS read
      //    and the term that remains still guards.
      const result = useBeforeAll(async () =>
        runIn({
          dir: genSandbox({ terms: TERMS_EMPTY_TERM }),
          content: 'we deploy at dawn.',
        }),
      );

      then('the neighbour term still BLOCKS', () => {
        expect(result.exitCode).toEqual(2);
        expect(result.stderr).toContain('deploy');
      });

      then('the WHOLE message renders as a human meets it', () => {
        // the render answers the half an exit code cannot: once the walk IS
        // reached, does the empty term report itself as a detected term beside
        // the real one? the snapshot is the answer, whichever way it falls.
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case25] a record whose `alt` is a string, not an array', () => {
    // 🔴 `("use" // [])` keeps the string, and `"use" | join(", ")` errors —
    //    which fails the SINGLE collapsed exec, so `2>/dev/null || echo ""`
    //    empties every line and the gate opens.
    //
    //    the `// []` default covers an ABSENT alt ([case15]). it does not cover
    //    a WRONG-TYPED one, and the blocklist is human-edited.
    const TERMS_STRING_ALT = [
      { term: 'deploy', why: 'vague', alt: ['ship'] },
      { term: 'leverage', why: 'jargon', alt: 'use' },
    ];

    when('[t0] a write trips the well-formed term', () => {
      const result = useBeforeAll(async () =>
        runIn({
          dir: genSandbox({ terms: TERMS_STRING_ALT }),
          content: 'we deploy at dawn.',
        }),
      );

      then('the well-formed term still BLOCKS', () => {
        expect(result.exitCode).toEqual(2);
        expect(result.stderr).toContain('deploy');
      });
    });

    when('[t1] a write trips the wrong-typed term', () => {
      const result = useBeforeAll(async () =>
        runIn({
          dir: genSandbox({ terms: TERMS_STRING_ALT }),
          content: 'we leverage the tide.',
        }),
      );

      then(
        'it BLOCKS too — a bad `alt` degrades detail, never the gate',
        () => {
          expect(result.exitCode).toEqual(2);
          expect(result.stderr).toContain('leverage');
        },
      );

      then('the WHOLE degraded-detail render is snapshotted', () => {
        // 🔴 the `alt:` line is where a wrong-typed record shows, and a
        //    toContain on the term alone cannot see it. this pins WHICH
        //    detail degrades and which survives — the whole claim of the
        //    `then` above (rule.require.contract-snapshot-exhaustiveness).
        //
        //    no mask is owed: `genSandbox` writes a fixed terms list and the
        //    render interpolates only `file:`, which runIn fixes.
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given(
    '[case26] the nudge file is VALID but the write to it cannot land',
    () => {
      // 🔴 the hole a loud-warn restructure opens, and it is the sharpest kind:
      //    it lives in the REPAIR, never in the code the repair replaces.
      //
      //    `if jq …; then mv …; else <warn> fi` puts `mv` in a `then` branch as
      //    a STANDALONE command, and under `set -euo pipefail` such a command
      //    exits the shell with its own status. so when jq succeeds (the state
      //    file parses) and `mv` fails (a read-only dir, a full disk), the hook
      //    dies at status 1 — before the block message and before `exit 2`.
      //    claude code reads a non-2 exit as NOT BLOCKED, so a forbidden term
      //    lands, silently.
      //
      //    ⇒ `jq … && mv … || rm -f …` carries no such hole: a `&&`/`||` list
      //      is exempt from `set -e`, so it always falls through to exit 2. a
      //      restructure that makes the write LOUD must not make the gate FAIL
      //      OPEN on the very branch its own message advertises.
      //
      // .how = the dir goes 0o555 and the file 0o444, which closes BOTH of mv's
      //        paths — rename() needs write on the dir, and the cross-device
      //        copy fallback needs write on the dest file. one alone would leave
      //        the other route open and the clamp would not bite.
      const genCwdWriteBlocked = (): string => {
        const dir = genTempCwd();
        chmodSync(
          path.join(dir, '.claude', 'terms.blocklist.nudges.local.json'),
          0o444,
        );
        chmodSync(path.join(dir, '.claude'), 0o555);
        return dir;
      };

      when(
        '[t0] a first write trips a term and the record cannot be stamped',
        () => {
          const result = useBeforeAll(async () => {
            const cwd = genCwdWriteBlocked();
            const outcome = runHook({
              json: asWriteJson({
                filePath: '/tmp/surfboard.ts',
                content: 'we normalize the board at dawn',
              }),
              cwd,
            });
            // restore perms so the temp tree stays removable
            chmodSync(path.join(cwd, '.claude'), 0o755);
            chmodSync(
              path.join(cwd, '.claude', 'terms.blocklist.nudges.local.json'),
              0o644,
            );
            return outcome;
          });

          then('the hook still BLOCKS — exit 2, never a fail-open 1', () => {
            expect(result.exitCode).toEqual(2);
          });

          then('the block message is still emitted in full', () => {
            expect(result.stderr).toContain('ConstraintError');
            expect(result.stderr).toContain('normalize');
          });

          then('the lost stamp is reported loudly', () => {
            expect(result.stderr).toContain('HARDNUDGE record NOT saved');
          });

          then('the WHOLE warn+block render is snapshotted', () => {
            // 🔴 the write-blocked variant carries its OWN bytes: a term of
            //    `normalize`, with why/alt lines no other key holds. [case21]
            //    pins the warn+block SHAPE on the unparseable path; this pins
            //    the full render of the write-failed path
            //    (rule.require.contract-snapshot-exhaustiveness).
            //
            //    a reorder of the two blocks, or a drop of the `effect:`/`fix:`
            //    lines, would ship green under the three toContain assertions
            //    above, while a human meets a partial refusal.
            //
            // .note = TWO masks, and the second is one [case21] does not need.
            //         [1] the nudge path — the hook derives NUDGE_FILE from
            //             `$PWD`, so the raw per-run path would land here.
            //         [2] 🔴 `mv`'s OWN stderr names its mkdtemp source file
            //             (`/tmp/tmp.XXXXXXXXXX`), which is fresh every run.
            //             [case21] never reaches `mv` — its jq fails first — so
            //             this line exists on the write-failed path ALONE, and
            //             a copy of [case21]'s single mask would have shipped a
            //             snapshot that flakes on its very next run.
            //         `file:` needs no mask — `/tmp/surfboard.ts` is a fixed
            //         literal in the fixture above.
            expect(
              result.stderr
                .replace(
                  /\/\S*terms\.blocklist\.nudges\.local\.json/g,
                  '<nudge-file>',
                )
                .replace(/\/tmp\/tmp\.\S+/g, '<mv-temp-file>'),
            ).toMatchSnapshot();
          });
        },
      );
    },
  );

  given('[case27] every term in the LIVE blocklist is alternation-safe', () => {
    // 🔴 this closes fulcrum F12. raised as a nitpick at i005-r006 and escalated
    //    to a BLOCKER at i006-r006, which was right to escalate — and right about
    //    the shape of the fix, where my own i005 `.taken` was wrong.
    //
    // ⚠️ i had deferred it as "a per-term compile check = N execs on the CLEAN
    //    path ⇒ breaches acceptance #1". that is true of a check INSIDE the hook
    //    and false of this one: a repo test runs in ci and costs the hook ZERO
    //    forks. i had conflated the two and deferred on the wrong arithmetic.
    //
    //    the second reason i gave — "a term that failed it would oblige a policy
    //    edit to the artifact acceptance #2 freezes" — was a PREDICTION about an
    //    outcome i could measure in one minute. i measured it: all nine terms
    //    pass, so no policy edit is owed and the deferral bought naught.
    //
    // 🔴 the defect it guards, precisely. the collapse joins every term into one
    //    alternation. a term that holds regex metacharacters does not merely fail
    //    its own match — it RE-PARSES the whole pattern into one that still
    //    COMPILES:
    //
    //      intended:  \b(deploy|)swell()\b  =  "deploy" OR ")swell("
    //      actual:    \b(deploy|)swell()\b  =  ("deploy" or empty) then "swell"
    //
    //    ⇒ the gate now demands the literal `swell`, so `deploy` — a valid term —
    //    goes COMPLETELY UNGUARDED, with no message and no exit >= 2. the Q11
    //    exit-code guard cannot see it, because the pattern compiles.
    //
    // .why this assertion and not a compile check = a compile check catches the
    //      term that does NOT compile. it is silent about the term that compiles
    //      into the WRONG SENSE, which is the whole hole. so the invariant asserted
    //      here is the one that matters: **every term must still match ITSELF when
    //      read through the joined alternation**. `)swell(` fails it, and so does
    //      every neighbour it corrupts.
    /**
     * .what = the terms of the LIVE `terms.blocklist.jsonc`, comments stripped
     * .why = the file is `.jsonc`, so `JSON.parse` cannot read it directly. the
     *        strip is the hook's own `sed 's|//.*||'` in typescript, and the
     *        case's claim is about the terms, never about how they are read.
     * .note = it read as a four-stage inline pipeline — split, regex-replace,
     *         join, parse, map — which a reader had to simulate before they
     *         reached the invariant.
     */
    const asLiveBlocklistTerms = (): string[] => {
      const withoutComments = readFileSync(
        path.join(__dirname, 'terms.blocklist.jsonc'),
        'utf-8',
      )
        .split('\n')
        .map((line) => line.replace(/\/\/.*/, ''))
        .join('\n');
      const parsed: { terms: { term: string }[] } = JSON.parse(withoutComments);
      return parsed.terms.map((entry) => entry.term);
    };

    const LIVE_TERMS: string[] = asLiveBlocklistTerms();

    /**
     * .what = of the given terms, those the JOINED alternation fails to match
     * .why = this is the hook's own gate expression, byte for byte — so a term
     *        this returns is a term the live gate would silently stop to guard
     */
    const asTermsLostToTheAlternation = (input: {
      terms: string[];
    }): string[] => {
      const alternation = input.terms.join('|');
      return input.terms.filter((term) => {
        const matched = spawnSync('grep', ['-iqE', `\\b(${alternation})\\b`], {
          input: term,
          encoding: 'utf-8',
        });
        return matched.status !== 0;
      });
    };

    when('[t0] each live term is read through the joined alternation', () => {
      then('every one still matches itself — no term is lost', () => {
        expect(asTermsLostToTheAlternation({ terms: LIVE_TERMS })).toEqual([]);
      });

      then('the list is non-empty, so the assertion is not vacuous', () => {
        // ⚠️ without this, an empty read would pass the line above trivially —
        //    the failhide the instrument is most exposed to.
        expect(LIVE_TERMS.length).toBeGreaterThan(0);
      });
    });

    when('[t1] a metacharacter term is injected into the same check', () => {
      // 🔴 the clamp's own clamp. this is what proves [t0] bites: the identical
      //    predicate, over a list that holds `)swell(`, must report a LOSS.
      //    without this case, [t0] passes and proves only that the live list is
      //    currently clean — never that the check would notice if it were not.
      const lost = asTermsLostToTheAlternation({
        terms: ['deploy', ')swell('],
      });

      then(
        '🔴 the INNOCENT neighbour is reported lost — the blast radius',
        () => {
          // `\b(deploy|)swell()\b` parses as (deploy|) then `swell` then (), so it
          // demands the literal `swell`. `deploy` alone no longer matches ⇒ a
          // perfectly valid term goes unguarded because of its neighbour. this
          // is the same behavior [case23] [t0] pins end-to-end through the hook.
          expect(lost).toContain('deploy');
        },
      );

      then('and the check is not vacuous — it reports a loss at all', () => {
        expect(lost.length).toBeGreaterThan(0);
      });

      // ⚠️ .note = `)swell(` itself is deliberately NOT asserted lost, and the
      //            reason is worth more than the assertion would be. this case
      //            was first written to expect BOTH terms and it failed on that
      //            one: the corrupted pattern demands the literal `swell`, and
      //            `)swell(` CONTAINS `swell` — so it matches, by coincidence,
      //            through a pattern that means something else entirely.
      //            ⇒ a corrupt term can appear guarded while every neighbour it
      //            corrupts is not. the loss is never where you look for it,
      //            which is precisely why the predicate must grade EVERY term
      //            rather than only the suspicious one.
    });
  });

  given('[case12] a term the real blocklist does NOT hold', () => {
    // the vision's case=4, list-maintainer: a term added to the list must bind
    // on the very NEXT write, with no restart and no cache invalidation step.
    //
    // 🔴 the vision names the hazard as "a stale cache reverts policy silently".
    //    no cache was built (F3 leans reject), so freshness holds by construction
    //    — the hook re-reads its list on every invocation. THAT IS THE CLAIM, and
    //    a claim held only by construction is one a later optimization can void
    //    with no test to stop it. this pins it.
    const TERM_NOVEL = [
      { term: 'gnarlyswell', why: 'a term no real list holds', alt: ['swell'] },
    ];

    when('[t0] the term is added to the list, then a write trips it', () => {
      const result = useBeforeAll(async () =>
        runIn({
          dir: genSandbox({ terms: TERM_NOVEL }),
          content: 'the gnarlyswell rolls in at dawn',
        }),
      );

      then('the hook exits 2 — the new term binds at once', () => {
        expect(result.exitCode).toEqual(2);
      });

      then('stderr names the newly added term', () => {
        expect(result.stderr).toContain('gnarlyswell');
      });

      then(
        'stderr carries that term OWN why and alt, not a stale record',
        () => {
          // proves the DETAIL came from this list too, never from a cached parse
          expect(result.stderr).toContain('a term no real list holds');
          expect(result.stderr).toContain('swell');
        },
      );
    });

    when('[t1] a term the real list DOES hold is absent from this one', () => {
      // 🔴 "resolve" is read from the REAL terms.blocklist.jsonc, never guessed.
      //    an earlier draft used "deploy", which no list holds — so [t1] passed
      //    whether or not the hook read the crafted file, and proved naught.
      //    a negative assertion needs its subject verified in the positive.
      const result = useBeforeAll(async () =>
        runIn({
          dir: genSandbox({ terms: TERM_NOVEL }),
          content: 'we resolve the path here',
        }),
      );

      then(
        'the write lands — the crafted list fully replaces the real one',
        () => {
          // 🔴 the direction that bites. a cache keyed on aught but this file
          //    would still hold the real list and block "resolve" here.
          expect(result.exitCode).toEqual(0);
        },
      );
    });
  });

  given('[case17] the nudge window CLOSES, and stale records are swept', () => {
    // 🔴 acceptance #3 says "the HARDNUDGE behavior is unchanged", and that
    //    clause covers THREE behaviors. [case2] holds the in-window retry;
    //    this case holds the other two:
    //      - the window CLOSES at 300s => a later retry re-blocks
    //      - a record older than 3600s is SWEPT
    //
    // 🔴 the second is load-bearing, because this diff MOVED it. the stale
    //    sweep runs AFTER detection rather than ahead of it, so a clean write
    //    no longer sweeps at all — a real behavior change made for the fork
    //    budget, and it owes an assertion of its own.
    //
    // .how = the clock cannot be advanced, so the RECORD is aged instead:
    //        write a nudge file whose `time` sits in the past. that exercises
    //        the same arithmetic (`NOW - LAST_ATTEMPT`) without a fake clock.
    const genAgedNudge = (input: { secondsAgo: number; filePath: string }) => {
      const cwd = genTempCwd();
      const key = createHash('sha256').update(input.filePath).digest('hex');
      writeFileSync(
        path.join(cwd, '.claude', 'terms.blocklist.nudges.local.json'),
        JSON.stringify({
          [key]: {
            time: Math.floor(Date.now() / 1000) - input.secondsAgo,
            path: input.filePath,
            terms: ['script'],
          },
        }),
      );
      return { cwd, key };
    };

    when('[t0] the retry comes 310s after the block — past the window', () => {
      const outcome = useBeforeAll(async () => {
        // HARDNUDGE_WINDOW_SECONDS is 300
        const aged = genAgedNudge({ secondsAgo: 310, filePath: 'deploy.sh' });
        const result = runHook({
          json: asWriteJson({
            filePath: 'deploy.sh',
            content: 'run the deploy script here',
          }),
          cwd: aged.cwd,
        });
        return { result };
      });

      then('the hook exits 2 — the window closed, so it blocks again', () => {
        // 🔴 the direction that bites. widen the window (or drop the elapsed
        //    check) and this reads 0 — a forbidden term lands unrefused,
        //    forever, on any file blocked once.
        expect(outcome.result.exitCode).toEqual(2);
      });
    });

    when(
      '[t1] the retry comes 290s after the block — inside the window',
      () => {
        const outcome = useBeforeAll(async () => {
          // 🔴 .note = 290/310, never 299/301. the age is stamped by the TEST
          //            and read by the HOOK, so the wall clock advances between
          //            the two. a 1s margin goes red whenever the box is busy —
          //            measured, on a 497s parallel run. a 10s margin still
          //            pins the boundary near 300 and cannot flake.
          const aged = genAgedNudge({ secondsAgo: 290, filePath: 'deploy.sh' });
          const result = runHook({
            json: asWriteJson({
              filePath: 'deploy.sh',
              content: 'run the deploy script here',
            }),
            cwd: aged.cwd,
          });
          return { result };
        });

        then('the hook exits 0 — the deliberate retry still lands', () => {
          // 🟡 the positive control on [t0]. without it, a hook that blocked
          //    unconditionally would satisfy [t0] and this case would prove
          //    naught about the WINDOW — only that blocks happen.
          expect(outcome.result.exitCode).toEqual(0);
        });
      },
    );

    when(
      '[t2] a record older than the stale threshold sits in the file',
      () => {
        const outcome = useBeforeAll(async () => {
          // STALE_THRESHOLD_SECONDS is 3600. this record belongs to a DIFFERENT
          // path, so the sweep is the only thing that could remove it.
          const aged = genAgedNudge({ secondsAgo: 4000, filePath: 'old.sh' });
          const result = runHook({
            json: asWriteJson({
              filePath: 'deploy.sh',
              content: 'run the deploy script here',
            }),
            cwd: aged.cwd,
          });
          const record = JSON.parse(
            readFileSync(
              path.join(
                aged.cwd,
                '.claude',
                'terms.blocklist.nudges.local.json',
              ),
              'utf-8',
            ),
          );
          return { result, record, staleKey: aged.key };
        });

        then('the hook blocks on this write', () => {
          expect(outcome.result.exitCode).toEqual(2);
        });

        then('the stale record is swept, though it names another file', () => {
          expect(Object.keys(outcome.record)).not.toContain(outcome.staleKey);
        });

        then('this write own record is stamped', () => {
          // ⚠️ the sweep must not take the fresh record with it. the two run in
          //    sequence over one file, so an off-by-one in the predicate would
          //    drop either all records or none, and only a test that asserts
          //    BOTH directions can tell those two apart.
          expect(Object.keys(outcome.record)).toHaveLength(1);
        });
      },
    );
  });

  given('[case18] a term holds a double quote', () => {
    // 🔴 the blocklist is HUMAN-EDITED, so a term may hold a `"` or a `\` at
    //    any time — and the nudge write must survive it.
    //
    //    build the nudge array by interpolation — `"${TERM}"` joined by commas,
    //    fed to `jq --argjson` — and a quoted term yields `["kook"wave"]`,
    //    which is not valid json ⇒ jq fails ⇒ `|| rm -f` discards the write ⇒
    //    the record is NEVER stamped. the block still exits 2, so no signal is
    //    raised, and the HARDNUDGE retry re-blocks forever on that file.
    //
    //    ⇒ the terms ride as jq positional args, which jq escapes itself.
    const TERM_WITH_QUOTE = [
      { term: 'kook"wave', why: 'a quoted term', alt: ['clean wave'] },
    ];

    when('[t0] a write trips it', () => {
      const outcome = useBeforeAll(async () => {
        const dir = genSandbox({ terms: TERM_WITH_QUOTE });
        const result = runIn({
          dir,
          content: 'we caught a kook"wave today',
        });
        const record = JSON.parse(
          readFileSync(
            path.join(dir, '.claude', 'terms.blocklist.nudges.local.json'),
            'utf-8',
          ),
        );
        return { result, record };
      });

      then('the hook exits 2', () => {
        expect(outcome.result.exitCode).toEqual(2);
      });

      then(
        'the WHOLE message renders the quoted term as a human meets it',
        () => {
          // 🔴 the assertions above prove the NUDGE RECORD is stamped and say
          //    naught about what the human reads. the block message
          //    interpolates the term verbatim, so `⛔ kook"wave` is a distinct
          //    user-faced render with its own escape hazard.
          //
          // .note = deterministic and mask-free: one fixed term, one fixed alt,
          //         and the `file:` line renders the RELATIVE fixture name
          //         (`notes.md`), never the sandbox-absolute path — so no
          //         mkdtemp suffix can reach the snapshot.
          expect(outcome.result.stderr).toMatchSnapshot();
        },
      );

      then('the nudge record IS stamped, quote and all', () => {
        // 🔴 the assertion that bites. under the interpolated form the record
        //    stays `{}` — the exit code is 2 either way, so the exit assertion
        //    above proves naught about the write.
        const keys = Object.keys(outcome.record);
        expect(keys).toHaveLength(1);
        expect(outcome.record[keys[0]!].terms).toEqual(['kook"wave']);
      });
    });
  });

  given('[case15] one term record is INCOMPLETE — no why, no alt', () => {
    // 🔴 the hazard the COLLAPSE authors, never one it inherits.
    //
    //    read each term's detail in its OWN jq and `null | join` errors that
    //    one exec, so the term still blocks. the collapse puts every record in
    //    ONE stream, so a single incomplete record errors the single exec,
    //    empties TERM_ALTERNATION, and exits 0 for EVERY content.
    //    ⇒ one maintainer who omits `alt` silently disables all nine terms.
    //
    //    `.why // ""` / `(.alt // [])` in the hook is the guard; this pins it.
    const TERMS_ONE_INCOMPLETE = [
      { term: 'gnarlyswell', why: 'a complete record', alt: ['swell'] },
      { term: 'kookwave' }, // no why, no alt — the poison record
    ];

    when('[t0] a write trips the COMPLETE term', () => {
      const result = useBeforeAll(async () =>
        runIn({
          dir: genSandbox({ terms: TERMS_ONE_INCOMPLETE }),
          content: 'the gnarlyswell rolls in at dawn',
        }),
      );

      then('the hook still exits 2 — one bad record disables no other', () => {
        expect(result.exitCode).toEqual(2);
      });

      then('its own why and alt still render', () => {
        expect(result.stderr).toContain('a complete record');
        expect(result.stderr).toContain('swell');
      });
    });

    when('[t1] a write trips the INCOMPLETE term', () => {
      const result = useBeforeAll(async () =>
        runIn({
          dir: genSandbox({ terms: TERMS_ONE_INCOMPLETE }),
          content: 'that kookwave closed out',
        }),
      );

      then('the hook exits 2 — the term guards with degraded detail', () => {
        // the old per-term form behaved exactly so: empty detail, term intact.
        // acceptance #2 forbids a change in EITHER direction, and an incomplete
        // record that stops to block is a change.
        expect(result.exitCode).toEqual(2);
        expect(result.stderr).toContain('kookwave');
      });

      then('the WHOLE message renders as a human meets it', () => {
        // 🔴 `toContain('kookwave')` proves the term is PRESENT and proves
        //    naught about the DEGRADED RENDER around it —
        //    which is the whole subject of this case. a regression that swaps
        //    the empty `why:` / `alt:` lines for a "root cause unknown" filler,
        //    or drops them entirely, ships GREEN under the fragment alone.
        //
        // .note = deterministic and mask-free: the fixture fixes both the term
        //         and the alternation, and the `file:` line renders the
        //         RELATIVE fixture name (`notes.md`), never the
        //         sandbox-absolute path — so no mkdtemp suffix can reach it.
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case16] the blocklist file is MALFORMED json', () => {
    // 🔴 a malformed blocklist OPENS the gate, and that is INHERITED behavior.
    //    the repair is out of scope — A8/F5 ruled the failhide so, and
    //    acceptance #2 forbids a policy change in either direction. the clamp
    //    is owed regardless: the verdict is real and reachable.
    //
    // ⚠️ this is deliberately NOT a repair. it asserts the gate OPENS, so the
    //    day someone repairs it the test goes red and the repair becomes a
    //    visible, reviewed decision rather than a silent one.
    when('[t0] a write that would trip every real term runs', () => {
      const result = useBeforeAll(async () =>
        runIn({
          dir: genSandbox({
            terms: null,
            raw: '{ "terms": [ { "term": "gnarlyswell", } ] }', // a stray comma
          }),
          content: 'run the deploy script here',
        }),
      );

      then('the hook exits 0 — the malformed list opens the gate', () => {
        expect(result.exitCode).toEqual(0);
      });

      then('it emits no output — the failhide is silent, as ruled', () => {
        expect(result.stdout).toEqual('');
        expect(result.stderr).toEqual('');
      });
    });
  });

  given('[case13] the blocklist file is absent entirely', () => {
    // the vision's case=5, and its constraint #2: "two config paths must stay
    // two". this hook goes INERT when its list is absent (fail-OPEN); the
    // gerunds hook goes STRICTER when its allowlist is absent (fail-CLOSED).
    //
    // 🔴 one shared "config absent" guard would retire one of the two gates, and
    //    the collapse touches the term-read path — so this is the live risk the
    //    vision flagged, not a hypothetical one. A8/F5 ruled the fail-open itself
    //    out of scope to REPAIR; it is emphatically in scope to CLAMP.
    when('[t0] a write that would trip every real term runs', () => {
      const result = useBeforeAll(async () =>
        runIn({
          dir: genSandbox({ terms: null }),
          content: 'run the deploy script here',
        }),
      );

      then('the hook exits 0 — absent list means an inert gate', () => {
        expect(result.exitCode).toEqual(0);
      });

      then(
        'it emits no output at all — the failhide is silent, by design',
        () => {
          // documented, dreamed, and deliberately NOT repaired here (A8 / F5).
          // the clamp exists so a later repair is a visible test change.
          expect(result.stderr).toEqual('');
        },
      );
    });
  });

  given('[case14] one file trips BOTH hooks, and one is then retried', () => {
    // 🔴 the vision's constraint #1: "two nudge clocks must stay two."
    //
    //    each hook keys its nudge on sha256(file_path), and the two write to
    //    SEPARATE files:
    //      .claude/terms.gerunds.nudges.local.json
    //      .claude/terms.blocklist.nudges.local.json
    //
    //    merge them — or key one clock on the path alone across both hooks —
    //    and a retry blessed by the GERUNDS hook would also satisfy the
    //    BLOCKLIST's window. a forbidden term would then land unrefused, with
    //    no signal at all. that is the leak this case exists to refuse.
    //
    // ⚠️ the vision wrote this constraint to bound the MERGE, and the merge was
    //    rejected (F1). it binds regardless: any refactor that unifies the clock
    //    read breaks it, and no extant test would notice.
    const gerundsHookPath = path.join(
      __dirname,
      'pretooluse.forbid-terms.gerunds.sh',
    );

    // holds BOTH a blocklisted term and an -ing word
    const CONTENT_TRIPS_BOTH = 'run the deploy script while loading';
    const FILE_PATH = 'notes.md';

    const runGerunds = (input: { cwd: string }): number => {
      const spawned = spawnSync('bash', [gerundsHookPath], {
        encoding: 'utf-8',
        input: JSON.stringify(
          asWriteJson({ filePath: FILE_PATH, content: CONTENT_TRIPS_BOTH }),
        ),
        cwd: input.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return spawned.status ?? 1;
    };

    when('[t0] the gerunds hook blocks, then its retry is blessed', () => {
      const outcome = useBeforeAll(async () => {
        const cwd = genTempCwd();
        const gerundsFirst = runGerunds({ cwd });
        const gerundsRetry = runGerunds({ cwd });
        const blocklistNow = runHook({
          json: asWriteJson({
            filePath: FILE_PATH,
            content: CONTENT_TRIPS_BOTH,
          }),
          cwd,
        });
        return {
          gerundsFirst,
          gerundsRetry,
          blocklistExit: blocklistNow.exitCode,
        };
      });

      then('the gerunds hook blocks on its first attempt', () => {
        expect(outcome.gerundsFirst).toEqual(2);
      });

      then('the gerunds retry lands — its own clock was stamped', () => {
        expect(outcome.gerundsRetry).toEqual(0);
      });

      then(
        'the blocklist hook STILL blocks — its clock was never stamped',
        () => {
          // 🔴 the assertion that bites. share one nudge record between the two
          //    hooks and this reads 0: a blocklisted term lands, permitted by
          //    an override granted only to the gerunds gate.
          expect(outcome.blocklistExit).toEqual(2);
        },
      );
    });
  });

  given('[case19] the nudge clock is keyed per file path', () => {
    // 🔴 the vision's case=3 names this cell outright — "the retry lands 4s
    //    later, but on a DIFFERENT file path → exits 2 — the clock is keyed
    //    per path" — so it owes a test that drives two paths in one window.
    //
    // ⚠️ [case14] is the neighbour and is NOT this. it proves one path does not
    //    leak across the two HOOKS; this proves one hook does not leak across
    //    two PATHS. a regression in NUDGE_KEY leaves [case14] fully green,
    //    since both of its runs name the same file.
    const CONTENT = 'run the deploy script here';

    when(
      '[t0] a blocked file is retried, then a SECOND file is written',
      () => {
        const outcome = useBeforeAll(async () => {
          const cwd = genTempCwd();
          const first = runHook({
            json: asWriteJson({ filePath: 'reef.sh', content: CONTENT }),
            cwd,
          });
          const retry = runHook({
            json: asWriteJson({ filePath: 'reef.sh', content: CONTENT }),
            cwd,
          });
          const other = runHook({
            json: asWriteJson({ filePath: 'shore.sh', content: CONTENT }),
            cwd,
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
          // 🔴 coarsen NUDGE_KEY to a constant, the cwd, or the tool name and
          //    this reads 0: one deliberate retry would bless EVERY file for five
          //    minutes, so a forbidden term lands in a file nobody nudged for.
          expect(outcome.other.exitCode).toEqual(2);
        });
      },
    );

    // 🔴 .why = [t0] above proves the key is not coarsened to a constant or the
    //           cwd. it does NOT prove the key is tool-AGNOSTIC, because all
    //           three of its runs are Writes — so a NUDGE_KEY that folded in
    //           `tool_name` leaves every assertion above green while it breaks
    //           the behavior a human actually walks.
    //
    // ⚠️ .the cue = found by a live walk during 5.3 verification, never by a read.
    //              a Write of a file was refused, and a later EDIT of that same
    //              file carrying the same term LANDED. that is correct — the key
    //              is `sha256(file_path)` and no other input — and no test said so.
    //
    // .the contract this pins = the window belongs to the FILE, never to the tool
    //                           that opened it. "you were warned about this file
    //                           moments ago" is the promise, rather than "repeat
    //                           the same operation", which the refusal text implies.
    when('[t1] a blocked WRITE is followed by an EDIT of the same path', () => {
      const outcome = useBeforeAll(async () => {
        const cwd = genTempCwd();
        const write = runHook({
          json: asWriteJson({ filePath: 'reef.sh', content: CONTENT }),
          cwd,
        });
        const edit = runHook({
          json: asEditJson({
            filePath: 'reef.sh',
            oldString: 'the old line',
            newString: CONTENT,
          }),
          cwd,
        });
        return { write, edit };
      });

      then('the write blocks', () => {
        // 🟡 the positive control. without it an always-permit hook would
        //    satisfy the assertion below and prove naught about the key.
        expect(outcome.write.exitCode).toEqual(2);
      });

      then(
        'the EDIT lands — the window is keyed to the path, not the tool',
        () => {
          expect(outcome.edit.exitCode).toEqual(0);
        },
      );
    });
  });

  given('[case20] a permitted retry does NOT re-stamp the record', () => {
    // 🔴 the harm a re-stamp does: the window extends itself on every retry and
    //    never closes, so "block once, allow ONE deliberate retry, re-block
    //    after 5 min" silently becomes "block once, never again".
    //
    // 🔴 every exit-code assertion stays green under that regression — a
    //    re-stamp is invisible there. only a test that opens the written
    //    artifact can see it, the same blindness [case18] names in the nudge
    //    WRITE, at a different seam.
    //
    // .the code = blocklist.sh exits 0 INSIDE the window, ahead of the stamp.
    //             so the stamp is on the block path alone.
    //
    // .how = the record is SEEDED at a known age rather than written by a first
    //        run, so the expected stamp is an exact number. a two-run form
    //        would need a sleep to part two whole-second stamps, and a sleep in
    //        a test is a flake with a delay on it.
    when('[t0] a retry lands 100s into the window', () => {
      const outcome = useBeforeAll(async () => {
        const cwd = genTempCwd();
        const key = createHash('sha256').update('point.sh').digest('hex');
        const seeded = Math.floor(Date.now() / 1000) - 100;
        writeFileSync(
          path.join(cwd, '.claude', 'terms.blocklist.nudges.local.json'),
          JSON.stringify({
            [key]: { time: seeded, path: 'point.sh', terms: ['deploy'] },
          }),
        );
        const retry = runHook({
          json: asWriteJson({
            filePath: 'point.sh',
            content: 'run the deploy script here',
          }),
          cwd,
        });
        const record = JSON.parse(
          readFileSync(
            path.join(cwd, '.claude', 'terms.blocklist.nudges.local.json'),
            'utf-8',
          ),
        );
        return { retry, seeded, stamped: record[key].time };
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

  given('[case21] the nudge STATE FILE is unparseable json', () => {
    // 🔴 a REPAIR rather than a clamp, and one distinction is why:
    //
    //      A8 / F5 ruled the malformed-CONFIG failhide out of scope. that is
    //      the blocklist .jsonc — a POLICY input, where a repair changes what
    //      the gate blocks.
    //
    //      this is the nudge STATE file. the verdict is already rendered by the
    //      time it is written, so a loud failure changes no block and no
    //      permit. ⇒ A8/F5 does not reach it, and acceptance #2 is untouched.
    //
    //    ⚠️ the two files sit one directory apart and read alike, so the
    //      easy error is to grant this one A8/F5's exemption. POLICY input vs
    //      STATE output is the axis that parts them.
    //
    // 🔴 the harm a silent failure carries: the block exits 2 either way, so a
    //    lost stamp looks like an ordinary first refusal — and the deliberate
    //    retry then re-blocks FOREVER, on every future write to that file.
    when('[t0] a write trips a term', () => {
      const outcome = useBeforeAll(async () => {
        const cwd = genTempCwd();
        writeFileSync(
          path.join(cwd, '.claude', 'terms.blocklist.nudges.local.json'),
          '{ "broken": ', // truncated — jq cannot parse it
        );
        return runHook({
          json: asWriteJson({
            filePath: 'deploy.sh',
            content: 'run the deploy script here',
          }),
          cwd,
        });
      });

      then('the hook still exits 2 — the verdict is unchanged', () => {
        // the repair is a diagnostic, never a policy move. acceptance #2 holds.
        expect(outcome.exitCode).toEqual(2);
      });

      then('stderr says the record was NOT saved', () => {
        // 🔴 the assertion that bites. restore `|| rm -f` and this reads empty,
        //    while the exit-code assertion above stays green — the whole shape
        //    of the defect r6 named.
        expect(outcome.stderr).toContain('HARDNUDGE record NOT saved');
      });

      then('stderr names the EFFECT and the FIX, not just the symptom', () => {
        // rule.require.errors-name-the-fix: a human who sees this must learn
        // both what it costs them and the one command that clears it.
        expect(outcome.stderr).toContain('RE-BLOCK');
        expect(outcome.stderr).toContain('rm ');
      });

      then('the block message itself still renders in full', () => {
        // the diagnostic is ADDITIVE. every substance line acceptance #4 names
        // is still present, so the repair cannot have eaten the refusal.
        expect(outcome.stderr).toContain('ConstraintError');
        expect(outcome.stderr).toContain('why:');
        expect(outcome.stderr).toContain('alt:');
      });

      then('the WHOLE stderr reads as a human would meet it', () => {
        // 🔴 the three toContain calls above pin three tokens and are blind to
        //    the shape between them: a regression that reorders the lines, or
        //    drops `effect:`, or drops the `fix:` command, ships green while
        //    the human meets a partial refusal.
        //
        //    ⇒ and this message has no prior art to fall back on — the diff
        //    AUTHORED it, so there is no baseline a reader could compare it
        //    against. the same reason [case10]'s no-input message is snapped.
        //
        // .note = the one interpolated value is $NUDGE_FILE, an absolute path
        //         under a per-run temp cwd. it is masked, never omitted: the
        //         `fix: rm '<path>'` line must stay copy-pasteable, so its
        //         presence and position are contract; only its prefix is not.
        // 🔴 .note = masked by PATTERN, never by `split(outcome.cwd)`. that
        //            form FLAKES: genTempDir hands back a path that resolves
        //            through a symlink, and the hook derives NUDGE_FILE from
        //            `$PWD`, which bash reports already resolved. the two
        //            strings never match, so the raw per-run path lands in the
        //            snapshot.
        //            ⇒ a mask keyed to a value the SUT re-derives is a guess.
        //            key it to the shape of the output instead.
        expect(
          outcome.stderr.replace(
            /\/\S*terms\.blocklist\.nudges\.local\.json/g,
            '<nudge-file>',
          ),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case22] the stdin PAYLOAD is present but unparseable json', () => {
    // ⚠️ this case CLAMPS a failhide. it does not repair one.
    //
    //    the payload read ends `2>/dev/null || echo ""`. an unparseable
    //    payload therefore yields an empty TOOL_NAME, the `!= Write/Edit`
    //    guard reads true, and the hook exits 0 — a silent permit.
    //
    //    a REPAIR (exit 2 on a payload that is non-empty yet unparseable)
    //    would change what the gate admits, which acceptance #2 forbids
    //    in BOTH directions. so the extant verdict stands, and this case
    //    turns it from an accident into a declared contract.
    //
    // 🔴 the distinction that makes this cheap: an EMPTY payload already
    //    exits 2 ([case10]). only a NON-empty unparseable one reaches here,
    //    and claude code is the sole realistic caller of either.
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
        // 🔴 the assertion that bites. make the payload read loud and this
        //    reads 2, which is precisely the policy move acceptance #2 bars.
        expect(result.exitCode).toEqual(0);
      });

      then('it emits no word on either stream', () => {
        // a silent permit is silent on BOTH channels. a future change that
        // starts to warn here is a change a reviewer must see in this diff.
        expect(result.stdout).toEqual('');
        expect(result.stderr).toEqual('');
      });
    });
  });

  given('[case29] the nudge file CANNOT be created', () => {
    // 🔴 a REPAIR rather than a clamp of extant behavior. the bootstrap
    //    `echo '{}' > "$NUDGE_FILE"` as a bare simple command under
    //    `set -euo pipefail` exits the shell at status 1 on a failed redirect —
    //    BEFORE the block message and BEFORE `exit 2`. claude code reads a
    //    non-2 exit as NOT BLOCKED ⇒ the forbidden term lands silently, on the
    //    one path where a gate must not yield.
    //
    // ⚠️ acceptance #2 is NOT implicated: this is an unwritable-STATE failure on
    //    the tripped path, never a change to which terms the gate admits. the
    //    A8/F5 rulings cover a malformed CONFIG and a malformed PAYLOAD; neither
    //    reaches here.
    //
    // 🔴 .note = the fixture puts a DIRECTORY at the nudge file's path rather
    //            than a read-only parent. `chmod` is defeated by a root test
    //            runner — in CI that would make this clamp pass vacuously
    //            against BOTH the fixed and the broken hook. a redirect onto a
    //            directory fails as `Is a directory` for every uid, so the
    //            fixture holds wherever the suite runs.
    when('[t0] a write trips a term and the state dir is unwritable', () => {
      const result = useBeforeAll(async () => {
        const cwd = genHookTempCwd({
          slug: 'hook-blocklist-nonudge',
          nudgeFileName: null,
        });
        mkdirSync(
          path.join(cwd, '.claude', 'terms.blocklist.nudges.local.json'),
          { recursive: true },
        );
        return runHook({
          json: asWriteJson({
            filePath: 'surf.ts',
            content: "const x = 'nothing';",
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
        // the state loss must not degrade the message. the term, its why, and
        // its alt are what acceptance #4 pins, and none of them live in the
        // nudge file.
        expect(result.stderr).toContain('nothing');
        expect(result.stderr).toContain('why:');
        expect(result.stderr).toContain('alt:');
      });
    });
  });

  given('[case30] the content field is a non-string', () => {
    // 🔴 the fail-open this looks like and is NOT. `jq -r "$CONTENT_FIELD //
    //    empty"` reads as though an object yields an empty CONTENT, so
    //    `[[ -z "$CONTENT" ]]` would exit 0 and admit the write.
    //
    // ⚠️ that reading is wrong, by `//`'s truthiness rule: the alternative
    //    operator falls through only on `false` or `null`. an object is truthy,
    //    so `//` yields the object and `jq -r` prints its compact json — a
    //    NON-empty string, scanned exactly like any other. a forbidden term
    //    nested in an object still blocks, and the gate does not open.
    //
    // ✅ the read is byte-identical to `main`'s (only the branch that PICKS the
    //    field is collapsed into `$CONTENT_FIELD`), so this verdict is extant
    //    behavior and acceptance #2 holds either way. the clamp makes the
    //    verdict a declared contract rather than an accident.
    when('[t0] a forbidden term is nested inside an object', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: {
            tool_name: 'Write',
            tool_input: {
              file_path: 'surf.ts',
              content: { note: `there is ${TERM_VAGUE} here` },
            },
          },
        }),
      );

      then(
        'the hook still blocks — the object is scanned, never skipped',
        () => {
          // 🔴 THE assertion. an exit 0 here would be the fail-open the
          //    reviewer suspected; an exit 2 proves the term is reached
          //    through the serialized json.
          expect(result.exitCode).toEqual(2);
        },
      );

      then('the refusal names the term, as on any other path', () => {
        expect(result.stderr).toContain(TERM_VAGUE);
      });
    });

    when('[t1] the content field is null', () => {
      const result = useBeforeAll(async () =>
        runHook({
          json: {
            tool_name: 'Write',
            tool_input: { file_path: 'surf.ts', content: null },
          },
        }),
      );

      then('the hook permits — null is the ONE falsy case `//` catches', () => {
        // this is the true empty-content path, and it is the intended one: a
        // write with no content to scan has no term to find. it is pinned so
        // the boundary between `[t0]` and `[t1]` cannot erode unremarked.
        expect(result.exitCode).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });
  });
});
