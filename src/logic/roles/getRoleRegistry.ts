import { RoleRegistry } from 'rhachet';

import { ROLE_BHRAIN } from './bhrain/getBhrainRole';
// import { ROLE_ECOLOGIST } from './ecologist/getEcologistRole';
import { EHMPATHY_REGISTRY_README } from './getRoleRegistry.readme';
import { ROLE_MECHANIC } from './mechanic/getMechanicRole';
import { ROLE_COMMANDER } from './terminal.commander/getCommanderRole';

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
    roles: [
      ROLE_BHRAIN, // todo: lift bhrain role into own repo
      // ROLE_ECOLOGIST,
      ROLE_MECHANIC,

      ROLE_COMMANDER,
    ],
  });
