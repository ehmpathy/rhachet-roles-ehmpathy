# rule.require.skill-output-streams

## .what

skill output must always go to stdout. on errors, output must also go to stderr.

## .why

max observability:
- stdout is visible in terminal for all cases
- stderr captures errors for log aggregation and error streams
- both streams ensure output is never lost

## .pattern

### success: stdout only

```bash
output_success "$WHAT" "$LOG_PATH"
```

### failure: both stdout and stderr

```bash
output_failure "$WHAT" "$LOG_PATH" | tee /dev/stderr
```

the `tee /dev/stderr` pattern sends output to both streams.

## .examples

### good

```bash
# success case - stdout only
if [[ "$HAS_ERRORS" == "false" ]]; then
  output_success "$WHAT" "$REL_STDOUT_LOG" "$REL_STDERR_LOG"
  exit 0
fi

# failure case - both streams
if [[ "$HAS_ERRORS" == "true" ]]; then
  output_failure "$WHAT" "$REL_STDOUT_LOG" "$REL_STDERR_LOG" | tee /dev/stderr
  exit 2
fi

# validation error - both streams
if [[ -z "$REQUIRED_ARG" ]]; then
  {
    print_turtle_header "bummer dude..."
    print_tree_start "skill-name"
    echo "   └─ error: --required-arg is required"
  } | tee /dev/stderr
  exit 2
fi
```

### bad

```bash
# bad: success to stderr only (invisible in terminal)
output_success "$WHAT" "$LOG_PATH" >&2

# bad: failure to stderr only (invisible in terminal)
output_failure "$WHAT" "$LOG_PATH" >&2

# bad: error to stderr only
{
  echo "error: task broke"
} >&2
```

## .rule

| case | stdout | stderr |
|------|--------|--------|
| success | yes | no |
| failure | yes | yes |
| validation error | yes | yes |
| malfunction | yes | yes |

## .enforcement

- skill output to stderr only = blocker
- error output without stdout = blocker
