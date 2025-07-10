import { enweaveOneStitcher } from 'rhachet';
import { given, when, then } from 'test-fns';

import { genArtifactGitFile } from '../../../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { enrollThread } from '../../../../../__nonpublished_modules__/rhachet/src/logic/enrollThread';
import { usePrep } from '../../../../../__nonpublished_modules__/test-fns/src/usePrep';
import { genContextLogTrail } from '../../../../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../../../../__test_assets__/genContextStitchTrail';
import { getContextOpenAI } from '../../../../../__test_assets__/getContextOpenAI';
import { distillDomainExpandResourcesAndMechanisms } from './distillDomain.expand.ResourcesAndMechanisms';

describe('distillDomainExpandResourcesAndMechanisms', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = distillDomainExpandResourcesAndMechanisms;

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

    const distillateArt = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/distillDomain/ResourcesAndMechanisms/getSchedulableWindows.expanded.md',
      },
      {
        versions: {
          retain: './.rhachet/artifact/{key}/{unidatetime}.{ext}',
        },
      },
    );

    const distillate2Art = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/distillDomain/ResourcesAndMechanisms/getSchedulableWindows.expandedAgain.md',
      },
      {
        versions: {
          retain: './.rhachet/artifact/{key}/{unidatetime}.{ext}',
        },
      },
    );

    const sofarArt = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.test/getSchedulableWindows.distillate.resourcesAndMechanisms.json',
      },
      { access: 'readonly' },
    );

    beforeEach(async () => {
      await distillateArt.set({
        content: (await sofarArt.get().expect('isPresent')).content, // set the current distillate to a prior version of what we found "so far"
      });
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        student: await enrollThread({
          role: 'student',
          stash: {
            ask: askText,
            art: {
              distilledResourcesAndMechanisms: distillateArt,
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

    when('executed again', () => {
      const threads = usePrep(async () => ({
        student: await enrollThread({
          role: 'student',
          stash: {
            ask: askText,
            art: {
              distilledResourcesAndMechanisms: distillate2Art,
              // domainTerms: null,
              // domainBounds: null,
            },
          },
        }),
      }));

      beforeEach(async () => {
        await distillate2Art.set({
          content: (await distillateArt.get().expect('isPresent')).content, // set the "distillate2" to the latest from the output above
        });
      });

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
