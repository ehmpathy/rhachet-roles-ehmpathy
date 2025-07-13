import { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import { resolve } from 'path';

import { getGitRepoRoot } from '../../__nonpublished_modules__/rhachet-artifact-git/src/logic/repo/getGitRepoRoot';
import { RoleRegistry } from '../../__nonpublished_modules__/rhachet/src/domain/RoleRegistry';
import { assureUniqueRoles } from './assureUniqueRoles';
import { invokeAsk } from './invokeAsk';
import { invokeList } from './invokeList';
import { invokeReadme } from './invokeReadme';

/**
 * .what = main entrypoint for CLI execution
 * .why =
 *   - sets up CLI commands and loads dynamic config from project root
 *   - enables skills to be registered dynamically via `rhachet.use.ts`
 * .how =
 *   - defaults to loading `@gitroot/rhachet.use.ts` unless overridden with `--config` or `-c`
 *   - config must export a `getRoleRegistries()` function returning a set of RoleRegistries to support
 */
export const invoke = async (input: { args: string[] }): Promise<void> => {
  const gitroot = await getGitRepoRoot({ from: process.cwd() });

  // grab the config
  const configArg = input.args.findIndex((a) => a === '--config' || a === '-c');
  const configPathExplicit =
    configArg >= 0 && input.args[configArg + 1]
      ? input.args[configArg + 1]!
      : undefined;
  const configPath = configPathExplicit
    ? resolve(process.cwd(), configPathExplicit)
    : resolve(gitroot, 'rhachet.use.ts');
  const config: { getRoleRegistries: () => Promise<RoleRegistry[]> } =
    await import(configPath);

  // grab the registries configured
  const registries = await config.getRoleRegistries();

  // failfast on duplicate roles
  await assureUniqueRoles(registries);

  // declare the cli program
  const program = new Command();
  program.configureOutput({
    writeErr: (str) => {
      console.error('[commander error]', str);
    },
  });
  program
    .name('rhachet')
    .description('ehmpathy CLI interface')
    .option('-c, --config <path>', 'where to find the rhachet.use.ts config'); // tell commander that we expect the config input and not to complain about it
  invokeReadme({ program, registries });
  invokeList({ program, registries });
  invokeAsk({ program, registries });

  // invoke it
  console.log('[args]', input.args);

  await program.parseAsync(input.args, { from: 'user' }).catch((error) => {
    if (error instanceof BadRequestError) {
      console.error(``);
      console.error(`❌ ${error.message}`);
      console.error(``);
      process.exit(1);
    }
    throw error;
  });
};
