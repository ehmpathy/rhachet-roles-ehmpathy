# self-review r4: has-consistent-conventions

deeper review of convention match.

## no issues found - articulate why each holds

### file name: `pretooluse.forbid-test-background.sh`

**why it holds:**
- prefix `pretooluse.` indicates hook type (PreToolUse)
- `forbid-` indicates this hook blocks (vs `check-` which warns)
- `test-background` describes what is forbidden: test commands in background
- `.sh` indicates shell executable

pattern is identical to `pretooluse.forbid-stderr-redirect.sh`.

### variable names

**why they hold:**
- `STDIN_INPUT` - exact match to extant hooks
- `TOOL_NAME` - new but follows SCREAMING_SNAKE
- `RUN_IN_BACKGROUND` - new but follows SCREAMING_SNAKE
- `COMMAND` - exact match to extant hooks
- `IS_TEST_SKILL` - new boolean flag, follows SCREAMING_SNAKE

no divergence from SCREAMING_SNAKE convention.

### error message format

**why it holds:**
- starts with `🛑 BLOCKED:` - exact match to extant
- brief description on same line
- blank line, then explanation
- blank line, then actionable guidance
- format uses code examples like extant hooks

### hook registration

**why it holds:**
- registered in `getMechanicRole.ts` under `hooks.onBrain.onTool`
- uses same object structure: `{ command, timeout, filter }`
- filter matches extant: `{ what: 'Bash', when: 'before' }`

no divergence found. all conventions match.
