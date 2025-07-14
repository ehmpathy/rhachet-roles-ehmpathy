import { RoleRegistry } from 'rhachet';

import { EHMPATHY_REGISTRY_README } from './getRoleRegistry.readme';
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
    readme: EHMPATHY_REGISTRY_README,
    roles: [ROLE_MECHANIC],
  });
