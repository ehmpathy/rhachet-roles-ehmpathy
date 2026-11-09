import {
  BRAIN_LIVE_SCOPE_FLAG,
  isBrainLiveScopeAll,
} from '@src/.test/isBrainLiveScopeAll';

/**
 * .what = a describe that runs only when `BRAIN_LIVE_SCOPE=all`; else it is skipped, by name
 * .why = a live-brain test spends real money and flakes on model variance, so it is off by
 *   default, on cicd and on a crew box alike, and runs on demand via the named flag
 * .note = never a silent skip: a todo row beside the skipped describe names the flag that runs
 *   it, so jest's verbose report shows each gated suite and how to run it
 * .note = jest runs a skipped describe's body to register its tests, so a gated body must do no
 *   i/o and read no credential at collection: defer each into a `beforeAll` or a `useBeforeAll`
 * .note = `context` defaults to jest's own globals; a test passes fakes to observe what registers
 */
export const describeBrainLiveOnDemand = (
  input: { name: string; fn: () => void },
  context: {
    env: NodeJS.ProcessEnv;
    describe: {
      (name: string, fn: () => void): void;
      skip: (name: string, fn: () => void) => void;
    };
    test: { todo: (name: string) => void };
  } = { env: process.env, describe, test },
): void => {
  // run in full when targeted
  if (isBrainLiveScopeAll({ env: context.env }))
    return context.describe(input.name, input.fn);

  // skip under its own title, and name the gate in a todo row
  context.test.todo(
    `[gated: live brain] ${input.name} — run with ${BRAIN_LIVE_SCOPE_FLAG}=all`,
  );
  return context.describe.skip(input.name, input.fn);
};
