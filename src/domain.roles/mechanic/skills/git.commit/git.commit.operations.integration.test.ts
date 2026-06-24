import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

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
    if (args.orgState && args.tempHome) {
      const globalMeterDir = path.join(
        args.tempHome,
        '.rhachet',
        'storage',
        'repo=ehmpathy',
        'role=mechanic',
        '.meter',
      );
      fs.mkdirSync(globalMeterDir, { recursive: true });
      fs.writeFileSync(
        path.join(globalMeterDir, 'git.commit.uses.org.jsonc'),
        JSON.stringify({ orgs: args.orgState }, null, 2),
      );
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
  });
});
