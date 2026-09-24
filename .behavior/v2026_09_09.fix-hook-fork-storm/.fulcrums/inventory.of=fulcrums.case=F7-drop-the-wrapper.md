# F7 — drop the `rhachet run --init` wrapper, invoke `bash <path>` directly

- **rework** = clean — seven command strings in one generated file
- **status** = ✅ **RULED — taken**, 2026-09-10
- **confidence** = 94% (at the moment of the call), now moot — the wisher ruled

## .the fork, stated fairly

`.claude/settings.json` reaches every hook through an indirection:

```jsonc
"command": "./node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-terms.gerunds"
```

| | keep the wrapper | drop it |
|---|---|---|
| forks ahead of the hook | ~10, plus a bun boot, **×7 per Write/Edit** | 1 |
| stdout noise | 3 lines per hook per edit (~21 total) | 0 |
| block-message frame | `💪 init role …` + `└─ ✋ blocked by constraints` | absent |
| path resolution | dynamic, through the symlinked `.agent/` tree | static string, generated from the same role definition |
| churn | none | seven strings, regenerated in every consumer repo |

## .taken, and why — at the time

taken. two reasons, in order:

1. 🔴 **it is the largest lever available, and it needs no code change.** the arithmetic puts it at
   ~175ms saved per edit against lever A's ~48ms — and unlike lever A it carries **all seven**
   hooks, not merely the two this wish owns.
2. **the objection against it was answered by a fact only the wisher held.** the dream had rejected
   this shape on a read: *"the `--init` indirection is what resolves an init through the symlinked
   `.agent/` tree; a direct path would harden every consumer repo against a layout that is meant to
   move."* the wisher supplied the absent premise —

   > **rhachet installs the hooks exactly as they are written in the role's hook command, so it is
   > totally fine to churn that and drop the wrapper.**

   ⇒ the command string and the ported path are generated from **the same role definition**. they
   do not drift apart, because no step generates one without the other.

## 🔴 .the tension with F1, and why it is not an inconsistency

F1 (merge the two hooks) was **rejected for `settings.json` churn**. F7 churns the same file
harder — seven strings rather than two. that reads as a reversal and is not:

| | F1 — the merge | F7 — the wrapper-drop |
|---|---|---|
| what churns | two commands **+** a matcher restructure **+** `getMechanicRole.ts` **+** a pinned snapshot | seven command **strings** |
| behavior risk | three silent-failure seams to build: two nudge clocks, two config paths, two message sets | ✅ **zero code change** — the hooks are byte-identical before and after |
| what it buys | **1 of 7** runner boots | 🔴 **7 of 7** |
| reversal cost | dirty — consumers harden against one merged hook | clean — revert seven strings |

⇒ **F1 paid the most and bought the least.** its rejection was a verdict against the *instrument*,
never against the runner-boot cost. F7 is the better instrument for the same cost.

⚠️ **flagged to the wisher before it was taken**, rather than settled by side effect: *"a 5→1
dispatcher is strictly more `settings.json` churn than F1 was — and F1 was 2→1, which you rejected
for exactly that churn."* the wisher ruled with that tension on the table.

## .the rework, and why it is clean

a string swap in a generated file. to revert is to swap back. no caller hardens against it, no
later work builds upon it, and the hooks themselves never changed — so lever A's diff is entirely
independent of this call.

## 🔴 .what it costs, declared

three deltas, none of which the fork arithmetic covers:

| delta | grade |
|---|---|
| **~21 stdout lines per edit disappear** | ✅ an unbought win — fewer tokens the model reads on every Write/Edit |
| **the block-message frame disappears** — the wrapper's two lines, never the hook's content | ⚠️ **declared, raised as Q13.** acceptance #4 binds the *substance* (terms, alts, rationale), all of which the hook prints itself |
| **a wrong path fails OPEN and SILENT** | 🔴 **the real hazard.** a hook that is never invoked is a gate that never gates, in seven repos at once, and no extant test would notice — the `.test.sh` harnesses invoke by path directly, so they pass regardless of what `settings.json` holds |

⇒ the third row is why `case=6`'s clamp must assert the hook is **reached**, never merely that it
is cheap.

## .where

- `1.vision.yield.md` — `.the three levers` (lever B) · `.what the wrapper does that a direct
  bash does not` · `.how lever B re-reads acceptance #1`
- `.dream/v2026_09_09.fix.seven-runner-boots-per-write-edit.md` — the dream this taking retires
- `1.vision.experience.case=6.hook-maintainer.fork-clamp-bites.md` — where the reach assertion lands

## ✅ .the verdict — 2026-09-10

**taken**, by the wisher, with the F1 tension explicitly on the table. ⇒ the plan is **lever A +
lever B**; lever C (compile to a binary) is rejected on arithmetic as **Q12**.
