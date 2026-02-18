#!/usr/bin/env npx tsx

/**
 * .what = remove gerunds from compressed content
 * .why = compressed briefs must comply with rule.forbid.gerunds
 *
 * critical: gerunds (-ing words used as nouns) are forbidden
 * regex scan for words that end in -ing, then recompress without gerunds
 */

import { compressViaBhrain } from '../../../brief.compress/compress.via.bhrain';

/**
 * .what = regex pattern to detect gerunds
 * .why = words that end in -ing are potential gerunds
 *
 * note: this catches all -ing words, not just true gerunds
 * the brain distinguishes and preserves valid participles in verb phrases
 */
const GERUND_PATTERN = /\b\w+ing\b/gi;

/**
 * .what = common words that end in -ing but are not gerunds
 * .why = avoid false positives for words like "thing", "string", "bring"
 */
const ALLOWED_ING_WORDS = new Set([
  'thing',
  'things',
  'string',
  'strings',
  'bring',
  'brings',
  'ring',
  'rings',
  'king',
  'kings',
  'spring',
  'springs',
  'swing',
  'swings',
  'cling',
  'clings',
  'bling',
  'sting',
  'stings',
  'fling',
  'flings',
  'sling',
  'slings',
  'wring',
  'wrings',
]);

/**
 * .what = check if content contains gerunds
 * .why = skip recompression if no gerunds present
 */
export const hasGerunds = (content: string): boolean => {
  const matches = content.match(GERUND_PATTERN) || [];
  const actualGerunds = matches.filter(
    (word) => !ALLOWED_ING_WORDS.has(word.toLowerCase()),
  );
  return actualGerunds.length > 0;
};

/**
 * .what = extract gerunds from content for visibility
 * .why = enables log of which gerunds were found
 */
export const extractGerunds = (content: string): string[] => {
  const matches = content.match(GERUND_PATTERN) || [];
  return matches.filter((word) => !ALLOWED_ING_WORDS.has(word.toLowerCase()));
};

/**
 * .what = remove gerunds from compressed content via brain rewrite
 * .why = ensures compressed briefs comply with style guide
 */
export const degerund = async (input: {
  content: string;
  brainSlug: string;
}): Promise<{
  content: string;
  gerundsFound: string[];
  gerundsRemoved: boolean;
}> => {
  // check for gerunds
  const gerundsFound = extractGerunds(input.content);

  // handle no gerunds case
  if (gerundsFound.length === 0) {
    return {
      content: input.content,
      gerundsFound: [],
      gerundsRemoved: false,
    };
  }

  // recompress with degerund instruction
  const result = await compressViaBhrain({
    content: input.content,
    brainSlug: input.brainSlug,
    mechanisms: ['telegraphic'],
    supplements: [
      'DEGERUND: remove all gerunds (-ing words used as nouns). replace with precise alternatives:',
      '- *ing that means "extant" → use "extant", "found", "current", "prior"',
      '- *ing that means "in process" → use "process", "processor", "processed"',
      '- *ing that means "to handle" → use "handle", "handler"',
      '- *ing that means "to load" → use "load", "loader", "loaded"',
      '- *ing that means "active" → use "run", "runner", "active"',
      '- *ing that means "awaited" → use "queued", "awaited", "unresolved"',
      '- *ing that means "absent" → use "absent", "notFound", "lacks"',
      '- *ing that means "fits" → use "matched", "match", "fits"',
      `gerunds found: ${gerundsFound.join(', ')}`,
    ],
    force: true, // bypass cache since we degerund now
  });

  return {
    content: result.compressed,
    gerundsFound,
    gerundsRemoved: true,
  };
};
