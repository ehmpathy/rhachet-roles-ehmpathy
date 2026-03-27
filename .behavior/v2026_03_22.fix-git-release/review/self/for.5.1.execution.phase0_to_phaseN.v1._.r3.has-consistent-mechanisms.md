# review: has-consistent-mechanisms (r3)

## methodology

reviewed new files for mechanisms that duplicate extant functionality.

searched for related patterns: output utils, tree format, spinner, watch loops.

## mechanisms reviewed

### 1. decomposed operation files (6 files)

**status**: sourced AND called (verified in main flow lines 501-808)

**why they hold**:
- prescribed by roadmap phase 2
- phase 3 complete: main flow calls these operations (not inline code)
- verified: grep shows 12 call sites in git.release.sh

### 2. output functions in output.sh

**status**: sources shared turtle output from git.commit/output.sh (line 21)

```bash
source "$SKILL_DIR/../git.commit/output.sh"
```

**why they hold**:
- reuses shared output functions from git.commit
- only adds release-specific functions (print_release_header, print_check_status, etc.)
- no duplication of shared mechanisms

### 3. shared output patterns

**check**: do we duplicate claude.tools/output.sh?

**result**: no - git.release sources git.commit/output.sh which has its own set of utils. the two output.sh files serve different skill families and have different function names.

- claude.tools/output.sh: print_tree_start, print_tree_branch, print_tree_leaf (generic)
- git.commit/output.sh: print_turtle_header, specific treestruct utils
- git.release/output.sh: sources git.commit, adds print_release_header, print_check_status

no duplication - complementary functions for different contexts.

## summary

| mechanism | duplicates extant? | prescribed? | verdict |
|-----------|-------------------|-------------|---------|
| 6 decomposed ops | no (extracted from inline) | yes (roadmap 2.x) | keep |
| output.sh functions | no (sources shared) | yes (roadmap 1.x) | keep |
| shared patterns | no (complementary) | n/a | no issue |

## conclusion

no duplication of extant mechanisms found. all new mechanisms either:
1. were extracted from inline code (not duplicated from elsewhere)
2. properly source shared utilities (git.commit/output.sh)
