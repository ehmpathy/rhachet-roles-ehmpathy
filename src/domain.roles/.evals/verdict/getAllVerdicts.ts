import { runRubricReview } from '../rubric/runRubricReview';
import type { EvalCase, EvalVerdict } from '../schemas';
import { getEvalVerdict } from './getEvalVerdict';

/**
 * .what = run all eval cases and compute verdicts
 * .why  = orchestrates review and verdict for each case
 */
export const getAllVerdicts = async (input: {
  evalCases: EvalCase[];
  rubric: string;
  role: string;
  domainRolesDir: string;
  /** brain slug for generator (default: uses rubric default) */
  brain?: string;
}): Promise<EvalVerdict[]> => {
  const verdicts: EvalVerdict[] = [];

  for (const evalCase of input.evalCases) {
    const reviewResult = await runRubricReview({
      rubric: input.rubric,
      role: input.role,
      code: evalCase.code,
      domainRolesDir: input.domainRolesDir,
      brain: input.brain,
    });

    const verdict = await getEvalVerdict({
      evalCase,
      reviewResult,
    });

    verdicts.push(verdict);
  }

  return verdicts;
};
