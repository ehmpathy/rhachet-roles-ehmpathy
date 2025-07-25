import { UnexpectedCodePathError } from 'helpful-errors';
import { enweaveOneStitcher, enrollThread } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, when, then, usePrep } from 'test-fns';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { getMechanicBrief } from '../getMechanicBrief';
import { getRefOrgPatterns } from './getRefOrgPatterns';
import { routeArtistCodeDiff } from './routeArtistCodeDiff';

describe('routeArtistCodeDiff', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };

  const route = routeArtistCodeDiff;

  const claimsArt = genArtifactGitFile(
    {
      uri: __dirname + '/.test/multiply.claims.md',
    },
    { access: 'readonly' }, // this is a fixture, dont allow overwrite
  );

  given('we want to multiply', () => {
    const coderefArt = genArtifactGitFile({
      uri: __dirname + '/.temp/add.ts',
    });

    given('inflightArt is empty, writes net new', () => {
      const askText = 'add a multiply function to the codebase';

      const inflightArt = genArtifactGitFile({
        uri: __dirname + '/.temp/multiply.make.ts',
      });

      beforeEach(async () => {
        await inflightArt.del();
        await coderefArt.set({
          content: 'export const add = (a: number, b: number) => a + b;',
        });
      });

      when('executing the route', () => {
        const threads = usePrep(async () => {
          return {
            artist: await enrollThread({
              role: 'artist',
              stash: {
                ask: askText,
                art: { inflight: inflightArt },
                scene: { coderefs: [coderefArt] },
                org: {
                  patterns: await getRefOrgPatterns({ purpose: 'produce' }),
                },
              },
              inherit: {
                traits: [getMechanicBrief('style.compressed.md')],
              },
            }),
            student: await enrollThread({
              role: 'student',
              stash: {
                art: { claims: claimsArt },
              },
            }),
            critic: await enrollThread({
              role: 'critic',
              stash: {
                art: { feedback: null }, // no feedback yet
              },
            }),
          };
        });

        then('writes updated diff content to the target artifact', async () => {
          const result = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );

          const file = await inflightArt.get();
          const content =
            file?.content ?? UnexpectedCodePathError.throw('expected file');

          expect(content).toMatch(/multiply/);
          expect(content.length).toBeGreaterThan(10);
          expect(result.threads.artist.stitches.length).toBeGreaterThan(0);
        });
      });
    });

    given('inflightArt has prior content, asks for readability diff', () => {
      const askText = 'improve the readability of the multiply function';

      const inflightArt = genArtifactGitFile({
        uri: __dirname + '/.temp/multiply.readable.ts',
      });

      beforeEach(async () => {
        await inflightArt.set({
          content: 'export const multiply=(a,b)=>a*b;',
        });

        await coderefArt.set({
          content: `
/**
 * .what = adds two numbers together
 * .why  = used to compute a total or combine numeric values
 */
export const add = (input: [number, number]) => input[0] + input[1];
          `.trim(),
        });
      });

      when('executing the route', () => {
        const threads = usePrep(async () => ({
          artist: await enrollThread({
            role: 'artist',
            stash: {
              ask: askText,
              art: { inflight: inflightArt },
              scene: { coderefs: [coderefArt] },
              org: {
                patterns: await getRefOrgPatterns({ purpose: 'produce' }),
              },
            },
            inherit: {
              traits: [getMechanicBrief('style.compressed.md')],
            },
          }),
          student: await enrollThread({
            role: 'student',
            stash: {
              art: { claims: claimsArt },
            },
          }),
          critic: await enrollThread({
            role: 'critic',
            stash: {
              art: { feedback: null }, // no feedback yet
            },
          }),
        }));

        then('rewrites inflight with a more readable version', async () => {
          const result = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );

          const file = await inflightArt.get();
          const content =
            file?.content ?? UnexpectedCodePathError.throw('expected file');

          expect(content).toMatch(/multiply/);
          expect(result.threads.artist.stitches.length).toBeGreaterThan(0);
        });
      });
    });

    given(
      'inflightArt has prior content, responds to critic feedback, has blockers',
      () => {
        const askText = 'improve the readability of the multiply function';

        const feedbackArt = genArtifactGitFile(
          {
            uri: __dirname + '/.test/multiply.feedback.hasblockers.md',
          },
          { access: 'readonly' }, // this is a fixture, dont allow overwrite
        );

        const inflightArt = genArtifactGitFile({
          uri: __dirname + '/.temp/multiply.feedbacked.hadblockers.ts',
        });

        beforeEach(async () => {
          await inflightArt.set({
            content: 'export const multiply=(a,b)=>a*b;',
          });
        });

        when('executing the route', () => {
          const threads = usePrep(async () => ({
            artist: await enrollThread({
              role: 'artist',
              stash: {
                ask: askText,
                art: { inflight: inflightArt },
                scene: { coderefs: [] },
                org: {
                  patterns: await getRefOrgPatterns({ purpose: 'produce' }),
                },
              },
              inherit: {
                traits: [getMechanicBrief('style.compressed.md')],
              },
            }),
            student: await enrollThread({
              role: 'student',
              stash: {
                art: { claims: claimsArt },
              },
            }),
            critic: await enrollThread({
              role: 'critic',
              stash: {
                art: { feedback: feedbackArt },
              },
            }),
          }));

          then('responds to feedback', async () => {
            const result = await enweaveOneStitcher(
              { stitcher: route, threads },
              context,
            );

            const file = await inflightArt.get();
            const content =
              file?.content ?? UnexpectedCodePathError.throw('expected file');

            expect(content).toMatch(/multiply/);
            expect(content).toMatch(/\}\)/); // should have context input
            expect(result.threads.artist.stitches.length).toBeGreaterThan(0);
          });
        });
      },
    );

    given(
      'inflightArt has prior content, responds to critic feedback, nonblockers',
      () => {
        const askText = 'improve the readability of the multiply function';

        const feedbackArt = genArtifactGitFile(
          {
            uri: __dirname + '/.test/multiply.feedback.nonblockers.md',
          },
          { access: 'readonly' }, // this is a fixture, dont allow overwrite
        );

        const inflightArt = genArtifactGitFile({
          uri: __dirname + '/.temp/multiply.feedbacked.nonblockers.ts',
        });

        beforeEach(async () => {
          await inflightArt.set({
            content: `
  export const multiply = ({ a, b }: { a: number, b: number }): number => {
      return a * b;
  };
          `,
          });
        });

        when('executing the route', () => {
          const threads = usePrep(async () => ({
            artist: await enrollThread({
              role: 'artist',
              stash: {
                ask: askText,
                art: { inflight: inflightArt },
                scene: { coderefs: [] },
                org: {
                  patterns: await getRefOrgPatterns({ purpose: 'produce' }),
                },
              },
              inherit: {
                traits: [getMechanicBrief('style.compressed.md')],
              },
            }),
            student: await enrollThread({
              role: 'student',
              stash: {
                art: { claims: claimsArt },
              },
            }),
            critic: await enrollThread({
              role: 'critic',
              stash: {
                art: { feedback: feedbackArt },
              },
            }),
          }));

          then('responds to feedback', async () => {
            const result = await enweaveOneStitcher(
              { stitcher: route, threads },
              context,
            );

            const file = await inflightArt.get();
            const content =
              file?.content ?? UnexpectedCodePathError.throw('expected file');

            expect(content).toMatch(/multiply/);
            expect(content).toMatch(/\}\)/); // should have context input
            expect(result.threads.artist.stitches.length).toBeGreaterThan(0);
          });
        });
      },
    );
  });
});
