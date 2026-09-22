# domain term: sponsor

## .the term

**sponsor** — *dobj*, shape `[noun]`.

> the **human** who authorized a unit of work, and who answers for it in the real world.

a commit names one. a commit with none is not commitable.

✅ **ruled by the wisher, 2026-09-09.** the term is accepted over `patron` and `authorizer`; the
restoration stands.

related dops (shape `[verb][...noun]`): `setCommitSponsor` · `getCommitSponsor` ·
`delCommitSponsor`. cli surface: `rhx git.commit.sponsor set|get|del`.

## .the evidence — five whys

the discovery move (`howto.domain-discovery` → *ask the five whys*), run on the extant field:

| # | the question | the answer |
|---|---|---|
| 0 | what is the value? | `git config user.name`, written into a `Co-authored-by` trailer |
| 1 | why a co-author trailer? | to credit the human whose work this is |
| 2 | why credit them? | the work was theirs; the clone was the instrument |
| 3 | why does the identity matter? | someone must answer for the change in the real world |
| 4 | why must someone answer? | the change carries real cost — spend, prod blast radius |
| 5 | why a *human*? | 🔴 only a human bears cost accountability. a clone cannot answer |

⇒ the buried motive, two whys beneath the storage detail:

> **the human who authorized this work and bears its consequence.**

the surface named a *mechanism* (`git config`). the term names the *motive*. per
`def.domain-discovery`, the mechanism decays and the motive outlives it — which is exactly what
happened: the mechanism inverted on a cloud host and the intent was left with no word to stand on.

## 🔴 .the etymology — it is a RESTORATION, not a coinage

**the word is already this repo's.** the origin wish that created `git.commit`, in
`.behavior/v2026_02_03.git-commit/0.wish.md:12`:

> "it should simply give co-authorship to the parent git user … while it still attributes the human
> user that delegated the action with credit, **like a sponsor**"

⇒ **`sponsor` is the wisher's own word for this exact role.** `patron` entered later, in the
implementation, and drifted from the wish it was built from. this term proposal restores the
original vocabulary rather than invents a new one.

### 🔴 and the same line carries the defect's seed

> "give co-authorship to the **parent git user**"

the wish assumed **the git user IS the parent human**. that was true in 2026-02, when every grove
was local. it inverted when cloud groves arrived, and the code kept the premise.

⇒ **the defect is not an implementation slip. it is a premise of the origin wish that expired.**
that is why no guard caught it: the code faithfully implements a wish whose world changed.

### ⚠️ the sense has sharpened since

the origin wish says **credit** — attribution to the delegator. `#645` says **accountability** —
the party who answers for real-world cost. same word, deeper motive.

the restored term carries the **accountability** sense. that is deliberate, not a quiet reuse, and
a reader of the origin wish should know the two senses are not identical.

### the general etymology

latin **spondēre** — *to pledge, to vow solemnly*. a sponsor pledges on another's behalf and
**takes responsibility** for them.

the durable modern senses all carry that responsibility, not mere funds:

| sense | what the sponsor does |
|---|---|
| a legal sponsor (immigration) | vouches for another, and is liable |
| a bill's sponsor (legislature) | 🔴 the member who takes responsibility for a measure they did not draft |
| a sponsor (12-step) | stands accountable alongside another |

⇒ the legislative sense is the near-exact analogue: **a party takes responsibility for a text
another hand produced.** that is a commit.

## .the rejected alternatives

| word | why rejected |
|---|---|
| **patron** | 🔴 **extant, and it names the defect.** rendered today at `git.commit.set.sh:695` for the `git config` value. reuse would overload one word across "the guessed value" and "the bound authorization" — `rule.forbid.term.addition.ambiguous`. and its etymology (*patronus* → benefactor, one who funds) names **support**, not responsibility. it says who paid, where we mean who answers |
| **authorizer** | precise on the motive, and 🔴 it collides. `auth` in this exact skill family already means **a github credential** — `--auth as-ehmpath\|as-human` (`git.commit.operations.sh:35`), keyrack tokens, `gh auth login`. an `authorizer` field beside an `--auth` flag is one term, two senses, in one command — `rule.forbid.term.addition.ambiguous` |
| **owner** | overloaded org-wide: keyrack owner (`--owner ehmpath`), repo owner, code owner |
| **delegator** | names the act of hand-off, not the accountability that outlives it. and it inverts oddly: a delegator delegates *away* responsibility, where a sponsor keeps it |
| **human** | too broad. the extant `HUMAN_NAME` variable is the very field that holds a robot. the term must name *which* human and *why*, not the species |

