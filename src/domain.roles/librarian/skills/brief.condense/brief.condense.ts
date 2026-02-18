#!/usr/bin/env npx tsx

/**
 * .what = condense briefs via supply → press → verify pipeline with self-grade
 * .why = atomic operation that compresses AND measures quality via kernel retention
 *
 * pipeline stages:
 * - supply: extract kernels for measurement (always, for self-grade)
 * - press: apply compression steps (multi-step, multi-brief pipelines)
 * - verify: check kernel retention, optionally restore lost kernels
 *
 * usage:
 *   brief.condense.ts --from path/to/brief.md --json
 *   brief.condense.ts --from path/to/brief.md --onPress '[[req-kernels, sitrep-aggressive], [telegraphic]]'
 *   brief.condense.ts --from path/to/brief.md --onVerify restore
 *   brief.condense.ts --from path/to/brief.md --attempts 5
 */

import * as fs from 'fs/promises';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import * as path from 'path';
import { parseArgs } from 'util';

import {
  type ConceptKernel,
  type ConsensusStability,
  extractKernelsWithConsensus,
} from '../../../../domain.operations/kernelize/extractKernels';
import { countTokens } from '../brief.compress/compress.shared';
import type { MechanismOrModifier } from '../brief.compress/compress.via.bhrain';
import { pressViaPipeline } from './domain.operations/press/pressViaPipeline';
import { assertStability } from './domain.operations/supply/assertStability';
import { checkRetention } from './domain.operations/verify/checkRetention';
import { degerund } from './domain.operations/verify/degerund';
import { restoreKernels } from './domain.operations/verify/restoreKernels';

/**
 * .what = default press pipeline (GOOD density 2-3x compression)
 * .why = [[telegraphic]] achieves 3.3x compression with kern.σ=0.33
 *        validated via perfevals 2026-02-17
 */
const DEFAULT_PIPELINE: MechanismOrModifier[][] = [['telegraphic']];

/**
 * .what = default brain for compression
 * .why = grok/3-mini is fast and cheap for iteration
 */
const DEFAULT_BRAIN_SLUG = 'xai/grok/3-mini';

/**
 * .what = condense a single file
 * .why = orchestrates supply → press → verify with N attempts for variance measurement
 */
