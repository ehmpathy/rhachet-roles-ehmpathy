import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { asSerialJSON, deSerialJSON, isSerialJSON } from 'serde-fns';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/domain.operations/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/domain.operations/.test/genContextStitchTrail';

import { stepCollect } from './stepCollect';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

describe('stepCollect', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
  };
  const route = stepCollect;

  given('inflight empty, upstream not', () => {
    const inflightArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepCollect/updated/homeservice.schedule.inflight.json',
      },
      { versions: true },
    );
    const upstreamArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepCollect/updated/homeservice.schedule.upstream.json',
      },
      { versions: true },
    );
    const upstreamContentExample = ['a', 2, 'c'];

    beforeEach(async () => {
      await inflightArtifact.del();
      await upstreamArtifact.set({
        content: asSerialJSON(upstreamContentExample),
      });
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        thinker: await enrollThread({
          role: 'thinker',
          stash: {
            art: { inflight: inflightArtifact, upstream: upstreamArtifact },
          },
        }),
      }));

      then('upserts the artifact', async () => {
        const result = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );

        console.log(JSON.stringify(result.stitch, null, 2));

        const { content } = await inflightArtifact.get().expect('isPresent');
        expect(deSerialJSON(isSerialJSON.assure(content))).toEqual(
          upstreamContentExample,
        );
      });
    });
  });

  given('inflight non empty, upstream too', () => {
    const inflightArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepCollect/updated/homeservice.schedule.inflight.json',
      },
      { versions: true },
    );
    const upstreamArtifact = genArtifactGitFile(
      {
        uri:
          __dirname +
          '/.temp/stepCollect/updated/homeservice.schedule.upstream.json',
      },
      { versions: true },
    );
    const inflightContentExample = ['x', 'y', 'z'];
    const upstreamContentExample = ['a', 2, 'c'];

    beforeEach(async () => {
      await inflightArtifact.set({
        content: asSerialJSON(inflightContentExample),
      });
      await upstreamArtifact.set({
        content: asSerialJSON(upstreamContentExample),
      });
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        thinker: await enrollThread({
          role: 'thinker',
          stash: {
            art: { inflight: inflightArtifact, upstream: upstreamArtifact },
          },
        }),
      }));

      then('upserts the artifact', async () => {
        const result = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );

        console.log(JSON.stringify(result.stitch, null, 2));

        const { content } = await inflightArtifact.get().expect('isPresent');
        expect(deSerialJSON(isSerialJSON.assure(content))).toEqual([
          ...inflightContentExample,
          ...upstreamContentExample,
        ]);
      });
    });
  });
});
