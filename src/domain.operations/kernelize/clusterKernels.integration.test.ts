import { given, then, useThen, when } from 'test-fns';

import { clusterKernels, mergeAndClusterKernels } from './clusterKernels';
import type { ConceptKernel } from './extractKernels';

const BRAIN_SLUG = 'xai/grok/4.1-fast-wout-reason';

describe('clusterKernels', () => {
  given('[case1] kernels that express the same concept', () => {
    const kernels: ConceptKernel[] = [
      {
        id: 'k1',
        concept: 'dependency injection via context parameter',
        category: 'pattern',
      },
      {
        id: 'k2',
        concept: 'pass dependencies through the context argument',
        category: 'pattern',
      },
      { id: 'k3', concept: 'inject deps via context', category: 'pattern' },
      {
        id: 'k4',
        concept: 'arrow functions only, no function keyword',
        category: 'rule',
      },
    ];

    when('[t0] cluster is called', () => {
      const result = useThen('it returns clusters', async () =>
        clusterKernels({ kernels, brainSlug: BRAIN_SLUG }),
      );

      then('it groups semantically similar kernels', () => {
        // k1, k2, k3 should be in one cluster (dependency injection)
        // k4 should be in its own cluster (arrow functions)
        expect(result.clusterCount).toBeLessThanOrEqual(2);
        expect(result.clusterCount).toBeGreaterThanOrEqual(1);
      });

      then('it returns a representative for each cluster', () => {
        for (const cluster of result.clusters) {
          expect(cluster.representative).toBeDefined();
          expect(cluster.representative.id).toBeDefined();
          expect(cluster.representative.concept).toBeDefined();
        }
      });

      then('it returns member count per cluster', () => {
        const totalMembers = result.clusters.reduce(
          (sum, c) => sum + c.memberCount,
          0,
        );
        expect(totalMembers).toEqual(kernels.length);
      });
    });
  });

  given('[case2] kernels with no semantic overlap', () => {
    const kernels: ConceptKernel[] = [
      {
        id: 'k1',
        concept: 'all functions must use arrow syntax',
        category: 'rule',
      },
      { id: 'k2', concept: 'prefer lowercase in all text', category: 'rule' },
      { id: 'k3', concept: 'use iso-price for currency', category: 'pattern' },
    ];

    when('[t0] cluster is called', () => {
      const result = useThen('it returns clusters', async () =>
        clusterKernels({ kernels, brainSlug: BRAIN_SLUG }),
      );

      then('it creates separate clusters for each kernel', () => {
        expect(result.clusterCount).toEqual(3);
      });

      then('each cluster has exactly one member', () => {
        for (const cluster of result.clusters) {
          expect(cluster.memberCount).toEqual(1);
        }
      });
    });
  });

  given('[case3] empty kernel list', () => {
    when('[t0] cluster is called', () => {
      const result = useThen('it returns empty result', async () =>
        clusterKernels({ kernels: [], brainSlug: BRAIN_SLUG }),
      );

      then('clusterCount is 0', () => {
        expect(result.clusterCount).toEqual(0);
      });

      then('clusters array is empty', () => {
        expect(result.clusters).toHaveLength(0);
      });
    });
  });
});

describe('mergeAndClusterKernels', () => {
  given('[case1] kernels from multiple extraction runs', () => {
    const kernelSets: ConceptKernel[][] = [
      [
        {
          id: 'k1',
          concept: 'dependency injection via context',
          category: 'pattern',
        },
        { id: 'k2', concept: 'arrow functions only', category: 'rule' },
      ],
      [
        {
          id: 'k1',
          concept: 'pass dependencies through context parameter',
          category: 'pattern',
        },
        {
          id: 'k2',
          concept: 'use arrow syntax, not function keyword',
          category: 'rule',
        },
        { id: 'k3', concept: 'prefer lowercase text', category: 'rule' },
      ],
    ];

    when('[t0] mergeAndCluster is called', () => {
      const result = useThen('it returns clusters', async () =>
        mergeAndClusterKernels({ kernelSets, brainSlug: BRAIN_SLUG }),
      );

      then('it tracks sourceSetCount', () => {
        expect(result.sourceSetCount).toEqual(2);
      });

      then('it clusters across sets', () => {
        // should merge dep injection from both runs into one cluster
        // should merge arrow functions from both runs into one cluster
        // k3 (lowercase) appears in only one run
        expect(result.clusterCount).toBeGreaterThanOrEqual(2);
        expect(result.clusterCount).toBeLessThanOrEqual(4);
      });
    });
  });
});