export const condenseFile = async (input: {
  content: string;
  brainSlug: string;
  pipeline: MechanismOrModifier[][];
  onVerify: 'restore' | null;
  attempts: number;
  force?: boolean;
  /** consensus runs for kernel extraction stability (default: 3) */
  consensusRuns?: number;
  /** stability threshold for meanJaccard (default: 0.7) */
  stabilityThreshold?: number;
}): Promise<{
  compressed: string;
  tokens: { before: number; after: number };
  kernels: {
    before: number;
    after: number;
    delta: number;
    lost: ConceptKernel[];
    retained: ConceptKernel[];
  };
  density: { before: number; after: number; delta: number };
  stability: ConsensusStability;
  variance: { densityσ: number; kernelσ: number } | null;
  attempts: number;
}> => {
  // count tokens before any compression
  const tokensBefore = await countTokens({ text: input.content });

  // handle empty content
  if (tokensBefore === 0) {
    throw new BadRequestError('empty content', { tokensBefore });
  }

  // supply: extract kernels with consensus (for self-grade)
  const consensusRuns = input.consensusRuns ?? 3;
  const stabilityThreshold = input.stabilityThreshold ?? 0.7;

  const kernelResult = await extractKernelsWithConsensus({
    content: input.content,
    brainSlug: input.brainSlug,
    runs: consensusRuns,
    threshold: 0.5,
    force: input.force,
  });

  // fail fast if kernelization is unstable
  assertStability({
    stability: kernelResult.consensus.stability,
    threshold: stabilityThreshold,
  });

  // fail fast if no kernels extracted
  if (kernelResult.kernels.length === 0) {
    throw new BadRequestError('no kernels extracted', {
      rationale: kernelResult.rationale,
    });
  }

  // convert ConsensusKernel to ConceptKernel (strip variants and coverage)
  const sourceKernels: ConceptKernel[] = kernelResult.kernels.map((k) => ({
    id: k.id,
    concept: k.concept,
    category: k.category,
  }));

  // run N attempts for variance measurement
  const attemptResults: Array<{
    compressed: string;
    tokensAfter: number;
    kernelsRetained: number;
  }> = [];

  for (let i = 0; i < input.attempts; i++) {
    // press: apply compression pipeline
    const pressResult = await pressViaPipeline({
      content: input.content,
      brainSlug: input.brainSlug,
      pipeline: input.pipeline,
      kernels: sourceKernels,
      force: input.force || i > 0, // force for subsequent attempts to bypass cache
    });

    // verify: check kernel retention
    const retentionResult = await checkRetention({
      kernels: sourceKernels,
      content: pressResult.content,
      brainSlug: input.brainSlug,
    });

    attemptResults.push({
      compressed: pressResult.content,
      tokensAfter: pressResult.tokens.after,
      kernelsRetained: retentionResult.retained.length,
    });
  }

  // use the first attempt as the primary result
  const primaryAttempt = attemptResults[0];
  if (!primaryAttempt) {
    throw new UnexpectedCodePathError('no attempts completed', { input });
  }

  // compute variance if multiple attempts
  let variance: { densityσ: number; kernelσ: number } | null = null;
  if (attemptResults.length > 1) {
    // density variance (chars per kernel)
    const densities = attemptResults.map((a) => {
      const charsBefore = input.content.length;
      const charsAfter = a.compressed.length;
      const kernelsBefore = sourceKernels.length;
      const kernelsAfter = a.kernelsRetained;
      const densityBefore = kernelsBefore > 0 ? charsBefore / kernelsBefore : 0;
      const densityAfter = kernelsAfter > 0 ? charsAfter / kernelsAfter : 0;
      return densityAfter > 0 ? densityBefore / densityAfter : 0;
    });
    const densityMean = densities.reduce((a, b) => a + b, 0) / densities.length;
    const densityVariance =
      densities.reduce((sum, d) => sum + (d - densityMean) ** 2, 0) /
      densities.length;
    const densityσ = Math.sqrt(densityVariance);

    // kernel variance
    const kernelCounts = attemptResults.map((a) => a.kernelsRetained);
    const kernelMean =
      kernelCounts.reduce((a, b) => a + b, 0) / kernelCounts.length;
    const kernelVariance =
      kernelCounts.reduce((sum, k) => sum + (k - kernelMean) ** 2, 0) /
      kernelCounts.length;
    const kernelσ = Math.sqrt(kernelVariance);

    variance = {
      densityσ: Math.round(densityσ * 100) / 100,
      kernelσ: Math.round(kernelσ * 100) / 100,
    };
  }

  // verify retention on primary result
  const retentionResult = await checkRetention({
    kernels: sourceKernels,
    content: primaryAttempt.compressed,
    brainSlug: input.brainSlug,
  });

  // restore lost kernels if requested
  let finalCompressed = primaryAttempt.compressed;
  let finalRetained = retentionResult.retained;
  let finalLost = retentionResult.lost;

  if (input.onVerify === 'restore' && retentionResult.lost.length > 0) {
    const restoreResult = await restoreKernels({
      content: primaryAttempt.compressed,
      lostKernels: retentionResult.lost,
      brainSlug: input.brainSlug,
    });
    finalCompressed = restoreResult.content;

    // re-check retention after restore
    const postRestoreRetention = await checkRetention({
      kernels: sourceKernels,
      content: finalCompressed,
      brainSlug: input.brainSlug,
    });
    finalRetained = postRestoreRetention.retained;
    finalLost = postRestoreRetention.lost;
  }

  // degerund: always run to remove gerunds from compressed content
  const degerundResult = await degerund({
    content: finalCompressed,
    brainSlug: input.brainSlug,
  });
  finalCompressed = degerundResult.content;

  // count final tokens
  const tokensAfter = await countTokens({ text: finalCompressed });

  // compute density metrics
  const charsBefore = input.content.length;
  const charsAfter = finalCompressed.length;
  const kernelsBefore = sourceKernels.length;
  const kernelsAfter = finalRetained.length;

  const densityBefore = kernelsBefore > 0 ? charsBefore / kernelsBefore : 0;
  const densityAfter = kernelsAfter > 0 ? charsAfter / kernelsAfter : 0;
  const densityDelta =
    densityBefore > 0
      ? Math.round(((densityBefore - densityAfter) / densityBefore) * 100) / 10
      : 0;

  return {
    compressed: finalCompressed,
    tokens: { before: tokensBefore, after: tokensAfter },
    kernels: {
      before: kernelsBefore,
      after: kernelsAfter,
      delta: kernelsAfter - kernelsBefore,
      lost: finalLost,
      retained: finalRetained,
    },
    density: {
      before: Math.round(densityBefore),
      after: Math.round(densityAfter),
      delta: densityDelta,
    },
    stability: kernelResult.consensus.stability,
    variance,
    attempts: input.attempts,
  };
};

