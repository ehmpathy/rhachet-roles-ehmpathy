# self-review round 6: has-contract-output-variants-snapped (question deeper)

## objective

question myself: did I miss any output variants?

## the skeptical question

I claimed the hook has exactly TWO output variants. is that true? could there be a third?

### enumerate all code paths

| code path | stdout | exit code | variant |
|-----------|--------|-----------|---------|
| tool_name != Bash | empty | 0 | pass-through |
| command empty | empty | 0 | pass-through |
| command no rhx prefix | empty | 0 | pass-through |
| command has $() or backtick | empty | 0 | pass-through |
| command has newline | empty | 0 | pass-through |
| command has operator outside quotes | empty | 0 | pass-through |
| command is safe rhx | JSON | 0 | allow |
| stdin malformed (jq fails) | empty | 0 | pass-through |
| stdin empty | empty | 0 | pass-through |

**conclusion: there are exactly two output variants.**

all non-allow paths produce empty stdout. there is no third variant.

### could jq failure produce stderr?

if jq fails, its stderr goes to the hook's stderr. but:
- the hook does not redirect stderr
- Claude Code ignores hook stderr unless hook returns non-zero
- the hook always exits 0

so jq stderr is not a "visible" output variant from Claude Code's perspective.

### could bash errors produce output?

`set -euo pipefail` means the hook exits on error. but:
- jq failures are caught with `|| true` and default values
- no other commands can fail (grep, sed are on simple inputs)
- even if an error occurred, exit code would be non-zero, Claude Code would ignore output

so bash errors are not a visible output variant.

## snapshot coverage check

| variant | how verified | snapshot? |
|---------|--------------|-----------|
| allow | case22: `result.stdout` matches snapshot | YES |
| pass-through | N1-N10, E1-E4: `result.stdout === ''` | NO (empty output has no structure to snapshot) |

### why pass-through needs no snapshot

a snapshot of empty string would look like:

```
exports[`case empty`] = `""`;
```

this adds no value:
- no structure to vibecheck
- no drift to detect (empty is empty)
- assertions already verify `expect(result.stdout).toBe('')`

### what the allow snapshot enables

the snapshot captures:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "rhx skill auto-approved"
  }
}
```

this enables:
- vibecheck: reviewer sees exact JSON structure
- drift detection: field changes surface in PR diffs
- contract verification: structure matches Claude Code expectations

## why this holds

1. I enumerated all code paths — exactly two output variants
2. allow variant has snapshot — structure is captured
3. pass-through variant has empty output — no structure to snapshot
4. error cases fall through to pass-through — fail-safe by design
5. the two variants cover 100% of possible outputs

no missing variants. snapshot coverage is complete for what can be snapped.
