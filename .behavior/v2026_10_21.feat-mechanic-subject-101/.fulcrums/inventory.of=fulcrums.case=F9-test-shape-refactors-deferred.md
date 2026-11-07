# F9 — test-shape refactors the 5.1 l3 lanes suggest, deferred

## the fork

the i005 l3 lanes raise six `[nitpick][better]` points that reshape the tests rather than fix a
defect:

| lane · concern | the ask |
|---|---|
| arch-defects nitpick.2 | move the pure operations (`asBootCost`, `asBootSpecSlice`, …) into a testkit with a unit `.test.ts`; rename `asSubjectCapBreach` → `getOneSubjectCapBreach` |
| arch-defects nitpick.3 | turn the logged `union` cost into a tripwire that fails once rhachet ships the opt-out |
| arch-defects nitpick.5 | replace the exact 101 pin with invariants, generalized to every capped subject |
| behavior-intent nitpick.1 | a per-subject cost baseline (or snapshot) to catch full-role drift |
| behavior-intent nitpick.3 | snapshot the rendered `--subject 101` boot |
| behavior-intent nitpick.4 | surface the slice log on a passed run |

options:
- A. defer all six; catch a dream with the shape of each.
- B. take them in this round.

## taken, and why

A. each is sound, none ships a harm, and each ripples:
- a testkit move and a rename touch shared kit code three suites import;
- a tripwire, a cost baseline, and a rendered snapshot each pin numbers that move on every brief edit
  anywhere in the role, so each needs a masked or banded design of its own;
- the exact pin was asked for by the i003 lanes; to replace it is a contract call, not a fix;
- the log line rides the paved runner's own policy (logs on failure), which a breach still trips.

the cheap, safe ones in the same round were taken: static snapshot labels, one verdict path,
timeless comments, a hooks-stay-on-the-role pin.

## rework

clean — each is additive in test code; no product file changes.

## confidence, and why it is low

80%. a reviewer may grade the tripwire or the baseline as a coverage gap, not a refactor.

## where

`src/domain.roles/boot.budget.integration.test.ts`, `src/domain.roles/mechanic/boot.yml.integration.test.ts`,
`src/domain.roles/.test/bootYml.testkit.ts`.

## verdict

best-guessed: A.
