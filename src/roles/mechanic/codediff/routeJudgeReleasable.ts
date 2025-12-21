import {
  asStitcherFlat,
  type GStitcher,
  genStepImagineViaTemplate,
  genStitchRoute,
  genTemplate,
  getTemplateVarsFromRoleInherit,
  type RoleContext,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';

import { type ContextOpenAI, sdkOpenAi } from '@src/access/sdk/sdkOpenAi';
import { genStepArtSet } from '@src/domain.operations/artifact/genStepArtSet';

interface ThreadsDesired
  extends Threads<{
    judge: RoleContext<
      'judge',
      {
        art: { judgement: Artifact<typeof GitFile> };
      }
    >;
    critic: RoleContext<
      'critic',
      {
        art: { feedback: Artifact<typeof GitFile> };
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
    student: RoleContext<
      'student',
      {
        art: { claims: Artifact<typeof GitFile> };
      }
    >;
  }> {}

type StitcherDesired = GStitcher<
  ThreadsDesired,
  ContextOpenAI & GStitcher['context'],
  { content: string }
>;

const template = genTemplate<ThreadsDesired>({
  ref: { uri: __dirname + '/routeJudgeReleasable.template.md' },
  getVariables: async ({ threads }) => ({
    ...(await getTemplateVarsFromRoleInherit({ thread: threads.artist })),
    diff: (
      await threads.artist.context.stash.art.inflight.get().expect('isPresent')
    ).content,
    claims:
      (await threads.student.context.stash.art.claims.get())?.content ?? '',
    feedback: (
      await threads.critic.context.stash.art.feedback.get().expect('isPresent')
    ).content,
  }),
});

const stepImagineJudgement = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[judge]<releasable?>',
  stitchee: 'judge',
  readme:
    'intent(determines whether the @artist.art.inflight is releasable, based on @student.art.claims and @critic.art.feedback)',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepArtSet = genStepArtSet({
  stitchee: 'judge',
  artee: 'judgement',
});

export const routeJudgeReleasable = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[judge]<releasable?>',
    readme:
      '@[artist][inflight] & @[student][claims] & @[critic][feedback] -> @[judge]<releasable?> -> [judgement]',
    sequence: [stepImagineJudgement, stepArtSet],
  }),
);
