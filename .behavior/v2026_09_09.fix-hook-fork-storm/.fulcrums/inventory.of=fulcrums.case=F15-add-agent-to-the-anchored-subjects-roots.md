# F15 — add `.agent` to the anchored subjects roots

| field | value |
|---|---|
| **case** | F15 |
| **title** | add `.agent` to F14's anchored subjects roots, rather than reuse F14's set verbatim |
| **rework** | **clean** — one token per `--paths-with`, reverted in one edit |
| **status** | taken 2026-09-18 · ✅ **CONFIRMED by measurement** — 8 of 9 lanes malfunctioned before, 0 of 9 after |
| **confidence** | **88%** |

## .the fork, stated fairly

F14 proved this exact anchor at i017:

```
'{src,.behavior,.dream,.claude}/**/*.{ts,sh,md,snap}'   → ✅ 3,572 files in 596ms
```

and recorded **zero scope delta** — *"the 5 diff files the narrow misses are the 5 ` D` deletions,
which are not on disk, so the root-anchored glob missed them too."*

| option | what it does |
|---|---|
| **A** — reuse F14's four roots verbatim | inherits a measured, proven form. ⚠️ drops one `.md` file from every lane's scope |
| **B** — add `.agent`, so five roots | preserves zero scope delta today. departs from the exact string F14 measured |

## .taken, and why at the time

**B.** because F14's zero-delta claim **no longer holds** — the diff changed in the four days since
i017, and re-verification caught it:

```
$ git status --short -- .agent package.json pnpm-lock.yaml
MM package.json
MM pnpm-lock.yaml
?? .agent/repo=.this/role=any/briefs/rule.forbid.native-subagents.[rule].md
```

| file | matched by `*.{ts,sh,md,snap}`? | inside F14's four roots? |
|---|---|---|
| `package.json` | 🔴 no — `.json` | n/a |
| `pnpm-lock.yaml` | 🔴 no — `.yaml` | n/a |
| 🔴 `.agent/…/rule.forbid.native-subagents.[rule].md` | ✅ **yes** | 🔴 **no** |

⇒ option A would have **silently shrunk every lane's review scope by one file** — and
`rule.forbid.overzealous-blockers` names that class outright: *"a wrong ignore rule silently shrinks
review scope, which is the one defect class a reviewer cannot self-detect."*

⚠️ **`.agent/repo=.this/` is a real directory, not a symlink** (checked: `file` reports `directory`),
so that rule brief lives nowhere else. to drop `.agent` is to drop the file, never to reach it by
another root.

### the cost was measured, not assumed

```
$ tree .agent/ | tail -2
33 directories, 60 files
```

⇒ bounded and cheap. and `--join intersect` means `.agent` contributes to the **walk** only; the
graded set is still the intersection with the diff, which is that one file.

## .why the confidence is 88 and not higher

three residues, each real:

1. 🔴 **the anchored form is proven; the anchored-plus-`.agent` form is not.** F14 measured its exact
   string. mine differs by one root. the mechanism says it is fine — a bounded extra root — but
   **I did not measure the new string end-to-end**, and this route has punished exactly that leap
   three times.
2. ⚠️ **the brace-slot parser behavior is folklore I lean on rather than read.** the malfunction
   dream records that a brace in the **extension** slot is silently dropped while a brace in the
   **directory** slot works. every narrowed lane here has braces in **both**. F14's measurement says
   the combination works; I have no independent read of the parser.
3. **`tree` does not follow symlinks by default**, so `60 files` is a floor for a walk that runs with
   `followSymbolicLinks: true`. the malfunction dream's own isolation walk measured
   `.agent → 744 files 0.5s`, which is the number that actually governs — still cheap, and still
   not measured by me today.

## .what I deliberately did NOT change

