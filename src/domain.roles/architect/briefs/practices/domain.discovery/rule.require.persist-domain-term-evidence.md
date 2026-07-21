# rule.require.persist-domain-term-evidence

## .what

the domain-discovery evidence behind a proposed term must be **persisted long-term** in a canonical spot: `.agent/repo=.this/role=any/briefs/domain.terms/*`. one file per term, that records its etymology and the evidence that backed its choice.

this pairs with `rule.require.domain-discovery-for-term-proposals` — that rule requires discovery *happen*; this rule requires the discovery be *kept*.

## .why

- **future travelers need the why** — a term in the code shows *what* was chosen; the domain.terms file shows *why*, so a reader months out does not re-litigate a settled choice
- **a canonical home** — one predictable place to find the etymology and evidence behind any domain term, not scattered across PRs, chats, and lost sessions
- **a guarantee of rigor** — a persisted evidence file lets a reviewer confirm that *sufficient* evidence was supplied (timelines, decomposition, citations, precedent, narratives), rather than trust that discovery happened off-record
- **evidence outlives the conversation** — discovery done in a session evaporates when the session ends; the file is the durable record (pairs with `rule.require.timeless-comments`)

## .where

```
.agent/repo=.this/role=any/briefs/domain.terms/
  <term>.md          # one file per domain term
```

use `repo=.this/role=any` because a domain term is a fact of *this repo's* domain, shared across every role that works in it — not owned by any single role.

## .what the file must hold

each `domain.terms/<term>.md` must record:

1. **the term** — the canonical word, its shape (`[...noun][state]?` for a dobj, `[verb][...noun]` for a dop)
2. **the etymology** — where the word comes from; why this word and not its rejected synonyms
3. **the evidence** — at least one form of discovery evidence:
   - a **dimensional decomposition** (the axes walked, the forbidden cells found)
   - a **scenario timeline** narration
   - **citations** or **precedent** (prior art, an external standard, a peer repo's usage)
   - a **narrative** from a domain expert
4. **the attributes / states / refs** discovered for a dobj, or the inputs/effect for a dop
5. **the invariants** — any forbidden combinations surfaced, as checkable rules

## .the guarantee

a term without a persisted, sufficiently-evidenced file is not curated — it is a guess on record as if it were a decision. the file is what makes the choice *auditable*.

## .enforcement

- a term proposed to a distillate with no `domain.terms/<term>.md` file = **blocker**
- a `domain.terms` file with no discovery evidence (no decomposition, timeline, citation, precedent, or narrative) = **blocker**
- a `domain.terms` file that records the choice but not its etymology / rejected alternatives = **nitpick**

## .see also

- `rule.require.domain-discovery-for-term-proposals` — requires the discovery this rule persists
- `howto.domain-discovery.md` — the discovery moves whose output lands here
- `howto.dimensional-decomposition.md` — one premier evidence form
- `def.dimensional-decomposition.history.morphological-analysis.md` — citations/precedent to record
- `rule.require.ubiqlang` — the term this evidence justifies must satisfy ubiqlang
- `ubiqlang/rule.forbid.term.addition.ambiguous` / `.synonym` — the rejected-alternatives the etymology records
- `rule.require.timeless-comments` — why the evidence must be durable, not conversational
