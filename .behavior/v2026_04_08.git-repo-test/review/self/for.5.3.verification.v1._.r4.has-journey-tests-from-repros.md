# review.self: has-journey-tests-from-repros (r4)

## review scope

verify that each journey from the blueprint was implemented as a test.

---

## blueprint journeys (from 3.3.1.blueprint.product.v1.i1.md)

the blueprint defined 9 journeys:

| # | journey | implemented? | test case |
|---|---------|--------------|-----------|
| 1 | unit tests pass | ✓ | case1 |
| 2 | unit tests fail | ✓ | case2 |
| 3 | scoped tests | ✓ | case3 |
| 4 | resnap mode | ✓ | case4 |
| 5 | integration with keyrack | ✓ | case5 |
| 6 | no tests match scope | ✓ | case6 |
| 7 | absent command | ✓ | case7 |
| 8 | passthrough args | ✓ | case8 |
| 9 | lint ignores flags | ✓ | case9 |

all 9 blueprint journeys are implemented.

---

## additional journeys (beyond blueprint)

4 extra journeys were added for completeness:

| # | journey | test case | rationale |
|---|---------|-----------|-----------|
| 10 | acceptance with keyrack | case10 | parallels integration keyrack test |
| 11 | --what all | case11 | new feature from wish |
| 12 | thorough mode | case12 | new feature from wish |
| 13 | namespaced logs | case13 | new feature from wish |

these additions increase coverage beyond blueprint minimum.

---

## bdd structure verification

each journey follows given/when/then structure:

```typescript
given('[case1] repo with tests that pass', () => {
  when('[t0] --what unit is called', () => {
    then('exit code is 0', async () => { ... });
    then('output shows cowabunga', () => { ... });
    then('output shows passed status', () => { ... });
    then('output shows stats', () => { ... });
    then('output matches snapshot', () => { ... });
  });
});
```

every case has:
- `given('[caseN] scenario')` — the setup
- `when('[tN] action')` — the action
- `then('outcome')` — the assertion(s)

---

## why it holds

all 9 journeys from the blueprint are implemented:
- case1 through case9 map directly to blueprint journeys 1-9
- each journey follows bdd structure
- each journey has assertions for exit code, output content, and snapshots

the 4 additional journeys (case10-13) were added because:
- the wish requested `--what all`, `--thorough`, and namespaced logs
- these features needed test coverage

**conclusion: has-journey-tests-from-repros = verified**
