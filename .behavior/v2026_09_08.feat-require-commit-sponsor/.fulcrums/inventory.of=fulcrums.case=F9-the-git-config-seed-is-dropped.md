# F9 — the `--from git-config` seed is DROPPED, though the wish permits it

**rework:** clean · **status: ✅ RULED** (2026-09-09) · **confidence:** **92%**
*(raised and ruled at the second council. it never sat open — it exists because the design declined
a licence the wish granted, and a decision of that shape must be on the record even when the wisher
made it.)*

> 🔴 **SURFACE NOTE — read `F10` beside this row.** the "two routes" this drop left behind were
> carried on two flags (`--from me`, `--who`); the third council folded them into one `--who` with
> three value forms. ⇒ **the drop's verdict is untouched** — `git config` is read by no path — but
> the tallies below (`3 routes → 2`) count **supply routes**, never flags.
>
> ⚠️ **and `F10` names this row as its own cause**: the drop left `--from` with exactly one legal
> value, which is a boolean in a flag's costume. that was visible in this edit and was not seen.
> ⇒ **a removal changes the shape of what is left, and the remainder deserves a re-read.**

## 🔴 .why this needs a row at all

the wish names the seed explicitly, and permits it:

> ⛔ **no silent fallback to `git config`** — that fallback **is** the defect
> an explicit, one-time seed from `git config` on a **LOCAL** grove is fine

⇒ **the design now ships without it.** a reader who compares the wish to the contract will find a
blessed affordance absent, and will reasonably ask whether it was dropped on purpose or forgotten.

⚠️ **this row is the answer to that question.** every other fulcrum records a call the drive made
and the wisher confirmed; this one records a call the **wisher made against the wish's own text**,
which is exactly the kind that looks like an oversight a year later.

## .the fork, stated fairly

| option | pro | con |
|---|---|---|
| **keep the seed** — `--from git-config` on a local grove | the wish blesses it; it is the shortest local bind; it reuses a value the human already maintains | 🔴 a **third** route to one act, and the one route whose source is the defect's own address |
| 🔴 **drop it** — `--from me` locally, `--who @stdin` anywhere | two routes, each with a distinct sense; no flag reads the defect's source; the local and cloud paths differ on exactly one axis | the local bind is one flag wordier than it could be |
| **keep it, cloud-refused** | preserves the local ergonomic and blocks the cloud hazard | needs a grove-detect the skill deliberately does not have (`case=6`) |

## ✅ .taken — DROP it. the wisher's words:

> *"drop it — `--who @stdin` covers it."*

## 🔴 .the three reasons the drop is right, in order of weight

### 1. `Q2′` had already made `--from me` the local-only flag

the same council ruled that a cloud grove carries no human `gh auth login` session, so `--from me`
is **local by construction** (`F6`). ⇒ the seed's entire purpose — *a cheap local bind* — was
already served, by a flag that exists on the same grove and reads a source tied to a human **act**.

| local bind route | source | tied to a human act? |
|---|---|---|
| `--from me` | `gh api user` (as-human) | ✅ yes — the human ran `gh auth login` |
| `--from git-config` | a file on disk | 🔴 **no** — a provisioner writes it as easily as a human |

⇒ **two flags, one purpose, and one of them has a weaker warrant.** that is the case for the drop
even before the hazard below.

### 2. it removes the only flag whose source IS the defect's address

the defective commit `a1635ea` records a robot because `git.commit.set.sh:586` reads
`git config user.name`. a flag named `--from git-config` keeps that exact read path alive in the
codebase, one guard away from the defect.

⚠️ **the guard was real** (`case=5`'s robot check) and the seed was **not** a fallback — it was a
flag, run once, snapshot rather than tracked. ⇒ **the seed was safe as designed.** what the drop
buys is not the closure of an open hole; it is that the hole cannot be **re-opened by a later
edit** that softens the guard or adds a default.

⇒ 🔴 that is a `rule.prefer.prevent-over-correct` move — rung 1 of the ladder, *make it impossible*,
rather than rung 3, *catch it early*. the guard caught it early and the drop makes it unreachable.

### 3. three routes to one act is a `hick's law` cost with no payoff

`--from me` · `--from git-config` · `--who` — a human at the bind must pick among three, and two of
them differ only in **where the same person's name is read from**. ⇒ the choice is real work and it
is not a domain choice, which is the definition of ceremony (`rule.prefer.defaults-match-common-case`).

⇒ at two routes the choice becomes a **domain** one, and it maps cleanly:

| the binder is | the flag |
|---|---|
| a human who sponsors **their own** work | `--from me` |
| a supervisor who binds the **requester** | `--who` / `--who @stdin` |

## ⚠️ .the cost, stated plainly

**the local bind is wordier than the wish allowed it to be.** a human on a laptop types
`--from me` where the wish would have let them type `--from git-config` — the same number of
keystrokes, so the true cost is **zero at the keyboard** and non-zero only in the sense that a
blessed option is gone.

⇒ and the escape hatch survives: a local human who wants the git-config value can read it and pipe
it, since `--who` accepts `@stdin`:

```sh
$ printf '%s <%s>' "$(git config user.name)" "$(git config user.email)" \
  | rhx git.commit.sponsor set --who @stdin
```

⇒ 🎯 **that one-liner is why the drop costs nothing it did not also return.** the value remains
reachable; what is gone is a *flag* that made the code read it, and the difference between those
two is precisely the explicitness the wish asked for.

## .rework, and why

**clean.** the seed is one flag branch inside a skill that does not exist yet. to restore it is to
add a `case` arm and a `source:` label. ⇒ no caller depends on it and no state stores its
provenance.

## .confidence, and why 92%

the design argument is strong and the wisher made the call directly, so the **decision** is not in
doubt. the residual 8% is a **scope** risk rather than a design one:

⚠️ **a local human with no `gh auth login` session cannot use `@me`.** the wish assumed `git config`
was always available locally, and github auth is not. ⇒ such a human falls to a **supplied** form,
which works, and which they must be able to find.

⇒ that is a `rule.require.discoverability` demand carried to `2.1.criteria`: **the `@me` refusal
must print the supplied forms**, so the human who lacks a github session is not left to derive them.

✅ **`F10` discharged half of this residual.** under one flag the three forms are one enumerable
set, so `--help` lists them together and cannot present `@me` as the whole story. ⇒ the demand
narrows from *"make the alternative exist in the docs"* to *"print it in the refusal"*, and
`case=1` `[t3]`, `case=5` `[t0]`, and `case=7` `[t2]` now all do.

## .where

- `case=6` — rewritten for the `@me` form; the struck row is recorded in its own table
- `case=5` `[t1]` — the seed trap, now a supplied-value trap
- `1.vision.experience.dimensions.md` → `.what the walk surfaced` #3 — the grove axis
- `1.vision.yield.md` → the contract, and the wish-bounds table
- `F6` — `Q2′`, which made this drop cheap
- `F10` — the fold this drop made visible

## ✅ .the verdict — RULED by the wisher, 2026-09-09

**dropped. two supply routes: read your own session (`--who @me`), or hand the value in
(`--who @stdin` / `--who "…"`).**

⇒ the wish's `⛔ no silent fallback to git config` bound is not merely honored — it is now
**unreachable**, since no code path reads `git config` for an identity at all.
