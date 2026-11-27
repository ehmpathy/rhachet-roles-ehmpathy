# catalog.of=tactic.abstraction.kind=_.verb=set.tactic=separate

a member of `catalog.of=tactic.abstraction._`. kind `_`: it makes contracts and constructs alike. the peer of `tactic=gather`.

## .the move

list the decisions most likely to change: a vendor, a storage engine, a format. give each one home, so a change to it touches that home alone.

cut by the decision each part owns, never by the order steps run. an order change then never splits a part, and a decision change never spans two.

## .why

> "There are a number of design decisions which are questionable and 'likely to change' under many circumstances." — parnas 1972 ✅

> "It is almost always incorrect to begin the decomposition of a system into modules on the basis of a flowchart." — parnas 1972 ✅

both quoted from *on the criteria to be used in decomposing systems into modules*, *cacm* 15(12), doi:10.1145/361598.361623 (verbatim via a secondary read; the primary fetch is open).

## .in our tools

- declastruct hides the vendor: the stripe shape never passes `asDeclaredStripeCustomer`
- the dao hides the storage: the domain reads a `Surfer`, never the record, the query, or the engine
- the `access` layer hides every sdk behind a communicator
- `asIsoPrice` owns the money format; parse, sum, and render each go through it
- files sit under their primary noun, never their verb (`rule.require.group-by-noun-not-verb`, `rule.require.directory.by-primary-noun`)

## .the failure it prevents

- shotgun edits: one decision known by many files, so one change ripples through all of them
- temporal decomposition: parts named parse, transform, write, each of which knows the same format

## .relations

- `rule.require.decision-decomposition`, `rule.forbid.temporal-decomposition` — the rules a reviewer loads for this tactic
- `rule.require.single-responsibility` (mechanic) — this cut at its smallest grain: one procedure per file
- `philosophy.domain-as-a-garden` — they converge: a part cut by the decision it owns is the part a later composite reuses. cut by decision first; reuse follows
- `tactic=gather` — the other half: separate what changes for different reasons; gather what changes for the same one
