import { DomainEntity } from 'domain-objects';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';

/**
 * .what = a focus that a @[thinker] can adopt
 * .why =
 *   - declares a distinct context and concept with which to think
 *   - enables focus switches, persistence, replication, etc
 * .ref = @[bhrain]/briefs/cognition
 */
export interface Focus {
  /**
   * .what = the unique identifier of this focus
   * .why = enables identification of mutable focus
   */
  exid: string;

  /**
   * .what = ⚓ the anchor concept, represents the position within the semantic treestruct at focus
   * .why =
   *   - serves as the point from which the thinker's perspective is based
   *   - serves as the topic onto which the thinker's imagination is applied
   */
  concept: Artifact<typeof GitFile>;

  /**
   * .what = 🔦 the visible concepts, represent the positions within the semantic treestruct included for leverage
   * .why =
   *   - defines which concepts can be leveraged for manipulation of the focus.concept
   *   - can be mutated to grow or shrink, along dimensions of .depth, .breadth, and .acuity
   */
  context: Artifact<typeof GitFile>;
}
export class Focus extends DomainEntity<Focus> implements Focus {
  public static unique = ['exid'] as const;
}
