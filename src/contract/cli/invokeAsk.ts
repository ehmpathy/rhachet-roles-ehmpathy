import { Command } from 'commander';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { enweaveOneStitcher } from 'rhachet';

import { RoleRegistry } from '../../__nonpublished_modules__/rhachet/src/domain/RoleRegistry';
import { getSkillContext } from '../../__nonpublished_modules__/rhachet/src/logic/invoke/getSkillContext';
import { getSkillThreads } from '../../__nonpublished_modules__/rhachet/src/logic/invoke/getSkillThreads';
import { invokeFindRole } from './invokeFindRole';

/**
 * .what = adds the "ask" command to the CLI
 * .why = lets users invoke a skill from any role in the given registries
 */
export const invokeAsk = ({
  program,
  registries,
}: {
  program: Command;
  registries: RoleRegistry[];
}): void => {
  const askCommand = program
    .command('ask')
    .requiredOption('-r, --role <slug>', 'role to invoke')
    .requiredOption('-s, --skill <slug>', 'skill to invoke')
    .option('-a, --ask <ask>', 'your ask')
    .allowUnknownOption(true)
    .allowExcessArguments(true);

  // 💉 dynamically inject CLI flags from skill inputs
  askCommand.hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();

    const role = invokeFindRole({ registries, slug: opts.role });
    const skill = role?.skills.find((s) => s.slug === opts.skill);
    if (!skill)
      BadRequestError.throw(
        `no skill named "${opts.skill}" under role "${opts.role}"`,
        {
          opts,
          role: { skills: role?.skills.map((thisSkill) => thisSkill.slug) },
        },
      );

    // register the dynamic inputs
    for (const [key, meta] of Object.entries(skill.threads.lookup)) {
      thisCommand.option(`-${meta.char}, --${key} <${meta.type}>`, meta.desc);
    }

    // re-parse with updated option definitions
    thisCommand.parseOptions(thisCommand.parent?.args ?? []);
  });

  // 🧠 perform the skill
  askCommand.action(async (opts: Record<string, string>) => {
    const { ask, role: roleSlug, skill: skillSlug } = opts;

    // lookup the role
    const role = invokeFindRole({
      registries,
      slug:
        roleSlug ??
        UnexpectedCodePathError.throw('roleSlug not defined. why not?', {
          opts,
        }),
    });
    if (!role) BadRequestError.throw(`unknown role "${roleSlug}"`);

    // lookup the skill
    const skill = role.skills.find((s) => s.slug === skillSlug);
    if (!skill)
      BadRequestError.throw(
        `unknown skill "${skillSlug}" under role "${roleSlug}"`,
      );

    // instantiate the threads
    const argvWithAsk = {
      ...opts,
      ask:
        ask ?? UnexpectedCodePathError.throw('ask was not declared', { ask }),
    };
    const threads = await getSkillThreads({
      getter: skill.threads,
      from: { lookup: { argv: argvWithAsk } },
    });

    // instantiate the context
    const env = process.env as Record<string, string | undefined>;
    const context = await getSkillContext({
      getter: skill.context,
      from: { lookup: { env } },
    });

    // execute the weave
    await enweaveOneStitcher(
      {
        stitcher: skill.route,
        threads,
      },
      context,
    );
  });
};
