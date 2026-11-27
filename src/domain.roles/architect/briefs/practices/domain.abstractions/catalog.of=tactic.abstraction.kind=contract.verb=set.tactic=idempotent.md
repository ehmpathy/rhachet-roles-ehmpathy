# catalog.of=tactic.abstraction.kind=contract.verb=set.tactic=idempotent

a member of `catalog.of=tactic.abstraction._`. kind `contract`: it shapes which cases a call treats as errors.

## .the move

declare the operation by the end it ensures, so a re-run, or a case where that end already holds, is a defined result, not an error: a `del` of an absent item returns; a `gen` of a present item returns it. refuse every case that breaks an invariant, at the boundary, loud. the line between the two is the whole tactic.

## .why

ousterhout's move is to "define errors out of existence" (2018, p. 79 ✅): shape the operation so the case that would raise is a defined, valid result. a reviewer of summary notes on the book warns the move can hide errors that should not be hidden, which is why the line above is drawn: define away only the case where the desired end already holds; refuse the rest (`tactic=standardize`, `tactic=precise`).

## .in our tools

- `get` · `set` · `gen` · `del`: each idempotent; `del` of an absent item returns, never throws (`rule.require.get-set-gen-verbs`, mechanic)
- `findsert` and `upsert` converge on retry (`rule.forbid.nonidempotent-mutations`, mechanic)
- `asIsoPrice` refuses a malformed value at once

## .the failure it prevents

two failures, one on each side:

- a try/catch at every caller for a case the operation could define away
- a real error defined away, so it hides (`rule.forbid.failhide`, mechanic)

## .relations

- `rule.forbid.nonidempotent-mutations` (mechanic) — the forbid pole for the retry side; the rules below own the rest
- `rule.require.idempotent-operations`, `rule.require.fewer-paths-via-idempotency` — own the idempotent contract and the branch collapse it buys
- `rule.require.failfast`, `rule.forbid.failhide` (mechanic) — own the refused-loud half
- `tactic=absorb` — its peer: absorb hides a decision; idempotent hides a benign case
