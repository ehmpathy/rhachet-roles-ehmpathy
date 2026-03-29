# research: claude code suspicious bash syntax patterns

## .what

this document enumerates the bash syntax patterns that claude code considers "suspicious" and triggers permission prompts for, based on official documentation, github issues, and security research.

## .sources

1. [Claude Code Security Docs](https://code.claude.com/docs/en/security)
2. [GitHub Issue #30435 - Allow suppression of bash safety heuristic prompts](https://github.com/anthropics/claude-code/issues/30435)
3. [GitHub Issue #28183 - Compound commands trigger incorrect safety reason](https://github.com/anthropics/claude-code/issues/28183)
4. [GitHub Issue #27957 - Quoted characters in flag names](https://github.com/anthropics/claude-code/issues/27957)
5. [GitHub Issue #31373 - Command substitution in system prompt](https://github.com/anthropics/claude-code/issues/31373)
6. [GitHub Issue #6660 - Pipe character in regex patterns](https://github.com/anthropics/claude-code/issues/6660)
7. [Flatt Security Research - 8 Ways to Exploit Claude Code](https://flatt.tech/research/posts/pwning-claude-code-in-8-different-ways/)

## .enumerated patterns (confirmed)

these patterns are confirmed to trigger permission prompts based on github issues and documentation:

### 1. command substitution `$(...)`

- **source**: issue #31373, issue #30435, flatt security
- **why blocked**: executes nested commands with potential side effects
- **example**: `git commit -m "$(cat << 'EOF' ... EOF)"`
- **note**: claude code's own system prompt encourages this pattern for commits, which causes self-inflicted prompt spam

### 2. backtick command substitution `` `...` ``

- **source**: issue #30435, flatt security
- **why blocked**: same as `$()`, executes nested commands
- **example**: `` echo `date` ``

### 3. newlines that separate commands

- **source**: issue #30435, flatt security
- **why blocked**: prevents multi-line command injection
- **example**: `cmd1\ncmd2`

### 4. quoted characters in flag names

- **source**: issue #27957, issue #28183
- **why blocked**: potential obfuscation of flag values
- **example**: `git commit -m "message"` triggers "Command contains quoted characters in flag names"
- **note**: this is a false-positive-heavy heuristic that breaks normal git workflows

### 5. compound commands with `&&`

- **source**: issue #28183
- **why blocked**: chained commands bypass individual allow rules
- **example**: `git status && echo "---" && pwd`
- **note**: even when each individual command is allowed, the compound triggers a prompt

### 6. pipe character `|` (even in regex)

- **source**: issue #6660
- **why blocked**: interpreted as bash pipe, not regex alternation
- **example**: `grep -E '(foo|bar)'` - the `|` inside regex triggers false positive
- **workaround**: chain multiple grep commands instead

## .heuristic categories (from issue #30435 comments)

issue #30435 mentions these categories that users want to configure:

1. `commandSubstitution` - `$()` and backticks
2. `newlines` - multi-line commands
3. `ansiQuoting` - ANSI-C `$'...'` syntax
4. `ambiguousSyntax` - catch-all for other suspicious patterns

## .patterns from flatt security research

additional patterns blocked to prevent injection:

1. **shell metacharacters**: `<>()$`|{}&;` blocked in arguments
2. **dangerous command flags**:
   - `man -P`, `--pager`, `--html`
   - `sort -o`, `--output`
   - `git ls-remote --upload-pack`
   - `sed -i`, `--in-place`
3. **variable expansion**: `${VAR="value"}` with modifiers like `@P`
4. **IFS expansion**: `$IFS` usage to obscure arguments

## .detected by human in usage

these patterns were not found in official claude code documentation, but were detected by human observation to trigger permission prompts:

- `=(` zsh process substitution - triggers shell expansion warnings
- `<(` / `>(` bash process substitution - triggers shell expansion warnings
- consecutive quotes at word start (e.g., `''value`, `""value`) - confuses quote parser

## .conclusion

based on research, claude code's bash safety heuristics focus on:

1. **command substitution** (`$()`, backticks) - confirmed, primary concern
2. **newlines** - confirmed
3. **quoted characters in flags** - confirmed, high false positive rate
4. **compound commands** - confirmed
5. **pipe character** - confirmed, even inside regex patterns
6. **ANSI-C quote syntax** - mentioned in heuristic categories but not detailed

the zsh/bash process substitution patterns (`=(`, `<(`, `>(`) and consecutive quotes at word start are not documented in claude code sources, but have been observed by humans to trigger permission prompts in practice.

## .recommendation

for the pretooluse hook, we should focus on patterns that are:

1. **confirmed** to trigger claude code prompts (to preempt them)
2. **actually dangerous** (not just false positives)

patterns to block:
- `$()` and backticks - confirmed, actually execute commands
- `$'` ANSI-C quote syntax - mentioned in heuristic categories
- `=(`, `<(`, `>(` - detected by human in usage
- consecutive quotes at word start - detected by human in usage

## .workaround: PreToolUse hook to bypass safety heuristics

**source**: [GitHub Issue #30435 comment by yurukusa (2026-03-24)](https://github.com/anthropics/claude-code/issues/30435#issuecomment-4114670342)

a PreToolUse hook can override safety heuristics if it returns `permissionDecision: "allow"` in a specific JSON format:

```bash
#!/bin/bash
CMD=$(cat | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$CMD" ] && exit 0

# match commands you want to auto-approve
if echo "$CMD" | grep -qE '^\\s*(npx rhachet|rhx)'; then
    jq -n '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","permissionDecisionReason":"rhx skill auto-approved"}}'
fi
exit 0
```

**critical JSON structure**:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "reason here"
  }
}
```

**key insight**: the `hookSpecificOutput` wrapper and `hookEventName` field are required. earlier research found issues with simpler JSON formats — this specific structure reportedly bypasses safety heuristic prompts.

**status**: community workaround, not officially documented by anthropic. needs validation.

