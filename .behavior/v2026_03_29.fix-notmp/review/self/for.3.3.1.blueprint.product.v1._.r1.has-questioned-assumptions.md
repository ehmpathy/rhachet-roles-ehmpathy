# self-review r1: has-questioned-assumptions

## assumption 1: Bash command prefix patterns work as expected

**what we assume**: `Bash(cat /tmp/claude:*)` will auto-allow `cat /tmp/claude-1000/...`

**what if opposite?** if the pattern doesn't match, reads will still prompt

**evidence?** yes — extant patterns in settings.json use same format
- citation: `"Bash(cat:*)"` already works for any cat command
- `/tmp/claude` prefix is a narrower version of same pattern

**verdict: holds** — pattern format is proven

---

## assumption 2: hook exit code 2 blocks the operation

**what we assume**: exit 2 from PreToolUse hook causes Claude Code to block the tool call

**what if opposite?** if exit 2 doesn't block, writes would proceed

**evidence?** yes — extant hooks use this pattern
- citation: pretooluse.forbid-terms.gerunds.sh line 313: `exit 2`
- citation: pretooluse.check-permissions.sh line 373: `exit 2  # Exit 2 = block with error message`

**verdict: holds** — proven by extant hooks

---

## assumption 3: Write/Edit file_path extraction works

**what we assume**: jq can extract `.tool_input.file_path` from stdin JSON

**what if opposite?** if extraction fails, we can't detect /tmp paths

**evidence?** yes — extant hooks use same extraction
- citation: pretooluse.forbid-terms.gerunds.sh line 46-47:
  ```bash
  FILE_PATH=$(echo "$STDIN_INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")
  ```

**verdict: holds** — proven by extant hooks

---

## assumption 4: Bash output redirect detection is reliable

**what we assume**: regex can detect `> /tmp/` or `>> /tmp/` in commands

**what if opposite?** complex commands might evade detection

**potential exceptions**:
- quoted paths: `> "/tmp/foo"`
- heredocs: `cat << EOF > /tmp/foo`
- pipes: `cmd | tee /tmp/foo`
- backgrounded: `cmd > /tmp/foo &`

**assessment**: some edge cases may evade. but:
- simple cases (majority) will be caught
- evasion requires intentional complexity
- HARDNUDGE could catch retries (but not used)

**verdict: acceptable** — covers common cases, imperfect coverage is acceptable

---

## assumption 5: .temp/ is always valid target

**what we assume**: .temp/ is gitignored and always available as alternative

**what if opposite?** if .temp/ isn't gitignored, files would be committed

**evidence?** yes — verified in vision research
- citation: .gitignore line 9 shows `.temp`

**verdict: holds** — proven by repo inspection

---

## assumption 6: internal Claude writes bypass hooks

**what we assume**: agent task writes to /tmp/claude* don't go through PreToolUse hooks

**what if opposite?** if internal writes trigger hooks, agent tasks would break

**evidence?** logical inference — hooks intercept tool calls, not internal operations
- Claude Code manages its own temp via internal file operations
- PreToolUse hooks only intercept tool calls from claude-to-user conversation

**verdict: holds** — hooks only intercept tool calls

---

## assumption 7: one hook is sufficient (no order dependency)

**what we assume**: the /tmp blocker hook can run independently of other hooks

**what if opposite?** if order matters, we might block before permissions check

**assessment**: current PreToolUse hooks run in sequence. order in settings.json matters.

**consideration**: put /tmp blocker early in hook list so it blocks before other hooks waste time

**verdict: no issue** — order doesn't affect correctness, only efficiency

---

## issues found and fixed

none — assumptions are valid

---

## non-issues (why they hold)

1. **permission pattern format**: proven by extant config
2. **exit code semantics**: proven by extant hooks
3. **JSON extraction**: proven by extant hooks
4. **regex detection**: covers common cases, imperfect is acceptable
5. **.temp/ gitignore**: verified by repo inspection
6. **internal writes**: hooks only intercept tools
7. **hook order**: doesn't affect correctness
