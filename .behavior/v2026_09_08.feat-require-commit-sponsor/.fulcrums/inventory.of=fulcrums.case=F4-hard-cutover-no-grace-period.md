# F4 — hard cutover, no grace period for extant trees

**rework:** clean · **status: ✅ RULED** (2026-09-09) · **confidence:** 85% → **95%**

## .the fork, stated fairly

on the day this lands, **every extant tree with no sponsor bound loses its commit** until a human
runs one command. that includes local trees where the old behavior was correct by luck
(inventory cell 43).

| option | what it does |
|---|---|
| **hard cutover** | refuse from the first release. one human command per tree unblocks it |
| **grace period** | fall back to `git config` for N days / releases, with a loud warn |
| **local-only fallback** | fall back to `git config` only when the value is a human |

## .taken, and why at the time

**hard cutover.**

🔴 **the third option is the trap, and it reads the most reasonable.** *"fall back only when the
value is a human"* passes on every local grove and refuses on every cloud grove — which sounds like
a targeted fix. it is not: it is the implicit fallback the wish forbids, with the guard bolted on.
a cloud grove whose `git config` was ever set to a human's name (a stale provision, a copied
dotfile) silently self-serves a value that reads truthful and that nobody authorized.

**the second option is the first one with a timer.** a grace period does not make the guess
truthful; it makes the defect harder to notice, and it moves the cutover to a date when no one is
watchful.

⇒ the wish is explicit — *"⛔ no silent fallback to `git config`. that fallback **is** the defect."*
both alternatives are that fallback.

## .what carries the cost instead

`case=3`'s refusal: fires on the first commit, states the cause, names the one-line fix, and
addresses the human. the migration path **is** the error message.

## .rework, and why

**clean.** to add a grace period later is additive — a dated read path in one skill. to remove one
already shipped is harder. the safe order is to ship strict and loosen if the pain is real.

## .confidence, and why not higher

**85%.** the argument against both fallbacks is strong and the wish backs it. the 15% is fleet
scale: **the size of the in-flight fleet is unmeasured.** if it is large, a single-day cutover is a
support event, and a staged rollout (per-org, per-repo) may be worth its complexity. that is a
wisher call, not a design one.

## .where

- `case=3` → `.the migration cost is real`
- inventory cell 43
- `1.vision.yield.md` → what is awkward

## ✅ .the verdict — RULED by the wisher, 2026-09-09

**upheld. hard cutover, no grace period.**

⇒ 🔴 **the open half is closed: the fleet is small.** `Q3` asked how many trees are in flight,
because a simultaneous refusal across a large fleet is a support event rather than a migration. the
answer is *"small — hard cutover is fine"*, so the cost is **one human bind per tree, once**, and it
is accepted.

| what the decision closed | outcome |
|---|---|
| a staged rollout | **not owed** |
| a broadcast before the cutover | **not owed** |
| a grace period or a soft-fail window | 🔴 **still refused** — it is the defect on a timer |

⚠️ **the grace period was never the fleet's question**, and the two must not be conflated. a large
fleet would have justified a **staged** rollout; it would never have justified a **silent
fallback**, because the wish forbids one outright. ⇒ the fleet answer removed the rollout question
and left the design's refusal untouched.

⇒ 85% → **95%**. the residual 5% is the cell-43 experience — a local tree where the old read was
correct by luck now refuses. that is the intended price, and `case=3` is what makes it survivable.
