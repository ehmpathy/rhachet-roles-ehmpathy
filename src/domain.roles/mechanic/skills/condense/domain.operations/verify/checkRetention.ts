#!/usr/bin/env npx tsx

/**
 * .what = check kernel retention after compression
 * .why = measures how many concept kernels survived compression
 *
 * wraps the shared checkKernelRetention from domain.operations/kernelize
 */

import {
  type ConceptKernel,
  checkKernelRetention,
} from '../../../../../../domain.operations/kernelize/extractKernels';

/**
 * .what = check which kernels were retained in compressed content
 * .why = enables quality measurement and guides restoration
 */
export const checkRetention = async (input: {
  kernels: ConceptKernel[];
  content: string;
  brainSlug: string;
}): Promise<{
  retained: ConceptKernel[];
  lost: ConceptKernel[];
  retentionRate: number;
}> => {
  // delegate to shared implementation
  const result = await checkKernelRetention({
    kernels: input.kernels,
    compressed: input.content,
    brainSlug: input.brainSlug,
  });

  return {
    retained: result.retained,
    lost: result.lost,
    retentionRate: result.retentionScore,
  };
};
