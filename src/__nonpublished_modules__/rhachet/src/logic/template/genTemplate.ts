import { Threads } from 'rhachet';
import { Serializable } from 'serde-fns';

import { Template } from '../../domain/Template';
import { useTemplate } from './useTemplate';

/**
 * .what = creates a Template that hydrates from a thread context
 * .why = enables loading + variable projection in one step
 *    - transforms from Template<TVariables> to Template<{ threads: TThreads }>, so you can just template.use({ threads }), and abstract away the transform
 */
export const genTemplate = <
  TThreads extends Threads<any>,
  TVariables extends Serializable = Serializable,
>(input: {
  ref: Template<TVariables>['ref'];
  getVariables: (input: {
    threads: TThreads;
  }) => TVariables | Promise<TVariables>;
}): Template<{ threads: TThreads }> => ({
  ref: input.ref,
  use: async ({ threads }: { threads: TThreads }) => {
    const variables = await input.getVariables({ threads });
    return useTemplate({
      ref: input.ref,
      variables,
    });
  },
});
