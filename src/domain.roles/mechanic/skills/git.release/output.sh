#!/usr/bin/env bash
######################################################################
# .what = turtle vibes output utils for git.release skill
#
# .why  = consistent, fun output format for release operations
#         - sources shared turtle output from git.commit
#         - adds release-specific status functions
#         - detects tty for output simplification
#
# usage:
#   source output.sh
#   print_release_header "turtle/feature-x" "main"
#   print_check_status "passed" 3
#   print_automerge_status "enabled"
######################################################################

# get skill directory
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# source shared turtle output from git.commit
source "$SKILL_DIR/../git.commit/output.sh"

# detect tty for output mode
IS_TTY=false
if [ -t 1 ]; then
  IS_TTY=true
fi

######################################################################
# print release header
# usage: print_release_header "branch/title"
######################################################################
print_release_header() {
  local title="$1"
  echo "🌊 release: $title"
}

######################################################################
# print check status line
# usage: print_check_status "passed|failed|progress" [count] [is_last]
######################################################################
print_check_status() {
  local status="$1"
  local count="${2:-}"
  local is_last="${3:-false}"

  local prefix="├─"
  if [[ "$is_last" == "true" ]]; then
    prefix="└─"
  fi

  case "$status" in
    passed)
      echo "   $prefix 👌 all checks passed"
      ;;
    failed)
      if [[ -n "$count" ]]; then
        echo "   $prefix ⚓ $count check(s) failed"
      else
        echo "   $prefix ⚓ checks failed"
      fi
      ;;
    progress)
      if [[ -n "$count" ]]; then
        echo "   $prefix 🐢 $count check(s) in progress"
      else
        echo "   $prefix 🐢 checks in progress"
      fi
      ;;
  esac
}

######################################################################
# print automerge status line
# usage: print_automerge_status "enabled|unfound|held|disabled|exposed|merged" [extra] [is_last]
######################################################################
print_automerge_status() {
  local status="$1"
  local extra="${2:-}"
  local is_last="${3:-false}"

  local prefix="├─"
  if [[ "$is_last" == "true" ]]; then
    prefix="└─"
  fi

  case "$status" in
    enabled)
      if [[ -n "$extra" ]]; then
        echo "   $prefix 🌴 automerge enabled [added]"
      else
        echo "   $prefix 🌴 automerge enabled [found]"
      fi
      ;;
    unfound)
      echo "   $prefix 🌴 automerge unfound (use --apply to add)"
      ;;
    held)
      echo "   $prefix 🌴 automerge unfound — held until each comment has an answer"
      ;;
    disabled)
      # extra = the unanswered count; one phrase with the 💬 line
      echo "   $prefix 🌴 automerge disabled [removed] — $extra comment(s) unanswered"
      ;;
    exposed)
      # plan never mutates; it says plainly what github will do
      echo "   $prefix 🌴 automerge enabled [found] — github will merge past $extra comment(s) unanswered once checks pass"
      ;;
    merged)
      # merged is always last (no further actions possible)
      echo "   └─ 🌴 already merged"
      ;;
  esac
}

######################################################################
# .what = print the comment line, only when a comment waits
# .why  = progressive disclosure: a pr with naught to answer shows naught;
#         a wait shows its count beside the ci tally, and the refusal (or
#         `get --unanswered`) carries the detail
#
# usage: print_comment_status indent count
#   indent = "   " (status tree) or "      " (watch tree)
######################################################################
print_comment_status() {
  local indent="$1"
  local count="$2"
  [[ "$count" == "0" ]] && return 0
  echo "${indent}├─ 💬 $count comment(s) unanswered"
}

######################################################################
# .what = the answer kinds a row list holds, as words: review issue unread
# .why  = the refusal names only the cures that apply to what waits
######################################################################
as_answer_kinds_of_rows() {
  printf '%s' "$1" | jq -r '
    [ (if any(.[]; .kind == "review" and .waits_on != "reviewer") then "review" else empty end),
      (if any(.[]; .kind == "issue") then "issue" else empty end),
      (if any(.[]; .waits_on == "reviewer") then "unread" else empty end) ] | join(" ")'
}

