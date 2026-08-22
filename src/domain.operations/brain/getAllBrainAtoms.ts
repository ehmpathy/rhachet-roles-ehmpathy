import type { BrainAtom } from 'rhachet';
import { genBrainAtom as genBrainAtomFireworks } from 'rhachet-brains-fireworksai';
import { genBrainAtom as genBrainAtomXai } from 'rhachet-brains-xai';

/**
 * .what = the brain atoms every non-guardBorder brain caller can choose from
 * .why = genContextBrain's discovery mode finds zero atoms in the contexts these
 *        callers run in — jest (and any linked/temp cwd) reports
 *        `available brains (none)`, so a discovery-mode call fails at the choice
 *        step before any api call. an explicitly supplied list is the sanctioned
 *        mode for exactly that case, and it makes the set of reachable brains a
 *        fact of this file rather than of the filesystem.
 *
 *        this mirrors getAllGuardBorderBrainAtoms (the guardBorder path fixed the
 *        same discovery failure first). guardBorder keeps its own copy because it
 *        enumerates these atoms in its --help/error output; this general list
 *        serves the kernelize + compress + eval callers, which pick ONE by slug
 *        via genContextBrain's `choice`.
 */
export const getAllBrainAtoms = (): BrainAtom<any>[] => [
  genBrainAtomFireworks({ slug: 'fireworks/deepseek/v4-flash' }),
  genBrainAtomXai({ slug: 'xai/grok/code-fast-1' }),
];
