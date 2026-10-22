import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = clamp for patches/rhachet-roles-bhrain@0.42.1.patch
 * .why  = `route.stone.set --as promised` rendered the next self review's full guide, yet
 *         only `--as passed` mints that review's ask. a driver who wrote against the guide
 *         was refused with "no ask on record". the patch points at the command that mints it.
 *         this test goes red if the patch is dropped or an upgrade overwrites it.
 */
describe('rhachet-roles-bhrain patch: promised emit', () => {
  // load the installed (patched) dist; deep paths sit outside the package exports
  const { formatRouteStoneEmit } = require(
    path.join(
      process.cwd(),
      'node_modules/rhachet-roles-bhrain/dist/domain.operations/route/formatRouteStoneEmit.js',
    ),
  );

  given('[case1] a promise with a next self review owed', () => {
    when('[t0] the promised emit renders', () => {
      const output: string = formatRouteStoneEmit({
        operation: 'route.stone.set',
        stone: '1.vision',
        action: 'promised',
        slug: 'has-questioned-assumptions',
        route: '.behavior/v2026_10_18.surf-lesson',
        progress: { index: 2, total: 5 },
        nextReview: {
          reviewSelf: {
            slug: 'has-zero-deferrals',
            say: 'review for deferrals',
          },
          index: 3,
          total: 5,
        },
      });

      then('it names the command that mints the next ask', () => {
        expect(output).toContain(
          'rhx route.stone.set --stone 1.vision --as passed',
        );
        expect(output).toContain('next = review.self 3/5');
      });

      then('it renders no guide for an ask that does not exist yet', () => {
        expect(output).not.toContain('has-zero-deferrals');
        expect(output).not.toContain('review for deferrals');
      });

      then('the emit matches snapshot', () => {
        expect(output).toMatchSnapshot();
      });
    });
  });

  given('[case2] a promise with no review left', () => {
    when('[t0] the promised emit renders', () => {
      const output: string = formatRouteStoneEmit({
        operation: 'route.stone.set',
        stone: '1.vision',
        action: 'promised',
        slug: 'has-zero-deferrals',
        route: '.behavior/v2026_10_18.surf-lesson',
        progress: { index: 5, total: 5 },
      });

      then('it closes the tree on the passage line, with no next', () => {
        expect(output).toContain(
          '└─ passage = progressed (review.self 5/5 promised)',
        );
        expect(output).not.toContain('next =');
      });

      then('the emit matches snapshot', () => {
        expect(output).toMatchSnapshot();
      });
    });
  });
});
