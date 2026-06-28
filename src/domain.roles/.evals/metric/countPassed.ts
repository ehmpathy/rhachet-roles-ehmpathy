import type { EvalVerdict } from '../schemas';

/**
 * .what = count verdicts that passed
 * .why  = extract count of passed verdicts for summary
 */
export const countPassed = (input: { verdicts: EvalVerdict[] }): number => {
  return input.verdicts.filter((v) => v.passed).length;
};
