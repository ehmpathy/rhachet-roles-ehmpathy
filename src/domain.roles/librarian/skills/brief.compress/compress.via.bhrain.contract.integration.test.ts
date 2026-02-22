import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { BRIEF_INPUT_CONTEXT_PATTERN } from './.test/fixtures/briefs';

/**
 * .what = contract integration tests for bhrain/sitrep compression
 * .why = verify bhrain press api contract, input/output shapes, and error paths
 */
describe('compress.via.bhrain.contract', () => {
  // use dist skill because it has compiled mechanisms
  const skillPath = path.join(
    __dirname,
    '../../../../../dist/domain.roles/librarian/skills/brief.compress/brief.compress.sh',
  );

  /**
   * .what = sanitize stdout for snapshot stability
   * .why = token counts, temp dir paths, and elapsed time change between runs
   */
  const sanitizeOutput = (stdout: string): string =>
    stdout
      .replace(/\/tmp\/[^\s]+/g, '/tmp/TEMP_DIR')
      .replace(/tokens\.before: \d+/g, 'tokens.before: N')
      .replace(/tokens\.after: \d+/g, 'tokens.after: N')
      .replace(/ratio\.actual: [\d.]+x/g, 'ratio.actual: Nx')
      .replace(/time: [\d.]+s/g, 'time: Ns')
      .replace(/via: [^\n]+/g, 'via: PRESS@BRAIN');

  // fixture path with package.json for brain discovery
  const fixtureDir =
    'src/domain.roles/librarian/skills/brief.compress/.test/assets';

  /**
   * .what = helper to run brief.compress in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempGitRepo = (args: {
    files: Record<string, string>;
    compressArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({
      slug: 'bhrain-compress-test',
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
      timeout: 180000, // 3 min timeout for brain api calls
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

  given('[case1] plan mode contract', () => {
    when('[t0] compress via bhrain/sitrep --mode plan', () => {
      // expensive brain call - run once, share result
      const result = useThen('compression completes', () =>
        runInTempGitRepo({
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
        }),
      );

      then('exits with code 0', () => {
        // observability: log stderr if exit code is non-zero
        if (result.exitCode !== 0) {
          console.error('bhrain test failed with stderr:', result.stderr);
          console.error('bhrain test failed with stdout:', result.stdout);
        }
        expect(result.exitCode).toBe(0);
      });

      then('shows turtle header', () => {
        expect(result.stdout).toContain('🐢');
      });

      then('shows mode: plan', () => {
        expect(result.stdout).toContain('mode: plan');
      });

      then('shows default brain in via', () => {
        expect(result.stdout).toContain(
          'via: bhrain/sitrep@xai/grok/code-fast-1',
        );
      });

      then('reports tokens.before', () => {
        expect(result.stdout).toContain('tokens.before');
      });

      then('reports tokens.after', () => {
        expect(result.stdout).toContain('tokens.after');
      });

      then('reports ratio.actual', () => {
        expect(result.stdout).toContain('ratio.actual');
      });

      then('does not create .md.min file', () => {
        const minPath = path.join(result.tempDir, 'brief.md.min');
        expect(fs.existsSync(minPath)).toBe(false);
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case2] apply mode contract', () => {
    when('[t0] compress via bhrain/sitrep --mode apply', () => {
      // expensive brain call - run once, share result
      const result = useThen('compression completes', () =>
        runInTempGitRepo({
          files: {
            'brief.md': BRIEF_INPUT_CONTEXT_PATTERN,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'bhrain/sitrep',
            '--mode',
            'apply',
          ],
        }),
      );

      then('exits with code 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('creates .md.min file', () => {
        const minPath = path.join(result.tempDir, 'brief.md.min');
        expect(fs.existsSync(minPath)).toBe(true);
      });

      then('compressed file is smaller than original', () => {
        const originalPath = path.join(result.tempDir, 'brief.md');
        const minPath = path.join(result.tempDir, 'brief.md.min');

        const originalSize = fs.statSync(originalPath).size;
        const compressedSize = fs.statSync(minPath).size;

        expect(compressedSize).toBeLessThan(originalSize);
      });

      then('source file is unchanged', () => {
        const originalPath = path.join(result.tempDir, 'brief.md');
        const content = fs.readFileSync(originalPath, 'utf-8');
        expect(content).toBe(BRIEF_INPUT_CONTEXT_PATTERN);
      });
    });
  });

  given('[case3] --into flag contract', () => {
    when('[t0] compress via bhrain/sitrep --into custom path', () => {
      const result = useThen('compression completes', () =>
        runInTempGitRepo({
          files: {
            'brief.md': BRIEF_INPUT_CONTEXT_PATTERN,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'bhrain/sitrep',
            '--into',
            'output/compressed.md',
            '--mode',
            'apply',
          ],
        }),
      );

      then('exits with code 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('writes to specified output path', () => {
        const outputPath = path.join(result.tempDir, 'output/compressed.md');
        expect(fs.existsSync(outputPath)).toBe(true);
      });

      then('does not create default .md.min file', () => {
        const defaultMinPath = path.join(result.tempDir, 'brief.md.min');
        expect(fs.existsSync(defaultMinPath)).toBe(false);
      });
    });
  });

  given('[case4] press@brain parse contract', () => {
    when('[t0] --via bhrain/sitrep (no @brain)', () => {
      const result = useThen('compression completes', () =>
        runInTempGitRepo({
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
        }),
      );

      then('defaults to xai/grok/code-fast-1', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'via: bhrain/sitrep@xai/grok/code-fast-1',
        );
      });
    });

    when('[t1] --via bhrain/sitrep@xai/grok/code-fast-1 (explicit)', () => {
      const result = useThen('compression completes', () =>
        runInTempGitRepo({
          files: {
            'brief.md': BRIEF_INPUT_CONTEXT_PATTERN,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'bhrain/sitrep@xai/grok/code-fast-1',
            '--mode',
            'plan',
          ],
        }),
      );

      then('uses specified brain', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'via: bhrain/sitrep@xai/grok/code-fast-1',
        );
      });
    });
  });

  given('[case5] error paths', () => {
    when('[t0] --via with @ but no press', () => {
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

        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('no press before @');
      });
    });

    when('[t1] --via with no @ and no /', () => {
      then('exits non-zero with error', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': BRIEF_INPUT_CONTEXT_PATTERN,
          },
          compressArgs: ['--from', 'brief.md', '--via', 'tinybert'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('expected format');
      });
    });

    when('[t2] --into with glob --from', () => {
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
            'bhrain/sitrep',
            '--into',
            'output.md',
          ],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('--into only valid for single file');
      });
    });

    when('[t3] unknown press family', () => {
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

        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('unknown press family');
      });
    });
  });

  given('[case6] semantic preservation contract', () => {
    when('[t0] compress brief via bhrain/sitrep', () => {
      const result = useThen('compression completes', () =>
        runInTempGitRepo({
          files: {
            'brief.md': BRIEF_INPUT_CONTEXT_PATTERN,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'bhrain/sitrep',
            '--mode',
            'apply',
          ],
        }),
      );

      then('preserves key semantic terms (input, context)', () => {
        const minPath = path.join(result.tempDir, 'brief.md.min');
        const compressedContent = fs.readFileSync(minPath, 'utf-8');

        expect(compressedContent.toLowerCase()).toContain('input');
        expect(compressedContent.toLowerCase()).toContain('context');
      });

      then('preserves code blocks', () => {
        const minPath = path.join(result.tempDir, 'brief.md.min');
        const compressedContent = fs.readFileSync(minPath, 'utf-8');

        expect(compressedContent).toContain('```');
      });

      then('output is valid markdown', () => {
        const minPath = path.join(result.tempDir, 'brief.md.min');
        const compressedContent = fs.readFileSync(minPath, 'utf-8');

        // basic markdown validity checks
        expect(compressedContent.length).toBeGreaterThan(0);
        // should not have json artifacts
        expect(compressedContent).not.toMatch(/^\s*\{/);
        expect(compressedContent).not.toMatch(/^\s*\[/);
      });
    });
  });
});
