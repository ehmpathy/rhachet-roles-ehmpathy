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
import { GitFile } from 'rhachet-artifact-git';

import { ContextOpenAI, sdkOpenAi } from '../../../../data/sdk/sdkOpenAi';
import { genStepArtSet } from '../../../artifact/genStepArtSet';
import { getMechanicBriefs } from '../../mechanic/getMechanicBrief';
import { getEcologistBriefs } from '../getEcologistBrief';

type StitcherDesired = GStitcher<
  Threads<{
    caller: RoleContext<
      'caller',
      {
        ask: string;
        art: {
          feedback: Artifact<typeof GitFile> | null;
        };
      }
    >;
    student: RoleContext<
      'student',
      {
        art: {
          domain: Artifact<typeof GitFile>;
        };
      }
    >;
  }>,
  ContextOpenAI & GStitcher['context'],
  { content: string }
>;

const template = genTemplate<StitcherDesired['threads']>({
  ref: { uri: __filename.replace('.ts', '.template.md') },
  getVariables: async ({ threads }) => ({
    ...(await getTemplateVarsFromRoleInherit({ thread: threads.student })),
    ask:
      (await threads.caller.context.stash.art.feedback?.get())?.content ||
      threads.caller.context.stash.ask,
    briefs: await getTemplateValFromArtifacts({
      artifacts: [
        ...getMechanicBriefs([
          'architecture/ubiqlang.md',
          'style.names.treestruct.md',
        ]),
        ...getEcologistBriefs([
          'distilisys/sys101.distilisys.grammar.md',
          'distilisys/sys201.actor.motive._.summary.md',
          'distilisys/sys201.actor.motive.p5.motive.grammar.md',
          'distilisys/sys211.actor.resources._.primitives.summary.md',
          'distilisys/sys211.actor.resources.pt5.composites.md',
          'distilisys/sys231.actor.claims.p1.primitive.exchange.md',
          'ecology/eco001.overview.md',
          'ecology/eco101.core-system-understanding.md',
          'ecology/eco505.systems-thinking.md',
          'economy/econ001.overview.md',
          'economy/econ101.core-mechanics.md',
          'economy/econ501.p1.game-theory.md',
          'economy/econ501.p4.behavioral-economics.md',

          // 'analysis.behavior-reveals-system.md',
          // 'core.term.price.v2.md',
        ]),
      ],
    }),
    domain:
      (await threads.student.context.stash.art.domain.get())?.content ?? '',
  }),
});

const stepImagine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[student]<study>[domain]<imagine>',
  stitchee: 'student',
  readme: '',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepPersist = genStepArtSet({
  stitchee: 'student',
  artee: 'domain',
});

// todo: expand into separation of domain discovery vs vision discovery

export const stepStudyDomain = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[student]<study>[domain]',
    readme: '@[student]<study>[domain] -> [[claim]]s',
    sequence: [stepImagine, stepPersist],
  }),
);
