import { genLoopFeedback } from '@src/domain.operations/artifact/genLoopFeedback';

import { stepWrite } from './stepWrite';

export const loopWrite = genLoopFeedback({
  stitchee: 'mechanic',
  artee: 'inflight',
  repeatee: stepWrite,
});
