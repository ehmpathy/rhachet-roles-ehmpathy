#!/usr/bin/env npx tsx

/**
 * .what = cluster semantically similar concept kernels
 * .why = brain-driven semantic similarity for kernel group
 */

import * as fs from 'fs/promises';

import {
  type ClusterResult,
  clusterKernels,
} from '../../../../domain.operations/kernelize/clusterKernels';
import type { ConceptKernel } from '../../../../domain.operations/kernelize/extractKernels';

/**
 * .what = input format for cluster skill
 * .why = structured json with kernels array
 */
interface ClusterInput {
  kernels: ConceptKernel[];
}

/**
 * .what = output format for cluster skill
 * .why = structured json with clusters and metadata
 */
interface ClusterOutput extends ClusterResult {
  source: string;
  kernelCount: number;
}

/**
 * .what = parse command line args
 * .why = extract --from, --into, --mode, --brain
 */
const parseArgs = (): {
  from: string;
  into: string;
  mode: 'plan' | 'apply';
  brainSlug: string;
} => {
  const args = process.argv.slice(2);
  const from = args.find((_, i) => args[i - 1] === '--from') ?? '';
  const into = args.find((_, i) => args[i - 1] === '--into') ?? '';
  const mode =
    (args.find((_, i) => args[i - 1] === '--mode') as 'plan' | 'apply') ??
    'plan';
  const brainSlug =
    args.find((_, i) => args[i - 1] === '--brain') ?? 'xai/grok/code-fast-1';

  return { from, into, mode, brainSlug };
};

/**
 * .what = run cluster operation
 * .why = orchestrate read, cluster, output
 */
const runCluster = async (input: {
  from: string;
  into: string;
  mode: 'plan' | 'apply';
  brainSlug: string;
}): Promise<ClusterOutput> => {
  // read input file
  const content = await fs.readFile(input.from, 'utf-8');
  const parsed: ClusterInput = JSON.parse(content);

  if (!parsed.kernels || !Array.isArray(parsed.kernels)) {
    throw new Error('invalid input: expected { kernels: [...] }');
  }

  // cluster via brain
  const result = await clusterKernels({
    kernels: parsed.kernels,
    brainSlug: input.brainSlug,
  });

  // build output
  const output: ClusterOutput = {
    source: input.from,
    kernelCount: parsed.kernels.length,
    ...result,
  };

  // emit if apply mode
  if (input.mode === 'apply' && input.into) {
    await fs.writeFile(input.into, JSON.stringify(output, null, 2));
  }

  return output;
};

/**
 * .what = format output as tree for plan mode
 * .why = readable preview before apply
 */
const formatTreeOutput = (output: ClusterOutput): string => {
  const lines: string[] = [];

  lines.push('🐢 cluster preview');
  lines.push('');
  lines.push('cluster');
  lines.push(`├── source = ${output.source}`);
  lines.push(`├── kernels.count = ${output.kernelCount}`);
  lines.push(`├── clusters.count = ${output.clusterCount}`);
  lines.push('├── clusters');

  for (let i = 0; i < output.clusters.length; i++) {
    const cluster = output.clusters[i]!;
    const prefix = i === output.clusters.length - 1 ? '│   └──' : '│   ├──';
    const conceptTrunc =
      cluster.representative.concept.length > 50
        ? cluster.representative.concept.slice(0, 50) + '...'
        : cluster.representative.concept;
    lines.push(`${prefix} [${i + 1}] ${conceptTrunc} (${cluster.memberCount})`);
  }

  lines.push(`└── rationale = ${output.rationale}`);

  return lines.join('\n');
};

/**
 * .what = main entry point
 */
const main = async (): Promise<void> => {
  const args = parseArgs();

  if (!args.from) {
    console.error('error: --from is required');
    process.exit(1);
  }

  try {
    const output = await runCluster(args);

    if (args.mode === 'plan') {
      console.log(formatTreeOutput(output));
    } else if (args.into) {
      console.log(`🐢 cluster applied`);
      console.log(`   → emitted: ${args.into}`);
    } else {
      // apply without --into: emit json to stdout
      console.log(JSON.stringify(output, null, 2));
    }
  } catch (error) {
    console.error(
      `error: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
};

// run main
main().catch((err) => {
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
