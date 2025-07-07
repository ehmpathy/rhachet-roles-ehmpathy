import { UnexpectedCodePathError } from 'helpful-errors';
import { enweaveOneStitcher } from 'rhachet';
import { given, when, then } from 'test-fns';

import { genArtifactGitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { genThread } from '../../../__nonpublished_modules__/rhachet/src/logic/genThread';
import { addRoleTraits } from '../../../__nonpublished_modules__/rhachet/src/logic/role/addRoleTraits';
import { usePrep } from '../../../__nonpublished_modules__/test-fns/src/usePrep';
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

    when('executed', () => {
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

        const { content } =
          (await claimsArt.get()) ??
          UnexpectedCodePathError.throw('expected file');
        expect(content).toContain('subtract');
      });
    });
  });

  given.only('a mechanic with ask, claim, and coderefs', () => {
    const askText = `
declare addRoleTraits, which adds traits to any role

enable it to accept either { content } or Artifact<typeof GitFile> list
`;

    const claimsArt = genArtifactGitFile({
      uri: __dirname + '/.temp/demo.claims.md',
    });
    const coderefRoleContext = genArtifactGitFile({
      uri: '@gitroot/src/domain/objects/RoleContext.ts',
    });
    const coderefExampleMech = genArtifactGitFile({
      uri: '@gitroot/src/__nonpublished_modules__/rhachet/src/logic/genThread.ts',
    });

    beforeEach(async () => {
      await claimsArt.del();
    });

    when('executed', () => {
      const mechanic = genThread({
        role: 'mechanic' as const,
        ask: askText,
        art: { claims: claimsArt },
        scene: { coderefs: [coderefExampleMech, coderefRoleContext] },
        traits: [],
        skills: [],
      });
      const threads = usePrep(async () => {
        return {
          mechanic: await addRoleTraits({
            thread: mechanic,
            from: {
              artifacts: [
                genArtifactGitFile({
                  uri: '@gitroot/src/logic/tactics/codediff/.refs/style.compressed.md',
                }),
              ],
            },
          }),
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
