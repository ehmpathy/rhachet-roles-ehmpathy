import { BadRequestError } from 'helpful-errors';
import * as yaml from 'yaml';

import type { EvalCase } from '../schemas';

/**
 * .what = parse and validate eval case from yaml content
 * .why  = pure transformer for eval case parse and validate
 */
export const getEvalCase = (input: {
  /** yaml content to parse */
  content: string;
  /** source path for error context */
  sourcePath: string;
}): EvalCase => {
  // parse yaml content with context on error
  const parsed: EvalCase = (() => {
    try {
      return yaml.parse(input.content) as EvalCase;
    } catch (error) {
      throw new BadRequestError('yaml parse failed for eval case', {
        sourcePath: input.sourcePath,
        parseError: error instanceof Error ? error.message : String(error),
      });
    }
  })();

  // validate required fields
  if (!parsed.id) {
    throw new BadRequestError('eval case lacks id', {
      sourcePath: input.sourcePath,
    });
  }
  if (!parsed.rubric) {
    throw new BadRequestError('eval case lacks rubric', {
      sourcePath: input.sourcePath,
    });
  }
  if (!parsed.code) {
    throw new BadRequestError('eval case lacks code', {
      sourcePath: input.sourcePath,
    });
  }
  if (!parsed.evaluator?.brain) {
    throw new BadRequestError('eval case lacks evaluator.brain', {
      sourcePath: input.sourcePath,
    });
  }
  if (!parsed.checks || parsed.checks.length === 0) {
    throw new BadRequestError('eval case lacks checks', {
      sourcePath: input.sourcePath,
    });
  }

  // validate each check
  for (const check of parsed.checks) {
    if (!check.slug) {
      throw new BadRequestError('check lacks slug', {
        sourcePath: input.sourcePath,
        check,
      });
    }
    if (!check.expected || !['present', 'absent'].includes(check.expected)) {
      throw new BadRequestError('check lacks valid expected (present|absent)', {
        sourcePath: input.sourcePath,
        check,
      });
    }
    if (!check.severity) {
      throw new BadRequestError('check lacks severity', {
        sourcePath: input.sourcePath,
        check,
      });
    }
    if (!check.reason) {
      throw new BadRequestError('check lacks reason', {
        sourcePath: input.sourcePath,
        check,
      });
    }
  }

  return {
    id: parsed.id,
    rubric: parsed.rubric,
    description: parsed.description ?? '',
    code: parsed.code,
    evaluator: parsed.evaluator,
    checks: parsed.checks,
  };
};
