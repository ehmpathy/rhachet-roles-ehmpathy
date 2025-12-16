import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/logic/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/logic/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/logic/.test/getContextOpenAI';

import { distillDomainRefineResourcesAndMechanisms } from './distillDomain.refine.ResourcesAndMechanisms';

describe('distillDomainRefineResourcesAndMechanisms', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = distillDomainRefineResourcesAndMechanisms;

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

    const refinedArt = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/distillDomain/ResourcesAndMechanisms/getSchedulableWindows.refined.md',
      },
      {
        versions: true,
      },
    );
    const distillateArt = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.test/getSchedulableWindows.distillate.resourcesAndMechanisms.json',
      },
      { access: 'readonly' },
    );

    beforeEach(async () => {
      await refinedArt.del();
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        student: await enrollThread({
          role: 'student',
          stash: {
            ask: askText,
            art: {
              distilledResourcesAndMechanisms: distillateArt,
              refinedResourcesAndMechanisms: refinedArt,
              // domainTerms: null,
              // domainBounds: null,
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

        const { content } = await distillateArt.get().expect('isPresent');
        expect(content).toContain('"resources":');
        expect(content).toContain('"mechanisms":');
      });
    });
  });
});
