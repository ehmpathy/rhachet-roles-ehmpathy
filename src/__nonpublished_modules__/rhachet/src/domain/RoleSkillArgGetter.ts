import { DomainLiteral } from 'domain-objects';
import { GStitcher, Threads } from 'rhachet';
import { Empty } from 'type-fns';

/**
 * .what = a generic specification for how to collect, verify, and instantiate skill arguments
 * .why =
 *   - enables runtime hydration of `threads` or `context` from dynamic sources (e.g., CLI args, env vars)
 *   - supports unified handling for both declaration and execution paths
 *   - decouples static input schema from runtime instantiation logic
 * .how =
 *   - supports lookup and passin mode
 *   - for lookup mode, will lookup the vars based on the schema specified, then assure correctness
 *   - for passin mode, will accept the passin declaration and simply assure correctness
 */
export interface RoleSkillArgGetter<
  TOutput,
  TVariables extends Record<string, any>,
> {
  /**
   * .what = declares how to collect required inputs (from CLI, env, etc)
   */
  lookup: Record<
    string,
    | {
        /**
         * .what = where to get lookup from
         */
        source: 'process.env';

        /**
         * .what = a description of the input
         */
        desc: string;

        /**
         * .what = what envar key to dereference
         */
        envar: string;

        /**
         * .what = what type to expect
         */
        type: 'string';
      }
    | {
        /**
         * .what = where to get lookup from
         */
        source: 'process.argv';

        /**
         * .what = a description of the input
         */
        desc: string;

        /**
         * .what = what shorthand char alias to use, if from process.argv
         */
        char?: string;

        /**
         * .what = what type to expect
         */
        type: 'string'; // todo: extend to other types?
      }
  >;

  /**
   * .what = assures the input from lookup or passin was correctly declared
   */
  assess: (input: any) => input is TVariables;

  /**
   * .what = instantiates the desired runtime object from the assured input
   */
  instantiate: (input: TVariables) => Promise<TOutput> | TOutput;
}

/**
 * .what = a specification of the inputs required to instantiate the threads required for a skill
 * .why =
 *   - enables declaration of inputs required for threads.getter(inputs)
 *   - unlocks cli usage where declaration is dynamic and runtime specified
 * .how =
 *   - supports lookup and passin mode
 *   - for lookup mode, will lookup the vars based on the schema specified, then assure correctness
 *   - for passin mode, will accept the passin declaration and simply assure correctness
 */
export interface RoleSkillThreadsGetter<
  TOutput extends Threads<any>,
  TVariables extends Record<string, string>,
> extends RoleSkillArgGetter<TOutput, TVariables> {
  /**
   * .what = how to lookup the required inputs for thread instantiation
   * .example = { target: { char: t, desc: "the target file or dir to upsert against", shape: "string" } }
   */
  lookup: Record<
    string,
    {
      /**
       * .what = where to get lookup from
       */
      source: 'process.argv';

      /**
       * .what = a description of the input
       */
      desc: string;

      /**
       * .what = what shorthand single char alias to use
       */
      char?: string;

      /**
       * .what = what type to expect
       */
      type: 'string'; // todo: extend to other types?
    }
  > & {
    ask?: Empty; // .ask input is a standard, non-overridable input
  };
}
export class RoleSkillThreadsGetter<
    TOutput extends Threads<any>,
    TVariables extends Record<string, string>,
  >
  extends DomainLiteral<RoleSkillThreadsGetter<TOutput, TVariables>>
  implements RoleSkillThreadsGetter<TOutput, TVariables> {}

/**
 * .what = a specification of the inputs required to instantiate the context required for a skill
 * .why =
 *   - enables declaration of inputs required for context.getter(inputs)
 *   - unlocks cli usage where declaration is dynamic and runtime specified
 * .how =
 *   - supports lookup and passin mode
 *   - for lookup mode, will lookup the vars based on the schema specified, then assure correctness
 *   - for passin mode, will accept the passin declaration and simply assure correctness
 */
export interface RoleSkillContextGetter<
  TOutput extends GStitcher['context'],
  TVariables extends Record<string, string>,
> extends RoleSkillArgGetter<TOutput, TVariables> {
  /**
   * .what = how to lookup the required inputs for context instantiation
   * .example = { openaiApiKey: { envar: "PREP_OPENAI_KEY" } }
   */
  lookup: Record<
    string,
    {
      /**
       * .what = where to get lookup from
       */
      source: 'process.env';

      /**
       * .what = a description of the input
       */
      desc: string;

      /**
       * .what = what envar key to dereference
       */
      envar: string;

      /**
       * .what = what type to expect
       */
      type: 'string';
    }
  >;
}
export class RoleSkillContextGetter<
    TOutput extends GStitcher['context'],
    TVariables extends Record<string, string>,
  >
  extends DomainLiteral<RoleSkillContextGetter<TOutput, TVariables>>
  implements RoleSkillContextGetter<TOutput, TVariables> {}
