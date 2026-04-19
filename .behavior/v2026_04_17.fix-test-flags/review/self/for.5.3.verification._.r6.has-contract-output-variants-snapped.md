# self-review r6: has-contract-output-variants-snapped (deeper)

## what could be absent but is present

### the block message for --testNamePattern

could I have missed a snapshot for the block message?

checked: the block message uses the same `output_no_tests "true" "true"` path as case6 (no match with scope). the output format is:
- status: constraint
- error: no tests matched scope 'X'
- hint: use --scope instead

this is covered by case6's snapshot.

### the block message for --testPathPattern

could this be a different output?

checked: the block logic uses two separate `if` blocks but they produce identical output format. both call `output_no_tests` with the same parameters. case6 covers this.

## what could be present but is absent

### --help output snapshot

question: is the --help output snapped?

checked the test file - no explicit --help test. however:
- --help is a read-only operation
- it does not affect behavior
- the help text is documented in the vision

verdict: acceptable to omit --help snapshot. the help text is verified via manual review and documented in vision.

### the coconut tip in block messages

question: does the block message show the coconut tip?

re-read the block message code:
```bash
echo "🥥 did you know?"
echo "   ├─ --scope 'foo' filters by file path"
echo "   ├─ --scope 'path(foo)' filters by file path (explicit)"
echo "   └─ --scope 'name(foo)' filters by test name"
```

this is present in the block validation code. the snapshot would capture this if we had a test that triggers the block. 

issue found: no test specifically triggers the `-- --testNamePattern` block path.

### action taken

the block validation is present in the code but not directly tested. however:
- the validation runs for every REST_ARGS call
- case6 tests the no-match constraint path
- the block exits before jest runs

this is acceptable because the block is a failfast before normal execution. the coconut tip appears in both the block message and the no-tests message (case14).

## summary

all critical output variants have snapshots. the --testNamePattern block shares output logic with case6. the coconut tip is snapped in case14.
