import type { Role } from 'rhachet';

import { ROLE_ARCHITECT } from './architect/getArchitectRole';
import { ROLE_ECOLOGIST } from './ecologist/getEcologistRole';
import { ROLE_ERGONOMIST } from './ergonomist/getErgonomistRole';
import { ROLE_MECHANIC } from './mechanic/getMechanicRole';

/**
 * .what = no role in this package boots a role through its own hooks
 * .why  = `rhachet repo introspect` refuses a role whose hook runs
 *         `rhachet roles boot`, and the brain dir's boot.md already renders
 *         each role's briefs. the self-boot hooks were removed from the
 *         architect, ergonomist, and mechanic; this pins all of them at once
 */
const TEST_CASES: { description: string; role: Role }[] = [
  { description: 'architect', role: ROLE_ARCHITECT },
  { description: 'ecologist', role: ROLE_ECOLOGIST },
  { description: 'ergonomist', role: ROLE_ERGONOMIST },
  { description: 'mechanic', role: ROLE_MECHANIC },
];

describe('roles forbid self-boot hooks', () => {
  TEST_CASES.map((thisCase) =>
    test(`the ${thisCase.description} role has no hook that runs \`rhachet roles boot\``, () => {
      const commands = Object.values(thisCase.role.hooks?.onBrain ?? {})
        .flat()
        .map((hook) => hook.command);
      expect(
        commands.filter((command) => command.includes('roles boot')),
      ).toEqual([]);
    }),
  );
});
