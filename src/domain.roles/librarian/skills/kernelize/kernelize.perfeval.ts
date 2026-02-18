#!/usr/bin/env npx tsx

/**
 * .what = stability perfevals for kernel extraction
 * .why = measure consistency of kernel extraction across repeated runs
 */

import Bottleneck from 'bottleneck';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createCache } from 'simple-on-disk-cache';
import { withSimpleCachingAsync } from 'with-simple-caching';

import { clusterKernels as clusterKernelsBrain } from '../../../../domain.operations/kernelize/clusterKernels';
import {
  type ConceptKernel,
  extractKernels as extractKernelsRaw,
  extractKernelsWithConsensus,
} from '../../../../domain.operations/kernelize/extractKernels';
import {
  loadAllTestBriefs,
  type TestBrief,
} from '../brief.compress/.test/fixtures/briefs';

/**
 * .what = rate limiter for parallel brain calls
 * .why = prevent api overload while max throughput achieved
 */
const limiter = new Bottleneck({
  maxConcurrent: 10,
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
  'kernelize',
);
const perfevalCache = createCache({
  directory: { mounted: { path: CACHE_DIR } },
});

/**
 * .what = wrap extractKernels with on-disk cache + attempt index
 * .why = distinct cache key per run (same content + different attempt = different key)
 */
const extractKernels = withSimpleCachingAsync(
  async (input: {
    content: string;
    brainSlug: string;
    attemptIndex: number;
  }) => {
    return extractKernelsRaw({
      content: input.content,
      brainSlug: input.brainSlug,
    });
  },
  {
    cache: perfevalCache,
    serialize: {
      key: ({ forInput }) => {
        const input = forInput[0];
        const hash = createHash('sha256')
          .update(input.content)
          .update(input.brainSlug)
          .update(String(input.attemptIndex))
          .digest('hex')
          .slice(0, 24);
        return `kernelize-${hash}`;
      },
    },
  },
);

/**
 * .what = cluster kernels from multiple runs via brain
 * .why = semantic similarity, not word overlap
 *
 * each cluster tracks which runs contributed kernels
 */
interface PerfevalCluster {
  representative: string;
  runIndexes: number[];
}

const clusterKernelsForPerfeval = async (
  runs: ConceptKernel[][],
  brainSlug: string,
): Promise<PerfevalCluster[]> => {
  // flatten all kernels with run index prefix
  const allKernels: ConceptKernel[] = [];
  const idToRunIndex = new Map<string, number>();

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const kernels = runs[runIndex]!;
    for (const kernel of kernels) {
      const prefixedId = `r${runIndex}_${kernel.id}`;
      allKernels.push({ ...kernel, id: prefixedId });
      idToRunIndex.set(prefixedId, runIndex);
    }
  }

  // cluster via brain
  const brainResult = await clusterKernelsBrain({
    kernels: allKernels,
    brainSlug,
  });

  // convert to perfeval cluster format
  const perfevalClusters: PerfevalCluster[] = [];

  for (const cluster of brainResult.clusters) {
    const runIndexes = [
      ...new Set(
        cluster.members
          .map((m) => idToRunIndex.get(m.id))
          .filter((r): r is number => r !== undefined),
      ),
    ];

    perfevalClusters.push({
      representative: cluster.representative.concept,
      runIndexes,
    });
  }

  return perfevalClusters;
};

/**
 * .what = compute stability from cluster coverage
 * .why = stability = what fraction of clusters have all runs?
 *
 * metrics:
 * - fullCoverage: clusters with all N runs (most stable concepts)
 * - meanCoverage: average run coverage per cluster
 */
interface StabilityMetrics {
  totalClusters: number;
  fullCoverageCount: number; // clusters with all N runs
  fullCoverageRatio: number; // fullCoverageCount / totalClusters
  meanCoverage: number; // average (runIndexes.length / N)
  clusterDetails: Array<{
    representative: string;
    runCount: number;
    runIndexes: number[];
  }>;
}

