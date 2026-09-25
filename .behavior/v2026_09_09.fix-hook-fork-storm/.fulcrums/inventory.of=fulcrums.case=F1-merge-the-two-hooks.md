# F1 — merge the two hooks into one process

**rework** dirty · **status** 🔴 **RULED — rejected** (wisher, 2026-09-10) · **confidence** 72%

> **the council ruled against the merge.**
>
> the fallback this fulcrum already carried — the leaf-trim — is now **lever A** of the plan. the
> rework grade for the whole route drops to **clean**.

## 🔴 .and an hour later the same wisher took F7, which churns `settings.json` HARDER

this fulcrum's header read *"`settings.json` is untouched, no consumer repo regenerates"* until
**F7** (drop the `rhachet run --init` wrapper) was ruled **taken**. seven command strings now churn,
in every consumer repo.

⇒ **that is not a reversal, and the difference is the ratio rather than the size:**

| | F1 — this fulcrum | F7 — the wrapper-drop |
|---|---|---|
| what churns | two commands **+** a matcher restructure **+** `getMechanicRole.ts` **+** a pinned snapshot | seven command **strings** |
| behavior risk | three seams to build — two nudge clocks, two config paths, two message sets — each a silent failure if built wrong | ✅ **zero code change**; the hooks are byte-identical |
| what it buys | **1 of 7** runner boots | 🔴 **7 of 7** |
| reversal | dirty — consumers harden against one merged hook | clean — swap seven strings back |

🔴 **so the rejection reads better now, not worse.** the merge paid the most and bought the least,
and its **sole** headline benefit — *"it removes one runner boot per Write/Edit"* — was delivered in
full by a lever that merges no hook at all.

⚠️ **a rejected design whose only advantage is later captured elsewhere is the cleanest kind of
rejection there is.** the seams below still bind regardless — they were derived from the behavior,
and the behavior did not change when the plan did.

## .the fork, stated fairly

| take | leave |
|---|---|
| fold `gerunds.sh` + `blocklist.sh` into one hook, registered once against `Write\|Edit` | keep two hooks; trim the leaf forks inside each |

## .taken, and why at the time

**taken: merge.**

the wish invited the weigh and asked us to state the verdict either way. the read that settled it
came from research the wish did not have: `.claude/settings.json:140,146` register both hooks
through `./node_modules/.bin/rhachet run --init …`, and rhachet's bin is a bun-compiled binary
(`rhachet/package.json:50-53,75`). so each hook costs a **runner boot** ahead of its bash forks —
and the wish's own roll-up puts `run.bun.rhachet-run.bc` at `71.4% cpu`, the largest line in it.

⇒ a merge removes one runner boot per Write/Edit. no leaf-fork trim can reach that, so the merge
is not merely the largest win — it is a *different kind* of win from the one the wish scoped.

it also shares the fixed bash cost (one `cat`, one stdin `jq`, one `find_claude_dir`, one `date`,
one stale sweep — each paid twice today) and retires ~60 lines of duplicated preamble.

## .rework, and why dirty

reversal is not a rename. the merge propagates:

- `getMechanicRole.ts:78,84` — the two init registrations become one
- `src/domain.roles/mechanic/__snapshots__/getMechanicRole.test.ts.snap:70,78` — both commands pinned verbatim
- `.claude/settings.json` — regenerated from the role
- 🔴 **every consumer repo** regenerates its own `settings.json` on the next `rhachet init --hooks`

⚠️ `getRoleRegistry.test.ts` was listed here on a first read and has been **struck**. it names
`forbid-terms.gerunds` at `:8` inside a `.why` comment; every assertion in it targets
`forbid-cross-repo-access` (`:24,26,45,62`). the merge leaves a stale comment there, never a red
test. the in-repo half of this rework is smaller than first graded — **two files, both mechanical**.
the dirt is entirely in the consumer-repo regeneration.

that last line is the dirt. once consumer repos carry the merged registration, a revert asks each
of them to regenerate again. callers harden against it, so reversal is a teardown, not a swap.

## .confidence, and why it is 72%

the *mechanism* is well evidenced; the *magnitude* is not measured. the claim "a runner boot is the
dominant per-invocation cost" rests on a `ps` roll-up read (`71.4% · n=8`) plus a package.json bin
entry — strong, and short of a measurement. `bash <file>` is denied to this clone, so no meter
could run at the vision.

