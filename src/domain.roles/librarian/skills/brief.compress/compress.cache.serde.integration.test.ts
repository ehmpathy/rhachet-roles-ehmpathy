import { createCache } from 'simple-on-disk-cache';
import { genTempDir, given, then, useThen, when } from 'test-fns';
import { withSimpleCacheAsync } from 'with-simple-cache';

/**
 * .what = clamp: an on-disk cache wrapped by with-simple-cache returns the object the logic made
 * .why = with-simple-cache's value serde defaults to a no-op, and it re-reads the cache right
 *        after each set. simple-on-disk-cache reads an object value back as its json string, so
 *        a wrapper with no explicit value serde hands back a string and `result.compressed`
 *        reads undefined. (simple-on-disk-cache 1.7.x masked this in-process: its memory layer
 *        returned the raw object; 1.8 reads through to disk.) this repo's compressViaBhrain,
 *        extractKernels, and clusterKernels wrap this exact pair, so each one declares
 *        `serialize.value` + `deserialize.value`; this suite pins that the pair needs it
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
