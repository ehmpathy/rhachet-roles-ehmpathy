import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import type { ConceptKernel } from '../../../../../../domain.operations/kernelize/extractKernels';
import { restoreKernels } from './restoreKernels';

const BRAIN_SLUG = 'xai/grok/3-mini';

describe('restoreKernels', () => {
  given('[case1] compressed content with lost kernels', () => {
    // use a realistic compressed content that lacks some concepts
    // this simulates what aggressive compression might produce
    const scene = useBeforeAll(async () => {
      const compressedContent = `# explicit return types

export functions: explicit return type annotations required.

scope: prod exports, async with Promise<T>, void explicit.

examples:
\`\`\`ts
// good
export const getUser = async (input): Promise<User | null> => {...};
export const validate = (input): boolean => {...};

// bad - no return type, any return
\`\`\`

enforcement: BLOCKER`;

      // define kernels that were "lost" in compression
      const lostKernels: ConceptKernel[] = [
        {
          id: 'k1',
          concept: 'all exported functions must have explicit return types',
          category: 'rule' as const,
        },
        {
          id: 'k2',
          concept: 'async functions must specify Promise<T>',
          category: 'rule' as const,
        },
      ];

      return { compressedContent, lostKernels };
    });

    when('[t0] kernels are restored', () => {
      const result = useThen('restoration succeeds', async () =>
        restoreKernels({
          content: scene.compressedContent,
          lostKernels: scene.lostKernels,
          brainSlug: BRAIN_SLUG,
        }),
      );

      then('output content is non-empty', () => {
        expect(result.content.length).toBeGreaterThan(0);
      });

      then('restored array matches input lostKernels', () => {
        expect(result.restored).toHaveLength(scene.lostKernels.length);
        expect(result.restored.map((k) => k.id)).toEqual(
          scene.lostKernels.map((k) => k.id),
        );
      });

      then('output contains concept about explicit return types', () => {
        const contentLower = result.content.toLowerCase();
        // check for the concept presence (may be rephrased by brain)
        const hasReturnTypeConcept =
          contentLower.includes('return type') ||
          contentLower.includes('explicit') ||
          contentLower.includes('annotation');
        expect(hasReturnTypeConcept).toEqual(true);
      });

      then(
        'output does NOT mechanically append a "core concepts" section',
        () => {
          const contentLower = result.content.toLowerCase();
          expect(contentLower).not.toContain('## core concepts');
          expect(contentLower).not.toContain('## kernels');
          expect(contentLower).not.toContain('## restored kernels');
          expect(contentLower).not.toContain('## key concepts');
        },
      );

      then('output is prose, not a list of concepts', () => {
        // check that output is not just bullet points of concepts
        const lines = result.content.split('\n').filter((l) => l.trim());
        const bulletLines = lines.filter(
          (l) => l.trim().startsWith('-') || l.trim().startsWith('*'),
        );
        // most lines should NOT be bullets (it's prose, not a list)
        const bulletRatio = bulletLines.length / lines.length;
        expect(bulletRatio).toBeLessThan(0.8);
      });
    });
  });

  given('[case2] no lost kernels', () => {
    when('[t0] restoration is called with empty lostKernels', () => {
      const result = useThen('restoration returns unchanged', async () =>
        restoreKernels({
          content: 'some compressed content about return types',
          lostKernels: [],
          brainSlug: BRAIN_SLUG,
        }),
      );

      then('content is unchanged', () => {
        expect(result.content).toEqual(
          'some compressed content about return types',
        );
      });

      then('restored is empty', () => {
        expect(result.restored).toHaveLength(0);
      });
    });
  });

  given('[case3] single lost kernel', () => {
    const scene = useBeforeAll(async () => {
      // start with minimal compressed content
      const content = 'functions should have types. async uses Promise.';

      const lostKernels: ConceptKernel[] = [
        {
          id: 'k1',
          concept: 'void functions must explicitly return void',
          category: 'rule' as const,
        },
      ];

      return { content, lostKernels };
    });

    when('[t0] single kernel is restored', () => {
      const result = useThen('restoration succeeds', async () =>
        restoreKernels({
          content: scene.content,
          lostKernels: scene.lostKernels,
          brainSlug: BRAIN_SLUG,
        }),
      );

      then('output mentions void in some form', () => {
        const contentLower = result.content.toLowerCase();
        const hasVoidConcept =
          contentLower.includes('void') || contentLower.includes('return');
        expect(hasVoidConcept).toEqual(true);
      });

      then('restored contains the single kernel', () => {
        expect(result.restored).toHaveLength(1);
        expect(result.restored[0]?.id).toEqual('k1');
      });
    });
  });

  given('[case4] content is woven naturally', () => {
    const scene = useBeforeAll(async () => {
      // minimal brief about one topic
      const content =
        '# return types\n\nexported functions need return types for safety.';

      const lostKernels: ConceptKernel[] = [
        {
          id: 'k1',
          concept: 'async functions must specify Promise<T>',
          category: 'rule' as const,
        },
      ];

      return { content, lostKernels };
    });

    when('[t0] kernel is restored', () => {
      const result = useThen('restoration succeeds', async () =>
        restoreKernels({
          content: scene.content,
          lostKernels: scene.lostKernels,
          brainSlug: BRAIN_SLUG,
        }),
      );

      then('output maintains markdown structure', () => {
        // should still have a header or be coherent prose
        const hasStructure =
          result.content.includes('#') || result.content.split('\n').length > 1;
        expect(hasStructure).toEqual(true);
      });

      then('async/Promise concept is woven into prose', () => {
        const contentLower = result.content.toLowerCase();
        const hasConcept =
          contentLower.includes('async') || contentLower.includes('promise');
        expect(hasConcept).toEqual(true);
      });

      then('no mechanical RESTORE: prefix in output', () => {
        expect(result.content).not.toContain('RESTORE:');
        expect(result.content).not.toContain('restore:');
      });
    });
  });
});
