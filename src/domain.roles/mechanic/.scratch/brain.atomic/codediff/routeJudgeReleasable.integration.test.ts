import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';

import { routeJudgeReleasable } from './routeJudgeReleasable';

describe('routeJudgeReleasable', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };

  const route = routeJudgeReleasable;

  const claimsArt = genArtifactGitFile(
    {
      uri: __dirname + '/.test/multiply.claims.md',
    },
    { access: 'readonly' },
  );

  given('feedback has blockers, should not release', () => {
    const inflightArt = genArtifactGitFile({
      uri: __dirname + '/.temp/multiply.toreview.hasblockers.ts',
    });

    const feedbackArt = genArtifactGitFile({
      uri: __dirname + '/.temp/multiply.feedback.hasblockers.json',
    });

    const judgementArt = genArtifactGitFile({
      uri: __dirname + '/.temp/multiply.judgement.blocked.json',
    });

    beforeEach(async () => {
      await inflightArt.set({
        content: 'export const multiply=(a,b)=>a*b;',
      });

      await feedbackArt.set({
        content: JSON.stringify(
          [
            {
              kind: 'blocker',
              what: 'Missing type annotations',
              why: 'Without type info, logic may break under misuse.',
              where: {
                scope: 'implementation',
                sample: 'export const multiply=(a,b)=>a*b;',
              },
              impacts: 'functional',
            },
          ],
          null,
          2,
        ),
      });

      await judgementArt.del();
    });

    when('executing the judgement route', () => {
      const threads = usePrep(async () => ({
        judge: await enrollThread({
          role: 'judge',
          stash: {
            art: { judgement: judgementArt },
          },
        }),
        critic: await enrollThread({
          role: 'critic',
          stash: {
            art: { feedback: feedbackArt },
            org: { patterns: [] },
          },
        }),
        artist: await enrollThread({
          role: 'artist',
          stash: {
            art: { inflight: inflightArt },
            scene: { coderefs: [inflightArt] },
          },
        }),
        student: await enrollThread({
          role: 'student',
          stash: { art: { claims: claimsArt } },
        }),
      }));

      then(
        'writes judgement with release: false and blockers > 0',
        async () => {
          const result = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );

          const file = await judgementArt.get().expect('isPresent');
          const content = file.content;

          const parsed = JSON.parse(content);
          expect(parsed.releasable).toBe(false);
          expect(parsed.blockers).toBeGreaterThan(0);
          expect(parsed.grade).toBeDefined();
          expect(result.threads.judge.stitches.length).toBeGreaterThan(0);
        },
      );
    });
  });

  given('feedback has no blockers, should release', () => {
    const inflightArt = genArtifactGitFile({
      uri: __dirname + '/.temp/multiply.toreview.noblockers.ts',
    });

    const feedbackArt = genArtifactGitFile({
      uri: __dirname + '/.temp/multiply.feedback.noblockers.json',
    });

    const judgementArt = genArtifactGitFile({
      uri: __dirname + '/.temp/multiply.judgement.pass.json',
    });

    beforeEach(async () => {
      await inflightArt.set({
        content: `
export const multiply = ({ a, b }: { a: number, b: number }): number => {
  return a * b;
};`,
      });

      await feedbackArt.set({
        content: JSON.stringify(
          [
            {
              kind: 'praise',
              what: 'Clear parameter typing',
              why: 'Improves understanding and prevents misuse',
              where: {
                scope: 'implementation',
                sample: '({ a, b }: { a: number, b: number })',
              },
              impacts: 'technical.readability',
            },
          ],
          null,
          2,
        ),
      });

      await judgementArt.del();
    });

    when('executing the judgement route', () => {
      const threads = usePrep(async () => ({
        judge: await enrollThread({
          role: 'judge',
          stash: {
            art: { judgement: judgementArt },
          },
        }),
        critic: await enrollThread({
          role: 'critic',
          stash: {
            art: { feedback: feedbackArt },
            org: { patterns: [] },
          },
        }),
        artist: await enrollThread({
          role: 'artist',
          stash: {
            art: { inflight: inflightArt },
            scene: { coderefs: [inflightArt] },
          },
        }),
        student: await enrollThread({
          role: 'student',
          stash: { art: { claims: claimsArt } },
        }),
      }));

      then('writes judgement with release: true and blockers = 0', async () => {
        const result = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );

        const file = await judgementArt.get().expect('isPresent');
        const content = file.content;

        const parsed = JSON.parse(content);
        expect(parsed.releasable).toBe(true);
        expect(parsed.blockers).toBe(0);
        expect(parsed.grade).toBeDefined();
        expect(result.threads.judge.stitches.length).toBeGreaterThan(0);
      });
    });
  });
});
