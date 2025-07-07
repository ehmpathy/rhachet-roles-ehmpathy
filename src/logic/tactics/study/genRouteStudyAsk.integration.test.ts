import { enweaveOneStitcher } from 'rhachet';
import { given, when, then } from 'test-fns';

import { genArtifactGitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { genContextLogTrail } from '../../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../../__test_assets__/genContextStitchTrail';
import { getContextOpenAI } from '../../../__test_assets__/getContextOpenAI';
import { genRouteStudyAsk } from './genRouteStudyAsk';

describe('genRouteStudyAsk (integration)', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = genRouteStudyAsk();

  given('a mechanic with ask, claim, and coderefs', () => {
    const askText = 'stubout the ability to subtract';

    const claimsArt = genArtifactGitFile({
      uri: __dirname + '/.temp/subtract.claims.md',
    });
    const coderefArt = genArtifactGitFile({
      uri: __dirname + '/.temp/subtract.coderef.md',
    });

    const coderefContent =
      'export const add = (a: number, b: number) => a + b;';

    beforeEach(async () => {
      await claimsArt.del();
      await coderefArt.set({ content: coderefContent });
    });

    when('excuted', () => {
      const threads = {
        mechanic: {
          context: {
            role: 'mechanic' as const,
            ask: askText,
            art: { claims: claimsArt },
            scene: { coderefs: [coderefArt] },
            traits: [],
            skills: [],
          },
          stitches: [],
        },
      };

      then('updates the claims artifact', async () => {
        const outcome = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );
        console.log(JSON.stringify(outcome, null, 2));

        const content = await claimsArt.get();
        expect(content).toContain('subtract');
      });
    });
  });

  given.only('a mechanic with ask, claim, and coderefs', () => {
    const askText = `
stubout genRouteArtistCodeDiffImagine

assume the artist thread will have .ask and .art.claims in the context
`;

    const claimsArt = genArtifactGitFile({
      uri: __dirname + '/.temp/demo.claims.md',
    });
    const coderefExampleMech = genArtifactGitFile({
      uri: '@gitroot/src/logic/tactics/study/genRouteStudyAsk.ts',
    });
    const coderefExampleTest = genArtifactGitFile({
      uri: '@gitroot/src/logic/tactics/study/genRouteStudyAsk.integration.test.ts',
    });

    beforeEach(async () => {
      await claimsArt.del();
    });

    when('excuted', () => {
      const threads = {
        mechanic: {
          context: {
            role: 'mechanic' as const,
            ask: askText,
            art: { claims: claimsArt },
            scene: { coderefs: [coderefExampleMech, coderefExampleTest] },
            traits: [],
            skills: [],
          },
          stitches: [],
        },
      };

      then('updates the claims artifact', async () => {
        const outcome = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );
        console.log(JSON.stringify(outcome, null, 2));
      });
    });
  });
});
