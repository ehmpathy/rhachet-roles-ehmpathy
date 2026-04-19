# self-review r2: has-pruned-backcompat

## fresh review with deeper scrutiny

### potential backcompat #1: `is_glob_pattern()` unchanged

**did we need to keep this function?** Let me check if it's used elsewhere.

After review: the function is only used locally in each skill file. We could have:
- deleted it entirely
- simplified to just check `*` and `?`
- inlined the check

**why we kept it:** minimal change principle. Function works, just added conditional bypass.

**is this "just in case" compat?** No - it's minimal change, not compat. Refactor would add risk without benefit.

**verdict: HOLDS** - not backcompat, just minimal change.

### potential backcompat #2: error message format unchanged

**did we change error messages?** Only added `--literal` to usage hints:
```
echo "       mvsafe.sh --literal <from> <into>"
echo "see: mvsafe.sh --help"
```

**is this backcompat concern?** No - these are display messages, not API.

**verdict: NOT A CONCERN**

### potential backcompat #3: exit codes unchanged

**did we change exit codes?** No - all exit codes remain:
- 0 for success (even crickets)
- 2 for error

**was this explicit?** No, but exit codes are API. Change would break scripts.

**verdict: CORRECT** - exit codes are implicit API contract.

## re-examination of `-l` short form

**question:** is `-l` short form a backcompat concern or new feature?

**analysis:** 
- mvsafe/rmsafe/cpsafe did NOT have `-l` before
- globsafe already had `-l` for `--long`
- we added `-l` = `--literal` only where it didn't conflict

**verdict: NEW FEATURE** - not backcompat. Adds convenience without conflict.

## no unnecessary backcompat found

all decisions reviewed again:
1. default behavior unchanged - **REQUESTED by wisher**
2. `is_glob_pattern()` kept - **minimal change, not backcompat**
3. exit codes unchanged - **implicit API contract**
4. error message format - **not an API**
5. `-l` short form - **new feature, not backcompat**

no "just in case" shims, no unnecessary compat layers.
