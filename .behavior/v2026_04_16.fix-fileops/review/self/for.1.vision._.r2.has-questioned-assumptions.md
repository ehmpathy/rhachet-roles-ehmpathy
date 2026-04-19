# self-review r2: has-questioned-assumptions

## fresh eyes review of updated vision

### inconsistency found: globsafe section contradicts fix recommendation

**observed**: vision recommended `--literal` flag (line 56-59) but several sections still referenced escape syntax `[[]`:
- line 77-80: user experience table showed escape syntax
- line 87: said "escape if you mean literal" 
- line 117: edgecase said "use `[[]` escape"
- line 129: asked "should we add `--literal` flag" (already decided yes)

**verdict: ISSUE FOUND**

**how I fixed it**: 
1. changed globsafe user experience table from `'**/*.[[]ref].md'` to `'**/*.[ref].md' --literal`
2. changed mental model from "escape if you mean literal" to "use `--literal` for exact match"
3. changed edgecase from "use `[[]` escape" to "use `--literal` flag"
4. changed question from "should we add `--literal`" to "test with actual bracket files"

### assumption: `--literal` flag changes globsafe semantics

**what do we assume?** That `--literal` means "literal substring search".

**what if the opposite were true?** `--literal` could mean "treat as literal glob pattern" (escape metacharacters automatically).

**which interpretation is correct?** Escaping metacharacters makes more sense - pattern still uses glob syntax but `[` `]` are literal.

**verdict: CLARIFICATION NEEDED**

**how I fixed it**: changed fix description from "literal substring search" to "escape glob metacharacters" with example showing `[ref]` treated as literal characters.

### assumption: workaround `file[abc]*.txt` always works

**what do we assume?** That users can add `*` to force glob mode.

**what evidence supports this?** After fix, `is_glob_pattern()` will detect `*` and use glob branch.

**verdict: HOLDS**

**why it holds**: the detection logic checks for `*` presence. If pattern contains `*`, the glob branch executes. The `[abc]` will then be expanded as character class within that glob expansion.

## summary of changes made

| location | before | after |
|----------|--------|-------|
| globsafe table | `'**/*.[[]ref].md'` | `'**/*.[ref].md' --literal` |
| mental model | "escape if you mean literal" | "use `--literal` for exact match" |
| edgecase | "use `[[]` escape" | "use `--literal` flag" |
| question | "should we add `--literal`" | "test with actual bracket files" |
| fix description | "literal substring search" | "escape glob metacharacters" |
| assumptions | "users understand escape syntax" | "`--literal` more intuitive than escape syntax" |
