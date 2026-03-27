# review: behavior-declaration-adherance (r6)

## methodology

read each changed file line by line against the behavior declaration. verified that code matches vision, criteria, and blueprint — not just structurally, but semantically.

---

## vision requirements verification

### 1. uniform stdout across transports

**why it holds**:

the vision demands `🌊 release: {title}` as a uniform shape for all transports. i traced the code path for each transport type:

**PR transport path**:
- `git.release.sh:563` calls `emit_transport_status "pr" "$pr_number" ...`
- `emit_transport_status.sh:65` calls `print_release_header "$title"`
- `output.sh:33-36` outputs `🌊 release: $title`

**tag transport path**:
- `git.release.sh:665` calls `emit_transport_status "tag" "$latest_tag" ...`
- `emit_transport_status.sh:65` calls `print_release_header "$title"`
- `output.sh:33-36` outputs `🌊 release: $title`

both paths converge on the same `print_release_header()` function. the adapter pattern in `get_one_transport_status()` normalizes the title before `emit_transport_status()` receives it:
- for PRs: `_get_pr_transport_status()` extracts title from PR JSON at line 78
- for tags: `_get_tag_transport_status()` uses tag name as title at line 160

the output shape is identical because all transports flow through the same output functions.

### 2. `--to` → `--into` flag change

**why it holds**:

examined `git.release.sh` flag parse:

```bash
case $1 in
  --into)       # primary destination flag
    TO="$2"
    shift 2
    ;;
```

the `--to` flag was **removed entirely** (not aliased) per wish line 219: "replace `--to` with `--into`". the has-pruned-backcompat review (r2) flagged the deprecated alias as unasked-for backwards compat and it was removed.

help text shows only `--into`, no mention of `--to`.

the change is complete: `--into` is the only destination flag.

### 3. `--apply` alias

**why it holds**:

examined `git.release.sh:90-95`:

```bash
--apply)
  # alias for --mode apply (implies --watch)
  MODE="apply"
  WATCH="true"
  shift
  ;;
```

the `--apply` flag sets both `MODE="apply"` and `WATCH="true"`. this matches the blueprint which states "apply implies watch=true".

compared to `--mode apply` at lines 86-89 which sets `MODE` but not `WATCH`. the `--apply` alias is the ergonomic shorthand that includes watch automatically.

### 4. `🫧 wait for it...` → `🫧 and then...`

**why it holds**:

examined `output.sh:150-154`:

```bash
print_transition() {
  local message="${1:-and then...}"
  echo ""
  echo "🫧 $message"
}
```

the default message is `"and then..."` not `"wait for it..."`.

verified by grep that "wait for it" appears nowhere in the codebase:
- no occurrences in output.sh
- no occurrences in git.release.sh
- no occurrences in any decomposed operation file

the dead `wait_for_target()` function that contained the old message was removed in a previous review cycle (r4).

---

## criteria usecases verification

### usecase.1: flag inference

**why it holds**:

traced each scene through `get_one_goal_from_input()`:

**scene 1** (feat branch, no flags → into=main):
- line 45: `on_main=false` when branch != default
- line 65: when into is empty and from != "main", into defaults to "main"

**scene 2** (feat branch, --into prod → into=prod):
- line 43: explicit `into` value preserved

**scene 3** (feat branch, --from main → into=prod):
- lines 57-60: when `from="main"` and `into` is empty, `into` defaults to "prod"

**scene 4** (--from main --into main → ConstraintError):
- lines 75-79: explicit check `if [[ "$from_target" == "main" && "$into" == "main" ]]` exits with error

**scene 5** (main branch, no flags → into=prod):
- line 45: `on_main=true` when on default branch
- line 47: when on main and `from` is empty, `from` defaults to "main"
- lines 57-60: when `from="main"` and `into` is empty, `into` defaults to "prod"

**scene 6** (main branch, --from main → into=prod):
- redundant but valid — same path as scene 5

