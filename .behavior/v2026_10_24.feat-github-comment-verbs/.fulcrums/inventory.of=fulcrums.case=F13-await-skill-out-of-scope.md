# F13 · await.file.pattern stays out of this pr

## the fork

- **taken:** keep the skill out of this pr. its draft moves to the gitignored `.agent/.cache/await.file.pattern.sh`, so neither the pr nor its review scope holds it. a dream (`dreams/v2026_10_24.entool.await-file-pattern.md`) holds its lift and its jest test
- **not taken:** add the skill and its jest suite to this pr

## why, at the time

SAFE yes, CLEAN no. a test cannot sit where the skill sat: `jest.integration.config.ts` excludes `**/.agent/**`, so a tested skill needs a lift into a role under `src/`, with boot and permission registration. that is a second contract, beside the `git.pull.comment` verbs this pr exists for. this repo's rule (`rule.require.jest-tests-for-skills`) forbids a release of a skill without its suite, so the untested draft must not ship.

## rework

clean. if the council wants it in this pr: lift it per the dream, add the suite, stage both. naught else depends on it.

## confidence: 85%, and why it is not higher

the director paved the need (wait in one foreground call), and the skill is what satisfies it, so a reader could argue that it belongs with the work that needed it.

## where

5.3.verification, review 8 (has-fixed-all-gaps).

## verdict

awaits the council.
