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
import type { ContextOpenAI } from '@src/data/sdk/sdkOpenAi';
import { genLoopFeedback } from '@src/logic/artifact/genLoopFeedback';
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
you've been asked to write a one-time terminal command to fulfill the ask

before doing that, first, instantiate a checklist of commands to run to gather the context needed to fulfill the ask

- write this checklist in .yml
- explicitly explain .what and .why for each step
- explicitly declare .mode = READ vs WRITE for each step
- explicitly declare the .command, realcode or pseudocode, in multiline format

separate the checklist into two parts
- contextualize = all the steps that need to be done to gather context
- produce = the step that will actually fulfil the ask

focus
- what do you need to know in order to fulfill the ask?

critical
- contextualize should contain ONLY READS, NEVER WRITES
- we should never mutate the caller's environment in order to gather context
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

export const stepPlanContextualize = asStitcherFlat<StitcherDesired>(
  genStitchRoute({
    slug: '@[thinker]<planContextualize>',
    readme:
      '@[thinker]<getBriefs> -> @[thinker]<instantiate>[context][plan] -> [instance][context][plan]',
    sequence: [stepAddBriefs, stepInstantiate],
  }),
);

export const loopPlanContextualize = genLoopFeedback({
  stitchee: 'thinker',
  artee: 'focus.concept',
  repeatee: stepPlanContextualize,
});
