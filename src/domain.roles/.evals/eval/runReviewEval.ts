import { getAllEvalCasesForRubric } from '../case/getAllEvalCasesForRubric';
import { computeAverage } from '../metric/computeAverage';
import { countFailed } from '../metric/countFailed';
import { countPassed } from '../metric/countPassed';
import { getAllSensitivities } from '../metric/getAllSensitivities';
import { getAllSpecificities } from '../metric/getAllSpecificities';
import type { EvalSummary } from '../schemas';
import { getAllVerdicts } from '../verdict/getAllVerdicts';

/**
 * .what = run all eval cases for a rubric and compute summary
 * .why  = orchestrates full eval suite for brain comparison
 */
export const runReviewEval = async (input: {
  /** rubric slug to evaluate */
  rubric: string;
  /** role that owns this rubric */
  role: string;
  /** base path to domain.roles */
  domainRolesDir: string;
  /** base directory for eval cases */
  evalsDir: string;
  /** brain slug for generator (default: uses rubric default) */
  brain?: string;
}): Promise<EvalSummary> => {
  // load all eval cases for this rubric
  const evalCases = getAllEvalCasesForRubric({
    rubric: input.rubric,
    evalsDir: input.evalsDir,
  });

  // run each eval case and compute verdict
  const verdicts = await getAllVerdicts({
    evalCases,
    rubric: input.rubric,
    role: input.role,
    domainRolesDir: input.domainRolesDir,
    brain: input.brain,
  });

  // compute summary
  const passedCases = countPassed({ verdicts });
  const failedCases = countFailed({ verdicts });
  const avgSensitivity = computeAverage({
    values: getAllSensitivities({ verdicts }),
  });
  const avgSpecificity = computeAverage({
    values: getAllSpecificities({ verdicts }),
  });
  const totalDurationMs = verdicts.reduce(
    (sum, v) => sum + v.reviewResult.durationMs,
    0,
  );

  return {
    rubric: input.rubric,
    brain: input.brain ?? null,
    totalCases: evalCases.length,
    passedCases,
    failedCases,
    avgSensitivity,
    avgSpecificity,
    totalDurationMs,
    verdicts,
  };
};
