# rule.forbid.test-edit-without-named-proof

## .what

never weaken, delete, or re-snapshot an assertion to turn a red test green unless you name what the test proves. every test proves one of three things:

- an **implementation contract** — glue. a fact the current implementation needs so it can keep the invariants: a call order, a shape a procedure returns, a dao's write. most tests are glue. glue needs no inventory entry; the test says its contract in words
- a **domain invariant** — a rule the domain holds in every observable scenario. the test cites its entry (`[i001]`)
- a **guarantee** — a promise to consumers at a release boundary, proved by a blackbox acceptance test through the published contract. the test cites its entry (`[g001]`)

no name → the test is right and the code is wrong. fix the code.

## .why

- a red test asks one question: is the code broken, or is the test wrong? the named proof answers it; a guess does not
- the test edit is the cheaper move, so a robot under pressure takes it. frontier brains raise their score "by modifying the tests or scoring code" (von arx, chan & barnes, metr 2025)
- a green suite that no longer proves what it claims is worse than a red one: it hides the defect from every later reader

## .how

first, name the proof:

1. **glue?** does the assertion pin how this implementation works — an internal call, a shape, an order — rather than a rule the domain holds? then it proves an implementation contract. the usual case; no entry needed. the check that keeps this label honest: an assertion on a field or object that an inventory entry governs is never glue
2. **invariant?** does it cite an entry, or assert a rule the domain holds whatever the implementation? then it proves a domain invariant
3. **guarantee?** does it run through the published contract, as a consumer would — an acceptance test? then it proves a guarantee

then act:

| the test proves | then |
|---|---|
| an implementation contract the change kept | fix the code; leave the test |
| an implementation contract the change replaced | retire the test with the implementation; say which contract went, and which tests now cover its successor |
| a domain invariant the change kept | fix the code; leave the test |
| a domain invariant the change amended | amend the entry first, then the test; cite the entry in both |
| a guarantee the change kept | fix the code; leave the test |
| a guarantee the change amended | amend the guarantee entry first, then the test; release-note the break, since consumers lean on it (a major version) |
| a domain rule no entry names | derive before you edit (below) |

### .derive before you edit

where an assertion reads as a domain rule and the inventory is silent, skepticize the omission:

1. an implicit invariant — does the domain hold a rule no one wrote down?
2. an implicit assumption — does the test lean on a fact the world keeps?
3. a derived invariant — does one follow from the invariants, assumptions, and guarantees on record?

a clear answer → record the entry, then apply the table. no clear answer → record your best guess, apply the table to it, and itemize it as a fulcrum for a human to verify. never halt mid-edit to ask.

glue never triggers this step. to mint an invariant for a glue test inflates the inventory with implementation facts that change on the next refactor.

## .examples

### 👎 bad — an invariant test loosened

```ts
// given('[i001] two surfers race for the last board') — red after a refactor of setLessonReservation
- expect(winners).toHaveLength(1);
+ expect(winners.length).toBeGreaterThanOrEqual(1);
// commit: "fix flaky test"
```

the assertion proved `[i001] reserved boards within stock`. the edit hid an oversold slot.

### 👎 bad — a glue test deleted while its contract stands

```ts
// setLessonReservation still writes the slot through daoLessonSlot.upsert
- expect(upsertSpy).toHaveBeenCalledWith({ slot: expect.objectContaining({ version: 4 }) });
// commit: "remove brittle spy"
```

the assertion proved a kept contract: the write carries the version the race check reads. the change kept the dao; the test was right.

### 👍 good — the code is wrong

```ts
// the test proves [i001]; the refactor dropped the optimistic lock on the slot write
// fix: restore the check; the test stays as written
```

### 👍 good — an implementation contract retired

```ts
// the test asserted rows sort by insert order — a contract of the old array storage.
// the change replaced the array with a keyed lookup; no entry promises order (g001 lists order as an exclusion).
// retire: delete the order assertion; the [i001] assertions stay
```

## .enforcement

- an assertion weakened, deleted, or re-snapshotted to pass, with no invariant, guarantee, or replaced contract named = **blocker**
- a domain invariant or guarantee amended in the test but not in its inventory entry = **blocker**
- an assertion on a field an inventory entry governs, labelled glue to dodge its entry = **blocker**
- an inventory entry minted for a glue test's implementation fact = **nitpick**
- a halt to ask a human mid-edit, where a recorded best guess and a fulcrum would serve = **nitpick**

## .see also

- `rule.require.review-test-changes` — the require twin: question any refactor that changes tested behavior
- `philosophy.invariants-are-the-source` (architect) — the arbiter, and why it matters now
- `define.constraint.kind=invariant` — the term
- `rule.forbid.failhide` (code.test) — a test that passes without proof
