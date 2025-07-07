import { Thread } from 'rhachet';

/**
 * .what = generates a new thread
 */
export const genThread = <C extends { role: string }>(context: C): Thread<C> =>
  new Thread({ context, stitches: [] });
