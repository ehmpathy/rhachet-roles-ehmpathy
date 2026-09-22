# F8 — the sponsor is a NEW skill, not a flag on `git.commit.uses`

**rework:** clean · **status: ✅ RULED** (2026-09-09) · **confidence:** 78% → **95%**
*(raised at self-review r2 — the requirement review caught the vision at odds with its own ergonomic
claim. the nudge, added at r3, took it 62% → 78%. the wisher then ruled the narrowed question.)*

## 🔴 .the contradiction that raised it

`case=1` states the ergonomic the whole design leans on:

> **the sponsor rides beside the quota, in the same act.** that placement is the whole ergonomic:
> authorization already happens here, so the human owes **one line and no more**.

the contract then delivers **two** commands:

```sh
rhx git.commit.uses set --quant 5 --push allow
rhx git.commit.sponsor set --who @me
```

⇒ *"one line and no more"* is **two lines**. the narrative claims an ergonomic the contract does not
supply, and six rounds of review missed it, because each artifact was read alone.

## .the fork, stated fairly

| option | pro | con |
|---|---|---|
| **a new skill** — `git.commit.sponsor set/get/del` | its own noun, its own lifecycle; `get`/`del` verbs read naturally; one file, one concern; mirrors `git.commit.bind` exactly | 🔴 two commands for one human act — the exact ceremony `case=1` disowns |
| **a flag** — `git.commit.uses set --quant 5 --push allow --sponsor me` | 🎯 **delivers the claimed one-line act**; the grant and the party who answers for it are one atomic authorization | overloads a **meter** skill with an **identity**; `--push`/`--quant` are policy, a sponsor is a person; no obvious `get`/`del` |
| **a flag + the skill** — a convenience write into the sponsor's own state | one line in the common case, full verbs when needed | two write paths to one state, and a precedence to explain |
| 🔴 **the skill + a NUDGE** — `uses set` emits a coconut when no sponsor is bound | 🎯 **one *moment*, two lines** — discoverability at the human's own act, with **zero** concept fold and **zero** new state; the grant still exits 0 | the human may ignore it, so `case=3`'s refusal is still the backstop |

## 🔴 .taken — the skill, plus the nudge

**added at self-review r3.** the first three options all trade the same pair: *vocabulary
cleanliness* against *the one-line onboard*. **the nudge refuses the trade.**

```sh
$ rhx git.commit.uses set --quant 5 --push allow
🐢 shell yeah, commit uses granted
   …
🥥 did you know?
   ├─ no sponsor is bound to this tree, so commits will refuse
   └─ printf 'Name <email>' | rhx git.commit.sponsor set --who @stdin
```

- the human is **provably present** at `uses set` (it is human-only already) and already mid-act of
  authorization — so the nudge lands at the one moment it can be acted on
- it is a **coconut, not an error**: the grant succeeds, exit **0**. a sponsor is not required to
  grant a quota, only to commit. a hard failure here would couple the two concepts the split exists
  to keep apart
- ⇒ `rule.require.discoverability`: *"a step a human cannot find is a step a human cannot take"*.
  the sponsor step is **new**, so its discoverability is the whole onboard problem

⚠️ **what the nudge does NOT do:** it does not make the bind one *line*. it makes it one
**moment** — and re-reading `case=1`, the moment was always the real claim. *"authorization already
happens here"* is about placement, not keystroke count.

⇒ so `F8`'s remaining question is narrower than it was: **is one moment enough, or must it be one
line?** that is a much cheaper call for the wisher to make.

the separation argument is real: a quota is **spent down** and a sponsor **persists**; a quota is
policy and a sponsor is a person; `del` on a sponsor is meaningful and `del` on a quota already
means something else. to fold a person into a meter is the ubiqlang error
(`rule.forbid.term.addition.ambiguous`) — `git.commit.uses` would then carry two concepts.

⇒ but the ergonomic claim is not thereby satisfied, and it must **either be delivered or withdrawn**.
`case=1`'s prose cannot keep asserting one line while the contract costs two.

## .what must change either way

- **if the skill stands alone:** `case=1` must drop the *"one line and no more"* claim and say
  plainly that the sponsor is a **second** act in the same breath. that is still a good ergonomic —
  it merely is not the one the prose claims.
- **if the flag is added:** the fold must be a **convenience write** into the sponsor's own state,
  never a second home for it, so the skill stays the one reader.

## .rework, and why

**clean.** a flag is additive; the state file and its reader do not move. and the *prose* fix costs
one sentence. no code exists yet.

## .confidence

**78%, up from 62%** — raised at r3 by the nudge.

the separation-of-concerns argument was always strong and the ubiqlang argument stronger. what had
held it below 70% was that the design cost two *acts* at the exact moment (`F4`'s hard cutover) the
paved path most needs to be frictionless.

⇒ **the nudge removes that cost without a trade**: one moment, discoverable, no concept fold, no new
state, exit 0. the residual 22% is the narrower question below.

⇒ still a **wisher / ergonomist** call — but a cheaper one than it was: **is one moment enough, or
must it be one line?**

## .where

- `case=1` — the *"one line and no more"* claim, and its `[t0]`/`[t1]` pair
- `case=7` `[t3]` — the same two-act shape inside the dense walk
- `1.vision.yield.md` → the contract, the day in the life

## ✅ .the verdict — RULED by the wisher, 2026-09-09

**upheld: the separate skill, plus the nudge. `Q6` — one MOMENT is enough.**

⇒ ✅ **the narrowed question is answered.** it read: *"is one moment enough, or must it be one
line?"* the answer is **one moment**, so:

| what it settles | outcome |
|---|---|
| ⛔ **no `--sponsor` flag on `git.commit.uses`** | the meter skill keeps one concept. `rule.forbid.term.addition.ambiguous` holds |
| ✅ **`git.commit.sponsor` is its own skill** — `set` / `get` / `del` | it mirrors `git.commit.bind` exactly, so a reader who knows one knows both |
| ✅ **the nudge is a DELIVERABLE, not a nicety** | it is the whole reason two lines are acceptable. ⇒ it carries into `2.1.criteria` as a required behavior, never a polish item |

## 🔴 .the prose repair this obliges, and it is already done

the fulcrum's own `.what must change either way` demanded it: *"`case=1` must drop the 'one line and
no more' claim and say plainly that the sponsor is a second act in the same breath."*

⇒ ✅ **`case=1` was corrected at self-review r2** and now reads *"one breath, two lines"*, with the
correction marked in the case rather than quietly repaired. the claim is now honest, and the verdict
above is what makes the honest version also the **final** version.

## ⚠️ .the one hazard this verdict does NOT license

🔴 **the nudge must stay a coconut — exit 0.** a future author who reads *"the nudge is required"*
could reasonably harden it into a failure on `uses set`. that would couple the two concepts this
whole fulcrum exists to keep apart, and it would break `case=1` `[t0]`'s explicit `exit 0`.

⇒ a sponsor is not required **to grant a quota**; it is required **to commit**. ⚠️ carried to
`2.1.criteria` as a bound on the requirement, so the requirement cannot be over-satisfied.

## .confidence, and why 95%

78% → **95%**. the residual 22% *was* the narrowed question, and the wisher answered it. the new 5%
is the hazard named directly above: a required nudge is one edit away from a required *error*, and
no guard in the design prevents that edit. ⚠️ **this row is the record that prevents it.**
