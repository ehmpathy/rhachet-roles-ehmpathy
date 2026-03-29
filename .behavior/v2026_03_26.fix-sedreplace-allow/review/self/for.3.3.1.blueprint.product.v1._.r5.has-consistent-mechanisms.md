# self-review round 5: has-consistent-mechanisms

## deeper search for extant mechanisms

i searched for `jq -n` patterns in the codebase to find common utilities.

### discovery: `build_stdin_json()` test utility

**found in**:
- `pretooluse.forbid-suspicious-shell-syntax.test.sh:29-32`
- `pretooluse.forbid-stderr-redirect.test.sh:28-31`
- `pretooluse.forbid-terms.blocklist.test.sh:53-56`
- `pretooluse.forbid-terms.gerunds.test.sh:53-56`

**pattern**:
```bash
build_stdin_json() {
  local command="$1"
  jq -n --arg cmd "$command" '{tool_name: "Bash", tool_input: {command: $cmd}}'
}
```

**blueprint test approach**: uses inline JSON

**should we adopt?**: yes — this is a common pattern across all test files

**action**: update blueprint test to use `build_stdin_json()` utility

### re-check: sed quote strip vs `appears_unquoted()`

i reviewed this again with fresh eyes.

**key difference**:
- `appears_unquoted()` is for detection of specific patterns (e.g., `=(`)
- our sed strip is to remove ALL quoted content to check for operators

**these solve different problems**:
- `appears_unquoted()`: "is THIS PATTERN unquoted?"
- sed strip: "what remains after removal of ALL quoted strings?"

**verdict**: not duplication — different algorithms for different purposes. sed is correct choice.

### re-check: JSON output structure

**found pattern**: test hook uses:
```bash
jq -n '{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    ...
  }
}'
```

**blueprint uses**: same structure

**verdict**: consistent with validated pattern.

## issues found

### issue: test utility pattern not adopted

**status**: will add `build_stdin_json()` utility to test file
**action**: update blueprint test section to note this pattern

## non-issues confirmed

### sed vs appears_unquoted()

**why it holds**: different algorithms for different problems. sed removes content to check remainder; `appears_unquoted()` checks if specific pattern is unquoted. both are valid.

### JSON output structure

**why it holds**: matches community-validated structure from github issue #30435.

### stdin parse pattern

**why it holds**: `$(cat)` + `jq -r '.tool_input.command'` is universal in this codebase.

## conclusion

one pattern discovered: `build_stdin_json()` test utility. will adopt in test file for consistency. no duplication of core mechanisms.
