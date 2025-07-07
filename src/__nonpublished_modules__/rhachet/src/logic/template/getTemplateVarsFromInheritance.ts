import { Thread } from 'rhachet';

/**
 * .what = extracts template vars from a thread's inherited traits and skills
 * .why  = standardizes how role memory is rendered into prompt templates
 */
export const getTemplateVarsFromRoleInherit = <
  TThread extends Thread<{
    inherit: {
      traits: { content: string }[];
      skills: { content: string }[];
    };
  }>,
>({
  thread,
}: {
  thread: TThread;
}) => ({
  inherit: {
    traits: thread.context.inherit.traits.map((t) => t.content).join('\n\n'),
    skills: thread.context.inherit.skills.map((s) => s.content).join('\n\n'),
  },
});
