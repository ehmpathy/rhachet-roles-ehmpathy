# catalog.of=tactic.abstraction.kind=construct.verb=use.tactic=standardize

a member of `catalog.of=tactic.abstraction._`. kind `construct`: it uses a precise type where raw input enters.

## .the move

turn raw input into the most precise construct once, where it enters, and carry that proof in the type. inside, the shape is an invariant; later code needs no recheck. never validate and discard.

## .why

> "Get your data into the most precise representation you need as quickly as you can." — king 2019 ✅

## .in our tools

- `asIsoPrice(x)`, `asIsoTimeStamp(x)` at the handler (`rule.forbid.any-price`, `rule.forbid.any-time`, mechanic)
- declastruct casts each sdk response into the declared shape, and fails loud on an invalid one
- an assumption about a third party's payload converts into an invariant we own (`rule.require.assumptions-with-evidence`, move 1)

## .the failure it prevents

scattered parse: the same null or shape check repeated deep in the call stack, after the raw value was passed on.

## .relations

- `rule.require.parse-at-the-boundary`, `rule.forbid.scattered-parse` — the rules a reviewer loads for this tactic
- `tactic=precise` — the construct this builds
