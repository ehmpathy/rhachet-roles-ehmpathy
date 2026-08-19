/**
 * .what = the brain the border guard inspects fetched content with, by default
 * .why = xai's own content moderation rejects the exact payloads this guard
 *        exists to judge — a prompt-injection sample trips SAFETY_CHECK_TYPE_BIO
 *        and the api answers 403 before the guard can classify it. a guard that
 *        cannot look at an attack cannot block it, so the default brain is one
 *        that will read the sample and answer.
 */
export const GUARD_BORDER_BRAIN_DEFAULT = 'fireworks/deepseek/v4-flash';

/**
 * .what = the keyrack env that holds usable brain api keys
 * .why = `prep` is where every other brain caller in this repo reads from
 *        (getEvalVerdict, and each review skill that runs on fireworks). the
 *        `test` env declares the same key names, but those values answer
 *        401 — so a NODE_ENV-driven choice of env silently picked a key that
 *        cannot authenticate whenever the caller ran under test.
 */
export const GUARD_BORDER_KEYRACK_ENV = 'prep';

/**
 * .what = derives which brain to inspect with, and which keyrack env holds its key
 * .why = the choice is two coupled decisions (slug + cred env) that both the cli
 *        and its tests must agree on. derived in one named place so a swap of
 *        brain is one edit, and so the choice is assertable without an api call.
 */
export const getOneGuardBorderBrainChoice = (input?: {
  brainSlug: string | null;
}): { slug: string; keyrackEnv: typeof GUARD_BORDER_KEYRACK_ENV } => {
  // read from the process when the caller omits input, so the cli stays a one-liner
  const brainSlug = input
    ? input.brainSlug
    : (process.env.GUARD_BORDER_BRAIN ?? null);

  return {
    slug: brainSlug || GUARD_BORDER_BRAIN_DEFAULT,
    keyrackEnv: GUARD_BORDER_KEYRACK_ENV,
  };
};
