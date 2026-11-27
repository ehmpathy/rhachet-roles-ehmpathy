# catalog.of=tactic.constraint.kind=guarantee.grain=declaration.tactic=promise

a member of `catalog.of=tactic.constraint._`. kind `guarantee`: a constraint we keep, for consumers. grain `declaration`: what must be true, in the entry. the peer of `tactic=prove`.

## .the move

at each release boundary — a package export, a public endpoint, a cli, an emitted event — declare what consumers may rely on, in their words. then declare what they may not: the exclusions. an internal contract gets no entry; both its sides change in one commit.

## .why

> "With a sufficient number of users of an API, it does not matter what you promise in the contract: all observable behaviors of your system will be depended on by somebody." — hyrum's law, *hyrumslaw.com* (the author's own page, undated) ✅

consumers lean on all they observe, promised or not. so the entry names the exclusions too, and a change there ships as a minor.

## .in our tools

- `[g001] a reservation id never changes once issued` — one entry in `inventory.of=guarantee`
- exclusion: the order of `getAllLessonReservations` is not promised; a consumer sorts it
- a consumer cites `g001` as its own `a00n`, with the evidence tier "an upstream guarantee"

## .the failure it prevents

a promise consumers infer from behavior. the school's reservation app shows lessons in the order the api returns them. a new index reorders them, a minor release breaks the app, and no one ever promised the order.

## .relations

- `rule.forbid.implicit-contracts`, `rule.require.narrow-contracts` (domain.abstractions) — the rules a reviewer loads for this tactic
- `tactic=prove` — the other grain of `guarantee`: promise says what consumers may rely on; prove shows it still holds
- `tactic=itemize` — the `_` declaration: the entry this guarantee is written into
- `define.constraint.kind=guarantee` — the term, and the assume → guarantee chain
- `howto.itemize-constraints.template=guarantee` — the entry form, with its exclusions
- `catalog.of=tactic.abstraction.kind=contract.verb=set.tactic=narrow` — expose only what you will keep