## .the collision we accept

**github Sponsors** = a product that routes funds to a maintainer. the collision is real and
bounded:

- it lives in the **payments** domain; we are in the **commit** domain
- the git commit vocabulary has no extant `sponsor`, so no term is displaced
- the *vouches-for* sense is english's primary one; github's *funds* sense is the narrower borrow

⇒ acceptable. per `ref.reviewer.dont-bikeshed-terms`, a bounded cross-domain homonym is not a
blocker when the local sense is unambiguous.

## .the attributes

| attribute | type | note |
|---|---|---|
| `name` | string | the human's display name |
| `email` | string | the human's email; what git's trailer needs |
| `source` | enum | `me` \| `supplied` — 🔴 **provenance is part of the value.** a reader must be able to tell a session-read bind from a piped one without a code read. ⛔ **`git-config` was struck** by the wisher, 2026-09-09 |

## .the invariants

discovered from the walked product (`.behavior/v2026_09_08.feat-require-commit-sponsor/1.vision.experience.case=_.md`):

1. **a sponsor is a human.** a robot or placeholder identity is refused at bind (inventory rows
   5–6, 11–12). ⇒ the `identity=robot` state is unreachable **by construction** at every other act
   (**18** impossible cells). ⚠️ never *"by nature"* — a robot sponsor is entirely possible in a
   world with no bind guard, and that world is where the defect lives.
2. **only a human binds a sponsor.** a clone is refused at `set` and at `del` alike — a permissive
   `del` is a permissive `set` with one extra step (rows 9–12, 31–34).
3. **a clone may read a sponsor.** `get` carries no actor guard; the clone needs it to explain its
   own state (rows 19–22).
4. **the sponsor is a snapshot, never a pointer.** it does not track its source after the bind. a
   value that tracked its source would be the implicit fallback under a new name.
5. **the sponsor never travels in a commit message.** the adhoc `Co-authored-by` guard
   (`git.commit.set.sh:231`) stays exactly as strict; the sponsor is a third route, not a loosened
   second one.