######################################################################
# .what = print one gate error block to stdout at its tree depth, and to
#         stderr as a whole tree under its own root
# .why  = the block hangs off the release tree on stdout; stderr holds no
#         such trunk, so its copy needs a root, or it opens on a bare `└─`
#
# usage: emit_gate_block indent pr_number block
#   block = the lines, each opened by the mark @I@ where the indent goes
######################################################################
emit_gate_block() {
  local indent="$1"
  local pr_number="$2"
  local block="$3"
  echo "${block//@I@/$indent}"
  printf '🐚 git.release · pr #%s\n%s\n' "$pr_number" "${block//@I@/   }" >&2
}

######################################################################
# .what = print the refusal while a comment waits on an answer
# .why  = how to find the comments that wait, how to answer each kind, then
#         rerun; there is no flag to skip it, so the cure is the only path
#
# usage: print_comment_refusal indent pr_number answer_kinds
#   answer_kinds = words from as_answer_kinds_of_rows; only those cures show
######################################################################
print_comment_refusal() {
  local indent="$1"
  local pr_number="$2"
  local kinds="$3"
  local cures=() lines="" i last

  [[ " $kinds " == *" review "* ]] && cures+=("a review thread: rhx git.pull.comment set --which $pr_number --reply-to <id> --key answer-<id> --from <file>")
  [[ " $kinds " == *" issue "* ]] && cures+=("an issue comment: rhx git.pull.comment set --which $pr_number --key answer-<id> --from <file>")
  [[ " $kinds " == *" unread "* ]] && cures+=("answered, unread: its reviewer marks the thread resolved on github")

  last=$(( ${#cures[@]} - 1 ))
  for i in "${!cures[@]}"; do
    if [[ "$i" == "$last" ]]; then
      lines+="@I@   │  └─ ${cures[$i]}"$'\n'
    else
      lines+="@I@   │  ├─ ${cures[$i]}"$'\n'
    fi
  done

  emit_gate_block "$indent" "$pr_number" "@I@└─ ✋ ConstraintError: release blocked until each comment has an answer
@I@   ├─ find them: rhx git.pull.comment get --which $pr_number --unanswered
@I@   ├─ answer each
${lines}@I@   └─ then: re-run this same release command"
}

######################################################################
# .what = print the malfunction when the comment read fails
# .why  = a failed read is never a silent 0; it names gh's words, what
#         automerge does now, and the fix
#
# usage: print_comment_read_failure indent detail automerge pr_number
#   automerge = off | on (plan; left on) | removed (turned off) | stuck (on; the disable failed)
######################################################################
print_comment_read_failure() {
  local indent="$1"
  local detail="$2"
  local automerge="$3"
  local pr_number="$4"
  local first="${detail%%$'\n'*}"
  local fix="rerun the same command: the comment read is safe to repeat; if it fails again, check gh auth status"
  [[ "${detail,,}" == *"rate limit"* ]] && fix="rerun once the rate limit resets (gh api rate_limit shows when)"
  [[ "$detail" =~ HTTP\ 40[13] && "${detail,,}" != *"rate limit"* ]] && fix="give the token read access to pull requests and issues of this repo; see its scopes: gh auth status"
  [[ "$detail" == *"found no pull request"* ]] && fix="rerun the same command; if it fails again, confirm the pr exists: gh pr view $pr_number"

  # name what automerge does now: a gate that cannot see must not leave it on unsaid
  # while automerge stays on, the fix is to turn it off: that is the urgent move
  # each cure line ends on its command alone, so a copy of it runs clean
  local automerge_line=""
  local cure_lines="@I@   └─ fix: $fix"
  local disable_lines="@I@   ├─ fix: turn it off now: gh pr merge $pr_number --disable-auto"$'\n'"@I@   └─ then: $fix"
  case "$automerge" in
    removed) automerge_line="@I@   ├─ automerge: disabled [removed], so github cannot merge past an unread comment"$'\n' ;;
    on)
      automerge_line="@I@   ├─ automerge: still on — github may merge past an unread comment"$'\n'
      cure_lines="$disable_lines"
      ;;
    stuck)
      automerge_line="@I@   ├─ automerge: still on, and the disable failed"$'\n'
      cure_lines="$disable_lines"
      ;;
  esac

  emit_gate_block "$indent" "$pr_number" "@I@└─ 💥 MalfunctionError: could not read pr comments
@I@   ├─ detail: ${first:-gh returned no output}
${automerge_line}${cure_lines}"
}

