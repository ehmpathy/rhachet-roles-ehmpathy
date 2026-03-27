# review.self: has-consistent-mechanisms (r5)

## the artifact reviewed

file: `.behavior/v2026_03_22.fix-git-release/3.3.1.blueprint.product.v1.i1.md`

i re-read:
- codepath tree (lines 33-86)
- the extant `git.release.operations.sh` file

---

## question: do new mechanisms duplicate extant functionality?

for each new mechanism in the blueprint, i ask:
1. does the codebase already have a mechanism that does this?
2. if yes, does the blueprint reuse it or duplicate it?
3. if the blueprint creates a new mechanism, is it distinct from extant?

---

## extant mechanisms in git.release.operations.sh

| function | purpose |
|----------|---------|
| `_gh_with_retry` | retry gh commands on transient errors |
| `get_pr_for_branch` | find PR number for a branch |
| `get_release_pr` | find release PR on main |
| `get_pr_status` | get JSON status of a PR |
| `parse_check_counts` | extract check counts from status JSON |
| `get_failed_checks` | list failed check names |
| `has_automerge` | check if PR has automerge enabled |
| `needs_rebase` | check if PR needs rebase |
| `is_pr_merged` | check if PR is merged |
| `enable_automerge` | enable automerge on a PR |
| `get_tag_runs` | get workflow runs for a tag |
| `rerun_failed_workflows` | trigger rerun of failed workflows |
| `wait_for_target` | poll until PR/tag reaches terminal state |
| `format_duration` | format seconds as human time |

---

## blueprint's proposed new mechanisms

### [+] get_one_goal_from_input

**extant equivalent?** no.

**analysis**: the extant code has flag parse logic inline in `git.release.sh`. the goal inference (from branch + flags → goal.from, goal.into) is not encapsulated as a function. the inline logic is scattered:

```bash
# extant inline in git.release.sh (approx lines 50-80)
if [[ "$FLAG_FROM" == "main" ]] && [[ "$FLAG_INTO" == "main" ]]; then
  # error
fi
# ... more inline logic
```

**verdict**: not a duplicate. extracts inline logic into a testable function.

---

### [+] get_all_flags_from_input

**extant equivalent?** no.

**analysis**: the extant code parses flags via a `while` loop in `git.release.sh`:

```bash
# extant inline in git.release.sh (approx lines 20-50)
while [[ $# -gt 0 ]]; do
  case $1 in
    --to) FLAG_TO="$2"; shift 2 ;;
    # ... more cases
  esac
done
```

**verdict**: not a duplicate. extracts inline flag parse into a testable function.

---

### [+] get_one_transport_status

**extant equivalent?** partial — `get_pr_status`, `parse_check_counts`, `has_automerge`, `needs_rebase`, `is_pr_merged`.

**analysis**: the blueprint proposes `get_one_transport_status` as a **composer** that calls the extant mechanisms:

```
get_one_transport_status()
├─ calls get_pr_status() (extant)
├─ calls parse_check_counts() (extant)
├─ calls has_automerge() (extant)
├─ calls needs_rebase() (extant)
├─ calls is_pr_merged() (extant)
└─ returns unified STATUS_CHECK, STATUS_AUTOMERGE, STATUS_REBASE
```

**verdict**: not a duplicate. composes extant mechanisms into a uniform interface for all transports.

---

### [+] emit_transport_status

**extant equivalent?** partial — inline stdout in `git.release.sh`.

**analysis**: the extant code has inline print statements scattered throughout the main flow:

```bash
# extant inline (scattered)
echo "🌊 release: $PR_TITLE"
echo "   ├─ checks: $PASSED passed, $FAILED failed"
# ... etc
```

these are not consistent across transports. the blueprint extracts them into a uniform function.

**verdict**: not a duplicate. consolidates scattered inline prints into a uniform function.

---

### [+] emit_transport_watch

**extant equivalent?** partial — `wait_for_target`.

**analysis**: the extant `wait_for_target` function polls and waits, but:
- it does not emit uniform stdout (poll cycle lines)
- it does not show "at least 3 poll cycles" as required by the wish

the blueprint's `emit_transport_watch`:
- calls `wait_for_target` or similar poll logic
- emits uniform `💤 N left, Xs in action, Xs watched` lines
- emits `🥥 let's watch` header and `✨ done!` footer

**verdict**: not a duplicate. wraps extant poll logic with uniform stdout emission.

---

### [+] emit_one_transport_status_exitcode

**extant equivalent?** no.

**analysis**: the extant code has inline exit statements:

```bash
# extant inline
if [[ "$STATUS" == "failed" ]]; then
  exit 1
fi
```

the blueprint proposes a function that:
- takes a status
- exits with semantic code (0 for success, 2 for constraint error)

**verdict**: not a duplicate. extracts inline exit logic into a consistent function.

---

## blueprint's retained mechanisms

### [○] _gh_with_retry

**extant?** yes — lines 1-30 of `git.release.operations.sh`.

**blueprint action**: retain.

**verdict**: correct. not duplicated.

---

### [○] get_pr_for_branch

**extant?** yes — lines 32-45 of `git.release.operations.sh`.

**blueprint action**: retain.

**verdict**: correct. not duplicated.

---

### [○] get_pr_status

**extant?** yes — lines 60-80 of `git.release.operations.sh`.

**blueprint action**: retain.

**verdict**: correct. not duplicated.

---

### [○] enable_automerge

**extant?** yes — lines 140-160 of `git.release.operations.sh`.

**blueprint action**: retain.

**verdict**: correct. not duplicated.

---

### [○] rerun_failed_workflows

**extant?** yes — lines 180-210 of `git.release.operations.sh`.

**blueprint action**: retain.

**verdict**: correct. not duplicated.

---

## issues found

none. all new mechanisms are either:
1. extractions of inline logic (not duplicates)
2. composers of extant mechanisms (not duplicates)
3. wrappers that add uniform stdout (not duplicates)

the blueprint correctly marks extant mechanisms with [○] for retention.

---

## summary

| new mechanism | duplicates extant? | verdict |
|---------------|-------------------|---------|
| get_one_goal_from_input | no — extracts inline | valid |
| get_all_flags_from_input | no — extracts inline | valid |
| get_one_transport_status | no — composes extant | valid |
| emit_transport_status | no — consolidates inline | valid |
| emit_transport_watch | no — wraps extant with stdout | valid |
| emit_one_transport_status_exitcode | no — extracts inline | valid |

| retained mechanism | extant? | verdict |
|--------------------|---------|---------|
| _gh_with_retry | yes | correct |
| get_pr_for_branch | yes | correct |
| get_pr_status | yes | correct |
| enable_automerge | yes | correct |
| rerun_failed_workflows | yes | correct |

**no duplication found.** the blueprint correctly reuses extant mechanisms and creates new mechanisms only where needed for composition, extraction, or uniform stdout.

