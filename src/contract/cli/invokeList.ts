import { Command } from 'commander';

import { RoleRegistry } from '../../domain/objects/RoleRegistry';

export const invokeList = ({
  program,
  registry,
}: {
  program: Command;
  registry: RoleRegistry;
}) => {
  program
    .command('list')
    .description('list available roles or skills under a role')
    .option('--role <slug>', 'list skills under this role')
    .action((opts: { role?: string }) => {
      if (!opts.role) {
        console.log('# available roles:');
        for (const role of registry.roles) {
          console.log(`- ${role.slug}`);
        }
        return;
      }

      const role = registry.roles.find((r) => r.slug === opts.role);
      if (!role) {
        console.error(`no role named "${opts.role}"`);
        process.exit(1);
      }

      console.log(`# skills under "${opts.role}":`);
      for (const skill of role.skills) {
        const summary = skill.readme.split('\n')[0];
        console.log(`- ${skill.slug}: ${summary}`);
      }
    });
};
