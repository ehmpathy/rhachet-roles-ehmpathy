import { asStitcherFlat, genStitchRoute, GStitcher, Threads } from 'rhachet';

import { genArtifactGitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { GitFile } from '../../../__nonpublished_modules__/rhachet-artifact-git/src/domain/GitFile';
import { Artifact } from '../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { RoleContext } from '../../../__nonpublished_modules__/rhachet/src/domain/RoleContext';
import { genStepImagineViaTemplate } from '../../../__nonpublished_modules__/rhachet/src/logic/template/genStepImagineViaTemplate';
import { genTemplate } from '../../../__nonpublished_modules__/rhachet/src/logic/template/genTemplate';
import { getTemplateValFromArtifacts } from '../../../__nonpublished_modules__/rhachet/src/logic/template/getTemplateValFromArtifacts';
import { getTemplateVarsFromRoleInherit } from '../../../__nonpublished_modules__/rhachet/src/logic/template/getTemplateVarsFromInheritance';
import { ContextOpenAI, sdkOpenAi } from '../../../data/sdk/sdkOpenAi';
import { genStepArtSet } from '../artifact/genStepArtSet';

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
      artifacts: [
        'mech.what-why.v2.md',
        'flow.single-responsibility.md',
        'mech.args.input-context.md',
        'mech.arrowonly.md',
        'mech.clear-contracts.md',
        'flow.failfast.md',
        'flow.idempotency.md',
        'flow.immutability.md',
        'flow.narratives.md',
      ].map((key) =>
        genArtifactGitFile({
          uri: __dirname + `/.refs/codestyle/${key}`,
        }),
      ),
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
