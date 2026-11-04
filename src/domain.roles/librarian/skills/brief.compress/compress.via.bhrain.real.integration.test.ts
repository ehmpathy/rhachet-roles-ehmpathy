import { given, then, useThen, when } from 'test-fns';

import { isSitrepDegenerate } from '@src/domain.operations/sitrep/isSitrepDegenerate';

import { compressViaBhrain } from './compress.via.bhrain';

/**
 * .what = one real call to the brain the compress skill asks, through the full ask
 *         path: keyrack creds → brain choice → schema'd answer → getOneSitrepViaAsks
 * .why  = every other brain suite here is skipped (paid calls, drifty snapshots; F29),
 *         so this is the one place the live brain contract is proven: the answer
 *         parses to the declared schema, and the sitrep holds a brief, not a
 *         placeholder (rule.require.external-contract-integration-tests)
 * .note = one short brief on openrouter/deepseek/flash, a fraction of a cent per run.
 *         `force` bypasses the on-disk cache, so a cached answer can never pass for a
 *         live one. absent OPENROUTER_API_KEY fails loud via the keyrack, never skips
 */
describe('compress.via.bhrain — the real brain contract', () => {
  const brief = [
    '# rule.require.wax-before-paddle',
    '',
    'a surfer waxes the deck before each paddle out. wax gives grip; a bare deck',
    'slips under the feet on the pop-up, and the surfer falls before the wave breaks.',
    'rub the wax in small circles from tail to chest, then add a top coat.',
    '',
    'enforcement: a paddle out on a bare deck = blocker.',
  ].join('\n');

  given('[case1] a short brief and the default sitrep brain', () => {
    when('[t0] the skill compresses it with the cache bypassed', () => {
      const result = useThen('the real brain answers', async () =>
        compressViaBhrain({
          content: brief,
          brainSlug: 'openrouter/deepseek/flash',
          force: true,
        }),
      );

      then('the sitrep holds a brief, not a placeholder', () => {
        expect(result.compressed.trim().length).toBeGreaterThan(0);
        expect(isSitrepDegenerate({ sitrep: result.compressed })).toBe(false);
      });

      then('the schema fields the skill reads are all present', () => {
        expect(typeof result.forethought).toBe('string');
        expect(typeof result.rationale).toBe('string');
        expect(result.tokensBefore).toBeGreaterThan(0);
        expect(result.tokensAfter).toBeGreaterThan(0);
      });

      // .why = the live fields drift per ask, so each is masked; the snapshot pins the
      //        shape the cli emits around them (rule.require.contract-snapshot-exhaustiveness)
      then('the result shape matches the masked snapshot', () => {
        const shape = Object.fromEntries(
          Object.entries(result)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => [key, `<${typeof value}>`]),
        );
        expect(shape).toMatchSnapshot();
      });
    });
  });
});
