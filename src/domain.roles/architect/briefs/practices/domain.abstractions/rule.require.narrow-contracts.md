# rule.require.narrow-contracts

## .what

treat every observable behavior of a contract as part of it. expose only what you will keep, so the team knows what it may change.

> "With a sufficient number of users of an API, it does not matter what you promise in the contract: all observable behaviors of your system will be depended on by somebody." — hyrum's law, *hyrumslaw.com* (the author's own page, undated) ✅

## .how

1. return a declared shape, never the vendor's full payload or the raw record
2. name each behavior a caller may lean on — sort order, units, the empty case, the error shape — in the contract or its type
3. leave out what you would not keep: an unsorted result says so; an internal field never leaves
4. each guarantee at a release boundary lists its exclusions (`define.constraint.kind=guarantee`)

```ts
// 👍 a declared shape, a declared order
/**
 * .what = the open lesson slots at a spot, sorted by startAt, earliest first
 */
export const getAllOpenLessonSlots = async (
  input: { spot: RefByUnique<typeof SurfSpot> },
  context: Context,
): Promise<LessonSlot[]> => { ... };
```

## .enforcement

- a contract that returns the raw vendor payload or storage record to its callers = **blocker** (harm: a vendor or schema change breaks every caller that read a field no one promised)
- an observable behavior callers already lean on, left undeclared = **nitpick**

## .see also

- `catalog.of=tactic.abstraction.kind=contract.verb=set.tactic=narrow` — the full tactic, with the sources
- `rule.forbid.implicit-contracts` — the forbid twin
- `rule.require.safe-escape-primitives` — the tension: each exposed primitive becomes a contract to keep
- `define.constraint.kind=guarantee` — the declared promise at a release boundary
