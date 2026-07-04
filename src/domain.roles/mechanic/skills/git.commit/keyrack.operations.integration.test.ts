import { spawnSync } from 'child_process';
import * as path from 'path';
import { given, then, when } from 'test-fns';

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
