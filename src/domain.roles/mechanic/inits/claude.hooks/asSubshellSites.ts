/**
 * .what = the command-substitution sites in a bash source, one per occurrence
 * .why = a PATH shim counts EXECS. it structurally cannot see a `$( )` that
 *        runs only builtins or a shell function — that forks a subshell and
 *        execs no tool, so the tally stays flat while the real process count
 *        grows. acceptance #1 bounds "processes", never "execs", so the exec
 *        clamp alone verifies the bar only up to the exec floor.
 *
 *        ⇒ this is the STATIC half. it reads the hook source rather than a run, so
 *          it sees the forks the shim is blind to.
 *
 * .note = `$((` is ARITHMETIC expansion and forks naught, so it is excluded.
 *         to label a non-fork a fork is the same class of error as the miss
 *         this leaf exists to repair.
 * .note = a whole-line comment is stripped, since a `$( )` a human wrote in a
 *         `.note` forks no subshell either.
 *
 * ⚠️ .bound = a comment that follows code on the same line is NOT stripped, so
 *             a `$( )` written after that `#` is still tallied. that errs
 *             toward an over-count, which fails loud rather than silently
 *             admits a fork — the safe direction for a guard.
 */
export const asSubshellSites = (input: { source: string }): string[] =>
  input.source
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .flatMap((line) => line.match(/\$\((?!\()/g) ?? []);
