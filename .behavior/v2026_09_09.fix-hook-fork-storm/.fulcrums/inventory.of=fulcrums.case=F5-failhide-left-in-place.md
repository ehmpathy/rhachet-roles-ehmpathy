# F5 — the malformed-config failhide is left in place

**rework** clean · **status** open · **confidence** 91%

## .the fork, stated fairly

`blocklist.sh:72` ends `|| echo "[]"`. a malformed `.jsonc` — one stray comma — parses to zero
terms, and the gate **silently permits every forbidden word**. that is `rule.forbid.failhide`, and
the repo grades it a blocker.

| option | why rejected / taken |
|---|---|
| **leave it; catch a dream** | ✅ **taken** — a repair is a policy change, which the wish's boundary forbids |
| repair it here (exit 2 on a parse failure) | rejected — it changes what the hook permits, and acceptance #2 says "a cost change, never a policy change" |
| repair it and note the deviation | rejected — the wish names a smuggled behavior change as "unreviewable" |

## .taken, and why at the time

the wish's `.the boundary` is explicit on three lines that all point one way:

> *"do not change what is blocked"* · *"do not weaken the checks"* · *"a behavior change smuggled
> into a cost change is unreviewable"*

a hook that starts to exit 2 on a corrupt list blocks writes it permits today. that is a change to
what is blocked, however much better it is.

⚠️ this cuts against `rule.always.fix-forward-under-scouts-honor`, whose two questions are SAFE
and CLEAN. the fix is clean — one line. it is **not safe**: it changes behavior beyond what this
change came for, on a path no test covers. so it fails question 1, and the deferral is correct.

## .rework, and why clean

it is one line, in one file, with no caller hardened against it. a wisher who rules the other way
gets it repaired inside this route at trivial cost.

## .confidence, and why it is 91%

near-certain on the boundary read — the wish states it three ways. the 9% is the possibility that
the wisher considers a failhide repair to be *in* the spirit of a hook-cost wish, since the wish
does invite shapes it did not imagine.

## .the dream that carries it

⇒ `dreams/v2026_09_09.fix.blocklist-failhide-on-malformed-config.md`

## .where

- `pretooluse.forbid-terms.blocklist.sh:72`
- demoed as `case=5` `[t3]`

## .the verdict — ✅ TAKEN, as proposed

**ruled by the wisher, 2026-09-10: acceptance #2's "no policy change" covers DEGRADED-mode
behavior, not merely the healthy path.**

⇒ the failhide is **preserved verbatim**. the repair is out of scope for this wish.

### what the verdict settles beyond this fulcrum

| | now |
|---|---|
| **A8** — does "policy" reach degraded mode? | ✅ **yes.** the inference this fulcrum rested on is ratified |
| **Q5** — the rule/wish collision | ✅ **dissolved.** the wish's boundary wins; `rule.require.experience-coverage` yields for this one cell |
| **peer r2's blocker** — a sharp critipath shown unhandled | ✅ **closed by the wisher**, the one party permitted to close it |
| the dream `v2026_09_09.fix.blocklist-failhide-on-malformed-config` | **stands** — the repair is deferred, never denied |

### 🔴 the property the verdict buys, and it is the reason to state it

**every byte either HOOK emits is unchanged — same verdict, same message, in any config state,
either direction.** that is a stronger claim than *"we broke no extant behavior"*: it is a claim
the equivalence clamp can test exhaustively, because the expected output in every degraded state is
**byte-identical to today's**.

⚠️ **the repair would have weakened it.** a loud failure on a malformed list is better craft *and* a
behavior delta, and a cost change that also fixes a bug cannot be verified by an equivalence test.

### ⚠️ .this said "a pure cost change: zero observable behavior delta" until F7 was taken

the wrapper-drop (**F7**) removes the `💪 init role` / `✋ blocked by constraints` frame that wraps
every block message ⇒ **an observable delta exists**, and this fulcrum's claim had to narrow to the
subject it actually governs: **the hooks' own output.** the frame is the wrapper's, and it is
declared as **Q13**.

🔴 **the narrower claim costs this fulcrum naught, and that is the point of the record.** F5's whole
argument is that a repair *here* would break the equivalence clamp — and the clamp compares hook
output, which F7 leaves byte-identical. ⇒ **a claim stated one scope too wide reads as refuted the
moment anything in the wider scope moves**, even where the narrower claim it needed was never in
doubt.
⇒ the wisher chose the more **verifiable** wish over the more **correct** hook, and `case=5` now
demonstrates a hole that is deliberate rather than unnoticed.
