import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { loopOutlineRoadmap } from './loopOutlineRoadmap';

jest.setTimeout(toMilliseconds({ minutes: 30 }));

describe('loopOutlineRoadmap', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = loopOutlineRoadmap;

  given('we want to create the rhachet cli', () => {
    const askText = `
i need to outline a design for a npm typescript cli which calls an existingp rocedure within my repo

the product spec is

1. register the "roles" and "skills" that we can access (w/ readme's)
2. invoke the roles and skills via cli (e.g., \`npx rhachet -r mechanic -s produce -t target/file/path -a "the ask to execute against\`)

note
- dynamic registration is NOT required. we can declare the RoleRegistry at devtime. the cli can then getRoleRegistry and use it at runtime.
    `.trim();

    const roadmapArt = genArtifactGitFile(
      {
        uri: __dirname + '/.temp/loopOutlineRoadmap/rhachetCli.roadmap.md',
      },
      { versions: true },
    );
    const feedbackArt = genArtifactGitFile(
      {
        uri: __dirname + '/.temp/loopOutlineRoadmap/rhachetCli.feedback.md',
      },
      { versions: true },
    );

    beforeEach(async () => {
      await roadmapArt.del();
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        designer: await enrollThread({
          role: 'designer',
          stash: {
            ask: askText,
            art: {
              roadmap: roadmapArt,
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

        const { content } = await roadmapArt.get().expect('isPresent');
        expect(content).toMatch(/cli/i);
        expect(content).toMatch(/role/i);
      });
    });
  });
});
