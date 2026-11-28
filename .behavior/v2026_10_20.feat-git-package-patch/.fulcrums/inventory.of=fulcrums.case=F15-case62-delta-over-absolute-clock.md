# F15 — case62 asserts "at once" as a delta, not an absolute clock

## .the fork

`[case62][t1]` in `pretooluse.check-permissions.integration.test.ts` claims the lock wait gives up
at once once the hook is past its deadline. two ways to measure "at once":

- **A. absolute clock** — `Date.now() - startedAt < 1500`, as main has it
- **B. delta** — run the same hook once with no lock (`prepare: null`) as a baseline, then assert
  `lockedMs - baselineMs < 1000`, beside the `LOCK_DEADLINE` pin and the live-holder-message check

## .taken: B, and why at the time

the absolute clock failed this branch's verification on a host at load ~40 / 12 cpus: a bare spawn
of the hook ran past 1500ms, so the test went red with the hook correct. the 5.3 stone orders flakes
fixed, not carried. B cancels spawn cost, so it measures only what the lock path adds.

teeth: a `sleep 2` in the hook's deadline branch turns B red (`Received: 2100`); restored, green.

## .the cost B carries

a regression that adds under 1s to the lock path passes B. A, on a quiet host where spawn is
~200–400ms, would catch a regression above ~1.1–1.3s — a similar band, not a stricter one. on a
loaded host A catches naught; it fails on spawn alone.

## .the counter-argument (enroll-verif-test-intent, i002)

the change touches a test that lives on main, in a hook this branch does not otherwise change, and
main's case58 shows the same flake and was left alone (F13). restore A, keep the additive checks,
and record the flake in a dream.

## .rework

clean: one `expect` line. to restore A is a revert of that line; both checks can also coexist.

## .confidence: 75%, and why it is low

the band comparison above is an estimate of spawn time on a quiet host, not a measurement; and a
reviewer read the change as scope creep, a call the wisher may weigh differently than i do.

## .where

`src/domain.roles/mechanic/inits/claude.hooks/pretooluse.check-permissions.integration.test.ts`
`[case62][t1]`

## .verdict

open — for the fulcrum council.
