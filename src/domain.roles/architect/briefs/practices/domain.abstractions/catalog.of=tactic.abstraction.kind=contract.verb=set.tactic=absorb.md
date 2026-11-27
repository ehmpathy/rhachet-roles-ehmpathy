# catalog.of=tactic.abstraction.kind=contract.verb=set.tactic=absorb

a member of `catalog.of=tactic.abstraction._`. kind `contract`: it shapes what a call promises.

## .the move

absorb a decision inside the contract. do not export it as an option, a flag, or a config every caller must set well. one author pays; many callers gain.

the test is depth: a small promise over a large capability. a contract whose surface is as large as what it hides absorbed no decision; a layer that forwards its caller's call unchanged absorbed none either. merge it into its caller, or deepen it.

## .why

> "It is more important for a module to have a simple interface than a simple implementation." — ousterhout 2018, p. 55 (✅ "…simple interface than a simple implementation" in the book's own text; the first words via a secondary quote)

> "The best modules are those with the greatest benefit and the least cost." — ousterhout 2018, p. 23 ✅

> "A pass-through method is one that does little except invoke …" — ousterhout 2018, p. 46 ✅

the benefit is the capability a contract provides; the cost is its surface, what each caller must learn.

## .the pit of success

this is how a pit of success gets dug. a caller cannot get wrong a decision it never makes, so the bare call is the correct call (`rule.require.pitofsuccess`, mechanic; `rule.require.safe-by-default`, ergonomist). a decision that must stay exposed gets a default: the safe, common case (`rule.prefer.defaults-match-common-case`, ergonomist).

## .in our tools

- `setSurfer({ findsert })` hides the lookup, the cast, the idempotency key, and the retry behind one verb
- `rhx` skills: one command over a workflow
- the iso glossaries pick the format once; no caller chooses how to serialize money
- the grains: a communicator speaks the vendor's verbs, a transformer speaks shapes, an orchestrator speaks the domain's narrative, so each layer adds words of its own (`define.domain-operation-grains`)

## .the failure it prevents

- knobs a caller cannot set well: configuration that pushes a decision up to the party least able to make it
- shallow contracts: a surface as large as what it hides, so every caller learns every piece
- pass-through layers: adjacent layers with one signature, each a hop with no word of its own

## .relations

- `rule.require.deep-contracts`, `rule.forbid.shallow-contracts` — the rules a reviewer loads for this tactic
- `tactic=expose` — its counterweight: absorb the decision for every caller; expose a true primitive only for a caller who justifies it
- `tactic=idempotent` — its peer: absorb hides a decision; idempotent hides a benign case
