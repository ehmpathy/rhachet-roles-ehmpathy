import { WithExpectOutput } from 'as-procedure';
import { DomainEntity, Refable, RefByUnique } from 'domain-objects';

/**
 * .what = an artifact that can be leveraged throughout a weave
 * .why =
 * .cases =
 *   - iterate on a particular file
 *   - write to a particular repo
 *   - etc
 */
export interface Artifact<TRefable extends Refable<any, any, any>> {
  ref: RefByUnique<TRefable>;

  /**
   * .what = loads the resource if it exists, else returns null
   * .why  = avoids throwing on missing files; supports optional or lazy creation
   */
  get: WithExpectOutput<() => Promise<InstanceType<TRefable> | null>>;

  /**
   * .what = writes or replaces the resource with new content
   * .why  = enables mutation and tracking via updated instance
   * todo: support non-string content
   */
  set: (input: { content: string }) => Promise<InstanceType<TRefable>>;

  /**
   * .what = deletes the underlying resource if it exists
   * .why  = allows cleanup or invalidation of artifacts during a weave
   */
  del: () => Promise<void>;
}
export class Artifact<TRefable extends Refable<any, any, any>>
  extends DomainEntity<Artifact<TRefable>>
  implements Artifact<TRefable> {}