/**
 * .what = parse and validate onPress pipeline spec
 * .why = ensure valid JSON array of mechanism arrays
 */
export const parsePipelineSpec = (spec: string): MechanismOrModifier[][] => {
  // parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(spec);
  } catch {
    throw new BadRequestError('invalid onPress spec: malformed JSON', {
      spec,
    });
  }

  // validate structure: array of arrays
  if (!Array.isArray(parsed)) {
    throw new BadRequestError(
      'invalid onPress spec: must be an array of step arrays',
      { spec, parsed },
    );
  }

  // validate non-empty
  if (parsed.length === 0) {
    throw new BadRequestError(
      'invalid onPress spec: pipeline cannot be empty',
      { spec },
    );
  }

  // validate each step is an array of strings
  const validMechanisms = new Set<string>([
    'sitrep',
    'telegraphic',
    'sitrep-aggressive',
    'sitrep-taskaware',
    'sitrep-iterative',
    'sitrep-aggro-aware',
    'kernelize',
    'req-kernels',
  ]);

  for (let i = 0; i < parsed.length; i++) {
    const step = parsed[i];
    if (!Array.isArray(step)) {
      throw new BadRequestError(
        `invalid onPress spec: step ${i} is not an array`,
        { spec, step },
      );
    }
    for (const element of step) {
      if (typeof element !== 'string') {
        throw new BadRequestError(
          `invalid onPress spec: step ${i} contains non-string element`,
          { spec, element },
        );
      }
      if (!validMechanisms.has(element)) {
        throw new BadRequestError(`unknown brief: ${element}`, {
          spec,
          element,
          validMechanisms: [...validMechanisms],
        });
      }
    }
  }

  return parsed as MechanismOrModifier[][];
};

/**
 * .what = parse cli args only when run directly
 * .why = avoid conflicts when module is imported by tests
 */
