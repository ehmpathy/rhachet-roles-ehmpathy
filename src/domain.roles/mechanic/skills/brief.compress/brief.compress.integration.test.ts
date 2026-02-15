import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { BRIEF_INPUT_CONTEXT_PATTERN } from './.test/fixtures/briefs';

/**
 * .what = shell-level integration tests for brief.compress.sh skill
 * .why = verify shared shell behavior: arg validation, help, press@brain route
 *
 * .note = mechanism-specific tests are in:
 *   - compress.via.llmlingua.integration.test.ts
 *   - compress.via.bhrain.contract.integration.test.ts
 *   - compress.via.bhrain.perfeval.integration.test.ts
 */
describe('brief.compress.sh', () => {
  // use dist skill because it has compiled mechanisms
  const skillPath = path.join(
    __dirname,
    '../../../../../dist/domain.roles/mechanic/skills/brief.compress/brief.compress.sh',
  );

  // fixture path with package.json for brain discovery (relative to repo root)
  const fixtureDir =
    'src/domain.roles/mechanic/skills/brief.compress/.test/assets';

  /**
   * .what = helper to run brief.compress in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempGitRepo = (args: {
    files: Record<string, string>;
    compressArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    // genTempDir with symlink for node_modules and clone fixture for package.json
    const tempDir = genTempDir({
      slug: 'brief-compress-test',
      git: true,
      clone: fixtureDir,
      symlink: [{ at: 'node_modules', to: 'node_modules' }],
    });

    // create test files
    for (const [filePath, content] of Object.entries(args.files)) {
      const fullPath = path.join(tempDir, filePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

    // add files to git
    execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit -m "initial"', { cwd: tempDir, stdio: 'pipe' });

    // run brief.compress
    const result = spawnSync('bash', [skillPath, ...args.compressArgs], {
      cwd: tempDir,
      env: process.env,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000, // 2 min timeout for model load
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

  given('[case1] error conditions', () => {
    when('[t0] file not found', () => {
      then('exits non-zero with error', () => {
        const result = runInTempGitRepo({
          files: {
            'other.md': 'content',
          },
          compressArgs: [
            '--from',
            'nonexistent.md',
            '--via',
            'llmlingua/v2@tinybert',
          ],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('file not found');
      });
    });

    when('[t1] no --from provided', () => {
      then('exits non-zero with error', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': BRIEF_INPUT_CONTEXT_PATTERN,
          },
          compressArgs: ['--via', 'llmlingua/v2@tinybert'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('--from is required');
      });
    });

    when('[t2] no --via provided', () => {
      then('exits non-zero with error', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': BRIEF_INPUT_CONTEXT_PATTERN,
          },
          compressArgs: ['--from', 'brief.md'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('--via is required');
      });
    });

    when('[t3] --via with @ but no press', () => {
      then('exits non-zero with error', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': BRIEF_INPUT_CONTEXT_PATTERN,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            '@xai/grok/code-fast-1',
          ],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('no press before @');
      });
    });

    when('[t4] --via with no @ and no /', () => {
      then('exits non-zero with error', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': BRIEF_INPUT_CONTEXT_PATTERN,
          },
          compressArgs: ['--from', 'brief.md', '--via', 'tinybert'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('expected format');
      });
    });

    when('[t5] --into with glob --from', () => {
      then('exits non-zero with error', () => {
        const result = runInTempGitRepo({
          files: {
            'briefs/rule1.md': '# rule 1',
            'briefs/rule2.md': '# rule 2',
          },
          compressArgs: [
            '--from',
            'briefs/*.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--into',
            'output.md',
          ],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('--into only valid for single file');
      });
    });
  });

  given('[case2] help output', () => {
    when('[t0] --help flag', () => {
      then('shows usage and exits 0', () => {
        const result = runInTempGitRepo({
          files: { 'placeholder.md': '# placeholder' },
          compressArgs: ['--help'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('brief.compress');
        expect(result.stdout).toContain('usage');
        expect(result.stdout).toContain('--from');
        expect(result.stdout).toContain('--via');
        expect(result.stdout).toContain('--mode');
        expect(result.stdout).toContain('--ratio');
        expect(result.stdout).toContain('llmlingua');
        expect(result.stdout).toContain('bhrain/sitrep');
      });

      then('help output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: { 'placeholder.md': '# placeholder' },
          compressArgs: ['--help'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3] press@brain selection', () => {
    when('[t0] --via llmlingua/v2@tinybert', () => {
      then('uses tinybert model', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': BRIEF_INPUT_CONTEXT_PATTERN,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--mode',
            'plan',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('via: llmlingua/v2@tinybert');
      });
    });

    when('[t1] --via bhrain/sitrep with default brain', () => {
      then('defaults to xai/grok/code-fast-1', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': BRIEF_INPUT_CONTEXT_PATTERN,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'bhrain/sitrep',
            '--mode',
            'plan',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'via: bhrain/sitrep@xai/grok/code-fast-1',
        );
      });
    });

    when('[t2] --via unknown press family', () => {
      then('exits non-zero with error', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': BRIEF_INPUT_CONTEXT_PATTERN,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'unknown/press@somemodel',
          ],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('unknown press family');
      });
    });
  });
});
