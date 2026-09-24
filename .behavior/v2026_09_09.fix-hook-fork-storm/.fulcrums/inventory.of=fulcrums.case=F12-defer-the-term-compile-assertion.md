# F12 — defer the term-compile assertion, though the hole is pinned in a test

**rework** clean · **status** ✅ **RESOLVED — TAKEN at i006** · **confidence** 86% → **100% (measured)**

> 🔴 **the deferral was wrong, and the entry below says why in its own words.** peer i006-r006
> escalated it from nitpick to blocker and named the fix exactly. the 14% was the live outcome —
> so i ran it. **all nine terms pass.** no policy edit is owed, no wisher call is taken out of
> anyone's hands, and the deferral bought naught.
>
> ⇒ the clamp is `[case27]`, the hole is closed, and the dream is **TAKEN**.

## ✅ .the resolution

| | |
|---|---|
| what landed | `[case27]` — every term in the **live** `terms.blocklist.jsonc`, read through the joined alternation, must still match itself |
| cost to the hook | **zero forks.** it runs in ci; the hook never executes it — exactly as `.taken, and why at the time` predicted below |
| the live list | ✅ **all 9 terms pass**, first run. the conditional this row's 86% hung on resolved in the free direction |
| proven to bite | `[t1]` runs the identical predicate over `[ deploy, ")foo(" ]` and reports `deploy` **lost** |

🔴 **and the clamp disclosed a part the fulcrum did not know.** `[t1]` was first written to assert
BOTH terms lost, and failed on `)foo(`: the corrupted pattern demands the literal `foo`, and
`)foo(` **contains** `foo` — so the corrupt term matches by coincidence, through a pattern that
means otherwise entirely. ⇒ **a corrupt term can read as guarded while every neighbour it corrupts
is not.** the loss is never where you look for it, which is why the predicate grades *every* term.

## ⚠️ .the lesson this row is worth a keep for

the entry below is **correct on the arithmetic and wrong on the call**, and the two failures are
separable:

| | |
|---|---|
| ✅ the fulcrum said | *"zero runtime cost; the hook never runs it"* — right |
| 🔴 my i005 `.taken` to r006 said | *"a per-term compile check = N execs on the clean path ⇒ breaches acceptance #1"* — **wrong, and it contradicts this file.** i conflated an in-hook check with a repo test when i answered the reviewer, days after i had stated the distinction correctly here |
| 🔴 the deferral's real reason | a **prediction** — *"a term that failed it would oblige a policy edit"* — about an outcome one command could settle |

⇒ **i deferred on a guess where a measurement was one minute away**, then defended the deferral with
arithmetic my own fulcrum refutes. the reviewer needed two rounds to move me, and its escalation
from nitpick to blocker was the correct instrument.

---

<details>
<summary>the entry as it stood while the fulcrum was open</summary>

**rework** clean · **status** open · **confidence** 86%

> a clamp written to prove the Q11 repair bites disclosed a **second half of the same class** that
> the repair cannot reach. the hole is now pinned as `[case23] [t0]`. the fix is deferred, and this
> records the call.

## .the fork, stated fairly

| take | leave |
|---|---|
| add a repo test that asserts **every** term in `terms.blocklist.jsonc` compiles standalone, so a term that corrupts the alternation fails in ci | pin the hole as a test, catch a dream, ship the Q11 repair alone |

## .taken, and why at the time

**taken: leave.**

the hole is real and demonstrated:

```
[case23] [t0] — blocklist = [ deploy, ")foo(" ] · content = "we deploy at dawn."
  → exit 0, stderr ''          ← `deploy` is present and is NOT blocked
```

`)foo(` re-parses the alternation `\b(deploy|)foo()\b` into *"(deploy or empty) then foo"*, so the
gate asks a different question and every legitimate term goes unguarded. it **compiles**, so the
Q11 exit-2 guard is silent by construction.

⇒ and the fix is cheap on paper — a jest assertion that each term survives
`grep -qE "\b${TERM}\b" <<< ''`. **zero runtime cost; the hook never runs it.**

so the call is not about the fix's price. it is about **what its failure would oblige**.

## .rework, and why clean

no hook behavior changes either way. the deferral costs one dream, one symlink, and this row; the
take would cost one test file. either direction reverses in a single commit, and no caller hardens
against either.

## .confidence, and why it is 86%

the *mechanism* is proven — the test is on disk and red-provable. what is best-guessed is the
**scope read**, and it turns on a conditional:

> all nine extant terms are plain words (`deploy`, `leverage`, `utilize`, …), so the assertion
> would almost certainly pass on its first run.

⇒ if it passes, the take was free and the deferral bought naught. ⚠️ **and "almost certainly"
carries the whole weight.** a test whose failure mode is *"now edit the frozen artifact"* takes a
scope decision out of the wisher's hands at a moment nobody watches for it — acceptance #2 freezes
`terms.blocklist.jsonc` in **both** directions, and the only repair for a term that fails is to
escape it, which changes what it matches.

🔴 **the 14% is the chance the wisher grades this obviously-take.** the argument against is a
conditional risk; the argument for is a demonstrated hole. reasonable people rule either way.

## .the guard the deferral leans on, and its limit

the hole is not merely dreamed — it is **pinned**:

| | what it holds |
|---|---|
| `[case23] [t0]` | the hole itself, asserted as current behavior: exit 0, empty stderr |
| `[case23] [t1]` | the Q11 repair at work on the half it owns: exit 2, `SKIPPED` diagnostic |

⚠️ **a pin is not a guard.** `[t0]` asserts the defect *is* the behavior, so it stays green while
the defect stays. it protects a future reader from the belief that the class is closed; it protects
no caller from the hole.

⇒ that asymmetry is the honest cost of this deferral, and it is why the dream carries the fix shape
rather than merely the complaint.

## .where

- `src/domain.roles/mechanic/inits/claude.hooks/pretooluse.forbid-terms.blocklist.sh` — the
  alternation build and the Q11 exit-code guard
- `src/domain.roles/mechanic/inits/claude.hooks/pretooluse.forbid-terms.blocklist.integration.test.ts`
  — `[case23]`, both halves
- `src/domain.roles/mechanic/inits/claude.hooks/terms.blocklist.jsonc` — the frozen artifact a
  failed assertion would oblige us to edit
- 🌙 `.dream/v2026_09_12.fix.one-bad-term-silently-rewrites-the-whole-alternation.md`

## .the verdict

**open.** the council rules.

⇒ if **taken**: add the standalone-compile assertion; if any extant term fails it, that failure is
itself a question for the wisher, never a licence to edit the list.
⇒ if **left**: the dream carries it, and `[case23] [t0]` keeps the hole visible to the next reader.

</details>

## ✅ .the verdict, settled

**TAKEN**, at i006, by a driver act rather than a council ruling — because the condition the row
reserved for the council **did not arise**. the entry's own branch decided it:

> *"if any extant term fails it, that failure is itself a question for the wisher."*

**none failed.** ⇒ no question reached the wisher, so no call was taken out of their hands, which was
this row's single reason to exist. the fulcrum closes itself on its own terms.

⚠️ **`[case23] [t0]` stays exactly as it is** — it pins the end-to-end hook behavior under a corrupt
list, which is still what the hook does. `[case27]` guards the **live list** from ever reaching that
state. ⇒ the two are complements: one pins the failure mode, the other prevents its trigger.
