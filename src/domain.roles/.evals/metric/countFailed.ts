import type { EvalVerdict } from '../schemas';

/**
 * .what = count verdicts that failed
 * .why  = extract count of failed verdicts for summary
 */
export const countFailed = (input: { verdicts: EvalVerdict[] }): number => {
  return input.verdicts.filter((v) => !v.passed).length;
};
