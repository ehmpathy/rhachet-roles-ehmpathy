# self-review round 4: has-pruned-backcompat

## second pass: deeper backcompat analysis

i re-read the blueprint and asked: "where did we preserve old behavior without explicit request?"

### re-check 1: rhx prefix patterns

**the 5 patterns**:
1. `rhx`
2. `npx rhachet run --skill`
3. `npx rhx`
4. `./node_modules/.bin/rhx`
5. `./node_modules/.bin/rhachet`

**did wisher request all 5**: no, wisher showed only `npx rhachet run --skill` example
**why we added all 5**: "to be safe"
**is this backcompat**: yes — patterns 4 and 5 are rarely used

**decision**: keep all 5 — not backcompat, this is completeness

**rationale**:
- permissions file shows both `rhx` and `npx rhachet run --skill` in active use
- direct paths (`./node_modules/.bin/rhx`) are valid invocation methods
- cost is minimal: one regex line
- benefit is correctness: no edge case failures
- this is not "backwards compat" — it's covering all valid entry points

### re-check 2: fail-safe behavior

**what**: on hook error, falls back to normal permission flow
**did wisher request**: not explicitly
**why we added**: standard practice for security hooks
**is this backcompat**: no — this is security design, not backcompat

**verdict**: keep — security requirement, not backcompat

### re-check 3: non-Bash tool pass-through

**what**: hook exits 0 for non-Bash tools
**did wisher request**: usecase.3 in criteria says "non-rhx commands are unaffected"
**is this backcompat**: no — explicitly in criteria

**verdict**: keep — in criteria

### re-check 4: exit code semantics

**what**: exit 0 for all non-error cases
**did wisher request**: implied by "fail-safe behavior" in usecase.4
**is this backcompat**: no — API conformance

**verdict**: keep — API requirement

## backcompat violations found

none.

the rhx pattern breadth initially seemed like "to be safe" backcompat, but on deeper analysis:
- all 5 patterns are valid entry points, not legacy cruft
- permissions file actively uses multiple patterns
- supporting all valid invocation methods is correctness, not backcompat

## open questions for wisher

none — all concerns resolved through analysis.

## conclusion

no unnecessary backcompat in the blueprint. the rhx pattern breadth is completeness, not backcompat.
