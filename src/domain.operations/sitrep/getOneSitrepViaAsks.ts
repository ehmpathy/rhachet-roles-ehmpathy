import { MalfunctionError } from 'helpful-errors';

import { isSitrepDegenerate } from './isSitrepDegenerate';

/**
 * .what = ask a brain for a sitrep until one carries a brief, up to a declared count
 * .why  = a brain returns a placeholder sitrep (see isSitrepDegenerate) on about half of
 *         its asks on deepseek/flash; one ask alone fails one run in two. the count is an
 *         input, so the worst case (attempts × the caller's per-ask timeout) reads at the
 *         call site
 * .note = an ask that throws (a timeout, a network fault) spends one attempt too; once
 *         every attempt is spent, the last cause surfaces
 */
export const getOneSitrepViaAsks = async <
  TAnswer extends { output: { sitrep: string } },
>(input: {
  ask: () => Promise<TAnswer>;
  attempts: number;
}): Promise<TAnswer> => {
  // refuse a count that would never ask
  if (input.attempts < 1)
    throw new MalfunctionError('sitrep asks need at least one attempt', {
      attempts: input.attempts,
    });

  // ask once; a degenerate sitrep or a throw spends the attempt
  const askOnce = async (attempt: number): Promise<TAnswer> => {
    const cause = await input.ask().then(
      (answer) =>
        isSitrepDegenerate({ sitrep: answer.output.sitrep })
          ? {
              answer: null,
              reason: `degenerate sitrep: ${JSON.stringify(answer.output.sitrep)}`,
            }
          : { answer, reason: null },
      (error: unknown) => ({
        answer: null,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );
    if (cause.answer) return cause.answer;

    // every attempt spent: surface the last cause, with the count
    if (attempt >= input.attempts)
      throw new MalfunctionError('no sitrep after every attempt', {
        attempts: input.attempts,
        causeLast: cause.reason,
      });
    return askOnce(attempt + 1);
  };
  return askOnce(1);
};
