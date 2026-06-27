import { UnexpectedCodePathError } from 'helpful-errors';

/**
 * .what = extract blocker and nitpick counts from review output
 * .why  = pure transformer for stdout parse
 */
export const parseReviewCounts = (input: {
  stdout: string;
  stderr?: string;
  rubric?: string;
}): { blockerCount: number; nitpickCount: number } => {
  const blockerMatch = input.stdout.match(/(\d+)\s*blockers?/i);
  const nitpickMatch = input.stdout.match(/(\d+)\s*nitpicks?/i);

  // fail fast if either pattern absent - output format unexpected
  if (!blockerMatch) {
    throw new UnexpectedCodePathError('review output lacks blocker count', {
      rubric: input.rubric,
      stdoutLength: input.stdout.length,
      stdoutPreview: input.stdout.slice(0, 200),
      stderrLength: input.stderr?.length,
      stderrPreview: input.stderr?.slice(0, 500),
    });
  }

  if (!nitpickMatch) {
    throw new UnexpectedCodePathError('review output lacks nitpick count', {
      rubric: input.rubric,
      stdoutLength: input.stdout.length,
      stdoutPreview: input.stdout.slice(0, 200),
      stderrLength: input.stderr?.length,
      stderrPreview: input.stderr?.slice(0, 500),
    });
  }

  return {
    blockerCount: parseInt(blockerMatch[1]!, 10),
    nitpickCount: parseInt(nitpickMatch[1]!, 10),
  };
};
