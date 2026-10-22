import type { Role } from 'rhachet';
import { given, then, when } from 'test-fns';

import { ROLE_ARCHITECT } from './architect/getArchitectRole';
import { ROLE_ECOLOGIST } from './ecologist/getEcologistRole';
import { ROLE_ERGONOMIST } from './ergonomist/getErgonomistRole';
import { ROLE_MECHANIC } from './mechanic/getMechanicRole';

/**
 * .what = no role in this package boots a role through its own hooks
 * .why  = `rhachet repo introspect` refuses a role whose hook runs
 *         `rhachet roles boot`, and the brain dir's boot.md already renders
 *         each role's briefs; one suite pins every role at once
 */
const ROLES: { name: string; role: Role }[] = [
  { name: 'architect', role: ROLE_ARCHITECT },
  { name: 'ecologist', role: ROLE_ECOLOGIST },
  { name: 'ergonomist', role: ROLE_ERGONOMIST },
  { name: 'mechanic', role: ROLE_MECHANIC },
];

/**
 * .what = every hook command a role declares, across all onBrain events
 */
const getAllHookCommands = (input: { role: Role }): string[] =>
  Object.values(input.role.hooks?.onBrain ?? {})
    .flat()
    .map((hook) => hook.command);

describe('roles forbid self-boot hooks', () => {
  given('[case1] each role this package ships', () => {
    ROLES.forEach((entry, index) => {
      when(`[t${index}] the ${entry.name} role's hooks are read`, () => {
        then('no hook runs `rhachet roles boot`', () => {
          const commands = getAllHookCommands({ role: entry.role });
          expect(
            commands.filter((command) => command.includes('roles boot')),
          ).toEqual([]);
        });
      });
    });
  });

  given('[case2] a role that declares hooks', () => {
    when('[t0] the mechanic role hooks are read', () => {
      then(
        'the read sees them (positive control: an empty read proves naught)',
        () => {
          expect(
            getAllHookCommands({ role: ROLE_MECHANIC }).length,
          ).toBeGreaterThan(0);
        },
      );
    });
  });
});
