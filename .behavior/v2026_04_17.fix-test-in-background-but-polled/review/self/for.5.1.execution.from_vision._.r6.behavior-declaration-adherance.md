# self-review r6: behavior-declaration-adherance

line-by-line review of hook against vision spec.

## vision requirements traced to code

### requirement 1: "block invocation with `run_in_background: true`"

**traced to lines 47-52:**
```bash
RUN_IN_BACKGROUND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.run_in_background // false')
if [[ "$RUN_IN_BACKGROUND" != "true" ]]; then
  exit 0  # allow foreground
fi
```

**why it holds:** extracts exact field name `run_in_background` from JSON. defaults to `false` if absent. only proceeds to block check if `true`.

---

### requirement 2: "git.repo.test must run in foreground" error message

**traced to line 89:**
```bash
echo "🛑 BLOCKED: git.repo.test must run in foreground"
```

**why it holds:** exact phrase from vision line 28 (minus "error:" prefix, replaced with emoji block).

---

### requirement 3: "use Bash without run_in_background" guidance

**traced to lines 94-100:**
```bash
echo "fix: remove run_in_background from your Bash tool call"
echo ""
echo "instead of:"
echo "  Bash(command: 'rhx git.repo.test ...', run_in_background: true)"
echo ""
echo "use:"
echo "  Bash(command: 'rhx git.repo.test ...')"
```

**why it holds:** shows the exact fix needed. actionable and specific.

---

### requirement 4: immediate error (edgecase from vision table)

**traced to line 103:**
```bash
exit 2
```

**why it holds:** exit 2 signals block to Claude Code. hook runs before command executes. immediate feedback.

---

### requirement 5: foreground works as designed (edgecase from vision table)

**traced to line 52:**
```bash
if [[ "$RUN_IN_BACKGROUND" != "true" ]]; then
  exit 0
fi
```

**why it holds:** any foreground invocation exits 0 (allow) before the block logic runs.

---

## summary

| vision requirement | code location | adherence |
|--------------------|---------------|-----------|
| check run_in_background | line 48 | exact field |
| error message | line 89 | matches phrase |
| guidance | lines 94-100 | actionable |
| immediate block | line 103 | exit 2 |
| foreground works | line 52 | exit 0 early |

all requirements trace to specific code. no deviations found.
