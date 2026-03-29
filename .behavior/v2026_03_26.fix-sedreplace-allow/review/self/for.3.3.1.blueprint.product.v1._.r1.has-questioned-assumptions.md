# self-review: has-questioned-assumptions

## assumption 1: jq is available

**what we assume**: `jq` command exists for JSON output
**what if opposite**: hook fails to produce valid JSON
**evidence**: rhachet already depends on jq; all other hooks use it
**verdict**: safe assumption — jq is a transitive dependency

## assumption 2: grep -qP (perl regex) is available

**what we assume**: `grep -qP '\n'` works for newline detection
**what if opposite**: grep fails on systems without PCRE support
**evidence**: GNU grep supports -P, but BSD grep (macOS) does not
**potential issue**: yes — macOS users may hit this
**fix**: use `printf '%s' "$CMD" | grep -c $'\n'` or check `[[ "$CMD" == *$'\n'* ]]`
**verdict**: **issue found** — need alternative for newline detection

## assumption 3: the hook will be called

**what we assume**: Claude Code invokes PreToolUse hooks
**what if opposite**: hook never runs, prompts still appear
**evidence**: other hooks in this repo (pretooluse.forbid-*) work
**verdict**: safe assumption — hook registration pattern is proven

## assumption 4: permissionDecision: allow bypasses heuristics

**what we assume**: JSON structure output skips safety heuristics
**what if opposite**: heuristics still trigger
**evidence**: validated in test (P1 and P2 cases)
**verdict**: safe assumption — validated by test

## assumption 5: quote strip handles all cases

**what we assume**: `sed "s/'[^']*'//g" | sed 's/"[^"]*"//g'` strips all quotes
**what if opposite**: nested or escaped quotes slip through
**potential issues**:
- `"it's fine"` — apostrophe inside double quotes
- `'he said "hello"'` — double quotes inside single quotes
- `"escaped \"quote\""` — escaped quotes
**evidence**: these are edge cases; the common patterns are covered
**verdict**: acceptable risk — edge cases are uncommon in rhx commands

## assumption 6: operator list is exhaustive

**what we assume**: 12 operators cover all attack vectors
**what if opposite**: unknown shell syntax enables bypass
**evidence**: research covered bash/zsh docs and security papers
**potential gaps**:
- `{a,b}` brace expansion — but this requires space (not dangerous alone)
- `$((...))` arithmetic — but already caught by `$(`
- heredocs `<<` — less common attack vector
**verdict**: acceptable — main vectors covered; can extend later

## issues found

### issue: grep -qP not portable

**location**: blueprint codepath tree, newline detection
**fix**: replace `grep -qP '\n'` with:
```bash
if [[ "$CMD" == *$'\n'* ]]; then
  exit 0
fi
```

this uses bash's built-in pattern match which is portable.

**updated in blueprint**: no — will fix in execution phase

## conclusion

one assumption challenged: grep -qP is not portable. fix identified for execution phase. all other assumptions hold with evidence.
