# self-review round 2: has-consistent-mechanisms

## objective

review for new mechanisms that duplicate extant functionality.

## review

### comparison: allow-rhx-skills.sh vs forbid-suspicious-shell-syntax.sh

| mechanism | extant (forbid-*) | new (allow-*) | analysis |
|-----------|-------------------|---------------|----------|
| stdin read | `cat` + `jq` | `cat` + `jq` | same pattern, correct |
| tool_name check | extract and check | extract and check | same pattern, correct |
| command extract | `jq -r '.tool_input.command'` | same | same pattern, correct |
| quote-aware check | `appears_unquoted()` function | `sed` strip + grep | different approach |

### quote-aware detection approaches

**extant (forbid-*)**: uses character-by-character parsing functions
- `appears_unquoted()` — tracks quote state char by char
- `appears_executable()` — treats double quotes as executable
- more sophisticated, handles edge cases

**new (allow-*)**: uses sed strip + grep
- strips all quoted content via `sed "s/'[^']*'//g" | sed 's/"[^"]*"//g'`
- checks operators in stripped output
- simpler, adequate for the usecase

**verdict**: the approaches differ intentionally:
- forbid-* needs to detect patterns INSIDE quotes for some types
- allow-* only needs to detect operators OUTSIDE quotes
- sed strip is simpler and sufficient for the allow-* usecase
- no duplication concern — different requirements

### should allow-* reuse forbid-* functions?

| option | pros | cons |
|--------|------|------|
| reuse functions | less code | adds coupling, functions are in bash not importable |
| keep separate | no coupling, simpler | minor duplication in stdin read |

**verdict**: keep separate. bash hooks cannot easily import functions across files. the stdin read pattern is minimal duplication (3 lines). the quote detection uses different approaches suited to each hook's requirements.

## conclusion

no problematic duplication. the hooks share basic input patterns (stdin read via cat+jq) which is the expected idiom for PreToolUse hooks. the quote-aware detection uses different approaches suited to each hook's requirements.

## non-issues confirmed

### why sed strip is not a downgrade from char-by-char parse

the sed approach is adequate because:
1. command substitution (`$()`, backticks) is checked BEFORE quote strip
2. only operators OUTSIDE quotes matter for allow-* decision
3. the sed approach correctly handles nested quotes (removes content, not quotes themselves)
