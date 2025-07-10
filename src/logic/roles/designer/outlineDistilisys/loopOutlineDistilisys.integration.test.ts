import { toMilliseconds } from '@ehmpathy/uni-time';
import { enweaveOneStitcher } from 'rhachet';
import { given, when, then } from 'test-fns';

import { genArtifactGitFile } from '../../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { enrollThread } from '../../../../__nonpublished_modules__/rhachet/src/logic/enrollThread';
import { usePrep } from '../../../../__nonpublished_modules__/test-fns/src/usePrep';
import { genContextLogTrail } from '../../../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../../../__test_assets__/genContextStitchTrail';
import { getContextOpenAI } from '../../../../__test_assets__/getContextOpenAI';
import { loopOutlineDistilisys } from './loopOutlineDistilisys';

jest.setTimeout(toMilliseconds({ minutes: 30 }));

describe('loopOutlineDistilisys', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = loopOutlineDistilisys;

  given('we want to create the rhachet cli', () => {
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
          '/.temp/loopOutlineDistilisys/rhachetCli.fromscratch.distilisys.md',
      },
      { versions: true },
    );
    const feedbackArt = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/loopOutlineDistilisys/rhachetCli.fromscratch.feedback.md',
      },
      { versions: true },
    );

    beforeEach(async () => {
      await distilisysArt.del();
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
  });
});
