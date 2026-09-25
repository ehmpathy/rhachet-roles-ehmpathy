import { spawnSync } from 'child_process';

/**
 * .what = run a hook against a payload, in a supplied cwd
 * .why = the returned `cwd` is what lets a second call reuse the FIRST call's
 *        nudge state. that is the whole HARDNUDGE protocol, so it is returned
 *        rather than held in a closure — a shared closure would leak state
 *        between cases and make a retry test pass for the wrong reason.
 *
 * .note = shared by the two hook suites, which differ only in the hook path.
 *         `bash <path>` matches how the hook is invoked in production after the
 *         wrapper-drop (F7), so the harness exercises the shipped invocation
 *         rather than a second one only tests use.
 */
export const runHookIn = (input: {
  hookPath: string;
  json: unknown;
  cwd: string;
}): { stdout: string; stderr: string; exitCode: number; cwd: string } => {
  const result = spawnSync('bash', [input.hookPath], {
    encoding: 'utf-8',
    input: JSON.stringify(input.json),
    cwd: input.cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
    cwd: input.cwd,
  };
};
