import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for brief.compress.sh skill
 * .why = verify the skill compresses markdown files via LLMLingua-2
 */
describe('brief.compress.sh', () => {
  // use dist skill because it has compiled compress.js
  const skillPath = path.join(
    __dirname,
    '../../../../../dist/domain.roles/mechanic/skills/brief.compress/brief.compress.sh',
  );

  /**
   * .what = sanitize stdout for snapshot stability
   * .why = token counts and temp dir paths change between runs
   */
  const sanitizeOutput = (stdout: string): string =>
    stdout
      .replace(/\/tmp\/[^\s]+/g, '/tmp/TEMP_DIR')
      .replace(/tokens\.before: \d+/g, 'tokens.before: N')
      .replace(/tokens\.after: \d+/g, 'tokens.after: N')
      .replace(/ratio\.actual: [\d.]+x/g, 'ratio.actual: Nx');

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

  /**
   * .what = helper to run brief.compress in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempGitRepo = (args: {
    files: Record<string, string>;
    compressArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'brief-compress-test', git: true });

    // create files
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

  given('[case1] single markdown brief', () => {
    when('[t0] run with --mode plan', () => {
      then('shows compression preview without emit', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: ['brief.md', '--mode', 'plan'],
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
          compressArgs: ['brief.md', '--mode', 'plan'],
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
          compressArgs: ['brief.md', '--mode', 'apply'],
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
          compressArgs: ['brief.md', '--mode', 'apply'],
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
          compressArgs: ['brief.md', '--mode', 'apply'],
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
          compressArgs: ['brief.md', '--mode', 'apply'],
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
          compressArgs: ['--glob', 'briefs/*.md', '--mode', 'apply'],
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
      then('reports no files matched', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: ['--glob', 'nonexistent/*.md', '--mode', 'plan'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no files matched pattern');
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
          [skillPath, 'brief.md', '--mode', 'plan'],
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
          [skillPath, 'brief.md', '--mode', 'apply', '--force'],
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
          compressArgs: ['nonexistent.md'],
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
          compressArgs: ['file.txt', '--mode', 'plan'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('tokens.before');
      });
    });

    when('[t2] no path or glob provided', () => {
      then('exits non-zero with error', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: [],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain(
          'provide a file path or --glob pattern',
        );
      });
    });
  });

  given('[case5] output format', () => {
    when('[t0] successful compression', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: ['brief.md', '--mode', 'plan'],
        });

        expect(result.exitCode).toBe(0);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('contains turtle emoji', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: ['brief.md', '--mode', 'plan'],
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
          files: { 'placeholder.md': '# placeholder' }, // need a file for git commit
          compressArgs: ['--help'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('brief.compress');
        expect(result.stdout).toContain('usage');
        expect(result.stdout).toContain('--mode');
        expect(result.stdout).toContain('--mech');
        expect(result.stdout).toContain('--ratio');
      });
    });
  });

  given('[case7] model selection', () => {
    when('[t0] --mech tinybert', () => {
      then('uses tinybert model', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: ['brief.md', '--mode', 'plan', '--mech', 'tinybert'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('mech: llmlingua/v2/tinybert');
      });
    });

    when('[t1] invalid --mech value', () => {
      then('exits non-zero with error', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: ['brief.md', '--mech', 'invalidmodel'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('--mech must be');
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
          compressArgs: ['brief.md', '--mode', 'plan', '--ratio', '2'],
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
          compressArgs: ['brief.md', '--ratio', '0'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('--ratio must be');
      });

      then('exits non-zero with error for ratio > 20', () => {
        const result = runInTempGitRepo({
          files: {
            'brief.md': sampleBrief,
          },
          compressArgs: ['brief.md', '--ratio', '25'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('--ratio must be');
      });
    });
  });

  given('[case9] compression effect', () => {
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
          compressArgs: ['seaturtles.md', '--mode', 'apply'],
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
          compressArgs: ['seaturtles.md', '--mode', 'apply'],
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
          compressArgs: ['seaturtles.md', '--mode', 'plan'],
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
});
