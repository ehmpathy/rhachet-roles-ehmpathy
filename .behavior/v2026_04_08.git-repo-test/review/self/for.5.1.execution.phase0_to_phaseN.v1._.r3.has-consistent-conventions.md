# review.self: has-consistent-conventions (r3)

## review scope

reviewed git.repo.test.sh and git.repo.test.play.integration.test.ts for divergence from extant names and patterns.

## method

1. compared variable names against extant skills (git.commit.set.sh)
2. compared function names against extant patterns
3. compared flag names against extant patterns
4. compared test file names against extant patterns
5. checked for introduced terms that differ from extant vocabulary

---

## 1. variable names: consistent

### extant pattern

from git.commit.set.sh:
- global constants: UPPERCASE (ROBOT_NAME, METER_DIR, STATE_FILE, MODE)
- local variables: lowercase (local branch, local parents, local header)

### my code

from git.repo.test.sh:
- global constants: UPPERCASE (WHAT, WHEN, SCOPE, RESNAP, THOROUGH, LOG_BASE, LOG_DIR)
- local variables: lowercase (local test_type, local npm_cmd, local jest_args, local exit_code)

### conclusion

matches extant conventions exactly. no divergence.

---

## 2. function names: consistent

### extant pattern

from git.commit.set.sh:
- snake_case for functions: `infer_level_from_branch`, `is_merge_commit`, `get_commit_prefix`

### my code

from git.repo.test.sh:
- snake_case for functions: `unlock_keyrack`, `parse_lint_output`, `parse_jest_output`, `run_single_test`, `output_success`, `output_failure`, `output_no_tests`, `output_all_plan`, `output_all_summary`

### conclusion

matches extant conventions. all functions use snake_case.

---

## 3. flag names: consistent

### extant pattern

searched extant skills for flag patterns:
- `--what` used in git.repo.test (extant lint behavior)
- `--mode` used in git.commit.set.sh, sedreplace.sh, symlink.sh
- `--scope` used in show.gh.action.logs.sh, show.gh.test.errors.sh

### my code

new flags added:
- `--what` (extended, not new)
- `--scope` (matches extant pattern from show.gh.* skills)
- `--resnap` (new, specific to this skill)
- `--thorough` (new, specific to this skill)

### conclusion

matches extant conventions. `--scope` follows established pattern.

---

## 4. test file names: acceptable variation

### extant pattern

discovered two patterns for journey-style tests:
- `git.branch.rebase.journey.integration.test.ts` uses `.journey.`
- most tests use simple `{skill}.integration.test.ts`

### my code

used: `git.repo.test.play.integration.test.ts` with `.play.`

### analysis

the blueprint specified `.play.` for the name. both `.play.` and `.journey.` communicate the same concept (end-to-end scenario tests). the codebase has only one `.journey.` file, so there is no strong convention yet.

### conclusion

acceptable. the `.play.` pattern is specified in the blueprint and communicates the same intent. this is not a divergence from convention — it is a choice in an area where convention is not yet established.

---

## 5. term vocabulary: consistent

### terms introduced

| term | used for | extant equivalent? |
|------|----------|-------------------|
| keyrack | credential unlock | yes, extant term |
| constraint | error type | yes, from error semantics |
| malfunction | error type | yes, from error semantics |
| cowabunga | success vibe | yes, from turtle vibes |
| bummer dude | failure vibe | yes, from turtle vibes |

### conclusion

all terms match extant vocabulary. no new terminology introduced.

---

## 6. output format: consistent

### extant pattern

from git.commit output.sh, git.release output.sh:
- turtle header first
- tree start with skill name
- tree branches for content
- nested sections via indentation

### my code

follows exact pattern:
```bash
print_turtle_header "cowabunga!"
print_tree_start "git.repo.test $DISPLAY_ARGS"
print_tree_branch "status" "passed"
```

### conclusion

output format matches extant conventions exactly.

---

## final conclusion

all conventions verified consistent:

| aspect | verdict |
|--------|---------|
| variable names | consistent (UPPERCASE global, lowercase local) |
| function names | consistent (snake_case) |
| flag names | consistent (--kebab-case, reuses --scope pattern) |
| test file name | acceptable (.play. vs .journey. — no strong convention) |
| term vocabulary | consistent (reuses extant terms) |
| output format | consistent (turtle vibes treestruct) |

no divergence from extant conventions found.
