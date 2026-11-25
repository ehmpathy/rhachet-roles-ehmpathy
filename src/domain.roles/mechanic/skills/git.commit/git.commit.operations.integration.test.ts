import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { ConstraintError } from 'helpful-errors';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = integration tests for git.commit.operations.sh
 * .why = verify org detection and blocker check work correctly
 */
describe('git.commit.operations.sh', () => {
  const operationsPath = path.join(__dirname, 'git.commit.operations.sh');

  /**
   * .what = run a bash command that sources operations.sh and calls a function
   * .why = enables testing individual functions from the operations file
   */
  const runFunction = (args: {
    functionCall: string;
    tempDir: string;
    tempHome?: string;
    keyrackContent?: string;
    orgState?: Record<string, string>;
    orgStateRaw?: string;
    /** the meter scope to set; null = none, to prove an unscoped read fails closed */
    scope?: 'commit' | 'release' | null;
  }): { stdout: string; stderr: string; exitCode: number } => {
    // .why output.sh first = every skill that sources operations.sh sources
    //        output.sh before it, and the refusals render through its leaves
    const bashCode = `
      source "${path.join(__dirname, 'output.sh')}"
      source "${operationsPath}"
      ${args.scope === null ? '' : `set_meter_scope ${args.scope ?? 'commit'}`}
      ${args.functionCall}
    `;

    // create keyrack if provided
    if (args.keyrackContent) {
      const agentDir = path.join(args.tempDir, '.agent');
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(path.join(agentDir, 'keyrack.yml'), args.keyrackContent);
    }

    // create org state if provided
    if ((args.orgState || args.orgStateRaw !== undefined) && args.tempHome) {
      const globalMeterDir = path.join(
        args.tempHome,
        '.rhachet',
        'storage',
        'repo=ehmpathy',
        'role=mechanic',
        '.meter',
      );
      fs.mkdirSync(globalMeterDir, { recursive: true });
      const orgStateFile = path.join(
        globalMeterDir,
        'git.commit.uses.org.jsonc',
      );

      // .why = `orgStateRaw` writes the bytes VERBATIM, so a test can seed a
      //        file that is damaged rather than merely unhelpful. the shaped
      //        `orgState` path cannot express an unparseable or 0-byte file,
      //        which are the two states the fail-closed guard exists for.
      if (args.orgStateRaw !== undefined) {
        fs.writeFileSync(orgStateFile, args.orgStateRaw);
      }

      if (args.orgStateRaw === undefined && args.orgState) {
        fs.writeFileSync(
          orgStateFile,
          JSON.stringify({ orgs: args.orgState }, null, 2),
        );
      }
    }

    const result = spawnSync('bash', ['-c', bashCode], {
      cwd: args.tempDir,
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HOME: args.tempHome ?? process.env.HOME,
      },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case32] get_org_from_keyrack', () => {
    when('[t0] keyrack.yml has org field', () => {
      then('returns org value', () => {
        const tempDir = genTempDir({ slug: 'org-keyrack-test', git: true });
        const result = runFunction({
          functionCall: `
            if get_org_from_keyrack; then
              echo "$ORG_VALUE"
            else
              echo "error: $ORG_ERROR"
            fi
          `,
          tempDir,
          keyrackContent: `org: ehmpathy
extends:
  - .agent/repo=bhrain/role=reviewer/keyrack.yml
`,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe('ehmpathy');
      });
    });

    when('[t1] keyrack.yml absent', () => {
      then('returns error', () => {
        const tempDir = genTempDir({ slug: 'org-keyrack-absent', git: true });
        const result = runFunction({
          functionCall: `
            if get_org_from_keyrack; then
              echo "success"
            else
              echo "error: $ORG_ERROR"
            fi
          `,
          tempDir,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('.agent/keyrack.yml not found');
      });
    });

    when('[t2] keyrack.yml org: unset', () => {
      then('returns error', () => {
        const tempDir = genTempDir({ slug: 'org-keyrack-unset', git: true });
        const result = runFunction({
          functionCall: `
            if get_org_from_keyrack; then
              echo "success"
            else
              echo "error: $ORG_ERROR"
            fi
          `,
          tempDir,
          keyrackContent: `extends:
  - .agent/repo=bhrain/role=reviewer/keyrack.yml
`,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('.agent/keyrack.yml org: absent');
      });
    });
  });

  given('[case33] a meter read with no scope', () => {
    when('[t0] check_global_blocker runs before set_meter_scope', () => {
      then('it refuses as a malfunction, exit 1, and reads no meter', () => {
        const tempDir = genTempDir({
          slug: 'meter-unscoped-global',
          git: true,
        });
        const tempHome = genTempDir({
          slug: 'meter-unscoped-global-home',
          git: false,
        });
        const result = runFunction({
          functionCall: `
            check_global_blocker
            echo "read the meter"
          `,
          tempDir,
          tempHome,
          scope: null,
        });
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('MalfunctionError');
        expect(result.stderr).toContain('meter read with no scope');
        expect(result.stdout).not.toContain('read the meter');
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] check_org_blocker runs before set_meter_scope', () => {
      then('it refuses as a malfunction, exit 1, and reads no meter', () => {
        const tempDir = genTempDir({ slug: 'meter-unscoped-org', git: true });
        const tempHome = genTempDir({
          slug: 'meter-unscoped-org-home',
          git: false,
        });
        const result = runFunction({
          functionCall: `
            check_org_blocker
            echo "read the meter"
          `,
          tempDir,
          tempHome,
          keyrackContent: 'org: ehmpathy\n',
          orgState: { ehmpathy: 'allowed' },
          scope: null,
        });
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('MalfunctionError');
        expect(result.stderr).toContain('meter read with no scope');
        expect(result.stdout).not.toContain('read the meter');
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] set_meter_scope names a meter that does not exist', () => {
      then('it refuses as a malfunction, exit 1, on both streams', () => {
        const tempDir = genTempDir({ slug: 'meter-scope-bogus', git: true });
        const tempHome = genTempDir({
          slug: 'meter-scope-bogus-home',
          git: false,
        });
        const result = runFunction({
          functionCall: `
            set_meter_scope bogus
            echo "scoped the meter"
          `,
          tempDir,
          tempHome,
          scope: null,
        });
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          "💥 MalfunctionError: set_meter_scope: unknown meter 'bogus'",
        );
        expect(result.stderr).toContain("unknown meter 'bogus'");
        expect(result.stdout).not.toContain('scoped the meter');
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case34] check_org_blocker', () => {
    when('[t0] org is allowed', () => {
      then('returns 0 (not blocked)', () => {
        const tempDir = genTempDir({ slug: 'org-blocker-allowed', git: true });
        const tempHome = genTempDir({
          slug: 'org-blocker-allowed-home',
          git: false,
        });
        const result = runFunction({
          functionCall: `
            if check_org_blocker; then
              echo "allowed"
            else
              echo "blocked: $ORG_BLOCK_REASON"
            fi
          `,
          tempDir,
          tempHome,
          keyrackContent: 'org: ehmpathy\n',
          orgState: { ehmpathy: 'allowed' },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe('allowed');
      });
    });

    when('[t1] org is blocked', () => {
      then('returns 2 (blocked)', () => {
        const tempDir = genTempDir({ slug: 'org-blocker-blocked', git: true });
        const tempHome = genTempDir({
          slug: 'org-blocker-blocked-home',
          git: false,
        });
        const result = runFunction({
          functionCall: `
            if check_org_blocker; then
              echo "allowed"
            else
              echo "blocked: $ORG_BLOCK_REASON"
            fi
          `,
          tempDir,
          tempHome,
          keyrackContent: 'org: ehmpathy\n',
          orgState: { ehmpathy: 'blocked' },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('blocked');
        expect(result.stdout).toContain('ehmpathy');
      });
    });

    when('[t2] org unset but @all allowed', () => {
      then('inherits from @all (allowed)', () => {
        const tempDir = genTempDir({
          slug: 'org-blocker-all-allow',
          git: true,
        });
        const tempHome = genTempDir({
          slug: 'org-blocker-all-allow-home',
          git: false,
        });
        const result = runFunction({
          functionCall: `
            if check_org_blocker; then
              echo "allowed"
            else
              echo "blocked: $ORG_BLOCK_REASON"
            fi
          `,
          tempDir,
          tempHome,
          keyrackContent: 'org: neworg\n',
          orgState: { '@all': 'allowed' },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe('allowed');
      });
    });

    when('[t3] org unset but @all blocked', () => {
      then('inherits from @all (blocked)', () => {
        const tempDir = genTempDir({
          slug: 'org-blocker-all-block',
          git: true,
        });
        const tempHome = genTempDir({
          slug: 'org-blocker-all-block-home',
          git: false,
        });
        const result = runFunction({
          functionCall: `
            if check_org_blocker; then
              echo "allowed"
            else
              echo "blocked: $ORG_BLOCK_REASON"
            fi
          `,
          tempDir,
          tempHome,
          keyrackContent: 'org: neworg\n',
          orgState: { '@all': 'blocked' },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('blocked');
        expect(result.stdout).toContain('neworg');
        expect(result.stdout).toContain('@all');
      });
    });

    when('[t4] specific org overrides @all', () => {
      then('org-specific wins over @all', () => {
        const tempDir = genTempDir({
          slug: 'org-blocker-specific-wins',
          git: true,
        });
        const tempHome = genTempDir({
          slug: 'org-blocker-specific-wins-home',
          git: false,
        });
        const result = runFunction({
          functionCall: `
            if check_org_blocker; then
              echo "allowed"
            else
              echo "blocked: $ORG_BLOCK_REASON"
            fi
          `,
          tempDir,
          tempHome,
          keyrackContent: 'org: ehmpathy\n',
          orgState: { '@all': 'blocked', ehmpathy: 'allowed' },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe('allowed');
      });
    });

    /**
     * 🔴 .what = the two DAMAGED org-meter shapes must both read as BLOCKED
     *
     * .why = `check_org_blocker` guards a PERMISSION. a damaged file there
     *        used to render as a healthy, permissive one: the read swallowed
     *        jq's exit, the capture came back empty, and the `!= "unset"`
     *        compare was true for an empty string — so the function fell
     *        through to `return 0` and reported the org ALLOWED
     *        (rule.forbid.failhide, and it failed in the OPEN direction).
     *
     * 🔴 .why TWO shapes, never one = they fail DIFFERENTLY, and a guard that
     *        checks only jq's exit status catches just the first:
     *          corrupt json  → jq exits NON-ZERO, capture empty
     *          a 0-byte file → jq exits ZERO,     capture empty   ← the trap
     *        ⇒ [t6] is what proves the non-empty condition carries its own
     *        weight rather than a free ride behind the exit check.
     */
    when('[t5] the org meter file is present and UNPARSEABLE', () => {
      // .why = both `then`s below observe the SAME refused read
      //        (rule.forbid.redundant-expensive-operations) — a subprocess
      //        plus two temp-dir setups is well over the rule's threshold.
      const result = useThen('the read is attempted', () =>
        runFunction({
          // .why the BODY renders here too = the headline and the body are two
          //      halves of one refusal, and every real caller prints both
          //      (`git.commit.set`, `git.commit.push`, `git.commit.uses`). a
          //      harness that printed the reason alone measured half the
          //      contract, and the two `then`s below grade different halves:
          //      the headline names the FAULT, the body names the FILE.
          functionCall: `
            if check_org_blocker; then
              echo "allowed"
            else
              echo "blocked: $ORG_BLOCK_REASON"
              print_org_corrupt_note
            fi
          `,
          tempDir: genTempDir({ slug: 'org-blocker-corrupt', git: true }),
          tempHome: genTempDir({
            slug: 'org-blocker-corrupt-home',
            git: false,
          }),
          keyrackContent: 'org: ehmpathy\n',
          orgStateRaw: '{ this is not json',
        }),
      );

      then('🔴 it reads as BLOCKED, and names the corruption', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('blocked');
        expect(result.stdout).not.toContain('allowed');
        expect(result.stdout).toContain('org meter file corrupt');
      });

      then('🔴 it names the FILE, so the human can act on it', () => {
        // .why = "corrupt" alone leaves the human with no path to `cat` or
        //        clear (rule.require.errors-name-the-fix).
        //
        // .why = the `~` form, never `$HOME` — the real path holds a per-run
        //        temp dir under test (rule.require.hermetic-tests).
        //
        // ⚠️ .why the BODY carries this, never the headline = the headline is
        //        shared with `guard_org_meter_is_readable` in `uses.org.sh`,
        //        which renders the SAME state. it used to name the path here
        //        and not there, so one fact announced itself two ways. the
        //        path moved into the shared body, which every caller prints —
        //        so the claim this `then` makes is now true on EVERY surface
        //        rather than on the commit gate alone, and the set arm no
        //        longer prints the path twice.
        expect(result.stdout).toContain(
          '~/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter/git.commit.uses.org.jsonc',
        );
      });

      then(
        '🔴 the headline is the SHARED one, so both entry points agree',
        () => {
          // .why = the clamp with the teeth for the unification. restore the
          //        old per-site literal (`"org meter file corrupt ($PATH)"` here
          //        vs `"org meter file corrupt"` in `uses.org.sh`) and this goes
          //        red, because the headline would carry the path again.
          //        ⇒ `git.commit.uses.integration.test.ts` `[case37]` pins the
          //        OTHER entry point's render of this same headline, so the two
          //        suites together prove the agreement this repair claims.
          expect(result.stdout).toContain('blocked: org meter file corrupt');
          expect(result.stdout).not.toContain(
            'org meter file corrupt (~/.rhachet',
          );
        },
      );
    });

    when('[t6] the org meter file is present and EMPTY (0 bytes)', () => {
      then('🔴 it reads as BLOCKED, though jq exits ZERO here', () => {
        // 🔴 .why = the trap this case exists for: jq on empty input produces
        //        no output value and exits 0, so an exit-status check alone
        //        passes and the empty capture flows on.
        //
        // 🔴 .what catches it = the SHAPE gate in `check_org_blocker`, on the
        //        captured bytes, and this row is what proved it must live
        //        there. the key reader's own `[[ -n "$value" ]]` caught this
        //        while it read the FILE; once it took a captured string through
        //        `-s`, the slurp normalized empty to `[]` and `// "unset"`
        //        rendered the literal `unset` — a non-empty value. ⇒ this row
        //        went RED on that change, and no test on the VALUE could have
        //        restored it, because `unset` is also the legal answer for a
        //        healthy file that does not name this org.
        //
        // .note = a real key that is merely ABSENT yields the literal "unset"
        //        via `//`, never an empty string. ⇒ empty means DAMAGE at the
        //        BYTES, and the two are distinguishable only there.
        const tempDir = genTempDir({ slug: 'org-blocker-empty', git: true });
        const tempHome = genTempDir({
          slug: 'org-blocker-empty-home',
          git: false,
        });
        const result = runFunction({
          functionCall: `
            if check_org_blocker; then
              echo "allowed"
            else
              echo "blocked: $ORG_BLOCK_REASON"
            fi
          `,
          tempDir,
          tempHome,
          keyrackContent: 'org: ehmpathy\n',
          orgStateRaw: '',
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('blocked');
        expect(result.stdout).not.toContain('allowed');
        expect(result.stdout).toContain('org meter file corrupt');
      });
    });

    /**
     * 🔴 .what = a WELL-FORMED object whose org LEAF is not a known state
     *
     * .why = every damaged shape above breaks at the top level — unparseable
     *        bytes, 0 bytes. each one trips the shape gate. these two files
     *        parse cleanly and hold a legal object, so the shape gate waves
     *        them through, and the leaf is the one part left to read.
     *
     * 🔴 .why it failed OPEN = the state was compared against the BLOCKED
     *        sentinels alone (`unset`, `null`, `blocked`); each other value
     *        fell through to `return 0`. so a leaf of `["allowed"]` or `1` read
     *        as a permission GRANTED — damage resolved toward permissive on a
     *        permission gate, which is the one direction it may never guess
     *        (rule.require.safe-by-default).
     *
     * ⇒ .why BOTH leaves = `@all` decides for every org that names itself
     *   nowhere in the file, so a gate placed on the org leaf alone leaves the
     *   WIDER fail-open in place.
     */
    when('[t7] the org LEAF is well-formed json but not a known state', () => {
      then('🔴 an ARRAY leaf reads as CORRUPT, never as allowed', () => {
        const tempDir = genTempDir({ slug: 'org-blocker-leaf-arr', git: true });
        const tempHome = genTempDir({
          slug: 'org-blocker-leaf-arr-home',
          git: false,
        });
        const result = runFunction({
          functionCall: `
            if check_org_blocker; then
              echo "allowed"
            else
              echo "blocked: $ORG_BLOCK_REASON"
            fi
          `,
          tempDir,
          tempHome,
          keyrackContent: 'org: ehmpathy\n',
          orgStateRaw: '{ "orgs": { "ehmpathy": ["allowed"] } }',
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('org meter file corrupt');
      });

      then('🔴 a NUMBER leaf reads as CORRUPT, never as allowed', () => {
        const tempDir = genTempDir({ slug: 'org-blocker-leaf-num', git: true });
        const tempHome = genTempDir({
          slug: 'org-blocker-leaf-num-home',
          git: false,
        });
        const result = runFunction({
          functionCall: `
            if check_org_blocker; then
              echo "allowed"
            else
              echo "blocked: $ORG_BLOCK_REASON"
            fi
          `,
          tempDir,
          tempHome,
          keyrackContent: 'org: ehmpathy\n',
          orgStateRaw: '{ "orgs": { "ehmpathy": 1 } }',
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('org meter file corrupt');
      });

      then('🔴 a damaged @all leaf reads as CORRUPT — the WIDER gate', () => {
        // the org this keyrack names is absent from the file, so the read falls
        // through to `@all` — the leaf that decides for every unnamed org
        const tempDir = genTempDir({ slug: 'org-blocker-leaf-all', git: true });
        const tempHome = genTempDir({
          slug: 'org-blocker-leaf-all-home',
          git: false,
        });
        const result = runFunction({
          functionCall: `
            if check_org_blocker; then
              echo "allowed"
            else
              echo "blocked: $ORG_BLOCK_REASON"
            fi
          `,
          tempDir,
          tempHome,
          keyrackContent: 'org: neworg\n',
          orgStateRaw: '{ "orgs": { "@all": { "mode": "allowed" } } }',
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('org meter file corrupt');
      });
    });

    when('[t8] the org leaf carries each of the three KNOWN states', () => {
      then('🔴 each still resolves — the leaf gate is not blanket', () => {
        // the counter-clamp for [t7]. a gate that refused every leaf would pass
        // all three rows above while it paused every commit in every org
        const runAgainst = (input: {
          slug: string;
          org: string;
          raw: string;
        }): string =>
          runFunction({
            functionCall: `
              if check_org_blocker; then
                echo "allowed"
              else
                echo "blocked: $ORG_BLOCK_REASON"
              fi
            `,
            tempDir: genTempDir({ slug: input.slug, git: true }),
            tempHome: genTempDir({ slug: `${input.slug}-home`, git: false }),
            keyrackContent: `org: ${input.org}\n`,
            orgStateRaw: input.raw,
          }).stdout;

        // `allowed` and `blocked` — what the writer emits
        expect(
          runAgainst({
            slug: 'org-leaf-ok-allowed',
            org: 'ehmpathy',
            raw: '{ "orgs": { "ehmpathy": "allowed" } }',
          }).trim(),
        ).toBe('allowed');
        expect(
          runAgainst({
            slug: 'org-leaf-ok-blocked',
            org: 'ehmpathy',
            raw: '{ "orgs": { "ehmpathy": "blocked" } }',
          }),
        ).toContain('commits blocked for org ehmpathy');

        // `unset` — the key is absent, which is legal and falls through to @all
        expect(
          runAgainst({
            slug: 'org-leaf-ok-unset',
            org: 'neworg',
            raw: '{ "orgs": { "@all": "allowed" } }',
          }).trim(),
        ).toBe('allowed');

        // an explicit json null is not a fourth known state — the READER
        // (read_org_meter_key's `// "unset"`) normalizes it to "unset"
        // before the leaf gate (is_org_state_known) ever sees it, so this
        // row exercises the same `unset` arm as the row above, on a
        // different input shape
        expect(
          runAgainst({
            slug: 'org-leaf-ok-null',
            org: 'ehmpathy',
            raw: '{ "orgs": { "ehmpathy": null, "@all": "allowed" } }',
          }).trim(),
        ).toBe('allowed');
      });
    });
  });

  given('[case35] SPONSOR_EMAIL_PATTERN, read by BOTH regex engines', () => {
    /**
     * 🔴 .why = the one constant is interpolated into TWO dialects — bash `=~`
     *        (POSIX ERE) at the WRITER, and jq `test()` (Oniguruma) at the
     *        READER. `operations.sh` states that as a `.constraint` in prose
     *        and no test checks it.
     *
     *        ⇒ a PCRE-only construct (`\d`, `\w`, `(?=…)`, `+?`) fails
     *        SILENTLY in bash: ERE reads it as literal text rather than as a
     *        class. so the writer would begin to refuse an address the reader
     *        still accepts — the exact writer-vs-reader split this whole
     *        feature exists to close, re-opened one layer down.
     *
     * 🔴 .note = this case does NOT grade what the pattern accepts. it grades
     *        that the two engines AGREE, whatever it accepts. a future author
     *        may widen or narrow the pattern freely; what they may not do is
     *        make the two halves disagree, and that is the only claim here.
     */
    // ⚠️ .note = every domain here is `example.com` (rfc 2606) or a plainly
    //        synthetic shape. the list probes SYNTAX, so the domain is
    //        inert — which makes a realistic one pure downside: it reads as
    //        a real address to a scraper and buys the assert naught
    //        (`rule.forbid.real-identities-in-fixtures`).
    const addresses = [
      // accepted today
      'ada@example.com',
      'ada.lovelace@sub.domain.co.uk',
      'a@b.c',
      'ada+tag@example.com',
      '259600029+ehm-seaturtle@users.noreply.github.com',
      // 🔴 the two an ERE-vs-PCRE swap of `\d` or `\w` would split them on
      '1@2.3',
      'a_b-c@d-e.f',
      // refused today
      'ada@example',
      'ada lovelace@x.dev',
      '@example.com',
      'ada@',
      'ada@@example.com',
      'ada@example.',
      '',
    ];

    when('[t0] each address goes through both engines', () => {
      then('🔴 the two verdicts agree, address for address', () => {
        const tempDir = genTempDir({ slug: 'pattern-engines', git: false });
        const literals = addresses.map((one) => `'${one}'`).join(' ');
        const d = '\u0024'; // a bare `$`, kept out of the TS template's reach
        const result = runFunction({
          functionCall: [
            `addrs=( ${literals} )`,
            `for a in "${d}{addrs[@]}"; do`,
            `  if [[ "${d}a" =~ ^${d}{SPONSOR_EMAIL_PATTERN}${d} ]]; then ere=yes; else ere=no; fi`,
            `  oni=${d}(jq -rn --arg a "${d}a" --arg p "^${d}{SPONSOR_EMAIL_PATTERN}${d}" 'if (${d}a | test(${d}p)) then "yes" else "no" end')`,
            `  printf "%s|%s|%s\\n" "${d}a" "${d}ere" "${d}oni"`,
            'done',
          ].join('\n'),
          tempDir,
        });

        expect(result.exitCode).toBe(0);

        const rows = result.stdout
          .trim()
          .split('\n')
          .map((line) => line.split('|'));

        // .why = a row-count assert FIRST, so a bash slip that emitted three
        //        rows cannot read as "all fourteen agreed". an empty filter
        //        over an empty list is the classic false green.
        expect(rows.length).toBe(addresses.length);

        const disagreements = rows.filter(([, ere, oni]) => ere !== oni);
        expect(disagreements).toEqual([]);
      });
    });
  });

  given('[case36] get_one_git_config_identity reads git config', () => {
    /**
     * .what = the reader REPORTS an unreadable config as a kind and never
     *         exits; `guard_git_identity_readable` is the fail-loud half.
     *
     * 🔴 .why = `git config` exits 1 for an absent key — the `unset` state —
     *        and 128 for a file it cannot parse. a reader that absorbed every
     *        non-zero exit would read a broken file as `unset`, and name a fix
     *        that cannot help. a reader that EXITED would flip the exit code
     *        of a grant that already landed (the nudge) or a `get` that must
     *        always report. so the reader names the state; each caller decides.
     *
     * .note = `output.sh` is sourced for `emit_both`, as every skill that
     *         calls the guard does.
     */
    const outputPath = path.join(__dirname, 'output.sh');

    const genBrokenConfigRepo = (slug: string) => {
      const tempDir = genTempDir({ slug, git: true });
      const brokenConfig = path.join(tempDir, 'broken.gitconfig');
      fs.writeFileSync(brokenConfig, '[user\n  name = Kai Nalu\n');
      return { tempDir, brokenConfig };
    };

    when('[t0] a git config file is unparseable, and the reader runs', () => {
      const result = useThen('the reader returns', () => {
        const { tempDir, brokenConfig } = genBrokenConfigRepo(
          'git-identity-broken-read',
        );
        return runFunction({
          tempDir,
          functionCall: `source "${outputPath}"
      GIT_CONFIG_GLOBAL="${brokenConfig}" get_one_git_config_identity
      echo "kind=$GIT_IDENTITY_KIND"`,
        });
      });

      then('it reports the kind unreadable, and does not exit', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('kind=unreadable');
      });

      then('it never classifies the broken file as unset', () => {
        expect(result.stdout).not.toContain('kind=unset');
      });
    });

    when('[t1] a git config file is unparseable, and the guard runs', () => {
      const result = useThen('the guard refuses', () => {
        const { tempDir, brokenConfig } = genBrokenConfigRepo(
          'git-identity-broken-guard',
        );
        return runFunction({
          tempDir,
          functionCall: `source "${outputPath}"
      GIT_CONFIG_GLOBAL="${brokenConfig}" get_one_git_config_identity
      guard_git_identity_readable
      echo "after-guard"`,
        });
      });

      then('it exits 1, as a malfunction, before any later line', () => {
        expect(result.exitCode).toBe(1);
        expect(result.stdout).not.toContain('after-guard');
      });

      then('it names the malfunction and the command to find the file', () => {
        expect(result.stdout).toContain(
          '💥 MalfunctionError: git config could not be read',
        );
        expect(result.stdout).toContain('git config --list --show-origin');
        expect(result.stderr).toContain(
          '💥 MalfunctionError: git config could not be read',
        );
        expect(result.stdout).toMatchSnapshot();

        // git's own `fatal:` line names the temp config by its absolute path —
        // the host's worktree root plus a per-run dir. mask the whole prefix,
        // so the pin holds neither a host path nor a run id
        expect(
          result.stderr.replace(
            /\S*\.temp\/genTempDir\.symlink\/[^/\s]+\//g,
            '<TEMP_DIR>/',
          ),
        ).toMatchSnapshot('stderr');
      });
    });

    when(
      '[t1b] a git config file is unparseable, and the grant nudge runs',
      () => {
        then('🔴 it prints a soft line and returns — it never exits', () => {
          // 🔴 .why = the nudge annotates a grant that already landed. an exit
          //        here would report the landed grant as a failure to any caller
          //        that chains on its exit code.
          const { tempDir, brokenConfig } = genBrokenConfigRepo(
            'git-identity-broken-nudge',
          );
          const result = runFunction({
            tempDir,
            functionCall: `source "${outputPath}"
      GIT_CONFIG_GLOBAL="${brokenConfig}" print_sponsor_bind_nudge_if_absent
      echo "after-nudge"`,
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain(
            'commits will refuse: git config could not be read',
          );
          // the marker proves the leaf returned rather than exited
          expect(result.stdout).toContain('after-nudge');
          expect(result.stdout).not.toContain('MalfunctionError');

          // snapshot the render alone — the marker is harness, not contract
          expect(result.stdout.replace('after-nudge\n', '')).toMatchSnapshot();
        });
      },
    );

    when('[t1c] a git config file is unparseable, and `get` renders', () => {
      then('🔴 it reports the state and returns — it never exits', () => {
        // 🔴 .why = `get` is how a clone reads its own tree; it must report a
        //        state whatever git config holds. clamped here, not through the
        //        skill: an unparseable config fails the skill's own
        //        `git rev-parse` before this render is reached
        const { tempDir, brokenConfig } = genBrokenConfigRepo(
          'git-identity-broken-get',
        );
        const result = runFunction({
          tempDir,
          functionCall: `source "${outputPath}"
      GIT_CONFIG_GLOBAL="${brokenConfig}" print_sponsor_unbound_state
      echo "after-get"`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('sponsor: (none bound)');
        expect(result.stdout).toContain('git config: could not be read');
        expect(result.stdout).toContain('commits: will refuse');
        // the marker proves the leaf returned rather than exited
        expect(result.stdout).toContain('after-get');

        // snapshot the render alone — the marker is harness, not contract
        expect(result.stdout.replace('after-get\n', '')).toMatchSnapshot();
      });
    });

    when('[t1d] git config holds no user.email, and `get` renders', () => {
      then('it names the git config fix before the bind forms', () => {
        const tempDir = genTempDir({
          slug: 'git-identity-get-unset',
          git: true,
        });
        spawnSync('git', ['config', '--local', 'user.name', 'Kai Nalu'], {
          cwd: tempDir,
        });
        spawnSync('git', ['config', '--local', '--unset-all', 'user.email'], {
          cwd: tempDir,
        });

        const result = runFunction({
          tempDir,
          functionCall: `source "${outputPath}"
      print_sponsor_unbound_state`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'git config: holds no complete identity',
        );
        expect(result.stdout).toContain('commits: will refuse');
        expect(result.stdout).toContain(
          'git config --global user.email "you@example.com"',
        );
        expect(result.stdout).not.toContain('git config --global user.name');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1e] git config names a clone, and `get` renders', () => {
      then('it offers the bind forms alone — never a git config fix', () => {
        // .why = a clone identity has no half to fix; a `git config` line
        //        here would tell the reader to rename the clone
        const tempDir = genTempDir({
          slug: 'git-identity-get-clone',
          git: true,
        });
        spawnSync('git', ['config', '--local', 'user.name', 'seaturtle[bot]'], {
          cwd: tempDir,
        });
        spawnSync(
          'git',
          ['config', '--local', 'user.email', 'seaturtle@ehmpath.com'],
          { cwd: tempDir },
        );

        const result = runFunction({
          tempDir,
          functionCall: `source "${outputPath}"
      print_sponsor_unbound_state`,
        });

        expect(result.exitCode).toBe(0);
        // 🔴 names the clone's machine, as the commit refusal does
        expect(result.stdout).toContain(
          "git config: names a clone — the clone's machine",
        );
        expect(result.stdout).toContain('commits: will refuse');
        expect(result.stdout).not.toContain('git config --global');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] git config holds no user.email', () => {
      then('the absent key is absorbed, and names the half at fault', () => {
        const tempDir = genTempDir({ slug: 'git-identity-absent', git: true });
        spawnSync('git', ['config', '--local', 'user.name', 'Kai Nalu'], {
          cwd: tempDir,
        });
        spawnSync('git', ['config', '--local', '--unset-all', 'user.email'], {
          cwd: tempDir,
        });

        const result = runFunction({
          tempDir,
          functionCall: `source "${outputPath}"
      get_one_git_config_identity
      guard_git_identity_readable
      echo "kind=$GIT_IDENTITY_KIND faults=\${GIT_IDENTITY_FAULTS[*]}"`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('kind=unset faults=user.email');
      });
    });

    when('[t4] git config holds a VALUELESS name key', () => {
      then('🔴 it reads as unset — never as a human named "true"', () => {
        // 🔴 .why = git stores `[user]` + a bare `name` line as the boolean
        //        `true`, and plain `--get-regexp` prints it as `user.name true`.
        //        read that way, a commit would credit `true <email>` in a
        //        public trailer. `-z` marks the key valueless; it is absent.
        const tempDir = genTempDir({
          slug: 'git-identity-bare-key',
          git: true,
        });
        spawnSync('git', ['config', '--local', '--unset-all', 'user.name'], {
          cwd: tempDir,
        });
        spawnSync(
          'git',
          ['config', '--local', 'user.email', 'kai@example.com'],
          {
            cwd: tempDir,
          },
        );
        fs.appendFileSync(
          path.join(tempDir, '.git', 'config'),
          '[user]\n\tname\n',
        );

        const result = runFunction({
          tempDir,
          functionCall: `source "${outputPath}"
      get_one_git_config_identity
      echo "kind=$GIT_IDENTITY_KIND name=[$GIT_IDENTITY_NAME] faults=\${GIT_IDENTITY_FAULTS[*]}"`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('kind=unset name=[] faults=user.name');
        expect(result.stdout).not.toContain('name=[true]');
      });
    });

    when('[t3] git config holds two values for user.name', () => {
      then('the last value wins, as git itself applies it', () => {
        // .why = one `--get-regexp` capture lists every value in apply
        //        order; the reader must take the one git would stamp
        const tempDir = genTempDir({ slug: 'git-identity-multi', git: true });
        spawnSync('git', ['config', '--local', 'user.name', 'Old Name'], {
          cwd: tempDir,
        });
        spawnSync(
          'git',
          ['config', '--local', '--add', 'user.name', 'Kai Nalu'],
          {
            cwd: tempDir,
          },
        );
        spawnSync(
          'git',
          ['config', '--local', 'user.email', 'kai@example.com'],
          {
            cwd: tempDir,
          },
        );

        const result = runFunction({
          tempDir,
          functionCall: `source "${outputPath}"
      get_one_git_config_identity
      echo "kind=$GIT_IDENTITY_KIND name=$GIT_IDENTITY_NAME"`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('kind=human name=Kai Nalu');
      });
    });
  });

  given('[case37] every git.commit refusal names its error class', () => {
    /**
     * .what = no git.commit skill source prints an unqualified error.
     *
     * 🔴 .why = rule.require.qualified-error-headers: a reader must tell from
     *        the first line WHO must act. the family renders its refusals via
     *        `print_tree_constraint` / `print_tree_malfunction`, and spells the
     *        class on its raw lines. the unqualified `print_tree_error` stays in
     *        `output.sh` only for skills OUTSIDE git.commit that source it; a
     *        git.commit call to it, or a bare `error: ` opener, would slip the
     *        class back out with no test to catch it.
     *
     * .note = a static scan of the sources, never a render — the refusal
     *         renders are pinned per case in each skill's own suite.
     */
    const sources = fs
      .readdirSync(__dirname)
      .filter((file) => file.endsWith('.sh'))
      .map((file) => ({
        file,
        lines: fs.readFileSync(path.join(__dirname, file), 'utf-8').split('\n'),
      }));

    when('[t0] each skill source is scanned', () => {
      then('the scan covers the skill family', () => {
        // .why = a scan over zero files is the classic false green
        expect(sources.map((source) => source.file)).toEqual(
          expect.arrayContaining([
            'git.commit.set.sh',
            'git.commit.sponsor.sh',
            'git.commit.push.sh',
            'git.commit.operations.sh',
            'output.sh',
          ]),
        );
      });

      then('no source calls the unqualified print_tree_error', () => {
        const calls = sources.flatMap((source) =>
          source.lines
            .filter((line) => /^\s*print_tree_error\s/.test(line))
            .map((line) => `${source.file}: ${line.trim()}`),
        );
        expect(calls).toEqual([]);
      });

      then('no source opens an error with a bare "error: "', () => {
        const openers = sources.flatMap((source) =>
          source.lines
            .filter((line) => !/^\s*#/.test(line))
            .filter((line) => /["']error: |└─ error: /.test(line))
            .filter(
              (line) =>
                !/^print_tree_error\(\)|echo " {3}└─ error: \$message"/.test(
                  line.trim(),
                ),
            )
            .map((line) => `${source.file}: ${line.trim()}`),
        );
        expect(openers).toEqual([]);
      });
    });
  });

  given(
    '[case38] infer_level_from_branch, one definition for bind and set',
    () => {
      /**
       * .what = the branch → level inference that `git.commit.bind get` shows
       *         and `git.commit.set` enforces.
       *
       * .why = it was two byte-identical copies; now it is one. these cases pin
       *        its behavior at the one definition both skills call.
       */
      const cases = [
        { branch: 'fix/typo', level: 'fix' },
        { branch: 'vlad/fix-git-sponsor', level: 'fix' },
        { branch: 'hotfix/prod', level: 'fix' },
        { branch: 'bugfix/edge', level: 'fix' },
        { branch: 'feat/sponsor', level: 'feat' },
        { branch: 'kai/feat-wave-report', level: 'feat' },
        { branch: 'feature/board-rental', level: 'feat' },
        { branch: 'fix/feat/both', level: 'none' },
        { branch: 'chore/deps', level: 'none' },
      ];

      cases.map((thisCase, index) =>
        when(`[t${index}] branch ${thisCase.branch}`, () => {
          then(`infers ${thisCase.level}`, () => {
            const tempDir = genTempDir({ slug: 'infer-level', git: true });
            const result = runFunction({
              tempDir,
              functionCall: `infer_level_from_branch "${thisCase.branch}"`,
            });
            expect(result.exitCode).toBe(0);
            expect(result.stdout.trim()).toBe(thisCase.level);
          });
        }),
      );
    },
  );

  given('[case39] assert_git_identity_read guards the reader contract', () => {
    const outputPath = path.join(__dirname, 'output.sh');

    when('[t0] a leaf reads the identity before the reader ran', () => {
      then(
        'it exits 1, as a named malfunction — never a raw unbound crash',
        () => {
          const tempDir = genTempDir({ slug: 'identity-sentinel', git: true });
          const result = runFunction({
            tempDir,
            functionCall: `source "${outputPath}"
      set -u
      assert_git_identity_read
      echo "after-assert"`,
          });

          expect(result.exitCode).toBe(1);
          expect(result.stdout).toContain(
            '💥 MalfunctionError: the git identity was read before get_one_git_config_identity ran',
          );
          expect(result.stdout).not.toContain('after-assert');
          expect(result.stderr).not.toContain('unbound variable');
          // pin the malfunction render on both streams, as [case36][t1] does
          expect(result.stdout).toMatchSnapshot('stdout');
          expect(result.stderr).toMatchSnapshot('stderr');
        },
      );
    });

    when('[t1] the reader ran first', () => {
      then('it passes through', () => {
        const tempDir = genTempDir({ slug: 'identity-sentinel-ok', git: true });
        const result = runFunction({
          tempDir,
          functionCall: `source "${outputPath}"
      get_one_git_config_identity
      assert_git_identity_read
      echo "after-assert"`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('after-assert');
      });
    });
  });

  /**
   * .what = every `org:` shape keyrack accepts reads as its members; every
   *         other shape refuses as a keyrack fault, and never yields an org
   * .why  = a one-line reader takes the block form as no org and the flow form
   *         as the literal org `[a,b]`, which falls to `@all` (a fail-open)
   */
  given(
    '[case40] get_org_from_keyrack reads org: as a scalar or a list',
    () => {
      const READ_CASES: {
        description: string;
        keyrack: string;
        expect:
          | { members: string }
          | {
              error: string;
              fault: 'org-unreadable';
              kind:
                | 'key-absent'
                | 'list-empty'
                | 'shape'
                | 'member-sigil'
                | 'member-repeat';
            };
      }[] = [
        {
          description: 'scalar',
          keyrack: 'org: ehmpathy\n',
          expect: { members: 'ehmpathy' },
        },
        {
          description: 'scalar, quoted, with an end-of-line comment',
          keyrack: "org: 'ahbode'  # main\n",
          expect: { members: 'ahbode' },
        },
        {
          description: 'block list',
          keyrack:
            'org:\n  - ahbode\n  - bhanya\nextends:\n  - .agent/repo=bhrain/role=reviewer/keyrack.yml\n',
          expect: { members: 'ahbode,bhanya' },
        },
        {
          description: 'block list at column 0, with a comment line',
          keyrack: 'org:\n# the orgs\n- ahbode\n- "bhanya"\n',
          expect: { members: 'ahbode,bhanya' },
        },
        {
          description: 'flow list',
          keyrack: 'org: [ahbode, bhanya]\n',
          expect: { members: 'ahbode,bhanya' },
        },
        {
          description: 'flow list of one',
          keyrack: 'org: [ahbode]\n',
          expect: { members: 'ahbode' },
        },
        {
          description: 'flow list, quoted members, with an end-of-line comment',
          keyrack: `org: ['ahbode', "bhanya"]  # two orgs\n`,
          expect: { members: 'ahbode,bhanya' },
        },
        {
          description: 'block list, an item with an end-of-line comment',
          keyrack: 'org:\n  - ahbode  # main\n  - bhanya\n',
          expect: { members: 'ahbode,bhanya' },
        },
        {
          description: 'block list with CRLF line ends (a windows edit)',
          keyrack: 'org:\r\n  - ahbode\r\n  - bhanya\r\n',
          expect: { members: 'ahbode,bhanya' },
        },
        {
          description: 'scalar with a CRLF line end',
          keyrack: 'org: ehmpathy\r\n',
          expect: { members: 'ehmpathy' },
        },
        {
          description: 'scalar @all (grove scope)',
          keyrack: "org: '@all'\n",
          expect: { members: '@all' },
        },
        {
          description: 'empty flow list',
          keyrack: 'org: []\n',
          expect: {
            error: '.agent/keyrack.yml org: lists no org',
            fault: 'org-unreadable',
            kind: 'list-empty',
          },
        },
        {
          description: 'bare org: with no items',
          keyrack: 'org:\nextends:\n  - x.yml\n',
          expect: {
            error: '.agent/keyrack.yml org: lists no org',
            fault: 'org-unreadable',
            kind: 'list-empty',
          },
        },
        {
          description: 'org: absent',
          keyrack: 'extends:\n  - x.yml\n',
          expect: {
            error: '.agent/keyrack.yml org: absent',
            fault: 'org-unreadable',
            kind: 'key-absent',
          },
        },
        {
          description: 'a map',
          keyrack: 'org:\n  name: ahbode\n',
          expect: {
            error: '.agent/keyrack.yml org: shape not readable',
            fault: 'org-unreadable',
            kind: 'shape',
          },
        },
        {
          description: 'a flow list across lines',
          keyrack: 'org: [ahbode,\n  bhanya]\n',
          expect: {
            error: '.agent/keyrack.yml org: shape not readable',
            fault: 'org-unreadable',
            kind: 'shape',
          },
        },
        {
          // unsupported: a yaml anchor is refused by shape, never read as an org
          description: 'a yaml anchor',
          keyrack: 'org: &main ahbode\n',
          expect: {
            error: '.agent/keyrack.yml org: shape not readable',
            fault: 'org-unreadable',
            kind: 'shape',
          },
        },
        {
          // unsupported: a quoted key is outside the grammar; refused by shape, never absent
          description: 'a quoted key',
          keyrack: '"org": ahbode\n',
          expect: {
            error: '.agent/keyrack.yml org: shape not readable',
            fault: 'org-unreadable',
            kind: 'shape',
          },
        },
        {
          // yaml reads each of these as a number, never a string; keyrack refuses them too
          description: 'yaml number members (float, exponent, hex)',
          keyrack: 'org: [1.5, 1e3, 0x1F]\n',
          expect: {
            error: '.agent/keyrack.yml org: shape not readable',
            fault: 'org-unreadable',
            kind: 'shape',
          },
        },
        {
          // a second org: key is a yaml error; the gate never reads the first
          description: 'a duplicate org: key',
          keyrack: 'org: ahbode\norg: bhanya\n',
          expect: {
            error: '.agent/keyrack.yml org: shape not readable',
            fault: 'org-unreadable',
            kind: 'shape',
          },
        },
        {
          // unsupported: a bare comma list is one scalar to yaml, not a list
          description: 'a bare comma list',
          keyrack: 'org: ahbode, bhanya\n',
          expect: {
            error: '.agent/keyrack.yml org: shape not readable',
            fault: 'org-unreadable',
            kind: 'shape',
          },
        },
        {
          description: 'a yaml null',
          keyrack: 'org: null\n',
          expect: {
            error: '.agent/keyrack.yml org: shape not readable',
            fault: 'org-unreadable',
            kind: 'shape',
          },
        },
        {
          description: 'an @all member in a list',
          keyrack: 'org: [ahbode, "@all"]\n',
          expect: {
            error:
              ".agent/keyrack.yml org: '@all' cannot be a member, it names no org",
            fault: 'org-unreadable',
            kind: 'member-sigil',
          },
        },
        {
          description: 'scalar @this',
          keyrack: "org: '@this'\n",
          expect: {
            error:
              ".agent/keyrack.yml org: '@this' cannot be a member, it names no org",
            fault: 'org-unreadable',
            kind: 'member-sigil',
          },
        },
        {
          description: 'a repeated member',
          keyrack: 'org:\n  - ahbode\n  - ahbode\n',
          expect: {
            error: ".agent/keyrack.yml org: 'ahbode' is listed more than once",
            fault: 'org-unreadable',
            kind: 'member-repeat',
          },
        },
      ];

      READ_CASES.map((thisCase) =>
        when(`[t] ${thisCase.description}`, () => {
          then('reads the members, or refuses as a keyrack fault', () => {
            const tempDir = genTempDir({ slug: 'org-read', git: true });
            const result = runFunction({
              functionCall: `
              if get_org_from_keyrack; then
                echo "members=$(IFS=','; echo "\${ORG_VALUES[*]}") default=$ORG_VALUE"
              else
                echo "error=$ORG_ERROR"
                echo "fault=$ORG_KEYRACK_FAULT"
                echo "kind=$ORG_UNREADABLE_KIND"
                echo "count=\${#ORG_VALUES[@]}"
              fi
            `,
              tempDir,
              keyrackContent: thisCase.keyrack,
            });
            expect(result.exitCode).toBe(0);
            if ('members' in thisCase.expect) {
              const members = thisCase.expect.members;
              expect(result.stdout.trim()).toBe(
                `members=${members} default=${members.split(',')[0]}`,
              );
            }
            if ('error' in thisCase.expect) {
              expect(result.stdout).toContain(
                `error=${thisCase.expect.error}\n`,
              );
              expect(result.stdout).toContain(`fault=${thisCase.expect.fault}`);
              expect(result.stdout).toContain(`kind=${thisCase.expect.kind}\n`);
              expect(result.stdout).toContain('count=0');
            }
          });
        }),
      );

      when('[t] .agent/keyrack.yml absent', () => {
        then('refuses as a file-absent keyrack fault', () => {
          const tempDir = genTempDir({ slug: 'org-read-absent', git: true });
          const result = runFunction({
            functionCall: `
            get_org_from_keyrack || echo "error=$ORG_ERROR fault=$ORG_KEYRACK_FAULT"
          `,
            tempDir,
          });
          expect(result.stdout.trim()).toBe(
            'error=.agent/keyrack.yml not found fault=file-absent',
          );
        });
      });

      when('[t] .agent/keyrack.yml present but unreadable (mode 000)', () => {
        then(
          'refuses on the permission, names chmod, and grants no org',
          () => {
            // root reads a mode-000 file, so this case cannot run as root
            if (process.getuid?.() === 0)
              throw new ConstraintError(
                'a mode-000 keyrack case cannot run as root',
                { hint: 'run the suite as a non-root user' },
              );
            const tempDir = genTempDir({ slug: 'org-read-noperm', git: true });
            fs.mkdirSync(path.join(tempDir, '.agent'), { recursive: true });
            const keyrackPath = path.join(tempDir, '.agent', 'keyrack.yml');
            fs.writeFileSync(keyrackPath, 'org: ehmpathy\n');
            fs.chmodSync(keyrackPath, 0o000);
            const result = runFunction({
              functionCall: `
            get_org_from_keyrack || echo "refused fault=$ORG_KEYRACK_FAULT count=\${#ORG_VALUES[@]} error=$ORG_ERROR"
            print_keyrack_org_note
          `,
              tempDir,
            });
            fs.chmodSync(keyrackPath, 0o644);
            expect(result.stdout).toContain(
              'refused fault=file-unreadable count=0 error=.agent/keyrack.yml not readable (permission denied)',
            );
            expect(result.stdout).toContain('$ chmod 644 .agent/keyrack.yml');
            expect(result.stdout).not.toContain('org: absent');
          },
        );
      });

      when('[t] the read fails after the guards pass (a race)', () => {
        then('refuses as file-unreadable, never a raw bash abort', () => {
          const tempDir = genTempDir({ slug: 'org-read-race', git: true });
          // a function named mapfile shadows the builtin: the read fails
          const result = runFunction({
            functionCall: `
            mapfile() { return 1; }
            get_org_from_keyrack || echo "error=$ORG_ERROR fault=$ORG_KEYRACK_FAULT"
          `,
            tempDir,
            keyrackContent: 'org: ehmpathy\n',
          });
          expect(result.stdout.trim()).toBe(
            'error=.agent/keyrack.yml not readable (read failed) fault=file-unreadable',
          );
        });
      });

      when('[t] git cannot read the repo (dubious ownership)', () => {
        then('keeps git words as repo-unreadable, never "not a repo"', () => {
          const tempDir = genTempDir({ slug: 'org-read-dubious', git: true });
          // a function named git shadows the binary with the fatal git prints
          const result = runFunction({
            functionCall: `
            git() { echo "fatal: detected dubious ownership in repository at '/x'" >&2; return 128; }
            get_org_from_keyrack || echo "error=$ORG_ERROR fault=$ORG_KEYRACK_FAULT"
            print_keyrack_org_note
          `,
            tempDir,
            keyrackContent: 'org: ehmpathy\n',
          });
          expect(result.stdout).toContain(
            "error=git cannot read this repo: detected dubious ownership in repository at '/x' fault=repo-unreadable",
          );
          expect(result.stdout).toContain('fix the repo state git names above');
          expect(result.stdout).not.toContain('run it inside a git repo');
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t] no git repo around the cwd', () => {
        then('refuses as a repo-absent fault, with its own note', () => {
          const tempDir = genTempDir({ slug: 'org-read-norepo', git: true });
          const result = runFunction({
            functionCall: `
            GIT_DIR="$PWD/absent" get_org_from_keyrack || echo "error=$ORG_ERROR fault=$ORG_KEYRACK_FAULT"
            print_keyrack_org_note
          `,
            tempDir,
          });
          expect(result.stdout).toContain(
            'error=not in a git repository fault=repo-absent',
          );
          expect(result.stdout).toContain('run it inside a git repo');
          expect(result.stdout).toMatchSnapshot();
        });
      });
    },
  );

  /**
   * .what = a list repo gates on every listed org; the first refusal names it
   * .why  = a human who blocks one org blocks work that touches it. a flow
   *         list read as one unknown org would pass via `@all: allowed`
   */
  given('[case41] check_org_blocker gates every listed org', () => {
    const runGate = (input: {
      slug: string;
      keyrack: string;
      orgState?: Record<string, string>;
    }) =>
      runFunction({
        functionCall: `
          if check_org_blocker; then
            echo "verdict=allowed"
          else
            echo "verdict=refused"
            echo "gate=$ORG_BLOCK_ORG"
            echo "fault=$ORG_KEYRACK_FAULT"
            echo "reason=$ORG_BLOCK_REASON"
            echo "branches=$ORG_BLOCK_BRANCHES"
          fi
        `,
        tempDir: genTempDir({ slug: input.slug, git: true }),
        tempHome: genTempDir({ slug: `${input.slug}-home`, git: false }),
        keyrackContent: input.keyrack,
        orgState: input.orgState,
      });

    when("[t] scalar org: '@all' (grove scope) reads the meter's @all", () => {
      // F4: a scalar @all is legal; the gate reads the meter's @all verdict
      then('@all allowed → allows', () => {
        const result = runGate({
          slug: 'gate-grove-ok',
          keyrack: "org: '@all'\n",
          orgState: { '@all': 'allowed' },
        });
        expect(result.stdout.trim()).toBe('verdict=allowed');
      });
      then('@all blocked → refuses, no keyrack fault', () => {
        const result = runGate({
          slug: 'gate-grove-blocked',
          keyrack: "org: '@all'\n",
          orgState: { '@all': 'blocked' },
        });
        expect(result.stdout).toContain('verdict=refused');
        expect(result.stdout).toContain('fault=\n');
        expect(result.stdout).toContain('reason=commits blocked for org @all');
      });
    });

    when('[t0] a block list, every org allowed', () => {
      then('allows', () => {
        const result = runGate({
          slug: 'gate-list-ok',
          keyrack: 'org:\n  - ahbode\n  - bhanya\n',
          orgState: { ahbode: 'allowed', bhanya: 'allowed' },
        });
        expect(result.stdout.trim()).toBe('verdict=allowed');
      });
    });

    when('[t1] a flow list, one org blocked, @all allowed', () => {
      then('refuses and names the blocked org', () => {
        const result = runGate({
          slug: 'gate-flow-blocked',
          keyrack: 'org: [ahbode, bhanya]\n',
          orgState: { ahbode: 'allowed', bhanya: 'blocked', '@all': 'allowed' },
        });
        expect(result.stdout).toContain('verdict=refused');
        expect(result.stdout).toContain('gate=bhanya\n');
        expect(result.stdout).toContain('fault=\n');
        expect(result.stdout).toContain(
          'reason=commits blocked for org bhanya\n',
        );
        expect(result.stdout).toContain(
          'branches=├─ .agent/keyrack.yml org: lists ahbode, bhanya\n└─ every listed org must allow commits',
        );
      });
    });

    when('[t2] a block list, one org blocked', () => {
      then('refuses and names the blocked org', () => {
        const result = runGate({
          slug: 'gate-block-blocked',
          keyrack: 'org:\n  - ahbode\n  - bhanya\n',
          orgState: { ahbode: 'allowed', bhanya: 'blocked' },
        });
        expect(result.stdout).toContain('verdict=refused');
        expect(result.stdout).toContain('gate=bhanya\n');
      });
    });

    when('[t2b] a list, two orgs blocked', () => {
      then('refuses and names the first blocked org, in list order', () => {
        const result = runGate({
          slug: 'gate-two-blocked',
          keyrack: 'org: [ahbode, bhanya]\n',
          orgState: { ahbode: 'blocked', bhanya: 'blocked' },
        });
        expect(result.stdout).toContain('verdict=refused');
        expect(result.stdout).toContain('gate=ahbode\n');
        expect(result.stdout).toContain(
          'reason=commits blocked for org ahbode\n',
        );
      });
    });

    when('[t3] a list, one org unset, no @all', () => {
      then('refuses and names the unset org', () => {
        const result = runGate({
          slug: 'gate-list-unset',
          keyrack: 'org: [ahbode, bhanya]\n',
          orgState: { ahbode: 'allowed' },
        });
        expect(result.stdout).toContain('gate=bhanya\n');
        expect(result.stdout).toContain('reason=no org config for bhanya');
      });
    });

    when('[t4] a list, members unset, @all allowed', () => {
      then('allows via @all', () => {
        const result = runGate({
          slug: 'gate-list-all',
          keyrack: 'org: [ahbode, bhanya]\n',
          orgState: { '@all': 'allowed' },
        });
        expect(result.stdout.trim()).toBe('verdict=allowed');
      });
    });

    when('[t5] a list, no meter file', () => {
      then('refuses and names member 0', () => {
        const result = runGate({
          slug: 'gate-list-nometer',
          keyrack: 'org: [ahbode, bhanya]\n',
        });
        expect(result.stdout).toContain('gate=ahbode\n');
        expect(result.stdout).toContain('reason=no org config for ahbode');
      });
    });

    when('[t6] an empty list', () => {
      then('refuses as a keyrack fault, before any meter read', () => {
        const result = runGate({
          slug: 'gate-list-empty',
          keyrack: 'org: []\n',
          orgState: { '@all': 'allowed' },
        });
        expect(result.stdout).toContain('verdict=refused');
        expect(result.stdout).toContain('gate=\n');
        expect(result.stdout).toContain('fault=org-unreadable');
        expect(result.stdout).toContain(
          'reason=.agent/keyrack.yml org: lists no org',
        );
      });
    });

    when('[t7] a decorated scalar, its org blocked, @all allowed', () => {
      then('refuses and names the plain org', () => {
        const result = runGate({
          slug: 'gate-scalar-decorated',
          keyrack: "org: 'ahbode'  # main\n",
          orgState: { ahbode: 'blocked', '@all': 'allowed' },
        });
        expect(result.stdout).toContain('gate=ahbode\n');
        expect(result.stdout).toContain(
          'reason=commits blocked for org ahbode\n',
        );
      });
    });
  });
});
