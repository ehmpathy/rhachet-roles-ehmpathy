import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

import { compareBrains, formatBrainComparisonTable } from './compareBrains';

/**
 * .what = integration tests for brain comparison harness
 * .why  = verify multi-brain eval comparison works end-to-end
 *
 * .note = these tests are slow (run multiple brains) and expensive
 *         run selectively for brain selection research
 */
describe('compareBrains', () => {
  // .note = these tests run LLM calls which can take 2-3 minutes
  jest.setTimeout(300_000); // 5 minutes

  const domainRolesDir = path.join(__dirname, '../..');
  const evalsDir = path.join(__dirname, '..');

  given('[case1] single brain baseline', () => {
    when('[t0] compared against one brain', () => {
      const comparison = useThen('comparison completes', () =>
        compareBrains({
          rubric: 'mech-failhides',
          role: 'mechanic',
          brains: ['fireworks/deepseek/v4-flash'],
          domainRolesDir,
          evalsDir,
        }),
      );

      then('rubric and role captured', () => {
        expect(comparison.rubric).toBe('mech-failhides');
        expect(comparison.role).toBe('mechanic');
      });

      then('one brain result returned', () => {
        expect(comparison.brains).toHaveLength(1);
        const brainResult = comparison.brains[0]!;
        expect(brainResult.brain).toBe('fireworks/deepseek/v4-flash');
      });

      then('summary has brain field set', () => {
        const brainResult = comparison.brains[0]!;
        expect(brainResult.summary.brain).toBe('fireworks/deepseek/v4-flash');
      });

      then('summary has metrics', () => {
        const { summary } = comparison.brains[0]!;
        expect(summary.totalCases).toBe(5);
        expect(summary.totalDurationMs).toBeGreaterThan(0);
        expect(summary.avgSensitivity).toBeGreaterThanOrEqual(0);
        expect(summary.avgSpecificity).toBeGreaterThanOrEqual(0);
      });

      then('table format works', () => {
        const table = formatBrainComparisonTable({ comparison });
        expect(table).toContain('brain comparison: mech-failhides');
        expect(table).toContain('fireworks/deepseek/v4-flash');
        expect(table).toContain('| brain |');
      });

      then('table output matches snapshot', () => {
        const table = formatBrainComparisonTable({ comparison });
        expect(table).toMatchSnapshot();
      });
    });
  });

  // .note = uncomment to run multi-brain comparison (slow, expensive)
  // given('[case2] multi-brain comparison', () => {
  //   when('[t0] compared against two brains', () => {
  //     const comparison = useThen('comparison completes', () =>
  //       compareBrains({
  //         rubric: 'mech-failhides',
  //         role: 'mechanic',
  //         brains: ['fireworks/deepseek/v4-flash', 'fireworks/deepseek/v4-flash'],
  //         domainRolesDir,
  //         evalsDir,
  //       }),
  //     );
  //
  //     then('two brain results returned', () => {
  //       expect(comparison.brains).toHaveLength(2);
  //     });
  //
  //     then('each brain has distinct metrics', () => {
  //       const [brain1, brain2] = comparison.brains;
  //       expect(brain1.brain).not.toBe(brain2.brain);
  //       // duration likely differs
  //     });
  //   });
  // });
});
