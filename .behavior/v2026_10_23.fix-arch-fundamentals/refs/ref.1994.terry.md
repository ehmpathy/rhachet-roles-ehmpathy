# ref.1994.terry

grade: ☑️ — metadata from crossref; no quote captured (the paper's text sits behind ieee)
cite: D. B. Terry, A. J. Demers, K. Petersen, M. J. Spreitzer, M. M. Theimer & B. B. Welch (1994). "Session guarantees for weakly consistent replicated data." *Proceedings of 3rd International Conference on Parallel and Distributed Information Systems*, 140–149. IEEE Computer Society Press. doi:10.1109/pdis.1994.331722. crossref holds no issue date; pdis 3 met in 1994
seen: `.raw/terry1994.crossref.json` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`

## .supports

- `catalog.of=pattern.transaction._` — the read half of the `consistency` trait: the origin of the session guarantees (read your writes, monotonic reads, monotonic writes, writes follow reads), cited by title only; the definitions the catalog quotes come from `ref.nd.jepsen` and `ref.nd.jepsen-monotonic-writes`
- `catalog.of=pattern.transaction.bound=storage.trait=consistency.pattern=read-your-writes`
