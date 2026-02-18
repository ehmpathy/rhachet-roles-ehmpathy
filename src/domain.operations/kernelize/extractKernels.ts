#!/usr/bin/env npx tsx

/**
 * .what = extract concept kernels from document content
 * .why = measure semantic retention after compression by count of distinct concepts
 *
 * concept kernel = a distinct, atomic idea or rule in the document
 * - duplicates of the same concept count as 1 kernel
 * - examples that illustrate a concept do not count as separate kernels
 * - the kernel is the core principle, not its expression
 *
 * cache: results cached to .rhachet/bhrain/cache/kernelize/
 * - cache key = content hash + brainSlug + attempt
 * - use force=true to bypass cache
 */

import { createHash } from 'crypto';
import { existsSync } from 'fs';
import * as path from 'path';
import { genContextBrain } from 'rhachet';
import { createCache } from 'simple-on-disk-cache';
import { withSimpleCachingAsync } from 'with-simple-caching';
import { withTimeout } from 'wrapper-fns';
import { z } from 'zod';

import { clusterKernels } from './clusterKernels';

/**
 * .what = find git repo root directory (sync)
 * .why = cache setup needs sync resolution at module load time
 */
const getGitRepoRootSync = (from: string): string => {
  let dir = from;
  while (dir !== '/') {
    if (existsSync(path.join(dir, '.git'))) return dir;
    dir = path.dirname(dir);
  }
  return from;
};

// setup on-disk cache for kernelize results
const CACHE_DIR = path.join(
  getGitRepoRootSync(__dirname),
  '.rhachet',
  'bhrain',
  'cache',
  'kernelize',
);
const kernelizeCache = createCache({
  directory: { mounted: { path: CACHE_DIR } },
});

/**
 * .what = schema for kernel extraction output
 * .why = structured output for reliable json parse
 */
const kernelSchema = z.object({
  kernels: z
    .array(
      z.object({
        id: z
          .string()
          .describe('short identifier for the kernel, e.g., k1, k2'),
        concept: z
          .string()
          .describe('the distinct concept or rule, stated concisely'),
        category: z
          .enum(['rule', 'principle', 'definition', 'pattern', 'constraint'])
          .describe('type of concept'),
      }),
    )
    .describe('list of distinct concept kernels found in the document'),
  rationale: z
    .string()
    .describe(
      'brief explanation of how kernels were identified and deduplicated',
    ),
});

export type ConceptKernel = z.infer<typeof kernelSchema>['kernels'][number];

/**
 * .what = a kernel with variants from multiple extraction runs
 * .why = variants provide synonyms that help downstream consumers understand the kernel
 */
export interface ConsensusKernel extends ConceptKernel {
  /** all variant phrasings of this kernel from different extraction runs */
  variants: Array<{ run: number; concept: string }>;
  /** number of runs that extracted this kernel */
  coverage: number;
}

export interface KernelExtractionResult {
  kernels: ConceptKernel[];
  rationale: string;
  kernelCount: number;
}

/**
 * .what = generate cache key from extraction inputs
 * .why = content hash ensures cache auto-invalidates when source changes
 */
const genKernelizeCacheKey = (input: {
  content: string;
  brainSlug: string;
  attempt?: number;
}): string => {
  const hash = createHash('sha256')
    .update(input.content)
    .update(input.brainSlug)
    .update(String(input.attempt ?? 0))
    .digest('hex')
    .slice(0, 24);
  return `kernelize-${hash}`;
};

/**
 * .what = core extraction logic (internal, wrapped with cache)
 * .why = enables on-disk cache wrapper
 */
const _extractKernels = async (input: {
  content: string;
  brainSlug: string;
  attempt?: number;
  force?: boolean;
}): Promise<KernelExtractionResult> => {
  // handle empty content
  if (!input.content.trim()) {
    return {
      kernels: [],
      rationale: 'empty content',
      kernelCount: 0,
    };
  }

  // resolve brain
  const contextBrain = await genContextBrain({
    choice: { atom: input.brainSlug },
  });

  // prompt for kernel extraction
  const prompt = `extract the distinct concept kernels from this document.

rules:
- a concept kernel is a distinct, atomic idea, rule, or principle
- if the same concept appears multiple times, count it only once
- examples that illustrate a concept do not count as separate kernels
- focus on the core principles, not their specific expressions
- be thorough: capture all distinct concepts, even minor ones

document:

${input.content}`;

  // ask brain to extract kernels
  const { output } = await withTimeout(
    async () =>
      contextBrain.brain.choice.ask({
        role: { briefs: [] },
        prompt,
        schema: { output: kernelSchema },
      }),
    { threshold: { seconds: 60 } },
  )();

  // defensive: ensure kernels array exists
  const kernels = output.kernels ?? [];

  return {
    kernels,
    rationale: output.rationale ?? 'no rationale provided',
    kernelCount: kernels.length,
  };
};

