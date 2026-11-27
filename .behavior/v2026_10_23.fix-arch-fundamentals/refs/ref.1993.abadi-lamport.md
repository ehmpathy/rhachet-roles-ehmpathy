# ref.1993.abadi-lamport

grade: ✅
cite: Martín Abadi, Leslie Lamport (1993). Composing specifications. ACM Transactions on Programming Languages and Systems 15(1), 73–132. doi:10.1145/151646.151649. Preliminary version: Stepwise Refinement of Distributed Systems, LNCS 430 (1990), 1–41, doi:10.1007/3-540-52559-9_59.
seen: `.raw/abadilamport1993.crossref.json` · `.raw/page.doi-abadilamport1993.json` (dl.acm.org) · `.raw/page.lamport-pubs.json`

## .quote

> "A rigorous modular specification method requires a proof rule asserting that if each component behaves correctly in isolation, then it behaves correctly in concert with other components. Such a rule is subtle because a component need behave correctly only when its environment does, and each component is part of the others' environments. We examine the precise distinction between a system and its environment, and provide the requisite proof rule when modules are specified with safety and liveness properties."

## .supports

- the circularity the chain must break: each component's guarantee is another's assumption
- a component owes its guarantee only while its environment keeps the assumption — the reason an assumption needs a detector
