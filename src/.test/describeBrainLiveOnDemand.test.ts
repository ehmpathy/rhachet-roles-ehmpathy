import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { describeBrainLiveOnDemand } from './describeBrainLiveOnDemand';

/**
 * .what = fake jest globals that record which describe form registers
 * .why = observe the gate's choice without a nested real describe
 * .note = deliberate mutation: `calls` is an append-only log the asserts read
 */
const genFakeJestGlobals = (input: { env: NodeJS.ProcessEnv }) => {
  const calls: { kind: 'describe' | 'skip' | 'todo'; name: string }[] = [];
  const describeFake = Object.assign(
    (name: string, _fn: () => void) => {
      calls.push({ kind: 'describe', name });
    },
    {
      skip: (name: string, _fn: () => void) => {
        calls.push({ kind: 'skip', name });
      },
    },
  );
  const testFake = {
    todo: (name: string) => {
      calls.push({ kind: 'todo', name });
    },
  };
  return {
    calls,
    context: { env: input.env, describe: describeFake, test: testFake },
  };
};

describe('describeBrainLiveOnDemand', () => {
  given('[case1] an env with no BRAIN_LIVE_SCOPE', () => {
    when('[t0] a live suite is declared', () => {
      then('it is skipped under its own title, beside a todo row that names the flag', () => {
        const fake = genFakeJestGlobals({ env: {} });
        describeBrainLiveOnDemand(
          { name: 'pressViaPipeline (live)', fn: () => {} },
          fake.context,
        );
        expect(fake.calls).toEqual([
          {
            kind: 'todo',
            name: '[gated: live brain] pressViaPipeline (live) — run with BRAIN_LIVE_SCOPE=all',
          },
          { kind: 'skip', name: 'pressViaPipeline (live)' },
        ]);
      });
    });
  });

  given('[case2] an env with BRAIN_LIVE_SCOPE=all', () => {
    when('[t0] a live suite is declared', () => {
      then('it runs as a plain describe, with no todo row', () => {
        const fake = genFakeJestGlobals({ env: { BRAIN_LIVE_SCOPE: 'all' } });
        describeBrainLiveOnDemand(
          { name: 'pressViaPipeline (live)', fn: () => {} },
          fake.context,
        );
        expect(fake.calls).toEqual([
          { kind: 'describe', name: 'pressViaPipeline (live)' },
        ]);
      });
    });
  });

  given('[case3] an env with a typo in BRAIN_LIVE_SCOPE', () => {
    when('[t0] a live suite is declared', () => {
      then('it throws a ConstraintError, and registers no describe, skip, or todo', () => {
        const fake = genFakeJestGlobals({ env: { BRAIN_LIVE_SCOPE: 'true' } });
        const error = getError(() =>
          describeBrainLiveOnDemand(
            { name: 'pressViaPipeline (live)', fn: () => {} },
            fake.context,
          ),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(fake.calls).toEqual([]);
      });
    });
  });
});
