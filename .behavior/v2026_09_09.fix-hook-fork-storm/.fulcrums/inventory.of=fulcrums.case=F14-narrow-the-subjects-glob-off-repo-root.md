# F14 — narrow the l1 subjects glob off the repo root

| | |
|---|---|
| **case** | F14 |
| **title** | swap `--paths-with '**/*.{ts,sh,md,snap}'` for `'{src,.behavior,.dream,.claude}/**/…'` on all 9 l1 lanes |
| **rework** | **clean** — one token per lane, revertible in one edit |
| **status** | taken by the driver, 2026-09-13; open to council overrule |
| **confidence** | **96% (measured)** |

---

## .the fork, stated fairly

every l1 lane died at the 2GB node cap across i014 and i015. the cause is measured and recorded:
`.temp/genTempDir.symlink` → **10,172 dirs / 12,918 files** outside the repo, walked because
`enumFilesFromGlob` applies its gitignore filter to the **result** rather than the **traversal**,
with `followSymbolicLinks: true`.

| the option | what it costs |
|---|---|
| **A — do naught, re-arrive** | every lane stays dark. it does not converge |
| **B — empty the fixture store** | 10k+ dirs **outside the repo**. a human's call, never a driver's |
| **C — patch `node_modules`** | erased by the next install; masks the defect for one machine. forbidden |
| **D — narrow `--paths-with`** ✅ taken | the subjects walk never enters `.temp` |
| **E — `--as blocked`** | 🔴 forbidden — D is an unspent driver-owned lever |

## .why D works, when F13 said it could not

F13 ruled a `--paths-with` narrow out on the grounds that *"the process dies upstream of line 314,
so a narrow filters after the step that kills it."* **that conflated two different flags:**

| flag | where it lands |
|---|---|
| `--paths-with` | `stepReview.js:266-269` → `positivePathGlobs` → `:280` `enumFilesForReviewSubjects` — 🔴 **the walk's own INPUT, and the step that kills it** |
| `--paths-wout` | `:310`, a `.filter()` over the joined result — **the post-filter F13 described** |

⇒ a narrower positive glob changes **what globby traverses**, so it reaches the cause directly.

## ✅ .the control that settles it

same tree, same options, one variable:

| glob | result |
|---|---|
| `'**/*.{ts,sh,md,snap}'` — as the guard used | 🔴 **TIMEOUT at 30s** |
| `'{src,.behavior,.dream,.claude}/**/*.{ts,sh,md,snap}'` | ✅ **3,572 files in 596ms** |

⇒ **≥50× faster**, and provably not a timeout.

## 🔴 .why the scope delta is ZERO, and how that was checked

the narrow is only safe if it is a **superset of the diff**. `--join intersect` drops anything the
glob misses, so an under-scope would silently shrink what every reviewer reads — the one defect
class a reviewer cannot self-detect.

measured against the live `git status --porcelain`:

| | |
|---|---|
| diff files with a `ts\|sh\|md\|snap` extension | **94** |
| covered by the narrowed glob | **89** |
| uncovered | **5** |

⚠️ **and all five are the ` D` deletions** — the five `pretooluse.*.test.sh` files this drive removed.
they are not on disk, so **no** glob matches them, root-anchored or narrowed. ⇒ the root-anchored
glob missed them too, and the delta between before and after is **exactly zero**.

the four roots cover every path the diff touches. every other changed file is `.json` or `.yaml`
(`.claude/settings.json`, `package.json`, `pnpm-lock.yaml`), which the extension list already
excluded before this change.

## ✅ .what is MEASURED — all three claims, end to end

| claim | status |
|---|---|
| the root-anchored glob times out; the narrowed one returns in 596ms | ✅ **measured**, with a control |
| the narrow loses zero files from review scope | ✅ **measured**, 94 diff files counted |
| 🔴 **the narrow makes an l1 lane complete** | ✅ **MEASURED at i017** — see below |

### the i017 evidence, read from the lane's own artifacts

| | before (i014→i016) | after (i017) |
|---|---|---|
| `.log/bhrain/review/<ts>/` contents | 🔴 **0 files** — dead upstream of `stepReview.js:314` | ✅ **10 files**, incl. `input.scope.debug.json`, `input.prompt.md`, `output.review.md` |
| per-lane wall time | ~13–19 min, then `FATAL ERROR: … heap out of memory` | ✅ **~2 min**, complete |
| `targetFiles` resolved | never reached | ✅ **93 files** — every `ts\|sh\|md\|snap` file in the diff |
| `contextWindowPercent` | never reached | ✅ **66.9%**, under the 75% failfast bar |

⇒ **the scope is complete, not merely cheap.** all 5 `src/…/claude.hooks/*.sh` and `*.ts` subjects,
all 15 fulcrum entries, all 17 dreams, both yields, and every vision case are in `targetFiles`.

## 🔴 .the misread this row cost, kept because it is the transferable half

**the i016 lanes that OOM'd did NOT test this edit**, and for an hour I read them as evidence it had
failed. their `.given` files are stamped **14:38→16:30**, hours before the guard was touched — a
background arrival still in flight at ~15 min per lane. the re-arrival that would exercise the narrow
was refused at the **entrance gate**, because eleven reviewers were owed a `.taken`.

⇒ an artifact's *content* said **"OOM"**; its *timestamp* said **"before your change."**

⚠️ **the timestamp is the half a driver forgets to read, and it inverts the conclusion.** the wrong
read sent me back into the library to hunt a second cause that was not there — which is the same
failure mode as F13, one level up: **a real observation, attributed to the wrong event.**

## .the residual risk, stated

- **a future stone's diff could touch a root outside the four.** the failure would be silent, which
  is why `.claude` is included though no file in this diff needs it — cheap margin at 7 files
- ⚠️ **this narrow is scoped to the `5.1.execution.from_vision` guard.** the `5.3.verification`
  guard is untouched and will hit the same wall. deliberate: the fix belongs at the cause, and the
  cause is a published `rhachet-roles-bhrain` artifact ⇒ `.dream/v2026_09_13.fix.review-glob-walks-gitignored-temp-via-symlink.md`

## .where

`.behavior/v2026_09_09.fix-hook-fork-storm/5.1.execution.from_vision.guard` — nine `run:` lines.
verified after the edit: **9** narrowed, **0** root-anchored left.

privilege was granted via `rhx route.mutate grant allow`, used for the bind only, and **revoked**
immediately after.

## ✅ .why this one is 96% where F13 was 70%

| F13 | F14 |
|---|---|
| the cause was a **correlation** — *"the corpus that grew"* | the cause is **measured**, with a control that isolates one variable |
| the remedy's effect was **predicted** | the remedy's effect is **measured**: TIMEOUT → 596ms |
| the scope cost was **argued** — *"the context is relocated, never deleted"* | the scope cost is **counted**: 94 diff files, 5 uncovered, all 5 provably deletions |

⇒ the 4% left is the residual above — a future diff root, which is a prediction and is graded as one.

⚠️ **and the transferable part is F13's own closing line, applied**: *"when a fulcrum's stated
weakness is an absent measurement, the measurement is the work."* F14 was written after the
measurement, never before it.
