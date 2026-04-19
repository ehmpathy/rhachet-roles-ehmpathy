# self-review: has-consistent-mechanisms

## new mechanisms reviewed

### 1. `LITERAL` boolean flag variable

**does codebase have similar mechanism?** Yes - skills use boolean flags like `RECURSIVE`, `LONG`, `NAMED_ARG_USED`.

**do we duplicate?** No - follows extant pattern exactly.

**verdict: CONSISTENT** - same pattern as `RECURSIVE=false` in rmsafe.

### 2. `--literal` flag parse in case statement

**does codebase have similar mechanism?** Yes - all skills use same case statement pattern for flags.

**do we duplicate?** No - follows extant pattern.

**example from extant code:**
```bash
--recursive|-r)
  RECURSIVE=true
  shift
  ;;
```

**verdict: CONSISTENT** - identical pattern.

### 3. "did you know?" hint output

**does codebase have similar mechanism?** Yes - skills use `print_turtle_header`, `print_tree_*` functions from output.sh.

**do we duplicate?** Partially - hint uses raw `echo` instead of output.sh functions.

**why?** The hint is a new visual element (coconut treestruct) not in output.sh. To add it to output.sh would be scope creep.

**verdict: ACCEPTABLE** - raw echo for new element, consistent with how other one-off messages work.

### 4. character class escape in globsafe

**does codebase have similar mechanism?** No - this is new escape logic.

**do we duplicate?** No - bash native `${var//old/new}` substitution.

**verdict: NEW BUT MINIMAL** - uses bash built-in, no new utility.

### 5. `--help` handler

**does codebase have similar mechanism?** Mixed - some skills have `--help`, some don't.

**do we duplicate?** No - we added `--help` to skills that lacked it.

**verdict: CONSISTENT** - fills gap, follows pattern where it extant.

## summary

| mechanism | extant pattern? | consistent? |
|-----------|-----------------|-------------|
| `LITERAL` flag | yes (`RECURSIVE`) | yes |
| case statement | yes | yes |
| "did you know?" | partial (output.sh) | acceptable |
| char class escape | no (bash built-in) | yes |
| `--help` handler | mixed | yes |

## no duplicate mechanisms found

all new code follows extant patterns or uses bash built-ins.
