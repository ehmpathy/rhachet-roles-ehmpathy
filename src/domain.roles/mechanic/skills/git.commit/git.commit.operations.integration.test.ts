import { spawnSync } from 'child_process';
import * as fs from 'fs';
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
  }): { stdout: string; stderr: string; exitCode: number } => {
    const bashCode = `
      source "${operationsPath}"
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

    when('[t2] keyrack.yml#org unset', () => {
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
        expect(result.stdout).toContain('.agent/keyrack.yml#org required');
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
});
