import { given, then, useThen, when } from 'test-fns';

import { countTokens } from '../../../brief.compress/compress.shared';
import type { compressViaBhrain } from '../../../brief.compress/compress.via.bhrain';
import { pressViaPipeline } from './pressViaPipeline';

const BRAIN_SLUG = 'openrouter/deepseek/flash';

// an inline brief; the fake never reads its sense, so any prose proves the contract
const BRIEF_CONTENT = [
  '# rule.require.wave-report-tide',
  '',
  'every wave report must name the tide at the spot, low or high or mid.',
  'a surf lesson must name the board kind, foamboard for a first-time surfer.',
  'a named tide lets a seaturtle pick the right reef pass before it paddles out.',
  'a reviewer should flag any wave report that omits its tide as a blocker.',
].join('\n');

/**
 * .what = keep the first half of the words of a text
 * .why = the fake compressor's whole transform, pure, so a test can predict each step's output
 */
const asFirstHalfOfWords = (input: { text: string }): string => {
  const words = input.text.split(' ');
  return words.slice(0, Math.ceil(words.length / 2)).join(' ');
};

/**
 * .what = a deterministic stand-in for compressViaBhrain that keeps the first half of the words
 * .why = proves the pipeline's own contract (thread, order, kernels, token counts) with no brain
 * .note = deliberate mutation: `calls` is an append-only log of each input, read by the asserts
 */
const genFakeCompressor = () => {
  const calls: Parameters<typeof compressViaBhrain>[0][] = [];
  const compressor: typeof compressViaBhrain = async (input) => {
    calls.push(input);
    const compressed = asFirstHalfOfWords({ text: input.content });
    const tokensBefore = await countTokens({ text: input.content });
    const tokensAfter = await countTokens({ text: compressed });
    return {
      compressed,
      forethought: 'fake',
      rationale: 'fake',
      tokensBefore,
      tokensAfter,
      ratio: Math.round((tokensBefore / tokensAfter) * 100) / 100,
    };
  };
  return { calls, compressor };
};

