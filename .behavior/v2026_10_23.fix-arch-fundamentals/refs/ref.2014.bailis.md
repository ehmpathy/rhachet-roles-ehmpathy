# ref.2014.bailis

grade: ✅
cite: Peter Bailis, Alan Fekete, Michael J. Franklin, Ali Ghodsi, Joseph M. Hellerstein, Ion Stoica (2014). Coordination avoidance in database systems. Proceedings of the VLDB Endowment 8(3), 185–196. doi:10.14778/2735508.2735509
seen: `.raw/bailis2014.crossref.json` · `.raw/page.doi-bailis2014.json` (dl.acm.org) · `.raw/page.vldb-bailis.json`

## .quote

> "we develop a formal framework, invariant confluence, that determines whether an application requires coordination for correct execution. By operating on application-level invariants over database states (e.g., integrity constraints), invariant confluence analysis provides a necessary and sufficient condition for safe, coordination-free execution. When programmers specify their application invariants, this analysis allows databases to coordinate only when anomalies that might violate invariants are possible."

## .supports

- state the invariant first, and it tells you which operations need a lock or transaction and which do not — `rule.forbid.check-then-write`
