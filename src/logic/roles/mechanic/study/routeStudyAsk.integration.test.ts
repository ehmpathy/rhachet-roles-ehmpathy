import { UnexpectedCodePathError } from 'helpful-errors';
import { enweaveOneStitcher } from 'rhachet';
import { given, when, then } from 'test-fns';

import { genArtifactGitFile } from '../../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { enrollThread } from '../../../../__nonpublished_modules__/rhachet/src/logic/enrollThread';
import { usePrep } from '../../../../__nonpublished_modules__/test-fns/src/usePrep';
import { genContextLogTrail } from '../../../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../../../__test_assets__/genContextStitchTrail';
import { getContextOpenAI } from '../../../../__test_assets__/getContextOpenAI';
import { getMechanicBrief } from '../getMechanicBrief';
import { routeStudyAsk } from './routeStudyAsk';

describe('routeStudyAsk ', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = routeStudyAsk;

  given('we want to multiply', () => {
    const askText = 'stubout the ability to multiply';

    const claimsArt = genArtifactGitFile({
      uri: __dirname + '/.temp/multiply.claims.md',
    });
    const coderefArt = genArtifactGitFile({
      uri: __dirname + '/.temp/multiply.coderef.md',
    });

    const coderefContent =
      'export const add = (a: number, b: number) => a + b;';

    beforeEach(async () => {
      await claimsArt.del();
      await coderefArt.set({ content: coderefContent });
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        student: await enrollThread({
          role: 'student',
          stash: {
            ask: askText,
            art: { claims: claimsArt },
            scene: { coderefs: [coderefArt] },
          },
          inherit: {
            traits: [getMechanicBrief('style.compressed.md')],
          },
        }),
      }));

      then('updates the claims artifact', async () => {
        const outcome = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );
        console.log(JSON.stringify(outcome, null, 2));

        const { content } =
          (await claimsArt.get()) ??
          UnexpectedCodePathError.throw('expected file');
        expect(content).toContain('multiply');
      });
    });
  });

  given.only('we want to getSchedulableWindows for a crew', () => {
    const askText = `
    * .what = returns available time windows for appointment scheduling
    * .why = enables customers to book with pros during valid, conflict-free slots

background:
- pro.crews set their schedule's availability
- appointment windows are computed from the daily availability windows
- each appointment window is 30min wide
- neighbors and pros then book appointment windows from these availabilities
- we only want to show windows that are
`;

    const claimsArt = genArtifactGitFile({
      uri: __dirname + '/.temp/getSchedulableWindows.claims.md',
    });

    beforeEach(async () => {
      await claimsArt.del();
    });

    when('executed', () => {
      const threads = usePrep(async () => {
        const student = await enrollThread({
          role: 'student',
          stash: {
            ask: askText,
            art: { claims: claimsArt },
            scene: { coderefs: [] },
          },
          inherit: {
            traits: [getMechanicBrief('style.compressed.md')],
          },
        });
        return {
          student,
        };
      });

      then('updates the claims artifact', async () => {
        console.log({ threads });
        const outcome = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );
        console.log(JSON.stringify(outcome, null, 2));
      });
    });
  });
});
