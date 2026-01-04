import { RoleRegistry } from 'rhachet';

import { ROLE_ARCHITECT } from './architect/getArchitectRole';
// import { ROLE_ECOLOGIST } from './ecologist/getEcologistRole';
import { ROLE_MECHANIC } from './mechanic/getMechanicRole';

/**
 * .what = returns the core registry of predefined roles and skills
 * .why =
 *   - enables CLI or thread logic to load available roles
 *   - avoids dynamic loading or global mutation
 */
export const getRoleRegistry = (): RoleRegistry =>
  new RoleRegistry({
    slug: 'ehmpathy',
    readme: { uri: `${__dirname}/readme.md` },
    roles: [
      // ROLE_ECOLOGIST,
      ROLE_ARCHITECT,
      ROLE_MECHANIC,
    ],
  });
