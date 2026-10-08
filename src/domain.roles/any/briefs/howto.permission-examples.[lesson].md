# howto: permission examples in permissions.jsonc

## .what

the `init.claude.permissions.jsonc` file contains explicit `Bash(...)` rows that appear redundant with broader patterns like `Bash(npx rhachet run --skill xyz:*)`.

these are not redundant — they serve a specific purpose.

## .why

example rows teach correct usage in two places:

- `rhx permissions.get --head <head>` lists every pre-approved pattern of a head, examples included
  (the session-start notice shows only each head and its count, and points there)
- when the HARDNUDGE hook blocks a command, it ranks the allowlist against the blocked part and
  shows the nearest patterns (at most 21). an example row that shares the blocked command's head
  or words ranks near it, so the agent sees the exact form it should have typed

example nudge output, for a bare `git commit -m "fix"` (the example rows are what rank):
```
✋ ConstraintError: this command is not paved
   ├─ blocked: git commit -m "fix"
   ├─ paved alternatives for `git commit`
   │  └─ printf '<message>' | rhx git.commit.set -m @stdin
   ├─ nearest paved patterns
   │  ├─ [e] echo $MESSAGE | rhx git.commit.set -m @stdin
   │  ├─ [e] echo $MESSAGE | rhx git.commit.set -m @stdin --mode apply
   │  └─ [e] echo $MESSAGE | rhx git.commit.set -m @stdin --mode apply --push
   │
   └─ key: [e] = the whole part must match exactly · [p] = the part must start with it

🐚 pave what recurs
   ├─ you will use it again? pave it
   ├─ a future traveler will need it? pave it
   ├─ a repo beyond this one will need it? pave it, and dispatch a task to teach upstream too
   └─ where? always start in .agent/repo=.this/role=any/skills/

🥥 did you know?
   ├─ 1. see all pre-approved commands: rhx permissions.get --for 'git commit -m "fix"'
   ├─ 2. a need that recurs deserves a paved rhx skill — pave it
   └─ 3. need this exact command once? retry it unchanged — that interrupts the human to ask
```

past 21 candidates across all parts, the render adds one line after the last part's section —
`├─ … and N more (see all: rhx permissions.get, below)` — never a `…` inside a list.

the example rows rank because `git` and `commit` are both dot-segments of `git.commit.set`, and
`-m` is a shared word — so an explicit row with the right flags is exactly what surfaces.

for a command with no allowlist neighbor at all, the hook's own inventory
(`commands.alternatives.jsonc`) names the paved alternative — an example row cannot help there.

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

- `pretooluse.check-permissions.sh` — the HARDNUDGE hook that ranks these patterns on a block
- `commands.alternatives.jsonc` — the inventory of paved alternatives for off-path commands
- `sessionstart.notify-permissions.sh` — the hook that shows each pre-approved head at session start
- `rhx permissions.get` — every pre-approved pattern on demand: all, one head, or one command
- `init.claude.permissions.jsonc` — where patterns are defined
