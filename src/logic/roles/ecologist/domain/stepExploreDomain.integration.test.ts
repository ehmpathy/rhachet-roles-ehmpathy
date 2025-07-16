import { enweaveOneStitcher, enrollThread } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, when, then, usePrep } from 'test-fns';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { stepExploreDomain } from './stepExploreDomain';

describe('distillDomainActorsAndActions', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepExploreDomain;

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
        uri: __dirname + '/.temp/exploreDomain.homeServices.domain.md',
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
        student: await enrollThread({
          role: 'student',
          stash: {
            ask: askText,
            art: {
              domain: domainArt,
            },
          },
        }),
      }));

      then('upserts the artifact', async () => {
        await enweaveOneStitcher({ stitcher: route, threads }, context);

        const { content } = await domainArt.get().expect('isPresent');
        expect(content).toContain('"resources":');
        expect(content).toContain('"mechanisms":');
      });
    });
  });
});
