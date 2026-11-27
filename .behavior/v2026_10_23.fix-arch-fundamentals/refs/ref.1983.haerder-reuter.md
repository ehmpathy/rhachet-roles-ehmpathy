# ref.1983.haerder-reuter

grade: ☑️ — metadata from crossref and the acm page; no quote captured (the paper's text sits behind the acm library, and the acm page holds no abstract text with the four terms)
cite: Theo Haerder & Andreas Reuter (1983). "Principles of transaction-oriented database recovery." *ACM Computing Surveys* 15(4), 287–317. doi:10.1145/289.291
seen: `.raw/haerder-reuter1983.crossref.json`, `.raw/page.haerder-reuter1983-acm.json` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts` (the acm page cleared its bot wall on the third pass)

## .supports

- `catalog.of=pattern.transaction._` — the acid traits (atomicity, consistency, isolation, durability), cited by title only as the paper that named the four; the catalog's own definition of each trait stands on the postgresql docs (`ref.nd.postgresql`) and jepsen (`ref.nd.jepsen`)
