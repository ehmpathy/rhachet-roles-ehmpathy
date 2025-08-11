import {
  GStitcher,
  RoleContext,
  StitchStepCompute,
  Threads,
  asStitcherFlat,
  genStitchRoute,
} from 'rhachet';
import { Artifact } from 'rhachet-artifact';
import { GitFile } from 'rhachet-artifact-git';
import { deSerialJSON, isSerialJSON } from 'serde-fns';

import { genStepArtSet } from '../../../../artifact/genStepArtSet';

type StitcherDesired = GStitcher<
  Threads<{
    thinker: RoleContext<
      'thinker',
      {
        art: {
          inflight: Artifact<typeof GitFile>;
          upstream: Artifact<typeof GitFile>;
        };
      }
    >;
  }>,
  GStitcher['context'],
  { content: string }
>;

const stepJsonAppend = new StitchStepCompute<
  GStitcher<
    StitcherDesired['threads'],
    GStitcher['context'],
    { content: string }
  >
>({
  slug: '@[thinker]<mergeJson>',
  readme: 'append upstream.json → inflight.json',
  form: 'COMPUTE',
  stitchee: 'thinker',
  invoke: async ({ threads }) => {
    const upstream = threads.thinker.context.stash.art.upstream;
    const inflight = threads.thinker.context.stash.art.inflight;

    const upstreamJson = deSerialJSON<any[]>(
      isSerialJSON.assure(
        (await upstream.get().expect('isPresent')).content ?? '[]',
      ),
    );
    const inflightJson = deSerialJSON<any[]>(
      isSerialJSON.assure((await inflight.get())?.content ?? '[]'),
    );

    const appended = JSON.stringify(
      [...inflightJson, ...upstreamJson],
      null,
      2,
    );

    return {
      input: null,
      output: { content: appended },
    };
  },
});

const stepPersist = genStepArtSet({
  stitchee: 'thinker',
  artee: 'inflight',
});

export const stepCollect = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<collect>',
    readme: '@[thinker]<jsonAppend>([artInflight, artUpstream])',
    sequence: [stepJsonAppend, stepPersist],
  }),
);
