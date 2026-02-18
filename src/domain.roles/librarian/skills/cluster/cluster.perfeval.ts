#!/usr/bin/env npx tsx

/**
 * .what = stability perfevals for kernel cluster
 * .why = measure consistency of brain-driven cluster across repeated runs
 */

import Bottleneck from 'bottleneck';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createCache } from 'simple-on-disk-cache';
import { withSimpleCachingAsync } from 'with-simple-caching';

import {
  type ClusterResult,
  clusterKernels as clusterKernelsRaw,
} from '../../../../domain.operations/kernelize/clusterKernels';
import {
  type ConceptKernel,
  extractKernels,
} from '../../../../domain.operations/kernelize/extractKernels';
import { loadAllTestBriefs } from '../brief.compress/.test/fixtures/briefs';

/**
 * .what = rate limiter for parallel brain calls
 * .why = prevent api overload while max throughput achieved
 */
const limiter = new Bottleneck({
  maxConcurrent: 5,
});

/**
 * .what = find git root directory
 * .why = cache dir should be relative to git root
 */
const findGitRoot = (): string => {
  let dir = __dirname;
  while (dir !== '/') {
    if (
      require('fs').existsSync(path.join(dir, '.git')) ||
      require('fs').existsSync(path.join(dir, '.git', 'HEAD'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return __dirname;
};

/**
 * .what = on-disk cache for brain call results
 * .why = avoid redundant api calls when re-run with same inputs
 */
const CACHE_DIR = path.join(
  findGitRoot(),
  '.rhachet',
  'bhrain',
  'cache',
  'cluster',
);
const perfevalCache = createCache({
  directory: { mounted: { path: CACHE_DIR } },
});

/**
 * .what = wrap clusterKernels with cache + attempt index
 * .why = distinct cache key per run (same kernels + different attempt = different key)
 */
const clusterKernels = withSimpleCachingAsync(
  async (input: {
    kernels: ConceptKernel[];
    brainSlug: string;
    attemptIndex: number;
  }): Promise<ClusterResult> => {
    return clusterKernelsRaw({
      kernels: input.kernels,
      brainSlug: input.brainSlug,
    });
  },
  {
    cache: perfevalCache,
    serialize: {
      key: ({ forInput }) => {
        const input = forInput[0];
        const kernelHash = createHash('sha256')
          .update(JSON.stringify(input.kernels))
          .update(input.brainSlug)
          .update(String(input.attemptIndex))
          .digest('hex')
          .slice(0, 24);
        return `cluster-${kernelHash}`;
      },
    },
  },
);

/**
 * .what = extract cluster assignments from ClusterResult
 * .why = convert to format suitable for ARI computation (kernel id → cluster index)
 */
const extractAssignments = (result: ClusterResult): Map<string, number> => {
  const assignments = new Map<string, number>();
  result.clusters.forEach((cluster, clusterIndex) => {
    for (const member of cluster.members) {
      assignments.set(member.id, clusterIndex);
    }
  });
  return assignments;
};

/**
 * .what = compute Adjusted Rand Index between two cluster results
 * .why = measure cluster structure similarity, not label similarity
 *
 * ARI compares pairwise agreements: do both runs agree that two kernels
 * should be together (or apart)?
 *
 * range: -0.5 to 1.0 (1.0 = identical structure, 0 = random, <0 = worse than random)
 *
 * ref: https://en.wikipedia.org/wiki/Rand_index
 */
const computeARI = (a: ClusterResult, b: ClusterResult): number => {
  const assignA = extractAssignments(a);
  const assignB = extractAssignments(b);

  // get shared kernel ids (both runs must have assigned them)
  const sharedIds = [...assignA.keys()].filter((id) => assignB.has(id));
  const n = sharedIds.length;

  if (n < 2) return 1; // trivial case: 0 or 1 element

  // count pairwise agreements
  let a11 = 0; // same cluster in both
  let a00 = 0; // different cluster in both
  let a10 = 0; // same in A, different in B
  let a01 = 0; // different in A, same in B

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const idI = sharedIds[i]!;
      const idJ = sharedIds[j]!;

      const sameInA = assignA.get(idI) === assignA.get(idJ);
      const sameInB = assignB.get(idI) === assignB.get(idJ);

      if (sameInA && sameInB) a11++;
      else if (!sameInA && !sameInB) a00++;
      else if (sameInA && !sameInB) a10++;
      else a01++;
    }
  }

  // total pairs
  const totalPairs = (n * (n - 1)) / 2;

  // Rand Index = (a11 + a00) / totalPairs
  const ri = (a11 + a00) / totalPairs;

  // Expected index under random assignment
  const sumA = a11 + a10;
  const sumB = a11 + a01;
  const expectedIndex =
    (sumA * sumB + (totalPairs - sumA) * (totalPairs - sumB)) /
    (totalPairs * totalPairs);

  // Adjusted Rand Index
  const maxIndex = 1;
  if (maxIndex === expectedIndex) return 1; // avoid division by zero

  return (ri - expectedIndex) / (maxIndex - expectedIndex);
};

/**
 * .what = stability result for one brief
 */
interface StabilityResult {
  briefName: string;
  brainSlug: string;
  runs: number;
  clusterCounts: number[];
  meanARI: number;
  minARI: number;
  maxARI: number;
  durationMs: number;
  error: string | null;
}

/**
 * .what = run stability eval for a single brief
 * .why = extract kernels once, then cluster N times to measure variance
 */
const runStabilityEval = async (input: {
  briefContent: string;
  briefName: string;
  brainSlug: string;
  runs: number;
}): Promise<StabilityResult> => {
  const startTime = Date.now();

  try {
    // extract kernels once (deterministic input for cluster evals)
    const extraction = await extractKernels({
      content: input.briefContent,
      brainSlug: input.brainSlug,
    });

    // run N cluster operations
    const clusterPromises = Array.from({ length: input.runs }, (_, i) =>
      limiter.schedule(() =>
        clusterKernels({
          kernels: extraction.kernels,
          brainSlug: input.brainSlug,
          attemptIndex: i,
        }),
      ),
    );

    const results = await Promise.all(clusterPromises);
    const clusterCounts = results.map((r) => r.clusterCount);

    // compute pairwise ARI (Adjusted Rand Index)
    const ariScores: number[] = [];
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        ariScores.push(computeARI(results[i]!, results[j]!));
      }
    }

    const meanARI =
      ariScores.length > 0
        ? ariScores.reduce((a, b) => a + b, 0) / ariScores.length
        : 1;
    const minARI = ariScores.length > 0 ? Math.min(...ariScores) : 1;
    const maxARI = ariScores.length > 0 ? Math.max(...ariScores) : 1;

    return {
      briefName: input.briefName,
      brainSlug: input.brainSlug,
      runs: input.runs,
      clusterCounts,
      meanARI,
      minARI,
      maxARI,
      durationMs: Date.now() - startTime,
      error: null,
    };
  } catch (error) {
    return {
      briefName: input.briefName,
      brainSlug: input.brainSlug,
      runs: input.runs,
      clusterCounts: [],
      meanARI: 0,
      minARI: 0,
      maxARI: 0,
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * .what = format perfeval results as markdown report
 */
const formatReport = (results: StabilityResult[]): string => {
  const lines: string[] = [
    '# cluster stability perfeval',
    '',
    `date: ${new Date().toISOString().slice(0, 10)}`,
    '',
    '## summary',
    '',
    '| brief | runs | cluster counts | mean ARI | min | max |',
    '|-------|------|----------------|----------|-----|-----|',
  ];

  for (const r of results) {
    if (r.error) {
      lines.push(`| ${r.briefName} | ${r.runs} | ERROR | - | - | - |`);
    } else {
      const countsStr = r.clusterCounts.join(', ');
      const meanStr = r.meanARI.toFixed(2);
      const minStr = r.minARI.toFixed(2);
      const maxStr = r.maxARI.toFixed(2);
      lines.push(
        `| ${r.briefName} | ${r.runs} | ${countsStr} | ${meanStr} | ${minStr} | ${maxStr} |`,
      );
    }
  }

  lines.push('');
  lines.push('## interpretation');
  lines.push('');
  lines.push('- **cluster counts** = number of clusters per run');
  lines.push(
    '- **ARI** = Adjusted Rand Index (1.0 = identical structure, 0 = random, <0 = worse than random)',
  );
  lines.push('- **target** = mean ARI > 0.8');
  lines.push('');

  // compute overall stats
  const validResults = results.filter((r) => !r.error);
  if (validResults.length > 0) {
    const overallMeanARI =
      validResults.reduce((sum, r) => sum + r.meanARI, 0) / validResults.length;
    lines.push('## overall');
    lines.push('');
    lines.push(`- mean ARI: ${overallMeanARI.toFixed(2)}`);
    lines.push(`- briefs evaluated: ${validResults.length}`);
    lines.push(`- briefs with errors: ${results.length - validResults.length}`);
  }

  return lines.join('\n');
};

/**
 * .what = main entry point for perfeval
 */
const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const runs = parseInt(
    args.find((a) => a.startsWith('--runs='))?.split('=')[1] ?? '3',
    10,
  );
  const brainSlug =
    args.find((a) => a.startsWith('--brain='))?.split('=')[1] ??
    'xai/grok/code-fast-1';

  // load shared test briefs
  const testBriefs = loadAllTestBriefs();

  console.log('🐢 cluster stability perfeval');
  console.log(`   runs per brief: ${runs}`);
  console.log(`   brain: ${brainSlug}`);
  console.log(`   briefs: ${testBriefs.length}`);
  console.log('');

  const results: StabilityResult[] = [];

  for (const brief of testBriefs) {
    console.log(`   eval: ${brief.name}...`);
    const result = await runStabilityEval({
      briefContent: brief.content,
      briefName: brief.name,
      brainSlug,
      runs,
    });
    results.push(result);
    console.log(
      `   → clusters: [${result.clusterCounts.join(', ')}], ARI: ${result.meanARI.toFixed(2)}`,
    );
  }

  const outputDir = path.join(__dirname, '.perfevals');
  await fs.mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().slice(0, 10);
  const jsonPath = path.join(outputDir, `${timestamp}.stability.json`);
  const mdPath = path.join(outputDir, `${timestamp}.stability.md`);

  await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
  await fs.writeFile(mdPath, formatReport(results));

  console.log('');
  console.log(`   emitted: ${jsonPath}`);
  console.log(`   emitted: ${mdPath}`);
};

// run main
main().catch((err) => {
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
