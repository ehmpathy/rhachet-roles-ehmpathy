# catalog.of=tactic.constraint.kind=_.grain=declaration.tactic=itemize

a member of `catalog.of=tactic.constraint._`. kind `_`: it declares invariants, assumptions, and guarantees alike. grain `declaration`: it shapes the entry, never the code. the peer of `tactic=compose`.

## .the move

give each constraint one inventory entry, with an id of its kind: `[i00n]`, `[a00n]`, or `[g00n]`. write the entry in domain words. cite the id at each enforcement and each test that proves it.

## .why

> "it's better to write a global invariant" — lamport, in his own words, on his 1977 *ieee tse* work ✅

one written list beats assertions spread across the code. a reader enumerates every constraint in one place, and a search for the id finds every path that keeps it.

## .in our tools

- `inventory.of=invariant._`, `inventory.of=assumption._`, `inventory.of=guarantee._`, one set per subdomain (`howto.itemize-constraints._`)
- `then('[i002] a second board for kai in the 6am slot is refused', …)` — the test name cites the id
- `rhx grepsafe --pattern 'i002'` finds the entry, its enforcements, and its tests

## .the failure it prevents

a constraint declared in a comment, a test name, or a pr description. `// invariant: one board per surfer per slot` sits in one file. the voucher path never reads it, and no test can cite it, so the next author re-derives the rule or misses it.

## .relations

- `rule.avoid.unitemized-constraints`, `rule.prefer.itemized-constraints` — the rules a reviewer loads for this tactic
- `tactic=compose` — the other grain of `_`: itemize names what each part keeps; compose keeps each part to its own
- `tactic=declare` · `tactic=attest` · `tactic=promise` — the per-kind declarations, each written into the entry itemize makes
- `howto.itemize-constraints._` — the layout, the ids, the templates
- `define.constraint.grain=declaration` — what an entry may say, and what it may not
