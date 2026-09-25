/**
 * .what = counts execs by tool name, from the shim's flat tally lines
 * .why  = the per-tool count is what every fork-budget assertion reads, so it
 *         is a named operation rather than an inline fold repeated per case.
 *
 * .note = a reduce, never an in-place accumulate — a `const` mutated in a loop is the
 *         exact shape `rule.require.immutable-vars` forbids.
 */
export const asTallyByTool = (input: {
  execs: string[];
}): Record<string, number> =>
  input.execs.reduce<Record<string, number>>(
    (tally, exec) => ({ ...tally, [exec]: (tally[exec] ?? 0) + 1 }),
    {},
  );
