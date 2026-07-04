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
        expect(identity.name).toBe('seaturtle-by-ehmpathy[bot]');
        expect(identity.email).toBe(
          '295111357+seaturtle-by-ehmpathy[bot]@users.noreply.github.com',
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
