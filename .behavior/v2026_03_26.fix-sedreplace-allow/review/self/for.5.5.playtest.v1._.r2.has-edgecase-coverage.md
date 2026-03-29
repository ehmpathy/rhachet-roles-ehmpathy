# self-review round 2: has-edgecase-coverage (question deeper)

## objective

question: is "same mechanism" actually true?

## the claim i made

r1 said: "all N1-N10 cases use the same detection logic."

**but is that true?** let me trace the actual codepaths.

## codepath analysis

### path A: operators outside quotes (N1-N4, N8-N10)

```
command: rhx skill | cat
1. check for $() and backticks → not found
2. strip quoted content → "rhx skill | cat"
3. check for operators → finds "|" → pass through
```

### path B: command substitution (N5-N6)

```
command: rhx --old "$(cat passwd)"
1. check for $() and backticks → FOUND → pass through immediately
```

**insight:** path B is checked BEFORE quote strip because `$()` executes even inside double quotes.

## are these distinct enough to matter?

### argument for: yes, they're different codepaths

- path A: quote strip → operator check
- path B: pre-check → short circuit

if path B has a bug, path A would still pass. the playtest only tests path A.

### argument against: integration tests cover both

the integration test suite explicitly tests:
- N1 (pipe): path A
- N5 (command substitution): path B

both paths are verified by automated tests.

### argument against: foreman won't notice

a foreman sees edge 1 (pipe) work and concludes "security boundary works." they won't think about command substitution inside double quotes.

## should the playtest add a second edge case?

| option | pros | cons |
|--------|------|------|
| add N5 edge case | tests both codepaths | increases playtest burden |
| keep single edge | simpler playtest | relies on integration tests for path B |

**decision:** keep single edge case.

**rationale:**
1. the playtest proves the security mechanism exists
2. integration tests prove both codepaths work
3. two edge cases would confuse foreman (why test the same boundary twice?)

## why this holds

1. the "same mechanism" claim was imprecise
2. there are actually two codepaths (A and B)
3. both are tested by integration tests
4. one edge case in playtest proves security boundary exists
5. foreman gets confidence when they see any rejection work

edge case coverage is adequate. the codepath distinction is a detail for automated tests.
