import { genLoopFeedback } from '../../../artifact/genLoopFeedback';
import { stepStudyDomain } from './stepStudyDomain';

export const loopStudyDomain = genLoopFeedback({
  stitchee: 'student',
  artee: 'domain',
  repeatee: stepStudyDomain,
});
