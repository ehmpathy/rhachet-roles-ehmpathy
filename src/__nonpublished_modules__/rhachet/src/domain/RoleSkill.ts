import { DomainEntity } from 'domain-objects';
import { GStitcher, Stitcher } from 'rhachet';

/**
 * .what = a skill is an action a role can perform; a route it can weave
 * .why =
 *   - defines a reusable skill you can ask a role to perform
 *   - usable for skill invocation, e.g., via the cli
 */
export interface RoleSkill<TStitcher extends GStitcher> {
  /**
   * .what = short, unique identifier
   * .example = "summarize"
   */
  slug: string;

  /**
   * .what = a full description of the skill
   * .why = explains what can be expected, how to use it, and details of operation
   * .note =
   *   - the first two lines of the readme will be used as a description
   */
  readme: string;

  /**
   * .what = the route via which the skill is executable
   */
  route: Stitcher<TStitcher>;

  /**
   * .what = the input that the skill requires to operate on
   * .example = { target: { char: t, desc: "the target file or dir to upsert against", shape: "string" } }
   */
  input: Record<
    Exclude<string, 'ask'>, // .ask input is a standard, non-overridable input
    {
      /**
       * .what = the single character alias via which we can reference this input
       */
      char: string;

      /**
       * .what = the type of this input
       */
      shape: 'string'; // todo: support others?

      /**
       * .what = a short description of this input
       */
      desc: string;
    }
  >;
}
export class RoleSkill<TStitcher extends GStitcher>
  extends DomainEntity<RoleSkill<TStitcher>>
  implements RoleSkill<TStitcher>
{
  public static unique = ['slug'] as const;
}
