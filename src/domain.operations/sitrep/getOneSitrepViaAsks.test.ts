import { getError, given, then, useThen, when } from 'test-fns';

import { getOneSitrepViaAsks } from './getOneSitrepViaAsks';

/**
 * .what = an ask that answers from a fixed list of replies, one per call, and counts its calls
 * .why  = the brain is injected (dependency injection, not a mock of a module); the reply
 *         list drives the degenerate-then-whole sequence on demand
 */
const genAskFromReplies = (input: {
  replies: Array<{ sitrep: string } | { error: string }>;
}): {
  ask: () => Promise<{ output: { sitrep: string } }>;
  getCalls: () => number;
} => {
  const calls: number[] = [];
  const ask = async (): Promise<{ output: { sitrep: string } }> => {
    const reply = input.replies[calls.length] ?? input.replies.at(-1)!;
    calls.push(calls.length + 1);
    if ('error' in reply) throw new Error(reply.error);
    return { output: { sitrep: reply.sitrep } };
  };
  return { ask, getCalls: () => calls.length };
};

describe('getOneSitrepViaAsks', () => {
  given('[case1] the first ask returns a whole sitrep', () => {
    when('[t0] asked with 4 attempts', () => {
      const brain = genAskFromReplies({
        replies: [{ sitrep: 'a real brief' }],
      });
      const answer = useThen('it resolves', () =>
        getOneSitrepViaAsks({ ask: brain.ask, attempts: 4 }),
      );
      then('it returns that sitrep, after one ask', () => {
        expect(answer.output.sitrep).toEqual('a real brief');
        expect(brain.getCalls()).toEqual(1);
      });
    });
  });

  given(
    '[case2] the brain returns degenerate sitreps, then a whole one',
    () => {
      when('[t0] asked with 4 attempts', () => {
        const brain = genAskFromReplies({
          replies: [
            { sitrep: 'N/A' },
            { sitrep: '' },
            { sitrep: 'a real brief' },
          ],
        });
        const answer = useThen('it resolves', () =>
          getOneSitrepViaAsks({ ask: brain.ask, attempts: 4 }),
        );
        then('the third ask wins', () => {
          expect(answer.output.sitrep).toEqual('a real brief');
          expect(brain.getCalls()).toEqual(3);
        });
      });
    },
  );

  given('[case3] an ask throws once, then returns a whole sitrep', () => {
    when('[t0] asked with 4 attempts', () => {
      const brain = genAskFromReplies({
        replies: [{ error: 'timeout' }, { sitrep: 'a real brief' }],
      });
      const answer = useThen('it resolves', () =>
        getOneSitrepViaAsks({ ask: brain.ask, attempts: 4 }),
      );
      then('the throw spends one attempt, the second ask wins', () => {
        expect(answer.output.sitrep).toEqual('a real brief');
        expect(brain.getCalls()).toEqual(2);
      });
    });
  });

  given('[case4] every ask returns a degenerate sitrep', () => {
    when('[t0] asked with 4 attempts', () => {
      const brain = genAskFromReplies({ replies: [{ sitrep: 'N/A' }] });
      then(
        'it fails loud after exactly 4 asks, and names the last cause',
        async () => {
          const error = await getError(
            getOneSitrepViaAsks({ ask: brain.ask, attempts: 4 }),
          );
          expect(error.message).toContain('no sitrep after every attempt');
          expect(error.message).toContain('degenerate sitrep');
          expect(brain.getCalls()).toEqual(4);
        },
      );
    });
  });

  given('[case5] a count that would never ask', () => {
    when('[t0] asked with 0 attempts', () => {
      const brain = genAskFromReplies({
        replies: [{ sitrep: 'a real brief' }],
      });
      then('it refuses, and never asks', async () => {
        const error = await getError(
          getOneSitrepViaAsks({ ask: brain.ask, attempts: 0 }),
        );
        expect(error.message).toContain('at least one attempt');
        expect(brain.getCalls()).toEqual(0);
      });
    });
  });
});
