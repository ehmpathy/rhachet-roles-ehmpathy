import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = proves the review scope filter keeps every file a stage's peer lane binds
 * .why  = bhrain's polluter filter dropped 12 of the 13 `1.vision.*` files on route
 *         v2026_10_18.feat-split-release-uses — three peer rounds read only the yield.
 *         a glob is exempt from the drop only when EVERY file it matched is paperwork,
 *         and `1.vision.*.md` also matched the yield, so it never earned the exemption.
 *         this suite runs the real filter on the real paths, with no review call.
 */
describe('rhachet-roles-bhrain review scope: polluter verdict on a stage bind', () => {
  // load the installed dist; deep paths sit outside the package exports
  const { getAllTargetsByPolluterVerdict } = require(
    path.join(
      process.cwd(),
      'node_modules/rhachet-roles-bhrain/dist/domain.operations/getAllTargetsByPolluterVerdict.js',
    ),
  );

  // the 13 files the vision lanes joined (glob ∩ since-main), from the i003 scope trace
  const route = '.behavior/v2026_10_18.feat-split-release-uses';
  const targets = [
    'case=1.grant-each-alone',
    'case=10.rebase-conflict-mark-done',
    'case=2.release-on-its-own-meter',
    'case=3.rebase-zero-ahead',
    'case=4.rebase-then-push',
    'case=5.revoke-one-leaves-two',
    'case=6.kill-switch-and-damage',
    'case=7.robot-cannot-grant',
    'case=8.upgraded-tree',
    'case=9.crew-day-dense-journey',
    'case=_',
    'dimensions',
  ]
    .map((leaf) => `${route}/1.vision.experience.${leaf}.md`)
    .concat(`${route}/1.vision.yield.md`);

  given(
    '[case1] the repaired 1.vision guard bind (two --paths-with globs)',
    () => {
      when('[t0] the scope filter judges the 13 joined targets', () => {
        const verdict = getAllTargetsByPolluterVerdict({
          targets,
          globs: [
            `${route}/1.vision.*.md`,
            `${route}/1.vision.experience.*.md`,
          ],
          mode: 'drop',
        });

        then('all 13 are kept', () => {
          expect(verdict.kept).toHaveLength(13);
          expect([...verdict.kept].sort()).toEqual([...targets].sort());
        });

        then('none are dropped', () => {
          expect(verdict.dropped).toEqual([]);
        });
      });
    },
  );

  // clamp for patches/rhachet-roles-bhrain@0.42.1.patch (getAllTargetsAskedForByName):
  // a glob whose matches all lie inside the route is exempt, even when one is the yield
  given(
    '[case2] the stage bind as the template ships it (one --paths-with glob)',
    () => {
      when('[t0] the scope filter judges the 13 joined targets', () => {
        const verdict = getAllTargetsByPolluterVerdict({
          targets,
          globs: [`${route}/1.vision.*.md`],
          mode: 'drop',
        });

        then('all 13 are kept, the yield beside the 12 demos', () => {
          expect(verdict.kept).toHaveLength(13);
          expect(verdict.dropped).toEqual([]);
        });
      });
    },
  );

  given('[case3] a catch-all glob over source and route paperwork', () => {
    when('[t0] the scope filter judges source plus the route files', () => {
      const source =
        'src/domain.roles/mechanic/skills/git.stage/git.stage.add.sh';
      const verdict = getAllTargetsByPolluterVerdict({
        targets: [source, ...targets],
        globs: ['**/*'],
        mode: 'drop',
      });

      then('the exemption does not loosen: the 12 demos still drop', () => {
        expect(verdict.dropped).toHaveLength(12);
        expect(verdict.kept).toHaveLength(2);
        expect(verdict.kept).toContain(source);
        expect(verdict.kept).toContain(`${route}/1.vision.yield.md`);
      });
    });
  });
});
