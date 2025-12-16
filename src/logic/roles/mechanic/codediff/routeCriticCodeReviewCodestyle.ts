import {
  asStitcherFlat,
  type GStitcher,
  genStepImagineViaTemplate,
  genStitchRoute,
  genTemplate,
  getTemplateValFromArtifacts,
  getTemplateVarsFromRoleInherit,
  type RoleContext,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';

import { type ContextOpenAI, sdkOpenAi } from '@src/data/sdk/sdkOpenAi';
import { genStepArtSet } from '@src/logic/artifact/genStepArtSet';
import { getMechanicBriefs } from '@src/logic/roles/mechanic/getMechanicBrief';

interface ThreadsDesired
  extends Threads<{
    critic: RoleContext<
      'critic',
      {
        art: { feedbackCodestyle: Artifact<typeof GitFile> };
        org: {
          patterns: Artifact<typeof GitFile>[];
        };
      }
    >;
    artist: RoleContext<
      'artist',
      {
        art: {
          inflight: Artifact<typeof GitFile>;
        };
        scene: {
          coderefs: Artifact<typeof GitFile>[];
        };
      }
    >;
  }> {}

type StitcherDesired = GStitcher<
  ThreadsDesired,
  ContextOpenAI & GStitcher['context'],
  { content: string }
>;

const template = genTemplate<ThreadsDesired>({
  ref: { uri: __dirname + '/routeCriticCodeReviewCodestyle.template.md' },
  getVariables: async ({ threads }) => ({
    ...(await getTemplateVarsFromRoleInherit({ thread: threads.artist })),
    diff: (
      await threads.artist.context.stash.art.inflight.get().expect('isPresent')
    )?.content,
    codestyle: await getTemplateValFromArtifacts({
      artifacts: getMechanicBriefs([
        'codestyle/mech.what-why.v2.md',
        'codestyle/flow.single-responsibility.md',
        'codestyle/mech.args.input-context.md',
        'codestyle/mech.arrowonly.md',
        'codestyle/mech.clear-contracts.md',
        'codestyle/flow.failfast.md',
        'codestyle/flow.idempotency.md',
        'codestyle/flow.immutability.md',
        'codestyle/flow.narratives.md',
      ]),
    }),
  }),
});

const stepImagineFeedback = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[critic]<review><codestyle><imagine>',
  stitchee: 'critic',
  readme: 'intent(reviews artist inflight diff)',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepArtSet = genStepArtSet({
  stitchee: 'critic',
  artee: 'feedbackCodestyle',
});

export const routeCriticCodeReviewCodestyle = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[critic]<review><codestyle>',
    readme: '@[critic]<review><codestyle> -> [feedbackCodestyle]',
    sequence: [stepImagineFeedback, stepArtSet],
  }),
);
