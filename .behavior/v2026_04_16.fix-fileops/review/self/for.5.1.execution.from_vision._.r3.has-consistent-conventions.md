# self-review: has-consistent-conventions

## naming conventions verified

### variable names

**extant convention:** UPPER_SNAKE_CASE for shell variables

**evidence from mvsafe.sh:**
```
FROM=""
INTO=""
NAMED_ARG_USED=false
IS_DIR_MOVE=false
```

**our addition:** `LITERAL=false`

**verdict: CONSISTENT** - matches extant UPPER_SNAKE_CASE.

### flag names

**extant convention:** 
- long form: `--lowercase-kebab` (e.g., `--from`, `--into`, `--recursive`)
- short form: single letter (e.g., `-r`, `-l`)

**our addition:** `--literal`, `-l`

**verdict: CONSISTENT** - matches extant pattern.

### function names

**extant convention:** snake_case (e.g., `is_glob_pattern`, `print_turtle_header`)

**our addition:** none - we did not add new functions.

**verdict: N/A**

### output format

**extant convention:** turtle treestruct from output.sh

**our addition:** "did you know?" hint follows treestruct format with:
- emoji header (`🥥`)
- `├─` branches
- `└─` final branch

**verdict: CONSISTENT** - follows visual pattern even for new element.

## terms verified

### `--literal` term choice

**alternatives considered:**
- `--exact` - could confuse with exact match
- `--raw` - could confuse with raw output
- `--no-glob` - negative form, less clear

**why `--literal`:** matches common CLI convention (e.g., `grep -F` is "fixed strings" / literal)

**verdict: APPROPRIATE** - standard term for "no pattern expansion"

## summary

| element | extant convention | our code | consistent? |
|---------|-------------------|----------|-------------|
| variables | UPPER_SNAKE_CASE | LITERAL | yes |
| long flags | `--kebab` | `--literal` | yes |
| short flags | `-x` | `-l` | yes |
| output | treestruct | treestruct | yes |
| term | n/a | `literal` | standard |

no convention divergence found.
