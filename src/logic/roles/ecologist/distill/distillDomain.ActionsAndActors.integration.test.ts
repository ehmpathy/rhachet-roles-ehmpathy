import { UnexpectedCodePathError } from 'helpful-errors';
import { enweaveOneStitcher } from 'rhachet';
import { given, when, then } from 'test-fns';

import { genArtifactGitFile } from '../../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { enrollThread } from '../../../../__nonpublished_modules__/rhachet/src/logic/enrollThread';
import { usePrep } from '../../../../__nonpublished_modules__/test-fns/src/usePrep';
import { genContextLogTrail } from '../../../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../../../__test_assets__/genContextStitchTrail';
import { getContextOpenAI } from '../../../../__test_assets__/getContextOpenAI';
import { distillDomainActorsAndActions } from './distillDomain.ActionsAndActors';

describe('distillDomainActorsAndActions', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = distillDomainActorsAndActions;

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
          '/.temp/distillDomain/ActionsAndActors/getSchedulableWindows.distillate.md',
      },
      {
        versions: {
          retain: './.rhachet/artifact/{key}/{unidatetime}.{ext}',
        },
      },
    );

    const domainTermsArt = genArtifactGitFile(
      {
        uri: __dirname + '/.test/pro-vs-crew.domain.md',
      },
      { access: 'readonly' },
    );

    beforeEach(async () => {
      await distillateArt.del();
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        student: await enrollThread({
          role: 'student',
          stash: {
            ask: askText,
            art: {
              distilledActorsAndActions: distillateArt,
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

  given.only(
    'we want to getSchedulableAppointments and setScheduledAppointment for a pro',
    () => {
      const askText = `
we want to add endpoints to getSchedulableAppointments and setScheduledAppointment for a pro

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
            '/.temp/distillDomain/ActionsAndActors/setScheduledAppointment.distillate.md',
        },
        {
          versions: {
            retain: './.rhachet/artifact/{key}/{unidatetime}.{ext}',
          },
        },
      );

      const domainTermsArt = genArtifactGitFile(
        {
          uri: __dirname + '/.test/pro-vs-crew.domain.md',
        },
        { access: 'readonly' },
      );

      beforeEach(async () => {
        await distillateArt.del();
      });

      when('executed', () => {
        const threads = usePrep(async () => ({
          student: await enrollThread({
            role: 'student',
            stash: {
              ask: askText,
              art: {
                distilledActorsAndActions: distillateArt,
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
    },
  );
});
