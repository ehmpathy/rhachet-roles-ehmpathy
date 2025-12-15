import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/logic/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/logic/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/logic/.test/getContextOpenAI';

import { loopStudyDomain } from './loopStudyDomain';

describe('loopStudyDomain', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = loopStudyDomain;

  given('we want to explore the home service domain', () => {
    const askText = `
home service domain
- [pro] = [provider] = a brand
- [doer] = a person under a pro
- [nei] = [neighbor] = a local resident, manager, etc; customer

neighbors need to schedule with providers
    `.trim();

    const inflightArt = genArtifactGitFile(
      { uri: __dirname + '/.temp/loopStudyDomain/homeService.inflight.md' },
      { versions: true },
    );
    const feedbackArt = genArtifactGitFile(
      { uri: __dirname + '/.temp/loopStudyDomain/homeService.feedback.md' },
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
            art: { feedback: feedbackArt },
          },
        }),
        student: await enrollThread({
          role: 'student',
          stash: {
            art: {
              domain: inflightArt,
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
