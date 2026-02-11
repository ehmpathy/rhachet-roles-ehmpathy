import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = integration tests for brief.compress.sh skill
 * .why = verify the skill compresses markdown files via llmlingua and bhrain mechanisms
 */
describe('brief.compress.sh', () => {
  // use dist skill because it has compiled mechanisms
  const skillPath = path.join(
    __dirname,
    '../../../../../dist/domain.roles/mechanic/skills/brief.compress/brief.compress.sh',
  );

  /**
   * .what = sanitize stdout for snapshot stability
   * .why = token counts, temp dir paths, and brains change between runs
   */
  const sanitizeOutput = (stdout: string): string =>
    stdout
      .replace(/\/tmp\/[^\s]+/g, '/tmp/TEMP_DIR')
      .replace(/tokens\.before: \d+/g, 'tokens.before: N')
      .replace(/tokens\.after: \d+/g, 'tokens.after: N')
      .replace(/ratio\.actual: [\d.]+x/g, 'ratio.actual: Nx')
      .replace(/via: [^\n]+/g, 'via: PRESS@BRAIN');

  /**
   * .what = sample brief content for compression tests
   * .why = provides realistic markdown content to compress
   */
  const sampleBrief = `# rule.require.input-context-pattern

## .what

enforce hard requirement that all procedure args follow the canonical pattern: \`(input, context?)\` — even for simple one-liners

## .why

- promotes long-term clarity and change-resilience over short-term brevity
- prevents positional argument confusion
- supports context injection without argument churn
- aligns with domain patterns: input = upstream data, context = runtime environment
- enables safe refactors and consistent documentation across codebase

## .how

### required

- every function must accept exactly:
  - one \`input\` arg — a destructurable object
  - optional second \`context\` arg — also a destructurable object

### forbidden

- more than 2 positional args
- non-destructurable inputs
- context blended into input
- inline positional args unless anonymous

## .examples

### positive

\`\`\`ts
export const genRoute = async (input: { slug: string }, context?: { traceId?: string }) => { ... }
\`\`\`

### negative

\`\`\`ts
export function doTask(a, b, c) {}              // positional args & function keyword
\`\`\`
`;

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

  given('[case1] single markdown brief via llmlingua', () => {
    when('[t0] run with --mode plan', () => {
      then('shows compression preview without emit', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
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
        expect(result.stdout).toContain('🐢');
        expect(result.stdout).toContain('mode: plan');
        expect(result.stdout).toContain('tokens.before');
        expect(result.stdout).toContain('tokens.after');
        expect(result.stdout).toContain('ratio.actual');

        // verify no .md.min file created
        const minPath = path.join(result.tempDir, 'brief.md.min');
        expect(fs.existsSync(minPath)).toBe(false);
      });

      then('exits with code 0', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
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
      });
    });

    when('[t1] run with --mode apply', () => {
      then('creates .md.min file', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // verify .md.min file created
        const minPath = path.join(result.tempDir, 'brief.md.min');
        expect(fs.existsSync(minPath)).toBe(true);
      });

      then('compressed file is smaller', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // compare sizes
        const originalPath = path.join(result.tempDir, 'brief.md');
        const minPath = path.join(result.tempDir, 'brief.md.min');

        const originalSize = fs.statSync(originalPath).size;
        const compressedSize = fs.statSync(minPath).size;

        expect(compressedSize).toBeLessThan(originalSize);
      });

      then('source file unchanged', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // verify source unchanged
        const originalPath = path.join(result.tempDir, 'brief.md');
        const content = fs.readFileSync(originalPath, 'utf-8');
        expect(content).toBe(sampleBrief);
      });

      then('reports compression ratio', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('ratio.actual');
        expect(result.stdout).toMatch(/ratio\.actual: [\d.]+x/);
      });
    });
  });

  given('[case2] glob pattern', () => {
    when('[t0] matches multiple files', () => {
      then('compresses all matched files', () => {
        const result = runInTempGitRepo({
          files: {
            'briefs/rule1.md':
              '# rule 1\n\nthis is rule one with some content.',
            'briefs/rule2.md':
              '# rule 2\n\nthis is rule two with some content.',
            'briefs/rule3.md':
              '# rule 3\n\nthis is rule three with some content.',
          },
          compressArgs: [
            '--from',
            'briefs/*.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // verify all .md.min files created
        expect(
          fs.existsSync(path.join(result.tempDir, 'briefs/rule1.md.min')),
        ).toBe(true);
        expect(
          fs.existsSync(path.join(result.tempDir, 'briefs/rule2.md.min')),
        ).toBe(true);
        expect(
          fs.existsSync(path.join(result.tempDir, 'briefs/rule3.md.min')),
        ).toBe(true);
      });
    });

    when('[t1] matches no files', () => {
      then('exits non-zero with error', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: [
            '--from',
            'nonexistent/*.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--mode',
            'plan',
          ],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('no files matched');
      });
    });
  });

  given('[case3] extant .md.min file', () => {
    when('[t0] source older than .md.min', () => {
      then('skips with up-to-date message', () => {
        const tempDir = genTempDir({ slug: 'brief-compress-test', git: true });

        // create source file
        const sourcePath = path.join(tempDir, 'brief.md');
        fs.writeFileSync(sourcePath, sampleBrief);

        // create .md.min file with future mtime
        const minPath = path.join(tempDir, 'brief.md.min');
        fs.writeFileSync(minPath, 'compressed content');

        // set .md.min to be newer
        const futureTime = new Date(Date.now() + 10000);
        fs.utimesSync(minPath, futureTime, futureTime);

        // git setup
        execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: tempDir, stdio: 'pipe' });

        // run brief.compress
        const result = spawnSync(
          'bash',
          [
            skillPath,
            '--from',
            'brief.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--mode',
            'plan',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('skip');
        expect(result.stdout).toContain('up-to-date');
      });
    });

    when('[t1] --force flag', () => {
      then('recompresses regardless', () => {
        const tempDir = genTempDir({ slug: 'brief-compress-test', git: true });

        // create source file
        const sourcePath = path.join(tempDir, 'brief.md');
        fs.writeFileSync(sourcePath, sampleBrief);

        // create .md.min file with future mtime
        const minPath = path.join(tempDir, 'brief.md.min');
        fs.writeFileSync(minPath, 'old compressed content');

        // set .md.min to be newer
        const futureTime = new Date(Date.now() + 10000);
        fs.utimesSync(minPath, futureTime, futureTime);

        // git setup
        execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: tempDir, stdio: 'pipe' });

        // run brief.compress with --force
        const result = spawnSync(
          'bash',
          [
            skillPath,
            '--from',
            'brief.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--mode',
            'apply',
            '--force',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 120000,
          },
        );

        expect(result.status).toBe(0);

        // verify content was recompressed (not the old content)
        const newContent = fs.readFileSync(minPath, 'utf-8');
        expect(newContent).not.toBe('old compressed content');
      });
    });
  });

  given('[case4] error conditions', () => {
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

    when('[t1] any text file accepted', () => {
      then('compresses non-markdown files', () => {
        const result = runInTempGitRepo({
          files: {
            'file.txt':
              'This is some sample text content that should be compressed.',
          },
          compressArgs: [
            '--from',
            'file.txt',
            '--via',
            'llmlingua/v2@tinybert',
            '--mode',
            'plan',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('tokens.before');
      });
    });

    when('[t2] no --from provided', () => {
      then('exits non-zero with error', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: ['--via', 'llmlingua/v2@tinybert'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('--from is required');
      });
    });

    when('[t3] no --via provided', () => {
      then('exits non-zero with error', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: ['--from', 'brief.md'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('--via is required');
      });
    });

    when('[t4] --via with @ but no press', () => {
      then('exits non-zero with error', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
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

    when('[t5] --via with no @ and no /', () => {
      then('exits non-zero with error', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: ['--from', 'brief.md', '--via', 'tinybert'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('expected format');
      });
    });

    when('[t6] --into with glob --from', () => {
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

  given('[case5] output format', () => {
    when('[t0] successful llmlingua compression', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('contains turtle emoji', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
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
        expect(result.stdout).toContain('🐢');
        expect(result.stdout).toContain('🐚');
      });
    });
  });

  given('[case6] help output', () => {
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

  given('[case7] press@brain selection', () => {
    when('[t0] --via llmlingua/v2@tinybert', () => {
      then('uses tinybert model', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
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
            'brief.md': sampleBrief,
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
            'brief.md': sampleBrief,
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

  given('[case8] ratio control', () => {
    when('[t0] --ratio 2', () => {
      then('targets 2x compression', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--mode',
            'plan',
            '--ratio',
            '2',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('ratio: 2x target');
      });
    });

    when('[t1] --ratio out of bounds', () => {
      then('exits non-zero with error for ratio < 1', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--ratio',
            '0',
          ],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('--ratio must be');
      });

      then('exits non-zero with error for ratio > 20', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--ratio',
            '25',
          ],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('--ratio must be');
      });
    });
  });

  given('[case9] compression effect via llmlingua', () => {
    /**
     * .what = real-world content from Wikipedia sea turtles article
     * .why = proves compression works on substantive prose, not just short samples
     */
    const seaTurtleArticle = fs.readFileSync(
      path.join(
        __dirname,
        '../../../../../blackbox/.test/fixtures/wikipedia.seaturtles.txt',
      ),
      'utf-8',
    );

    when('[t0] compress substantial prose content', () => {
      then('achieves meaningful token reduction', () => {
        const result = runInTempGitRepo({
          files: {
            'seaturtles.md': seaTurtleArticle,
          },
          compressArgs: [
            '--from',
            'seaturtles.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // verify file was created
        const minPath = path.join(result.tempDir, 'seaturtles.md.min');
        expect(fs.existsSync(minPath)).toBe(true);

        // verify compressed size is smaller
        const originalSize = fs.statSync(
          path.join(result.tempDir, 'seaturtles.md'),
        ).size;
        const compressedSize = fs.statSync(minPath).size;
        expect(compressedSize).toBeLessThan(originalSize);

        // verify compression ratio is reported in output
        expect(result.stdout).toMatch(/ratio\.actual: [\d.]+x/);
      });

      then('preserves core semantic content', () => {
        const result = runInTempGitRepo({
          files: {
            'seaturtles.md': seaTurtleArticle,
          },
          compressArgs: [
            '--from',
            'seaturtles.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // read compressed content
        const minPath = path.join(result.tempDir, 'seaturtles.md.min');
        const compressedContent = fs.readFileSync(minPath, 'utf-8');

        // verify key semantic terms are preserved
        expect(compressedContent).toContain('turtle');
        expect(compressedContent).toContain('sea');
      });

      then('reports token counts', () => {
        const result = runInTempGitRepo({
          files: {
            'seaturtles.md': seaTurtleArticle,
          },
          compressArgs: [
            '--from',
            'seaturtles.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--mode',
            'plan',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('tokens.before:');
        expect(result.stdout).toContain('tokens.after:');

        // extract token counts to verify compression occurred
        const beforeMatch = result.stdout.match(/tokens\.before: (\d+)/);
        const afterMatch = result.stdout.match(/tokens\.after: (\d+)/);

        expect(beforeMatch).not.toBeNull();
        expect(afterMatch).not.toBeNull();

        const tokensBefore = parseInt(beforeMatch![1]!, 10);
        const tokensAfter = parseInt(afterMatch![1]!, 10);

        // verify meaningful compression (at least 1.5x reduction)
        expect(tokensBefore / tokensAfter).toBeGreaterThan(1.5);
      });
    });
  });

  given('[case10] bhrain/sitrep compression', () => {
    when('[t0] compress brief via bhrain/sitrep plan mode', () => {
      then('shows compression preview', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
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

        // observability: log stderr if exit code is non-zero
        if (result.exitCode !== 0) {
          console.error('bhrain test failed with stderr:', result.stderr);
          console.error('bhrain test failed with stdout:', result.stdout);
        }
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢');
        expect(result.stdout).toContain('mode: plan');
        expect(result.stdout).toContain(
          'via: bhrain/sitrep@xai/grok/code-fast-1',
        );
        expect(result.stdout).toContain('tokens.before');
        expect(result.stdout).toContain('tokens.after');
        expect(result.stdout).toContain('ratio.actual');

        // verify no .md.min file created in plan mode
        const minPath = path.join(result.tempDir, 'brief.md.min');
        expect(fs.existsSync(minPath)).toBe(false);
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] compress brief via bhrain/sitrep apply mode', () => {
      then('creates .md.min file', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'bhrain/sitrep',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // verify .md.min file created
        const minPath = path.join(result.tempDir, 'brief.md.min');
        expect(fs.existsSync(minPath)).toBe(true);
      });

      then('compressed file is smaller', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'bhrain/sitrep',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // compare sizes
        const originalPath = path.join(result.tempDir, 'brief.md');
        const minPath = path.join(result.tempDir, 'brief.md.min');

        const originalSize = fs.statSync(originalPath).size;
        const compressedSize = fs.statSync(minPath).size;

        expect(compressedSize).toBeLessThan(originalSize);
      });

      then('source file unchanged', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'bhrain/sitrep',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // verify source unchanged
        const originalPath = path.join(result.tempDir, 'brief.md');
        const content = fs.readFileSync(originalPath, 'utf-8');
        expect(content).toBe(sampleBrief);
      });
    });

    when('[t2] compress brief via bhrain/sitrep with --into', () => {
      then('writes to specified output path', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
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
        });

        expect(result.exitCode).toBe(0);

        // verify output at specified path
        const outputPath = path.join(result.tempDir, 'output/compressed.md');
        expect(fs.existsSync(outputPath)).toBe(true);

        // verify default path not created
        const defaultMinPath = path.join(result.tempDir, 'brief.md.min');
        expect(fs.existsSync(defaultMinPath)).toBe(false);
      });
    });

    when('[t3] sitrep preserves semantic content', () => {
      then('preserves rule statements', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'bhrain/sitrep',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // read compressed content
        const minPath = path.join(result.tempDir, 'brief.md.min');
        const compressedContent = fs.readFileSync(minPath, 'utf-8');

        // verify key semantic terms preserved
        expect(compressedContent.toLowerCase()).toContain('input');
        expect(compressedContent.toLowerCase()).toContain('context');
      });

      then('preserves code examples', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'bhrain/sitrep',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // read compressed content
        const minPath = path.join(result.tempDir, 'brief.md.min');
        const compressedContent = fs.readFileSync(minPath, 'utf-8');

        // verify code blocks are preserved
        expect(compressedContent).toContain('```');
      });
    });
  });

  given('[case11] bhrain/sitrep repeatability', () => {
    when.repeatably({
      attempts: 3,
      criteria: process.env.CI ? 'SOME' : 'EVERY',
    })('[t0] compress brief via bhrain/sitrep', () => {
      // expensive brain call - run once, share result via useThen
      const result = useThen('compresses the brief', () =>
        runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
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

      then('exits successfully', () => {
        expect(result.exitCode).toBe(0);
      });

      then('produces compression ratio within expected range', () => {
        const ratioMatch = result.stdout.match(/ratio\.actual: ([\d.]+)x/);
        expect(ratioMatch).not.toBeNull();
        const ratio = parseFloat(ratioMatch![1]!);

        // sitrep targets 30-50% of original = 2x-3.3x ratio
        // allow 1.5x-4x for variance
        expect(ratio).toBeGreaterThan(1.5);
        expect(ratio).toBeLessThan(4);
      });

      then('preserves semantic content', () => {
        const minPath = path.join(result.tempDir, 'brief.md.min');
        const compressedContent = fs.readFileSync(minPath, 'utf-8');

        // key semantic terms preserved
        expect(compressedContent.toLowerCase()).toContain('input');
        expect(compressedContent.toLowerCase()).toContain('context');
      });

      then('preserves code blocks', () => {
        const minPath = path.join(result.tempDir, 'brief.md.min');
        const compressedContent = fs.readFileSync(minPath, 'utf-8');

        expect(compressedContent).toContain('```');
      });
    });
  });

  given('[case12] --into flag', () => {
    when('[t0] --into with single file', () => {
      then('writes to specified path instead of .min', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: [
            '--from',
            'brief.md',
            '--via',
            'llmlingua/v2@tinybert',
            '--into',
            'output/custom.md',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // verify output at specified path
        const outputPath = path.join(result.tempDir, 'output/custom.md');
        expect(fs.existsSync(outputPath)).toBe(true);

        // verify default .min path not created
        const defaultMinPath = path.join(result.tempDir, 'brief.md.min');
        expect(fs.existsSync(defaultMinPath)).toBe(false);
      });
    });
  });
});
