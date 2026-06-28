import type { EvalVerdict } from '../schemas';

/**
 * .what = extract specificity values from verdicts
 * .why  = prepare for average specificity computation
 */
export const getAllSpecificities = (input: {
  verdicts: EvalVerdict[];
}): number[] => {
  return input.verdicts.map((v) => v.specificity);
};