⇒ if Q1 measures the runner boot as cheap, the merge's headline reason evaporates and only the
shared-bash win remains — real, but not worth dirty rework.

## .the three seams the merge must hold

each is a silent-failure mode, and each came out of the experience walk rather than the wish:

1. **two nudge clocks** — one record cannot carry two independent overrides for one path, or a
   gerund retry would permit a forbidden term unrefused (`case=2`)
2. **two config paths** — an absent blocklist makes its hook inert, an absent allowlist makes its
   hook stricter; one shared guard would quietly retire the gerund gate (`case=5`)
3. **both refusals reported** — content that trips both must still surface both messages, or
   acceptance #4 breaks

## .where

- `src/domain.roles/mechanic/inits/claude.hooks/pretooluse.forbid-terms.{gerunds,blocklist}.sh`
- `src/domain.roles/mechanic/getMechanicRole.ts:78,84`
- `.claude/settings.json:136-157`

## .the verdict — 🔴 REJECTED

**ruled by the wisher, 2026-09-10: no merge.**

⇒ two hooks stay two processes · no matcher restructure · `getMechanicRole.ts` and its snapshot
untouched. ⚠️ `settings.json` **does** churn, by way of **F7** — see the header.

### why the verdict is coherent, on this fulcrum's own evidence

the merge was **best-guessed** at 72% — recommended by the drive, never shipped — and this file
named the exact condition that would void it:

> *"if Q1 measures the runner boot as cheap, the merge's headline reason evaporates and only the
> shared-bash win remains — real, but not worth dirty rework."*

⚠️ **Q1 was never measured — it was READ**, and the read cut the other way: the wrapper chain is
~10 forks plus a bun boot, ×7 per Write/Edit. so the merge's headline reason grew rather than
evaporated.

⇒ the verdict therefore rested on the other side of the ledger, and that side was the wisher's
alone: the merge's win was real, its price was churn, and no read of this repo discloses another
repo's appetite for churn. **Q2 was always the question that decides, never Q1.**

### 🔴 .the condition that DID void it, and it was on neither list

this file's stated void-condition was *"the boot turns out cheap."* it did not. **the merge was
voided by a third possibility neither Q1 nor Q2 contemplated:**

> **a cheaper lever removes the same cost.**

⇒ lever B (F7) removes **all seven** runner boots for seven strings and zero code change. **the
merge's benefit was never refuted — it was obsoleted.**

⚠️ **and the void-condition was written as a disjunction of two, on a question with three
answers.** a fulcrum that names its own falsifier has done more than most, and it still framed the
call as *"is the boot expensive?"* × *"is the churn acceptable?"* — with no cell for *"is there a
cheaper way to the same win?"* ⇒ **the axis absent from a fulcrum's fork is the one that decides
it.**

### 🔴 what the rejection does NOT retire

three of this fulcrum's artifacts survive it, and one of them carries weight:

| survives | why |
|---|---|
| **the wrapper-chain evidence** | it is a fact about `rhachet`, true whether or not these hooks merge. it stays in the yield and keeps its dream, `v2026_09_09.fix.seven-runner-boots-per-write-edit` |
| **the three seams** | 🔴 they are now **invariants to preserve** rather than constraints to satisfy. two clocks, two config paths, two message sets — the leaf-trim must not accidentally share any of them either |
| **the void boundary reason** | the wish forbids a node rewrite *"because node would pay an interpreter boot"*; that boot is already paid. the boundary still stands on other merits (**Q7**), and the wisher now knows why |

⚠️ **the seams row is the trap.** they read as merge-only constraints and are not: a collapse that
folds both hooks' term reads into one shared parse would break seam 2 with no merge at all.

## .the fallback, now the plan

take the leaf-fork trim alone:

- **blocklist** — `27 jq + 9 grep` → **one** `jq`, **one** alternation `grep`; per-term detail read
  only for terms that matched
- **gerunds** — a list-free pre-scan (`grep -qE '[a-zA-Z]+ing'`) ahead of the allowlist read, so a
  payload with no `-ing` word never reads the list at all

every acceptance line is still met, and the whole route's rework grade is now **clean**.