describe('pressViaPipeline', () => {
  given('[case1] a fake compressor that halves its input', () => {
    when('[t0] a single-step pipeline runs', () => {
      const fake = genFakeCompressor();
      const result = useThen('compression succeeds', async () =>
        pressViaPipeline(
          {
            content: BRIEF_CONTENT,
            brainSlug: BRAIN_SLUG,
            pipeline: [['sitrep-aggressive']],
            kernels: [],
            force: false,
          },
          { compressor: fake.compressor },
        ),
      );

      then('tokens.after < tokens.before', () => {
        expect(result.tokens.after).toBeLessThan(result.tokens.before);
      });

      then('steps array has 1 entry, with its mechanisms', () => {
        expect(result.steps).toHaveLength(1);
        expect(result.steps[0]?.mechanisms).toEqual(['sitrep-aggressive']);
      });

      then('the compressor got the content, brain, and mechanisms', () => {
        expect(fake.calls).toHaveLength(1);
        expect(fake.calls[0]?.content).toEqual(BRIEF_CONTENT);
        expect(fake.calls[0]?.brainSlug).toEqual(BRAIN_SLUG);
        expect(fake.calls[0]?.mechanisms).toEqual(['sitrep-aggressive']);
      });

      then('output content is non-empty', () => {
        expect(result.content.length).toBeGreaterThan(0);
      });
    });

    when('[t1] a multi-step pipeline runs', () => {
      const fake = genFakeCompressor();
      const result = useThen('compression succeeds', async () =>
        pressViaPipeline(
          {
            content: BRIEF_CONTENT,
            brainSlug: BRAIN_SLUG,
            pipeline: [['sitrep-aggressive'], ['telegraphic']],
            kernels: [],
            force: false,
          },
          { compressor: fake.compressor },
        ),
      );

      then('step 1 receives the output of step 0', () => {
        expect(fake.calls).toHaveLength(2);
        expect(fake.calls[1]?.content).toEqual(
          asFirstHalfOfWords({ text: BRIEF_CONTENT }),
        );
      });

      then('the final content is the output of step 1', () => {
        expect(result.content).toEqual(
          asFirstHalfOfWords({
            text: asFirstHalfOfWords({ text: BRIEF_CONTENT }),
          }),
        );
      });

      then('steps record the mechanisms in pipeline order', () => {
        expect(result.steps.map((step) => step.mechanisms)).toEqual([
          ['sitrep-aggressive'],
          ['telegraphic'],
        ]);
      });

      then('step 1 starts from the token count step 0 produced', () => {
        expect(result.steps[1]?.tokensBefore).toEqual(
          result.steps[0]?.tokensAfter,
        );
      });

      then('overall compression achieved', () => {
        expect(result.tokens.after).toBeLessThan(result.tokens.before);
      });
    });

    when('[t2] a req-kernels pipeline runs with two kernels', () => {
      const fake = genFakeCompressor();
      const kernels = [
        {
          id: 'k1',
          concept: 'every wave report must name the tide',
          category: 'rule' as const,
        },
        {
          id: 'k2',
          concept: 'a first-time surfer rides a foamboard',
          category: 'rule' as const,
        },
      ];
      const result = useThen('compression succeeds', async () =>
        pressViaPipeline(
          {
            content: BRIEF_CONTENT,
            brainSlug: BRAIN_SLUG,
            pipeline: [['req-kernels', 'sitrep-aggressive']],
            kernels,
            force: false,
          },
          { compressor: fake.compressor },
        ),
      );

      then('the step receives the kernel concept strings', () => {
        expect(fake.calls[0]?.kernels).toEqual([
          'every wave report must name the tide',
          'a first-time surfer rides a foamboard',
        ]);
      });

      then('the step mechanisms contain req-kernels', () => {
        expect(result.steps[0]?.mechanisms).toContain('req-kernels');
      });

      then('tokens.after < tokens.before', () => {
        expect(result.tokens.after).toBeLessThan(result.tokens.before);
      });
    });

    when('[t3] force is passed', () => {
      const fake = genFakeCompressor();
      useThen('compression succeeds', async () =>
        pressViaPipeline(
          {
            content: BRIEF_CONTENT,
            brainSlug: BRAIN_SLUG,
            pipeline: [['sitrep-aggressive'], ['telegraphic']],
            kernels: [],
            force: true,
          },
          { compressor: fake.compressor },
        ),
      );

      then('each step passes force to the compressor', () => {
        expect(fake.calls.map((call) => call.force)).toEqual([true, true]);
      });
    });
  });

  given('[case2] empty content', () => {
    when('[t0] a pipeline runs on it', () => {
      const fake = genFakeCompressor();
      const result = useThen('returns empty output', async () =>
        pressViaPipeline(
          {
            content: '',
            brainSlug: BRAIN_SLUG,
            pipeline: [['sitrep-aggressive']],
            kernels: [],
            force: false,
          },
          { compressor: fake.compressor },
        ),
      );

      then('tokens are 0 before and after', () => {
        expect(result.tokens).toEqual({ before: 0, after: 0 });
      });

      then('steps array is empty', () => {
        expect(result.steps).toHaveLength(0);
      });

      then('the compressor is never called', () => {
        expect(fake.calls).toHaveLength(0);
      });
    });
  });

  given('[case3] an empty pipeline', () => {
    when('[t0] it runs on content', () => {
      const fake = genFakeCompressor();
      const result = useThen('returns original content', async () =>
        pressViaPipeline(
          {
            content: 'some content here',
            brainSlug: BRAIN_SLUG,
            pipeline: [],
            kernels: [],
            force: false,
          },
          { compressor: fake.compressor },
        ),
      );

      then('content is unchanged', () => {
        expect(result.content).toEqual('some content here');
      });

      then('tokens.before equals tokens.after', () => {
        expect(result.tokens.before).toEqual(result.tokens.after);
      });

      then('steps array is empty', () => {
        expect(result.steps).toHaveLength(0);
      });

      then('the compressor is never called', () => {
        expect(fake.calls).toHaveLength(0);
      });
    });
  });
});