const getCliValues = () => {
  const { values } = parseArgs({
    options: {
      from: { type: 'string' },
      into: { type: 'string' },
      onSupply: { type: 'string', default: 'kernelize' },
      onPress: { type: 'string' },
      onVerify: { type: 'string' },
      attempts: { type: 'string', default: '3' },
      mode: { type: 'string', default: 'apply' },
      brain: { type: 'string' },
      json: { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
    },
  });
  return values;
};

/**
 * .what = main entrypoint for condense cli
 * .why = orchestrates file read, condense, and output
 */
const main = async (): Promise<void> => {
  const values = getCliValues();

  // require --from
  if (!values.from) {
    console.error(
      JSON.stringify({
        error: 'absent input',
        message: '--from is required',
      }),
    );
    process.exit(1);
  }

  // validate --mode
  if (values.mode !== 'plan' && values.mode !== 'apply') {
    console.error(
      JSON.stringify({
        error: 'invalid mode',
        message: `--mode must be 'plan' or 'apply' (got '${values.mode}')`,
      }),
    );
    process.exit(1);
  }

  // validate --onVerify
  const onVerify = values.onVerify === 'restore' ? 'restore' : null;

  // parse --onPress or use default
  const pipeline = values.onPress
    ? parsePipelineSpec(values.onPress)
    : DEFAULT_PIPELINE;

  // parse --attempts
  const attempts = parseInt(values.attempts ?? '3', 10);
  if (isNaN(attempts) || attempts < 1) {
    console.error(
      JSON.stringify({
        error: 'invalid attempts',
        message: `--attempts must be a positive number (got '${values.attempts}')`,
      }),
    );
    process.exit(1);
  }

  // resolve brain
  const brainSlug = values.brain ?? DEFAULT_BRAIN_SLUG;

  // read input file
  const fromPath = values.from;
  const content = await fs.readFile(fromPath, 'utf-8');

  // determine output path
  const intoPath = values.into ?? `${fromPath}.min`;

  try {
    // condense
    const result = await condenseFile({
      content,
      brainSlug,
      pipeline,
      onVerify,
      attempts,
      force: values.force,
    });

    // emit output in plan or apply mode
    if (values.mode === 'apply') {
      // write compressed file
      await fs.mkdir(path.dirname(intoPath), { recursive: true });
      await fs.writeFile(intoPath, result.compressed, 'utf-8');

      // write .meta file for observability
      const metaPath = `${intoPath}.meta`;
      const tokensDeltaQuant = result.tokens.after - result.tokens.before;
      const tokensDeltaRatio =
        result.tokens.before > 0
          ? Math.round((result.tokens.before / result.tokens.after) * 10) / 10
          : 0;
      const meta = {
        from: fromPath,
        into: intoPath,
        pipeline: {
          supply: 'kernelize',
          press: pipeline,
          verify: onVerify ? [onVerify, 'degerund'] : ['degerund'],
        },
        tokens: {
          ...result.tokens,
          delta: {
            quant: tokensDeltaQuant,
            ratio: `${tokensDeltaRatio}x`,
          },
        },
        kernels: {
          before: result.kernels.before,
          after: result.kernels.after,
          delta: result.kernels.delta,
        },
        density: result.density,
        stability: result.stability,
        variance: result.variance,
        attempts: result.attempts,
      };
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    }

    // format output
    if (values.json) {
      const output = {
        from: fromPath,
        into: intoPath,
        mode: values.mode,
        tokens: result.tokens,
        kernels: {
          before: result.kernels.before,
          after: result.kernels.after,
          delta: result.kernels.delta,
        },
        density: result.density,
        stability: {
          meanJaccard: result.stability.meanJaccard,
        },
        variance: result.variance,
        attempts: result.attempts,
      };
      console.log(JSON.stringify(output));
    } else {
      // turtle vibes tree output
      const pipelineStr = `sup:[kernelize], ${JSON.stringify(pipeline)}`;
      const qualityStatus =
        (result.variance?.densityσ ?? 0) < 3.0 ? 'stable' : 'unstable';

      console.log(
        `🐢 ${values.mode === 'plan' ? 'lets see...' : 'shell yeah!'}`,
      );
      console.log('');
      console.log('🐚 condense');
      console.log(`   ├─ from: ${fromPath}`);
      console.log(`   ├─ into: ${intoPath}`);
      console.log(`   ├─ pipeline: ${pipelineStr}`);
      console.log(`   ├─ attempts: ${result.attempts}`);
      console.log('   ├─ result');
      console.log(
        `   │  ├─ dens.Δ: ${result.density.delta > 0 ? '+' : ''}${result.density.delta}`,
      );
      if (result.variance) {
        console.log(`   │  ├─ dens.σ: ${result.variance.densityσ}`);
      }
      console.log(`   │  ├─ kern.Δ: ${result.kernels.delta}`);
      if (result.variance) {
        console.log(`   │  ├─ kern.σ: ${result.variance.kernelσ}`);
      }
      console.log(
        `   │  └─ tokens: ${result.tokens.before} → ${result.tokens.after}`,
      );
      console.log(
        `   └─ quality: ✓ ${qualityStatus} (σ ${result.variance ? `= ${result.variance.densityσ}` : 'n/a'})`,
      );
      console.log('');

      if (values.mode === 'plan') {
        console.log(
          'note: this was a plan. to apply, re-run with --mode apply',
        );
      }
    }
  } catch (error) {
    // handle specific error types
    if (error instanceof BadRequestError) {
      if (values.json) {
        const errorMeta = (error as unknown as { metadata?: unknown }).metadata;
        console.error(
          JSON.stringify({
            error: 'condense failed',
            message: error.message,
            metadata: errorMeta,
          }),
        );
      } else {
        console.log('🐢 bummer dude...');
        console.log('');
        console.log('🐚 condense');
        console.log(`   ├─ from: ${fromPath}`);
        console.log(`   ├─ error: ${error.message}`);
        const errorMeta = (error as unknown as { metadata?: unknown }).metadata;
        if (errorMeta) {
          const meta = errorMeta as Record<string, unknown>;
          if (meta.stability) {
            const stability = meta.stability as ConsensusStability;
            console.log(
              `   │  ├─ stability.meanJaccard: ${stability.meanJaccard.toFixed(2)}`,
            );
            console.log(
              `   │  ├─ stability.minJaccard: ${stability.minJaccard.toFixed(2)}`,
            );
          }
        }
        console.log(
          '   └─ suggestion: revise brief to reduce ambiguity before compression',
        );
      }

      // use exit code 2 for kernelization unstable
      if (error.message.includes('kernelization unstable')) {
        process.exit(2);
      }
      process.exit(1);
    }

    // generic error
    console.error(
      JSON.stringify({
        error: 'condense failed',
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }
};

// run main only when executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error(
      JSON.stringify({
        error: 'condense failed',
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  });
}
