import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { stepOutlineDistilisys } from './stepOutlineDistilisys';

jest.setTimeout(toMilliseconds({ minutes: 3 }));

describe('stepOutlineDistilisys', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepOutlineDistilisys;

  given.only('we want to create the rhachet cli, from scratch', () => {
    const askText = `
i need to outline a design for a npm typescript cli which calls an existingp rocedure within my repo

the product spec is

1. register the "roles" and "skills" that we can access (w/ readme's)
2. invoke the roles and skills via cli (e.g., \`npx rhachet -r mechanic -s produce -t target/file/path -a "the ask to execute against\`)

note
- no dynamic registration. we'll register the skills and roles at devtime
- at registration, each skill and role shoudl get a mini readme, declared at the registration point
    `.trim();
    const roadmapPriorArt = genArtifactGitFile(
      {
        uri:
          __dirname + '/.test/rhachetCli.outline.roadmap.nofeedback.example.md',
      },
      { access: 'readonly' },
    );
    const distilisysArt = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepOutlineDistilisys/rhachetCli.fromscratch.distilisys.md',
      },
      { versions: true },
    );
    const feedbackArt = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepOutlineDistilisys/rhachetCli.fromscratch.feedback.md',
      },
      { versions: true },
    );

    beforeEach(async () => {
      await distilisysArt.del();
      await feedbackArt.del();
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        designer: await enrollThread({
          role: 'designer',
          stash: {
            art: {
              distilisys: distilisysArt,
              roadmap: roadmapPriorArt,
            },
          },
        }),
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: askText,
            art: {
              feedback: feedbackArt,
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

        const { content } = await distilisysArt.get().expect('isPresent');
        expect(content).toMatch(/cli/i);
        expect(content).toMatch(/role/i);
      });
    });
  });

  given(
    'we want to create the rhachet cli, with feedback on prior proposal',
    () => {
      const askText = `
    i need to outline a design for a npm typescript cli which calls an existingp rocedure within my repo

    the product spec is

    1. register the "roles" and "skills" that we can access (w/ readme's)
    2. invoke the roles and skills via cli (e.g., \`npx rhachet -r mechanic -s produce -t target/file/path -a "the ask to execute against\`)

    note
    - no dynamic registration. we'll register the skills and roles at devtime
    - at registration, each skill and role shoudl get a mini readme, declared at the registration point
        `.trim();
      const roadmapPriorArt = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.test/rhachetCli.outline.roadmap.nofeedback.example.md',
        },
        { access: 'readonly' },
      );
      const distilisysPriorArt = genArtifactGitFile(
        {
          uri: __dirname + '/.test/rhachetCli.distilisys.example.md',
        },
        { access: 'readonly' },
      );

      const distilisysArt = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepOutlineDistilisys/rhachetCli.withfeedback.distilisys.md',
        },
        { versions: true },
      );
      const feedbackArt = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepOutlineDistilisys/rhachetCli.withfeedback.feedback.md',
        },
        { versions: true },
      );

      beforeEach(async () => {
        await distilisysArt.set(
          await distilisysPriorArt.get().expect('isPresent'),
        ); // bootstrap the prior distilisys
        await feedbackArt.set({
          content:
            'move the registry under /contract/cli/registry.ts, since its only used for the cli',
        });
      });

      when('executed', () => {
        const threads = usePrep(async () => ({
          designer: await enrollThread({
            role: 'designer',
            stash: {
              art: {
                roadmap: roadmapPriorArt,
                distilisys: distilisysArt,
              },
            },
          }),
          caller: await enrollThread({
            role: 'caller',
            stash: {
              ask: askText,
              art: {
                feedback: feedbackArt,
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

          const { content } = await distilisysArt.get().expect('isPresent');
          expect(content).toMatch(/cli/i);
          expect(content).toMatch(/role/i);
        });
      });
    },
  );
});
