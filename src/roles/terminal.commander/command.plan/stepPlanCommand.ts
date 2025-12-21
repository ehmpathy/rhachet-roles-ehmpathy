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

import type { Focus } from '@src/_topublish/rhachet-roles-bhrain/src/domain/objects/Focus';
import type { ContextOpenAI } from '@src/access/sdk/sdkOpenAi';
import { genLoopFeedback } from '@src/domain.operations/artifact/genLoopFeedback';
import { stepInstantiate } from '@src/roles/bhrain/khue.instantiate/stepInstantiate';

const BRIEFS_FOR_CLIPLAN: Artifact<typeof GitFile>[] = [];

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

const stepAddBriefs = new StitchStepCompute<
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
      (b) => !BRIEFS_FOR_CLIPLAN.includes(b),
    );

    // append these briefs
    const briefsAfter = [...briefsBefore, ...BRIEFS_FOR_CLIPLAN];

    // add the briefs to the thinker's context
    threads.thinker.context.stash.briefs = briefsAfter;

    // extend the focus context to explicitly know to use these briefs; // todo: put this into its own step for observability in stitch trail
    const focusContextBefore = (
      await threads.thinker.context.stash.art['focus.context'].get()
    )?.content;
    const focusContextToAdd = `
instantiate a shell terminal command which will achieve the ask

objectives
- maximize readability
- maximize maintainability

tactics
- comments and newlines -> maximize readability
- simplify => maximize maintainability
- yagni => maximize maintainability
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

export const stepCommandPlan = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<commandPlan>',
    readme:
      '@[thinker]<getBriefs> -> @[thinker]<instantiate>[command][plan] -> [instance][command][plan]',
    sequence: [stepAddBriefs, stepInstantiate],
  }),
);

export const loopCommandPlan = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'focus.concept',
  repeatee: stepCommandPlan,
});
