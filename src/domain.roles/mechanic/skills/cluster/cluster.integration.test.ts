import { given, then, useThen, when } from 'test-fns';

import { clusterKernels } from '../../../../domain.operations/kernelize/clusterKernels';
import type { ConceptKernel } from '../../../../domain.operations/kernelize/extractKernels';

const BRAIN_SLUG = 'xai/grok/code-fast-1';

describe('clusterKernels', () => {
  given('[case1] kernels with semantically equivalent pairs', () => {
    const kernels: ConceptKernel[] = [
      {
        id: 'k1',
        concept: 'dependency injection via context argument',
        category: 'principle',
      },
      {
        id: 'k2',
        concept: 'pass dependencies through the context parameter',
        category: 'principle',
      },
      {
        id: 'k3',
        concept: 'use arrow functions for all procedures',
        category: 'rule',
      },
      {
        id: 'k4',
        concept: 'arrow syntax is required for function declarations',
        category: 'rule',
      },
      {
        id: 'k5',
        concept: 'input must be a destructurable object',
        category: 'rule',
      },
    ];

    when('[t0] cluster is invoked', () => {
      const result = useThen('it succeeds', async () =>
        clusterKernels({ kernels, brainSlug: BRAIN_SLUG }),
      );

      then('cluster count is less than kernel count', () => {
        expect(result.clusterCount).toBeLessThan(kernels.length);
      });

      then('cluster count is at least 1', () => {
        expect(result.clusterCount).toBeGreaterThanOrEqual(1);
      });

      then('each cluster has a representative', () => {
        for (const cluster of result.clusters) {
          expect(cluster.representative).toBeDefined();
          expect(cluster.representative.concept).toBeDefined();
        }
      });

      then('each cluster has at least one member', () => {
        for (const cluster of result.clusters) {
          expect(cluster.memberCount).toBeGreaterThanOrEqual(1);
        }
      });

      then('rationale is provided', () => {
        expect(result.rationale).toBeDefined();
        expect(result.rationale.length).toBeGreaterThan(0);
      });

      then('result matches snapshot', () => {
        expect({
          clusterCount: result.clusterCount,
          clusterSizes: result.clusters.map((c) => c.memberCount),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case2] empty kernel list', () => {
    const kernels: ConceptKernel[] = [];

    when('[t0] cluster is invoked', () => {
      const result = useThen('it succeeds', async () =>
        clusterKernels({ kernels, brainSlug: BRAIN_SLUG }),
      );

      then('cluster count is 0', () => {
        expect(result.clusterCount).toEqual(0);
      });

      then('clusters array is empty', () => {
        expect(result.clusters).toHaveLength(0);
      });
    });
  });

  given('[case3] single kernel', () => {
    const kernels: ConceptKernel[] = [
      { id: 'k1', concept: 'use arrow functions', category: 'rule' },
    ];

    when('[t0] cluster is invoked', () => {
      const result = useThen('it succeeds', async () =>
        clusterKernels({ kernels, brainSlug: BRAIN_SLUG }),
      );

      then('cluster count is 1', () => {
        expect(result.clusterCount).toEqual(1);
      });

      then('single cluster has member count of 1', () => {
        expect(result.clusters[0]?.memberCount).toEqual(1);
      });
    });
  });

  given('[case4] all distinct kernels', () => {
    const kernels: ConceptKernel[] = [
      { id: 'k1', concept: 'use arrow functions', category: 'rule' },
      { id: 'k2', concept: 'input must be destructurable', category: 'rule' },
      {
        id: 'k3',
        concept: 'dependencies go in context',
        category: 'principle',
      },
    ];

    when('[t0] cluster is invoked', () => {
      const result = useThen('it succeeds', async () =>
        clusterKernels({ kernels, brainSlug: BRAIN_SLUG }),
      );

      then('cluster count equals kernel count', () => {
        // each distinct kernel should be its own cluster
        expect(result.clusterCount).toEqual(kernels.length);
      });

      then('each cluster has exactly 1 member', () => {
        for (const cluster of result.clusters) {
          expect(cluster.memberCount).toEqual(1);
        }
      });
    });
  });
});
