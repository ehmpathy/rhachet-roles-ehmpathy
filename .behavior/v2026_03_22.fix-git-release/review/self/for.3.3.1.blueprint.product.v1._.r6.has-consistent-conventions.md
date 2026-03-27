# review.self: has-consistent-conventions (r6)

## the artifact reviewed

file: `.behavior/v2026_03_22.fix-git-release/3.3.1.blueprint.product.v1.i1.md`

i re-read:
- codepath tree (lines 33-86)
- filediff tree (lines 16-29)
- extant `git.release.operations.sh` for function name conventions
- extant `git.commit/output.sh` for output function conventions
- extant test files for test file name conventions

---

## question: do new names diverge from extant conventions?

for each name choice in the blueprint, i ask:
1. what name conventions does the codebase use?
2. do we use a different namespace, prefix, or suffix pattern?
3. do we introduce new terms when extant terms exist?

---

## extant name conventions in git.release.operations.sh

| pattern | examples | count |
|---------|----------|-------|
| `get_*` | get_pr_for_branch, get_release_pr, get_pr_status, get_failed_checks, get_tag_runs | 5 |
| `has_*` | has_automerge | 1 |
| `is_*` | is_pr_merged | 1 |
| `needs_*` | needs_rebase | 1 |
| `enable_*` | enable_automerge | 1 |
| `rerun_*` | rerun_failed_workflows | 1 |
| `wait_for_*` | wait_for_target | 1 |
| `parse_*` | parse_check_counts | 1 |
| `format_*` | format_duration | 1 |
| `_*` (internal) | _gh_with_retry | 1 |

**no extant patterns:**
- no `get_one_*` or `get_all_*` cardinality prefixes
- no `emit_*` output functions
- no `*_from_input` suffix

---

## blueprint's proposed names vs extant

### get_one_goal_from_input

**extant pattern**: `get_*` (no cardinality prefix)

**divergence?** yes — introduces `get_one_*` pattern not found in extant code.

**analysis**: the `get_one_` prefix comes from the briefs (rule.require.get-set-gen-verbs.md) which mandates cardinality:

> always use getOne* or getAll*

this is a codebase-wide convention that supersedes local file conventions.

**verdict**: acceptable. follows brief convention, not local file convention.

---

### get_all_flags_from_input

**extant pattern**: `get_*` (no cardinality prefix)

**divergence?** yes — introduces `get_all_*` pattern.

**analysis**: same as above. the brief mandates cardinality prefixes.

**verdict**: acceptable. follows brief convention.

---

### get_one_transport_status

**extant pattern**: `get_pr_status` (no cardinality prefix)

**divergence?** yes — introduces `get_one_*` pattern.

**analysis**: same as above. the brief mandates cardinality prefixes. the word "transport" is introduced (feature-branch, release-branch, release-tag are transports per the wish).

**why "transport"?** the wish (line 5-10) defines "3 different release transports". this is domain language.

**verdict**: acceptable. follows brief convention and wish terminology.

---

### emit_transport_status

**extant pattern**: none — no `emit_*` functions in extant code.

**divergence?** yes — introduces new `emit_*` pattern.

**analysis**: the word "emit" signals "produces stdout" which distinguishes from "get" (returns value). this is a meaningful semantic distinction:

- `get_*` → returns a value
- `emit_*` → writes to stdout

the extant code has inline echo statements but no extracted emit functions. the blueprint creates them.

**verdict**: acceptable. new pattern but semantically necessary.

---

### emit_transport_watch

**extant pattern**: `wait_for_target` (verb phrase, not emit)

**divergence?** yes — `emit_` vs `wait_for_`.

**analysis**: the extant `wait_for_target` focuses on "wait" behavior. the blueprint's `emit_transport_watch` focuses on "emit stdout while watch" behavior. different semantic emphasis:

- `wait_for_*` → blocks until condition (internal)
- `emit_*_watch` → writes poll lines to stdout (external)

**verdict**: acceptable. different purpose, not a rename.

---

### emit_one_transport_status_exitcode

**extant pattern**: none — inline exit statements.

**divergence?** yes — introduces `emit_one_*_exitcode` pattern.

**analysis**: the word "emit" here means "emit an exit code to the shell". the `_exitcode` suffix clarifies the output type.

**alternative considered**: `exit_with_status` — but "emit" is consistent with other emit functions.

**verdict**: acceptable. consistent with emit pattern.

---

## output function names (output.sh)

