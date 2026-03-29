# self-review round 8: has-behavior-declaration-adherance

## objective

verify r7's identified issue (command substitution detection order) is resolved and the blueprint correctly adheres to vision.

## issue from r7: command substitution detection

**r7 found**: `$(...)` and backticks inside quotes would be stripped before detection, which would incorrectly allow dangerous commands like `rhx --old "$(cat passwd)"`.

**vision requires (N5, N6)**: command substitution must NOT be auto-approved regardless of quote context.

**why bash semantics matter**: bash expands `$(...)` and backticks BEFORE the command runs. double quotes do NOT prevent expansion:
```bash
echo "$(whoami)"  # prints username, not literal $(whoami)
```

only single quotes prevent expansion:
```bash
echo '$(whoami)'  # prints literal $(whoami)
```

## corrected detection logic

the fix separates command substitution from other operators:

```
codepath tree (corrected):
├── extract command
├── check for command substitution FIRST (before any quote strip)
│   ├── if $( found anywhere → exit 0 (reject)
│   └── if backtick found anywhere → exit 0 (reject)
├── strip quotes for other operators
│   ├── remove single-quoted strings
│   └── remove double-quoted strings
├── check for shell operators in stripped output
│   ├── pipe |
│   ├── semicolon ;
│   └── etc.
└── if no dangerous patterns → output allow JSON
```

## verification against test cases

### N5: `rhx --old "$(cat passwd)"`

**before fix**:
1. strip `"$(cat passwd)"` → `rhx --old `
2. check for `$(` → not found
3. incorrectly allows

**after fix**:
1. check for `$(` in full command → found
2. exit 0 immediately (reject)
3. correctly rejects

### N6: `` rhx --old "`id`" ``

**before fix**:
1. strip `` "`id`" `` → `rhx --old `
2. check for backtick → not found
3. incorrectly allows

**after fix**:
1. check for backtick in full command → found
2. exit 0 immediately (reject)
3. correctly rejects

### P1: `rhx sedreplace --old '{ identity: x }'`

**after fix**:
1. check for `$(` → not found
2. check for backtick → not found
3. strip quotes → `rhx sedreplace --old `
4. check operators → none found
5. output allow JSON
6. correctly allows

## blueprint update summary

the codepath tree and quote-aware detection sections need this update:

```markdown
## codepath tree (updated)

├── check for command substitution (BEFORE quote strip)
│   ├── $( → exit 0 (reject)
│   └── ` → exit 0 (reject)
├── strip quoted content for other operators
├── check for operators in stripped output
└── if clean → output allow JSON
```

## non-issues confirmed

### other operator detection

**why it holds**: pipe, semicolon, `&&`, `||`, redirects, process substitution are all "outer" operators — they don't execute inside quotes. quote-strip-then-check is correct for these.

### single-quoted command substitution

**example**: `rhx --old '$(whoami)'`

**why safe**: single quotes DO prevent bash expansion. but our check detects `$(` anyway.

**is this too strict?**: slightly. a human could argue `'$(whoami)'` is literally the string. but:
1. it's safer to reject
2. the user can still approve manually
3. to distinguish quote types in sed is complex

**verdict**: acceptable strictness

## conclusion

r7's identified issue is now addressed. the corrected logic detects command substitution before quote strip, which adheres to vision requirements N5 and N6. the fix will be applied in the execution phase.
