# rule.require.mcp-via-dotmcpjson

## .what

MCP (model context protocol) servers must be configured via `.mcp.json` in the project root, not via `.claude/settings.json`

## .why

claude code maintains two distinct configuration systems:
- **`settings.json`** — for permissions, preferences, tool approvals, hooks
- **`.mcp.json`** — for MCP server definitions

MCP configuration in `.claude/settings.json` is **not reliably loaded**. the official supported location for project-level MCP is `.mcp.json` in the project root.

## .how

### project-level (team-shared, version-controlled)

**step 1:** create `.mcp.json` in project root to define the servers:

```json
{
  "mcpServers": {
    "morph-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@morphllm/morphmcp"],
      "env": {
        "MORPH_API_KEY": "${MORPH_API_KEY}"
      }
    }
  }
}
```

**step 2:** enable the servers in `.claude/settings.json`:

```json
{
  "enabledMcpjsonServers": [
    "morph-mcp"
  ]
}
```

**step 3:** allow the MCP tools in `.claude/settings.json` permissions:

```json
{
  "permissions": {
    "allow": [
      "mcp__morph-mcp__edit_file"
    ]
  }
}
```

all three are required:
- `.mcp.json` — defines server configurations
- `.claude/settings.json` `enabledMcpjsonServers` — allowlists which servers to load
- `.claude/settings.json` `permissions.allow` — allowlists which MCP tools to auto-approve

### scope hierarchy

| scope | location | purpose |
|-------|----------|---------|
| project (shared) | `<project>/.mcp.json` | team-shared, version-controlled |
| local (private) | `~/.claude.json` under project path | personal, not committed |
| user (global) | `~/.claude.json` | all your projects |

claude code prioritizes: local > project > user

## .enforcement

- MCP config in `.claude/settings.json` = **BLOCKER**
- MCP config must be in `.mcp.json` at project root

## .sources

- [claude code mcp docs](https://code.claude.com/docs/en/mcp)
- [feature request: project-based MCP config #5350](https://github.com/anthropics/claude-code/issues/5350) — closed as "already supported via .mcp.json"
- [bug: local-scoped MCP not persisted #3341](https://github.com/anthropics/claude-code/issues/3341) — ollie-anthropic confirmed settings.json is not used for MCP
- [.claude/.mcp.json not loading #5037](https://github.com/anthropics/claude-code/issues/5037) — subdirectory location not supported