######################################################################
# .what = print the malfunction when automerge cannot be turned off
# .why  = in this state github will merge past the comments; the human
#         must see the exact command that turns it off
#
# usage: print_automerge_disable_failure indent pr_number reason
######################################################################
print_automerge_disable_failure() {
  local indent="$1"
  local pr_number="$2"
  local reason="$3"
  emit_gate_block "$indent" "$pr_number" "@I@└─ 💥 MalfunctionError: could not disable automerge while $reason
@I@   ├─ automerge: still on — github will merge past them once checks pass
@I@   └─ fix: turn it off now: gh pr merge $pr_number --disable-auto"
}

######################################################################
# print watch header (starts watch tree)
# usage: print_watch_header
######################################################################
print_watch_header() {
  echo "   └─ 🥥 let's watch"
}

######################################################################
# print watch poll line (shows poll cycle in watch tree)
# usage: print_watch_poll message action_time watched_time [is_last]
######################################################################
print_watch_poll() {
  local message="$1"
  local action_time="$2"
  local watched_time="$3"
  local is_last="${4:-false}"

  if [[ "$is_last" == "true" ]]; then
    echo "      └─ 💤 $message, ${action_time} in action, ${watched_time} watched"
  else
    echo "      ├─ 💤 $message, ${action_time} in action, ${watched_time} watched"
  fi
}

######################################################################
# print watch result (terminal state in watch tree)
# usage: print_watch_result "done|failed|timeout" [details]
######################################################################
print_watch_result() {
  local status="$1"
  local details="${2:-}"

  case "$status" in
    done)
      if [[ -n "$details" ]]; then
        echo "      └─ ✨ done! $details"
      else
        echo "      └─ ✨ done!"
      fi
      ;;
    failed)
      if [[ -n "$details" ]]; then
        echo "      └─ ⚓ failed: $details"
      else
        echo "      └─ ⚓ failed"
      fi
      ;;
    timeout)
      echo "      └─ ⏰ timeout after 15 minutes"
      ;;
  esac
}

######################################################################
# .what = print a pr watch timeout, and what automerge does after it
# .why  = once the watch exits, no gate reads a comment that lands later;
#         with automerge still on, github merges past it once checks pass
#
# usage: print_watch_timeout pr_number automerge_on timeout_label
#   timeout_label = how long the watch ran, e.g. "15 minutes"
######################################################################
print_watch_timeout() {
  local pr_number="$1"
  local automerge_on="$2"
  local timeout_label="$3"
  echo "      └─ ⏰ timeout after $timeout_label"
  _print_watch_end_automerge "$pr_number" "$automerge_on"
}

######################################################################
# .what = print a pr watch stopped by a signal (ctrl-c, a tool timeout)
# .why  = the usual end of a watch a robot runs is a killed call, not the
#         cap; with automerge on, the human must learn it outlives the gate
#
# usage: print_watch_stopped pr_number automerge_on
######################################################################
print_watch_stopped() {
  local pr_number="$1"
  local automerge_on="$2"
  emit_both "$(
    echo "      └─ 🛑 watch stopped before the merge"
    _print_watch_end_automerge "$pr_number" "$automerge_on"
  )"
}

######################################################################
# .what = the automerge lines under a watch that ended before the merge
# .why  = one text for every end: timeout or signal
#
# usage: _print_watch_end_automerge pr_number automerge_on
#        automerge_on = true | false | unknown (a stop before the first poll)
######################################################################
_print_watch_end_automerge() {
  local pr_number="$1"
  local automerge_on="$2"

  # unknown: the watch stopped before it read the pr, so say so, never silence
  if [[ "$automerge_on" == "unknown" ]]; then
    echo "         ├─ automerge: unread — this watch stopped before its first poll; if it is on, no gate reads a comment that lands after this exit
         ├─ fix: to keep the gate, rerun: rhx git.release --watch
         └─ or, to make sure it is off: gh pr merge $pr_number --disable-auto"
    return 0
  fi

  # off: naught outlives the watch
  if [[ "$automerge_on" != "true" ]]; then
    return 0
  fi

  echo "         ├─ automerge: still on — github merges once checks pass, and no gate reads a comment that lands after this exit
         ├─ fix: to keep the gate, rerun: rhx git.release --watch
         └─ or, to turn it off: gh pr merge $pr_number --disable-auto"
}

######################################################################
# print transition between transports
# usage: print_transition [message]
######################################################################
print_transition() {
  local message="${1:-and then...}"
  echo ""
  echo "🫧 $message"
  echo ""
}

