# review.self: has-ergonomics-reviewed (r2)

## the artifact reviewed

file: `.behavior/v2026_03_22.fix-git-release/3.2.distill.repros.experience._.v1.i1.md`

i re-read the ergonomics review section (lines 199-210) and the journey test sketches (lines 16-171), then evaluated each against the pit of success principles.

---

## pit of success evaluation

### principle 1: intuitive design

**question**: can users succeed without documentation?

| journey | intuitive? | evidence |
|---------|------------|----------|
| plan mode | ✅ yes | `rhx git.release` with zero flags shows status — most natural start point |
| watch mode | ✅ yes | `--watch` is a common CLI pattern — users expect it to mean "follow progress" |
| apply mode | ✅ yes | `--apply` reads as "apply changes" — clear action verb |
| prod release | ✅ yes | `--into prod` reads naturally as destination — "release into prod" |
| from main | ✅ yes | `--from main` reads as source override — "release from main" |
| retry | ✅ yes | `--retry` is universal CLI pattern for "try again" |

**verdict**: all journeys pass intuitive design. the flag names are self-evident.

---

### principle 2: convenient defaults

**question**: can we infer inputs rather than require them?

| inference | evidence | holds? |
|-----------|----------|--------|
| `--from` defaults to current branch | domain distill line 98-101: infers from `$CURRENT_BRANCH` | ✅ yes |
| `--into` defaults based on `--from` | domain distill lines 106-119: if from=feat → into=main; if from=main → into=prod | ✅ yes |
| `--mode` defaults to plan | vision line ~35: plan mode is default, safe read-only | ✅ yes |
| `--dirty` defaults to block | vision line ~45: fails fast on uncommitted changes | ✅ yes |

**verdict**: all defaults are convenient. the most common action (check status) requires zero flags.

---

### principle 3: expressive (happy path + escape hatches)

**question**: does it pull into inferred happy path, but allow expression of differences?

| happy path | escape hatch | evidence |
|------------|--------------|----------|
| from=feat (on feat branch) | `--from main` or `--from <branch>` | domain distill lines 110-119 |
| into=main (from feat) | `--into prod` | journey 2 snapshot at line 100 |
| mode=plan | `--mode apply` or `--apply` | journey 1 vs journey 3 snapshots |
| dirty=block | `--dirty allow` | vision line ~45 |

**verdict**: all happy paths have explicit escape hatches. the design is expressive without burden on the common case.

---

### principle 4: composable

**question**: can this be combined with other operations easily?

| combination | evidence | holds? |
|-------------|----------|--------|
| `--watch` alone | journey 2 snapshot at line 69 — watch without automerge | ✅ yes |
| `--apply` alone | journey 3 snapshot at line 44 — automerge with implicit watch | ✅ yes |
| `--retry` alone | journey 4 snapshot at line 158 — retry without watch | ✅ yes |
| `--retry --watch` | domain distill line ~154: retry then watch | ✅ yes |
| `--retry --apply` | criteria 2.1 line ~175: retry, then automerge, then watch | ✅ yes |
| `--into prod --apply` | journey 3 snapshot at line 100: full chain | ✅ yes |
| `--from main --into prod` | vision line ~57: skip feat branch | ✅ yes |

**verdict**: flags compose naturally. no exclusive conflicts. `--apply` implies `--watch` which is intuitive (you want to see what happens after automerge).

---

### principle 5: lower trust contracts

**question**: do we validate at boundaries?

| boundary | validation | evidence |
|----------|------------|----------|
| `--from main --into main` | ConstraintError | domain distill line 111: throws error |
| dirty work directory | fails fast unless `--dirty allow` | vision line ~45 |
| no open PR | shows hint, does not proceed | journey 4 snapshot lines 140-153 |
| needs rebase | shows hint, does not proceed | vision lines ~162-167 |
| ambiguous release PRs | ConstraintError | criteria 2.1 line ~205 |

**verdict**: all boundary conditions are validated early. the system fails fast with clear hints.

---

### principle 6: deeper behavior (edge cases)

**question**: do we handle edge cases gracefully?

| edge case | response | evidence |
|-----------|----------|----------|
| PR already merged | shows `🌴 already merged`, proceeds to next transport | journey 3 snapshot line 108 |
| automerge already enabled | shows `[found]` not `[added]` | criteria 2.1 line ~155 |
| checks already passed | shows status, does not poll | criteria 2.1 line ~110 |
| timeout in watch | exits with error, shows partial progress | criteria 2.1 line ~118 |
| no tag workflows | shows `🫧 no tag workflows found` | criteria 2.3 line ~73 |

**verdict**: all edge cases have explicit responses. no silent failures.

---

## issues found

### issue 1: `--apply` implication not explicit in artifact

the artifact at line 205 says "improved — `--apply` alias" but does not explicitly state that `--apply` implies `--watch`.

**how addressed**: this is documented in domain distill line 49: "apply=true → watch=true (implied)" and in criteria 2.1. the artifact is a summary table, not exhaustive spec. acceptable as-is.

**why it holds**: the detailed specification in domain distill and criteria captures this. the ergonomics table is a summary.

### issue 2: no friction column values

the artifact at lines 203-208 shows "none" for all friction columns except apply mode which shows "`--mode apply` still works".

**how addressed**: i verified each journey and found no friction. the "none" is accurate, not lazy.

**why it holds**:
- plan mode: zero flags → zero friction
- watch mode: one flag → minimal friction
- apply mode: alias saves keystrokes → reduced friction
- prod release: two flags for three transports → proportional
- from main: explicit override → appropriate complexity
- retry: one flag → minimal friction

---

## summary

| principle | holds? | key evidence |
|-----------|--------|--------------|
| intuitive design | ✅ yes | flag names are self-evident verbs |
| convenient defaults | ✅ yes | zero flags for most common action |
| expressive | ✅ yes | every default has an override |
| composable | ✅ yes | flags combine without conflict |
| lower trust contracts | ✅ yes | all boundaries validated early |
| deeper behavior | ✅ yes | all edge cases handled explicitly |

**no ergonomics issues found.** the artifact accurately captures input/output ergonomics for all journeys.

the design achieves pit of success: the path of least resistance leads to correct behavior.

