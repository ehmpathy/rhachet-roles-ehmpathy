# catalog.of=tactic.abstraction.kind=contract.verb=set.tactic=narrow

a member of `catalog.of=tactic.abstraction._`. kind `contract`: it bounds what a call reveals.

## .the move

treat every observable behavior as part of the contract. expose only what you will keep, so the team knows what it may change.

## .why

> "With a sufficient number of users of an API, it does not matter what you promise in the contract: all observable behaviors of your system will be depended on by somebody." — hyrum's law, *hyrumslaw.com* (the author's own page, undated) ✅

## .in our tools

- return a declared shape, never the vendor's full payload
- each guarantee at a release boundary lists its exclusions (`howto.itemize-constraints._`, `define.constraint.kind=guarantee`)

## .the failure it prevents

an implicit contract: a caller relies on an unlisted order, latency, or field. that is an invariant no one declared, and it breaks the day it changes.

## .relations

- `rule.require.narrow-contracts`, `rule.forbid.implicit-contracts` — the rules a reviewer loads for this tactic
- `tactic=expose` — the tension: an escape exposes more, and each exposed primitive becomes a contract to keep. expose only a primitive you would keep as its own declared contract
