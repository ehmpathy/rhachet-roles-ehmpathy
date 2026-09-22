import { ConstraintError } from 'helpful-errors';

/**
 * .what = the slice of node-pty's surface this harness calls
 *
 * .why  = a local shape keeps `tsc` honest with no type dependency on a native
 *         module. node-pty ships its typings under `typings/`, not at a path
 *         `tsc` picks up by default, so a hand-written slice of the four
 *         members used here is smaller than the config it would otherwise take.
 *
 * 🔴 .note = node-pty is a DIRECT dependency of this repo, deliberately. it was
 *        reachable before as a transitive optional dep of `rhachet`, via pnpm's
 *        hoist dir — and that reach was an accident: `node_modules/node-pty`
 *        did not exist, `depcheck` flagged the import as undeclared, and the
 *        day `rhachet` dropped it the whole harness would go dark in silence.
 *        ⇒ declared, pinned, and audited via `set.package.install`. the reason
 *        is on record at
 *        `.route/v2026_09_12.package.install/3.reason.for_node-pty.yield.md`.
 */
interface PtyHandle {
  write: (data: string) => void;
  onData: (listener: (chunk: string) => void) => void;
  onExit: (listener: (event: { exitCode: number }) => void) => void;
  kill: (signal?: string) => void;
}

interface PtyModule {
  spawn: (
    file: string,
    args: string[],
    options: {
      name: string;
      cols: number;
      rows: number;
      cwd: string;
      env: Record<string, string>;
    },
  ) => PtyHandle;
}

/**
 * .what = load node-pty, or refuse LOUDLY with the command that fixes it
 * .why  = `rule.require.failfast` (code.test) — an absent test resource is
 *         unacceptable and must fail loud. a skip here would be a failhide:
 *         the tty guards are the load-bearing mechanism of the whole wish, so
 *         a suite that quietly stopped to exercise them would read green while
 *         it proved naught.
 */
const loadPty = (): PtyModule => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('node-pty') as PtyModule;
  } catch (error) {
    throw new ConstraintError(
      'node-pty is absent, so the tty guards cannot be exercised',
      {
        hint: 'rhx set.package.install --package node-pty --at 1.2.0-beta.15 --for dev --reason "pty harness for the actor guards"',
        // .note = `reason`, never `cause` — the error's `cause` slot is typed
        //         as an Error, and what is useful here is the message text.
        reason: error instanceof Error ? error.message : String(error),
      },
    );
  }
};

/**
 * .what = where node-pty actually loaded from
 *
 * 🔴 .why = node resolution walks UP past the repo root, so a copy of node-pty
 *        in an ANCESTOR directory satisfies the require just as well as this
 *        repo's own. ⇒ a harness that merely loads is not a harness that loads
 *        from a dependency this repo declares.
 *
 *        that difference is invisible on a laptop and decides whether ci works,
 *        and it was live: before the direct declaration, the require was
 *        satisfied through pnpm's hoist dir with no `node_modules/node-pty` at
 *        all. `[case14][t2]` asserts the path rather than assumes it, so a
 *        future drop of the dependency reads as a failed test rather than as a
 *        suite that quietly proves the guards on one host.
 */
export const getPtyModulePath = (): string => {
  loadPty(); // refuse loudly first, so an absent module reads as absent
  return require.resolve('node-pty');
};

/**
 * .what = run a command under a REAL pseudo-terminal, so `isatty()` is true on
 *         all three of its streams, and report what it emitted plus its exit
 *
 * .why  = the sponsor's actor guard reads `[[ -t 2 || -t 1 || -t 0 ]]`, and the
 *         `uses` trio reads `[[ -t 0 ]]`. `spawnSync` pipes EVERY stream, so no
 *         spawnSync test can ever reach the accept branch — the suite proxies
 *         it with the `__I_AM_HUMAN` escape, which proves the escape works and
 *         says no more than that about a human at a terminal.
 *
 * .note = a pty merges stdout and stderr onto one stream by construction (that
 *         is what a terminal IS), so this reports ONE `output`. a test that
 *         needs the two streams apart belongs on the spawnSync harness.
 *
 * .note = `timeoutMs` is a plain number rather than an IsoDuration because
 *         `iso-time` is not a dependency here and this is a harness knob, not a
 *         domain value (`rule.forbid.any-time` scopes to domain objects,
 *         contracts, and stored values).
 */
export const spawnInPty = async (args: {
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}): Promise<{ output: string; exitCode: number; timedOut: boolean }> => {
  const pty = loadPty();

  const envClean: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined) envClean[key] = value;

  const child = pty.spawn(args.command, args.args, {
    name: 'xterm-color',
    cols: 200, // wide, so the treestruct output is never wrapped by the pty
    rows: 40,
    cwd: args.cwd,
    env: { ...envClean, ...(args.env ?? {}) },
  });

  const chunks: string[] = [];
  child.onData((chunk) => chunks.push(chunk));

  return await new Promise((report) => {
    // .why = a guard whose branch HANGS is the one outcome worse than an error,
    //        because it reports naught at all. this bound turns a hang into a
    //        red test with a named cause, rather than a jest-wide stall.
    //        ⚠️ no assert below reads ELAPSED time (`rule.forbid.time-assumptions`)
    //        — the bound exists to make a hang observable, and the assert is on
    //        the OUTCOME it produces.
    const bound = setTimeout(() => {
      child.kill('SIGKILL');
      report({ output: chunks.join(''), exitCode: -1, timedOut: true });
    }, args.timeoutMs ?? 10_000);

    child.onExit((event) => {
      clearTimeout(bound);
      report({
        output: chunks.join(''),
        exitCode: event.exitCode,
        timedOut: false,
      });
    });
  });
};
