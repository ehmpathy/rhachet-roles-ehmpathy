import { given, then } from 'test-fns';

describe('loop think via dialogue', () => {
  given(
    'vague intent: what should we call reservable-but-not-reserved time?',
    () => {
      then('it should be able to self-dialogue and reach conclusion', () => {
        const skillContext = `
skill = self dialogue to think
  1. ask questions
  2. add ideas

purpose
- start with detection of intent intent
- then move to fulfillment of caller intent
      `.trim();
        const ask = 'what should we call reservable-but-not-reserved time?';
      });
    },
  );
});
