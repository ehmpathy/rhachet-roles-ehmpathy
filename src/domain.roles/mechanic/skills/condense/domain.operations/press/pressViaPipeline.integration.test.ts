import * as fs from 'fs/promises';
import * as path from 'path';
import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { pressViaPipeline } from './pressViaPipeline';

const BRAIN_SLUG = 'xai/grok/3-mini';

// test fixtures
const FIXTURES_DIR = path.join(__dirname, '../../.test/fixtures/briefs');
const STABLE_BRIEF_PATH = path.join(FIXTURES_DIR, 'stable-rule.md');

describe('pressViaPipeline', () => {
  given('[case1] valid markdown brief', () => {
    const scene = useBeforeAll(async () => {
      const briefContent = await fs.readFile(STABLE_BRIEF_PATH, 'utf-8');
      return { briefContent };
    });

    when('[t0] single-step pipeline', () => {
      const result = useThen('compression succeeds', async () =>
        pressViaPipeline({
          content: scene.briefContent,
          brainSlug: BRAIN_SLUG,
          pipeline: [['sitrep-aggressive']],
        }),
      );

      then('tokens.after < tokens.before', () => {
        expect(result.tokens.after).toBeLessThan(result.tokens.before);
      });

      then('steps array has 1 entry', () => {
        expect(result.steps).toHaveLength(1);
      });

      then('step 0 has correct mechanisms', () => {
        expect(result.steps[0]?.mechanisms).toEqual(['sitrep-aggressive']);
      });

      then('output content is non-empty', () => {
        expect(result.content.length).toBeGreaterThan(0);
      });
    });

    when('[t1] multi-step pipeline', () => {
      const result = useThen('compression succeeds', async () =>
        pressViaPipeline({
          content: scene.briefContent,
          brainSlug: BRAIN_SLUG,
          pipeline: [['sitrep-aggressive'], ['telegraphic']],
        }),
      );

      then('steps array has 2 entries', () => {
        expect(result.steps).toHaveLength(2);
      });

      then('step 0 uses sitrep-aggressive', () => {
        expect(result.steps[0]?.mechanisms).toEqual(['sitrep-aggressive']);
      });

      then('step 1 uses telegraphic', () => {
        expect(result.steps[1]?.mechanisms).toEqual(['telegraphic']);
      });

      then('overall compression achieved', () => {
        expect(result.tokens.after).toBeLessThan(result.tokens.before);
      });
    });

    when('[t2] pipeline with req-kernels modifier', () => {
      const kernels = [
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

      const result = useThen('compression succeeds', async () =>
        pressViaPipeline({
          content: scene.briefContent,
          brainSlug: BRAIN_SLUG,
          pipeline: [['req-kernels', 'sitrep-aggressive']],
          kernels,
        }),
      );

      then('tokens.after < tokens.before', () => {
        expect(result.tokens.after).toBeLessThan(result.tokens.before);
      });

      then('step includes req-kernels in mechanisms', () => {
        expect(result.steps[0]?.mechanisms).toContain('req-kernels');
      });
    });
  });

  given('[case2] empty content', () => {
    when('[t0] empty pipeline input', () => {
      const result = useThen('returns empty output', async () =>
        pressViaPipeline({
          content: '',
          brainSlug: BRAIN_SLUG,
          pipeline: [['sitrep-aggressive']],
        }),
      );

      then('tokens.before is 0', () => {
        expect(result.tokens.before).toEqual(0);
      });

      then('tokens.after is 0', () => {
        expect(result.tokens.after).toEqual(0);
      });

      then('steps array is empty', () => {
        expect(result.steps).toHaveLength(0);
      });
    });
  });

  given('[case3] empty pipeline', () => {
    when('[t0] no compression steps', () => {
      const result = useThen('returns original content', async () =>
        pressViaPipeline({
          content: 'some content here',
          brainSlug: BRAIN_SLUG,
          pipeline: [],
        }),
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
    });
  });
});
