# ref.2015.lamport

grade: ✅ (full text read in the headful session after a human cleared the cacm challenge; byline "By Leslie Lamport", "Posted Apr 1 2015"; volume and pages from crossref)
cite: Leslie Lamport (2015, april). Who builds a house without drawing blueprints? Communications of the ACM, 58(4), 38–41. doi:10.1145/2736348
seen: `.raw/page.lamport2015.text.md` (fetched 2026-11-23) · `.raw/lamport2015.crossref.json`

## .quote

> We need to understand our programming task at a higher level before we start writing code.

> The only general rule I have is that a specification of what a piece of code does should describe everything one needs to know to use the code. It should never be necessary to read the code to find out what it does.

> I would estimate that 95% of the code programmers write is trivial enough to be adequately specified by a couple of prose sentences.

> However, writing tests in code does not get us thinking above the code level.

> If we do not start with a specification, every line of code we write is a patch.

## .supports

- converge: the source sits above the code. a spec states what the code must do, and the code answers to it — the spine of `philosophy.invariants-are-the-source`
- converge: tests in code are not the spec; they prove it. the inventory is the source, the test its proof
- converge: most code needs only a prose sentence or two — the glue below the invariants needs no inventory entry (`rule.forbid.test-edit-without-named-proof`)
- bound, in his own words: a distributed system "can require many specifications, some of them formal" — depth follows the system (I06)
