# ref.2015.newcombe

grade: ✅ (full text read in the headful session after a human cleared the cacm challenge; byline "By Chris Newcombe, Tim Rath, Fan Zhang, Bogdan Munteanu, Marc Brooker, and Michael Deardeuff", "Posted Apr 1 2015"; volume and pages from crossref)
cite: Chris Newcombe, Tim Rath, Fan Zhang, Bogdan Munteanu, Marc Brooker, Michael Deardeuff (2015, april). How Amazon web services uses formal methods. Communications of the ACM, 58(4), 66–73. doi:10.1145/2699417
seen: `.raw/page.newcombe2015.text.md` (fetched 2026-11-23) · `.raw/newcombe2015.crossref.json`

## .quote

> In contrast, when using formal specification we begin by stating precisely “what needs to go right.” We first specify what the system should do by defining correctness properties

> We express “what must go right” by explicitly specifying all properties of the environment on which the system relies.

> An assertion checks a small, local part of an overall system invariant. A good system invariant captures the fundamental reason the system works

> We find this rigorous “what needs to go right” approach to be significantly less error prone than the ad hoc “what might go wrong” approach.

## .supports

- converge: the peer split. correctness properties (our invariants) stand apart from "all properties of the environment on which the system relies" (our assumptions), and both are stated before the design is checked
- converge: an assertion enforces a local part of a system invariant — the enforcer, apart from the entry it keeps
- converge: state what must go right, not what might go wrong — an invariant is declarative
- contrast: they prove the design formally, inside the boundary (TLA+, model check)
- the response (bound): internal proof depth follows the system's taxonomy (I06). a concurrent, distributed core earns it; information logistics proves guarantees only at release boundaries
