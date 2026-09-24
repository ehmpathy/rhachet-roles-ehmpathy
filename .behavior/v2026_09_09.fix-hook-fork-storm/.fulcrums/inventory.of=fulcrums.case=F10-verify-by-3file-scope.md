# F10 — verify by a 3-file scope, and defer the `inflight`-legibility defect

- **rework** = clean
- **status** = 🔴 **CLOSED by the driver, 2026-09-12 — the gap was run, and it was NOT empty**
- **confidence** = 91% at the call · ⚠️ **the 9% is exactly where the defect sat**
- **called** = 2026-09-11, at execution, after three diagnoses of a "hang" that was never a hang

## .the cue that fired

a 13-file integration sweep printed `💤 inflight (Ns)` for 19 minutes. it was read as a hang and
killed. two more readings followed before the truth: **the suites are simply slow** — ~36s per
file, so a large scope legitimately runs for minutes and the poll line never changes shape.

## 🔴 .the three diagnoses, in the order they were believed

| # | diagnosis | refuted by |
|---|---|---|
| 1 | runqueue contention (two jest runs were live) | it sat inflight the same way when run alone |
| 2 | `permissionrequest.compose` hangs | a 10-file scope that **excluded** it sat inflight too |
| 3 | ✅ no hang at all — the batch simply exceeded the wait | a 3-file scope finished **green in 109s** |

⚠️ **#1 flattered this wish's own thesis.** the fork-storm wish argues that fork latency under
contention is the real cost, so "two jest runs contended" was not merely plausible — it was the
premise, restated. it was written into the execution yield as a first-hand demonstration before
the one-line experiment that refutes it was ever run.

⚠️ **#2 was refuted by evidence already in hand.** the 10-file scope that also sat inflight had
been run *before* the blame was recorded, and it excluded the suite being blamed.

## .the fork, stated fairly

| | chase the slowness now | verify by a 3-file scope, defer the legibility fix |
|---|---|---|
| verification value | ⚠️ **identical** — a 3-file scope runs the same assertions as a 13-file one | ✅ 63/63 green across all three suites this change owns |
| what it costs | a read of `git.repo.test.sh`'s output layer + a per-suite cost investigation | one 109s run |
| the wish's boundary | a skill this wish never opens | honored |
| what is left open | — | the `inflight` line stays ambiguous for the next reader |

## .taken, and why at the time

**verify with a 3-file scope; defer both the slowness and the legibility.**

1. **a 3-file scope is not weaker verification than a 13-file one.** it runs every assertion the
   three suites own, together, in one jest process — which is precisely the interaction a
   multi-file run exists to check. the other ten suites exercise hooks this change never touches.
2. 🔴 **the `inflight` ambiguity is a real ergonomics defect** — it cost three misdiagnoses in one
   session — and its fix lands in `git.repo.test.sh`'s output layer, which fails CLEAN.
3. the per-suite slowness (~36s) is a third, separate concern, and no evidence yet shows it to be
   anything but the honest cost of dozens of bash spawns per suite.

## .rework, and why

**clean.** no code changed for this. the dream records the measurements and the shape of the fix;
whoever takes it starts from strictly more than this drive had.

## .confidence, and why it is not higher

**91%.** the verification argument is strong — the three suites pass together, which is the real
question. what holds it under 93 is the honest gap below.

## ⚠️ .what the deferral leaves unverified

**10 of the 13 hook suites were never observed green under this change**, because every scope
large enough to include them was killed before it finished.

the case that this is fine: those ten exercise hooks whose files are untouched by this diff; the
one artifact they share is `.claude/settings.json`, which was swapped back to its pre-change
content with no behavior delta observed; and CI runs the full suite green in under 3 minutes, so
the gap closes automatically on the next push.

⇒ **stated rather than glossed.** "CI will catch it" is a real answer and it is not the same as a
local green run, and a reviewer is entitled to weigh that differently.

## .where

- the dream: `.dream/v2026_09_11.fix.git-repo-test-inflight-reads-as-a-hang.md`
- the record of the three diagnoses: `5.1.execution.from_vision.yield.md`
- the green run: `--scope 'path://forbid-terms'` → 3 files, 63 tests, 109s

## 🔴 .the resolution — the gap was run, and the deferral's own escape hatch was the wrong one

peer r008 graded the open gap a nitpick and named it *"a genuine untested-code-path item that is
deferred, not closed."* ⇒ so it was run rather than argued about:

```
rhx git.repo.test --what integration --mode apply --scope 'path://claude.hooks'
  → 14 files · 749 passed · 3 FAILED · 235s
```

### what the wide run disclosed

| the deferral's claim | what the run showed |
|---|---|
| "a 3-file scope is not weaker verification" | ✅ **held.** all 3 failures are in the other ten; the three suites this change owns are green |
| "those ten exercise hooks whose files are untouched" | ✅ **held, and verified** — `git diff main --stat` on all three is **empty** |
| 🔴 "CI runs the full suite green, so the gap closes automatically" | 🔴 **this is the one that does not hold** |

**the third claim is the load-bearing one, and it is backwards.** the three failures come from a
jq **version** mismatch — three hooks allowlist jq's parse-error exit as `2 or 5`, and this box's
jq exits `4`. ⇒ if CI is green, CI runs a *different jq*, so **CI is precisely the instrument that
cannot see this class.** the gap was never one CI would close; it was one only a local run could
find.

⚠️ **and it was never a hang.** 235s — slow, and it finishes. the three misdiagnoses above cost
this drive more than the wait they were avoiding.

### the disposition

the three failures are **prior, unrelated, and out of this wish's bounds** (SAFE fails hard: a
fail-open → fail-closed flip on three hooks this wish does not own). ⇒ caught, not fixed:
`.dream/v2026_09_12.fix.jq-parse-error-exit-4-unallowlisted.md`.

## .the lesson the closure earns

> 🔴 **a deferral's escape hatch deserves the same scrutiny as its main argument.** the verification
> case here was sound and stayed sound. what was wrong was the one clause nobody weighed — *"CI will
> catch it"* — and it was wrong in the direction that made the deferral look free.

⇒ **a wide run found what no narrow run could.** the cue was scope, never suspicion: a driver who
scopes every run to the files they touched sees a repo-wide red never.

## .the verdict

✅ **closed by the driver.** no council call is owed — the gap the fulcrum reserved has been run,
its contents identified, and its one live item caught as a dream.

