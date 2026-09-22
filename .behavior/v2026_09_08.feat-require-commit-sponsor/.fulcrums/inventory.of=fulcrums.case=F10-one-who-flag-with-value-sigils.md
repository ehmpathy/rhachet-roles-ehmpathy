# F10 — ONE `--who` flag with `@`-sigil value forms, not two flags

**rework:** clean · **status: ✅ RULED** (2026-09-09) · **confidence:** **94%**
*(raised BY THE WISHER at the third council, in one question: "why wouldn't these be the same flag?
`--who @me` vs `--who @stdin`". the drive had carried two flags for eight rounds and never asked.)*

## .the fork, stated fairly

| option | pro | con |
|---|---|---|
| **two flags** — `--from me` and `--who <value>` | the grove constraint attaches to a **flag name**, so `"--from me is local-only"` documents itself | 🔴 two flags for one question · `--from` has exactly one legal value · the name carries a pre-`Q8` claim |
| 🔴 **one flag** — `--who @me` / `--who @stdin` / `--who "Name <email>"` | 🎯 matches the repo's **extant** `@`-sigil pattern · one flag, one question · the value form carries the provenance, which the output already reports | the grove constraint attaches to a **value form**, so `--help` and the refusal must carry it |

## ✅ .taken — ONE flag. the wisher's question was the argument.

```sh
rhx git.commit.sponsor set --who @me                                # your own session
printf 'Name <email>' | rhx git.commit.sponsor set --who @stdin     # piped
rhx git.commit.sponsor set --who "Name <email>"                     # literal
```

## 🔴 .the evidence — `@`-sigil-as-a-VALUE is the paved pattern, measured

| flag | sigil | beside the literal | where |
|---|---|---|---|
| `-m` | `@stdin` | `-m "text"` | `git.commit.set.sh:131` |
| `--org` | `@all` | `--org ehmpathy` | `git.commit.uses.org.sh:170` |
| `--into` / `--from` | `@this` | `--into owner/repo` | `radio.task.push` / `radio.task.pull` |
| `--old` / `--new` | `@stdin` | a literal pattern | `sedreplace.sh:89` |
| `--description` / `--reason` | `@stdin` | literal prose | `radio.task.push`, `set.package.install` |

⇒ 🎯 **in every extant instance the sigil is a VALUE on a flag that also takes literals.** a
separate flag for the sigil case has no precedent here at all. ⇒ `--from me` was the anomaly, and it
was invented by this drive rather than inherited.

## 🔴 .the three reasons the split was wrong

### 1. after `F9`, `--from` had exactly ONE legal value

`F9` struck `--from git-config` earlier the same day. ⇒ `--from` was left with a single legal
argument, which makes it **a boolean in a flag's costume** — the thing that justified its own
namespace was the second value, and that value is gone.

⚠️ **this was visible in the `F9` edit itself and was not seen.** that row records *"3 bind routes →
2"* and never asks whether the survivor still earns a flag. ⇒ **a removal changes the shape of what
remains, and the remainder deserves a re-read.**

### 2. `Q8` already ruled the two flags name the SAME party

the sponsor is the **requester**. so `--from me` and `--who X` answer one question — *who is the
requester?* — with two different supply mechanisms. ⇒ two flags for one concept is
`rule.forbid.term.addition.synonym`, and the contract table's `names` column, with two different
answers, read as two concepts where the design has one.

### 3. 🔴 the flag NAME carried the assumption `Q8` overturned

> `--from me` parses as *"the **source** is me"* — a provenance claim about the supervisor.

⇒ that is the **pre-`Q8`** reading, in which the sponsor was whoever authorized the spend
(assumption **H2**). `--who @me` says *"the requester is me"*, which is what the wisher actually
ruled.

⇒ 🎯 **`H2` was struck in the prose and left standing in the CLI surface.** a decision recorded only
in prose, while the interface still speaks the old model, is a decision that will be re-litigated by
whoever reads the interface first — which is everyone.

## ✅ .what the change dissolves

| what it removes | why |
|---|---|
| the r6 rule *"a refusal prints `--who @stdin`, never `--from me`"* | 🔴 mostly moot — the grove constraint now sits on a **value form**, so a refusal prints `--who` and lists the forms |
| the `names` column with two answers | one flag, one party |
| ⚠️ **the invisibility of `--who "literal"`** | see below — this was a real defect the split created |

### 🔴 the literal form had lost its only demo

the r6 rule made the **piped** form the one every refusal printed, and the `case=1` `[t3]` rewrite
replaced the literal demo with the refusal. ⇒ the contract listed `--who "Name <email>"` as
`# …same, unpiped`, a footnote, and no `[tn]` walked it.

⚠️ **a form that appears in no error text and no demo is a form humans will not find**
(`rule.require.discoverability`). ⇒ under one flag the three value forms are one enumerable set,
listed together in `--help` and in the refusal.

## ⚠️ .the cost, paid deliberately

**the grove constraint moves from a flag name to a value form.** `"--from me is local-only"` was
self-documenting; `"--who @me needs your own session"` needs `--help` and the refusal to say so.

⇒ accepted, because the refusal has to carry that message **either way** — a human who types the
wrong one learns from the guard, not from the flag name — and because the alternative buys that one
hint at the price of a synonym, a one-value flag, and a stale mental model in the surface.

## 🔴 .and it corrected a THIRD error in the same breath

the two-flag framing produced the phrase *"`--from me` is **LOCAL-ONLY**"*, which **over-claims**.

| the claim | the truth |
|---|---|
| 🔴 `@me` is local-only, by rule | ✅ `@me` works wherever **your own** session is present. `Q2′` established that a cloud grove **as provisioned today** carries the clone's |

⇒ `case=5` says it outright — *"decided by the value, never by the grove … the skill has no
grove-detect"*. ⚠️ a human who ssh'd in **with their own `gh auth login`** would pass, and the
local-only phrasing says they would not.

⇒ 🎯 **the same error class as *"impossible by nature"*** (caught at r1 and again at r6): a
statement about **this design's mechanism** written as a statement about the world.

## .rework, and why

**clean.** no code exists. the change is a flag name, a value sigil, and the prose that reasons
about them. ⇒ and it **shrinks** the contract rather than growing it, which is the cheapest kind of
reversal.

## .confidence, and why 94%

the paved-pattern evidence is measured across five flags, and the three arguments are independent —
any one alone would carry it. the residual 6% is the cost above: a reader who meets `--who @me` in
`--help` and misses the session caveat learns it from a refusal instead. ⚠️ that is a
`2.1.criteria` demand — **`--help` must mark `@me`'s requirement inline**, not only the error.

## .where

- `1.vision.yield.md` → the contract, the day in the life, the invariants
- `case=1` `[t1]`/`[t3]`/`[t4]` · `case=6` `[t0]`/`[t3]` · `case=5` `[t0]`/`[t3]` · `case=3` `[t1]` ·
  `case=4` `[t1]` · `case=7` `[t2]`/`[t3]`
- `F6` — its `--from me` verdict is now about `@me`, the value form
- `F9` — the removal that left `--from` with one value

## ✅ .the verdict — RULED by the wisher, 2026-09-09

**one `--who` flag; three value forms; `@me` is a sigil, not a flag.**

⚠️ **worth recording how it was found.** eight review rounds — two peer lanes, five self-reviews, two
prior councils — read the two-flag contract and none of them asked the question. the wisher asked it
in one line. ⇒ **a reviewer grades the artifact against a rule; it takes a reader who owns the domain
to ask whether the shape itself is right.**