/**
 * .what = extract concept kernels from a document (cached)
 * .why = enables measurement of semantic content for retention analysis
 *
 * note: cache key includes content hash + brainSlug + attempt
 *       - attempt is used for parallel runs in consensus mode
 *       - use force=true to bypass cache lookup
 */
export const extractKernels = withSimpleCachingAsync(_extractKernels, {
  cache: kernelizeCache,
  serialize: {
    key: ({ forInput: [input] }) =>
      genKernelizeCacheKey({
        content: input.content,
        brainSlug: input.brainSlug,
        attempt: input.attempt,
      }),
  },
  bypass: {
    get: ([input]) => input.force === true,
  },
});

/**
 * .what = stability metrics for consensus extraction
 * .why = quantify agreement across parallel extraction runs
 */
export interface ConsensusStability {
  /** jaccard similarity of kernel sets across runs (0-1, higher = more stable) */
  meanJaccard: number;
  minJaccard: number;
  maxJaccard: number;
  /** number of pairwise comparisons */
  comparisons: number;
}

/**
 * .what = extract kernels via consensus from N parallel runs
 * .why = more robust kernel identification via majority agreement
 *
 * runs N parallel extractions and keeps kernels that appear in majority of runs
 * similarity is determined via brain-driven semantic cluster
 */
export const extractKernelsWithConsensus = async (input: {
  content: string;
  brainSlug: string;
  runs?: number;
  threshold?: number;
  /** bypass cache for all extraction and cluster calls */
  force?: boolean;
}): Promise<
  Omit<KernelExtractionResult, 'kernels'> & {
    kernels: ConsensusKernel[];
    consensus: {
      runs: number;
      threshold: number;
      stability: ConsensusStability;
    };
  }
