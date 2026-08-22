import { BrainChoiceNotFoundError, genContextBrain } from 'rhachet';
import { given, then, when } from 'test-fns';

import { getAllBrainAtoms } from './getAllBrainAtoms';

/**
 * .what = clamps that getAllBrainAtoms supplies a non-empty, explicit atom set
 *         that genContextBrain can pick a choice from — the fix for the
 *         `available brains (none)` discovery failure.
 * .why  = the kernelize/compress/eval callers used genContextBrain in DISCOVERY
 *         mode (no `brains: { atoms }`), which finds zero atoms under jest and
 *         throws BrainChoiceNotFoundError at construction, before any api call.
 *         this is a HERMETIC clamp: genContextBrain picks `choice` at
 *         construction (the throw point), so this needs no key, no creds, no
 *         network — the dummy creds fn is never invoked without an ask(). it
 *         BITES: with the old discovery-mode call (atoms absent) genContextBrain
 *         throws `available brains (none)` on the very same construction.
 */
describe('getAllBrainAtoms', () => {
  given('[case1] the explicit brain-atom supply', () => {
    when('[t0] the supply is read', () => {
      then('it returns a non-empty set of atoms', () => {
        const atoms = getAllBrainAtoms();
        expect(atoms.length).toBeGreaterThan(0);
      });

      then('it includes the fireworks + xai brains the callers choose', () => {
        const slugs = getAllBrainAtoms().map((atom) => atom.slug);
        expect(slugs).toContain('fireworks/deepseek/v4-flash');
        expect(slugs).toContain('xai/grok/code-fast-1');
      });
    });

    when('[t1] genContextBrain picks a choice from the supply', () => {
      then('the chosen atom is found — no `available brains (none)`', () => {
        // construction picks `choice` (the throw point); creds is lazy and
        // never runs without an ask(), so this stays hermetic (no key/network).
        const contextBrain = genContextBrain({
          brains: { atoms: getAllBrainAtoms() },
          choice: { atom: 'fireworks/deepseek/v4-flash' },
          creds: async () => ({}),
        });
        expect(contextBrain.brain.choice).toBeDefined();
      });

      then(
        'an atom absent from the supply still throws (proves it bites)',
        () => {
          // the inverse: a slug NOT in the supply reproduces the exact discovery
          // failure at construction — so the pick above is a real match, not a
          // vacuous pass.
          let thrown: unknown;
          try {
            genContextBrain({
              brains: { atoms: getAllBrainAtoms() },
              choice: { atom: 'no/such/brain' },
              creds: async () => ({}),
            });
          } catch (error) {
            thrown = error;
          }
          expect(thrown).toBeInstanceOf(BrainChoiceNotFoundError);
        },
      );
    });
  });
});
