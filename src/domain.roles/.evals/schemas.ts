import { z } from 'zod';

/**
 * .what = schemas for review eval infrastructure
 * .why  = typed eval cases enable reliable brain comparison
 *
 * .note = follows generator + evaluator pattern from vision/blueprint:
 *         - generator (rubric skill) produces review output
 *         - evaluator (brain.choice.ask) judges output against checks
 *         - verdict uses confusion matrix: TP, FP, TN, FN
 */

// --- zod schemas for evaluator brain response ---

export const schemaOfCheckResult = z.object({
  /** check slug from eval case */
  slug: z.string(),
  /** what we expected */
  expected: z.enum(['present', 'absent']),
  /** what the evaluator observed in generator output */
  observed: z.enum(['present', 'absent']),
  /** severity observed in generator output (none if not found) */
  severityObserved: z.enum(['blocker', 'nitpick', 'none']),
  /** confusion matrix result */
  result: z.enum([
    'true-positive',
    'false-positive',
    'true-negative',
    'false-negative',
  ]),
  /** evidence quote from generator output if observed=present */
  evidence: z.string().nullable(),
});

export const schemaOfEvalVerdict = z.object({
  /** check results */
  checks: z.array(schemaOfCheckResult),
  /** true iff all results are TP or TN */
  pass: z.boolean(),
  /** summary of findings */
  summary: z.string(),
});

// --- typescript types ---

export type CheckResult = z.infer<typeof schemaOfCheckResult>;
export type EvalVerdictFromBrain = z.infer<typeof schemaOfEvalVerdict>;

/**
 * a single check in an eval case
 *
 * .note = checks verify ONE SPECIFIC issue (or absence)
 *         a scene may have multiple checks
 */
export interface Check {
  /** unique identifier for this check */
  slug: string;

  /** description of what this check verifies */
  description: string;

  /** expected result: present (should be flagged) or absent (should not be flagged) */
  expected: 'present' | 'absent';

  /** severity level to check for */
  severity: 'blocker' | 'nitpick' | 'blocker|nitpick';

  /** reason that explains what to look for in the generator output */
  reason: string;
}

/**
 * represents a single eval case for a rubric
 */
export interface EvalCase {
  /** unique identifier for this eval case */
  id: string;

  /** rubric slug this eval case tests */
  rubric: string;

  /** description of what this case tests */
  description: string;

  /** the code snippet to review */
  code: string;

  /** evaluator brain configuration */
  evaluator: {
    brain: string;
  };

  /** checks to verify against generator output */
  checks: Check[];
}

/**
 * result of a single rubric review
 */
export interface ReviewResult {
  /** rubric slug that was run */
  rubric: string;

  /** exit code from the review skill */
  exitCode: number;

  /** number of blockers found */
  blockerCount: number;

  /** number of nitpicks found */
  nitpickCount: number;

  /** raw stdout from the review */
  stdout: string;

  /** raw stderr from the review */
  stderr: string;

  /** time taken in milliseconds */
  durationMs: number;
}

/**
 * verdict after evaluator brain judges generator output
 *
 * .note = measures both sensitivity and specificity:
 *         - sensitivity: TP / (TP + FN) — catches real issues
 *         - specificity: TN / (TN + FP) — avoids false alarms
 */
export interface EvalVerdict {
  /** eval case that was tested */
  evalCase: EvalCase;

  /** review result from the generator (rubric skill) */
  reviewResult: ReviewResult;

  /** check results from evaluator brain */
  checkResults: CheckResult[];

  /** overall pass/fail for this eval case */
  passed: boolean;

  /** sensitivity: TP / (TP + FN) */
  sensitivity: number;

  /** specificity: TN / (TN + FP) */
  specificity: number;

  /** summary from evaluator brain */
  summary: string;
}

/**
 * summary of all evals for a rubric
 */
export interface EvalSummary {
  /** rubric slug */
  rubric: string;

  /** brain slug used for this eval run (null = rubric default) */
  brain: string | null;

  /** total eval cases run */
  totalCases: number;

  /** cases that passed */
  passedCases: number;

  /** cases that failed */
  failedCases: number;

  /** average sensitivity across cases */
  avgSensitivity: number;

  /** average specificity across cases */
  avgSpecificity: number;

  /** total duration across all cases (ms) */
  totalDurationMs: number;

  /** individual verdicts */
  verdicts: EvalVerdict[];
}