**scene 7** (main branch, --from feat → into=main):
- lines 62-65: when `from` is a feature branch name and `into` is empty, `into` defaults to "main"

all 7 scenes have test cases in p3 files with snapshots that verify the output.

### usecase.2: uniform transport status

**why it holds**:

each status state maps to exactly one output function:

| state | function call | output |
|-------|---------------|--------|
| passed | `print_check_status "passed"` | `👌 all checks passed` |
| progress | `print_check_status "progress" "$count"` | `🐢 N check(s) in progress` |
| failed | `print_check_status "failed" "$count"` | `⚓ N check(s) failed` |
| automerge unfound | `print_automerge_status "unfound"` | `🌴 automerge unfound` |
| automerge found | `print_automerge_status "enabled"` | `🌴 automerge enabled [found]` |
| automerge added | `print_automerge_status "enabled" "just added"` | `🌴 automerge enabled [added]` |
| merged | `print_automerge_status "merged"` | `🌴 already merged` |

the `emit_transport_status()` function at lines 85-180 switches on status and calls these functions for both PR and tag transports. the output shape is uniform because the same print functions are used.

### usecase.3: watch behavior

**why it holds**:

traced the watch loop in `emit_transport_watch.sh`:

- line 53: `print_watch_header` outputs `🥥 let's watch`
- line 187: `print_watch_poll` outputs `💤 N left, Xs in action, Xs watched`
- line 151: `print_watch_result "done"` outputs `✨ done!`
- lines 157-161: `print_watch_check_status "failed"` outputs `⚓ N check(s) failed`
- line 105: `print_watch_result "timeout"` outputs `⏰ timeout`

the loop at lines 85-200 polls until a terminal state. each iteration outputs a poll line. the mocked tests in p3 show 3+ poll cycles by design — the mock sequence includes multiple inflight states before terminal.

### usecase.4: apply behavior

**why it holds**:

examined `emit_transport_status.sh:122-138`:

```bash
if [[ "$flag_apply" == "true" && "$automerge_status" == "unfound" && "$transport_type" == "pr" && "$check_status" != "failed" ]]; then
  enable_automerge "$transport_ref" || return 1
  ...
  automerge_added="true"
fi
```

the condition checks:
1. `flag_apply == "true"` — apply mode requested
2. `automerge_status == "unfound"` — not already enabled
3. `transport_type == "pr"` — only PRs have automerge
4. `check_status != "failed"` — don't automerge failed PRs

when automerge is already found, the block is skipped and the status shows `[found]` instead of `[added]`. this is idempotent behavior.

### usecase.5: retry behavior

**why it holds**:

examined `emit_transport_status.sh:95-104` and `git.release.sh:483-490`:

the `show_failed_checks()` function receives `$flag_retry` as a parameter. when `flag_retry == "true"` and a check is failed:
- line 485: `rerun_failed_workflows "$run_id"` is called
- line 486: `print_failed_check_with_retry` shows the rerun status

when no checks are failed, the retry logic is never reached — `show_failed_checks()` iterates over failed checks only.

### usecase.6: multi-transport flow

**why it holds**:

traced the main flow in `git.release.sh`:

1. **transport 1** (feature PR): lines 524-617
   - `get_pr_for_branch` finds the PR
   - `emit_transport_status` shows status
   - `emit_transport_watch` polls if watch mode
   - checks if merged before continue: line 610
   - `print_transition()` at line 616

2. **transport 2** (release PR): lines 622-760
   - `get_release_pr` finds the release PR
   - `emit_transport_status` shows status
   - `emit_transport_watch` polls if watch mode
   - checks if merged before continue: line 752
   - `print_transition()` at line 758

3. **transport 3** (release tag): lines 764-820
   - `get_latest_tag` or extracts from release PR title
   - `emit_transport_status` shows tag workflow status
   - `emit_transport_watch` polls tag workflows