const computeStability = async (
  runs: ConceptKernel[][],
  brainSlug: string,
): Promise<StabilityMetrics> => {
  const totalRuns = runs.length;
  const clusters = await clusterKernelsForPerfeval(runs, brainSlug);

  if (clusters.length === 0) {
    return {
      totalClusters: 0,
      fullCoverageCount: 0,
      fullCoverageRatio: 1,
      meanCoverage: 1,
      clusterDetails: [],
    };
  }

  const fullCoverageCount = clusters.filter(
    (c) => c.runIndexes.length === totalRuns,
  ).length;

  const meanCoverage =
    clusters.reduce((sum, c) => sum + c.runIndexes.length / totalRuns, 0) /
    clusters.length;

  const clusterDetails = clusters.map((c) => ({
    representative: c.representative,
    runCount: c.runIndexes.length,
    runIndexes: c.runIndexes,
  }));

  return {
    totalClusters: clusters.length,
    fullCoverageCount,
    fullCoverageRatio: fullCoverageCount / clusters.length,
    meanCoverage,
    clusterDetails,
  };
};

/**
 * .what = test briefs for stability eval
 * .why = shared fixture with 8 representative briefs across types
 */
const getTestBriefs = (): Array<TestBrief & { content: string }> =>
  loadAllTestBriefs();

/**
 * .what = result of stability eval for one brief
 */
interface StabilityResult {
  briefName: string;
  briefType: string;
  brainSlug: string;
  runs: number;
  stability: StabilityMetrics;
  kernelCounts: number[];
  durationMs: number;
  error: string | null;
}

/**
 * .what = run stability eval for a single brief
 * .why = measure extraction consistency via repeated runs
 */
