# F35 — the real github and live `clone say` tests run on a named flag, not in every ci run

## .the fork

two peer lanes at 5.3 (r3 mech-external-contracts, r4 ergo-acceptance-journey-coverage) ask that
the real github read run in every ci pipeline, and that a live `clone say` success be proven
against real rhachet.

- (a) gate the real github suite on `TEST_LIVE=github`: ci runs it skipped by name; named, an
  absent key throws a ConstraintError with the fill command (precedent: rhachet-roles-nheuron #4)
- (b) fill the ehmpath github key into ci and run the suite on every pipeline
- (c) a live `clone say` success: needs a brain session in a terminal, which needs an oauth token

## .taken, why

(a), as the commander ruled (2026-10-31, the three test tiers; seed S4): live tests run only when
a named flag targets them, and ci goes green with no new credential. (b) is the new credential
the tiers forbid. (c) needs the oauth token the tiers forbid outright (F15). the real round trip
still exists and runs loud when named; no case fakes it.

## .rework

clean: a ci job that sets `TEST_LIVE=github` and holds the key, once a human fills it and the
commander lifts the tier. the suite needs no edit.

## .confidence

99%: ruled by the commander, relayed by the director; not a best guess.

## .where

`src/domain.roles/mechanic/skills/git.pull.watch/git.pull.watch.github.real.integration.test.ts`;
`git.pull.watch.rhachet.real.integration.test.ts` (failure shapes real; success per F15).

## .verdict

ruled by commander: (a).
