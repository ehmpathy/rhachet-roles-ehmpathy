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
import type {
  CompressionResult,
  compressViaBhrain,
  MechanismOrModifier,
} from '../../../brief.compress/compress.via.bhrain';

/**
 * .what = compress content through a multi-step pipeline
 * .why = sequential passes with kernel injection achieve better retention
 * .note = the compressor is injected by the caller, so the pipeline's contract is provable
 *   with a deterministic fake; the type-only import keeps the brain module (and its
 *   load-time cache dir) out of this file's import graph
 */
export const pressViaPipeline = async (
  input: {
    content: string;
    brainSlug: string;
    pipeline: MechanismOrModifier[][];
    kernels: ConceptKernel[];
    force: boolean;
  },
  context: { compressor: typeof compressViaBhrain },
): Promise<{
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
  const kernelStrings = input.kernels.map((k) => k.concept);

  // run each step sequentially
  // .note = deliberate mutation: each step threads its output into the next, and appends its metrics
  let currentContent = input.content;
  const steps: Array<{
    mechanisms: MechanismOrModifier[];
    tokensBefore: number;
    tokensAfter: number;
    ratio: number;
  }> = [];

  for (const stepMechanisms of input.pipeline) {
    // compress with current step
    const result: CompressionResult = await context.compressor({
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
