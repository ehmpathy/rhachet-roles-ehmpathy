import { UnexpectedCodePathError } from 'helpful-errors';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/domain.operations/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/domain.operations/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/domain.operations/.test/getContextOpenAI';

import { routeStudyAskCasesActorsAndDrivers } from './routeStudyAskCases.ActorsAndDrivers';

describe('routeStudyAskCasesActorsAndDrivers', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = routeStudyAskCasesActorsAndDrivers;

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

    const usecasesArt = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/routeStudyAskCasesActorsAndDrivers/getSchedulableWindows.casesOfActorsAndDrivers.md',
      },
      {
        versions: true,
      },
    );

    const domainTermsArt = genArtifactGitFile(
      {
        uri: __dirname + '/.test/pro-vs-crew.domain.md',
      },
      { access: 'readonly' },
    );

    beforeEach(async () => {
      await usecasesArt.del();
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        student: await enrollThread({
          role: 'student',
          stash: {
            ask: askText,
            art: {
              casesOfActorsAndDrivers: usecasesArt,
              domainTerms: domainTermsArt,
              domainBounds: null,
            },
          },
        }),
      }));

      then('updates the usecases artifact', async () => {
        const outcome = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );

        console.log(JSON.stringify(outcome, null, 2));

        const { content } =
          (await usecasesArt.get()) ??
          UnexpectedCodePathError.throw('expected file');
        expect(content).toContain('"who":');
        expect(content).toContain('"when":');
        expect(content).toContain('"what":');
        expect(content).toContain('"why":');
        expect(content).toContain('"impact":');
      });
    });
  });
});
