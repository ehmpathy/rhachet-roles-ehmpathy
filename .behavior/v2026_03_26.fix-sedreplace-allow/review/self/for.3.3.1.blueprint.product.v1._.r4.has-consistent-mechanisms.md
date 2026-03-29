# self-review: has-consistent-mechanisms

## search for extant mechanisms

i searched for related codepaths in the codebase.

### extant mechanism 1: `appears_unquoted()` in pretooluse.forbid-suspicious-shell-syntax.sh

**location**: `src/domain.roles/mechanic/inits/claude.hooks/pretooluse.forbid-suspicious-shell-syntax.sh:73-108`
**purpose**: character-by-character parse to detect unquoted patterns
**blueprint approach**: sed strip + grep

**comparison**:
| aspect | extant `appears_unquoted()` | blueprint sed approach |
|--------|----------------------------|------------------------|
| accuracy | handles escaped quotes | does not handle escaped quotes |
| complexity | 35 lines | 1 line |
| performance | O(n*m) per pattern | O(n) total |
| purpose | block suspicious patterns | security filter for operators |

**should we reuse?**
- reuse would require source command or duplication
- source command adds dependency between hooks
- duplication violates DRY
- sed approach is simpler and fits our use case

**decision**: no — different mechanism for different purpose. sed is appropriate here.

**rationale**: rhx commands rarely contain escaped quotes. the sed approach handles common cases efficiently. if we find edge cases, we can enhance later.

### extant mechanism 2: JSON stdin parse pattern

**location**: multiple hooks use `$(cat)` + `jq -r '.tool_input.command'`
**blueprint approach**: same pattern

**should we reuse?**: yes — we already do. this is consistent.

### extant mechanism 3: exit code semantics

**location**: all hooks use exit 0 for pass-through, exit 2 for block
**blueprint approach**: exit 0 for allow and pass-through

**comparison**:
- block hooks: exit 2 = block, exit 0 = allow
- allow hooks: exit 0 with JSON = allow, exit 0 without JSON = pass-through

**should we reuse?**: yes — we follow the same semantics.

### extant mechanism 4: jq for JSON output

**location**: `test.pretooluse.allow-rhx-skills.sh` uses `jq -n`
**blueprint approach**: same pattern

**should we reuse?**: yes — we already do.

## mechanisms reviewed

| mechanism | extant? | decision |
|-----------|---------|----------|
| stdin parse | yes | reuse (already consistent) |
| quote-aware check | yes (`appears_unquoted`) | new approach (sed simpler) |
| exit codes | yes | reuse (already consistent) |
| JSON output | yes | reuse (already consistent) |

## duplication found

none.

the sed quote-strip approach is different from `appears_unquoted()`:
- different algorithm (bulk strip vs char-by-char)
- different purpose (security filter vs pattern block)
- different scope (operators vs specific patterns)

## conclusion

blueprint is consistent with extant mechanisms. the sed approach is a valid alternative to `appears_unquoted()` for our use case.
