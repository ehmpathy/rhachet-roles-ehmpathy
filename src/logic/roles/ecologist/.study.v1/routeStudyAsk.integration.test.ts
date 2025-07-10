import { UnexpectedCodePathError } from 'helpful-errors';
import { enweaveOneStitcher } from 'rhachet';
import { given, when, then } from 'test-fns';

import { genArtifactGitFile } from '../../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { enrollThread } from '../../../../__nonpublished_modules__/rhachet/src/logic/enrollThread';
import { usePrep } from '../../../../__nonpublished_modules__/test-fns/src/usePrep';
import { genContextLogTrail } from '../../../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../../../__test_assets__/genContextStitchTrail';
import { getContextOpenAI } from '../../../../__test_assets__/getContextOpenAI';
import { routeStudyAsk } from './routeStudyAsk';

describe('routeStudyAsk ', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = routeStudyAsk;

  given('we want to getSchedulableWindows for a pro', () => {
    const askText = `
we want to add an endpoint to getSchedulableWindows for a pro

we think we should operate per pro.crew, since each crew has its own availability

we'll need to track:
- availabilities
- appointments

we'll need to know:
- per job, the required appointment duration
- given current appointments + availabilities, which windows are schedulable

also, we'll want to refine the terms used to eliminate ambiguity, but this is a starter point. greenfield terms
    `.trim();

    const claimsArt = genArtifactGitFile({
      uri: __dirname + '/.temp/routeStudyAsk/getSchedulableWindows.claims.md',
    });
    beforeEach(async () => {
      await claimsArt.del();
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        student: await enrollThread({
          role: 'student',
          stash: {
            ask: askText,
            art: { claims: claimsArt, domainBounds: null, domainTerms: null },
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
});
