import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for get_one_seaturtle_identity in keyrack.operations.sh
 * .why = verify the commit-author identity is derived from the token kind, so the
 *        squash author equals the PR opener (github sets squash-author = opener)
 */
describe('keyrack.operations.sh :: get_one_seaturtle_identity', () => {
  const operationsPath = path.join(__dirname, 'keyrack.operations.sh');

  /**
   * .what = source keyrack.operations.sh and call get_one_seaturtle_identity
   * .why = exercises the pure token to identity transformer in isolation
   */
  const deriveIdentity = (
    token: string,
  ): { name: string; email: string; exitCode: number } => {
    const bashCode = `
      source "${operationsPath}"
      get_one_seaturtle_identity "${token}"
    `;
    const result = spawnSync('bash', ['-c', bashCode], {
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const [name = '', email = ''] = (result.stdout ?? '').trim().split('\t');
    return { name, email, exitCode: result.status ?? 1 };
  };

  given('[case1] an app installation token (ghs_)', () => {
    when('[t0] identity is derived', () => {
      then('it returns the alternative seaturtle (app bot)', () => {
        const identity = deriveIdentity('ghs_abc123example');
        expect(identity.exitCode).toBe(0);
        expect(identity.name).toBe('ehm-a-seaturtle[bot]');
        expect(identity.email).toBe(
          '295111357+ehm-a-seaturtle[bot]@users.noreply.github.com',
        );
      });
    });
  });

  given('[case2] a classic personal access token (ghp_)', () => {
    when('[t0] identity is derived', () => {
      then('it returns the standard seaturtle (turtle user)', () => {
        const identity = deriveIdentity('ghp_abc123example');
        expect(identity.exitCode).toBe(0);
        expect(identity.name).toBe('seaturtle[bot]');
        expect(identity.email).toBe('seaturtle@ehmpath.com');
      });
    });
  });

  given('[case3] a fine-grained personal access token (github_pat_)', () => {
    when('[t0] identity is derived', () => {
      then('it returns the standard seaturtle (turtle user)', () => {
        const identity = deriveIdentity('github_pat_abc123example');
        expect(identity.exitCode).toBe(0);
        expect(identity.name).toBe('seaturtle[bot]');
        expect(identity.email).toBe('seaturtle@ehmpath.com');
      });
    });
  });

  given('[case4] an empty token', () => {
    when('[t0] identity is derived', () => {
      then('it fails safe to the standard seaturtle', () => {
        const identity = deriveIdentity('');
        expect(identity.exitCode).toBe(0);
        expect(identity.name).toBe('seaturtle[bot]');
        expect(identity.email).toBe('seaturtle@ehmpath.com');
      });
    });
  });

  given('[case5] an unknown token shape', () => {
    when('[t0] identity is derived', () => {
      then('it fails safe to the standard seaturtle', () => {
        const identity = deriveIdentity('wat_unknownprefix');
        expect(identity.exitCode).toBe(0);
        expect(identity.name).toBe('seaturtle[bot]');
        expect(identity.email).toBe('seaturtle@ehmpath.com');
      });
    });
  });
});

/**
 * .what = integration tests for is_one_seaturtle_identity_name in keyrack.operations.sh
 * .why = the push guard must accept commits from either seaturtle identity, since
 *        get_one_seaturtle_identity picks the app bot for app tokens
 */
describe('keyrack.operations.sh :: is_one_seaturtle_identity_name', () => {
  const operationsPath = path.join(__dirname, 'keyrack.operations.sh');

  /**
   * .what = source keyrack.operations.sh and call the predicate
   * .why = exercises the identity acceptance check in isolation
   */
  const isSeaturtleName = (name: string): { exitCode: number } => {
    const bashCode = `
      source "${operationsPath}"
      is_one_seaturtle_identity_name "${name}"
    `;
    const result = spawnSync('bash', ['-c', bashCode], {
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exitCode: result.status ?? 1 };
  };

  given('[case1] the standard seaturtle name', () => {
    when('[t0] the predicate is checked', () => {
      then('it accepts (exit 0)', () => {
        expect(isSeaturtleName('seaturtle[bot]').exitCode).toBe(0);
      });
    });
  });

  given('[case2] the alternative seaturtle name (app bot)', () => {
    when('[t0] the predicate is checked', () => {
      then('it accepts (exit 0)', () => {
        expect(isSeaturtleName('ehm-a-seaturtle[bot]').exitCode).toBe(0);
      });
    });
  });

  given('[case3] a foreign author name', () => {
    when('[t0] the predicate is checked', () => {
      then('it rejects (exit 1)', () => {
        expect(isSeaturtleName('Some Human').exitCode).toBe(1);
      });
    });
  });
});

/**
 * .what = integration tests for assert_token_identity_in_sync in keyrack.operations.sh
 * .why = the failfast must block a commit when an app token maps to a bot id other
 *        than the one we hardcode (which would silently add a 3rd squash contributor),
 *        yet stay out of the way for non-app tokens and unverifiable probes.
 * .note = `gh` is mocked via a PATH stub so these stay hermetic (no real network)
 */
describe('keyrack.operations.sh :: assert_token_identity_in_sync', () => {
  const operationsPath = path.join(__dirname, 'keyrack.operations.sh');

  /**
   * .what = run the assert with an optional PATH-mocked gh
   * .why = exercises each branch without a real github api call
   */
  const runAssert = (input: {
    token: string;
    ghViewerJson?: string;
    ghAbsent?: boolean;
  }): { exitCode: number; stderr: string } => {
    // build a temp dir that either shadows gh with a stub, or is empty (gh absent)
    const stub = input.ghViewerJson
      ? `cat > "$TMP/gh" <<'STUB'\n#!/usr/bin/env bash\necho '${input.ghViewerJson}'\nSTUB\nchmod +x "$TMP/gh"\n`
      : '';
    const pathLine = input.ghAbsent
      ? 'export PATH="$TMP"' // empty dir → gh not found
      : input.ghViewerJson
        ? 'export PATH="$TMP:$PATH"' // stub shadows real gh
        : ''; // leave PATH as-is
    const bashCode = `
      TMP=$(mktemp -d)
      ${stub}
      ${pathLine}
      source "${operationsPath}"
      assert_token_identity_in_sync "${input.token}"
    `;
    const result = spawnSync('bash', ['-c', bashCode], {
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exitCode: result.status ?? 1, stderr: result.stderr ?? '' };
  };

  const matchJson =
    '{"data":{"viewer":{"login":"ehm-a-seaturtle[bot]","databaseId":295111357}}}';
  const mismatchJson =
    '{"data":{"viewer":{"login":"impostor[bot]","databaseId":999999}}}';

  given('[case1] an app token whose bot identity matches expectation', () => {
    when('[t0] the identity is asserted', () => {
      then('it passes (exit 0)', () => {
        const result = runAssert({
          token: 'ghs_faketoken',
          ghViewerJson: matchJson,
        });
        expect(result.exitCode).toBe(0);
      });
    });
  });

  given('[case2] an app token whose bot identity does not match', () => {
    when('[t0] the identity is asserted', () => {
      then('it fails loud (exit 1) with an explanatory error', () => {
        const result = runAssert({
          token: 'ghs_faketoken',
          ghViewerJson: mismatchJson,
        });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('out of sync');
      });
    });
  });

  given('[case3] a personal access token (not an app token)', () => {
    when('[t0] the identity is asserted', () => {
      then('it skips the check (exit 0)', () => {
        const result = runAssert({ token: 'ghp_faketoken' });
        expect(result.exitCode).toBe(0);
      });
    });
  });

  given('[case4] an empty token', () => {
    when('[t0] the identity is asserted', () => {
      then('it skips the check (exit 0)', () => {
        const result = runAssert({ token: '' });
        expect(result.exitCode).toBe(0);
      });
    });
  });

  given('[case5] an app token but gh is unavailable', () => {
    when('[t0] the identity is asserted', () => {
      then('it does not block (exit 0)', () => {
        const result = runAssert({ token: 'ghs_faketoken', ghAbsent: true });
        expect(result.exitCode).toBe(0);
      });
    });
  });
});

/**
 * .what = integration tests for fetch_github_token in keyrack.operations.sh
 * .why = the fetch must keep rhachet's stdout (json) and stderr (warnings, errors)
 *        apart. a stray stderr note on an otherwise-healthy `keyrack get` must not
 *        bleed into the json jq parses — a merged 2>&1 would blank the token and
 *        misreport a HEALTHY keyrack as unavailable (or crash the caller under set
 *        -euo pipefail). the real cause must still surface on stderr when the token
 *        is truly unreachable (rule.forbid.failhide, rule.require.test-covered-repairs).
 * .note = rhachet is mocked via node_modules/.bin/rhachet in a temp git repo so
 *         these stay hermetic (no real keyrack call)
 */
describe('keyrack.operations.sh :: fetch_github_token', () => {
  const operationsPath = path.join(__dirname, 'keyrack.operations.sh');

  /**
   * .what = run fetch_github_token in a temp git repo with a faked rhachet
   * .why = exercises the stdout/stderr separation without a real keyrack
   *
   * .mock = the `rhachet` keyrack communicator (node_modules/.bin/rhachet)
   * .why  = fetch_github_token's whole job is the stdout/stderr split of a keyrack
   *         fetch; to assert that split deterministically we must drive rhachet to
   *         exact token/error outputs, which a real keyrack (network, live secrets,
   *         machine-dependent errors) cannot provide hermetically. per
   *         rule.forbid.integration.mocks this is the "clearly unavoidable" exception —
   *         the fake stubs ONLY the keyrack boundary; the real fetch_github_token bash
   *         logic under test runs unfaked, under the same set -euo pipefail as prod.
   * .real = the real keyrack fetch is exercised by keyrack.operations.sh in production
   *         (and by every other integration suite that unlocks the real ehmpath/test
   *         keyrack); this fake stands in ONLY for the unreachable keyrack boundary.
   */
  const runFetch = (
    fakeRhachet: string,
  ): { token: string; stderr: string; exitCode: number } => {
    const tempDir = genTempDir({ slug: 'keyrack-fetch-test', git: true });
    const fakeBin = path.join(tempDir, 'node_modules', '.bin');
    fs.mkdirSync(fakeBin, { recursive: true });
    fs.writeFileSync(path.join(fakeBin, 'rhachet'), fakeRhachet);
    fs.chmodSync(path.join(fakeBin, 'rhachet'), '755');

    // run under the same set -euo pipefail the real callers use, so a jq crash on
    // corrupted json would abort here too — any stream bleed shows as a failure
    const bashCode = `
      set -euo pipefail
      source "${operationsPath}"
      fetch_github_token
    `;
    const result = spawnSync('bash', ['-c', bashCode], {
      cwd: tempDir,
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return {
      token: (result.stdout ?? '').trim(),
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given(
    '[case1] rhachet exits 0 but emits a stray note on stderr alongside valid json',
    () => {
      when('[t0] the token is fetched', () => {
        then(
          'the stderr note does not corrupt extraction — the token is returned',
          () => {
            // the exact regression: a HEALTHY `keyrack get` that also prints a
            // warn line to stderr. a merged 2>&1 would feed that line into jq and
            // blank the token; the streams held apart keep the json clean.
            const result = runFetch(`#!/usr/bin/env bash
echo "warn: deprecation notice from rhachet" >&2
echo '{"grant":{"key":{"secret":"ghp_healthyfake"}}}'
exit 0
`);
            expect(result.exitCode).toBe(0);
            expect(result.token).toBe('ghp_healthyfake');
          },
        );
      });
    },
  );

  given('[case2] rhachet fails on every call with an error on stderr', () => {
    when('[t0] the token is fetched', () => {
      then(
        'the token is empty and the cause is surfaced on stderr for the guide',
        () => {
          const result = runFetch(`#!/usr/bin/env bash
echo "error: keyrack is locked" >&2
exit 1
`);
          // fetch returns 0 with an empty token; the caller reads the empty value
          // and fires its guide
          expect(result.exitCode).toBe(0);
          expect(result.token).toBe('');
          // the real cause is forwarded on our stderr so the caller's guide can
          // show it (rule.forbid.failhide) — not swallowed into a generic message
          expect(result.stderr).toContain('keyrack is locked');
        },
      );
    });
  });

  given('[case3] rhachet emits ansi color + control chars in its error', () => {
    when('[t0] the token is fetched and the cause is surfaced', () => {
      then('the surfaced cause is stripped of ansi/control chars', () => {
        // rhachet colors its errors; the surfaced cause must be clean so it
        // reads plainly in the guide tree and stays valid once escaped into
        // the json error path (a raw control char would break that parse)
        const result = runFetch(`#!/usr/bin/env bash
printf '\\033[31merror: keyrack daemon down\\033[0m\\n' >&2
exit 1
`);
        expect(result.exitCode).toBe(0);
        expect(result.token).toBe('');
        // the human-readable text survives, the escape sequences do not
        expect(result.stderr).toContain('error: keyrack daemon down');
        expect(result.stderr).not.toContain('\u001b');
        expect(result.stderr).not.toContain('[31m');
        expect(result.stderr).not.toContain('[0m');
      });
    });
  });
});