| lane | why left alone |
|---|---|
| `mech-test-scope-purity` — `'{src,blackbox}/**/*.test.ts'` | **already anchored.** ⇒ it is now a natural **control**: if it behaves the same as the eight narrowed lanes, the anchor is not what changed |
| the **repeated** `--paths-with` on three lanes | the malfunction dream records that a repeated flag keeps only the **last**, so those lanes may effectively grade `*.snap` alone. 🔴 **to fix that would EXPAND what they grade** — a review-scope change made by the party under review, which is the defect `rule.forbid.commits-the-route-did-not-ask-for` names at a different scale. anchored both patterns identically and changed no semantics |
| `.temp` as a negative pattern | the CLI syntax for a negative `--paths-with` is unknown to me. the root anchor is the **proven** instrument; an unproven one is not an improvement |

⇒ **the narrow is the minimum act that addresses the measured cause**, and no more than that.

## .where

`.behavior/v2026_09_09.fix-hook-fork-storm/5.3.verification.guard` — eight `run:` lines, lanes at
`:234, 239, 244, 249, 254, 259, 264, 269`. lane `:274` untouched.

privilege was granted by the human via `rhx route.mutate grant allow`, used for the bind only, and
**revoked immediately after** (`grant block` ⇒ `flag removed`). the seal exists to stop a driver who
would tailor work to review criteria; it stays shut outside the moment a diagnosis needs it.

## ✅ .the verdict — CONFIRMED by measurement, 2026-09-18

the falsifier was stated as *"if a lane's log dir is populated on the next round, the anchor
worked; an empty dir again means the cause is elsewhere and this call was wrong."*

**round i002 ran. every one of the 9 l1 lanes returned a readable verdict. zero malfunctions.**

| | round i001 (root-anchored) | round i002 (anchored) |
|---|---|---|
| lanes that malfunctioned | **8 of 9** | **0 of 9** |
| log dirs | empty | populated, one per lane |
| verdicts | *"unreadable — no numeric count found"* | 7 approved · 2 rejected, each with a count |
| wall time | ~15 min to death | 43s – 226s per lane |

and the scope numbers the lanes now print are the direct measurement the diagnosis predicted —
`ergo-contract-snapshots`, verbatim from its `.given`:

```
└─ scope
   ├─ diffs: since-main
   ├─ paths: {src,.behavior,.dream,.claude,.agent}/**/*.{ts,sh,md,snap}
🔭 metrics.expected
   ├─ files  └─ targets: 118
   └─ tokens ├─ estimate: 525,339
             └─ context: 50.1%
```

**118 targets at 50.1% context**, against a walk that had been measured at 6,722 files off the
repo root. ⇒ the anchor is what parts a lane that reviews from a lane that dies.

### 🔴 the `.agent` addition — F15's own delta, and what it actually bought

F14's four roots would have produced a nearly identical run; what `.agent` added was the one `.md`
file outside them. the token roll-up the lane printed names it explicitly:

```
├─ rules: .agent (732, 100%)
└─ targets: .behavior (261.1k, 52.76%), src (167.2k, 33.79%), .dream (64.5k, 13.03%)
```

⚠️ **note what that shows, and what it does not.** `.agent` carries **100% of the RULES** —
every rubric this stone is graded against is read from that tree. under F14's verbatim four
roots the rules would still have loaded (they are supplied by `--rules`, never by
`--paths-with`), so the delta F15 bought sits on the **targets** side alone, and the targets
roll-up shows `.agent` at no measurable share.

⇒ **the honest read: F15's delta was ~zero in this round, exactly as the 88% confidence allowed
for.** the call was made because re-verification found a `.md` file outside F14's roots, and a
zero-delta claim measured four days earlier could not be trusted to still hold. that argument
stands independent of how small the delta turned out — a scope narrow is graded by whether it
can starve a rubric, and the measurement says it cannot.

### what this does NOT prove

- ⚠️ **it does not prove `.agent` was NECESSARY.** the control for that would be a round run on
  F14's four roots. it was never run, and it is not worth a round to run now.
- ⚠️ **it does not prove the anchor is permanent.** the guard is generated from the bhuild
  template, which still ships the root-anchored glob at identical line numbers ⇒ the next stone
  re-acquires the defect. that is the reseed dream
  `v2026_09_18.fix.guard-template-ships-the-root-anchored-subjects-glob.md`, and this verdict is
  the evidence that its upstream fix is worth the trip.

⇒ **status: taken, CONFIRMED by measurement, and its residue named rather than closed over.**
