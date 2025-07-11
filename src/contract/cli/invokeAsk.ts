import { ContextLogTrail } from 'as-procedure';
import { Command } from 'commander';
import { enweaveOneStitcher } from 'rhachet';

import { RoleRegistry } from '../../__nonpublished_modules__/rhachet/src/domain/RoleRegistry';
import { ContextOpenAI } from '../../data/sdk/sdkOpenAi';

export const invokeAsk = async (
  {
    program,
    registry,
  }: {
    program: Command;
    registry: RoleRegistry;
  },
  context: ContextOpenAI & ContextLogTrail,
): Promise<void> => {
  const askCommand = program
    .command('ask')
    .description('ask a skill to perform a task')
    .requiredOption('--role <slug>', 'role to invoke')
    .requiredOption('--skill <slug>', 'skill to invoke')
    .argument('<ask>', 'prompt string')
    .allowUnknownOption(true);

  // inject options dynamically in preAction
  askCommand.hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    const role = registry.roles.find((r) => r.slug === opts.role);
    if (!role) return;

    const skill = role.skills.find((s) => s.slug === opts.skill);
    if (!skill) return;

    // inject option definitions for all known inputs
    for (const [key, meta] of Object.entries(skill.input)) {
      thisCommand.option(`-${meta.char}, --${key} <${meta.shape}>`, meta.desc);
    }
  });

  // perform execution
  askCommand.action(async (ask: string, opts: Record<string, string>) => {
    const { role: roleSlug, skill: skillSlug } = opts;

    const role = registry.roles.find((r) => r.slug === roleSlug);
    if (!role) {
      console.error(`❌ unknown role "${roleSlug}"`);
      process.exit(1);
    }

    const skill = role.skills.find((s) => s.slug === skillSlug);
    if (!skill) {
      console.error(`❌ unknown skill "${skillSlug}" under role "${roleSlug}"`);
      process.exit(1);
    }

    // instantiate the required threads

    // instantiate the required context

    const threads = {
      ask,
      ...Object.fromEntries(Object.keys(skill.input).map((k) => [k, opts[k]])),
    };

    await enweaveOneStitcher(
      {
        stitcher: skill.route,
        threads,
      },
      context,
    );
  });
};
