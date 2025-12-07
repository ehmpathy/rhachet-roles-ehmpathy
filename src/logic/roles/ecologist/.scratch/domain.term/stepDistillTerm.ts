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

import {
  type ContextOpenAI,
  sdkOpenAi,
} from '../../../../../data/sdk/sdkOpenAi';
import { genLoopFeedback } from '../../../../artifact/genLoopFeedback';
import { genStepArtSet } from '../../../../artifact/genStepArtSet';
import { getMechanicBriefs } from '../../../mechanic/getMechanicBrief';
import { getEcologistBriefs } from '../../getEcologistBrief';

type StitcherDesired = GStitcher<
  Threads<{
    caller: RoleContext<
      'caller',
      {
        ask: string;
        art: {
          feedback: Artifact<typeof GitFile>;
          usecases: Artifact<typeof GitFile> | null;
        };
      }
    >;
    student: RoleContext<
      'student',
      {
        art: {
          inflight: Artifact<typeof GitFile>;
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
        ...getEcologistBriefs([
          'term.distillation.md',

          'distilisys/sys101.distilisys.grammar.md',
          'distilisys/sys201.actor.motive._.summary.md',
          'distilisys/sys201.actor.motive.p5.motive.grammar.md',
          'distilisys/sys211.actor.resources._.primitives.summary.md',
          'distilisys/sys211.actor.resources.pt5.composites.md',
          'distilisys/sys231.actor.claims.p1.primitive.exchange.md',
          'ecology/eco001.overview.md',
          'ecology/eco101.core-system-understanding.md',
          // 'ecology/eco505.systems-thinking.md',
          'economy/econ001.overview.md',
          'economy/econ101.core-mechanics.md',
          // 'economy/econ501.p1.game-theory.md',
          // 'economy/econ501.p4.behavioral-economics.md',

          // 'analysis.behavior-reveals-system.md',
          // 'core.term.price.v2.md',
        ]),
        ...getMechanicBriefs([
          'architecture/ubiqlang.md',
          'style.names.treestruct.md',
        ]),
      ],
    }),
    inflight:
      (await threads.student.context.stash.art.inflight.get())?.content ?? '',
    usecases:
      (await threads.caller.context.stash.art.usecases?.get())?.content ?? '',
  }),
});

const stepImagine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '[student]<distill>[domain:term]<imagine>',
  stitchee: 'student',
  readme: '',
  template,
  imagine: sdkOpenAi.imagine,
});

const stepPersist = genStepArtSet({
  stitchee: 'student',
  artee: 'inflight',
});

// todo: expand into separation of domain discovery vs vision discovery

export const stepDistillTerm = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '[student]<distill>[domain:term]',
    readme: '@[student]<distill>[domain:term] -> [[term]]s',
    sequence: [stepImagine, stepPersist],
  }),
);

export const loopDistillTerm = genLoopFeedback({
  stitchee: 'student',
  artee: 'inflight',
  repeatee: stepDistillTerm,
});