each transport exits early if not merged. the `print_transition()` function emits `🫧 and then...` between transports.

### usecase.7: edge cases

**why it holds**:

| case | code path | output |
|------|-----------|--------|
| no PR | `git.release.sh:528-533` → `print_no_pr_status` | `🫧 no open branch pr` |
| needs rebase | `emit_transport_status.sh:109-119` → `print_rebase_status` | `🐚 needs rebase` + exit 2 |
| dirty work dir | `git.release.sh:178-196` | check + exit 2 with hint |

each edge case has explicit code and produces the declared output.

### usecase.8: alias behavior

**why it holds**:

- `--apply` sets `MODE="apply"` and `WATCH="true"`
- `--into` is the only destination flag (per wish, `--to` was removed, not aliased)

---

## blueprint contracts verification

### decomposed operation files

verified each file matches its contract:

| file | contract | verification |
|------|----------|--------------|
| `get_one_goal_from_input.sh` | returns `from=` and `into=` | lines 82-83 output key=value pairs |
| `get_all_flags_from_input.sh` | returns watch/apply/retry/dirty | lines 89-93 output key=value pairs |
| `get_one_transport_status.sh` | returns check/automerge/rebase/title | lines 126-132 output key=value pairs |
| `emit_transport_status.sh` | outputs uniform status, handles side effects | line 65 calls print_release_header, lines 122-138 handle apply |
| `emit_transport_watch.sh` | polls with 3+ cycles, terminal states | loop at lines 85-200, mock support at line 73 |
| `emit_one_transport_status_exitcode.sh` | semantic exit codes | lines 31-51 map status to exit codes |

all files are source-only (no shebang line at position 1) and define functions that match the filename pattern.

### main flow composition

verified that `git.release.sh` composes operations as declared:

1. line 501: `get_one_goal_from_input` extracts goal
2. lines 524-617: transport 1 uses `emit_transport_status` → `emit_transport_watch`
3. lines 622-760: transport 2 uses same pattern
4. lines 764-820: transport 3 uses same pattern

transitions use `print_transition()` between transports.

### exit code semantics

verified `emit_one_transport_status_exitcode.sh`:

- exit 0: passed, merged (lines 32-33)
- exit 1: unknown status (lines 47-49)
- exit 2: unfound, inflight, failed (lines 35-46)

this matches rule.require.exit-code-semantics.

---

## deviations found

none. every implementation detail matches the behavior declaration.

---

## conclusion

| category | adherence |
|----------|-----------|
| vision requirements | 4/4 verified |
| criteria usecases | 8/8 verified |
| blueprint contracts | 6/6 verified |
| main flow composition | verified |
| exit code semantics | verified |

**overall**: implementation fully adheres to behavior declaration. each requirement was traced through the code with specific line references and verified against the declared behavior.

---

## session verification: 2026-03-23

### `--to` removal verification

ran `grep --to\)` in git.release folder: **no matches found**

this confirms:
- `--to` handler removed from git.release.sh
- `--to` handler removed from get_all_flags_from_input.sh
- only `--into)` handler exists (at git.release.sh:73)

per has-pruned-backcompat review (r2):
- wish line 219 says "replace `--to` with `--into`" = remove, not alias
- the deprecated alias was unasked-for backcompat

**fix applied**: updated review sections that incorrectly mentioned `--to` as deprecated alias.

### adherance verified

| area | method | result |
|------|--------|--------|
| uniform stdout | traced both PR and tag paths to same print functions | holds |
| flag inference | traced all 7 scenes through get_one_goal_from_input | holds |
| watch cycles | verified mock support at emit_transport_watch.sh:73 | holds |
| apply behavior | verified automerge check at emit_transport_status.sh:122-138 | holds |
| exit codes | verified semantic codes at emit_one_transport_status_exitcode.sh | holds |

no deviations found. implementation adheres to behavior declaration.
