import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';

import { loopWrite } from './loopWrite';

describe('loopWrite', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = loopWrite;

  given('we want it write a poem, from scratch', () => {
    const askText = `
write a poem about brevity and concise, precise language

keep it between 3-5 lines

use the word precise at least once
    `.trim();

    const inflightArt = genArtifactGitFile(
      { uri: __dirname + '/.temp/loopWrite/poem.fromempty.inflight.md' },
      { versions: true },
    );
    const feedbackArt = genArtifactGitFile(
      { uri: __dirname + '/.temp/loopWrite/poem.fromempty.feedback.md' },
      { versions: true },
    );

    beforeEach(async () => {
      await inflightArt.del();
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: askText,
            art: { feedback: feedbackArt, references: [] },
          },
        }),
        mechanic: await enrollThread({
          role: 'mechanic',
          stash: {
            ask: askText,
            art: {
              inflight: inflightArt,
            },
          },
        }),
      }));

      then('upserts the artifact', async () => {
        await enweaveOneStitcher({ stitcher: route, threads }, context);

        const { content } = await inflightArt.get().expect('isPresent');
        expect(content).toContain('precise');
      });
    });
  });
});
