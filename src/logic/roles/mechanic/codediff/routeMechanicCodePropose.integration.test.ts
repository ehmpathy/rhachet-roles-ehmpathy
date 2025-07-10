import { toMilliseconds } from '@ehmpathy/uni-time';
import { enweaveOneStitcher } from 'rhachet';
import { given, when, then } from 'test-fns';

import { genArtifactGitFile } from '../../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { enrollThread } from '../../../../__nonpublished_modules__/rhachet/src/logic/enrollThread';
import { usePrep } from '../../../../__nonpublished_modules__/test-fns/src/usePrep';
import { genContextLogTrail } from '../../../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../../../__test_assets__/genContextStitchTrail';
import { getContextOpenAI } from '../../../../__test_assets__/getContextOpenAI';
import { getMechanicBrief } from '../getMechanicBrief';
import { getRefOrgPatterns } from './getRefOrgPatterns';
import { routeMechanicCodePropose } from './routeMechanicCodePropose';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('routeMechanicCodePropose', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };

  const route = routeMechanicCodePropose;

  given('we want to multiply two numbers', () => {
    const claimsArt = genArtifactGitFile(
      {
        uri: __dirname + '/.test/multiply.claims.md',
      },
      { access: 'readonly' },
    );

    given('well-structured code without blockers', () => {
      const inflightArt = genArtifactGitFile({
        uri: __dirname + '/.temp/mechanicCodePropose/fromgood.inflight.ts',
      });
      const feedbackArt = genArtifactGitFile({
        uri: __dirname + '/.temp/mechanicCodePropose/fromgood.feedback.json',
      });
      const feedbackCodestyleArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/mechanicCodePropose/fromgood.feedback.codestyle.json',
      });
      const judgementArt = genArtifactGitFile({
        uri: __dirname + '/.temp/mechanicCodePropose/fromgood.judgement.json',
      });
      const coderefArt = genArtifactGitFile({
        uri: __dirname + '/.temp/mechanicCodePropose/fromgood.coderef.ts',
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

        await coderefArt.set({
          content: `
/**
 * .what = mechanism to subtract two numbers
 * .why = consistent mathematics
 */
export const subtract = ({ a, b }: { a: number, b: number }): number => {
  return a * b;
};`,
        });
      });

      when('executing the full propose route', () => {
        const threads = usePrep(async () => ({
          artist: await enrollThread({
            role: 'artist',
            stash: {
              ask: 'multiply two numbers',
              art: { inflight: inflightArt },
              org: {
                patterns: getRefOrgPatterns({ purpose: 'produce' }),
              },
              scene: { coderefs: [coderefArt] },
            },
            inherit: {
              traits: [getMechanicBrief('style.compressed.md')],
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
            inherit: {
              traits: [getMechanicBrief('style.compressed.md')],
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
          mechanic: await enrollThread({
            role: 'mechanic',
            stash: {},
          }),
        }));

        then('produces a final proposal', async () => {
          const result = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );

          const finalProposal = await result.stitch.output
            .get()
            .expect('isPresent');
          const judgement = await judgementArt.get();

          const parsed = JSON.parse(judgement?.content ?? '{}');
          expect(parsed.releasable).toBe(true);
          expect(parsed.blockers).toBe(0);
          expect(parsed.grade).toBeDefined();

          expect(finalProposal?.content).toContain('multiply');
        });
      });
    });

    given('empty file input', () => {
      const inflightArt = genArtifactGitFile({
        uri: __dirname + '/.temp/mechanicCodePropose/fromempty.inflight.ts',
      });
      const feedbackArt = genArtifactGitFile({
        uri: __dirname + '/.temp/mechanicCodePropose/fromempty.feedback.json',
      });
      const feedbackCodestyleArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/mechanicCodePropose/fromempty.feedback.codestyle.json',
      });
      const judgementArt = genArtifactGitFile({
        uri: __dirname + '/.temp/mechanicCodePropose/fromempty.judgement.json',
      });

      beforeEach(async () => {
        await inflightArt.del();
        await feedbackArt.del();
        await feedbackCodestyleArt.del();
        await judgementArt.del();
      });

      when('executing the full propose route', () => {
        const threads = usePrep(async () => ({
          artist: await enrollThread({
            role: 'artist',
            stash: {
              ask: 'multiply two numbers',
              art: { inflight: inflightArt },
              org: {
                patterns: getRefOrgPatterns({ purpose: 'produce' }),
              },
              scene: { coderefs: [] },
            },
            inherit: {
              traits: [getMechanicBrief('style.compressed.md')],
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
            inherit: {
              traits: [getMechanicBrief('style.compressed.md')],
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
          mechanic: await enrollThread({
            role: 'mechanic',
            stash: {},
          }),
        }));

        then('produces a final proposal', async () => {
          const result = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );

          const proposal = await result.stitch.output.get().expect('isPresent');
          const judgement = await judgementArt.get().expect('isPresent');

          const parsed = JSON.parse(judgement.content);
          expect(parsed.releasable).toBe(true);
          expect(parsed.blockers).toBe(0);
          expect(parsed.grade).toBeDefined();

          expect(proposal.content).toContain('multiply');
        });
      });
    });
  });

  given('we want to get schedulable appointment windows for a pro', () => {
    const claimsArt = genArtifactGitFile(
      {
        uri: __dirname + '/.test/getSchedulableWindows.claims.md',
      },
      { access: 'readonly' },
    );
  });
});
