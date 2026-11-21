import { spawnSync } from 'child_process';
import * as path from 'path';

const SKILL_PATH = path.join(__dirname, '..', '..', 'cicd.deflake.sh');

/**
 * .what = run the cicd.deflake skill with subcommand
 */
export const runSkill = (options: {
  cwd: string;
  subcommand?: string;
  args?: string[];
  env?: Record<string, string>;
}): { stdout: string; stderr: string; status: number | null } => {
  const allArgs = options.subcommand
    ? [options.subcommand, ...(options.args ?? [])]
    : (options.args ?? []);

  const result = spawnSync('bash', [SKILL_PATH, ...allArgs], {
    cwd: options.cwd,
    encoding: 'utf-8',
    env: {
      ...process.env,
      SKIP_ROUTE_BIND: '1', // skip route.bind.set (no rhachet in temp dir)
      ...options.env,
    },
  });

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
};

export { SKILL_PATH };
