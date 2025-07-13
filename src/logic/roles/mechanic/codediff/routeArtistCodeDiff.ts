import { asStitcherFlat, genStitchRoute, GStitcher, Threads } from 'rhachet';

import { genArtifactGitFile } from '../../../../__nonpublished_modules__/rhachet-artifact-git/src';
import { GitFile } from '../../../../__nonpublished_modules__/rhachet-artifact-git/src/domain/GitFile';
import { Artifact } from '../../../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { RoleContext } from '../../../../__nonpublished_modules__/rhachet/src/domain/RoleContext';
import { genStepImagineViaTemplate } from '../../../../__nonpublished_modules__/rhachet/src/logic/template/genStepImagineViaTemplate';
import { genTemplate } from '../../../../__nonpublished_modules__/rhachet/src/logic/template/genTemplate';
import { getTemplateValFromArtifacts } from '../../../../__nonpublished_modules__/rhachet/src/logic/template/getTemplateValFromArtifacts';
import { getTemplateVarsFromRoleInherit } from '../../../../__nonpublished_modules__/rhachet/src/logic/template/getTemplateVarsFromInheritance';
import { ContextOpenAI, sdkOpenAi } from '../../../../data/sdk/sdkOpenAi';
import { genStepArtSet } from '../../../artifact/genStepArtSet';
import { getMechanicBriefs } from '../getMechanicBrief';

interface ThreadsDesired
  extends Threads<{
    artist: RoleContext<
      'artist',
      {
        ask: string;
        art: { inflight: Artifact<typeof GitFile> };
        org: { patterns: Artifact<typeof GitFile>[] };
        scene: { coderefs: Artifact<typeof GitFile>[] };
      }
    >;
    student: RoleContext<
      'student',
      {
        art: { claims: Artifact<typeof GitFile> };
      }
    >;
    critic: RoleContext<
      'critic',
      {
        art: { feedback: Artifact<typeof GitFile> | null };
      }
    >;
  }> {}

type StitcherDesired = GStitcher<
  ThreadsDesired,
  ContextOpenAI & GStitcher['context'],
  { content: string }
>;

const template = genTemplate<ThreadsDesired>({
  ref: { uri: __dirname + '/routeArtistCodeDiff.template.md' },
  getVariables: async ({ threads }) => ({
    ask: threads.artist.context.stash.ask,
    claims:
      (await threads.student.context.stash.art.claims.get())?.content ?? '',
    inflight:
      (await threads.artist.context.stash.art.inflight.get())?.content ?? '',
    feedback:
      (await threads.critic.context.stash.art.feedback?.get())?.content ??
      'not reviewed yet', // no feedback yet is possible
    ...(await getTemplateVarsFromRoleInherit({ thread: threads.artist })),
    scene: await getTemplateValFromArtifacts({
      artifacts: threads.artist.context.stash.scene.coderefs,
    }),
    patterns: await getTemplateValFromArtifacts({
      artifacts: threads.artist.context.stash.org.patterns,
    }),
    codestyle: await getTemplateValFromArtifacts({
      // todo: compress?
      // todo: enforce insync w/ codestyle reviewer?
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

const stepImagineCodeDiff = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[artist]<produce><imagine>',
  stitchee: 'artist',
  readme: 'intent(imagines a code diff based on artist.ask)',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepArtSet = genStepArtSet({
  stitchee: 'artist',
  artee: 'inflight',
});

export const routeArtistCodeDiff = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[artist]<produce>',
    readme: '@[artist]<produce><imagine> -> [proposal]',
    sequence: [stepImagineCodeDiff, stepArtSet],
  }),
);
