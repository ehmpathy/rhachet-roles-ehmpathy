# define.abstraction.kind=contract

## .what

a **contract** = an abstraction over a behavior: what a call promises its callers — its inputs, its result, its errors — over a hidden implementation. one of two kinds (`define.abstraction._`).

| where we hold contracts | example |
|---|---|
| a domain operation's signature | `setSurfer({ findsert }, context)` → the surfer, upserted on its unique key |
| a communicator | `sdkStripe.setCustomer` over the raw stripe api |
| a cli skill | `rhx git.release --into prod` — its flags, its output, its exit codes |
| a published package | its exports, and the guarantees each names (`define.constraint.kind=guarantee`) |

a caller leans on the contract and never on the body. what the contract does not promise, the caller must not lean on (`catalog.of=tactic.abstraction.kind=contract.verb=set.tactic=narrow`).

usage: *"what does this contract promise on an absent input?"* · *"that behavior is not in the contract"*.

## .collisions, settled

- **the contract layer** (`src/contract/`). the same sense: the layer that holds the contracts a package publishes to its callers
- **a contract test**. a test that proves a contract holds; it tests the abstraction, it is not one

## .evidence

| precedent | the sense | citation |
|---|---|---|
| design by contract | a routine's obligations and benefits, stated as pre- and postconditions | meyer 1992 |
| procedural abstraction | a procedure known by its specification, not its body | liskov & guttag 1986 🟡 |

## .see also

- `define.abstraction._` — the generic
- `define.abstraction.kind=construct` — the peer kind
- `define.domain-operation-grains` — our main contract holders
- `rule.require.clear-contracts` (mechanic) — declare the contract before the body
