import { readFile } from 'fs/promises';
import {
  enrollThread,
  enweaveOneStitcher,
  type GStitcherOf,
  type Stitch,
} from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';

import { genStepArtSet } from './genStepArtSet';

describe('genStepArtSet (integration)', () => {
  const stitchedContent = 'Generated content for artifact';
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
  };

  given('a coder thread with net-new GitFile artifact', () => {
    const claimsArt = genArtifactGitFile({
      uri: __dirname + '/.temp/summary-new.md',
    });
    const route = genStepArtSet({ stitchee: 'coder', artee: 'summary' });

    then('it should infer threads with stash.art.summary correctly', () => {
      type Threads = GStitcherOf<typeof route>['threads'];

      // ✅ correct
      const valid: Threads = {
        coder: {
          context: {
            role: 'coder' as const,
            inherit: { traits: [], skills: [] },
            stash: {
              art: {
                summary: claimsArt,
              },
            },
          },
          stitches: [],
        },
      };
      expect(valid);
    });

    then('it should error if stash is missing', () => {
      type Threads = GStitcherOf<typeof route>['threads'];

      const missingstash: Threads = {
        coder: {
          // @ts-expect-error: stash is missing
          context: { role: 'coder' },
          stitches: [],
        },
      };
      expect(missingstash);
    });

    then('it should error if art is missing', () => {
      type Threads = GStitcherOf<typeof route>['threads'];

      const missingArt: Threads = {
        coder: {
          context: {
            role: 'coder',
            // @ts-expect-error: art is missing
            stash: {},
          },
          stitches: [],
        },
      };
      expect(missingArt);
    });

    then('it should error if summary is not an artifact', () => {
      type Threads = GStitcherOf<typeof route>['threads'];

      const badSummary: Threads = {
        coder: {
          role: 'coder',
          context: {
            stash: {
              art: {
                // @ts-expect-error: content dne on artifact
                summary: { content: 'not an artifact' },
              },
            },
          },
          stitches: [],
        },
      };
      expect(badSummary);
    });

    const threads = usePrep(async () => {
      const inflight = {
        coder: await enrollThread({
          role: 'coder',
          stash: {
            art: { summary: claimsArt },
          },
        }),
      };
      threads.coder.stitches.push({
        output: { content: stitchedContent },
      } as Stitch<any>);
      return inflight;
    });

    // afterAll(async () => {
    //   await claimsArt.del();
    // });

    when('executed via enweaveOneStitcher', () => {
      then('writes the content to a new file', async () => {
        const outcome = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );
        const result = outcome.stitch.output;
        expect(result.content).toBe(stitchedContent);
        const raw = await readFile(result.uri, 'utf-8');
        expect(raw).toBe(stitchedContent);
      });
    });
  });

  given('a coder thread with existing GitFile artifact to overwrite', () => {
    const claimsArt = genArtifactGitFile({
      uri: __dirname + '/.temp/summary-old.md',
    });
    const route = genStepArtSet({ stitchee: 'coder', artee: 'summary' });

    beforeAll(async () => {
      await claimsArt.set({ content: 'old-content' });
    });

    const threads = usePrep(async () => {
      const inflight = {
        coder: await enrollThread({
          role: 'coder',
          stash: {
            art: { summary: claimsArt },
          },
        }),
      };
      threads.coder.stitches.push({
        output: { content: stitchedContent },
      } as Stitch<any>);
      return inflight;
    });

    // afterAll(async () => {
    //   await claimsArt.del();
    // });

    when('executed via enweaveOneStitcher', () => {
      then('overwrites the file content', async () => {
        const outcome = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );
        const result = outcome.stitch.output;
        expect(result.content).toBe(stitchedContent);
        const raw = await readFile(result.uri, 'utf-8');
        expect(raw).toBe(stitchedContent);
      });
    });
  });
});
