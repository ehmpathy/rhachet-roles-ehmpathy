#!/usr/bin/env npx tsx

/**
 * .what = extract semantic kernels from markdown briefs
 * .why = identifies distinct atomic concepts for compression quality measurement
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import {
  type ConceptKernel,
  type ConsensusKernel,
  type ConsensusStability,
  extractKernels,
  extractKernelsWithConsensus,
} from '../../../../domain.operations/kernelize/extractKernels';

/**
 * .what = output format for kernelize skill
 * .why = structured json for downstream consumption
 */
interface KernelizeOutput {
  source: string;
  kernelCount: number;
  kernels: ConceptKernel[] | ConsensusKernel[];
  rationale: string;
  consensus?: {
    runs: number;
    threshold: number;
    stability: ConsensusStability;
  };
}

/**
 * .what = parse cli arguments
 * .why = extract named args from process.argv
 */
const parseArgs = (): {
  from: string;
  into: string | null;
  mode: 'plan' | 'apply';
  consensus: number | null;
  threshold: number | null;
  brain: string;
} => {
  const args = process.argv.slice(2);
  let from = '';
  let into: string | null = null;
  let mode: 'plan' | 'apply' = 'plan';
  let consensus: number | null = null;
  let threshold: number | null = null;
  let brain = 'xai/grok/code-fast-1';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--from' && next) {
      from = next;
      i++;
    } else if (arg === '--into' && next) {
      into = next;
      i++;
    } else if (arg === '--mode' && next) {
      mode = next as 'plan' | 'apply';
      i++;
    } else if (arg === '--consensus' && next) {
      consensus = parseInt(next, 10);
      i++;
    } else if (arg === '--threshold' && next) {
      threshold = parseFloat(next);
      i++;
    } else if (arg === '--brain' && next) {
      brain = next;
      i++;
    }
  }

  return { from, into, mode, consensus, threshold, brain };
};

/**
 * .what = run kernel extraction
 * .why = orchestrate single or consensus extraction based on args
 */
const runKernelize = async (input: {
  from: string;
  consensus: number | null;
  threshold: number | null;
  brain: string;
}): Promise<KernelizeOutput> => {
  // read source file
  const content = await fs.readFile(input.from, 'utf-8');

  // run extraction
  if (input.consensus !== null && input.consensus > 1) {
    // consensus mode
    const result = await extractKernelsWithConsensus({
      content,
      brainSlug: input.brain,
      runs: input.consensus,
      threshold: input.threshold ?? 0.5,
    });

    return {
      source: input.from,
      kernelCount: result.kernelCount,
      kernels: result.kernels,
      rationale: result.rationale,
      consensus: result.consensus,
    };
  } else {
    // single extraction mode
    const result = await extractKernels({
      content,
      brainSlug: input.brain,
    });

    return {
      source: input.from,
      kernelCount: result.kernelCount,
      kernels: result.kernels,
      rationale: result.rationale,
    };
  }
};

/**
 * .what = format output for terminal display
 * .why = turtle vibes tree format
 */
const formatOutput = (
  output: KernelizeOutput,
  mode: 'plan' | 'apply',
): void => {
  const modeLabel = mode === 'plan' ? '[plan]' : '[apply]';

  console.log(`🐢 kernelize ${modeLabel}`);
  console.log('');
  console.log('🐚 kernelize');
  console.log(`   ├─ source: ${output.source}`);
  console.log(`   ├─ kernelCount: ${output.kernelCount}`);

  if (output.consensus) {
    console.log(
      `   ├─ consensus: runs=${output.consensus.runs}, threshold=${output.consensus.threshold}`,
    );
    const s = output.consensus.stability;
    console.log(
      `   ├─ stability: jaccard=${s.meanJaccard.toFixed(2)} (min=${s.minJaccard.toFixed(2)}, max=${s.maxJaccard.toFixed(2)})`,
    );
  }

  console.log('   ├─ kernels');
  output.kernels.forEach((kernel, index) => {
    const isLast = index === output.kernels.length - 1;
    const prefix = isLast ? '   │  └─' : '   │  ├─';
    console.log(
      `${prefix} [${kernel.id}] (${kernel.category}) ${kernel.concept}`,
    );

    // display variants if present (consensus mode)
    const consensusKernel = kernel as ConsensusKernel;
    if (consensusKernel.variants && consensusKernel.variants.length > 1) {
      const variantPrefix = isLast ? '          ' : '   │     ';
      console.log(
        `${variantPrefix} coverage: ${consensusKernel.coverage}/${output.consensus?.runs ?? '?'} runs`,
      );
      console.log(`${variantPrefix} variants:`);
      consensusKernel.variants.forEach((v, vIndex) => {
        const vLast = vIndex === consensusKernel.variants.length - 1;
        const vMarker = vLast ? '└─' : '├─';
        console.log(`${variantPrefix}   ${vMarker} [r${v.run}] ${v.concept}`);
      });
    }
  });

  console.log(`   └─ rationale: ${output.rationale}`);
};

/**
 * .what = main entry point
 * .why = parse args, run extraction, emit output
 */
const main = async (): Promise<void> => {
  const args = parseArgs();

  // validate required args
  if (!args.from) {
    console.error('error: --from is required');
    process.exit(1);
  }

  // run extraction
  const output = await runKernelize({
    from: args.from,
    consensus: args.consensus,
    threshold: args.threshold,
    brain: args.brain,
  });

  // emit output
  if (args.mode === 'apply' && args.into) {
    // write to file
    await fs.mkdir(path.dirname(args.into), { recursive: true });
    await fs.writeFile(args.into, JSON.stringify(output, null, 2));
    console.log(`🐢 kernelize [apply]`);
    console.log('');
    console.log('🐚 kernelize');
    console.log(`   ├─ source: ${output.source}`);
    console.log(`   ├─ kernelCount: ${output.kernelCount}`);
    if (output.consensus) {
      const s = output.consensus.stability;
      console.log(
        `   ├─ stability: jaccard=${s.meanJaccard.toFixed(2)} (min=${s.minJaccard.toFixed(2)}, max=${s.maxJaccard.toFixed(2)})`,
      );
    }
    console.log(`   └─ emitted: ${args.into}`);
  } else if (args.mode === 'apply') {
    // emit json to stdout
    console.log(JSON.stringify(output, null, 2));
  } else {
    // plan mode - show formatted preview
    formatOutput(output, args.mode);
    console.log('');
    console.log('to emit json output:');
    console.log(
      `  npx rhachet run --skill kernelize --from ${args.from} --mode apply`,
    );
  }
};

// run main
main().catch((err) => {
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
