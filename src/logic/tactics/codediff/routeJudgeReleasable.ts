import { asStitcherFlat, genStitchRoute, GStitcher, Threads } from 'rhachet';

import { GitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src/domain/GitFile';
import { Artifact } from '../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { RoleContext } from '../../../__nonpublished_modules__/rhachet/src/domain/RoleContext';
import { genStepImagineViaTemplate } from '../../../__nonpublished_modules__/rhachet/src/logic/template/genStepImagineViaTemplate';
import { genTemplate } from '../../../__nonpublished_modules__/rhachet/src/logic/template/genTemplate';
import { getTemplateVarsFromRoleInherit } from '../../../__nonpublished_modules__/rhachet/src/logic/template/getTemplateVarsFromInheritance';
import { ContextOpenAI, sdkOpenAi } from '../../../data/sdk/sdkOpenAi';
import { genStepArtSet } from '../artifact/genStepArtSet';

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
    claims: (
      await threads.student.context.stash.art.claims.get().expect('isPresent')
    ).content,
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
