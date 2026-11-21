## what

`role=mechanic` gains `subject.101`: the cure rules a director seat must meet that no hook enforces. a seat that enrolls `mechanic::101` boots every mechanic hook plus these rules, apart from `always`.

- `subject.101` declares `inherit: { always: false }` (rhachet 1.51.0, ehmpathy/rhachet#649), so a 101 seat boots the section alone
- it says eight rules: failfast, failloud, forbid failhide (pt1), exit-code semantics, qualified error headers, forbid nonidempotent mutations, forbid as-cast, clamp edge cases
- six refs back them: failhide pt2, failfast seed + shell demo, idempotent procedures, assure via type checks, test-covered repairs
- `always` and every other subject keep main's rows
- main's eight `git.pull.watch` sub-files join `always.skills.not`, beside the cutover and uses sub-files, so the full role fits its cap (see cost)

## cost

| measure | tokens |
|---|---|
| a 101 seat (`--subject 101`) | 2,618 / 10,000 |
| full role | 29,931 / 30,000 |
| `subject.101`'s cost in the full role | +155, rhachet ref-roster text |
| the watch sub-files under `not:` | −81 |

measured on rhachet 1.51.0. rhachet refuses a `budget:` inside a section, so the 10k cap lives in `boot.budget.integration.test.ts`.

## tests

- `boot.budget.integration.test.ts`: caps the 101 section at 10k (named `ConstraintError` on breach); the boot a seat reads must be no more than the section alone, so a dropped opt-out fails; every other subject boots token-identical with and without 101
- `boot.yml.integration.test.ts`: pins the 101 rows, the opt-out on 101 alone, the keys rhachet reads, and that every 101 say row boots as a say block
- `blackbox/mechanic.subject.101.acceptance.test.ts`: boots the built package at `--subject 101`: paths, cost readout, the `/tmp` hook block, and the error a mistyped subject returns
- load-sensitive clocks clamped at source: boot/cost spawns get 120s for rhachet's cli startup; check-permissions deadline cases time the hook alone; pressViaPipeline [t1] gets 300s
- `set.package` install + upgrade snapshots mask the live npm advisory list for `lodash`, which npm edits; case2 still asserts the real block

## deps

- none. main pins `rhachet` 1.51.0, which ships the focus enroll and the opt-out

closes ehmpathy/rhachet-roles-ehmpathy#1041

---
🐢🌊 surfed in by seaturtle[bot]
