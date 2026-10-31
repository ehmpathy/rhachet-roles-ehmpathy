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

  given('[case40] set_commit_meter_state writes the quota file', () => {
    const readMeter = (tempDir: string): unknown =>
      JSON.parse(
        fs.readFileSync(path.join(tempDir, 'git.commit.uses.jsonc'), 'utf-8'),
      );

    when('[t0] a count, push, and stage are given', () => {
      then('it writes valid json, and leaves no temp file beside it', () => {
        const tempDir = genTempDir({ slug: 'meter-write-count' });
        const result = runFunction({
          tempDir,
          functionCall: `set_commit_meter_state file="${tempDir}/git.commit.uses.jsonc" uses=2 push=allow stage=block`,
        });

        expect(result.exitCode).toBe(0);
        expect(readMeter(tempDir)).toEqual({
          uses: 2,
          push: 'allow',
          stage: 'block',
        });
        expect(fs.readdirSync(tempDir)).toEqual(['git.commit.uses.jsonc']);
      });
    });

    when('[t1] uses is infinite', () => {
      then('it writes "infinite" as a string', () => {
        const tempDir = genTempDir({ slug: 'meter-write-infinite' });
        const result = runFunction({
          tempDir,
          functionCall: `set_commit_meter_state file="${tempDir}/git.commit.uses.jsonc" uses=infinite push=block stage=allow`,
        });

        expect(result.exitCode).toBe(0);
        expect(readMeter(tempDir)).toEqual({
          uses: 'infinite',
          push: 'block',
          stage: 'allow',
        });
      });
    });

    when('[t2] a value carries a quote', () => {
      then('jq encodes it, so the file still parses', () => {
        const tempDir = genTempDir({ slug: 'meter-write-quote' });
        const result = runFunction({
          tempDir,
          functionCall: `set_commit_meter_state file="${tempDir}/git.commit.uses.jsonc" uses=1 push='al"low' stage=block`,
        });

        expect(result.exitCode).toBe(0);
        expect(readMeter(tempDir)).toEqual({
          uses: 1,
          push: 'al"low',
          stage: 'block',
        });
      });
    });

    when('[t3] uses is empty or no integer', () => {
      then('it exits 1 loud, and leaves the prior file whole', () => {
        const tempDir = genTempDir({ slug: 'meter-write-bad-uses' });
        const meterPath = path.join(tempDir, 'git.commit.uses.jsonc');
        fs.writeFileSync(meterPath, '{"uses": 3, "push": "allow"}');
        const result = runFunction({
          tempDir,
          functionCall: `set_commit_meter_state file="${meterPath}" uses= push=allow stage=block`,
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: set_commit_meter_state refused its input',
        );
        expect(result.stderr).toEqual(result.stdout);
        expect(fs.readFileSync(meterPath, 'utf-8')).toEqual(
          '{"uses": 3, "push": "allow"}',
        );
        expect(result.stdout).toMatchSnapshot('stdout');
      });
    });

    when('[t4] push or stage is empty', () => {
      then('it exits 1 loud, before any write', () => {
        const tempDir = genTempDir({ slug: 'meter-write-bad-push' });
        const result = runFunction({
          tempDir,
          functionCall: `set_commit_meter_state file="${tempDir}/git.commit.uses.jsonc" uses=1 push= stage=block`,
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('push is empty');
        expect(result.stderr).toEqual(result.stdout);
        expect(fs.readdirSync(tempDir)).toEqual([]);
        expect(result.stdout.split(tempDir).join('<tmp>')).toMatchSnapshot();
      });
    });

    when('[t5] an unknown arg is passed', () => {
      then('it exits 1 and names the arg', () => {
        const tempDir = genTempDir({ slug: 'meter-write-bad-arg' });
        const result = runFunction({
          tempDir,
          functionCall: `set_commit_meter_state file="${tempDir}/git.commit.uses.jsonc" usse=1 push=allow stage=block`,
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain("unknown arg 'usse=1'");
        expect(result.stderr).toEqual(result.stdout);
        expect(result.stdout.split(tempDir).join('<tmp>')).toMatchSnapshot();
      });
    });

    when('[t6] the write fails (the dir is absent)', () => {
      then('it exits 1 loud, never silent', () => {
        const tempDir = genTempDir({ slug: 'meter-write-no-dir' });
        const result = runFunction({
          tempDir,
          functionCall: `set_commit_meter_state file="${tempDir}/absent/git.commit.uses.jsonc" uses=1 push=allow stage=block
      echo "after-write"`,
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('could not create a temp file');
        expect(result.stdout).not.toContain('after-write');
        expect(result.stderr).toContain('could not create a temp file');
        expect(result.stdout.split(tempDir).join('<tmp>')).toMatchSnapshot();
      });
    });

    when('[t8] uses is below zero (a spend from zero)', () => {
      then('it exits 1 loud, and writes no file', () => {
        const tempDir = genTempDir({ slug: 'meter-write-negative' });
        const result = runFunction({
          tempDir,
          functionCall: `set_commit_meter_state file="${tempDir}/git.commit.uses.jsonc" uses=-1 push=allow stage=block`,
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain("uses='-1' is below zero");
        expect(result.stderr).toEqual(result.stdout);
        expect(fs.readdirSync(tempDir)).toEqual([]);
        expect(result.stdout.split(tempDir).join('<tmp>')).toMatchSnapshot();
      });
    });

    when('[t7] it is called inside an if (where set -e holds no sway)', () => {
      then('a refused input still halts the caller', () => {
        const tempDir = genTempDir({ slug: 'meter-write-in-if' });
        const result = runFunction({
          tempDir,
          functionCall: `set -e
      if set_commit_meter_state file="${tempDir}/git.commit.uses.jsonc" uses=x push=allow stage=block; then echo "branch-ran"; fi
      echo "after-if"`,
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).not.toContain('branch-ran');
        expect(result.stdout).not.toContain('after-if');
      });
    });
  });

  given('[case41] as_commit_uses_after_spend', () => {
    when('[t0] uses is a count or infinite', () => {
      then('it spends one, and infinite stays infinite', () => {
        const tempDir = genTempDir({ slug: 'uses-after-spend' });
        const result = runFunction({
          tempDir,
          functionCall: `echo "$(as_commit_uses_after_spend uses=3)"
      echo "$(as_commit_uses_after_spend uses=infinite)"`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim().split('\n')).toEqual(['2', 'infinite']);
      });
    });

    when('[t1] uses is empty or no integer', () => {
      then('it exits 1 on stderr, never a silent -1', () => {
        const tempDir = genTempDir({ slug: 'uses-after-spend-bad' });
        const result = runFunction({
          tempDir,
          functionCall: `set -e
      NEW_USES=$(as_commit_uses_after_spend uses=)
      echo "left=$NEW_USES"`,
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).not.toContain('left=');
        expect(result.stderr).toContain(
          '💥 MalfunctionError: as_commit_uses_after_spend refused its input',
        );
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case42] fetch_robot_token keeps the fetch status', () => {
    /**
     * .mock = fetch_github_token, redefined as a bash function after source
     * .why = a keyrack fetch cannot be made to fail on demand in a hermetic test
     * .real = external.contracts.integration.test.ts [case2]: the real keyrack
     *         `get --json`, as fetch_github_token calls it, and the shape it reads
     */
    when('[t0] the fetch fails with no stderr and a partial stdout', () => {
      then('the token is empty, and the cause names the exit status', () => {
        const tempDir = genTempDir({ slug: 'token-fetch-silent-fail' });
        const result = runFunction({
          tempDir,
          functionCall: `fetch_github_token() { echo "partial"; return 3; }
      fetch_robot_token
      echo "token=[$ROBOT_TOKEN]"
      echo "cause=[$TOKEN_FETCH_ERR]"`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('token=[]');
        expect(result.stdout).toContain(
          'cause=[token fetch exited 3, with no stderr]',
        );
      });
    });

    when('[t1] the fetch succeeds', () => {
      then('the token holds, and no cause is set', () => {
        const tempDir = genTempDir({ slug: 'token-fetch-ok' });
        const result = runFunction({
          tempDir,
          functionCall: `fetch_github_token() { echo "ghs_wave"; }
      fetch_robot_token
      echo "token=[$ROBOT_TOKEN]"
      echo "cause=[$TOKEN_FETCH_ERR]"`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('token=[ghs_wave]');
        expect(result.stdout).toContain('cause=[]');
      });
    });

    when('[t2] the fetch exits 0 with no token', () => {
      then('the cause names the empty token', () => {
        const tempDir = genTempDir({ slug: 'token-fetch-empty-ok' });
        const result = runFunction({
          tempDir,
          functionCall: `fetch_github_token() { echo ""; }
      fetch_robot_token
      echo "cause=[$TOKEN_FETCH_ERR]"`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'cause=[token fetch exited 0, with no token]',
        );
      });
    });
  });

  given('[case44] set_robot_identity_from_token', () => {
    /**
     * .mock = get_one_seaturtle_identity, redefined in [t1] as a bash function
     * .why = the real reader always emits an identity; only a fake can emit none
     * .real = [t0] runs the real reader; external.contracts.integration.test.ts
     *         [case2] runs the real keyrack the token comes from
     */
    when('[t0] the token is empty', () => {
      then('it sets the standard seaturtle identity', () => {
        const tempDir = genTempDir({ slug: 'robot-identity-standard' });
        const result = runFunction({
          tempDir,
          functionCall: `set_robot_identity_from_token token=""
      echo "name=[$ROBOT_NAME] email=[$ROBOT_EMAIL]"`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('name=[seaturtle[bot]]');
        expect(result.stdout).not.toContain('email=[]');
      });
    });

    when('[t1] the reader emits no identity', () => {
      then('it exits 1 loud, never a blank author', () => {
        const tempDir = genTempDir({ slug: 'robot-identity-blank' });
        const result = runFunction({
          tempDir,
          functionCall: `get_one_seaturtle_identity() { return 0; }
      set_robot_identity_from_token token=""
      echo "after-set"`,
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: no seaturtle identity for this token',
        );
        expect(result.stderr).toEqual(result.stdout);
        expect(result.stdout).not.toContain('after-set');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case46] get_commit_sponsor fails closed', () => {
    const outputPath = path.join(__dirname, 'output.sh');

    /**
     * .mock = read_sponsor_state, redefined as a bash function after source
     * .why = the real reader returns only 0, 1, or 2; only a fake returns another
     * .real = git.commit.set's sponsor suites run the real reader
     */
    when('[t0] the reader returns a status the gate does not know', () => {
      then('it exits 1 as a malfunction, never reads as bound', () => {
        const tempDir = genTempDir({ slug: 'sponsor-unknown-status' });
        const result = runFunction({
          tempDir,
          functionCall: `source "${outputPath}"
      read_sponsor_state() { return 7; }
      get_commit_sponsor skill="git.commit.set" file="${tempDir}/sponsor.json"
      echo "after-sponsor"`,
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          "💥 MalfunctionError: unknown sponsor read status '7'",
        );
        expect(result.stderr).toEqual(result.stdout);
        expect(result.stdout).not.toContain('after-sponsor');
        expect(result.stdout.split(tempDir).join('<tmp>')).toMatchSnapshot();
      });
    });
  });

  given(
    '[case51] refuse_if_commit_gates_fail checks its refuse= tokens',
    () => {
      const outputPath = path.join(__dirname, 'output.sh');

      when('[t0] a token is mistyped', () => {
        then(
          'it exits 1 before any gate runs; the gate never fails open',
          () => {
            const tempDir = genTempDir({ slug: 'gates-refuse-typo' });
            const result = runFunction({
              tempDir,
              functionCall: `source "${outputPath}"
      refuse_if_commit_gates_fail skill="git.commit.set" state_file="${tempDir}/uses.jsonc" sponsor_file="${tempDir}/sponsor.json" repo_root="${tempDir}" refuse="currupt absent"
      echo "after-gates"`,
            });

            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain("refuse= holds 'currupt'");
            expect(result.stdout).not.toContain('after-gates');
            expect(result.stderr).toContain("refuse= holds 'currupt'");
            expect(result.stdout.split(tempDir).join('<tmp>')).toMatchSnapshot(
              'stdout',
            );
          },
        );
      });
    },
  );

  given('[case48] findsert_gitignored_dir converges', () => {
    when('[t0] the dir is absent', () => {
      then('it writes the headers, then the rule, and no temp file', () => {
        const tempDir = genTempDir({ slug: 'gitignored-dir-fresh' });
        const dir = path.join(tempDir, '.meter');
        const result = runFunction({
          tempDir,
          functionCall: `findsert_gitignored_dir "${dir}" "# state, never committed"`,
        });

        expect(result.exitCode).toBe(0);
        expect(fs.readFileSync(path.join(dir, '.gitignore'), 'utf-8')).toEqual(
          '# state, never committed\n*\n',
        );
        expect(fs.readdirSync(dir)).toEqual(['.gitignore']);
      });
    });

    when('[t1] a .gitignore was cut short before its rule', () => {
      then('a re-run adds the rule, once', () => {
        const tempDir = genTempDir({ slug: 'gitignored-dir-partial' });
        const dir = path.join(tempDir, '.meter');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          path.join(dir, '.gitignore'),
          '# state, never committed\n',
        );
        const result = runFunction({
          tempDir,
          functionCall: `findsert_gitignored_dir "${dir}" "# state, never committed"
      findsert_gitignored_dir "${dir}" "# state, never committed"`,
        });

        expect(result.exitCode).toBe(0);
        expect(fs.readFileSync(path.join(dir, '.gitignore'), 'utf-8')).toEqual(
          '# state, never committed\n*\n',
        );
      });
    });
  });

  given('[case49] the ops file sourced alone', () => {
    when(
      '[t0] the corrupt sponsor render runs with no output.sh source',
      () => {
        then('it renders whole, never a command-not-found', () => {
          const tempDir = genTempDir({ slug: 'ops-alone-render' });
          const result = runFunction({
            tempDir,
            functionCall: `print_sponsor_corrupt_render "git.commit.set"`,
          });

          expect(result.exitCode).toBe(0);
          expect(result.stderr).not.toContain('command not found');
          expect(result.stdout).toContain('sponsor state file corrupt');
        });
      },
    );
  });

  given('[case50] as_path_shown_from_home', () => {
    when('[t0] the path sits under home, outside it, or home is empty', () => {
      then(
        'under is `~`-rooted; outside and empty-home are shown whole',
        () => {
          const tempDir = genTempDir({ slug: 'path-shown-home' });
          const result = runFunction({
            tempDir,
            functionCall: `echo "$(as_path_shown_from_home path=/reef/home/.rhachet/m.jsonc home=/reef/home)"
      echo "$(as_path_shown_from_home path=/lagoon/m.jsonc home=/reef/home)"
      echo "$(as_path_shown_from_home path=/.rhachet/m.jsonc home=)"`,
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout.trim().split('\n')).toEqual([
            '~/.rhachet/m.jsonc',
            '/lagoon/m.jsonc',
            '/.rhachet/m.jsonc',
          ]);
        },
      );
    });
  });

  given('[case45] as_path_shown_from_repo', () => {
    when('[t0] the path sits inside the root, or outside it', () => {
      then('inside is shown relative; outside is shown whole', () => {
        const tempDir = genTempDir({ slug: 'path-shown' });
        const result = runFunction({
          tempDir,
          functionCall: `echo "$(as_path_shown_from_repo path=/reef/repo/.meter/a.jsonc root=/reef/repo)"
      echo "$(as_path_shown_from_repo path=/lagoon/b.jsonc root=/reef/repo)"`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim().split('\n')).toEqual([
          '.meter/a.jsonc',
          '/lagoon/b.jsonc',
        ]);
      });
    });

    when('[t1] the root is empty', () => {
      then('the path is shown whole, its lead slash kept', () => {
        const tempDir = genTempDir({ slug: 'path-shown-no-root' });
        const result = runFunction({
          tempDir,
          functionCall: `echo "$(as_path_shown_from_repo path=/reef/repo/.meter/a.jsonc root=)"`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toEqual('/reef/repo/.meter/a.jsonc');
      });
    });
  });

  given('[case47] print_token_fetch_malfunction', () => {
    when('[t0] it renders', () => {
      then('the render rides both stdout and stderr', () => {
        const tempDir = genTempDir({ slug: 'token-fetch-render' });
        const result = runFunction({
          tempDir,
          functionCall: `print_token_fetch_malfunction cause="keyrack locked"`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: the ehmpath keyrack token fetch failed',
        );
        expect(result.stderr).toEqual(result.stdout);
        expect(result.stdout).toMatchSnapshot('stdout');
      });
    });

    when('[t1] the cause spans lines, one repeated by the retry', () => {
      then('each distinct line is one leaf, inside the tree', () => {
        const tempDir = genTempDir({ slug: 'token-fetch-render-lines' });
        const result = runFunction({
          tempDir,
          functionCall: `print_token_fetch_malfunction cause="$(printf 'rhachet: not found\\nrhachet: not found\\n\\nkeyrack: unlock failed\\nrhachet: not found')"`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          [
            '   ├─ cause',
            '   │  ├─ rhachet: not found',
            '   │  └─ keyrack: unlock failed',
            '   └─ fix: unlock the token before the next commit',
          ].join('\n'),
        );
        expect(result.stdout.split('rhachet: not found').length).toBe(2);
        expect(result.stderr).toEqual(result.stdout);
        expect(result.stdout).toMatchSnapshot('stdout');
      });
    });
  });

  given('[case43] refuse_commit_quota fails closed', () => {
    const outputPath = path.join(__dirname, 'output.sh');

    when('[t0] the status is one it does not know', () => {
      then('it exits 1 as a malfunction, never reads as healthy', () => {
        const tempDir = genTempDir({ slug: 'quota-unknown-status' });
        const result = runFunction({
          tempDir,
          functionCall: `source "${outputPath}"
      refuse_commit_quota skill="git.commit.set" status="drift"
      echo "after-refuse"`,
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          "💥 MalfunctionError: unknown commit quota status 'drift'",
        );
        expect(result.stdout).not.toContain('after-refuse');
        expect(result.stderr).toEqual(result.stdout);
        expect(result.stdout).toMatchSnapshot('stdout');
      });
    });

    when('[t1] the status is ok', () => {
      then('it is a no-op', () => {
        const tempDir = genTempDir({ slug: 'quota-ok-status' });
        const result = runFunction({
          tempDir,
          functionCall: `source "${outputPath}"
      refuse_commit_quota skill="git.commit.set" status="ok"
      echo "after-refuse"`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('after-refuse');
      });
    });
  });
});
