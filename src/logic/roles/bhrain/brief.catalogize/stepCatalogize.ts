import {
  asStitcherFlat,
  type GStitcher,
  genStitchRoute,
  type RoleContext,
  StitchStepCompute,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';

import type { Focus } from '../../../../_topublish/rhachet-roles-bhrain/src/domain/objects/Focus';
import type { ContextOpenAI } from '../../../../data/sdk/sdkOpenAi';
import { genLoopFeedback } from '../../../artifact/genLoopFeedback';
import { getBhrainBriefs } from '../getBhrainBrief';
import { stepInstantiate } from '../khue.instantiate/stepInstantiate';

const BRIEFS_FOR_CATALOGIZE = getBhrainBriefs([
  'cognition/cog021.structs.catalog.md',
  'knowledge/kno201.documents.catalogs.[article].md',
  'knowledge/kno201.documents._.[catalog].md',
  'knowledge/kno301.doc.enbrief.2._.[catalog].md',
  'knowledge/kno301.doc.enbrief.2.catalogize.[article].md',
  'knowledge/kno301.doc.enbrief.2.catalogize.[lesson].md',
  'knowledge/kno301.doc.enbrief.1.from_instances.[demo].color.md',
  'knowledge/kno301.doc.enbrief.1.from_instances.[demo].gravity.md',
  'knowledge/kno301.doc.enbrief.1.from_instances.[demo].entropy.md',
  'knowledge/kno501.doc.enbrief.catalog.structure1.[article].md',
  'knowledge/kno501.doc.enbrief.catalog.structure1.[lesson].template.md',
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
      (b) => !BRIEFS_FOR_CATALOGIZE.includes(b),
    );

    // append these briefs
    const briefsAfter = [...briefsBefore, ...BRIEFS_FOR_CATALOGIZE];

    // add the briefs to the thinker's context
    threads.thinker.context.stash.briefs = briefsAfter;

    // extend the focus context to explicitly know to use these briefs; // todo: put this into its own step for observability in stitch trail
    const focusContextBefore = (
      await threads.thinker.context.stash.art['focus.context'].get()
    )?.content;
    const focusContextToAdd = `
instantiate the concept as a [catalog] via the <catalogize> mechanism, defined in your briefs.

in particular, leverage 'catalog.structure.s1' when possible
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

export const stepCatalogize = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<catalogize>',
    readme:
      '@[thinker]<getBriefs> -> @[thinker]<instantiate>[catalog] -> [instance][catalog]',
    sequence: [stepAddThinkerBriefs, stepInstantiate],
  }),
);

export const loopCatalogize = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'focus.concept',
  repeatee: stepCatalogize,
});
