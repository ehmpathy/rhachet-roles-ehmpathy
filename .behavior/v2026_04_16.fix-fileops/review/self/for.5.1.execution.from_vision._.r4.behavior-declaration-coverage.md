# self-review: behavior-declaration-coverage

## vision requirements checklist

### 1. "Add `--literal` flag to all affected skills: mvsafe, rmsafe, cpsafe, globsafe"

| skill | `--literal` added? | verified location |
|-------|-------------------|-------------------|
| mvsafe | YES | line 52-55 case statement |
| rmsafe | YES | line 52-55 case statement |
| cpsafe | YES | line 55-58 case statement |
| globsafe | YES | line 76-79 case statement |

**verdict: COMPLETE**

### 2. "When `--literal` is passed: path is treated as exact string, no glob expansion occurs"

| skill | bypass implemented? | mechanism |
|-------|---------------------|-----------|
| mvsafe | YES | `if LITERAL then IS_GLOB=false` |
| rmsafe | YES | `if LITERAL then IS_GLOB=false` |
| cpsafe | YES | `if LITERAL then IS_GLOB=false` |
| globsafe | YES | character class escapes `[[]` |

**verdict: COMPLETE**

### 3. "skill header - add `--literal` to usage examples, show `\[` escape syntax"

| skill | header updated? |
|-------|----------------|
| mvsafe | YES - lines 17-18 |
| rmsafe | YES - lines 19-20 |
| cpsafe | YES - lines 17-18 |
| globsafe | YES - lines 22-23 |

**verdict: COMPLETE**

### 4. "skill help (`--help` output) - document the flag and escape syntax"

| skill | help added? |
|-------|------------|
| mvsafe | YES - new --help handler |
| rmsafe | YES - new --help handler |
| cpsafe | YES - new --help handler |
| globsafe | YES - updated extant handler |

**verdict: COMPLETE**

### 5. "did you know?" hint (from vision mitigation section)

| skill | hint added? | condition |
|-------|------------|-----------|
| mvsafe | YES | crickets + `[` + !literal |
| rmsafe | YES | crickets + `[` + !literal |
| cpsafe | YES | crickets + `[` + !literal |
| globsafe | YES | crickets + `[` + !literal |

**verdict: COMPLETE**

### 6. "briefs - add examples with `--literal` flag"

**status:** no extant briefs for these skills. vision says "briefs" but none existed.

**verdict: N/A** - no briefs to update

### 7. "permissions.jsonc - add example for bracket paths"

**status:** permissions.jsonc not in this repo - it's for user projects. Vision documents examples for users to add.

**verdict: N/A** - documented in vision for user projects

## summary

all implementable requirements from vision are complete:
- [x] `--literal` flag in all 4 skills
- [x] glob bypass when literal
- [x] header examples
- [x] help output
- [x] "did you know?" hints
- [~] briefs - none existed
- [~] permissions.jsonc - user project concern
