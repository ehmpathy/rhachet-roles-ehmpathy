# howto: permission examples in permissions.jsonc

## .what

the `init.claude.permissions.jsonc` file contains explicit `Bash(...)` rows that appear redundant with broader patterns like `Bash(npx rhachet run --skill xyz:*)`.

these are not redundant — they serve a specific purpose.

## .why

when Claude Code blocks a command via the HARDNUDGE hook, it displays all pre-approved permission patterns to the agent. this teaches the agent available patterns it can use instead.

example nudge output:
```
🛑 BLOCKED: This command is not covered by pre-approved permissions.

Before requesting user approval, check if you can accomplish this task using one of these pre-approved patterns:

([e] = exact match, [p] = prefix match)

  • [p]: npx rhachet run --skill git.commit.set
  • [e]: echo $MESSAGE | npx rhachet run --skill git.commit.set -m @stdin
  • [e]: echo $MESSAGE | npx rhachet run --skill git.commit.set -m @stdin --mode apply
  • [e]: echo $MESSAGE | npx rhachet run --skill git.commit.set -m @stdin --mode apply --push
  ...
```

## .the pattern

```jsonc
{
  "permissions": {
    "allow": [
      // broad pattern — covers all variations
      "Bash(npx rhachet run --skill git.commit.set:*)",

      // explicit examples — shown in nudge output to teach correct usage
      "Bash(echo $MESSAGE | npx rhachet run --skill git.commit.set -m @stdin)",
      "Bash(echo $MESSAGE | npx rhachet run --skill git.commit.set -m @stdin --mode apply)",
      "Bash(echo $MESSAGE | npx rhachet run --skill git.commit.set -m @stdin --mode apply --push)"
    ]
  }
}
```

## .when to add examples

add explicit example rows when:
- the skill has a non-obvious invocation pattern (e.g., stdin piping)
- the skill has common flag combinations worth prompting
- new agents need to learn correct usage patterns

## .when not to add examples

skip explicit rows when:
- the skill usage is obvious from the prefix pattern
- the skill has no flags or variations
- the examples would clutter the nudge output without adding clarity

## .see also

- `pretooluse.check-permissions.sh` — the HARDNUDGE hook that displays these patterns
- `init.claude.permissions.jsonc` — where patterns are defined
