import { Command } from 'commander';

import { RoleRegistry } from '../../domain/objects/RoleRegistry';

export const invokeReadme = ({
  program,
  registry,
}: {
  program: Command;
  registry: RoleRegistry;
}) => {
  program
    .command('readme')
    .description('print documentation for the registry, a role, or a skill')
    .option('--registry <slug>', 'which registry to inspect')
    .option('--role <slug>', 'which role to inspect')
    .option('--skill <slug>', 'which skill to inspect')
    .action((opts: { registry?: string; role?: string; skill?: string }) => {
      if (opts.registry) {
        if (opts.registry !== registry.slug) {
          console.error(`no registry named "${opts.registry}"`);
          process.exit(1);
        }
        console.log(registry.readme);
        return;
      }

      const role = registry.roles.find((r) => r.slug === opts.role);
      if (!role) {
        console.error(`no role named "${opts.role}"`);
        process.exit(1);
      }

      if (!opts.skill) {
        console.log(role.readme);
        return;
      }

      const skill = role.skills.find((s) => s.slug === opts.skill);
      if (!skill) {
        console.error(`no skill "${opts.skill}" in role "${opts.role}"`);
        process.exit(1);
      }

      console.log(skill.readme);
    });
};
