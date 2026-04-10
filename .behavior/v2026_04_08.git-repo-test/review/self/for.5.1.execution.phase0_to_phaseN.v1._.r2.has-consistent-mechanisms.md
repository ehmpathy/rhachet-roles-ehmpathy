# review.self: has-consistent-mechanisms (r2)

## review scope

reviewed git.repo.test.sh for new mechanisms that duplicate extant functionality.

## method

1. listed all new mechanisms created in the skill
2. searched codebase for similar patterns
3. verified reuse of extant utilities where available

## findings

### mechanisms created

| mechanism | purpose | reuses extant? |
|-----------|---------|----------------|
| `parse_lint_output` | parse lint error count | extant (was in original code) |
| `parse_jest_output` | parse jest stats | new, no extant equivalent |
| `run_single_test` | run npm test command | new, no extant equivalent |
| `output_success` | format success output | composes `print_*` from output.sh |
| `output_failure` | format failure output | composes `print_*` from output.sh |
| `output_no_tests` | format constraint error | composes `print_*` from output.sh |
| `validate_npm_command` | check package.json | new, skill-specific |
| `unlock_keyrack` | unlock test env keyrack | new, different from extant |

### output utilities: correctly reused

source line 33:
```bash
source "$CLAUDE_TOOLS_DIR/output.sh"
```

extant utilities used:
- `print_turtle_header` from output.sh
- `print_tree_start` from output.sh
- `print_tree_branch` from output.sh

the `output_success`, `output_failure`, `output_no_tests` functions are skill-specific compositions that build on the shared primitives. this is the intended pattern.

### keyrack: different from extant

found `keyrack.operations.sh` in git.commit skill:
- provides `fetch_github_token`, `require_github_token`
- used for GitHub token fetch with specific key and env

my `unlock_keyrack` is different:
- unlocks `ehmpath/test` env for integration tests
- does not fetch a specific token
- just ensures test credentials are unlocked

these serve different purposes, not duplications.

### jest parse: no extant equivalent

searched codebase for jest output parse patterns:
```bash
grep -r "Test Suites" src/domain.roles/
grep -r "parse.*jest" src/domain.roles/
```

found none. `parse_jest_output` is the first jest stats parser in this codebase. new mechanism is justified.

## conclusion

no duplications found:
1. output utilities correctly reuse extant `output.sh`
2. keyrack unlock serves different purpose than extant token fetch
3. jest parse is new functionality with no extant equivalent
4. npm command validation is skill-specific

all new mechanisms are justified and consistent with codebase patterns.
