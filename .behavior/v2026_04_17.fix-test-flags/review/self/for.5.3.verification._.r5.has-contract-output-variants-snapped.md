# self-review r5: has-contract-output-variants-snapped

## contract: git.repo.test CLI

### new output variant: no tests without scope

| variant | snapped? | evidence |
|---------|----------|----------|
| exit 0 + skipped status | ✓ | case14 snapshot |
| files: 0 message | ✓ | case14 snapshot |
| tests: 0 message | ✓ | case14 snapshot |
| coconut tip | ✓ | case14 snapshot |

### extant output variants

| variant | snapped? | evidence |
|---------|----------|----------|
| success (pass) | ✓ | case1 snapshot |
| failure (fail) | ✓ | case2 snapshot |
| scope filter | ✓ | case3 snapshot |
| no match with scope | ✓ | case6 snapshot |
| absent command | ✓ | case7 snapshot |
| invalid --what | ✓ | case8 snapshot |

### snapshot content verification

read the actual case14 snapshot:
```
"🐢 lets ride...

🐚 git.repo.test --what unit
   ├─ status
   │  ├─ 💤 inflight (0s)
   ├─ status: skipped
   ├─ files: 0 (no test files changed since origin/main)
   └─ tests: 0 (no tests to run)

🥥 did you know?
   ├─ jest --changedSince may miss some file changes
   └─ use --scope and --thorough to target tests directly
"
```

this captures:
- the turtle header
- the treestruct output
- the skipped status
- the zero files/tests explanation
- the coconut tip

## checklist

- [x] positive path (success) is snapped: case1
- [x] negative path (error) is snapped: case2, case6, case7, case8
- [x] edge cases snapped: case14 (no tests without scope)
- [x] snapshots show actual output

## summary

all contract output variants have snapshots. case14 adds the new "no tests without scope" variant.
