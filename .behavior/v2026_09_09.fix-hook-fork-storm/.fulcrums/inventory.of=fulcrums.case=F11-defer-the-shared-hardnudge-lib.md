# F11 — defer the shared HARDNUDGE library, though the duplication is proven

- **rework** = clean
- **status** = 🔴 **SPLIT** — the test-harness half **TAKEN at i010**; the sourced-bash-lib half stays deferred
- **confidence** = 84% → **96% on the split** (both halves are now measured, never modeled)
- **called** = 2026-09-12, at peer round 2, when r11 (l3) itemized ~90 duplicated lines

## 🔴 .the split — recorded 2026-09-13, and it was OWED one round earlier

this row read `open` after its weaker half had already shipped. ⚠️ **a fulcrum whose verdict is not
recorded is a decision nobody can overrule**, which is the whole reason the inventory exists.

| the half | verdict | why |
|---|---|---|
| 🔴 **the TS test harness** — `genTempCwd`, `runHook`, `asWriteJson`, `asEditJson`, byte-for-byte in both suites | ✅ **TAKEN at i010** | SAFE (test-only) + CLEAN (the files this wish already opens). four leaves landed; `nudgeFileName` is **required**, never defaulted |
| the **sourced bash library** — ~90 lines of HARDNUDGE setup | ⏳ **still deferred** | every reason below still holds: the runtime path hazard, the absent guard, the ripple |

⇒ **this entry PREDICTED the split in its own confidence note** — *"the test-harness half of r11's
ask **is** clean, and to defer it too is the weaker half of this call… the piece to do first"* — and
r11 then re-raised exactly that half at i010, as *"ready to ship, not just dream-worthy."*

🔴 **so the deferral was 50% wrong, and the entry named which 50%.** a fulcrum that names its own weak
half does its job; **what failed was the sweep back to the row once that half was closed.**

⚠️ and the required `nudgeFileName` is the part worth a carry-forward: `case=2` demands two separate
nudge clocks, so a **defaulted** filename would let a caller weld them together in silence. ⇒ **the
constraint that bounded the rejected merge binds this extraction too.**

### 🔴 .the contract widened at i012, and the guarantee did NOT — 2026-09-13

peer r011 found a **third** copy of the leaf's core, in `forkbudget.integration.test.ts`. it existed
for one reason: `nudgeFileName: string` had no way to spell *"seed none"*, so the one caller that
needed an unseeded sandbox could not compose the leaf extracted **to remove exactly this
duplication**.

> **an extraction whose contract cannot express a real caller's case does not remove the
> duplication; it relocates it** — and the relocation reads as deliberate, which is worse.

the type is now `string | null`. ⚠️ **that looks like a retreat from the note above, and it is not:**

| | |
|---|---|
| an optional `?:` | a caller may **omit** the key ⇒ reads as *"i forgot"*, compiles, welds the clocks |
| ✅ `string \| null` | a caller must **say `null`** at its own site — explicit, greppable, *"i meant none"* |

⇒ **the guarantee was always that the choice be DELIBERATE, never that a filename always be
supplied.** `rule.forbid.undefined-inputs` draws the identical line: `null` is how an internal
contract spells an absent value; `undefined` is not.

🔴 **the transferable part: i010 measured the extraction's success by its own stated goal** — *"the
two hook suites now compose the leaf"* — which was true, and was the wrong denominator. **the check
is every caller of the SHAPE, never every caller you set out to fix.**

## .the fork, stated fairly

peer r11 asked for a sourced bash library shared by the two forbid-terms hooks. **its case is
stronger than a usual abstraction ask**, on three counts:

1. **`source` is a builtin** — zero forks, zero execs. it is free under acceptance #1 and #6, which
   is the one objection this whole wish would normally raise
2. 🔴 **the drift is MEASURED, never predicted** — two fixes this very drive authored (r002's
   fix-hint, r006's `--args`) each had to be hand-ported to both files. a third is already queued
   (the swallow fix, at 3 sites)
3. **it preserves every seam F1 was rejected to protect** — each hook still passes its own
   `NUDGE_FILE`, reads its own config, builds its own message

| | extract now | defer |
|---|---|---|
| the duplication | ✅ gone, ~90 lines | ⚠️ stays, and the next fix pays it again |
| fork cost | ✅ zero — `source` is a builtin | zero |
| `rule.prefer.wet-over-dry` | satisfied — the reuse is **proven**, not speculative | — |
| 🔴 failure mode | **both** hooks retire on one bad path | each hook fails alone |
| what else moves | a build include, a ported path, a widened reach assertion, coverage for the lib | ✅ no other file |

## .taken, and why at the time

**defer, with a dream and this row.**

1. 🔴 **the extraction AUTHORS the wish's own worst hazard.** a sourced file must be found at
   runtime. `getMechanicRole.ts` already carries the note: *"a path that does not exist fails with a
   non-2 exit, and claude code reads non-2 as not blocked — so a typo RETIRES a gate rather than
   breaks it."* today that costs one hook; with a shared lib it costs **both, at once**, in every
   consumer repo.
2. **no extant test would catch it.** `getMechanicRole.hooks-reachable` reads the commands in
   `settings.json`, and a library is named in no command. ⇒ the guard must be widened **in the same
   diff**, which is new test machinery in a wish about a fork count.
3. **CLEAN fails on the ripple, not on the size.** a new file, a `build:complete:dist` include, a new
   ported path, a widened reach assertion, and coverage of its own — none of which this change
   intended to open (`rule.always.fix-forward-under-scouts-honor`).

## .rework, and why

**clean.** the two hooks are untouched, so a later extraction starts from exactly the state this
route leaves. no caller hardens against the deferral and no work here builds on it.

## .confidence, and why it is not higher

**84%.** three things hold it below 93:

- 🔴 **r11's evidence is empirical and mine is a projection.** it counted two real hand-ports; i
  counted a failure mode that has not happened. **a measured cost outranks a modeled one**, and a
  reviewer could reasonably weigh the two the other way
- **the hazard is closeable in one step** — widen the reach assertion to follow `source` lines. if
  that step is cheaper than i graded it, the CLEAN verdict flips and the extraction should ride now
- ⚠️ **F8 is the cautionary twin, one round back.** it also deferred a test-shaped fix on a CLEAN
  grade, and its grade rested on a premise one `ls` refuted. **i checked this one's premise** — the
  reach assertion genuinely reads `settings.json` commands alone, verified by read — but the shape
  of the error is the same shape, and that earns a flag rather than a nod

what holds it at 84 rather than lower: the test-harness half of r11's ask **is** clean, and to defer
it too is the weaker half of this call. it rides in the dream, marked as the piece to do first.

## .where

- the hooks: `src/domain.roles/mechanic/inits/claude.hooks/pretooluse.forbid-terms.{blocklist,gerunds}.sh`
- the guard that must widen: `src/domain.roles/mechanic/getMechanicRole.hooks-reachable.integration.test.ts`
- the dream: `.dream/v2026_09_12.fix.hardnudge-plumbing-duplicated-across-both-hooks.md`
- the review: `…r011._.given.by_peer.enroll-impl-arch-defects.md` §1, §3
