import { createCache } from 'simple-on-disk-cache';
import { genTempDir, given, then, useThen, when } from 'test-fns';
import { withSimpleCacheAsync } from 'with-simple-cache';

/**
 * .what = clamp: an on-disk cache wrapped by with-simple-cache returns the object the logic made
 * .why = with-simple-cache 0.17 dropped its json value serde (the default is now a no-op), and
 *        simple-on-disk-cache stores and returns strings. a wrapper with no explicit value serde
 *        then hands back a json string, so `result.compressed` reads undefined. this repo's
 *        compressViaBhrain, extractKernels, and clusterKernels wrap this exact pair, so each one
 *        declares `serialize.value` + `deserialize.value`; this suite pins that the pair needs it
 */
describe('compress cache serde', () => {
  given(
    '[case1] an on-disk cache wrapped with explicit json value serde',
    () => {
      when('[t0] a cached logic runs twice on one input', () => {
        const result = useThen('both calls run', async () => {
          const cache = createCache({
            directory: {
              local: { path: genTempDir({ slug: 'compress-cache-serde' }) },
            },
          });
          const compress = withSimpleCacheAsync(
            async (input: { content: string }) => ({
              compressed: `short:${input.content}`,
              tokensAfter: 1,
            }),
            {
              cache,
              deserialize: { value: (cached: string) => JSON.parse(cached) },
              serialize: {
                value: (output: { compressed: string; tokensAfter: number }) =>
                  JSON.stringify(output),
                key: (input: { content: string }) => `wave-${input.content}`,
              },
            },
          );
          return {
            miss: await compress({ content: 'wave' }),
            hit: await compress({ content: 'wave' }),
          };
        });
        then('the miss returns the object, not a json string', () => {
          expect(typeof result.miss).toBe('object');
          expect(result.miss.compressed).toBe('short:wave');
        });
        then('the hit returns the same object', () => {
          expect(result.hit).toEqual(result.miss);
        });
      });
    },
  );
});
