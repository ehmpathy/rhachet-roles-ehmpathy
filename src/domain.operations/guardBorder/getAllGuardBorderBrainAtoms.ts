import type { BrainAtom } from 'rhachet';
import { genBrainAtom as genBrainAtomFireworks } from 'rhachet-brains-fireworksai';
import { genBrainAtom as genBrainAtomXai } from 'rhachet-brains-xai';

/**
 * .what = the brain atoms the border guard can inspect content with
 * .why = genContextBrain's discovery mode finds zero atoms in the contexts this
 *        guard actually runs in — a PostToolUse hook executes from whatever cwd
 *        the caller happens to be in (often a linked temp dir), and jest shows
 *        the same `available brains (none)`. an explicitly supplied list is the
 *        sanctioned mode for exactly that case, and it makes the set of
 *        reachable brains a fact of this file rather than of the filesystem.
 *
 * .why = shared by the cli and its tests on purpose. when the two built their
 *        own lists, the tests passed against a brain the built hook could not
 *        reach — the failure showed up only in acceptance, far from its cause.
 */
export const getAllGuardBorderBrainAtoms = (): BrainAtom<any>[] => [
  genBrainAtomFireworks({ slug: 'fireworks/deepseek/v4-flash' }),
  genBrainAtomXai({ slug: 'xai/grok/code-fast-1' }),
];
