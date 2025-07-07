import { UnexpectedCodePathError } from 'helpful-errors';
import { enweaveOneStitcher } from 'rhachet';
import { given, when, then } from 'test-fns';

import { genArtifactGitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { enrollThread } from '../../../__nonpublished_modules__/rhachet/src/logic/enrollThread';
import { usePrep } from '../../../__nonpublished_modules__/test-fns/src/usePrep';
import { genContextLogTrail } from '../../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../../__test_assets__/genContextStitchTrail';
import { getContextOpenAI } from '../../../__test_assets__/getContextOpenAI';
import { genRouteStudyAsk } from './genRouteStudyAsk';

describe('genRouteStudyAsk ', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = genRouteStudyAsk();

  given('a student with ask, claim, and coderefs', () => {
    const askText = 'stubout the ability to multiply';

    const claimsArt = genArtifactGitFile({
      uri: __dirname + '/.temp/multiply.claims.md',
    });
    const coderefArt = genArtifactGitFile({
      uri: __dirname + '/.temp/multiply.coderef.md',
    });

    const coderefContent =
      'export const add = (a: number, b: number) => a + b;';

    beforeEach(async () => {
      await claimsArt.del();
      await coderefArt.set({ content: coderefContent });
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        student: await enrollThread({
          role: 'student',
          stash: {
            ask: askText,
            art: { claims: claimsArt },
            scene: { coderefs: [coderefArt] },
          },
          inherit: {
            traits: [
              genArtifactGitFile({
                uri: '@gitroot/src/logic/tactics/codediff/.refs/style.compressed.md',
              }),
            ],
          },
        }),
      }));

      then('updates the claims artifact', async () => {
        const outcome = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );
        console.log(JSON.stringify(outcome, null, 2));

        const { content } =
          (await claimsArt.get()) ??
          UnexpectedCodePathError.throw('expected file');
        expect(content).toContain('multiply');
      });
    });
  });

  given.only('a student with ask, claim, and coderefs', () => {
    const askText = `
declare addRoleTraits, which adds traits to any role

enable it to accept either { content } or Artifact<typeof GitFile> list
`;

    const claimsArt = genArtifactGitFile({
      uri: __dirname + '/.temp/demo.claims.md',
    });
    const coderefExampleMech = genArtifactGitFile({
      uri: '@gitroot/src/__nonpublished_modules__/rhachet/src/logic/genThread.ts',
    });

    beforeEach(async () => {
      await claimsArt.del();
    });

    when('executed', () => {
      const threads = usePrep(async () => {
        const student = await enrollThread({
          role: 'student',
          stash: {
            ask: askText,
            art: { claims: claimsArt },
            scene: { coderefs: [coderefExampleMech] },
          },
          inherit: {
            traits: [
              genArtifactGitFile({
                uri: '@gitroot/src/logic/tactics/codediff/.refs/style.compressed.md',
              }),
            ],
          },
        });
        return {
          student,
        };
      });

      then('updates the claims artifact', async () => {
        console.log({ threads });
        const outcome = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );
        console.log(JSON.stringify(outcome, null, 2));
      });
    });
  });
});
