import { BadRequestError, getError } from 'helpful-errors';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

import { runReviewEval } from './runReviewEval';

/**
 * .what = integration tests for runReviewEval orchestrator
 * .why  = verify eval infrastructure works end-to-end against real rubric skills
 */
describe('runReviewEval', () => {
  // .note = these tests run LLM calls which can take 2-3 minutes
  jest.setTimeout(300_000); // 5 minutes

  const domainRolesDir = path.join(__dirname, '../..');
  const evalsDir = path.join(__dirname, '..');

  given('[case1] mech-failhides rubric', () => {
    when('[t0] eval suite is run', () => {
      const summary = useThen('eval completes', async () =>
        runReviewEval({
          rubric: 'mech-failhides',
          role: 'mechanic',
          domainRolesDir,
          evalsDir,
        }),
      );

      then('summary contains rubric name', () => {
        expect(summary.rubric).toBe('mech-failhides');
      });

      then('all 5 eval cases are loaded', () => {
        expect(summary.totalCases).toBe(5);
      });

      then('verdicts array has entry for each case', () => {
        expect(summary.verdicts).toHaveLength(5);
      });

      then('verdict ids match expected eval cases', () => {
        const ids = summary.verdicts.map((v) => v.evalCase.id).sort();
        expect(ids).toHaveLength(5);
        expect(ids).toMatchSnapshot();
      });

      then('each verdict has review result with valid exit code', () => {
        for (const verdict of summary.verdicts) {
          expect(verdict.reviewResult.exitCode).toBeDefined();
          // exit 0 = success, exit 2 = constraint (found issues)
          // exit 1 = malfunction - should not occur in healthy tests
          expect(verdict.reviewResult.exitCode).not.toBe(1);
        }
      });

      then('each verdict has sensitivity metric', () => {
        for (const verdict of summary.verdicts) {
          expect(verdict.sensitivity).toBeGreaterThanOrEqual(0);
          expect(verdict.sensitivity).toBeLessThanOrEqual(1);
        }
      });

      then('each verdict has specificity metric', () => {
        for (const verdict of summary.verdicts) {
          expect(verdict.specificity).toBeGreaterThanOrEqual(0);
          expect(verdict.specificity).toBeLessThanOrEqual(1);
        }
      });

      then('summary has aggregate metrics', () => {
        expect(summary.passedCases).toBeGreaterThanOrEqual(0);
        expect(summary.failedCases).toBeGreaterThanOrEqual(0);
        expect(summary.passedCases + summary.failedCases).toBe(
          summary.totalCases,
        );
        expect(summary.avgSensitivity).toBeGreaterThanOrEqual(0);
        expect(summary.avgSpecificity).toBeGreaterThanOrEqual(0);
      });

      then('summary has brain field (null = default)', () => {
        expect(summary.brain).toBeNull(); // no --brain passed
      });

      then('summary has total duration', () => {
        expect(summary.totalDurationMs).toBeGreaterThan(0);
      });
    });
  });

  given('[case2] mech-decode-friction rubric', () => {
    when('[t0] eval suite is run', () => {
      const summary = useThen('eval completes', async () =>
        runReviewEval({
          rubric: 'mech-decode-friction',
          role: 'mechanic',
          domainRolesDir,
          evalsDir,
        }),
      );

      then('summary contains rubric name', () => {
        expect(summary.rubric).toBe('mech-decode-friction');
      });

      then('all 3 eval cases are loaded', () => {
        expect(summary.totalCases).toBe(3);
      });

      then('verdicts array has entry for each case', () => {
        expect(summary.verdicts).toHaveLength(3);
      });
    });
  });

  given('[case3] arch-hazards-maintenance rubric', () => {
    when('[t0] eval suite is run', () => {
      const summary = useThen('eval completes', async () =>
        runReviewEval({
          rubric: 'arch-hazards-maintenance',
          role: 'architect',
          domainRolesDir,
          evalsDir,
        }),
      );

      then('summary contains rubric name', () => {
        expect(summary.rubric).toBe('arch-hazards-maintenance');
      });

      then('all 2 eval cases are loaded', () => {
        expect(summary.totalCases).toBe(2);
      });
    });
  });

  given('[case4] ergo-friction-hazards rubric', () => {
    when('[t0] eval suite is run', () => {
      const summary = useThen('eval completes', async () =>
        runReviewEval({
          rubric: 'ergo-friction-hazards',
          role: 'ergonomist',
          domainRolesDir,
          evalsDir,
        }),
      );

      then('summary contains rubric name', () => {
        expect(summary.rubric).toBe('ergo-friction-hazards');
      });

      then('all 2 eval cases are loaded', () => {
        expect(summary.totalCases).toBe(2);
      });
    });
  });

  given('[case5] nonexistent rubric', () => {
    when('[t0] eval suite is run', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(async () =>
          runReviewEval({
            rubric: 'nonexistent-rubric',
            role: 'mechanic',
            domainRolesDir,
            evalsDir,
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('directory not found');
      });
    });
  });
});
