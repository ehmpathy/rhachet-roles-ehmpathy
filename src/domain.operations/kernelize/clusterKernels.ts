#!/usr/bin/env npx tsx

/**
 * .what = cluster semantically similar kernels via brain
 * .why = word-based jaccard fails on synonyms and rephrases — brain understands semantics
 *
 * example:
 * - "dependency injection via context" and "pass dependencies through context parameter"
 * - word jaccard: low overlap (different words)
 * - brain: same concept (high semantic similarity)
 */

import { genContextBrain } from 'rhachet';
import { withTimeout } from 'wrapper-fns';
import { z } from 'zod';

import type { ConceptKernel } from './extractKernels';

/**
 * .what = a cluster of semantically similar kernels
 * .why = group kernels that express the same concept in different words
 */
export interface KernelCluster {
  representative: ConceptKernel;
  members: ConceptKernel[];
  memberCount: number;
}

/**
 * .what = result of brain-driven cluster operation
 * .why = structured output for downstream process
 */
export interface ClusterResult {
  clusters: KernelCluster[];
  clusterCount: number;
  rationale: string;
}

/**
 * .what = schema for brain cluster output
 * .why = structured output for reliable json parse
 */
const clusterSchema = z.object({
  clusters: z
    .array(
      z.object({
        representativeId: z
          .string()
          .describe(
            'id of the kernel that best represents this cluster (most clear/complete)',
          ),
        memberIds: z
          .array(z.string())
          .describe(
            'ids of all kernels in this cluster (representative included)',
          ),
      }),
    )
    .describe('clusters of semantically equivalent kernels'),
  rationale: z
    .string()
    .describe('brief explanation of how clusters were formed'),
});

/**
 * .what = cluster semantically similar kernels via brain
 * .why = brain understands semantic equivalence beyond word overlap
 *
 * each kernel appears in exactly one cluster
 * a kernel alone forms a cluster of size 1
 */
export const clusterKernels = async (input: {
  kernels: ConceptKernel[];
  brainSlug: string;
}): Promise<ClusterResult> => {
  // handle empty or single kernel
  if (input.kernels.length === 0) {
    return {
      clusters: [],
      clusterCount: 0,
      rationale: 'no kernels to cluster',
    };
  }

  if (input.kernels.length === 1) {
    return {
      clusters: [
        {
          representative: input.kernels[0]!,
          members: [input.kernels[0]!],
          memberCount: 1,
        },
      ],
      clusterCount: 1,
      rationale: 'single kernel forms its own cluster',
    };
  }

  // resolve brain
  const contextBrain = await genContextBrain({
    choice: { atom: input.brainSlug },
  });

  // format kernels for prompt
  const kernelList = input.kernels
    .map((k) => `- [${k.id}] ${k.concept}`)
    .join('\n');

  const prompt = `cluster these kernels by semantic equivalence.

rules:
- two kernels are in the same cluster if they express the SAME core concept
- rephrased versions of the same idea belong together
- synonyms and alternative wordings belong together
- distinct but related concepts are DIFFERENT clusters
- each kernel appears in exactly one cluster
- choose the clearest/most complete kernel as representative
- use the exact id shown in brackets for each kernel

kernels:
${kernelList}`;

  // ask brain to cluster
  const { output } = await withTimeout(
    async () =>
      contextBrain.brain.choice.ask({
        role: { briefs: [] },
        prompt,
        schema: { output: clusterSchema },
      }),
    { threshold: { seconds: 60 } },
  )();

  // build kernel map for lookup (exact id and suffix fallback)
  const kernelMap = new Map(input.kernels.map((k) => [k.id, k]));

  // fallback: find kernel by suffix match when exact match fails
  const findKernel = (id: string): ConceptKernel | undefined => {
    // exact match first
    const exact = kernelMap.get(id);
    if (exact) return exact;

    // fallback: check if any kernel id ends with this id
    for (const kernel of input.kernels) {
      if (kernel.id.endsWith(`_${id}`) || kernel.id === id) {
        return kernel;
      }
    }

    return undefined;
  };

  // convert brain output to ClusterResult
  const clusters: KernelCluster[] = [];

  for (const brainCluster of output.clusters) {
    const representative = findKernel(brainCluster.representativeId);
    if (!representative) continue;

    const members = brainCluster.memberIds
      .map((id) => findKernel(id))
      .filter((k): k is ConceptKernel => k !== undefined);

    clusters.push({
      representative,
      members,
      memberCount: members.length,
    });
  }

  return {
    clusters,
    clusterCount: clusters.length,
    rationale: output.rationale,
  };
};

/**
 * .what = merge kernel lists and cluster via brain
 * .why = consensus mode collects kernels from N runs, then clusters to find agreement
 */
export const mergeAndClusterKernels = async (input: {
  kernelSets: ConceptKernel[][];
  brainSlug: string;
}): Promise<ClusterResult & { sourceSetCount: number }> => {
  const sourceSetCount = input.kernelSets.length;

  // flatten all kernels with unique ids
  const allKernels: ConceptKernel[] = [];
  input.kernelSets.forEach((set, setIndex) => {
    set.forEach((kernel) => {
      allKernels.push({
        ...kernel,
        // prefix id to avoid collisions across sets
        id: `s${setIndex}_${kernel.id}`,
      });
    });
  });

  // cluster via brain
  const result = await clusterKernels({
    kernels: allKernels,
    brainSlug: input.brainSlug,
  });

  return {
    ...result,
    sourceSetCount,
  };
};
