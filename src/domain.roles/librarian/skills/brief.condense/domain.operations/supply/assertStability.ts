#!/usr/bin/env npx tsx

/**
 * .what = assert that kernel extraction stability meets threshold
 * .why = fail fast on ambiguous briefs before compression
 *
 * if meanJaccard < 0.7, the brief is too ambiguous to compress safely
 */

import { BadRequestError } from 'helpful-errors';

import type { ConsensusStability } from '../../../../../../domain.operations/kernelize/extractKernels';

const DEFAULT_STABILITY_THRESHOLD = 0.7;

/**
 * .what = assert kernel stability above threshold
 * .why = briefs that produce inconsistent kernels cannot be compressed reliably
 */
export const assertStability = (input: {
  stability: ConsensusStability;
  /** override default threshold of 0.7 (useful for tests) */
  threshold?: number;
}): void => {
  const threshold = input.threshold ?? DEFAULT_STABILITY_THRESHOLD;

  // fail if meanJaccard below threshold
  if (input.stability.meanJaccard < threshold) {
    throw new BadRequestError(
      `kernelization unstable: meanJaccard=${input.stability.meanJaccard.toFixed(2)} (required: >=${threshold})`,
      {
        stability: input.stability,
        threshold,
      },
    );
  }
};
