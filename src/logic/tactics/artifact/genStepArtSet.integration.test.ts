import { readFile } from 'fs/promises';
import { enweaveOneStitcher, Stitch, Thread } from 'rhachet';
import { given, when, then } from 'test-fns';

import { genArtifactGitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { genContextLogTrail } from '../../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../../__test_assets__/genContextStitchTrail';
import { genStepArtSet } from './genStepArtSet';

const genThread = <C extends { role: string }>(context: C): Thread<C> =>
  new Thread({ context, stitches: [] });

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

    const threads = {
      coder: genThread({
        role: 'coder',
        art: { summary: claimsArt },
      }),
    };
    threads.coder.stitches.push({
      output: { content: stitchedContent },
    } as Stitch<any>);

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

    const threads = {
      coder: genThread({
        role: 'coder',
        art: { summary: claimsArt },
      }),
    };
    threads.coder.stitches.push({
      output: { content: stitchedContent },
    } as Stitch<any>);

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
