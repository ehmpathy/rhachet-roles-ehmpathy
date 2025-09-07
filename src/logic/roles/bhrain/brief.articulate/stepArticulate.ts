import {
  asStitcherFlat,
  genStitchRoute,
  GStitcher,
  RoleContext,
  StitchStepCompute,
  Threads,
} from 'rhachet';
import { Artifact } from 'rhachet-artifact';
import { GitFile } from 'rhachet-artifact-git';

import { Focus } from '../../../../_topublish/rhachet-roles-bhrain/src/domain/objects/Focus';
import { ContextOpenAI } from '../../../../data/sdk/sdkOpenAi';
import { genLoopFeedback } from '../../../artifact/genLoopFeedback';
import { getBhrainBriefs } from '../getBhrainBrief';
import { stepInstantiate } from '../khue.instantiate/stepInstantiate';

const BRIEFS_FOR_ARTICULATE = getBhrainBriefs([
  'knowledge/kno201.documents.articles.[article].md',
  'knowledge/kno201.documents._.[article].md',
  'knowledge/kno201.documents._.[catalog].md',
  'knowledge/kno301.doc.enbrief.2._.[catalog].md',
  'knowledge/kno301.doc.enbrief.2.articulate.[article].md',
  'knowledge/kno301.doc.enbrief.2.articulate.[lesson].md',
  'knowledge/kno301.doc.enbrief.1.from_instances.[demo].color.md',
  'knowledge/kno301.doc.enbrief.1.from_instances.[demo].gravity.md',
  'knowledge/kno301.doc.enbrief.1.from_instances.[demo].entropy.md',
  // 'knowledge/kno501.doc.enbrief.catalog.structure1.[article].md',
  // 'knowledge/kno501.doc.enbrief.catalog.structure1.[lesson].template.md',
  //
  // -------------
  //
  // ?: can we compress the below into kno501.doc briefs like we did for catalogize instead? might reduce overhead
  'librarian.tactics/[brief].verbiage.outline.over.narrative.md',
  'librarian.tactics/<articulate>._.[article].frame.cognitive.md',
  'librarian.tactics/<articulate>._.[article].frame.tactical.md',
  'librarian.tactics/<articulate>.tactic.[catalog].md',
  'librarian.tactics/<articulate>.tactic.concept_dimension.examples.[article][seed].md',
  'librarian.tactics/<articulate>.tactic.concept_dimension.invariants.[article].md',
  'librarian.tactics/<articulate>.tactic.from.examples.md',
  'librarian.tactics/<articulate>.tactic.from.seed.md',
  'librarian.tactics/<articulate>.tactic.with.templates.[article].md',
  'librarian.tactics/<articulate>.tone.bluecollar.[article][seed].md',
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

// todo: generalize; we've got two examples now w/ catalogize
const stepAddThinkerBriefs = new StitchStepCompute<
  GStitcher<
    StitcherDesired['threads'],
    GStitcher['context'],
    { briefs: { before: string[]; after: string[] } }
  >
>({
  slug: '@[thinker]<getBriefs>',
  readme: "adds a set of briefs to the @[thinker]'s context",
  form: 'COMPUTE',
  stitchee: 'thinker',
  invoke: async ({ threads }) => {
    // identify the prior briefs
    const briefsBeforeUnsanitized = threads.thinker.context.stash.briefs;

    // drop the briefs if they were already included (we'll put them at the end again, so they're the last thought)
    const briefsBefore = briefsBeforeUnsanitized.filter(
      (b) => !BRIEFS_FOR_ARTICULATE.includes(b),
    );

    // append these briefs
    const briefsAfter = [...briefsBefore, ...BRIEFS_FOR_ARTICULATE];

    // add the briefs to the thinker's context
    threads.thinker.context.stash.briefs = briefsAfter;

    // extend the focus context to explicitly know to use these briefs; // todo: put this into its own step for observability in stitch trail
    const focusContextBefore = (
      await threads.thinker.context.stash.art['focus.context'].get()
    )?.content;
    const focusContextToAdd = `
instantiate the concept as an [articulate] via the <articulate> mechanism, defined in your briefs.

in particular, leverage the articulate lessons and articles
    `.trim();
    const focusContextAfter = [
      focusContextBefore,
      '',
      '---',
      '',
      focusContextToAdd,
    ].join('\n');
    await threads.thinker.context.stash.art['focus.context'].set({
      content: focusContextAfter,
    });

    // and then report that we did so
    return {
      input: null,
      output: {
        briefs: {
          before: briefsBefore.map((artifact) => artifact.ref.uri),
          after: briefsAfter.map((artifact) => artifact.ref.uri),
        },
      },
    };
  },
});

export const stepArticulate = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<articulate>',
    readme:
      '@[thinker]<getBriefs> -> @[thinker]<instantiate>[articulate] -> [instance][articulate]',
    sequence: [stepAddThinkerBriefs, stepInstantiate],
  }),
);

export const loopArticulate = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'focus.concept',
  repeatee: stepArticulate,
});
