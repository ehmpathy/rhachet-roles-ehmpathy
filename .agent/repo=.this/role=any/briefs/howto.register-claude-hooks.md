# how to register Claude Code hooks

## .what

hooks are shell commands that run in response to Claude Code events (session start, tool use, stop).

## .why

hooks enable guardrails, automation, and custom behavior without changes to Claude Code itself.

## .how

### 1. create the hook executable

place in `src/domain.roles/{role}/inits/claude.hooks/`:

**CRITICAL: make it executable!**
```bash
chmod +x src/domain.roles/{role}/inits/claude.hooks/pretooluse.my-hook.sh
git add src/domain.roles/{role}/inits/claude.hooks/pretooluse.my-hook.sh
```

Claude Code silently ignores non-executable hooks. verify with:
```bash
git ls-files -s path/to/hook.sh
# should show 100755, NOT 100644
```

```bash
# src/domain.roles/mechanic/inits/claude.hooks/pretooluse.my-hook.sh
#!/usr/bin/env bash
set -euo pipefail

# read JSON from stdin (Claude Code format)
STDIN_INPUT=$(cat)

# extract command (for Bash hooks)
COMMAND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.command // empty')

# your logic here...

# exit 0 = allow, exit 2 = block
exit 0
```

### 2. register in the role definition

add to `src/domain.roles/{role}/get{Role}Role.ts`:

```typescript
export const ROLE_MECHANIC: Role = Role.build({
  // ...
  hooks: {
    onBrain: {
      onTool: [
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.my-hook',
          timeout: 'PT5S',
          filter: { what: 'Bash', when: 'before' },
        },
        // ... other hooks
      ],
    },
  },
});
```

### 3. rebuild and reinit

```bash
npm run build
npx rhachet init --hooks --roles mechanic
```

this command inits both the role and its hooks. it writes them to `.claude/settings.json`.

note: `npx rhachet roles init --role mechanic` only inits permissions, not hooks. use `--hooks` flag to include hooks.

## hook types

| event | filter.when | trigger |
|-------|-------------|---------|
| onBoot | - | session start |
| onTool | before | pre-tool execution (can block) |
| onTool | after | post-tool execution |
| onStop | - | session end |

## filter.what patterns

- `Bash` - bash commands
- `Write|Edit` - file writes and edits
- `WebFetch` - web fetches
- `EnterPlanMode` - plan mode entry
- `*` - all tools

## exit codes

- `exit 0` - allow (continue)
- `exit 2` - block (deny with error message to stderr)

## stdin format

Claude Code passes JSON to hooks:

```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "ls -la"
  }
}
```

## file name conventions

| prefix | purpose |
|--------|---------|
| `pretooluse.*` | runs before tool, can block |
| `posttooluse.*` | runs after tool |
| `sessionstart.*` | runs on session start |

## troubleshoot: hook does not run

if your hook is registered but does not fire:

1. **check executable bit** (most common cause)
   ```bash
   git ls-files -s path/to/hook.sh
   # 100644 = NOT executable (broken)
   # 100755 = executable (correct)
   ```
   fix: `chmod +x path/to/hook.sh && git add path/to/hook.sh`

2. **check symlink exists**
   ```bash
   file .agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/your-hook.sh
   ```

3. **rebuild and relink**
   ```bash
   npm run build && npx rhachet roles link --role mechanic
   ```

Claude Code silently ignores hooks that fail to execute. no error, no log — just skipped.

## .summary

1. create hook in `inits/claude.hooks/`
2. **chmod +x the hook file** (critical!)
3. register in `get{Role}Role.ts` under `hooks.onBrain.onTool`
4. `npm run build && npx rhachet init --hooks --roles mechanic`
