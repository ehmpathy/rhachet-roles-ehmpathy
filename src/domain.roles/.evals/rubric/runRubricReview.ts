import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { UnexpectedCodePathError } from 'helpful-errors';
import * as path from 'path';

import { parseReviewCounts } from '../review/parseReviewCounts';
import type { ReviewResult } from '../schemas';

/**
 * .what = run a rubric review against code content
 * .why  = executes the rubric skill and captures output
 */
export const runRubricReview = async (input: {
  /** rubric slug to run */
  rubric: string;
  /** role that owns this rubric */
  role: string;
  /** code content to review */
  code: string;
  /** base path to domain.roles */
  domainRolesDir: string;
  /** brain slug for comparison evals (default: uses rubric default) */
  brain?: string;
}): Promise<ReviewResult> => {
  // write code to temp file within repo
  // .note = bhrain review skill expects paths relative to repo root
  // domainRolesDir = repo/src/domain.roles, so go up two levels
  const repoRoot = path.join(input.domainRolesDir, '..', '..');
  const cacheDir = path.join(repoRoot, '.cache', 'review-eval');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  const tempDir = fs.mkdtempSync(path.join(cacheDir, 'run-'));
  const tempFile = path.join(tempDir, 'code.ts');
  fs.writeFileSync(tempFile, input.code);

  // compute relative path for bhrain skill
  const tempFileRelative = path.relative(repoRoot, tempFile);

  const skillPath = path.join(
    input.domainRolesDir,
    input.role,
    'skills/review',
    `review.rubric=${input.rubric}.sh`,
  );

  const startTime = Date.now();

  try {
    // build args for rubric skill
    const skillArgs = ['--paths', tempFileRelative, '--mode', 'push'];
    if (input.brain) {
      skillArgs.push('--brain', input.brain);
    }

    // run the rubric skill
    // note: encoding is a Node.js spawnSync api requirement
    // note: env inherits keyrack credentials from parent process
    const result = spawnSync('bash', [skillPath, ...skillArgs], {
      cwd: repoRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 180000, // 3 minute timeout per review call
      env: process.env,
    });

    const durationMs = Date.now() - startTime;

    // handle timeout or signal termination
    if (result.error) {
      throw new UnexpectedCodePathError('rubric review spawn failed', {
        rubric: input.rubric,
        skillPath,
        error: result.error.message,
        durationMs,
      });
    }

    const stdout = result.stdout ?? '';
    const stderr = result.stderr ?? '';
    const counts = parseReviewCounts({ stdout, stderr, rubric: input.rubric });

    return {
      rubric: input.rubric,
      exitCode: result.status ?? 1,
      blockerCount: counts.blockerCount,
      nitpickCount: counts.nitpickCount,
      stdout,
      stderr,
      durationMs,
    };
  } finally {
    // cleanup temp files regardless of success or failure
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
  }
};
