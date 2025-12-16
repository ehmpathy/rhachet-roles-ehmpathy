import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/logic/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/logic/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/logic/.test/getContextOpenAI';

import { stepStudyDomain } from './stepStudyDomain';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepStudyDomain', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepStudyDomain;

  given('we want to explore the home service domain', () => {
    const askText = `
home service domain
- [pro] = [provider] = a brand
- [doer] = a person under a pro
- [nei] = [neighbor] = a local resident, manager, etc; customer

neighbors need to schedule with providers
    `.trim();

    const domainArt = genArtifactGitFile(
      {
        uri: __dirname + '/.temp/stepStudyDomain/homeServices.domain.md',
      },
      {
        versions: true,
      },
    );

    beforeEach(async () => {
      await domainArt.del();
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: askText,
            art: {
              feedback: null,
            },
          },
        }),
        student: await enrollThread({
          role: 'student',
          stash: {
            art: {
              domain: domainArt,
            },
          },
        }),
      }));

      then('upserts the artifact', async () => {
        const result = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );

        console.log(JSON.stringify(result.stitch, null, 2));

        const { content } = await domainArt.get().expect('isPresent');
        expect(content).toContain('pro');
      });
    });
  });
});