> => {
  const runs = input.runs ?? 3;
  const threshold = input.threshold ?? 0.5; // majority = appears in >50% of runs

  // handle empty content
  if (!input.content.trim()) {
    return {
      kernels: [] as ConsensusKernel[],
      rationale: 'empty content',
      kernelCount: 0,
      consensus: {
        runs,
        threshold,
        stability: {
          meanJaccard: 1,
          minJaccard: 1,
          maxJaccard: 1,
          comparisons: 0,
        },
      },
    };
  }

  // run N parallel extractions (each with unique attempt for cache separation)
  const extractions = await Promise.all(
    Array.from({ length: runs }, (_, attempt) =>
      extractKernels({
        content: input.content,
        brainSlug: input.brainSlug,
        attempt,
        force: input.force,
      }),
    ),
  );

  // collect all kernels with their source run index (prefixed ids)
  const allKernels: Array<{ kernel: ConceptKernel; runIndex: number }> = [];
  extractions.forEach((result, runIndex) => {
    // defensive: result.kernels may be undefined if extraction failed
    (result.kernels ?? []).forEach((kernel) => {
      allKernels.push({
        kernel: { ...kernel, id: `r${runIndex}_${kernel.id}` },
        runIndex,
      });
    });
  });

  // cluster via brain (semantic similarity, not word overlap)
  const clusterResult = await clusterKernels({
    kernels: allKernels.map((ak) => ak.kernel),
    brainSlug: input.brainSlug,
    force: input.force,
  });

  // build id → runIndex map
  const idToRunIndex = new Map(
    allKernels.map((ak) => [ak.kernel.id, ak.runIndex]),
  );

  // keep clusters that appear in majority of runs
  const minAppearances = Math.ceil(runs * threshold);
  const consensusKernels: ConsensusKernel[] = [];

  // track which clusters each run contributed to (for stability calc)
  const runToClusterIds: Map<number, Set<number>> = new Map();
  for (let i = 0; i < runs; i++) {
    runToClusterIds.set(i, new Set());
  }

  for (
    let clusterIndex = 0;
    clusterIndex < clusterResult.clusters.length;
    clusterIndex++
  ) {
    const cluster = clusterResult.clusters[clusterIndex]!;

    // count unique runs this cluster spans
    const runsInCluster = new Set(
      cluster.members
        .map((m) => idToRunIndex.get(m.id))
        .filter((r): r is number => r !== undefined),
    );

    // track cluster membership per run
    for (const runIndex of runsInCluster) {
      runToClusterIds.get(runIndex)?.add(clusterIndex);
    }

    if (runsInCluster.size >= minAppearances) {
      // collect all variant phrasings from cluster members
      const variants = cluster.members
        .map((m) => ({
          run: idToRunIndex.get(m.id) ?? -1,
          concept: m.concept,
        }))
        .filter((v) => v.run >= 0);

      // use representative with clean id, plus variants
      consensusKernels.push({
        ...cluster.representative,
        id: `k${consensusKernels.length + 1}`,
        variants,
        coverage: runsInCluster.size,
      });
    }
  }

  // compute pairwise Jaccard stability between runs
  const jaccardScores: number[] = [];
  for (let i = 0; i < runs; i++) {
    for (let j = i + 1; j < runs; j++) {
      const setA = runToClusterIds.get(i) ?? new Set();
      const setB = runToClusterIds.get(j) ?? new Set();

      const intersection = new Set([...setA].filter((x) => setB.has(x)));
      const union = new Set([...setA, ...setB]);

      const jaccard = union.size > 0 ? intersection.size / union.size : 1;
      jaccardScores.push(jaccard);
    }
  }

  const stability: ConsensusStability = {
    meanJaccard:
      jaccardScores.length > 0
        ? jaccardScores.reduce((a, b) => a + b, 0) / jaccardScores.length
        : 1,
    minJaccard: jaccardScores.length > 0 ? Math.min(...jaccardScores) : 1,
    maxJaccard: jaccardScores.length > 0 ? Math.max(...jaccardScores) : 1,
    comparisons: jaccardScores.length,
  };

  return {
    kernels: consensusKernels,
    rationale: `consensus from ${runs} parallel extractions (threshold: ${threshold * 100}%)`,
    kernelCount: consensusKernels.length,
    consensus: { runs, threshold, stability },
  };
};

/**
 * .what = check which source kernels are retained in compressed content
 * .why = measure retention by presence of each source kernel in output
 *
 * key insight: we don't extract new kernels from compressed — we check
 * if each source kernel's concept is preserved, even if rephrased
 */
export const checkKernelRetention = async (input: {
  kernels: ConceptKernel[];
  compressed: string;
  brainSlug: string;
}): Promise<{
  retained: ConceptKernel[];
  lost: ConceptKernel[];
  retentionScore: number;
  rationale: string;
}> => {
  // handle empty cases
  if (input.kernels.length === 0) {
    return {
      retained: [],
      lost: [],
      retentionScore: 1,
      rationale: 'no kernels to check',
    };
  }

  if (!input.compressed.trim()) {
    return {
      retained: [],
      lost: input.kernels,
      retentionScore: 0,
      rationale: 'compressed content is empty',
    };
  }

  // resolve brain
  const contextBrain = await genContextBrain({
    choice: { atom: input.brainSlug },
  });

  // schema for retention check
  const retentionSchema = z.object({
    checks: z
      .array(
        z.object({
          kernelId: z.string().describe('id of the source kernel'),
          retained: z
            .boolean()
            .describe(
              'true if this concept is present in the compressed version (even if rephrased)',
            ),
          evidence: z
            .string()
            .nullable()
            .describe(
              'quote or paraphrase from compressed that preserves this concept, or null if lost',
            ),
        }),
      )
      .describe('retention check for each source kernel'),
    rationale: z.string().describe('brief explanation of retention assessment'),
  });

  // format kernels for prompt
  const kernelList = input.kernels
    .map((k) => `- [${k.id}] ${k.concept}`)
    .join('\n');

  const prompt = `check if each source kernel is retained in the compressed document.

a kernel is RETAINED if:
- the same concept is expressed, even if rephrased
- the core intent is preserved, even if condensed
- the principle/rule/pattern is still communicable from the text

a kernel is LOST if:
- the concept is completely absent
- only tangential mentions remain without the core idea

SOURCE KERNELS:
${kernelList}

COMPRESSED DOCUMENT:
${input.compressed}`;

  const { output } = await withTimeout(
    async () =>
      contextBrain.brain.choice.ask({
        role: { briefs: [] },
        prompt,
        schema: { output: retentionSchema },
      }),
    { threshold: { seconds: 60 } },
  )();

  // map results back to kernels
  const checkMap = new Map(output.checks.map((c) => [c.kernelId, c.retained]));

  const retained: ConceptKernel[] = [];
  const lost: ConceptKernel[] = [];

  for (const kernel of input.kernels) {
    if (checkMap.get(kernel.id) === true) {
      retained.push(kernel);
    } else {
      lost.push(kernel);
    }
  }

  const retentionScore =
    input.kernels.length > 0 ? retained.length / input.kernels.length : 1;

  return {
    retained,
    lost,
    retentionScore: Math.round(retentionScore * 100) / 100,
    rationale: output.rationale,
  };
};

