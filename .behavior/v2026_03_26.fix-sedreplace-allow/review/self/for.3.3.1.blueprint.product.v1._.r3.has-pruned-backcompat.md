# self-review: has-pruned-backcompat

## backwards compatibility concerns in blueprint

### concern 1: hook registration order (FIRST in list)

**what**: blueprint says add hook at START of onTool list
**why we did this**: so allow hook runs before block hooks
**is this backwards compat**: no — this is functional requirement
**evidence**: if block hooks run first, they might reject before allow can approve
**verdict**: not backcompat — functional requirement; keep

### concern 2: multiple rhx prefix patterns (5 patterns)

**what**: blueprint supports 5 invocation patterns
**why we did this**: different ways to invoke rhx
**is this backwards compat**: partially — some patterns are less common
**question**: do we need all 5?

analysis:
- `rhx` — primary, used daily
- `npx rhachet run --skill` — documented usage
- `npx rhx` — documented alias
- `./node_modules/.bin/rhx` — direct, rare but valid
- `./node_modules/.bin/rhachet` — direct, rare but valid

**could simplify to 2-3**: yes, could drop direct patterns
**risk of simplify**: edge case failures when user invokes directly
**verdict**: keep all 5 — cost is one regex, benefit is completeness

### concern 3: JSON structure matches community workaround

**what**: exact JSON structure from github issue #30435
**why we did this**: validated to work
**is this backwards compat**: no — this is API conformance
**verdict**: not backcompat — API requirement; keep

### concern 4: exit code 0 for all outcomes

**what**: hook exits 0 for allow, pass-through, and reject
**why we did this**: claude code hook semantics (0 = continue, non-0 = error)
**is this backwards compat**: no — this is API conformance
**verdict**: not backcompat — API requirement; keep

### concern 5: sed quote strip preserves complex patterns

**what**: sed handles nested quote edge cases
**why we did this**: to avoid false negatives
**is this backwards compat**: no — functional requirement
**verdict**: not backcompat — correctness requirement; keep

## backwards compat violations found

none.

all concerns analyzed are either:
1. functional requirements (hook order, exit codes)
2. API conformance (JSON structure)
3. completeness (rhx patterns)

no "just to be safe" backwards compat found.

## open questions for wisher

none — no backwards compat concerns require wisher input.

## conclusion

no unnecessary backwards compat in the blueprint.
