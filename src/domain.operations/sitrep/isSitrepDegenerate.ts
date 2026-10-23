/**
 * .what = whether a brain's sitrep carries no brief at all
 * .why  = a brain sometimes reads the source brief as a user query and answers with a
 *         placeholder ('N/A', '', 'none') where the compressed brief belongs. that output
 *         holds no kernel, so it must never pass as a compression
 */
export const isSitrepDegenerate = (input: { sitrep: string }): boolean => {
  const sitrepBare = asSitrepBare({ sitrep: input.sitrep });
  if (sitrepBare.length === 0) return true;
  return SITREP_PLACEHOLDERS.has(sitrepBare);
};

/**
 * .what = the sitrep stripped of the wrap a brain puts around a placeholder
 * .why  = a brain emits `**N/A**`, `N/A.`, `` `none` ``, or a unicode `…` as often as the bare
 *         word; each must match the same placeholder
 */
const asSitrepBare = (input: { sitrep: string }): string =>
  input.sitrep
    .trim()
    .replace(/…/g, '...')
    .replace(/^[*_`"']+|[*_`"']+$/g, '')
    .replace(/(?<=[a-z])[.!]+$/i, '')
    .trim()
    .toLowerCase();

/**
 * .what = the placeholders a brain emits in place of a brief
 */
const SITREP_PLACEHOLDERS = new Set([
  'n/a',
  'na',
  'none',
  'null',
  'undefined',
  '-',
  '...',
]);
