# ref.1992.meyer

grade: ☑️
cite: Bertrand Meyer (1992). Applying "design by contract". Computer 25(10), 40–51. IEEE. doi:10.1109/2.161279. Earlier: B. Meyer (1986), Design by Contract, Tech. Rep. TR-EI-12/CO, Interactive Software Engineering Inc.
seen: `.raw/meyer1992.crossref.json` · `.raw/page.wiki-design-by-contract.json` · `.raw/page.eiffel-dbc.json` (eiffel.org documentation)

## .quote

> "The term was coined by Bertrand Meyer in connection with his design of the Eiffel programming language and first described in various articles starting in 1986" (wikipedia)

> "Maintain a certain property, assumed on entry and guaranteed on exit: the class invariant." (wikipedia)

> "Using the class invariant we are able to state what it means for an instance of a class to be valid, or as it is sometimes put, in a stable state. The class invariant is an assertion like precondition and postcondition, but there is only one per class." (eiffel.org)

> "if the specification of a routine gets violated at runtime we will be served immediately with an exception." (eiffel.org)

## .supports

- contract terms: precondition (caller owes), postcondition (supplier owes), class invariant (holds at every stable point)
- one invariant per class: one home for the rule
- runtime contract checks fail fast — the enforcer for what a proof does not cover
