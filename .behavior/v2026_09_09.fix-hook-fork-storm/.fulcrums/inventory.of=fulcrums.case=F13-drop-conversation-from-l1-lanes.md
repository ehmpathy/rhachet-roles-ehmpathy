# F13 — drop `--conversation` from the nine l1 review lanes

| | |
|---|---|
| **case** | F13 |
| **title** | drop `--conversation $conversation` from the 9 l1 lanes; keep it on both l3 enroll lanes |
| **rework** | **clean** — one `--conversation $conversation` token per lane, restorable in one edit |
| **status** | taken by the driver, 2026-09-13; open to council overrule |
| **confidence** | **70%** |

---

## .the fork, stated fairly

every l1 lane OOM'd at 2GB across i014 and i015 — nine of eleven at i014, and both lanes measured so
far at i015 (r002's trace: `807518 ms … FATAL ERROR: Ineffective mark-compacts near heap limit`). the
stone cannot pass while every cheap lane is dark.

| the option | what it costs |
|---|---|
| **A — do naught, re-arrive** | each round is ~2.5h and every lane fails. it does not converge |
| **B — narrow `--paths-with`** | 🔴 **ruled out by a source read**, see below |
| **C — drop `--conversation` from l1** ✅ taken | l1 reviewers lose memory of answered points and may re-raise them |
| **D — `--as blocked`, ask a human** | a lever was still unspent ⇒ forbidden by `rule.always.spend-own-levers-before-escalation` |

## 🔴 .why B was ruled out — AND WHY THAT VERDICT WAS WRONG

### the argument as it stood

`stepReview.js` gathers the diff **first**, then enumerates `--paths-with`, then writes
`input.scope.debug.json` at line 314 — a write the source comments as *"write scope debug file
before validation (enables debug even on failure)."*

> **our i014 and i015 log dirs are EMPTY.**

⇒ the process dies **upstream of line 314**, so a `--paths-with` narrow filters after the step that
kills it.

### 🔴 the refutation — 2026-09-13, by a closer read of the same file

**the premise was right and the inference was backwards.** the process does die upstream of 314.
what does not follow is that `--paths-with` filters after it:

| line | what it does |
|---|---|
| `stepReview.js:266-269` | `positivePathGlobs = [...pathGlobs, ...pathsWithGlobs]` — **`--paths-with` values pass through verbatim** |
| `:280` | `enumFilesForReviewSubjects({ glob: positivePathGlobs })` — 🔴 **this IS the step that kills it** |
| `:310` | `--paths-wout` negatives applied. **this** is the post-filter |

⇒ **`--paths-with` is the walk's own INPUT; `--paths-wout` is the post-filter.** the verdict
conflated the two, so it discarded the one lever that reaches the cause and kept the one that cannot.

⚠️ **and the tell was the same tell as everywhere else in this row: it was argued, never measured.**
one control settles it —

| the glob the guard used | result |
|---|---|
| `'**/*.{ts,sh,md,snap}'` — root-anchored | 🔴 **TIMEOUT at 30s** |
| `'{src,.behavior,.dream,.claude}/**/*.{ts,sh,md,snap}'` | ✅ **3,572 files in 596ms** |

⇒ **≥50× faster, with zero scope delta** — the 5 files the narrow misses are the 5 ` D` deletions,
which are not on disk, so the root-anchored glob missed them too.

⇒ **taken as F14.** the lane repair was driver-owned the whole time, and
`rule.always.diagnose-reviewer-malfunctions` named it first, exactly as written.

## .why C, and why the confidence is only 70%

what argues **for** it:

| evidence | |
|---|---|
| `--conversation` is **opt-in**, and the guard expands `$conversation` to **every** prior `.given` + `.taken` | `review.js:69` |
| that set spans i001→i015 × 11 lanes and **grows monotonically, every round** | measured: **977KB** |
| it is the one input that moved between i013 (ran, 1M prompt, 10 log files) and i014 (died, 0 log files) | the diff corpus barely changed — 48 tracked files, ~6k insertions, 55 untracked |
| 🔴 the `.taken` sweep I wrote to ANSWER i014 fed this exact channel | eleven new files, straight into the next round's `$conversation` |

what argues **against**, and why 70% rather than 90%:

- 🔴 **I never measured the OOM's source.** 977KB of text does not obviously exhaust 2GB. the growth
  is correlated with the failure's onset; it is not proven to cause it. a quadratic assembly
  elsewhere would produce the same correlation.
- the one instrument that would settle it is a hand-run `rhx review`, which `rule.forbid.hand-run-reviews`
  forbids outright — **the invocation is the violation**, so the uncertainty is structural rather
  than lazy.
- ⚠️ **this drive has already been wrong once today about a cause it believed proven.** the i014
  remedy (the yield restructure) was asserted as a repair, measured by one file's line count, and
  did not shrink the reviewer's corpus at all. that error is recorded in the i014 r001 `.taken`.

## 🔴 .what it costs, stated rather than absorbed

an l1 reviewer now reads the artifact **with no memory of the fifteen rounds that preceded it.**

| what is lost | why it matters here |
|---|---|
| a point answered by a `.taken` may be re-raised | the reviewer *"drops a point that carries a response and re-raises one that does not"* — with no conversation, every response is invisible |
| the drive's settled distinctions go unremembered | e.g. that `[case20]` pins a **known-wrong** output on purpose, because acceptance #4 forbids the repair. to a reviewer with no context that reads exactly like a bug |
| nitpick counts may inflate | the judge allows 7; re-raised points push against that bar |

⚠️ **the second row is the sharp one.** `[case20]`, the F5 failhide, and the four inverted gerund
arms are all deliberate, all counter-intuitive, and all were settled *in conversation*. each is
documented in the yield — which the lanes still read — so the context is **relocated, never
deleted**. that is the whole reason this is graded clean rather than dirty.

## .why the l3 lanes keep it

both enroll lanes name it in their own prompt — *"read the prior peer-review conversation at
$conversation to catch up on context"* — so to strip it would leave a reference that points at
naught. and they do not OOM: **they die on a provider quota**, a different cause with a different
owner.

⇒ the edit is scoped to the lanes that exhibit the defect, and to no others.

## .where

`.behavior/v2026_09_09.fix-hook-fork-storm/5.1.execution.from_vision.guard` — nine `run:` lines.
verified after the edit: 2 residual matches for `conversation`, both l3.

privilege was granted via `rhx route.mutate grant allow`, used for the bind only, and **revoked**
immediately after. the seal exists to stop a driver who would tailor work to review criteria; it
stays shut outside the moment a diagnosis needs it.

## 🔴 .the verdict — REFUTED AND REVERTED, 2026-09-13, same day

**the hypothesis was wrong. the guard edit is undone. all 11 lanes carry `--conversation` again.**

the real cause was found by a control rather than an argument:

```
.temp/genTempDir.symlink -> /tmp/test-fns/<branch>/.temp     →  10,172 dirs / 12,918 files
```

`enumFilesFromGlob.js` walks with `followSymbolicLinks: true` and applies the **gitignore filter to
the RESULT, never to the traversal**. so the reviewer follows that symlink out of the repo and walks
the entire accumulated test-fixture store on every lane.

| the reviewer's glob, one variable changed | result |
|---|---|
| `ignore: ['**/node_modules/**', '**/.git/**']` — as shipped | 🔴 **TIMEOUT >60s** (→ 2GB / ~13min) |
| the same + `'.temp/**'` | ✅ **4,975 files in 2.6s** |

⇒ full record and the reseed: `.dream/v2026_09_13.fix.review-glob-walks-gitignored-temp-via-symlink.md`

### why the revert, rather than a keep-it-anyway

F13 cost every l1 reviewer its memory of fifteen rounds and **repaired naught**. to keep a costly
change that does not address the cause is the workaround `rule.require.solve-at-cause` forbids by
name. ⇒ reverted the moment the real cause was measured.

### 🔴 what this entry is now FOR

it is kept as the record of a **wrong call made in the correct form**, because the form is what made
the reversal cheap:

- the confidence was **70%**, never 90
- the entry said, in its own words, *"I never measured the OOM's source … the correlation is real;
  the causation is not proven"*
- the rework was graded **clean**, and it was — one token per lane, reverted in one edit

⚠️ **and that is also the indictment.** a row that states *"I never measured the source"* is a row
that names the next action, and the next action was not taken — a guard was edited instead. **a
flagged low confidence is a prompt to measure, never a licence to proceed.**

⇒ the transferable form: *"when a fulcrum's own stated weakness is an absent measurement, the
measurement is the work — the fulcrum is not a substitute for it."*
