import { genLoopFeedback } from '@src/logic/artifact/genLoopFeedback';

import { stepWrite } from './stepWrite';

export const loopWrite = genLoopFeedback({
  stitchee: 'mechanic',
  artee: 'inflight',
  repeatee: stepWrite,
});
