import {
  asStitcherFlat,
  genStitchRoute,
  GStitcher,
  Threads,
  RoleContext,
  genStepImagineViaTemplate,
  genTemplate,
  getTemplateValFromArtifacts,
  getTemplateVarsFromRoleInherit,
} from 'rhachet';
import { Artifact } from 'rhachet-artifact';
import { genArtifactGitFile, GitFile } from 'rhachet-artifact-git';

import { ContextOpenAI, sdkOpenAi } from '../../../../data/sdk/sdkOpenAi';
import { genStepArtSet } from '../../../artifact/genStepArtSet';
import { getMechanicBriefs } from '../getMechanicBrief';

interface ThreadsDesired
  extends Threads<{
    critic: RoleContext<
      'critic',
      {
        art: { feedbackArchitecture: Artifact<typeof GitFile> };
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
        art: {
          domainTerms: Artifact<typeof GitFile> | null;
          domainBounds: Artifact<typeof GitFile> | null;
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
  ref: { uri: __dirname + '/routeCriticCodeReviewArchitecture.template.md' },
  getVariables: async ({ threads }) => ({
    ...(await getTemplateVarsFromRoleInherit({ thread: threads.artist })),
    diff: (
      await threads.artist.context.stash.art.inflight.get().expect('isPresent')
    ).content,
    architecture: {
      rules: await getTemplateValFromArtifacts({
        artifacts: getMechanicBriefs([
          'architecture/ubiqlang.md',
          'architecture/domain-driven-design.md',
          'architecture/bounded-contexts.md',
          'architecture/directional-dependencies.md',
        ]),
      }),
      domain: {
        terms:
          (
            await threads.student.context.stash.art.domainTerms
              ?.get()
              .expect('isPresent')
          )?.content ?? 'none relevant',
        bounds:
          (
            await threads.student.context.stash.art.domainBounds
              ?.get()
              .expect('isPresent')
          )?.content ?? 'none relevant',
      },
    },
  }),
});

const stepImagineFeedback = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[critic]<review><architecture><imagine>',
  stitchee: 'critic',
  readme: 'intent(reviews artist inflight diff)',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepArtSet = genStepArtSet({
  stitchee: 'critic',
  artee: 'feedbackArchitecture',
});

export const routeCriticCodeReviewArchitecture =
  asStitcherFlat<StitcherDesired>(
    genStitchRoute({
      slug: '[critic]<review><architecture>',
      readme: '@[critic]<review><architecture> -> [feedbackArchitecture]',
      sequence: [stepImagineFeedback, stepArtSet],
    }),
  );
