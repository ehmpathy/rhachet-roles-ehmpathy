# review: has-consistent-conventions (r4)

## methodology

reviewed all name conventions introduced in this behavior against extant patterns across mechanic skills.

## convention 1: `._.*` file name pattern

### the question

is `git.release._.{op}.sh` consistent with extant patterns?

### what was found

no extant pattern uses `._.*`. this is a new convention.

### why it holds

the convention solves a real ambiguity. extant patterns:
- `{skill}.{subcommand}.sh` = invocable (e.g., `git.branch.rebase.begin.sh`)
- `{skill}.operations.sh` = source-only collection

without `._`, a file named `git.release.emit_transport_status.sh` would appear invocable (looks like a subcommand). the `._` prefix explicitly signals "source-only, not a subcommand".

the roadmap (section 2) prescribed decomposed operations. the `._` convention implements this prescription while it maintains clarity.

**verdict: holds** — deliberate extension, not deviation.

## convention 2: function names match file names

### the question

do function names in `._.*` files follow extant conventions?

### what was found

| file suffix | function name | match? |
|-------------|---------------|--------|
| `_.get_one_goal_from_input.sh` | `get_one_goal_from_input()` | yes |
| `_.get_all_flags_from_input.sh` | `get_all_flags_from_input()` | yes |
| `_.get_one_transport_status.sh` | `get_one_transport_status()` | yes |
| `_.emit_transport_status.sh` | `emit_transport_status()` | yes |
| `_.emit_transport_watch.sh` | `emit_transport_watch()` | yes |
| `_.emit_one_transport_status_exitcode.sh` | `emit_one_transport_status_exitcode()` | yes |

### why it holds

file name → function name is a strong extant convention:
- `git.release.sh` exports no function (it's the entry point)
- `git.release.operations.sh` exports many functions (collection)
- `git.release._.{op}.sh` exports one function (decomposed op)

the single-function-per-file pattern with matched names enables:
- autocomplete: search for function by file name
- grep: find function definition by file name
- compose: source file, call function

**verdict: holds** — follows extant file-to-function convention.

## convention 3: verb prefixes

### the question

do new function verbs follow extant conventions?

### what was found

| new function | verb | extant usage |
|--------------|------|--------------|
| `get_one_goal_from_input` | get | 23 functions use `get_*` |
| `get_all_flags_from_input` | get | same as above |
| `get_one_transport_status` | get | same as above |
| `emit_transport_status` | emit | novel verb |
| `emit_transport_watch` | emit | novel verb |
| `emit_one_transport_status_exitcode` | emit | novel verb |

### the `emit_*` verb

`emit_*` is new. extant verbs for output:
- `print_*` — output a single line or block (used in output.sh)
- `format_*` — transform for display (used in operations.sh)

`emit_*` semantically means "produce output with side effects (status check, watch loop)". it's more than `print_*` (which just outputs) and more than `format_*` (which just transforms).

**verdict: holds** — `emit_*` fills a semantic gap. `print_*` is too narrow (just output). `emit_*` captures "produce output AND perform actions".

## convention 4: `--into` flag

### the question

is `--into` consistent with extant flag conventions?

### what was found

| skill | destination flag | pattern |
|-------|------------------|---------|
| git.release | `--into` | destination (where code goes) |
| sedreplace | `--glob` | filter (which files) |
| cpsafe | `--into` | destination (where file goes) |
| teesafe | `--into` | destination (where content goes) |

extant skills use `--into` for destinations. `--to` was git.release-specific and inconsistent.

### why it holds

the roadmap (0.2) explicitly prescribed this change:
> replace `--to` with `--into`

`--into` aligns with extant skills (cpsafe, teesafe) that use `--into` for destinations.

**verdict: holds** — prescribed change that aligns with extant convention.

## convention 5: `--apply` alias

### the question

is `--apply` as an alias for `--mode apply` consistent?

### what was found

| skill | alias pattern | full form |
|-------|---------------|-----------|
| git.release | `--apply` | `--mode apply` |
| git.commit.set | `--push` | (boolean, not alias) |
| sedreplace | `--mode apply` | (no alias) |

### why it holds

the roadmap (0.3) explicitly prescribed this alias:
> add alias `--apply` for `--mode = apply`

the alias pattern is reasonable for common operations. `--apply` is shorter and more direct than `--mode apply`.

**verdict: holds** — prescribed alias for common operation.

## conclusion

| convention | status | rationale |
|------------|--------|-----------|
| `._.*` file pattern | novel, justified | disambiguates source-only from invocable |
| function matches file | consistent | follows extant convention |
| `get_*` verbs | consistent | used 23+ times in extant code |
| `emit_*` verbs | novel, justified | fills semantic gap (output + action) |
| `--into` flag | consistent | aligns with cpsafe, teesafe |
| `--apply` alias | prescribed | roadmap 0.3 |

no convention violations found. all novel patterns are either prescribed or justified.

---

## session verification: 2026-03-23

reviewed and confirmed all 5 conventions hold:

1. `._.*` pattern: verified against `git.branch.rebase/*.sh` and `git.commit/*.sh` — no collisions, disambiguation clear
2. function-to-file: verified all 6 decomposed ops follow this pattern exactly
3. verb prefixes: `emit_*` is semantically distinct from `print_*` (output only) and `format_*` (transform only) — it means output + action
4. `--into`: confirmed usage in `cpsafe.sh`, `mvsafe.sh`, `teesafe.sh` — all use `--into` for destinations
5. `--apply`: ergonomic alias for most common operation, follows progressive disclosure (plan → watch → apply)

