import { given, then, when } from 'test-fns';

import { getOneGuardBorderBrainChoice } from './getOneGuardBorderBrainChoice';

/**
 * .what = pins which brain the border guard inspects with, and its cred env
 * .why = the default carries weight, not cosmetics: the guard ran on xai, whose
 *        moderation answers 403 to the injection payloads the guard exists to
 *        judge. that silenced three test cases. a swap back to a moderated brain
 *        must fail here rather than resurface as skipped security tests.
 */
describe('getOneGuardBorderBrainChoice', () => {
  given('[case1] no override supplied', () => {
    when('[t0] the choice is derived', () => {
      const choice = getOneGuardBorderBrainChoice({ brainSlug: null });

      // .note = asserted against the literal, never against
      //         GUARD_BORDER_BRAIN_DEFAULT. the derivation RETURNS that constant,
      //         so `toBe(GUARD_BORDER_BRAIN_DEFAULT)` is a tautology that stays
      //         green through any swap of brain — a test that cannot fail
      //         (rule.forbid.failhide). the literal is what makes this bite.
      then('it defaults to the fireworks deepseek brain', () => {
        expect(choice.slug).toBe('fireworks/deepseek/v4-flash');
      });
    });
  });

  given('[case2] an explicit brain override', () => {
    when('[t0] GUARD_BORDER_BRAIN names another brain', () => {
      then('it takes the override verbatim', () => {
        const choice = getOneGuardBorderBrainChoice({
          brainSlug: 'xai/grok/code-fast-1',
        });
        expect(choice.slug).toBe('xai/grok/code-fast-1');
      });
    });

    when('[t1] the override is an empty string', () => {
      then('it falls back to the default rather than an empty slug', () => {
        const choice = getOneGuardBorderBrainChoice({ brainSlug: '' });
        expect(choice.slug).toBe('fireworks/deepseek/v4-flash');
      });
    });
  });

  given('[case3] the keyrack env that holds usable brain keys', () => {
    // .note = pinned to the literal 'prep' on purpose. the cred env was once
    //         derived from NODE_ENV, which chose the `test` env whenever a test
    //         ran — and the `test` env declares the same key NAMES with values
    //         that answer 401. the failure surfaced as an auth error far from
    //         its cause, so the env is now fixed and clamped here.
    when('[t0] the choice is derived under any caller', () => {
      then('it always reads creds from prep', () => {
        expect(
          getOneGuardBorderBrainChoice({ brainSlug: null }).keyrackEnv,
        ).toBe('prep');
        expect(
          getOneGuardBorderBrainChoice({ brainSlug: 'xai/grok/code-fast-1' })
            .keyrackEnv,
        ).toBe('prep');
      });
    });
  });
});
