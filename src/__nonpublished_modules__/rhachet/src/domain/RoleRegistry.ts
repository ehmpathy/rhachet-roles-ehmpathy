import { DomainEntity } from 'domain-objects';

import { Role } from './Role';

/**
 * .what = a curated collection of roles, available for use
 * .why =
 *   - acts as a declaration of available roles
 *   - enables composition of registries
 *   - supports cli and documentation introspection
 *   - supports fluid composition of roles via delegation (e.g., one role can runtime delegate to another that it found via registry)
 */
export interface RoleRegistry {
  /**
   * .what = unique identifier for this registry
   */
  slug: string;

  /**
   * .what = markdown-formatted overview of what this registry contains
   * .why = provides documentation, context, and intended use
   */
  readme: string;

  /**
   * .what = the roles that this registry has collected
   */
  roles: Role[];
}
export class RoleRegistry
  extends DomainEntity<RoleRegistry>
  implements RoleRegistry
{
  public static unique = ['slug'] as const;
  public static nested = {
    roles: Role,
  };
}
