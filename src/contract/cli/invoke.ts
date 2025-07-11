import { Command } from 'commander';

import { getRoleRegistry } from '../../logic/roles/getRoleRegistry';
import { invokeAsk } from './invokeAsk';
import { invokeList } from './invokeList';
import { invokeReadme } from './invokeReadme';

export const invoke = async (input: { args: string[] }): Promise<void> => {
  const registry = getRoleRegistry();
  const program = new Command();

  program.name('rhachet').description('ehmpathy CLI interface');

  invokeReadme({ program, registry });
  invokeList({ program, registry });
  invokeAsk({ program, registry });

  await program.parseAsync(input.args, { from: 'user' });
};
