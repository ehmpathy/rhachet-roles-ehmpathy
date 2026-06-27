import type { EvalSummary } from '../schemas';
import { runReviewEval } from './runReviewEval';

/**
 * brain comparison result for a single rubric
 */
export interface BrainComparison {
  rubric: string;
  role: string;
  brains: BrainResult[];
}

/**
 * result for a single brain on a rubric
 */
export interface BrainResult {
  brain: string;
  summary: EvalSummary;
}

/**
 * .what = run same rubric against multiple brains for comparison
 * .why  = enables "time x cost x good" analysis per wish
 */
export const compareBrains = async (input: {
  /** rubric slug to evaluate */
  rubric: string;
  /** role that owns this rubric */
  role: string;
  /** brain slugs to compare */
  brains: string[];
  /** base path to domain.roles */
  domainRolesDir: string;
  /** base directory for eval cases */
  evalsDir: string;
}): Promise<BrainComparison> => {
  const brainResults: BrainResult[] = [];

  for (const brain of input.brains) {
    const summary = await runReviewEval({
      rubric: input.rubric,
      role: input.role,
      domainRolesDir: input.domainRolesDir,
      evalsDir: input.evalsDir,
      brain,
    });

    brainResults.push({ brain, summary });
  }

  return {
    rubric: input.rubric,
    role: input.role,
    brains: brainResults,
  };
};

/**
 * .what = format brain comparison as markdown table
 * .why  = human-readable summary for reports
 */
export const formatBrainComparisonTable = (input: {
  comparison: BrainComparison;
}): string => {
  const { comparison } = input;
  const lines: string[] = [];

  lines.push(`# brain comparison: ${comparison.rubric}`);
  lines.push('');
  lines.push(
    '| brain | passed | failed | sensitivity | specificity | duration |',
  );
  lines.push('|-------|--------|--------|--------|-------------|----------|');

  for (const result of comparison.brains) {
    const { summary } = result;
    const durationSec = (summary.totalDurationMs / 1000).toFixed(1);
    lines.push(
      `| ${result.brain} | ${summary.passedCases}/${summary.totalCases} | ${summary.failedCases} | ${(summary.avgSensitivity * 100).toFixed(0)}% | ${(summary.avgSpecificity * 100).toFixed(0)}% | ${durationSec}s |`,
    );
  }

  return lines.join('\n');
};
