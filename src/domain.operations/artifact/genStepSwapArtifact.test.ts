import { enrollThread, enweaveOneStitcher, type GStitcherOf } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';

import { genStepSwapArtifact } from './genStepSwapArtifact';

describe('genStepSwapArtifact (integration)', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
  };

  given('want to set thinker.inflight = thinker.inflights.diverge', () => {
    const divergeArt = genArtifactGitFile({
      uri: __dirname + '/.temp/diverge-artifact.md',
    });

    const route = genStepSwapArtifact({
      use: {
        stitchee: 'thinker',
        artee: 'inflights.diverge',
      },
      as: {
        stitchee: 'thinker',
        artee: 'inflight',
      },
    });

    when('infer type of threads', () => {
      then('it should have the expected input shape', () => {
        type Threads = GStitcherOf<typeof route>['threads'];

        const valid: Threads = {
          thinker: {
            context: {
              role: 'thinker' as const,
              inherit: { traits: [], skills: [] },
              stash: {
                art: {
                  'inflights.diverge': divergeArt,
                  inflight: null, // placeholder for the actual inflight artifact
                },
              },
            },
            stitches: [],
          },
        };
        expect(valid);
      });

      then('it should error if .from art is missing', () => {
        type Threads = GStitcherOf<typeof route>['threads'];

        const missingFromArt: Threads = {
          thinker: {
            context: {
              role: 'thinker',
              inherit: { traits: [], skills: [] },
              stash: {
                // @ts-expect-error: 'inflights.diverge' art is missing
                art: {
                  inflight: null, // only missing .from art
                },
              },
            },
            stitches: [],
          },
        };
        expect(missingFromArt);
      });

      then('it should error if .onto art is missing', () => {
        type Threads = GStitcherOf<typeof route>['threads'];

        const missingOntoArt: Threads = {
          thinker: {
            context: {
              role: 'thinker',
              inherit: { traits: [], skills: [] },
              stash: {
                // @ts-expect-error: 'inflight' art is missing
                art: {
                  'inflights.diverge': divergeArt, // only missing .onto art
                },
              },
            },
            stitches: [],
          },
        };
        expect(missingOntoArt);
      });
    });

    when('executed via enweaveOneStitcher, with exact threads', () => {
      const threads = usePrep(async () => {
        const inflight = {
          thinker: await enrollThread({
            role: 'thinker',
            stash: {
              art: {
                'inflights.diverge': divergeArt,
                inflight: null, // placeholder for the actual inflight artifact
              },
            },
          }),
        };
        return inflight;
      });

      then(
        "updates the thinker's stash with the diverge artifact",
        async () => {
          const outcome = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );
          const result = outcome.stitch.output;
          expect(result.from.artifact.ref).toEqual(
            threads.thinker.context.stash.art['inflights.diverge'].ref,
          );
          expect(
            outcome.threads.thinker.context.stash.art.inflight?.ref,
          ).toEqual(threads.thinker.context.stash.art['inflights.diverge'].ref);
        },
      );
    });

    when('executed via enweaveOneStitcher, with extra threads', () => {
      const threads = usePrep(async () => {
        const inflight = {
          caller: await enrollThread({ role: 'caller' }),
          thinker: await enrollThread({
            role: 'thinker',
            stash: {
              art: {
                'inflights.diverge': divergeArt,
                inflight: null, // placeholder for the actual inflight artifact
              },
            },
          }),
        };
        return inflight;
      });

      then(
        "updates the thinker's stash with the diverge artifact",
        async () => {
          const outcome = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );
          const result = outcome.stitch.output;
          expect(result.from.artifact.ref).toEqual(
            threads.thinker.context.stash.art['inflights.diverge'].ref,
          );
          expect(
            outcome.threads.thinker.context.stash.art.inflight?.ref,
          ).toEqual(threads.thinker.context.stash.art['inflights.diverge'].ref);
        },
      );
    });
  });
});
