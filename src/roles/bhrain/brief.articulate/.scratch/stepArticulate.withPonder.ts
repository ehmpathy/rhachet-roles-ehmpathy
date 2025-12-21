import {
  asStitcherFlat,
  type GStitcher,
  genStitchRoute,
  type RoleContext,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';

import type { Focus } from '@src/_topublish/rhachet-roles-bhrain/src/domain/objects/Focus';
import type { ContextOpenAI } from '@src/access/sdk/sdkOpenAi';
import { useGenStepSwapArtifactFor } from '@src/domain.operations/artifact/genStepSwapArtifact';
import { loopArticulate } from '@src/roles/bhrain/brief.articulate/stepArticulate';

type StitcherDesired = GStitcher<
  Threads<{
    caller: RoleContext<
      'caller',
      {
        ask: string;
        art: {
          feedback: Artifact<typeof GitFile>;
          'foci.goal.concept': Focus['concept'];
          'foci.goal.context': Focus['context'];
          templates: Artifact<typeof GitFile>[];
        };
        refs: Artifact<typeof GitFile>[];
      }
    >;
    thinker: RoleContext<
      'thinker',
      {
        art: {
          'focus.context': Focus['context'];
          'focus.concept': Focus['concept'];
          'foci.articulate.context': Focus['context'];
          'foci.articulate.concept': Focus['concept'];
          'foci.ponder.que.context': Focus['context'];
          'foci.ponder.que.concept': Focus['concept'];
          'foci.ponder.ans.context': Focus['context'];
          'foci.ponder.ans.concept': Focus['concept'];
        };
        briefs: Artifact<typeof GitFile>[];
      }
    >;
  }>,
  ContextOpenAI & GStitcher['context'],
  unknown
>;

const swapArt = useGenStepSwapArtifactFor<StitcherDesired['threads']>();

export const loopsArticulateWithPonder = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker](<ponder> -> <articulate>)',
    readme: '@[thinker]: <ponder> -> [ponderage] -> <articulate> -> [article]',
    sequence: [
      // use the ponder.que focus
      swapArt({
        use: { stitchee: 'thinker', artee: 'foci.ponder.ans.concept' },
        as: { stitchee: 'thinker', artee: 'focus.concept' },
      }),
      swapArt({
        use: { stitchee: 'thinker', artee: 'foci.ponder.ans.context' },
        as: { stitchee: 'thinker', artee: 'focus.context' },
      }),

      // ponder
      loopPonder,

      // use articulate focus
      swapArt({
        use: { stitchee: 'thinker', artee: 'foci.articulate.concept' },
        as: { stitchee: 'thinker', artee: 'focus.concept' },
      }),
      swapArt({
        use: { stitchee: 'thinker', artee: 'foci.articulate.context' },
        as: { stitchee: 'thinker', artee: 'focus.context' },
      }),

      // articulate
      loopArticulate,
    ],
  }),
);