######################################################################
# print rebase status line
# usage: print_rebase_status [has_conflicts]
######################################################################
print_rebase_status() {
  local has_conflicts="${1:-false}"

  if [[ "$has_conflicts" == "true" ]]; then
    echo "   ├─ 🐚 needs rebase, has conflicts"
  else
    echo "   ├─ 🐚 needs rebase"
  fi
  echo -e "   │  └─ \033[2mhint: rhx git.branch.rebase begin\033[0m"
}

######################################################################
# print no PR status
# usage: print_no_pr_status "branch" [unpushed_count]
# .note = an empty count means unknown (no origin ref to count against);
#         the line is omitted then, since this render only guides a push
######################################################################
print_no_pr_status() {
  local branch="$1"
  local unpushed="${2:-0}"

  echo "🫧 no open branch pr"
  if [[ "$unpushed" -gt 0 ]]; then
    echo "   ├─ $branch"
    echo "   └─ $unpushed unpushed commit(s)"
  else
    echo "   └─ $branch"
  fi
  # the next move is a coconut, apart from the diagnosis (rule.require.coconut-hints)
  print_coconut_hint "push the branch; the push findserts its pr" \
    "rhx git.commit.push --mode apply"
}

######################################################################
# emit no PR refusal
# .what = the crickets render for a branch with no pr, on both streams
# .why  = it is a constraint (exit 2), and a refusal must reach stderr too
#
# usage: emit_no_pr_refusal "branch" [unpushed_count]
######################################################################
emit_no_pr_refusal() {
  local refusal
  refusal=$(
    print_turtle_header "crickets..."
    print_no_pr_status "$@"
  )
  echo "$refusal"
  echo "$refusal" >&2
}

######################################################################
# print failed check with link
# usage: print_failed_check "name" "url" "message" [is_last]
######################################################################
print_failed_check() {
  local name="$1"
  local url="$2"
  local message="$3"
  local is_last="${4:-false}"

  if [[ "$is_last" == "true" ]]; then
    echo "   │  └─ 🔴 $name"
    echo "   │        ├─ $url"
    echo "   │        └─ $message"
  else
    echo "   │  ├─ 🔴 $name"
    echo "   │  │     ├─ $url"
    echo "   │  │     └─ $message"
  fi
}

######################################################################
# print failed check with link and retry confirmation
# matches extant alias pattern: shows 👌 rerun triggered inline
# usage: print_failed_check_with_retry "name" "url" "message" is_last run_id
######################################################################
print_failed_check_with_retry() {
  local name="$1"
  local url="$2"
  local message="$3"
  local is_last="${4:-false}"
  local run_id="$5"

  if [[ "$is_last" == "true" ]]; then
    echo "   │  └─ 🔴 $name"
    echo "   │        ├─ $url"
    echo "   │        ├─ $message"
    echo "   │        └─ 👌 rerun triggered"
  else
    echo "   │  ├─ 🔴 $name"
    echo "   │  │     ├─ $url"
    echo "   │  │     ├─ $message"
    echo "   │  │     └─ 👌 rerun triggered"
  fi
}

######################################################################
# print in-progress count inside failure block
# usage: print_progress_in_failure [count]
######################################################################
print_progress_in_failure() {
  local count="${1:-}"

  if [[ -n "$count" ]]; then
    echo "   │  └─ 🟡 $count check(s) still in progress"
  else
    echo "   │  └─ 🟡 checks still in progress"
  fi
}

######################################################################
# print hint line (last item in tree)
# usage: print_hint "message"
######################################################################
print_hint() {
  local message="$1"
  echo -e "   └─ \033[2mhint: $message\033[0m"
}

######################################################################
# print hint line (not last item - has more below)
# usage: print_hint_branch "message"
######################################################################
print_hint_branch() {
  local message="$1"
  echo -e "   ├─ \033[2mhint: $message\033[0m"
}

######################################################################
# print retry hint (uses branch - expects errors hint to follow)
# usage: print_retry_hint
######################################################################
print_retry_hint() {
  print_hint_branch "use --retry to rerun failed workflows"
}

######################################################################
# print errors hint
# usage: print_errors_hint
######################################################################
print_errors_hint() {
  print_hint "use rhx show.gh.test.errors to see test output"
}

######################################################################
# print apply hint
# usage: print_apply_hint
######################################################################
print_apply_hint() {
  print_hint "use --apply to enable automerge and watch"
}

