import { UnexpectedCodePathError } from 'helpful-errors';
import {
  asStitcherFlat,
  type GStitcher,
  genStepImagineViaTemplate,
  genStitchRoute,
  genTemplate,
  getTemplatePathByCallerPath,
  getTemplateValFromArtifacts,
  getTemplateVarsFromRoleInherit,
  type RoleContext,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import { withRetry, withTimeout } from 'wrapper-fns';

import type { Focus } from '@src/_topublish/rhachet-roles-bhrain/src/domain/objects/Focus';
import { type ContextOpenAI, sdkOpenAi } from '@src/data/sdk/sdkOpenAi';
import { genLoopFeedback } from '@src/logic/artifact/genLoopFeedback';
import { genStepArtSet } from '@src/logic/artifact/genStepArtSet';
import { getBhrainBriefs } from '@src/roles/bhrain/getBhrainBrief';

export const BRIEFS_FOR_INSTANTIATE = getBhrainBriefs([
  'knowledge/kno101.primitives.1.ontology.[article].frame.docs_as_materializations.md',
  'knowledge/kno101.primitives.1.ontology.[article].frame.docs_as_references.md',
  'knowledge/kno101.primitives.2.rel.many_to_many.[article].md',
  'knowledge/kno101.primitives.3.instances.[article].md',
  'knowledge/kno301.doc.enbrief.1.from_instances.[article].md',
  'knowledge/kno351.docs.are_instances.[article].md',
]);

type StitcherDesired = GStitcher<
  Threads<{
    caller: RoleContext<
      'caller',
      {
        art: {
          feedback: Artifact<typeof GitFile>;
          'foci.goal.concept': Focus['concept'];
          'foci.goal.context': Focus['context'];
        };
        refs: Artifact<typeof GitFile>[];
      }
    >;
    thinker: RoleContext<
      'thinker',
      {
        art: {
          'focus.concept': Focus['concept'];
          'focus.context': Focus['context'];
        };
        briefs: Artifact<typeof GitFile>[];
      }
    >;
  }>,
  ContextOpenAI & GStitcher['context'],
  { content: string }
>;

const template = genTemplate<StitcherDesired['threads']>({
  ref: { uri: getTemplatePathByCallerPath({ auto: true }) },
  getVariables: async ({ threads }) => ({
    ...(await getTemplateVarsFromRoleInherit({ thread: threads.thinker })),

    guide: {
      goal:
        (await threads.caller.context.stash.art['foci.goal.concept'].get())
          ?.content ||
        UnexpectedCodePathError.throw('goal not declared', {
          art: threads.caller.context.stash.art['foci.goal.concept'],
        }),
      feedback:
        (await threads.caller.context.stash.art.feedback.get())?.content || '',
    },

    focus: {
      context:
        (await threads.thinker.context.stash.art['focus.context'].get())
          ?.content || '',
      concept:
        (await threads.thinker.context.stash.art['focus.concept'].get())
          ?.content || '',
    },

    skill: {
      briefs: await getTemplateValFromArtifacts({
        artifacts: (() => {
          const briefs = [
            ...BRIEFS_FOR_INSTANTIATE,
            ...threads.thinker.context.stash.briefs,
          ];
          // console.log(briefs.map((brief) => brief.ref)); // ?: left here to aid in debug, when needed
          return briefs;
        })(),
      }),
    },

    references: await getTemplateValFromArtifacts({
      artifacts: threads.caller.context.stash.refs,
    }),
  }),
});

const stepImagine = genStepImagineViaTemplate<StitcherDesired>({
  slug: '@[thinker]<instantiate>',
  stitchee: 'thinker',
  readme: '',
  template,
  imagine: withRetry(
    withTimeout(sdkOpenAi.imagine, { threshold: { seconds: 60 } }), // allow up to 60 sec, for longer files
  ),
});

const stepPersist = genStepArtSet({
  stitchee: 'thinker',
  artee: 'focus.concept',
});

export const stepInstantiate = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<instantiate>',
    readme: '@[thinker]<instantiate> -> [instance]',
    sequence: [stepImagine, stepPersist],
  }),
);

export const loopInstantiate = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'focus.concept',
  repeatee: stepInstantiate,
});