const runStabilityEval = async (input: {
  briefContent: string;
  briefName: string;
  briefType: string;
  brainSlug: string;
  runs: number;
}): Promise<StabilityResult> => {
  const startTime = Date.now();

  try {
    const content = input.briefContent;

    // run N parallel extractions
    const extractionPromises = Array.from({ length: input.runs }, (_, i) =>
      limiter.schedule(() =>
        extractKernels({
          content,
          brainSlug: input.brainSlug,
          attemptIndex: i,
        }),
      ),
    );

    const results = await Promise.all(extractionPromises);
    const kernelSets = results.map((r) => r.kernels);
    const kernelCounts = kernelSets.map((k) => k.length);

    // compute stability via brain-driven cluster
    const stability = await computeStability(kernelSets, input.brainSlug);

    return {
      briefName: input.briefName,
      briefType: input.briefType,
      brainSlug: input.brainSlug,
      runs: input.runs,
      stability,
      kernelCounts,
      durationMs: Date.now() - startTime,
      error: null,
    };
  } catch (error) {
    return {
      briefName: input.briefName,
      briefType: input.briefType,
      brainSlug: input.brainSlug,
      runs: input.runs,
      stability: {
        totalClusters: 0,
        fullCoverageCount: 0,
        fullCoverageRatio: 0,
        meanCoverage: 0,
        clusterDetails: [],
      },
      kernelCounts: [],
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * .what = result of consensus stability eval
 */
interface ConsensusStabilityResult {
  briefName: string;
  consensusRuns: number;
  threshold: number;
  attempts: number;
  kernelCountsPerAttempt: number[];
  jaccardBetweenAttempts: number;
  durationMs: number;
  error: string | null;
}

/**
 * .what = run consensus stability eval for a single brief
 * .why = measure if consensus mode produces stable output across repeated runs
 */
const runConsensusStabilityEval = async (input: {
  briefContent: string;
  briefName: string;
  brainSlug: string;
  consensusRuns: number;
  threshold: number;
  attempts: number;
}): Promise<ConsensusStabilityResult> => {
  const startTime = Date.now();

  try {
    const content = input.briefContent;

    // run consensus N times
    const consensusResults = await Promise.all(
      Array.from({ length: input.attempts }, () =>
        extractKernelsWithConsensus({
          content,
          brainSlug: input.brainSlug,
          runs: input.consensusRuns,
          threshold: input.threshold,
        }),
      ),
    );

    const kernelCounts = consensusResults.map((r) => r.kernels.length);

    // compute jaccard between all pairs of consensus results via brain-driven cluster
    const jaccards: number[] = [];
    for (let i = 0; i < consensusResults.length; i++) {
      for (let j = i + 1; j < consensusResults.length; j++) {
        const kernelsA = consensusResults[i]!.kernels.map((k, idx) => ({
          ...k,
          id: `a${idx}`,
        }));
        const kernelsB = consensusResults[j]!.kernels.map((k, idx) => ({
          ...k,
          id: `b${idx}`,
        }));

        // cluster via brain
        const brainResult = await clusterKernelsBrain({
          kernels: [...kernelsA, ...kernelsB],
          brainSlug: input.brainSlug,
        });

        // count clusters with members from both sets
        let bothCount = 0;
        for (const cluster of brainResult.clusters) {
          const hasA = cluster.members.some((m) => m.id.startsWith('a'));
          const hasB = cluster.members.some((m) => m.id.startsWith('b'));
          if (hasA && hasB) bothCount++;
        }

        const jaccard =
          brainResult.clusterCount > 0
            ? bothCount / brainResult.clusterCount
            : 1;
        jaccards.push(jaccard);
      }
    }

    const meanJaccard =
      jaccards.length > 0
        ? jaccards.reduce((a, b) => a + b, 0) / jaccards.length
        : 1;

    return {
      briefName: input.briefName,
      consensusRuns: input.consensusRuns,
      threshold: input.threshold,
      attempts: input.attempts,
      kernelCountsPerAttempt: kernelCounts,
      jaccardBetweenAttempts: meanJaccard,
      durationMs: Date.now() - startTime,
      error: null,
    };
  } catch (error) {
    return {
      briefName: input.briefName,
      consensusRuns: input.consensusRuns,
      threshold: input.threshold,
      attempts: input.attempts,
      kernelCountsPerAttempt: [],
      jaccardBetweenAttempts: 0,
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
    '# kernelize stability perfeval',
    '',
    `date: ${new Date().toISOString().slice(0, 10)}`,
    '',
    '## summary',
    '',
    '| brief | type | runs | clusters | full coverage | mean coverage | kernel counts |',
    '|-------|------|------|----------|---------------|---------------|---------------|',
  ];

  for (const r of results) {
    if (r.error) {
      lines.push(
        `| ${r.briefName} | ${r.briefType} | ${r.runs} | ERROR | - | - | - |`,
      );
    } else {
      const fullCovStr = `${r.stability.fullCoverageCount}/${r.stability.totalClusters} (${(r.stability.fullCoverageRatio * 100).toFixed(0)}%)`;
      const meanCovStr = (r.stability.meanCoverage * 100).toFixed(0) + '%';
      const countsStr = r.kernelCounts.join(', ');
      lines.push(
        `| ${r.briefName} | ${r.briefType} | ${r.runs} | ${r.stability.totalClusters} | ${fullCovStr} | ${meanCovStr} | ${countsStr} |`,
      );
    }
  }

  lines.push('');
  lines.push('## interpretation');
  lines.push('');
  lines.push(
    '- **clusters** = total distinct concepts found via brain-driven semantic cluster',
  );
  lines.push(
    '- **full coverage** = clusters that appeared in ALL runs (most stable)',
  );
  lines.push(
    '- **mean coverage** = average % of runs each cluster appeared in',
  );
  lines.push('- **target** = full coverage ratio >80%');
  lines.push('');

  // compute overall stats
  const validResults = results.filter((r) => !r.error);
  if (validResults.length > 0) {
    const overallFullCoverage =
      validResults.reduce((sum, r) => sum + r.stability.fullCoverageRatio, 0) /
      validResults.length;
    const overallMeanCoverage =
      validResults.reduce((sum, r) => sum + r.stability.meanCoverage, 0) /
      validResults.length;
    lines.push('## overall');
    lines.push('');
    lines.push(
      `- full coverage ratio (mean): ${(overallFullCoverage * 100).toFixed(1)}%`,
    );
    lines.push(
      `- mean coverage (mean): ${(overallMeanCoverage * 100).toFixed(1)}%`,
    );
    lines.push(`- briefs evaluated: ${validResults.length}`);
    lines.push(`- briefs with errors: ${results.length - validResults.length}`);
  }

  // show cluster details for each brief
  lines.push('');
  lines.push('## cluster details');
  lines.push('');

  for (const r of validResults) {
    lines.push(`### ${r.briefName}`);
    lines.push('');
    lines.push('| cluster | runs | representative concept |');
    lines.push('|---------|------|------------------------|');
    for (const c of r.stability.clusterDetails) {
      const runsStr = c.runIndexes.map((i) => i + 1).join(',');
      const conceptStr =
        c.representative.length > 60
          ? c.representative.slice(0, 60) + '...'
          : c.representative;
      lines.push(`| ${c.runCount}/${r.runs} | [${runsStr}] | ${conceptStr} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
};

/**
 * .what = format consensus stability results as markdown
 */
const formatConsensusReport = (results: ConsensusStabilityResult[]): string => {
  const lines: string[] = [
    '# kernelize consensus stability perfeval',
    '',
    `date: ${new Date().toISOString().slice(0, 10)}`,
    '',
    '## summary',
    '',
    '| brief | consensus runs | threshold | attempts | jaccard | kernel counts |',
    '|-------|----------------|-----------|----------|---------|---------------|',
  ];

  for (const r of results) {
    if (r.error) {
      lines.push(
        `| ${r.briefName} | ${r.consensusRuns} | ${r.threshold} | ${r.attempts} | ERROR | - |`,
      );
    } else {
      const jaccardStr = (r.jaccardBetweenAttempts * 100).toFixed(0) + '%';
      const countsStr = r.kernelCountsPerAttempt.join(', ');
      lines.push(
        `| ${r.briefName} | ${r.consensusRuns} | ${r.threshold} | ${r.attempts} | ${jaccardStr} | ${countsStr} |`,
      );
    }
  }

  lines.push('');
  lines.push('## interpretation');
  lines.push('');
  lines.push('- **consensus runs** = how many extractions per consensus call');
  lines.push('- **threshold** = fraction of runs a kernel must appear in');
  lines.push('- **attempts** = how many times we ran consensus');
  lines.push(
    '- **jaccard** = overlap via brain-driven semantic cluster (target >80%)',
  );
  lines.push('');

  const validResults = results.filter((r) => !r.error);
  if (validResults.length > 0) {
    const overallJaccard =
      validResults.reduce((sum, r) => sum + r.jaccardBetweenAttempts, 0) /
      validResults.length;
    lines.push('## overall');
    lines.push('');
    lines.push(`- mean jaccard: ${(overallJaccard * 100).toFixed(1)}%`);
    lines.push(`- briefs evaluated: ${validResults.length}`);
  }

  return lines.join('\n');
};

/**
 * .what = main entry point for perfeval
 */
const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const mode =
    args.find((a) => a.startsWith('--mode='))?.split('=')[1] ?? 'single';
  const runs = parseInt(
    args.find((a) => a.startsWith('--runs='))?.split('=')[1] ?? '5',
    10,
  );
  const threshold = parseFloat(
    args.find((a) => a.startsWith('--threshold='))?.split('=')[1] ?? '0.5',
  );
  const attempts = parseInt(
    args.find((a) => a.startsWith('--attempts='))?.split('=')[1] ?? '3',
    10,
  );
  const brainSlug =
    args.find((a) => a.startsWith('--brain='))?.split('=')[1] ??
    'xai/grok/code-fast-1';

  // load shared test briefs
  const testBriefs = getTestBriefs();

  if (mode === 'consensus') {
    // consensus stability mode
    console.log('🐢 kernelize consensus stability perfeval');
    console.log(`   consensus runs: ${runs}`);
    console.log(`   threshold: ${threshold}`);
    console.log(`   attempts: ${attempts}`);
    console.log(`   brain: ${brainSlug}`);
    console.log(`   briefs: ${testBriefs.length}`);
    console.log('');

    const results: ConsensusStabilityResult[] = [];

    for (const brief of testBriefs) {
      console.log(`   eval: ${brief.name}...`);
      const result = await runConsensusStabilityEval({
        briefContent: brief.content,
        briefName: brief.name,
        brainSlug,
        consensusRuns: runs,
        threshold,
        attempts,
      });
      results.push(result);
      console.log(
        `   → jaccard: ${(result.jaccardBetweenAttempts * 100).toFixed(0)}%, kernels: [${result.kernelCountsPerAttempt.join(', ')}]`,
      );
    }

    const outputDir = path.join(__dirname, '.perfevals');
    await fs.mkdir(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().slice(0, 10);
    const jsonPath = path.join(
      outputDir,
      `${timestamp}.consensus-stability.json`,
    );
    const mdPath = path.join(outputDir, `${timestamp}.consensus-stability.md`);

    await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
    await fs.writeFile(mdPath, formatConsensusReport(results));

    console.log('');
    console.log(`   emitted: ${jsonPath}`);
    console.log(`   emitted: ${mdPath}`);
  } else {
    // single-run stability mode (default)
    console.log('🐢 kernelize stability perfeval');
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
        briefType: brief.type,
        brainSlug,
        runs,
      });
      results.push(result);
      console.log(
        `   → clusters: ${result.stability.totalClusters}, full coverage: ${(result.stability.fullCoverageRatio * 100).toFixed(0)}%, mean: ${(result.stability.meanCoverage * 100).toFixed(0)}%`,
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
  }
};

// run main
main().catch((err) => {
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
