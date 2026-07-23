import { spawnSync } from 'child_process';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = integration tests for pretooluse.forbid-shouted-readme.sh
 * .why = verify the hook blocks repo-local README.md across Read/Write/Edit,
 *        redirects to readme.md, and allows node_modules/.git and lowercase readme.md.
 *        Bash is intentionally uncovered so a legacy README.md stays migratable
 *        (rhx mvsafe/rmsafe, git mv, cat) — see the hook .scope + rule brief.
 */
describe('pretooluse.forbid-shouted-readme.sh', () => {
  const scriptPath = path.join(
    __dirname,
    'pretooluse.forbid-shouted-readme.sh',
  );

  /**
   * .what = run the hook with a Write tool input
   */
  const runHookWrite = (input: {
    filePath: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const stdinJson = JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: input.filePath, content: 'test content' },
    });

    const result = spawnSync('bash', [scriptPath], {
      encoding: 'utf-8',
      input: stdinJson,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = run the hook with an Edit tool input
   */
  const runHookEdit = (input: {
    filePath: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const stdinJson = JSON.stringify({
      tool_name: 'Edit',
      tool_input: {
        file_path: input.filePath,
        old_string: 'old',
        new_string: 'new',
      },
    });

    const result = spawnSync('bash', [scriptPath], {
      encoding: 'utf-8',
      input: stdinJson,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = run the hook with a Read tool input
   */
  const runHookRead = (input: {
    filePath: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const stdinJson = JSON.stringify({
      tool_name: 'Read',
      tool_input: { file_path: input.filePath },
    });

    const result = spawnSync('bash', [scriptPath], {
      encoding: 'utf-8',
      input: stdinJson,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  // --- Write tool tests ---

  given('[case1] Write tool operations', () => {
    when('[t0] Write to repo-local README.md', () => {
      then('Write to README.md (root) is blocked', () => {
        const result = runHookWrite({ filePath: 'README.md' });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
        expect(result.stderr).toContain('readme.md');
      });

      then('Write to docs/README.md (nested) is blocked', () => {
        const result = runHookWrite({ filePath: 'docs/README.md' });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
        expect(result.stderr).toContain('docs/readme.md');
      });

      then('Write to absolute /repo/README.md is blocked', () => {
        const result = runHookWrite({ filePath: '/home/user/repo/README.md' });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });
    });

    when('[t1] Write to allowed paths', () => {
      then('Write to readme.md is allowed', () => {
        const result = runHookWrite({ filePath: 'readme.md' });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
        expect(result.stderr).toBe('');
      });

      then('Write to src/foo.ts is allowed', () => {
        const result = runHookWrite({ filePath: 'src/foo.ts' });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('Write to node_modules/foo/README.md is allowed', () => {
        const result = runHookWrite({ filePath: 'node_modules/foo/README.md' });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  // --- Edit tool tests ---

  given('[case2] Edit tool operations', () => {
    when('[t0] Edit repo-local README.md', () => {
      then('Edit to README.md is blocked', () => {
        const result = runHookEdit({ filePath: 'README.md' });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });
    });

    when('[t1] Edit allowed paths', () => {
      then('Edit to readme.md is allowed', () => {
        const result = runHookEdit({ filePath: 'readme.md' });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('Edit to node_modules/pkg/README.md is allowed', () => {
        const result = runHookEdit({ filePath: 'node_modules/pkg/README.md' });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  // --- Read tool tests ---

  given('[case3] Read tool operations', () => {
    when('[t0] Read repo-local README.md', () => {
      then('Read from README.md is blocked', () => {
        const result = runHookRead({ filePath: 'README.md' });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
        expect(result.stderr).toContain('readme.md');
      });

      then('Read from packages/x/README.md is blocked', () => {
        const result = runHookRead({ filePath: 'packages/x/README.md' });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });
    });

    when('[t1] Read allowed paths', () => {
      then('Read from readme.md is allowed', () => {
        const result = runHookRead({ filePath: 'readme.md' });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('Read from node_modules/chalk/README.md is allowed', () => {
        const result = runHookRead({
          filePath: 'node_modules/chalk/README.md',
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('Read from .git/README.md is allowed', () => {
        const result = runHookRead({ filePath: '.git/README.md' });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then(
        'Read from ./node_modules/foo/README.md is allowed (./ prefix)',
        () => {
          const result = runHookRead({
            filePath: './node_modules/foo/README.md',
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toBe('');
        },
      );

      then('Read from ./.git/x/README.md is allowed (./ prefix)', () => {
        const result = runHookRead({ filePath: './.git/x/README.md' });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  // --- Bash passthrough (migration path) ---
  // .why = Bash is intentionally uncovered so a legacy README.md stays migratable:
  //        the rename/remove tools (rhx mvsafe/rmsafe, git mv) and content inspect
  //        (cat) are Bash commands whose strings name README.md. a Bash scan would
  //        block the very cleanup the wish wants, and over-block remote refs + prose.

  given('[case4] Bash is uncovered so README.md stays migratable', () => {
    /**
     * .what = run the hook with a Bash tool input
     */
    const runHookBash = (input: {
      command: string;
    }): { stdout: string; stderr: string; exitCode: number } => {
      const stdinJson = JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: input.command },
      });
      const result = spawnSync('bash', [scriptPath], {
        encoding: 'utf-8',
        input: stdinJson,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.status ?? 1,
      };
    };

    when('[t0] a Bash command that migrates a legacy README.md', () => {
      then('rhx mvsafe README.md -> readme.md is allowed', () => {
        const result = runHookBash({
          command: 'rhx mvsafe --from README.md --into readme.md',
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('rhx rmsafe README.md is allowed', () => {
        const result = runHookBash({
          command: 'rhx rmsafe --path README.md',
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('cat README.md (inspect for migration) is allowed', () => {
        const result = runHookBash({ command: 'cat README.md' });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t1] a Bash command that references a remote-repo README.md', () => {
      then('git.repo.get on another repo README.md is allowed', () => {
        const result = runHookBash({
          command:
            "rhx git.repo.get lines --in ehmpathy/domain-objects --paths 'README.md'",
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('prose mention of README.md is allowed', () => {
        const result = runHookBash({
          command: 'echo "remember to update README.md before release"',
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t2] a raw Bash write to README.md (accepted residual gap)', () => {
      // .why = tool-only is deliberate. the hook nudges the habitual case (a clone
      //        reflexively reaches for README.md via Read/Write/Edit). a raw Bash
      //        write bypasses it — and that is accepted: a guardrail is not an
      //        airtight boundary, and a Bash scan would over-block remote refs +
      //        migration + prose (the reason it was removed). this test documents
      //        the gap so it reads as a decision, not an oversight.
      then(
        'echo x > README.md is NOT blocked (accepted, documented gap)',
        () => {
          const result = runHookBash({ command: 'echo "x" > README.md' });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toBe('');
        },
      );
    });
  });

  // --- Path edge cases ---

  given('[case5] path edge cases', () => {
    when('[t0] names that are not exactly README.md', () => {
      then('Write to README.md.bak is allowed (not README.md)', () => {
        const result = runHookWrite({ filePath: 'README.md.bak' });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('Write to MYREADME.md is allowed (not README.md)', () => {
        const result = runHookWrite({ filePath: 'MYREADME.md' });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('Write to Readme.md is allowed (not exact README.md)', () => {
        const result = runHookWrite({ filePath: 'Readme.md' });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  // --- Error and passthrough cases ---

  given('[case6] error and passthrough cases', () => {
    when('[t0] empty stdin', () => {
      then('empty stdin exits 2 with a loud diagnostic on both streams', () => {
        const result = spawnSync('bash', [scriptPath], {
          encoding: 'utf-8',
          input: '',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(result.status).toBe(2);
        // fail-loud: the diagnostic must reach both streams (skill-output-streams)
        expect(result.stderr).toContain('received no input');
        expect(result.stdout).toContain('received no input');
      });
    });

    when('[t1] other tools', () => {
      then('Agent tool passthrough (exit 0)', () => {
        const stdinJson = JSON.stringify({
          tool_name: 'Agent',
          tool_input: { prompt: 'README.md' },
        });
        const result = spawnSync('bash', [scriptPath], {
          encoding: 'utf-8',
          input: stdinJson,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(result.status).toBe(0);
      });
    });

    when('[t2] malformed json (fail-open contract)', () => {
      then('malformed json exits 0 with a loud warn on both streams', () => {
        const result = spawnSync('bash', [scriptPath], {
          encoding: 'utf-8',
          input: '{ not valid json',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(result.status).toBe(0);
        // fail-open but loud: warn the caller on both streams, never silently swallow
        expect(result.stderr).toContain('could not parse stdin as JSON');
        expect(result.stdout).toContain('could not parse stdin as JSON');
      });
    });
  });

  // --- Guidance message verification ---

  given('[case7] guidance message verification', () => {
    when('[t0] Write to README.md', () => {
      const result = runHookWrite({ filePath: 'README.md' });

      then('stderr contains BLOCKED', () => {
        expect(result.stderr).toContain('BLOCKED');
      });

      then('stderr contains the readme.md redirect', () => {
        expect(result.stderr).toContain('use: readme.md');
      });

      then('stderr cites the rule', () => {
        expect(result.stderr).toContain('rule.forbid.shouted-readme');
      });

      then('stdout also carries the block message (both streams)', () => {
        expect(result.stdout).toContain('BLOCKED');
      });
    });
  });

  // --- Block message snapshot ---

  given('[case8] block message snapshot', () => {
    when('[t0] Write to root README.md', () => {
      then('Write block message matches snapshot', () => {
        const result = runHookWrite({ filePath: 'README.md' });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
        expect(result.stderr).toContain('use: readme.md');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] Read from nested README.md', () => {
      then('Read block message matches snapshot', () => {
        const result = runHookRead({ filePath: 'docs/README.md' });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
        expect(result.stderr).toContain('use: docs/readme.md');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] Read from root README.md', () => {
      then('Read block message matches snapshot', () => {
        const result = runHookRead({ filePath: 'README.md' });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
        expect(result.stderr).toContain('use: readme.md');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t3] Write to nested README.md', () => {
      then('Write block message matches snapshot', () => {
        const result = runHookWrite({ filePath: 'packages/x/README.md' });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
        expect(result.stderr).toContain('use: packages/x/readme.md');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t4] Edit to nested README.md', () => {
      then('Edit block message matches snapshot', () => {
        const result = runHookEdit({ filePath: 'docs/README.md' });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
        expect(result.stderr).toContain('use: docs/readme.md');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t5] Edit to root README.md', () => {
      then('Edit block message matches snapshot', () => {
        const result = runHookEdit({ filePath: 'README.md' });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
        expect(result.stderr).toContain('use: readme.md');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });
});
