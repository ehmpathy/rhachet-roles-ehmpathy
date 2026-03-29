# self-review round 8: has-ergonomics-validated

## objective

verify input/output matches what felt right at design time.

## no repros artifact

this behavior skipped the repros phase. ergonomics were defined in vision.md and blackbox criteria instead.

## input comparison

### planned input (from vision.md)

> mechanic runs: `rhx sedreplace --old '{ identity: keyPair.identity }' --new 'createTestContext(keyPair.identity)' --glob 'src/**/*.ts'`

### actual input

the hook reads from stdin (Claude Code format):
```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "rhx sedreplace --old '{ identity: x }' --new 'y' --glob 'src/**/*.ts'"
  }
}
```

**match: yes** — the command format is exactly what the user types.

## output comparison

### planned output (from vision.md)

> the command runs immediately without any permission prompt

### actual output

the hook outputs:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "rhx skill auto-approved"
  }
}
```

**match: yes** — this JSON tells Claude Code to skip the prompt.

## ergonomics analysis

### what the user experiences

| step | before | after |
|------|--------|-------|
| 1 | run command | run command |
| 2 | see permission prompt | (no prompt) |
| 3 | click allow | — |
| 4 | command runs | command runs |

**improvement: removed 2 steps (prompt + click)**

### what the mechanic sees

before: "This command requires approval" dialog

after: turtle vibes output from sedreplace skill

### ergonomics did not drift

the implementation matches the vision:
- input: same command the user always ran
- output: same sedreplace output (now without interruption)
- experience: friction removed as planned

## why this holds

1. no repros artifact, but vision.md defined the ergonomics clearly
2. input format unchanged (user types same command)
3. output format unchanged (same sedreplace output)
4. the only change is removal of the permission prompt

ergonomics match the design. no drift.