6. 🔴 **the sponsor state is never committed.** the value is a human's name and email — PII. this
   repo already strips that same email from every pr body (`git.commit.push.sh:611`, *"privacy:
   avoid email leak"*), so persisted sponsor state must self-bootstrap a `.gitignore` the way
   `.branch/.bind/` does (`git.commit.bind.sh:127-130`).
7. 🔴 **the sponsor is the REQUESTER, never the supervisor.** ✅ **ruled by the wisher, 2026-09-09.**
   where a supervisor dispatches work a requester asked for, the sponsor is **the human who wanted
   the change**, not the one who authorized the spend.
8. 🔴 **`git config` is never a source.** ✅ **ruled by the wisher, 2026-09-09.** the wish permitted
   an explicit one-time seed on a local grove; the design declined it, so no path reads `git config`
   for an identity. ⇒ the wish's *"⛔ no silent fallback"* bound is not merely honored, it is
   **unreachable**.
9. 🔴 **a bind that cannot establish a human REFUSES; it never substitutes.** ✅ **ruled, 2026-09-09
   (`Q2′`).** `--who @me` on a cloud grove finds the clone's github session and exits 2 with the fix
   — it does not fall back to what it found. ⇒ a fallback names the clone; a refusal names the fix,
   and that difference is the whole term.

## 🔴 .the wisher's decision that invariant 7 records — and why it follows from the term

the contract admits both parties (one form reads the binder's own session; another supplies a name),
and the vision declined to decide which the sponsor is.

⇒ ✅ **the requester**, and the term's own evidence is what settles it: a sponsor **answers for**
the change. that is the requester's relation to it. the supervisor's relation is to the *budget* —
which the quota meter already records, in a different mechanism, for a different question.

⚠️ **so `--who @me` is NOT the paved form for a dispatch.** it is the paved form for a human who
sponsors **their own** work. the moment a supervisor acts for someone else, a **supplied** form is
correct and `@me` would name the wrong human — truthfully, which is what makes the error hard to see.

🔴 **and this decision is why the surface has ONE flag.** `Q8` ruled every form names the same
party — the requester — so a second flag asserted a distinction the domain does not have. ⇒ two
flags survived eight review rounds and fell to one question from the wisher: *"why wouldn't these be
the same flag?"* (`F10`).

⚠️ **the old name even spoke the struck model.** `--from me` parses as *"the **source** is me"* — a
provenance claim about the supervisor, which is the sense `Q8` overturned. ⇒ **a decision recorded
only in prose, while the interface still speaks the old model, is a decision that gets re-litigated
by whoever reads the interface first.**

### the wisher's mechanism note

> *"the supervisor should know to grab it from the machine they dispatched from and pipe it in"*

⇒ the requester's identity is **available on the supervisor's own machine** at dispatch time, so
the supervisor reads it there and pipes it into the bind. ⚠️ **that makes `--who @stdin` a contract
requirement rather than a convenience** — it matches the extant `-m @stdin` pattern
(`git.commit.set.sh`) and it keeps a human's name out of shell history and process args.

⇒ raised for `2.1.criteria`: `--who` must accept `@stdin`.

## 🔴 .what the SECOND council added — invariants 8 and 9

two more decisions landed the same day, and together they narrow where each flag may run:

| the wisher's words | the invariant |
|---|---|
| *"no — cloud has no human gh session"* (`Q2′`) | **9** — `@me` refuses where the session is not yours |
| *"drop it — `--who @stdin` covers it"* | **8** — `git config` is never a source |

⇒ ✅ **the bind now has exactly two SUPPLY routes**, and the choice between them is a domain question
rather than an ergonomic one:

| the binder is | the value form | where it holds |
|---|---|---|
| a human who sponsors **their own** work | `--who @me` | wherever **your own** gh session is |
| anyone who names the **requester** | `--who @stdin` / `--who "…"` | everywhere |

⇒ 🎯 **the supplied forms are the ones that work everywhere**, which is why every mandatory block in
the design prints them. ⚠️ a refusal cannot know which grove reads it, so it must not print a command
that is grove-conditional — a copy-paste fix that itself refuses is worse than an absent one.

⚠️ **`@me` reads a value; the supplied forms hand one in.** that property — not the grove, and not
the flag name — is what decides which forms a refusal may print. 🔴 the skill runs **no
grove-detect**, so *"`@me` is local-only"* over-claims: a human who ssh'd in with their own
`gh auth login` passes.

⇒ 🔴 **one flag, three value forms** (`F10`). they are one enumerable set, listed together in
`--help` and in every refusal — so no form is reachable only from documentation
(`rule.require.discoverability`).

## .the citations

- `ehmpathy/rhachet-roles-ehmpathy#645` — the defect, and the live commit that carries it.
  **verified first-party**: `gh api repos/ahbode/svc-jobs/commits/a1635ea` → author
  `seaturtle[bot]`, co-author `Seaturtle of'Ehmpathy <259600029+ehm-seaturtle@users.noreply.github.com>`.
  both the clone, zero humans
- `ehmpathy/rhachet-roles-ehmpathy#646` — the followup: `git config` on a cloud grove can be
  available or truthful, never both. that is what forces a **bound** value over an inferred one
- this repo's own `main` — `691a742`, `c9d7d63`: the intended shape, from a local grove,
  co-authored `Ulad Kasach <uladkasach@gmail.com>`

## .see also

- architect `rule.require.domain-discovery-for-term-proposals` — the discovery this records
- architect `rule.require.persist-domain-term-evidence` — why this file exists
- mechanic `rule.require.ubiqlang` — one canonical word per concept
- `.behavior/v2026_09_08.feat-require-commit-sponsor/1.vision.yield.md` — the vision that proposes it
