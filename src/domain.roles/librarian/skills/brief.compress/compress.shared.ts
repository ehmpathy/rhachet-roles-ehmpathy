#!/usr/bin/env npx tsx

/**
 * .what = shared utilities for brief compression mechanisms
 * .why = reuse token count logic across llmlingua and bhrain mechanisms
 */

/**
 * .what = count tokens via tiktoken cl100k_base encoder
 * .why = provide accurate token metrics for compression stats
 */
export const countTokens = async (input: { text: string }): Promise<number> => {
  const { getEncoding } = await import('js-tiktoken');
  const encoder = getEncoding('cl100k_base');
  return encoder.encode(input.text).length;
};
