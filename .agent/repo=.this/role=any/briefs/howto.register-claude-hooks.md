# how to register Claude Code hooks

## .what

hooks are shell commands that run in response to Claude Code events (session start, tool use, stop).

## .why

hooks enable guardrails, automation, and custom behavior without changes to Claude Code itself.

## .how

### 1. create the hook executable

place in `src/domain.roles/{role}/inits/claude.hooks/`:

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
rhachet init --hooks --roles mechanic
```

this syncs hooks from the role definition to `.claude/settings.json`.

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

## .summary

1. create hook in `inits/claude.hooks/`
2. register in `get{Role}Role.ts` under `hooks.onBrain.onTool`
3. rebuild and reinit to activate
