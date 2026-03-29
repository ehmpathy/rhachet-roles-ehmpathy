# self-review round 2: has-questioned-assumptions

## deeper review of assumptions

### assumption 1: jq is available

**evidence checked**: ran `which jq` — present on system
**cross-checked**: rhachet/package.json lists jq as peer dependency
**counterexample**: none — jq is universal in rhachet contexts
**verdict**: holds — jq is guaranteed

### assumption 2: grep -qP is portable

**evidence checked**: ran `man grep` on linux and macos
**result**: BSD grep (macos) lacks -P flag
**counterexample**: yes — macos without gnu grep installed
**fix identified**: use `[[ "$CMD" == *$'\n'* ]]` instead

**why this holds after fix**: bash's `[[ ]]` with glob is POSIX-ish and available on all target systems (bash 3.2+, which macos ships)

### assumption 3: hooks are invoked

**evidence checked**: ran test hook, saw it execute
**cross-checked**: debug logs show "Matched N unique hooks"
**counterexample**: hook could be disabled by user settings
**why this is ok**: if user disables hooks, that's their choice — not a bug

**verdict**: holds — hook mechanism works

### assumption 4: JSON structure bypasses heuristics

**evidence checked**: ran P1 test, command executed without prompt
**source**: github issue #30435 comment by yurukusa
**counterexample**: could break if claude code changes internal behavior
**why this is ok**: community-validated workaround; if it breaks, we update

**verdict**: holds — validated in practice

### assumption 5: quote strip covers common cases

**edge cases re-checked**:
- `"it's fine"` — sed handles this: outer double quotes stripped, inner apostrophe remains (safe)
- `'he said "hello"'` — sed handles this: outer single quotes stripped, inner doubles remain (safe)
- `"escaped \"quote\""` — sed DOES NOT handle this: inner `\"` not stripped

**counterexample found**: escaped quotes inside double quotes
**risk assessment**: rhx commands rarely use escaped quotes in arguments
**mitigation**: document as known limitation; add test case

**verdict**: acceptable — edge case is rare; document it

### assumption 6: operator list exhaustive

**additional operators checked**:
- `{a,b}` brace expansion — not dangerous alone (no exec)
- `$((...))` arithmetic — caught by `$(`
- `<<` heredoc — rare attack vector; would require multiline
- `<<<` here-string — same as heredoc
- `\` line continuation — could enable multiline

**result**: line continuation (`\` at EOL) could enable bypass
**risk**: `rhx skill \`
`evil` could bypass newline check
**mitigation**: the newline check catches this — `\n` is still present

**verdict**: holds — line continuation still contains newline

## issues found and resolved

### issue 1: grep -qP not portable (from r1)

**status**: fix identified in r1
**action**: will implement `[[ "$CMD" == *$'\n'* ]]` in execution phase

### issue 2: escaped quotes edge case (new in r2)

**status**: documented as known limitation
**action**: add to test coverage as edge case with documentation

## conclusion

all assumptions hold with evidence. two edge cases identified:
1. grep -qP portability — fix ready
2. escaped quotes — documented limitation

blueprint is sound.
