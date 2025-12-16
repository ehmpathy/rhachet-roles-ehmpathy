// routeMechanicCodeIterate.integration.test.ts
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';

import { getRefOrgPatterns } from './getRefOrgPatterns';
import { routeMechanicCodeIterate } from './routeMechanicCodeIterate';

describe('routeMechanicCodeIterate', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };

  const route = routeMechanicCodeIterate;

  given('we want to multiply', () => {
    const claimsArt = genArtifactGitFile(
      {
        uri: __dirname + '/.test/multiply.claims.md',
      },
      { access: 'readonly' },
    );

    given('code with known blockers', () => {
      const inflightArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/mechanicCodeIterate/multiply.hasblockers.inflight.ts',
      });

      const feedbackArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/mechanicCodeIterate/multiply.hasblockers.feedback.json',
      });
      const feedbackCodestyleArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/mechanicCodeIterate/multiply.hasblockers.feedback.codestyle.json',
      });

      const judgementArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/mechanicCodeIterate/multiply.hasblockers.judgement.json',
      });

      beforeEach(async () => {
        await inflightArt.set({
          content: 'export const multiply=(a,b)=>a*b;',
        });
        await feedbackArt.del();
        await judgementArt.del();
      });

      when('executing the mechanic iterate route', () => {
        const threads = usePrep(async () => ({
          artist: await enrollThread({
            role: 'artist',
            stash: {
              ask: 'multiply two numbers',
              art: { inflight: inflightArt },
              org: { patterns: [] },
              scene: { coderefs: [inflightArt] },
            },
          }),
          critic: await enrollThread({
            role: 'critic',
            stash: {
              art: {
                feedback: feedbackArt,
                feedbackCodestyle: feedbackCodestyleArt,
              },
              org: {
                patterns: await getRefOrgPatterns({ purpose: 'produce' }),
              },
            },
          }),
          student: await enrollThread({
            role: 'student',
            stash: { art: { claims: claimsArt } },
          }),
          judge: await enrollThread({
            role: 'judge',
            stash: { art: { judgement: judgementArt } },
          }),
        }));

        then(
          'produces feedback and a judgement that blocks release',
          async () => {
            const result = await enweaveOneStitcher(
              { stitcher: route, threads },
              context,
            );

            const judgement = await judgementArt.get();
            const feedback = await feedbackArt.get();

            const parsed = JSON.parse(judgement?.content ?? '{}');
            expect(parsed.releasable).toBe(false);
            expect(parsed.blockers).toBeGreaterThan(0);
            expect(parsed.grade).toBeDefined();

            expect(feedback?.content).toMatch(/blocker/i);
            expect(result.threads.judge.stitches.length).toBeGreaterThan(0);
          },
        );
      });
    });

    given.only('well-structured code without blockers', () => {
      const inflightArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/mechanicCodeIterate/multiply.nonblockers.inflight.ts',
      });

      const feedbackArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/mechanicCodeIterate/multiply.nonblockers.feedback.json',
      });
      const feedbackCodestyleArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/mechanicCodeIterate/multiply.nonblockers.feedback.codestyle.json',
      });

      const judgementArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/mechanicCodeIterate/multiply.nonblockers.judgement.json',
      });

      beforeEach(async () => {
        await inflightArt.set({
          content: `
export const multiply = ({ a, b }: { a: number, b: number }): number => {
  return a * b;
};`,
        });
        await feedbackArt.del();
        await judgementArt.del();
      });

      when('executing the mechanic iterate route', () => {
        const threads = usePrep(async () => ({
          artist: await enrollThread({
            role: 'artist',
            stash: {
              ask: 'multiply two numbers',
              art: { inflight: inflightArt },
              org: {
                patterns: getRefOrgPatterns({ purpose: 'produce' }),
              },
              scene: { coderefs: [inflightArt] },
            },
          }),
          critic: await enrollThread({
            role: 'critic',
            stash: {
              art: {
                feedback: feedbackArt,
                feedbackCodestyle: feedbackCodestyleArt,
              },
              org: {
                patterns: getRefOrgPatterns({ purpose: 'produce' }),
              },
            },
          }),
          student: await enrollThread({
            role: 'student',
            stash: { art: { claims: claimsArt } },
          }),
          judge: await enrollThread({
            role: 'judge',
            stash: { art: { judgement: judgementArt } },
          }),
        }));

        then(
          'produces positive feedback and a releasable judgement',
          async () => {
            const result = await enweaveOneStitcher(
              { stitcher: route, threads },
              context,
            );

            const judgement = await judgementArt.get();
            const feedback = await feedbackArt.get();

            const parsed = JSON.parse(judgement?.content ?? '{}');
            expect(parsed.releasable).toBe(true);
            expect(parsed.blockers).toBe(0);
            expect(parsed.grade).toBeDefined();

            expect(feedback?.content).not.toMatch(/blocker/i);
            expect(result.threads.judge.stitches.length).toBeGreaterThan(0);
          },
        );
      });
    });
  });
});
