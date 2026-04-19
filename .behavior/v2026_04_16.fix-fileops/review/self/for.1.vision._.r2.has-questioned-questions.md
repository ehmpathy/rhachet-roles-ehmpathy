# self-review r2: has-questioned-questions

## triage of open questions

### question 1: "do any extant scripts rely on `[abc]` character class in mvsafe?"

**can this be answered via code search now?** Yes.

**search performed**: 
```
grep '(rhx|npx rhachet).*(mvsafe|rmsafe|cpsafe).*\[' 
```

**result**: only matches are literal bracket filenames like `[ref].md` in the wish and vision documents. No `[abc]` character class usage found.

**verdict: [answered]** - no extant scripts rely on character class patterns with these tools.

**action**: remove this question from vision, state the result.

### question 2: "test with actual bracket files before implementation"

**can this be answered now?** No, this is an action item for implementation phase.

**verdict: [research]** - move to implementation verification step.

**action**: keep as verification task, not an open question.

## triage of assumptions

### assumption 1: "`[abc]` character class globs are rare in mvsafe/rmsafe/cpsafe usage"

**evidence found**: code search confirms zero usage of character class patterns with these tools in the codebase.

**verdict: CONFIRMED** - assumption holds with evidence.

### assumption 2: "`--literal` flag is more intuitive than escape syntax"

**can this be validated via logic?** Yes. 
- `--literal` is a single flag with clear name
- `[[]` requires knowledge of character class syntax
- flags are more discoverable (show in --help)

**verdict: HOLDS** - logic supports the assumption.

## updates to vision

1. Remove question #1 (answered: no usage found)
2. Reframe question #2 as verification task in implementation
3. Add result: "code search confirms zero character class usage"