| blueprint name | follows extant pattern? |
|----------------|------------------------|
| print_release_header | yes — `print_*` extant in git.commit output.sh |
| print_check_status | yes — `print_*` extant |
| print_automerge_status | yes — `print_*` extant |
| print_watch_header | yes — `print_*` extant |
| print_watch_poll | yes — `print_*` extant |
| print_watch_result | yes — `print_*` extant |
| print_hint | yes — `print_*` extant |
| print_turtle_header | yes — already extant |

**verdict**: all output functions follow extant `print_*` pattern.

---

## term conventions

| blueprint term | extant term? | verdict |
|----------------|--------------|---------|
| transport | no — new term | acceptable — defined in wish |
| goal | no — new term | acceptable — describes from/into pair |
| flags | yes — extant FLAG_* variables | consistent |
| automerge | yes — extant has_automerge | consistent |
| status | yes — extant get_pr_status | consistent |

---

## file name conventions

### test files

**extant pattern**:
- `git.release.p1.integration.test.ts` — priority 1 tests
- `git.release.p2.integration.test.ts` — priority 2 tests
- `git.branch.rebase.journey.integration.test.ts` — journey tests

**blueprint proposes**: `git.release.play.integration.test.ts`

**divergence?** yes — "play" vs "journey".

**analysis**: the extant codebase uses "journey" for end-to-end flow tests:

```
src/domain.roles/mechanic/skills/git.branch.rebase/git.branch.rebase.journey.integration.test.ts
```

the blueprint uses "play" which is not found in extant code.

**verdict**: **issue found** — should use `git.release.journey.integration.test.ts` for consistency.

---

### source files

**extant pattern**:
- `git.release.sh` — main skill entry point
- `git.release.operations.sh` — domain operations
- `output.sh` — output functions

**blueprint proposes**: same structure (update extant files)

**verdict**: consistent. no new source file names introduced.

---

### spec files

**extant pattern**:
- `git.release.spec.md` — specification
- `git.release.spec.matrix.md` — state matrix
- `git.release.spec.diagram.md` — flow diagram

**blueprint proposes**: same structure (update extant files)

**verdict**: consistent. no new spec file names introduced.

---

## output function pattern verified

i verified the extant `git.commit/output.sh` has these functions:

| function | purpose |
|----------|---------|
| print_turtle_header | `🐢` header |
| print_tree_start | `🐚` root |
| print_tree_branch | `├─` or `└─` branch |
| print_tree_leaf | key: value leaf |
| print_nested_leaf | deeper nesting |

the blueprint's proposed functions follow this pattern:

| blueprint function | follows extant? |
|-------------------|-----------------|
| print_release_header | yes — `print_*` |
| print_check_status | yes — `print_*` |
| print_automerge_status | yes — `print_*` |
| print_watch_header | yes — `print_*` |
| print_watch_poll | yes — `print_*` |
| print_watch_result | yes — `print_*` |
| print_hint | yes — `print_*` |

**verdict**: all output functions follow extant `print_*` pattern.

---

## issues found

### issue 1: test file name divergence

**location**: blueprint line 23 proposes `git.release.play.integration.test.ts`

**extant convention**: `*.journey.integration.test.ts` (found in git.branch.rebase)

**resolution**: update blueprint to use `git.release.journey.integration.test.ts`

**why it matters**: consistent name patterns enable discoverability. "journey" is the established term for end-to-end flow tests in this codebase.

---

## how addressed

**fixed**: the blueprint was updated to rename:
- `git.release.play.integration.test.ts` → `git.release.journey.integration.test.ts`

this is a name-only change with no functional impact. the fix was applied to:
- line 23 (filediff tree)
- line 106 (test coverage section)

---

## summary

### function names

| name | diverges from local file? | acceptable? | reason |
|------|---------------------------|-------------|--------|
| get_one_goal_from_input | yes | yes | brief mandates cardinality |
| get_all_flags_from_input | yes | yes | brief mandates cardinality |
| get_one_transport_status | yes | yes | brief mandates cardinality |
| emit_transport_status | yes | yes | new semantic: stdout output |
| emit_transport_watch | yes | yes | new semantic: watch + emit |
| emit_one_transport_status_exitcode | yes | yes | consistent with emit pattern |
| print_* functions | no | yes | follows extant pattern |

### file names

| file | diverges from extant? | acceptable? | resolution |
|------|----------------------|-------------|------------|
| git.release.journey.integration.test.ts | no — **fixed** | yes | renamed from "play" |
| source files | no | yes | update extant |
| spec files | no | yes | update extant |

**one convention violation found and fixed.** the test file name was updated to use "journey" instead of "play". all names are now consistent with extant patterns or justified by brief conventions.

