import { exec, spawn } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';

import { genTempDir } from 'test-fns';

export { REPEATABLY_CONFIG_LLM } from '@src/.test/constants';

export const execAsync = promisify(exec);

/**
 * .what = creates a temp directory with rhachet roles linked
 * .why = enables blackbox test of hooks against linked role artifacts
 *
 * .how = uses genTempDir with:
 *   - clone fixture (package.json + .quarantine/)
 *   - symlink node_modules/rhachet-roles-ehmpathy to repo root
 *   - git init + commit
 *   - then runs rhachet roles link
 */
export const genTestDir = async (input: {
  slug: string;
}): Promise<string> => {
  // create temp dir with fixture and symlinks
  const tempDir = genTempDir({
    slug: input.slug,
    clone: './blackbox/.test/fixtures/repo-with-role',
    symlink: [{ at: 'node_modules/rhachet-roles-ehmpathy', to: '.' }],
    git: true,
  });

  // link the mechanic role via rhachet
  await execAsync('npx rhachet roles link --role mechanic', { cwd: tempDir });

  return tempDir;
};

/**
 * .what = invokes a hook (PreToolUse or PostToolUse) via its shell entrypoint
 * .why = enables blackbox acceptance test against hooks as invoked by rhachet
 *
 * .note = invokes the shell entrypoint from the linked .agent/ directory
 *         after `npx rhachet roles link` sets up the symlinks.
 *         this tests the same code path that Claude Code uses.
 */
export const invokeHook = async (input: {
  hookName: string;
  stdin: string;
  cwd: string;
  env?: Record<string, string | undefined>;
  args?: string[];
}): Promise<{ stdout: string; stderr: string; code: number }> => {
  // invoke the hook shell entrypoint from the cwd's .agent/ directory
  const hookPath = path.join(
    input.cwd,
    `.agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/${input.hookName}`,
  );

  return new Promise((resolve, reject) => {
    // the args are the flags the hook registration passes (e.g. `--mode SOFTNUDGE`)
    const proc = spawn('bash', [hookPath, ...(input.args ?? [])], {
      cwd: input.cwd,
      env: {
        ...process.env,
        ...input.env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // write stdin and close
    proc.stdin.write(input.stdin);
    proc.stdin.end();

    // a spawn failure never fires 'close'; reject so it is named, never a silent hang
    proc.on('error', (error) => reject(error));

    proc.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        code: code ?? 1,
      });
    });
  });
};

/**
 * .what = generates PostToolUse stdin JSON for WebFetch
 * .why = matches actual Claude Code PostToolUse hook format
 */
export const genWebfetchStdin = (input: {
  url: string;
  prompt?: string;
  response: string;
}): string =>
  JSON.stringify({
    tool_name: 'WebFetch',
    tool_input: {
      url: input.url,
      prompt: input.prompt ?? 'extract the main content',
    },
    tool_response: input.response,
    tool_use_id: `toolu_${Date.now()}`,
    session_id: `session_${Date.now()}`,
  });
