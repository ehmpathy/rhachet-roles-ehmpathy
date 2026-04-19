# self-review: has-questioned-assumptions

## assumptions identified and questioned

### 1. "`[abc]` character class globs are rare in practice"

**what do we assume?** That users rarely use `[abc]` character classes in mvsafe/rmsafe.

**what evidence supports this?** None. The wisher didn't mention usage frequency.

**what if the opposite were true?** Teams might use `file[1-3].txt` patterns regularly for batch operations.

**what exceptions exist?** CI scripts, test fixtures, numbered file series.

**verdict: WEAK ASSUMPTION**

**how I addressed it**: the vision already acknowledges this as a tradeoff. The workaround (combine with `*` to trigger glob mode) mitigates breakage. But we should validate with real usage data before release.

### 2. "remove `[` from `is_glob_pattern()` fixes the issue"

**what do we assume?** That this single-line change is sufficient.

**what evidence supports this?** Per code review:
- Line 119-122: `is_glob_pattern()` checks for `*`, `?`, `[`
- Line 129-143: if NOT glob, use literal path branch with `-e "$FROM"` check
- The literal branch treats path as-is

**did the wisher say this?** No. I inferred from code analysis.

**what if the opposite were true?** There could be other code paths that expand brackets.

**verdict: NEEDS VERIFICATION** - must test with actual bracket files before implementation.

### 3. "`[[]` escape syntax works in bash glob"

**what do we assume?** That `[[]` matches literal `[` in bash glob expansion.

**what evidence supports this?** Standard POSIX glob behavior. `[[]` is a character class that contains only `[`.

**verdict: HOLDS** - standard shell behavior, can verify with quick test.

### 4. "users understand escape syntax for glob tools"

**what do we assume?** That users know how to escape metacharacters.

**what evidence supports this?** None. Many users don't know glob escapes.

**what if the opposite were true?** Users would be confused by `[[]` and submit bug reports.

**verdict: ISSUE FOUND**

**how I addressed it**: vision should recommend `--literal` flag for globsafe rather than escape syntax. Updated vision's "alternative" to be the primary recommendation.

### 5. "cpsafe is not affected"

**what do we assume?** Only mvsafe, rmsafe, globsafe are affected.

**what evidence supports this?** The wish lists only these three.

**what exceptions exist?** cpsafe likely has similar glob detection logic.

**verdict: ISSUE FOUND** - need to check cpsafe.

## verification needed

I checked cpsafe for similar patterns.

---

After check: `cpsafe.sh` uses same `is_glob_pattern()` function on line 115-117. It IS affected.

## updates to vision

1. Add cpsafe to affected skills
2. Recommend `--literal` flag for globsafe as primary solution, not escape syntax
3. Add "verify with actual bracket files" to questions

## summary

| assumption | verdict | action |
|------------|---------|--------|
| `[abc]` globs are rare | WEAK | acknowledged as tradeoff, need usage data |
| remove `[` is sufficient | NEEDS VERIFICATION | test before implement |
| `[[]` escape works | HOLDS | standard shell behavior |
| users know escapes | ISSUE | recommend `--literal` flag instead |
| only 3 skills affected | ISSUE | cpsafe also affected |
