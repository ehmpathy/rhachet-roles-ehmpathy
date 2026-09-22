# F2 — the sponsor binds per-tree; the host-global default is **withdrawn**

**rework:** clean · **status: ✅ RULED** (2026-09-09) · **confidence:** 55% → **90%**
*(was 72% with a host-global default — **the default was refuted at self-review r2**; see below.
the wisher then accepted the per-tree cost, which is what raises it to 90%.)*

## .the fork, stated fairly

where does the bound sponsor live?

| option | pro | con |
|---|---|---|
| **per-tree only** (`.branch/.bind/`) | matches `git.commit.bind`; a tree is the unit of dispatch | every tree needs a bind. on a host with 20 trees that is 20 acts |
| **host-global only** (`~/.rhachet/storage/…/.meter/`) | one bind per grove, at provision | one human sponsors every tree, even work another human asked for |
| **both, local wins** | the common case is one bind; a tree can override | two levels to reason about, and a precedence to explain |

## .taken at the time — and struck

**taken at the time: both, local wins.** the paved pattern already carries two levels
(`git.commit.uses` has global, org, and local), so a two-level sponsor adds no new concept, and the
host-global default is what makes a 20-tree grove one bind rather than twenty.

**taken now: per-tree only. the host-global default is withdrawn.**

## 🔴 .the refutation — a host-global default FABRICATES, by design

the con row above reads *"one human sponsors every tree, even work another human asked for"* and
files it as an **ergonomic** cost. it is not. it is the **defect class the wish exists to remove**,
re-created at a different address.

**measured:** `git.commit.uses.global.sh:31`

```sh
GLOBAL_METER_DIR="$HOME/.rhachet/storage/repo=$ROLE_REPO/role=$ROLE_SLUG/.meter"
```

⇒ the global scope is **`$HOME` — a unix account, not a person.** on a cloud grove the clone and
every human who ssh's in share that account, which is the whole reason a cloud grove is a shared
host. so one host-global sponsor covers **every tree on the host**, whoever dispatched it.

🔴 **and `case=4` already ruled on exactly this value:**

> *"to name a human who did not act is a **fabrication**, and it is worse than an absent record —
> it reads as authorized."*

⇒ **the design forbids a clone from producing that record and then produces it by default.** a
supervisor binds once at provision; three weeks later another supervisor's tree commits under the
first one's name, and the trail says they authorized work they never saw.

⚠️ **note the asymmetry with the original defect.** the extant bug records **zero** humans — visibly
wrong once you look. this would record the **wrong** human — indistinguishable from correct, and
therefore worse by the artifact's own standard.

## .what remains, and its cost

**per-tree only.** the cost the global default was to buy back is real: a 20-tree grove needs 20
binds. that is the price, and it is now paid deliberately rather than traded for a fabrication.

⇒ if the cost proves intolerable, the **safe** ways to buy it back are a bind at *dispatch* time
(the dispatcher carries the human who asked — which is `F5`), or a per-**human** default keyed to
an identity the host can verify, never a per-**account** one. both are the wisher's call.

## 🟡 the other hazard, now moot

`git.commit.uses` precedence is **most restrictive wins** — a global block overrides a local allow,
because it is a circuit breaker. a sponsor global would be **most specific wins** — a local bind
overrides a global default. ⇒ the same flag word, `--global`, with inverted precedence across two
neighbor skills (`rule.forbid.ambiguous-labels`).

⇒ **withdrawal of the global level dissolves this hazard entirely.** it was the reason the call sat
at 72%; the refutation above is a stronger reason to drop the level than the ambiguity ever was.

## .rework, and why

**clean.** the state is a file the skill writes and reads. to drop a level is to delete a read path.
no caller depends on it and no commit stores it. ⇒ the withdrawal above cost one paragraph, which is
the whole argument for a fulcrum raised early.

## .confidence, and why it FELL

**55%, down from 72%.** the number dropped even though the call got *safer*, and that is the honest
report:

- ✅ the **safety** question is now settled — a per-account global fabricates, so it is out
- 🔴 the **ergonomic** question it was answered with is now **re-opened and unanswered**: a 20-tree
  grove needs 20 binds, and no cheap remedy is on the table that does not route through `F5`

⇒ i traded a confident wrong answer for an honest open one. this row now depends on `F5` (may a
dispatcher bind?), because dispatch-time bind is the only safe way to buy the cost back.

## ⚠️ .the lesson this row carries

the con was **on the page from the first draft** — *"one human sponsors every tree, even work
another human asked for"* — and i filed it as an ergonomic annoyance for six rounds. what changed
was not new evidence; it was that i read it beside `case=4`'s own words about fabrication.

⇒ **a fulcrum's con column is where a refutation hides in plain sight.** grade each con against the
wish's failure criteria, never against convenience.

## .where

- `1.vision.yield.md` → the contract
- `case=1` `[t1]` output line `scope: this tree`
- at execution: a new state file beside `.meter/git.commit.uses.jsonc`

## ✅ .the verdict — RULED by the wisher, 2026-09-09

**upheld. per-tree only, and the cost is accepted.**

⇒ this row fell 72% → 55% at r2 not because the call got worse but because its **justification**
collapsed: the host-global default was refuted as a fabrication risk, and the ergonomic question it
had been answered with (a 20-tree grove needs 20 binds) re-opened with no cheap remedy.

⇒ ✅ **both halves are now closed, by two separate decisions:**

| the open half | closed by | outcome |
|---|---|---|
| is the per-tree cost tolerable? (`Q7`) | **`Q3` — the fleet is small** | ✅ yes. a handful of binds, once each |
| is there a cheaper route via dispatch? (`Q7 ⇒ F5`) | **`Q1` — no dispatch exists** | ✅ moot. there is no dispatch-time seam to buy it back at |

⇒ 55% → **90%**. the residual 10% is the day the fleet grows: the cost scales linearly with trees,
and it has no remedy that does not route through `F5`. ⚠️ **that is a re-open trigger worth a
name** — the same trigger as `F5`'s, and for the same reason.

## ⚠️ what stays refuted, regardless of the decision

**the host-global default is not revived by a small fleet.** `$HOME/.rhachet/storage/…` scopes to a
**unix account**, not a person (`git.commit.uses.global.sh:31`), so one bind on a shared host would
name a human who did not authorize the work — the fabrication `case=4` forbids a clone to write,
written by the design instead.

⇒ 🔴 **a small fleet makes the cost cheap; it does not make the mechanism safe.** the two questions
are independent, and only the first was decided.
