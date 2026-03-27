# review: has-consistent-conventions (r3)

## methodology

1. enumerate all .sh file name patterns across mechanic skills
2. compare `git.release._.*.sh` pattern to extant patterns
3. check function name consistency within each pattern

## file name patterns found

### invocable files (with shebang)

| pattern | count | examples |
|---------|-------|----------|
| `{skill}.sh` | 8 | git.release.sh, declapract.upgrade.sh |
| `{skill}/{skill}.sh` | 3 | git.branch.rebase.sh, git.commit.set.sh |
| `{skill}/{subcommand}.sh` | 9 | git.branch.rebase.begin.sh, set.package.install.sh |
| `{category}/{tool}.sh` | 6 | claude.tools/cpsafe.sh, claude.tools/sedreplace.sh |

total: 40 invocable files

### source-only files (no shebang)

| pattern | count | examples |
|---------|-------|----------|
| `{skill}/output.sh` | 5 | git.release/output.sh, git.commit/output.sh |
| `{skill}/{skill}.operations.sh` | 6 | git.release.operations.sh, git.commit.operations.sh |
| `{skill}/{skill}._.{op}.sh` | 6 | git.release._.get_one_goal_from_input.sh |

total: 17 source-only files (6 new from this behavior)

## the `._.*` convention analysis

### why this pattern was introduced

the `._` prefix distinguishes:
- `{skill}.{subcommand}.sh` = invocable subcommand (has shebang)
- `{skill}._.{operation}.sh` = source-only decomposed operation (no shebang)

without `._`, a file like `git.release.emit_transport_status.sh` would appear invocable.

### consistency within the pattern

| file | function defined | matches? |
|------|------------------|----------|
| git.release._.get_one_goal_from_input.sh | `get_one_goal_from_input()` | yes |
| git.release._.get_all_flags_from_input.sh | `get_all_flags_from_input()` | yes |
| git.release._.get_one_transport_status.sh | `get_one_transport_status()` | yes |
| git.release._.emit_transport_status.sh | `emit_transport_status()` | yes |
| git.release._.emit_transport_watch.sh | `emit_transport_watch()` | yes |
| git.release._.emit_one_transport_status_exitcode.sh | `emit_one_transport_status_exitcode()` | yes |

file name matches function name (after removal of `git.release._` prefix).

### comparison to operations.sh pattern

| aspect | operations.sh | `._.*.sh` |
|--------|---------------|-----------|
| purpose | shared utils (collection) | decomposed ops (single) |
| function prefix | underscore (`_gh_with_retry`) | no underscore (`emit_transport_status`) |
| visibility | private (internal) | public (composed in main flow) |
| count per file | many | one |

the patterns are complementary, not in conflict.

## function name conventions

### verb prefixes

searched across all skills for consistency:

| prefix | semantic | examples |
|--------|----------|----------|
| `get_*` | retrieve/compute | get_pr_for_branch, get_one_goal_from_input |
| `emit_*` | output to stdout | emit_transport_status, emit_transport_watch |
| `is_*` | boolean check | is_pr_merged, is_rebase_in_progress |
| `has_*` | boolean check | has_automerge, has_conflicts |
| `parse_*` | extract from data | parse_check_counts, parse_repo_slug |
| `check_*` | validate/verify | check_global_blocker, check_dependencies |
| `enable_*` | mutate state | enable_automerge |
| `rerun_*` | trigger action | rerun_failed_workflows |
| `format_*` | transform for display | format_duration |
| `print_*` | output line | print_release_header, print_check_status |

the new decomposed operations follow extant verb conventions.

## flag conventions

checked `--to` → `--into` alignment:

| skill | flag | convention |
|-------|------|------------|
| git.release | `--into` | destination (where code goes) |
| git.commit.set | `--push` | boolean (yes/no action) |
| sedreplace | `--glob` | filter pattern |

`--into` aligns with destination semantics. no other skill uses `--to` for destinations.

## conclusion

| convention | consistent? | notes |
|------------|-------------|-------|
| `._.*` file name | yes | novel but deliberate, disambiguates source-only |
| function name | yes | matches file name, follows verb prefix conventions |
| operations.sh vs `._.*` | yes | complementary patterns (utils vs decomposed ops) |
| `--into` flag | yes | aligns with destination semantics |

no convention violations found. the new `._.*` pattern is a deliberate extension that maintains clarity.

