/**
 * .what = repeatably config for LLM-based tests
 * .why = LLM outputs are probabilistic; CI uses SOME (any 1 of 3), local uses EVERY
 */
export const REPEATABLY_CONFIG_LLM = {
  attempts: 3,
  criteria: process.env.CI ? 'SOME' : 'EVERY',
} as const;
