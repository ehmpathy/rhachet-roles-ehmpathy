#!/usr/bin/env npx tsx

/**
 * .what = restore lost kernels by recompression with supplements
 * .why = recovers semantic content without mechanical append
 *
 * critical: NEVER append kernels mechanically (no "## core concepts" section)
 * instead, recompress the content with lost kernels as supplements,
 * so the brain weaves them naturally into the prose
 */

import type { ConceptKernel } from '../../../../../../domain.operations/kernelize/extractKernels';
import { compressViaBhrain } from '../../../brief.compress/compress.via.bhrain';

/**
 * .what = restore lost kernels via brain-driven recompression
 * .why = ensures lost concepts are woven into prose, not mechanically appended
 */
export const restoreKernels = async (input: {
  content: string;
  lostKernels: ConceptKernel[];
  brainSlug: string;
}): Promise<{
  content: string;
  restored: ConceptKernel[];
}> => {
  // handle empty lost kernels
  if (input.lostKernels.length === 0) {
    return {
      content: input.content,
      restored: [],
    };
  }

  // format lost kernels as supplement context
  const kernelSupplements = input.lostKernels.map(
    (k) => `RESTORE: ${k.concept} (${k.category})`,
  );

  // recompress with lost kernels as supplements
  // the sitrep-taskaware methodology naturally weaves in supplement context
  const result = await compressViaBhrain({
    content: input.content,
    brainSlug: input.brainSlug,
    mechanisms: ['req-kernels', 'sitrep-taskaware'],
    supplements: kernelSupplements,
    kernels: input.lostKernels.map((k) => k.concept),
    force: true, // bypass cache since we restore now
  });

  return {
    content: result.compressed,
    restored: input.lostKernels,
  };
};
