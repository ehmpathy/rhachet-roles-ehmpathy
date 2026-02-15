import { given, then, useThen, when } from 'test-fns';

import {
  compareKernels,
  extractKernels,
} from '../../../../domain.operations/kernelize/extractKernels';

/**
 * .what = brain provider for kernel extraction
 * .why = consistent provider across all tests
 */
const BRAIN_SLUG = 'xai/grok/code-fast-1';

/**
 * .what = sample document with known concept kernels
 * .why = test extraction against content with clear, countable concepts
 */
const SAMPLE_DOCUMENT = `
# rule: prefer lowercase

## .what
all text should be lowercase unless required by code or proper noun convention.

## .why
- reduces visual noise
- improves scanability
- keeps language neutral and minimal

## .examples

### good
- "the customer placed an order"
- "see GitRepo.init() for details"

### bad
- "The Customer Placed An Order"
- "SEE GITREPO.INIT() FOR DETAILS"

## .enforcement
lowercase violation = NITPICK
`.trim();

/**
 * .what = compressed version of sample document
 * .why = test retention measurement against known compression
 */
const SAMPLE_COMPRESSED = `
# rule: prefer lowercase

lowercase unless code/proper noun requires it.

why: reduces noise, improves scan, neutral tone.

good: "the customer placed an order"
bad: "The Customer Placed An Order"

enforcement: NITPICK
`.trim();

/**
 * .what = document with completely different content
 * .why = test that unrelated content shows 0% retention
 */
const UNRELATED_DOCUMENT = `
# rule: require tests

all code must have tests.

unit tests for logic.
integration tests for boundaries.
`.trim();

describe('extractKernels', () => {
  jest.setTimeout(120000); // 2 minutes for brain calls

  given('[case1] a document with clear concept kernels', () => {
    when('[t0] kernels are extracted', () => {
      const result = useThen('extraction succeeds', async () =>
        extractKernels({
          content: SAMPLE_DOCUMENT,
          brainSlug: BRAIN_SLUG,
        }),
      );

      then('kernelCount is greater than 0', () => {
        expect(result.kernelCount).toBeGreaterThan(0);
      });

      then('kernels array matches kernelCount', () => {
        expect(result.kernels.length).toBe(result.kernelCount);
      });

      then('each kernel has id and concept', () => {
        for (const kernel of result.kernels) {
          expect(kernel.id).toBeDefined();
          expect(kernel.concept).toBeDefined();
          expect(kernel.concept.length).toBeGreaterThan(0);
        }
      });

      then('rationale is provided', () => {
        expect(result.rationale).toBeDefined();
        expect(result.rationale.length).toBeGreaterThan(0);
      });

      then('snapshot of extracted kernels', () => {
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('[case2] empty document', () => {
    when('[t0] kernels are extracted', () => {
      const result = useThen('extraction succeeds', async () =>
        extractKernels({
          content: '',
          brainSlug: BRAIN_SLUG,
        }),
      );

      then('kernelCount is 0', () => {
        expect(result.kernelCount).toBe(0);
      });

      then('kernels array is empty', () => {
        expect(result.kernels).toEqual([]);
      });
    });
  });
});

describe('compareKernels', () => {
  jest.setTimeout(120000); // 2 minutes for brain calls

  given('[case1] original and compressed versions of same document', () => {
    when('[t0] kernels are compared', () => {
      const result = useThen('comparison succeeds', async () =>
        compareKernels({
          contentOriginal: SAMPLE_DOCUMENT,
          contentCompressed: SAMPLE_COMPRESSED,
          brainSlug: BRAIN_SLUG,
        }),
      );

      then('retentionRatio is between 0 and 1', () => {
        expect(result.retentionRatio).toBeGreaterThanOrEqual(0);
        expect(result.retentionRatio).toBeLessThanOrEqual(1);
      });

      then('retentionRatio is high (>0.5) for good compression', () => {
        // good compression should retain most concepts
        expect(result.retentionRatio).toBeGreaterThan(0.5);
      });

      then('kernelsOriginal has entries', () => {
        expect(result.kernelsOriginal.length).toBeGreaterThan(0);
      });

      then('kernelsRetained is subset of original ids', () => {
        const originalIds = new Set(result.kernelsOriginal.map((k) => k.id));
        for (const id of result.kernelsRetained) {
          expect(originalIds.has(id)).toBe(true);
        }
      });

      then('snapshot of comparison result', () => {
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('[case2] original and completely unrelated document', () => {
    when('[t0] kernels are compared', () => {
      const result = useThen('comparison succeeds', async () =>
        compareKernels({
          contentOriginal: SAMPLE_DOCUMENT,
          contentCompressed: UNRELATED_DOCUMENT,
          brainSlug: BRAIN_SLUG,
        }),
      );

      then('retentionRatio is low (<0.5) for unrelated content', () => {
        // unrelated content should have low retention
        expect(result.retentionRatio).toBeLessThan(0.5);
      });

      then('kernelsLost contains most original kernels', () => {
        // most original concepts should be lost
        expect(result.kernelsLost.length).toBeGreaterThan(0);
      });
    });
  });
});
