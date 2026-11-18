import { getAllEvalCasesForRubric } from '@src/domain.roles/.evals/case/getAllEvalCasesForRubric';
import { computeAverage } from '@src/domain.roles/.evals/metric/computeAverage';
import { countFailed } from '@src/domain.roles/.evals/metric/countFailed';
import { countPassed } from '@src/domain.roles/.evals/metric/countPassed';
import { getAllSensitivities } from '@src/domain.roles/.evals/metric/getAllSensitivities';
import { getAllSpecificities } from '@src/domain.roles/.evals/metric/getAllSpecificities';
import type { EvalSummary } from '@src/domain.roles/.evals/schemas';
import { getAllVerdicts } from '@src/domain.roles/.evals/verdict/getAllVerdicts';

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
