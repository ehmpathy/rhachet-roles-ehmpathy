# self-review round 7: has-snap-changes-rationalized (trace the data)

## objective

question deeper: did I actually verify the snapshot matches the source?

## trace the data flow

### step 1: what produces the output?

in `pretooluse.allow-rhx-skills.sh`, lines 91-97:

```bash
jq -n '{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "rhx skill auto-approved"
  }
}'
```

### step 2: what does jq -n produce?

`jq -n` outputs JSON with default pretty-print (2-space indent):

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "rhx skill auto-approved"
  }
}
```

### step 3: what does the test capture?

```typescript
const result = runHook(...);
expect(result.stdout).toMatchSnapshot();
```

`result.stdout` is the raw output from the hook — the jq output above.

### step 4: what's in the snapshot?

```
exports[`...then: output matches snapshot 1`] = `
"{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "rhx skill auto-approved"
  }
}"
`;
```

### step 5: does it match?

| source (jq -n) | snapshot |
|----------------|----------|
| `"hookSpecificOutput"` | `"hookSpecificOutput"` |
| `"hookEventName": "PreToolUse"` | `"hookEventName": "PreToolUse"` |
| `"permissionDecision": "allow"` | `"permissionDecision": "allow"` |
| `"permissionDecisionReason": "rhx skill auto-approved"` | `"permissionDecisionReason": "rhx skill auto-approved"` |

**exact match.**

## stability analysis

| field | source | dynamic? |
|-------|--------|----------|
| hookSpecificOutput | literal in bash | no |
| hookEventName | literal "PreToolUse" | no |
| permissionDecision | literal "allow" | no |
| permissionDecisionReason | literal string | no |

all fields are static literals. no timestamps, no generated ids, no environment variables.

**snapshot is stable.**

## why this holds

1. traced the data from source (hook line 91-97) to snapshot
2. verified the JSON structure matches character-for-character
3. confirmed all fields are static literals (no flaky content)
4. the snapshot accurately represents what the hook produces

this is a valid, stable, intentional snapshot.