######################################################################
# print tag workflow status
# usage: print_tag_status "name" "status" [elapsed]
######################################################################
print_tag_status() {
  local name="$1"
  local status="$2"
  local elapsed="${3:-}"

  case "$status" in
    passed)
      if [[ -n "$elapsed" ]]; then
        echo "      └─ 👌 $name completed after $elapsed"
      else
        echo "      └─ 👌 $name completed"
      fi
      ;;
    failed)
      echo "      ├─ 🔴 $name failed"
      echo -e "      └─ \033[2mhint: use --retry to rerun failed workflows\033[0m"
      ;;
    progress)
      echo "      └─ 🟡 $name in progress"
      ;;
  esac
}

######################################################################
# watch-context output functions
# same as regular functions but with watch-level indentation
# (used inside the 🥥 let's watch tree)
######################################################################

######################################################################
# print check status line in watch context
# usage: print_watch_check_status "failed" [count]
######################################################################
print_watch_check_status() {
  local status="$1"
  local count="${2:-}"

  case "$status" in
    failed)
      if [[ -n "$count" ]]; then
        echo "      ├─ ⚓ $count check(s) failed"
      else
        echo "      ├─ ⚓ checks failed"
      fi
      ;;
  esac
}

######################################################################
# print failed check with link in watch context
# usage: print_watch_failed_check "name" "url" "message" [is_last]
######################################################################
print_watch_failed_check() {
  local name="$1"
  local url="$2"
  local message="$3"
  local is_last="${4:-false}"

  if [[ "$is_last" == "true" ]]; then
    echo "      │  └─ 🔴 $name"
    echo "      │        ├─ $url"
    echo "      │        └─ $message"
  else
    echo "      │  ├─ 🔴 $name"
    echo "      │  │     ├─ $url"
    echo "      │  │     └─ $message"
  fi
}

######################################################################
# print in-progress count inside failure block in watch context
# usage: print_watch_progress_in_failure [count]
######################################################################
print_watch_progress_in_failure() {
  local count="${1:-}"

  if [[ -n "$count" ]]; then
    echo "      │  └─ 🟡 $count check(s) still in progress"
  else
    echo "      │  └─ 🟡 checks still in progress"
  fi
}

######################################################################
# print retry hint in watch context (branch - errors hint follows)
# usage: print_watch_retry_hint
######################################################################
print_watch_retry_hint() {
  echo -e "      ├─ \033[2mhint: use --retry to rerun failed workflows\033[0m"
}

######################################################################
# print errors hint in watch context (last item)
# usage: print_watch_errors_hint
######################################################################
print_watch_errors_hint() {
  echo -e "      └─ \033[2mhint: use rhx show.gh.test.errors to see test output\033[0m"
}

######################################################################
# await-context output functions
# used inside the 🫧 and then... transition for artifact await
# 3-space indent (one level under 🫧)
######################################################################

######################################################################
# .what = emit poll line for await transition
# .why  = shows progress while await is pending
#
# usage: print_await_poll elapsed_seconds [is_last]
######################################################################
print_await_poll() {
  local elapsed_seconds="$1"
  local is_last="${2:-false}"

  local prefix="├─"
  if [[ "$is_last" == "true" ]]; then
    prefix="└─"
  fi

  echo "   $prefix 💤 ${elapsed_seconds}s in await"
}

######################################################################
# .what = emit result line for await transition
# .why  = shows final state: found or timeout with artifact name
#
# usage: print_await_result "found|timeout" [elapsed_or_artifact] [timeout_seconds]
#   found: print_await_result found 15
#   timeout: print_await_result timeout "release pr" 90
######################################################################
print_await_result() {
  local status="$1"

  case "$status" in
    found)
      local elapsed="$2"
      echo "   └─ ✨ found! after ${elapsed}s"
      ;;
    timeout)
      local artifact_display="$2"
      local timeout_seconds="${3:-90}"
      echo "   └─ ⚓ $artifact_display did not appear in ${timeout_seconds}s"
      ;;
  esac
}

######################################################################
# .what = emit workflow status nested tree
# .why  = shows release-please workflow status on timeout for diagnostics
#
# usage: print_workflow_status name url status
#   print_workflow_status "release-please" "https://..." "failed"
#   print_workflow_status "release-please" "" "not_found"
######################################################################
print_workflow_status() {
  local name="$1"
  local url="$2"
  local status="$3"

  echo "      └─ 🔴 $name"
  if [[ -n "$url" ]]; then
    echo "            ├─ $url"
    echo "            └─ $status"
  else
    echo "            └─ $status"
  fi
}
