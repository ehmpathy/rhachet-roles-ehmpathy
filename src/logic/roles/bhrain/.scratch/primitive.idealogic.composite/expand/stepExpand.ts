import {
  asStitcherFlat,
  genStitchRoute,
  GStitcher,
  RoleContext,
  Threads,
} from 'rhachet';
import { Artifact } from 'rhachet-artifact';
import { GitFile } from 'rhachet-artifact-git';

import { ContextOpenAI } from '../../../../../data/sdk/sdkOpenAi';
import { stepResetFeedback } from '../../../../artifact/genStepResetFeedback';
import { useGenStepSwapArtifactFor } from '../../../../artifact/genStepSwapArtifact';
import { stepCollect } from '../../primitive.idealogic.atomic/collect/stepCollect';
import { stepDiverge } from '../../primitive.idealogic.atomic/diverge/stepDiverge';

type StitcherDesired = GStitcher<
  Threads<{
    caller: RoleContext<
      'caller',
      {
        ask: string;
        art: {
          feedback: Artifact<typeof GitFile>; // required to facilitate loop
        };
      }
    >;
    thinker: RoleContext<
      'thinker',
      {
        art: {
          inflight: Artifact<typeof GitFile>;
          upstream: Artifact<typeof GitFile>;
          'inflights.diverge': Artifact<typeof GitFile>;
          'inflights.collect': Artifact<typeof GitFile>;
        };
        purpose: string;
        grammar: string;
      }
    >;
  }>,
  ContextOpenAI & GStitcher['context'],
  any
>;

const swapArt = useGenStepSwapArtifactFor<StitcherDesired['threads']>();

export const stepExpand = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<expand>',
    readme: '@[thinker]<diverge> -> @[thinker]<collect>',
    sequence: [
      // prep:<diverge>
      swapArt({
        // set @thinker[inflight] = @thinker.inflights.diverge
        use: { stitchee: 'thinker', artee: 'inflights.diverge' },
        as: { stitchee: 'thinker', artee: 'inflight' },
      }),

      // prod:<diverge>
      stepDiverge,

      // prep:<collect>
      swapArt({
        // @thinker[inflight] = @thinker.inflights.collect
        use: { stitchee: 'thinker', artee: 'inflights.collect' },
        as: { stitchee: 'thinker', artee: 'inflight' },
      }),
      swapArt({
        // @thinker[upstream] = @thinker.inflights.diverge
        use: { stitchee: 'thinker', artee: 'inflights.diverge' },
        as: { stitchee: 'thinker', artee: 'upstream' },
      }),
      stepResetFeedback,

      // prod:<collect>
      stepCollect,
    ],
  }),
);
