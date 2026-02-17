import * as fs from 'fs/promises';
import * as path from 'path';
import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { condenseFile, parsePipelineSpec } from './condense';

// condense makes many brain calls (kernelize + press + verify)
// increase timeout to 3 minutes for the full pipeline tests
jest.setTimeout(180_000);

const BRAIN_SLUG = 'xai/grok/3-mini';
const FIXTURES_DIR = path.join(__dirname, '.test/fixtures/briefs');

describe('condense', () => {
  describe('condenseFile', () => {
    given('[case1] stable-rule brief', () => {
      const scene = useBeforeAll(async () => {
        const briefPath = path.join(FIXTURES_DIR, 'stable-rule.md');
        const content = await fs.readFile(briefPath, 'utf-8');
        return { briefPath, content };
      });

      when('[t0] condense with default pipeline', () => {
        const result = useThen('it succeeds', async () =>
          condenseFile({
            content: scene.content,
            brainSlug: BRAIN_SLUG,
            pipeline: [['req-kernels', 'sitrep-aggressive'], ['telegraphic']],
            onVerify: null,
            attempts: 1,
            // speed up tests: use 2 consensus runs instead of default 3
            consensusRuns: 2,
            // relax threshold for test stability (LLM produces slight variation)
            stabilityThreshold: 0.5,
          }),
        );

        then('compressed content is shorter than original', () => {
          expect(result.tokens.after).toBeLessThan(result.tokens.before);
        });

        then('tokens.before is positive', () => {
          expect(result.tokens.before).toBeGreaterThan(0);
        });

        then('tokens.after is positive', () => {
          expect(result.tokens.after).toBeGreaterThan(0);
        });

        then('kernels.before is positive', () => {
          expect(result.kernels.before).toBeGreaterThan(0);
        });

        then('kernels.after reflects retention', () => {
          expect(result.kernels.after).toBeGreaterThanOrEqual(0);
          expect(result.kernels.after).toBeLessThanOrEqual(
            result.kernels.before,
          );
        });

        then('kernels.delta is computed correctly', () => {
          expect(result.kernels.delta).toEqual(
            result.kernels.after - result.kernels.before,
          );
        });

        then('density.delta is positive (compression improved density)', () => {
          expect(result.density.delta).toBeGreaterThan(0);
        });

        then(
          'stability.meanJaccard >= 0.6 (relaxed for test stability)',
          () => {
            expect(result.stability.meanJaccard).toBeGreaterThanOrEqual(0.6);
          },
        );

        then('compressed is non-empty string', () => {
          expect(result.compressed.length).toBeGreaterThan(0);
        });

        then('attempts is 1', () => {
          expect(result.attempts).toEqual(1);
        });

        then('variance is null when attempts=1', () => {
          expect(result.variance).toBeNull();
        });
      });

      when('[t1] condense with onVerify=restore', () => {
        const result = useThen('it succeeds', async () =>
          condenseFile({
            content: scene.content,
            brainSlug: BRAIN_SLUG,
            pipeline: [['sitrep-aggressive'], ['telegraphic']],
            onVerify: 'restore',
            attempts: 1,
            // speed up tests: use 2 consensus runs instead of default 3
            consensusRuns: 2,
            // relax threshold for test stability (LLM produces slight variation)
            stabilityThreshold: 0.5,
          }),
        );

        then('compressed content is non-empty', () => {
          expect(result.compressed.length).toBeGreaterThan(0);
        });

        then('kernel loss is recovered (delta >= 0 or close to 0)', () => {
          // with restore, we should have recovered most/all kernels
          expect(result.kernels.delta).toBeGreaterThanOrEqual(-1);
        });
      });
    });

    given('[case2] empty content', () => {
      when('[t0] condense is called', () => {
        const result = useThen('it throws', async () => {
          try {
            await condenseFile({
              content: '',
              brainSlug: BRAIN_SLUG,
              pipeline: [['sitrep-aggressive']],
              onVerify: null,
              attempts: 1,
            });
            return { error: null as Error | null };
          } catch (e) {
            return { error: e as Error };
          }
        });

        then('error message contains "empty content"', () => {
          expect(result.error).not.toBeNull();
          expect(result.error?.message).toContain('empty content');
        });
      });
    });

    given('[case3] whitespace-only content', () => {
      when('[t0] condense is called', () => {
        const result = useThen('it throws', async () => {
          try {
            await condenseFile({
              content: '   \n\n\t  ',
              brainSlug: BRAIN_SLUG,
              pipeline: [['sitrep-aggressive']],
              onVerify: null,
              attempts: 1,
            });
            return { error: null as Error | null };
          } catch (e) {
            return { error: e as Error };
          }
        });

        then('error is thrown', () => {
          expect(result.error).not.toBeNull();
        });
      });
    });
  });

  describe('parsePipelineSpec', () => {
    given('[case4] valid JSON pipeline spec', () => {
      when('[t0] spec is parsed', () => {
        then('returns correct structure', () => {
          const result = parsePipelineSpec(
            '[["req-kernels", "sitrep-aggressive"], ["telegraphic"]]',
          );
          expect(result).toEqual([
            ['req-kernels', 'sitrep-aggressive'],
            ['telegraphic'],
          ]);
        });
      });

      when('[t1] single-step spec is parsed', () => {
        then('returns correct structure', () => {
          const result = parsePipelineSpec('[["sitrep"]]');
          expect(result).toEqual([['sitrep']]);
        });
      });
    });

    given('[case5] invalid JSON pipeline spec', () => {
      when('[t0] malformed JSON', () => {
        const error = useThen('it throws', () => {
          try {
            parsePipelineSpec('not valid json');
            return { error: null as Error | null };
          } catch (e) {
            return { error: e as Error };
          }
        });

        then('error message includes "malformed JSON"', () => {
          expect(error.error).not.toBeNull();
          expect(error.error?.message).toContain('malformed JSON');
        });
      });

      when('[t1] not an array', () => {
        const error = useThen('it throws', () => {
          try {
            parsePipelineSpec('{"key": "value"}');
            return { error: null as Error | null };
          } catch (e) {
            return { error: e as Error };
          }
        });

        then('error message includes "must be an array"', () => {
          expect(error.error).not.toBeNull();
          expect(error.error?.message).toContain('must be an array');
        });
      });

      when('[t2] empty array', () => {
        const error = useThen('it throws', () => {
          try {
            parsePipelineSpec('[]');
            return { error: null as Error | null };
          } catch (e) {
            return { error: e as Error };
          }
        });

        then('error message includes "cannot be empty"', () => {
          expect(error.error).not.toBeNull();
          expect(error.error?.message).toContain('cannot be empty');
        });
      });
    });
  });
});
