#!/usr/bin/env npx tsx

/**
 * .what = compress content via multi-step pipeline
 * .why = enables sequential compression passes with kernel injection at each step
 *
 * each step in the pipeline is an array of mechanisms/modifiers:
 * - mechanisms: 'sitrep', 'telegraphic', 'sitrep-aggressive', etc.
 * - modifiers: 'req-kernels' (injects kernel constraints into prompt)
 *
 * example pipeline: [[req-kernels, sitrep-aggressive], [telegraphic]]
 * - step 1: compress with sitrep-aggressive + kernel constraints
 * - step 2: compress the result with telegraphic
 */

import type { ConceptKernel } from '../../../../../../domain.operations/kernelize/extractKernels';
import { countTokens } from '../../../brief.compress/compress.shared';
import {
  type CompressionResult,
  compressViaBhrain,
  type MechanismOrModifier,
} from '../../../brief.compress/compress.via.bhrain';

/**
 * .what = compress content through a multi-step pipeline
 * .why = sequential passes with kernel injection achieve better retention
 */
export const pressViaPipeline = async (input: {
  content: string;
  brainSlug: string;
  pipeline: MechanismOrModifier[][];
  kernels?: ConceptKernel[];
  force?: boolean;
}): Promise<{
  content: string;
  tokens: { before: number; after: number };
  steps: Array<{
    mechanisms: MechanismOrModifier[];
    tokensBefore: number;
    tokensAfter: number;
    ratio: number;
  }>;
}> => {
  // count tokens before any compression
  const tokensBefore = await countTokens({ text: input.content });

  // handle empty content
  if (tokensBefore === 0) {
    return {
      content: '',
      tokens: { before: 0, after: 0 },
      steps: [],
    };
  }

  // handle empty pipeline (no compression)
  if (input.pipeline.length === 0) {
    return {
      content: input.content,
      tokens: { before: tokensBefore, after: tokensBefore },
      steps: [],
    };
  }

  // extract kernel concept strings for prompt injection
  const kernelStrings = input.kernels?.map((k) => k.concept);

  // run each step sequentially
  let currentContent = input.content;
  const steps: Array<{
    mechanisms: MechanismOrModifier[];
    tokensBefore: number;
    tokensAfter: number;
    ratio: number;
  }> = [];

  for (const stepMechanisms of input.pipeline) {
    // compress with current step
    const result: CompressionResult = await compressViaBhrain({
      content: currentContent,
      brainSlug: input.brainSlug,
      mechanisms: stepMechanisms,
      kernels: kernelStrings,
      force: input.force,
    });

    // track step metrics
    steps.push({
      mechanisms: stepMechanisms,
      tokensBefore: result.tokensBefore,
      tokensAfter: result.tokensAfter,
      ratio: result.ratio,
    });

    // use compressed output for next step
    currentContent = result.compressed;
  }

  // count final tokens
  const tokensAfter = await countTokens({ text: currentContent });

  return {
    content: currentContent,
    tokens: { before: tokensBefore, after: tokensAfter },
    steps,
  };
};
