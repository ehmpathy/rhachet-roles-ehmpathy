/**
 * .what = check whether a brain's sitrep is a placeholder, not a brief
 * .why = a brain may fill the sitrep field with '...' or similar filler;
 *        such output holds no word at all, so it carries no kernel and
 *        must be refused rather than returned as a compressed brief
 */
export const isSitrepPlaceholder = (input: { sitrep: string }): boolean =>
  !/[\p{L}\p{N}]/u.test(input.sitrep);
