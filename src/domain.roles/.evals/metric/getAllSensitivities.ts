import type { EvalVerdict } from '@src/domain.roles/.evals/schemas';

/**
 * .what = extract sensitivity values from verdicts
 * .why  = prepare for average sensitivity computation
 */
export const getAllSensitivities = (input: {
  verdicts: EvalVerdict[];
}): number[] => {
  return input.verdicts.map((v) => v.sensitivity);
};
