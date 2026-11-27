# rule.forbid.implicit-contracts

## .what

never let a contract expose a behavior it does not mean to keep. callers lean on every observable behavior — an order, a latency, a field — whether or not the contract promised it. an unpromised behavior a caller leans on is an invariant no one declared, and it breaks the day it changes.

> "With a sufficient number of users of an API, it does not matter what you promise in the contract: all observable behaviors of your system will be depended on by somebody." — hyrum's law, *hyrumslaw.com* (the author's own page, undated) ✅

## .the smell

```ts
// 👎 the raw records leave the contract: their column order, their nulls, their internal flags
export const getAllLessonSlots = async (input: { spotUuid: string }, context: Context) =>
  context.dbConnection.query('SELECT * FROM lesson_slot WHERE spot_uuid = $1', [input.spotUuid]);
// a caller reads record.is_internal_flag and records[0] as the earliest slot; neither was promised
```

the tells:

- a contract returns `SELECT *`, the full vendor payload, or an internal field
- a result comes back in an order the contract never names
- a fix to "an internal detail" breaks a caller

## .the cure

narrow the contract (`rule.require.narrow-contracts`):

| move | holds because |
|---|---|
| return a declared shape (`LessonSlot`), cast from the raw one | no internal field leaves |
| declare each behavior you keep (sort, units, the empty case) | a caller leans only on what the contract names |
| break an unpromised behavior on purpose where it is not kept (an unsorted result reads unsorted) | no caller grows to depend on it |

## .enforcement

- a contract that returns the raw vendor payload or storage record = **blocker** (harm: the next schema or vendor change breaks callers that read fields no one promised)
- a behavior exposed but undeclared, with no known caller on it yet = **nitpick**

## .see also

- `catalog.of=tactic.abstraction.kind=contract.verb=set.tactic=narrow` — the full tactic, with the sources
- `rule.require.narrow-contracts` — the require twin
- `rule.forbid.multiplicative-composition` — the caller-side face: a lean on undeclared behavior
- `rule.forbid.implicit-invariants` — the same gap, for a domain rule no entry declares
