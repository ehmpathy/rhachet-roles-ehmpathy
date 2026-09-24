# inventory of fulcrums — v2026_09_09.fix-hook-fork-storm

design forks best-guessed mid-drive, itemized at the moment of the call.

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | merge the two hooks into one process | ~~dirty~~ | 🔴 **RULED — rejected** | 72% |
| F2 | fork count clamped by a PATH-shim exec tally | clean | open | 88% |
| F3 | cache the word list, keyed on mtime + size | clean | 🔴 **leans reject** | 80% |
| F4 | "under 10 processes" read as an exec count | clean | ✅ **dissolved** | 70% |
| F5 | leave the malformed-config failhide unrepaired | clean | ✅ **RULED — taken** | 91% |
| F6 | walk the 480-cell product in two staged boxes | clean | open | 85% |
| 🔴 **F7** | **drop the wrapper, invoke `bash <path>` directly** | clean | ✅ **RULED — taken** | 94% |
| F8 | port only two of the five hook `.test.sh` files | clean | 🔴 **DISSOLVED** — the fork was not real | 87% |
| F9 | the "no wrapper" clamp is scoped to this role, by `author` | clean | open | 90% |
| 🔴 **F10** | verify by a 3-file scope; defer the `inflight`-legibility defect | clean | ✅ **CLOSED by the driver** — the gap was run, and it was **not** empty | 91% |
| 🔴 **F11** | **defer the shared HARDNUDGE lib, though the duplication is proven** | clean | 🔴 **SPLIT** — test-harness half **TAKEN at i010**, its contract **widened at i012** (a third copy it could not serve), bash-lib half deferred | 84% → **96%** |
| ✅ **F12** | ~~defer the term-compile assertion~~ · **TAKEN at i006 — `[case27]` landed, all 9 live terms pass** | clean | **closed** | 86% → **100% (measured)** |
| 🔴 **F13** | ~~drop `--conversation` from the 9 l1 lanes~~ — **the hypothesis was wrong** | clean | 🔴 **REFUTED + REVERTED same day.** the OOM is `.temp/genTempDir.symlink` → 10,172 dirs, walked because the gitignore filter runs AFTER the walk. proven by control: +`.temp/**` = 4,975 files in **2.6s** vs **TIMEOUT** | 70% → **0% (measured)** |
| ✅ **F14** | **narrow the l1 subjects glob off the repo root** | clean | ✅ **TAKEN, and PROVEN end-to-end at i017.** F13 discarded this lever by a read that conflated `--paths-with` (the walk's INPUT, `:280`) with `--paths-wout` (the post-filter, `:310`). the lanes went from **0 log files / OOM after ~15min** to **10 log files / ~2min**, at **93 target files** and **66.9%** context — complete scope, zero loss | **96% → 100% (measured)** |
| ✅ **F15** | **add `.agent` to F14's anchored roots**, on `5.3.verification`'s own guard | clean | ✅ **TAKEN, CONFIRMED by measurement at i002.** the stone re-acquired F14's defect because the bhuild TEMPLATE still ships it — a *local* re-application, never a regression. lanes went **8 of 9 malfunctioned → 0 of 9**, at **118 targets / 50.1%** context. ⚠️ the `.agent` delta itself measured ~zero on the targets side; F14's four roots would likely have served. it was added because re-verification found a `.md` outside them, and a 4-day-old zero-delta claim is not evidence | 88% → **100% (measured)** |
| 🔴 **F16** | **dispute the r12 tally** rather than absorb 4 concerns the lane never enumerated. both numerals are quotable from its own prose, each about a **different** lane — an `incidental-match trap` the reviewer contract names by name | clean | ⏳ **raised** — awaits the council | 93% |

## 🔴 .the council ruled — 2026-09-10

| # | verdict | what follows |
|---|---|---|
| **F1** | 🔴 **rejected** — no merge | two hooks stay two processes; no matcher restructure, no `getMechanicRole.ts` change, no snapshot churn |
| **F5** | ✅ **taken** — the failhide stays | **A8 ratified**, **Q5 dissolved**, and peer r2's blocker closed by the one party permitted to close it |
| 🔴 **F7** | ✅ **taken** — drop the wrapper | seven command strings churn; **7 of 7 runner boots removed**; **Q6 dissolves twice over**, since hook and chain become one and the same |

⇒ 🔴 **no dirty fulcrum is left. every open call is reversible inside this route's own diff.**

### 🔴 .F1 and F7 point opposite ways on churn, and both verdicts stand

F1 was refused for `settings.json` churn; F7 churns the same file **harder** and was taken. that
tension is real and it resolves — the two churns differ in **kind**:

| | F1 — the merge | F7 — the wrapper-drop |
|---|---|---|
| what churns | two commands **+** a matcher restructure **+** `getMechanicRole.ts` **+** a snapshot | seven command **strings** |
| behavior risk | three seams to build, each a silent failure if built wrong | ✅ **zero code change** |
| what it buys | **1 of 7** runner boots | 🔴 **7 of 7** |

⇒ **F1 paid the most and bought the least.** its rejection was a verdict against the *instrument*,
never against the cost it targeted — and F7 is the better instrument for that same cost.

⚠️ **the tension was flagged to the wisher before F7 was ruled**, rather than settled by side
effect. a fulcrum list exists precisely so a reversal is visible at the moment it is made.

### ⚠️ .what the three verdicts do to the wish's shape

the earlier read — *"the wish is now a pure cost change, zero observable behavior delta"* — held
under F1+F5 alone. **F7 narrows it by one line**: the wrapper's two frame lines vanish from every
block message, so what holds now is

> **zero delta in the block's SUBSTANCE — terms, alternatives, rationale — in any config state,
> either direction. the wrapper's frame around it changes.**

⇒ still strong enough for the equivalence clamp to test exhaustively, because every byte the
**hook** emits is unchanged. raised as **Q13** so the narrower claim is the wisher's to accept,
never ours to absorb.

⇒ **the five still open are F2, F3, F6, F9, F11** — an instrument choice, a lever that leans
reject, a document layout, one scope bound, and one deferral of a proven-duplication extraction.
not one touches behavior.

### ✅ .F12 CLOSED at peer round 6 — 2026-09-12, and the deferral had bought naught

⚠️ **F12 was the one whose deferral left a hole open**, rather than merely a tidiness owed — and it
was the one row where the deferral itself was the defect.

peer r6 escalated it from nitpick (i005) to **blocker** (i006) and named the fix exactly: *"a repo
test that asserts every term compiles standalone, zero runtime cost."* so it was **run** rather than
argued a third time:

| the deferral's claim | the verdict |
|---|---|
| *"a per-term compile check = N execs on the clean path"* (my i005 `.taken`) | 🔴 **false, and my own F12 entry said so** — a repo test costs the hook **zero** forks. i conflated an in-hook check with a ci test |
| *"a term that failed it would oblige a policy edit to the frozen artifact"* | 🔴 **a prediction.** measured: **all 9 live terms pass**, first run. no edit owed, no wisher call taken |

⇒ landed as `[case27]`, proven to bite at `[t1]`, **162/162 green**. the dream is **TAKEN**.

🔴 **the transferable part: the 14% in this row's confidence WAS the measurement**, and a measurement
is not a probability. a fulcrum that reserves a call on *"what if the test fails"* can often just run
the test — and when it can, the row is not a fulcrum at all.

### 🔴 .F10 CLOSED at peer round 3 — 2026-09-12, and the gap was not empty

peer r8 graded the open coverage gap a nitpick — *"deferred, not closed"* — so it was **run**
rather than argued: `--scope 'path://claude.hooks'` → **14 files, 749 passed, 3 failed, 235s.**

| the deferral's claim | the verdict |
|---|---|
| a 3-file scope verifies this change as well as a 13-file one | ✅ held — every failure is in the other ten |
| those ten touch files this diff does not | ✅ held, and **verified** — `git diff main` on all three is empty |
| 🔴 "CI runs the full suite green, so the gap closes itself" | 🔴 **backwards.** the defect is a jq **version** mismatch, so a green CI proves only that CI runs a different jq — **CI is the one instrument that cannot see this class** |

⚠️ **and it was never a hang: 235s.** three misdiagnoses cost more than the wait they avoided.

⇒ the three reds are prior, unrelated, and SAFE-fails-hard (a fail-open → fail-closed flip on
hooks this wish does not own), so they are caught rather than fixed:
`.dream/v2026_09_12.fix.jq-parse-error-exit-4-unallowlisted.md`.

> 🔴 **the lesson: a deferral's escape hatch deserves the scrutiny its main argument gets.** the
> verification case was sound and stayed sound; the clause nobody weighed is the one that was
> wrong, and it was wrong in the direction that made the deferral look free.

### 🔴 .F8 DISSOLVED at peer round 1 — 2026-09-12

peer r1 graded the deferral a blocker. the check that ask forced found **two of the three deferred
files already had a `.integration.test.ts` beside them** — so they were superseded duplicates, not
sole coverage, and one of the two was **stale** (it asserted three commands were ALLOWED that the
live hook blocks). the real cost was **one port and two deletions**, never three ports.

⇒ SAFE ✅ + CLEAN ✅ at the true cost, so scouts-honor says do it now. all five `.test.sh` files are
gone and no question reaches the council.

⚠️ **the lesson is about the fulcrum, never the verdict.** F8's rework grade was computed from a
premise — *"each of the three is the only coverage its hook has"* — that one `ls` would have
refuted. **a fulcrum that rests on an unchecked premise reserves the WRONG question**, and it does
so convincingly, because every step above the premise is careful. the 87% named the wrong risk: it
flagged the boundary-versus-rule authority question, and what fired was the premise.

### ⚠️ .F8, F9, and F10 were called at EXECUTION, after the council already ruled

all three surfaced while the plan met the code, so none was on the table when F1/F5/F7 were ruled.

| # | what the execution turned up that the vision could not |
|---|---|
| **F8** | the hook dir holds **five** `.test.sh` files, not the two this wish opens. the rule grades each a blocker; the wish's boundary fences three of them off |
| **F9** | `.claude/settings.json` carries hooks from **eight** role packages. an unscoped "no wrapper" clamp would fail on seven repos this drive cannot reach |
| 🔴 **F10** | a 13-file scope looks hung and is merely slow (~36s/file). **three diagnoses were believed before the cheap experiment that settles it** — and the first restated this wish's own thesis back to itself |

⇒ **a fulcrum list is not closed by a council round.** each is clean, so none re-opens a ruled
call — they are new forks, found where the plan met the code.

## .how to read this

- **rework** — what a reversal costs. `clean` = a rename, a swapped default, a re-scoped bound
  that does not ripple. `dirty` = callers hardened against it, or later work built upon it.
- **confidence** — how firmly the call would be defended at review. under 93% earns a row even
  where no alternative was weighed (`rule.always.itemize-the-fulcrums-you-best-guess`).
- **status** — open until the council rules.

## ✅ .the dirty row was read first, and it was ruled against

only **F1** was dirty, and the council rejected it. ⇒ **the fallback held exactly as this inventory
promised** — *"the rest of the vision stands unchanged; the leaf-fork trim alone still meets every
acceptance line."*

⚠️ **that promise is worth an audit rather than a nod.** it was written before the walk found the
three merge seams, so the honest check is whether any *other* artifact had quietly leaned on the
merge. two had, and both are repaired: the yield's merge section (which recommended it) and the
constraint list (whose first three items bound the merge). ⇒ **a fallback stated once at the top of
an inventory does not propagate itself.**

## .entries

- [F1 — merge the two hooks](./inventory.of=fulcrums.case=F1-merge-the-two-hooks.md)
- [F2 — the fork instrument](./inventory.of=fulcrums.case=F2-fork-instrument-exec-tally.md)
- [F3 — the cache witness](./inventory.of=fulcrums.case=F3-cache-witness-mtime-size.md)
- [F4 — what "processes" counts](./inventory.of=fulcrums.case=F4-processes-read-as-execs.md)
- [F5 — the failhide left in place](./inventory.of=fulcrums.case=F5-failhide-left-in-place.md)
- [F6 — the two-stage walk](./inventory.of=fulcrums.case=F6-two-stage-product-walk.md)
- 🔴 [F7 — drop the wrapper](./inventory.of=fulcrums.case=F7-drop-the-wrapper.md)
- [F8 — port two of five `.test.sh`](./inventory.of=fulcrums.case=F8-port-only-two-of-five-test-sh.md)
- [F9 — the clamp scoped by author](./inventory.of=fulcrums.case=F9-wrapper-clamp-scoped-by-author.md)
- 🔴 [F10 — verify by a 3-file scope](./inventory.of=fulcrums.case=F10-verify-by-3file-scope.md)
- 🔴 [F11 — defer the shared HARDNUDGE lib](./inventory.of=fulcrums.case=F11-defer-the-shared-hardnudge-lib.md)
- 🔴 [F12 — defer the term-compile assertion](./inventory.of=fulcrums.case=F12-defer-the-term-compile-assertion.md)
- 🔴 [F13 — drop `--conversation` from the l1 lanes](./inventory.of=fulcrums.case=F13-drop-conversation-from-l1-lanes.md)
- ✅ [F14 — narrow the subjects glob off the repo root](./inventory.of=fulcrums.case=F14-narrow-the-subjects-glob-off-repo-root.md)
- ✅ [F15 — add `.agent` to the anchored subjects roots](./inventory.of=fulcrums.case=F15-add-agent-to-the-anchored-subjects-roots.md)
- 🔴 [F16 — dispute the r12 phantom tally](./inventory.of=fulcrums.case=F16-dispute-the-r12-phantom-tally.md)
