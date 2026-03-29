# self-review round 5: has-contract-output-variants-snapped

## objective

verify each public contract has snapshots for all output variants.

## contract identification

this behavior creates one public contract:
- `pretooluse.allow-rhx-skills.sh` — a PreToolUse hook

## output variants

the hook has exactly TWO output variants:

| variant | stdout | exit code | when |
|---------|--------|-----------|------|
| allow | JSON with permissionDecision | 0 | rhx command, no operators |
| pass-through | empty | 0 | non-rhx, operators found, or error |

## snapshot coverage

### allow variant

snapshot file: `__snapshots__/pretooluse.allow-rhx-skills.integration.test.ts.snap`

content:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "rhx skill auto-approved"
  }
}
```

test: case22 "output matches snapshot"

### pass-through variant

**no snapshot needed** — pass-through produces empty stdout.

verified via tests:
- N1-N10: check `result.stdout === ''`
- E1-E4: check `result.stdout === ''`

empty output is verified by assertion, not by snapshot.

## why this holds

1. the allow variant has a snapshot
2. the pass-through variant has no output to snapshot
3. both variants are verified by tests
4. there are no other output variants

## snapshot enables vibecheck

reviewers can see in the snapshot:
- exact JSON structure required by Claude Code
- the field names (hookSpecificOutput, hookEventName, permissionDecision, permissionDecisionReason)
- the values ("PreToolUse", "allow", "rhx skill auto-approved")

if these change, the diff shows it.
