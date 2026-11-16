import { spawnSync } from 'child_process';
import { MalfunctionError } from 'helpful-errors';

/**
 * .what = the pids of every live pr-watch daemon under one HOME, by ps
 * .why  = "one daemon per key" is a claim about the process table, so read it there
 * .note = a `$(...)` subshell of a daemon carries the daemon's args; a row whose
 *         parent is itself a daemon row is that subshell, never a second daemon
 */
export const getAllWatchDaemonPids = (input: {
  home: string;
  key?: string;
}): number[] => {
  // a ps that fails would read as zero daemons, which a test could mistake for a pass
  const result = spawnSync('ps', ['-eo', 'pid=,ppid=,args=']);
  if (result.status !== 0)
    throw new MalfunctionError('ps failed; the daemon count is unknown', {
      status: result.status,
      error: result.error?.message ?? null,
      stderr: result.stderr?.toString() ?? '',
    });
  const rows = result.stdout
    .toString()
    .split('\n')
    .filter(
      (line) =>
        line.includes('git.pull.watch.daemon.sh') &&
        line.includes(input.home) &&
        (!input.key || line.includes(input.key)),
    )
    .map((line) => {
      const [pid, ppid] = line.trim().split(/\s+/);
      return { pid: Number(pid), ppid: Number(ppid) };
    });
  const pids = new Set(rows.map((row) => row.pid));
  return rows.filter((row) => !pids.has(row.ppid)).map((row) => row.pid);
};