/**
 * .what = compare kernels between original and compressed documents
 * .why = measure retention by count of kernels present in both
 *
 * @deprecated use extractKernels + checkKernelRetention instead for cleaner separation
 */
export const compareKernels = async (input: {
  contentOriginal: string;
  contentCompressed: string;
  brainSlug: string;
}): Promise<{
  kernelsOriginal: ConceptKernel[];
  kernelsCompressed: ConceptKernel[];
  kernelsRetained: string[];
  kernelsLost: string[];
  retentionRatio: number;
  rationale: string;
}> => {
  // resolve brain
  const contextBrain = await genContextBrain({
    choice: { atom: input.brainSlug },
  });

  // schema for comparison output
  const comparisonSchema = z.object({
    kernelsOriginal: z
      .array(
        z.object({
          id: z.string(),
          concept: z.string(),
        }),
      )
      .describe('distinct concept kernels in the original document'),
    kernelsCompressed: z
      .array(
        z.object({
          id: z.string(),
          concept: z.string(),
          matchesOriginal: z
            .string()
            .nullable()
            .describe('id of the original kernel this matches, or null if new'),
        }),
      )
      .describe('distinct concept kernels in the compressed document'),
    rationale: z
      .string()
      .describe('explanation of kernel identification and match'),
  });

  // single call to extract kernels from both and compare
  const prompt = `analyze both documents and identify distinct concept kernels.

rules:
- a concept kernel is a distinct, atomic idea, rule, or principle
- if the same concept appears multiple times in a document, count it only once
- examples that illustrate a concept do not count as separate kernels
- for the compressed document, indicate which original kernel each matches (if any)

ORIGINAL DOCUMENT:

${input.contentOriginal}

---

COMPRESSED DOCUMENT:

${input.contentCompressed}`;

  const { output } = await withTimeout(
    async () =>
      contextBrain.brain.choice.ask({
        role: { briefs: [] },
        prompt,
        schema: { output: comparisonSchema },
      }),
    { threshold: { seconds: 90 } },
  )();

  // compute retention metrics
  const originalIds = new Set(output.kernelsOriginal.map((k) => k.id));
  const retainedIds = output.kernelsCompressed
    .filter((k) => k.matchesOriginal !== null)
    .map((k) => k.matchesOriginal as string);
  const retainedSet = new Set(retainedIds);
  const lostIds = [...originalIds].filter((id) => !retainedSet.has(id));

  const retentionRatio =
    originalIds.size > 0 ? retainedSet.size / originalIds.size : 1;

  return {
    kernelsOriginal: output.kernelsOriginal.map((k) => ({
      ...k,
      category: 'principle' as const,
    })),
    kernelsCompressed: output.kernelsCompressed.map((k) => ({
      id: k.id,
      concept: k.concept,
      category: 'principle' as const,
    })),
    kernelsRetained: [...retainedSet],
    kernelsLost: lostIds,
    retentionRatio: Math.round(retentionRatio * 100) / 100,
    rationale: output.rationale,
  };
};
