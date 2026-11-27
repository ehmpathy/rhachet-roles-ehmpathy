# ref.1977.lamport

grade: ✅
cite: Leslie Lamport (1977). Proving the Correctness of Multiprocess Programs. IEEE Transactions on Software Engineering SE-3(2), 125–143. doi:10.1109/TSE.1977.229904
seen: `.raw/lamport1977.crossref.json` · `.raw/page.lamport-pubs.json` ("The Writings of Leslie Lamport", the author's annotated list)

## .quote

> "For a period of about ten years, hardly anyone really understood that the Owicki-Gries method was just a particular way of structuring the proof of a global invariant."

> "I've since come to realize that this was a mistake. It's better to write a global invariant. ... an annotation gets you thinking in terms of separate assertions rather than" [a single invariant] (author's commentary; the bracket closes a cut window)

## .supports

- concurrency correctness reduces to one global invariant
- one invariant in one place beats assertions scattered through the code — `rule.forbid.scattered-invariant-guards`
