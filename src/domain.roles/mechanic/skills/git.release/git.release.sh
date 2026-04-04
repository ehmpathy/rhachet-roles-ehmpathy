#!/usr/bin/env bash
######################################################################
# .what = release to main or prod with plan/apply pattern
#
# .why  = automates the release workflow:
#         - merge feature branch pr to main
#         - full release cycle: merge → watch CI → tag → deploy
#         - wraps extant git release alias with turtle vibes
#
# usage:
#   git.release                                       # plan: show pr status (infers --into based on branch)
#   git.release --watch                               # watch CI without automerge
#   git.release --apply                               # enable automerge and watch
#   git.release --into prod                           # plan: show release pr status
#   git.release --into prod --watch                   # watch release CI without automerge
#   git.release --into prod --apply                   # apply: full release cycle
#   git.release --retry                               # retry failed workflows
#   git.release --from main --into prod               # skip feature branch, release from main
#   git.release --from main --into prod --watch       # watch main release without automerge
#   git.release --from main --into prod --apply       # apply main release to prod
#
# inference:
#   - on feature branch, no flags: --into main
#   - on main branch, no flags: --into prod
#   - --from main, no --into: --into prod
#
# guarantee:
#   - plan mode is default (safe preview)
#   - --watch watches without automerge
#   - apply mode enables automerge and watches
#   - apply mode requires git.commit.uses permission (locally or globally)
#   - watches CI until complete or timeout (15 min)
#   - surfaces errors with links and retry hints
#   - --from main skips feature branch requirement
#
# note:
#   - MUST run in FOREGROUND (never background)
#   - watches CI interactively, requires TTY for spinner
######################################################################
set -euo pipefail

# mandate GITHUB_TOKEN from keyrack only - never use environment token
unset GITHUB_TOKEN

# get skill directory
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# source dependencies
source "$SKILL_DIR/output.sh"
source "$SKILL_DIR/git.release.operations.sh"

# source decomposed operations
source "$SKILL_DIR/git.release._.get_one_goal_from_input.sh"
source "$SKILL_DIR/git.release._.get_all_flags_from_input.sh"
source "$SKILL_DIR/git.release._.get_one_transport_status.sh"
source "$SKILL_DIR/git.release._.emit_transport_status.sh"
source "$SKILL_DIR/git.release._.emit_transport_watch.sh"
source "$SKILL_DIR/git.release._.emit_one_transport_status_exitcode.sh"
source "$SKILL_DIR/git.release._.and_then_await.sh"

######################################################################
# argument parse
######################################################################
TO=""  # inferred by get_one_goal_from_input when not specified
FROM=""  # --from main: skip feature branch requirement
MODE="plan"
WATCH="false"
RETRY="false"
DIRTY="block"  # default: fail fast if unstaged changes on --mode apply
FROM_PROD="false"  # set by release_to_prod to suppress headers in release_to_main

while [[ $# -gt 0 ]]; do
  case $1 in
    --into)
      TO="$2"
      shift 2
      ;;
    --from)
      FROM="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --apply)
      # alias for --mode apply (implies --watch)
      MODE="apply"
      WATCH="true"
      shift
      ;;
    --watch)
      WATCH="true"
      shift
      ;;
    --retry)
      RETRY="true"
      shift
      ;;
    --dirty)
      DIRTY="$2"
      shift 2
      ;;
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    --help|-h)
      echo "usage: git.release [--into main|prod] [--from main] [--watch] [--apply] [--mode plan|apply] [--retry] [--dirty block|allow]"
      echo ""
      echo "  --into main   merge feature branch to main (default when on feature branch)"
      echo "  --into prod   full release to prod (default when on main, or with --from main)"
      echo "  --from main   skip feature branch requirement, act as if on main"
      echo "  --watch       watch CI without automerge"
      echo "  --apply       enable automerge and watch (alias for --mode apply)"
      echo "  --mode plan   show status only (default)"
      echo "  --mode apply  enable automerge and watch"
      echo "  --retry       rerun failed workflows before watch"
      echo "  --dirty block fail fast if unstaged changes (default)"
      echo "  --dirty allow allow release even with unstaged changes"
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      echo "usage: git.release [--into main|prod] [--from main] [--watch] [--apply] [--mode plan|apply] [--retry]" >&2
      exit 2
      ;;
  esac
done

######################################################################
# guards
######################################################################

# validate --into value (only if specified)
if [[ -n "$TO" && "$TO" != "main" && "$TO" != "prod" ]]; then
  echo "error: --into must be 'main' or 'prod', got '$TO'" >&2
  exit 2
fi

# validate --mode value
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  echo "error: --mode must be 'plan' or 'apply', got '$MODE'" >&2
  exit 2
fi

# validate --dirty value
if [[ "$DIRTY" != "block" && "$DIRTY" != "allow" ]]; then
  echo "error: --dirty must be 'block' or 'allow', got '$DIRTY'" >&2
  exit 2
fi

# note: --from accepts "main" or any branch name (e.g., "turtle/feature-x")
# validation of invalid combinations (e.g., --from main --into main) is done by get_one_goal_from_input

# note: validation of --from main --into main is done by get_one_goal_from_input

# ensure in git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository" >&2
  exit 2
fi

# detect tty for output mode (exported for output.sh)
export IS_TTY="false"
if [ -t 1 ]; then
  export IS_TTY="true"
fi

# check for modified tracked files (apply mode only, unless --dirty allow)
# note: ignores untracked files (??) - only catches modified/deleted/staged tracked files
if [[ "$MODE" == "apply" && "$DIRTY" == "block" ]]; then
  DIRTY_FILES=$(git status --porcelain 2>/dev/null | grep -v '^??' || true)
  if [[ -n "$DIRTY_FILES" ]]; then
    print_turtle_header "hold up dude..."
    if [[ -n "$TO" ]]; then
      echo "🐚 git.release --into $TO --mode apply"
    else
      echo "🐚 git.release --mode apply"
    fi
    echo ""
    echo "   ⚠️  uncommitted changes detected"
    echo "   ├─ you have modified tracked files in your work tree"
    echo "   ├─ release with dirty state is risky (may not match what CI tests)"
    echo "   └─ options:"
    echo "      ├─ commit or stash your changes first"
    echo "      └─ use --dirty allow to release anyway"
    exit 2
  fi
fi

# check git.commit.uses permission for apply mode
if [[ "$MODE" == "apply" ]]; then
  # repo root for state files
  REPO_ROOT=$(git rev-parse --show-toplevel)
  METER_DIR="$REPO_ROOT/.meter"
  LOCAL_STATE_FILE="$METER_DIR/git.commit.uses.jsonc"

  # global state file
  GLOBAL_DIR="$HOME/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter"
  GLOBAL_STATE_FILE="$GLOBAL_DIR/git.commit.uses.global.jsonc"

  # check global blocker first
  if [[ -f "$GLOBAL_STATE_FILE" ]]; then
    BLOCKED=$(jq -r '.blocked // false' "$GLOBAL_STATE_FILE" 2>/dev/null || echo "false")
    if [[ "$BLOCKED" == "true" ]]; then
      print_turtle_header "bummer dude..."
      echo "🐚 git.release --mode apply"
      echo ""
      echo "✋ blocked: commits blocked globally"
      echo ""
      echo "   ask your human to lift:"
      echo "   $ git.commit.uses allow --global"
      exit 2
    fi
  fi

  # check local permission
  if [[ ! -f "$LOCAL_STATE_FILE" ]]; then
    print_turtle_header "bummer dude..."
    echo "🐚 git.release --mode apply"
    echo ""
    echo "✋ blocked: no commit quota set"
    echo ""
    echo "   ask your human to grant:"
    echo "   $ git.commit.uses set --quant N --push allow"
    exit 2
  fi

  # check uses > 0 or "infinite"
  USES=$(jq -r '.uses' "$LOCAL_STATE_FILE")
  if [[ "$USES" != "infinite" && "$USES" -le 0 ]]; then
    print_turtle_header "bummer dude..."
    echo "🐚 git.release --mode apply"
    echo ""
    echo "✋ blocked: no commit uses left"
    echo ""
    echo "   ask your human to grant more:"
    echo "   $ git.commit.uses set --quant N --push allow"
    exit 2
  fi
fi

######################################################################
# delay between merges
# shows "💤 Ns delay to await next runners" and waits (unless test mode)
######################################################################
delay_for_next_pr() {
  local seconds="$1"
  local reason="${2:-next runners}"

  echo "💤 ${seconds}s delay to await $reason"

  # skip actual sleep in test mode
  if [[ "${GIT_RELEASE_TEST_MODE:-}" == "true" ]]; then
    return 0
  fi

  # also skip if POLL_INTERVAL is set to 0 (test acceleration)
  if [[ "${GIT_RELEASE_POLL_INTERVAL:-}" == "0" ]]; then
    return 0
  fi

  sleep "$seconds"
}

######################################################################
# keyrack token fetch (apply mode only)
######################################################################
GH_TOKEN=""

fetch_token_if_needed() {
  if [[ "$MODE" == "apply" ]]; then
    GH_TOKEN=$(fetch_github_token)
    if [[ -z "$GH_TOKEN" ]]; then
      print_turtle_header "bummer dude..."
      echo "🔐 github token not found"
      echo "   ├─ run: rhx keyrack unlock --owner ehmpath --prikey ~/.ssh/ehmpath --env prep"
      echo "   └─ then retry this command"
      exit 1
    fi
    export GH_TOKEN
  fi
}

######################################################################
# NOTE: watch functions moved to git.release._.emit_transport_watch.sh
# The emit_transport_watch() function is sourced above and called from
# the main flow below.
######################################################################

######################################################################
# format elapsed time as human-readable
######################################################################
format_elapsed() {
  local seconds="$1"
  local mins=$(( seconds / 60 ))
  local secs=$(( seconds % 60 ))

  if [[ $mins -gt 0 ]]; then
    echo "${mins}m ${secs}s"
  else
    echo "${secs}s"
  fi
}

######################################################################
# show failed checks with links in watch context
# same as show_failed_checks but uses watch-level indentation
######################################################################
show_failed_checks_in_watch() {
  local status_json="$1"
  local in_progress_count="${2:-0}"
  local failed_json
  failed_json=$(get_failed_checks "$status_json")

  local count
  count=$(echo "$failed_json" | jq 'length')

  local i=0
  while IFS= read -r check; do
    local name url conclusion
    name=$(echo "$check" | jq -r '.name')
    url=$(echo "$check" | jq -r '.url')
    conclusion=$(echo "$check" | jq -r '.conclusion | ascii_downcase')

    i=$((i + 1))
    local is_last="false"
    # only mark as last if this is the last check AND no in-progress items follow
    if [[ $i -eq $count && "$in_progress_count" -eq 0 ]]; then
      is_last="true"
    fi

    # extract run_id from url
    local run_id
    run_id=$(echo "$url" | grep -oP 'runs/\K\d+' || true)

    # get step name and duration for message
    local message="$conclusion"
    if [[ -n "$run_id" ]]; then
      local step_name duration_secs
      step_name=$(get_failed_step_name "$run_id")
      duration_secs=$(get_run_duration "$run_id")

      if [[ -n "$duration_secs" && "$duration_secs" -gt 0 ]]; then
        local duration_str
        duration_str=$(format_duration "$duration_secs")
        message="failed after $duration_str"
      elif [[ -n "$step_name" ]]; then
        message="$step_name"
      fi
    fi

    print_watch_failed_check "$name" "$url" "$message" "$is_last"
  done < <(echo "$failed_json" | jq -c '.[]')

  # show in-progress count if any
  if [[ "$in_progress_count" -gt 0 ]]; then
    print_watch_progress_in_failure "$in_progress_count"
  fi
}

######################################################################
# show failed tag runs with links (status context)
# matches structure of show_failed_checks but for tag workflow runs
# uses status-level indentation and supports retry
######################################################################
show_failed_tag_runs_in_status() {
  local tag_name="$1"
  local retry="${2:-false}"
  local has_more="${3:-false}"

  # get tag runs
  local runs_json
  runs_json=$(get_tag_runs "$tag_name")

  # get failed runs
  local failed_runs
  failed_runs=$(echo "$runs_json" | jq -c '[.[] | select(.conclusion == "failure" or .conclusion == "cancelled")]')

  local failed_count
  failed_count=$(echo "$failed_runs" | jq 'length')

  if [[ "$failed_count" -eq 0 ]]; then
    return 0
  fi

  # print each failed run
  local i=0
  while IFS= read -r run; do
    local name url conclusion run_id
    name=$(echo "$run" | jq -r '.name')
    url=$(echo "$run" | jq -r '.url')
    conclusion=$(echo "$run" | jq -r '.conclusion | ascii_downcase')

    # extract run_id from url
    run_id=$(echo "$url" | grep -oP 'runs/\K\d+' || true)

    # get duration for message
    local message="$conclusion"
    if [[ -n "$run_id" ]]; then
      local duration_secs
      duration_secs=$(get_run_duration "$run_id")

      if [[ -n "$duration_secs" && "$duration_secs" -gt 0 ]]; then
        local duration_str
        duration_str=$(format_duration "$duration_secs")
        message="failed after $duration_str"
      fi
    fi

    i=$((i + 1))
    local is_last="false"
    # only mark as last if this is the last check AND no more items follow
    if [[ $i -eq $failed_count && "$has_more" != "true" ]]; then
      is_last="true"
    fi

    # print check with optional retry
    if [[ "$retry" == "true" && -n "$run_id" ]]; then
      # failloud: let rerun errors propagate (suppress success output, keep stderr)
      rerun_failed_workflows "$run_id" > /dev/null
      print_failed_check_with_retry "$name" "$url" "$message" "$is_last" "$run_id"
    else
      print_failed_check "$name" "$url" "$message" "$is_last"
    fi
  done < <(echo "$failed_runs" | jq -c '.[]')
}

######################################################################
# show failed tag runs with links (watch context)
# matches structure of show_failed_checks but for tag workflow runs
# and uses watch-level indentation
######################################################################
show_failed_tag_runs() {
  local runs_json="$1"
  local in_progress_count="${2:-0}"

  # get failed runs
  local failed_runs
  failed_runs=$(echo "$runs_json" | jq -c '[.[] | select(.conclusion == "failure" or .conclusion == "cancelled")]')

  local failed_count
  failed_count=$(echo "$failed_runs" | jq 'length')

  # print header
  print_watch_check_status "failed" "$failed_count"

  # print each failed run
  local i=0
  while IFS= read -r run; do
    local name url conclusion run_id
    name=$(echo "$run" | jq -r '.name')
    url=$(echo "$run" | jq -r '.url')
    conclusion=$(echo "$run" | jq -r '.conclusion | ascii_downcase')

    # extract run_id from url
    run_id=$(echo "$url" | grep -oP 'runs/\K\d+' || true)

    # get duration for message
    local message="$conclusion"
    if [[ -n "$run_id" ]]; then
      local duration_secs
      duration_secs=$(get_run_duration "$run_id")

      if [[ -n "$duration_secs" && "$duration_secs" -gt 0 ]]; then
        local duration_str
        duration_str=$(format_duration "$duration_secs")
        message="failed after $duration_str"
      fi
    fi

    i=$((i + 1))
    local is_last="false"
    # only mark as last if this is the last check AND no in-progress items follow
    if [[ $i -eq $failed_count && "$in_progress_count" -eq 0 ]]; then
      is_last="true"
    fi

    print_watch_failed_check "$name" "$url" "$message" "$is_last"
  done < <(echo "$failed_runs" | jq -c '.[]')

  # show in-progress count if any
  if [[ "$in_progress_count" -gt 0 ]]; then
    print_watch_progress_in_failure "$in_progress_count"
  fi
}

######################################################################
# show failed checks with links (and optional retry)
# matches extant alias _git_release_report_failed_checks pattern
# has_more: if true, never mark last check as "is_last" (more items follow)
######################################################################
show_failed_checks() {
  local status_json="$1"
  local retry="${2:-false}"
  local has_more="${3:-false}"
  local failed_json
  failed_json=$(get_failed_checks "$status_json")

  local count
  count=$(echo "$failed_json" | jq 'length')

  local i=0
  while IFS= read -r check; do
    local name url conclusion
    name=$(echo "$check" | jq -r '.name')
    url=$(echo "$check" | jq -r '.url')
    conclusion=$(echo "$check" | jq -r '.conclusion | ascii_downcase')

    i=$((i + 1))
    local is_last="false"
    # only mark as last if this is the last check AND no more items follow
    if [[ $i -eq $count && "$has_more" != "true" ]]; then
      is_last="true"
    fi

    # extract run_id from url
    local run_id
    run_id=$(echo "$url" | grep -oP 'runs/\K\d+' || true)

    # get step name and duration for message (matches extant alias)
    local message="$conclusion"
    if [[ -n "$run_id" ]]; then
      # get failed step name
      local step_name
      step_name=$(get_failed_step_name "$run_id")

      # get duration
      local duration_secs
      duration_secs=$(get_run_duration "$run_id")

      # format message: "failed after Xm Ys" or step name
      if [[ -n "$duration_secs" && "$duration_secs" -gt 0 ]]; then
        local duration_str
        duration_str=$(format_duration "$duration_secs")
        message="failed after $duration_str"
      elif [[ -n "$step_name" ]]; then
        message="$step_name"
      fi
    fi

    # print check with optional retry
    if [[ "$retry" == "true" && -n "$run_id" ]]; then
      # failloud: let rerun errors propagate (suppress success output, keep stderr)
      rerun_failed_workflows "$run_id" > /dev/null
      print_failed_check_with_retry "$name" "$url" "$message" "$is_last" "$run_id"
    else
      print_failed_check "$name" "$url" "$message" "$is_last"
    fi
  done < <(echo "$failed_json" | jq -c '.[]')
}

######################################################################
# main flow via decomposed operations
######################################################################

# infer goal from branch and flags
CURRENT_BRANCH=$(get_current_branch)
DEFAULT_BRANCH=$(get_default_branch)

GOAL=$(get_one_goal_from_input "$CURRENT_BRANCH" "$FROM" "$TO" "$DEFAULT_BRANCH") || exit 2
GOAL_FROM=$(echo "$GOAL" | grep -oP '^from=\K.*')
GOAL_INTO=$(echo "$GOAL" | grep -oP '^into=\K.*')

# convert MODE to FLAG_APPLY boolean
FLAG_APPLY="false"
[[ "$MODE" == "apply" ]] && FLAG_APPLY="true"

# determine branch to release from
RELEASE_BRANCH="$CURRENT_BRANCH"
if [[ "$FROM" == "main" ]]; then
  RELEASE_BRANCH="$DEFAULT_BRANCH"
elif [[ -n "$FROM" && "$FROM" != "feat" ]]; then
  RELEASE_BRANCH="$FROM"
fi

# track if we print turtle header (only print once)
TURTLE_PRINTED="false"

######################################################################
# transport 1: feature branch PR (if from=feat or from=<branch-name>)
# note: runs if GOAL_FROM is not "main" (i.e., "feat" or explicit branch)
######################################################################
if [[ "$GOAL_FROM" != "main" ]]; then
  # find pr for branch
  pr_number=$(get_pr_for_branch "$RELEASE_BRANCH")

  if [[ -z "$pr_number" ]]; then
    # no pr found - constraint error
    print_turtle_header "crickets..."
    print_no_pr_status "$RELEASE_BRANCH" "$(get_unpushed_count)"
    exit 2
  fi

  # get pr status for display
  status_json=$(get_pr_status "$pr_number")

  # print turtle header
  if [[ "$TURTLE_PRINTED" == "false" ]]; then
    # build --from clause if explicit branch specified
    from_clause=""
    if [[ "$GOAL_FROM" != "feat" && "$GOAL_FROM" != "main" ]]; then
      from_clause="--from $GOAL_FROM "
    fi

    retry_flag=""
    if [[ "$RETRY" == "true" ]]; then retry_flag=" --retry"; fi
    if [[ "$MODE" == "apply" ]]; then
      print_turtle_header "cowabunga!"
      echo "🐚 git.release ${from_clause}--into $GOAL_INTO --mode apply --watch${retry_flag}"
    elif [[ "$WATCH" == "true" ]]; then
      print_turtle_header "heres the wave..."
      echo "🐚 git.release ${from_clause}--into $GOAL_INTO --watch${retry_flag}"
    else
      print_turtle_header "heres the wave..."
      echo "🐚 git.release ${from_clause}--into $GOAL_INTO --mode plan${retry_flag}"
    fi
    echo ""
    TURTLE_PRINTED="true"
  fi

  # emit status via decomposed operation
  # note: use `|| status_result=$?` pattern to capture non-zero returns under set -e
  status_result=0
  emit_transport_status "pr" "$pr_number" "$FLAG_APPLY" "$RETRY" "$WATCH" "$status_json" || status_result=$?

  # check for malfunction (exit 1) - propagate failloud
  if [[ $status_result -eq 1 ]]; then
    exit 1
  fi

  # if status returned constraint (exit 2), decide next action
  # - if retry was requested without watch/apply: exit 0 (user monitors separately)
  # - if retry was requested with watch/apply: continue to watch
  # - if no retry: exit 2
  if [[ $status_result -eq 2 ]]; then
    if [[ "$RETRY" == "true" ]]; then
      if [[ "$WATCH" != "true" && "$FLAG_APPLY" != "true" ]]; then
        # retry-only: exit 0 (user monitors via separate --watch)
        exit 0
      fi
      # retry + watch/apply: continue to watch below
    else
      # no retry: constraint error
      exit 2
    fi
  fi

  # if status returned already-merged (exit 3), skip watch
  # the PR was already merged before we started, no watch needed
  skip_watch="false"
  if [[ $status_result -eq 3 ]]; then
    skip_watch="true"
  fi

  # watch if requested (watch/apply after retry is valid per blueprint)
  if [[ "$WATCH" == "true" || "$FLAG_APPLY" == "true" ]] && [[ "$skip_watch" != "true" ]]; then
    # note: use `|| watch_result=$?` pattern to capture non-zero returns under set -e
    watch_result=0
    emit_transport_watch "pr" "$pr_number" || watch_result=$?

    if [[ $watch_result -ne 0 ]]; then
      exit $watch_result
    fi

    # note: emit_transport_watch returns 0 when:
    # - PR is merged (success) → continue to next transport
    # - checks pass without automerge (success) → exit 0, hint already shown
  fi

  # if not bound for prod, done here
  if [[ "$GOAL_INTO" != "prod" ]]; then
    # show hint to release to prod (only if apply mode was used)
    if [[ "$MODE" == "apply" ]]; then
      echo ""
      echo -e "\033[2m🐚 continue?: rhx git.release --into prod --mode apply\033[0m"
    fi
    exit 0
  fi

  # check if PR is merged before we continue to release branch
  # (watch returns 0 even when checks pass without automerge - in that case, exit 0)
  merged_status=$(get_pr_status "$pr_number")
  if [[ $(is_pr_merged "$merged_status") != "true" ]]; then
    # not merged - watch showed hint, we're done
    exit 0
  fi

  # await release PR after feature PR merge
  # note: always await even if skip_watch=true - release-please creates PR AFTER the merge
  # get merge commit from feature PR for freshness check
  feat_merge_commit=$(_gh_with_retry gh pr view "$pr_number" --json mergeCommit --jq '.mergeCommit.oid')

  # await fresh release PR with commit-based freshness
  await_result=0
  and_then_await \
    artifact_type="release-pr" \
    artifact_display="release pr" \
    prior_merge_commit="$feat_merge_commit" || await_result=$?

  if [[ $await_result -ne 0 ]]; then
    exit $await_result
  fi
fi

######################################################################
# transport 2: release branch PR (if into=prod)
######################################################################
if [[ "$GOAL_INTO" == "prod" ]]; then
  # get release pr: use AWAIT_RESULT if we came from feature branch, else lookup
  if [[ -n "$AWAIT_RESULT" ]]; then
    # came from feature branch, use awaited result
    release_pr=$(echo "$AWAIT_RESULT" | jq -r '.number')
  else
    # direct entry via --from main, lookup release pr
    release_pr=$(get_release_pr) || exit 1
  fi

  if [[ -z "$release_pr" ]]; then
    # no release pr found - check for latest tag
    latest_tag=$(get_latest_tag)

    if [[ -z "$latest_tag" ]]; then
      # no release PR and no tags
      if [[ "$TURTLE_PRINTED" == "false" ]]; then
        print_turtle_header "crickets..."
        echo "🐚 git.release --into $GOAL_INTO"
        echo ""
        TURTLE_PRINTED="true"
      fi
      echo "🫧 no release pr or tags found"
      exit 0
    fi

    # tag exists - check its workflows
    if [[ "$TURTLE_PRINTED" == "false" ]]; then
      retry_flag=""
      if [[ "$RETRY" == "true" ]]; then retry_flag=" --retry"; fi
      if [[ "$MODE" == "apply" ]]; then
        print_turtle_header "radical!"
        echo "🐚 git.release --into $GOAL_INTO --mode apply --watch${retry_flag}"
      elif [[ "$WATCH" == "true" ]]; then
        print_turtle_header "heres the wave..."
        echo "🐚 git.release --into $GOAL_INTO --watch${retry_flag}"
      else
        print_turtle_header "heres the wave..."
        echo "🐚 git.release --into $GOAL_INTO --mode plan${retry_flag}"
      fi
      echo ""
      TURTLE_PRINTED="true"
    fi

    echo "🫧 no open release pr"
    # get the most recent merged release PR info
    merged_info=$(get_latest_merged_release_pr_info)
    if [[ -n "$merged_info" ]]; then
      merged_title=$(echo "$merged_info" | grep -oP '^title=\K.*')
      echo "   └─ latest: $merged_title"
    else
      echo "   └─ latest: not found in last 21 prs"
    fi
    echo ""

    # emit tag transport status (can detect failed workflows and return 2)
    # note: use `|| tag_status_result=$?` pattern to capture non-zero returns under set -e
    tag_status_result=0
    emit_transport_status "tag" "$latest_tag" "$FLAG_APPLY" "$RETRY" "$WATCH" || tag_status_result=$?

    # check for malfunction (exit 1) - propagate failloud
    if [[ $tag_status_result -eq 1 ]]; then
      exit 1
    fi

    # if status returned constraint (exit 2), decide next action
    if [[ $tag_status_result -eq 2 ]]; then
      # plan mode (no watch, no apply): exit 0 (report status only)
      # tag workflow failures are informational when not in active watch/apply mode
      if [[ "$WATCH" != "true" && "$FLAG_APPLY" != "true" ]]; then
        exit 0
      fi
      # watch/apply mode: exit 2 if no retry, else continue to watch
      if [[ "$RETRY" != "true" ]]; then
        exit 2
      fi
      # retry + watch/apply: continue to watch below
    fi

    # watch if requested (watch/apply after retry is valid per blueprint)
    if [[ "$WATCH" == "true" || "$FLAG_APPLY" == "true" ]]; then
      # note: use `|| watch_result=$?` pattern to capture non-zero returns under set -e
      watch_result=0
      emit_transport_watch "tag" "$latest_tag" || watch_result=$?

      if [[ $watch_result -ne 0 ]]; then
        exit $watch_result
      fi
    fi

    exit 0
  fi

  # get release pr status
  release_status_json=$(get_pr_status "$release_pr")

  # print turtle header if not yet printed
  if [[ "$TURTLE_PRINTED" == "false" ]]; then
    retry_flag=""
    if [[ "$RETRY" == "true" ]]; then retry_flag=" --retry"; fi
    if [[ "$MODE" == "apply" ]]; then
      print_turtle_header "radical!"
      echo "🐚 git.release --into $GOAL_INTO --mode apply --watch${retry_flag}"
    elif [[ "$WATCH" == "true" ]]; then
      print_turtle_header "heres the wave..."
      echo "🐚 git.release --into $GOAL_INTO --watch${retry_flag}"
    else
      print_turtle_header "heres the wave..."
      echo "🐚 git.release --into $GOAL_INTO --mode plan${retry_flag}"
    fi
    echo ""
    TURTLE_PRINTED="true"
  fi

  # emit status via decomposed operation
  # note: use `|| status_result=$?` pattern to capture non-zero returns under set -e
  status_result=0
  emit_transport_status "pr" "$release_pr" "$FLAG_APPLY" "$RETRY" "$WATCH" "$release_status_json" || status_result=$?

  # check for malfunction (exit 1) - propagate failloud
  if [[ $status_result -eq 1 ]]; then
    exit 1
  fi

  # if status returned constraint (exit 2), decide next action
  if [[ $status_result -eq 2 ]]; then
    if [[ "$RETRY" == "true" ]]; then
      if [[ "$WATCH" != "true" && "$FLAG_APPLY" != "true" ]]; then
        # retry-only: exit 0 (user monitors via separate --watch)
        exit 0
      fi
      # retry + watch/apply: continue to watch below
    else
      # no retry: constraint error
      exit 2
    fi
  fi

  # if status returned already-merged (exit 3), skip watch
  # the PR was already merged before we started, no watch needed
  skip_watch="false"
  if [[ $status_result -eq 3 ]]; then
    skip_watch="true"
  fi

  # watch if requested (watch/apply after retry is valid per blueprint)
  if [[ "$WATCH" == "true" || "$FLAG_APPLY" == "true" ]] && [[ "$skip_watch" != "true" ]]; then
    # note: use `|| watch_result=$?` pattern to capture non-zero returns under set -e
    watch_result=0
    emit_transport_watch "pr" "$release_pr" || watch_result=$?

    if [[ $watch_result -ne 0 ]]; then
      exit $watch_result
    fi

    # note: emit_transport_watch returns 0 when:
    # - PR is merged (success) → continue to tag transport
    # - checks pass without automerge (success) → exit 0, hint already shown
  fi

  # check if release PR is merged before we continue to tag transport
  # (watch returns 0 even when checks pass without automerge - in that case, exit 0)
  release_merged_status=$(get_pr_status "$release_pr")
  if [[ $(is_pr_merged "$release_merged_status") != "true" ]]; then
    # not merged - watch showed hint, we're done
    exit 0
  fi

  ####################################################################
  # transport 3: release tag workflows
  ####################################################################
  # extract expected tag from release PR title
  release_title=$(get_pr_title "$release_merged_status")
  expected_tag=$(extract_tag_from_release_title "$release_title")

  if [[ -z "$expected_tag" ]]; then
    # fallback to latest tag if we can't extract from title
    expected_tag=$(get_latest_tag)
  fi

  if [[ -z "$expected_tag" ]]; then
    echo "🫧 no tag found after merge"
    echo "   └─ wait for tag push or check manually"
    exit 0
  fi

  # await tag after release PR merge
  # note: always await even if skip_watch=true - the tag is created AFTER the merge
  # get merge commit from release PR for freshness check
  release_merge_commit=$(_gh_with_retry gh pr view "$release_pr" --json mergeCommit --jq '.mergeCommit.oid')

  # await fresh tag with commit-based freshness
  await_result=0
  and_then_await \
    artifact_type="tag" \
    artifact_display="tag $expected_tag" \
    prior_merge_commit="$release_merge_commit" \
    expected_tag="$expected_tag" || await_result=$?

  if [[ $await_result -ne 0 ]]; then
    exit $await_result
  fi

  # emit tag transport status
  # note: use `|| tag_status_result=$?` pattern to capture non-zero returns under set -e
  tag_status_result=0
  emit_transport_status "tag" "$expected_tag" "$FLAG_APPLY" "$RETRY" "$WATCH" || tag_status_result=$?

  # check for malfunction (exit 1) - propagate failloud
  if [[ $tag_status_result -eq 1 ]]; then
    exit 1
  fi

  # if status returned constraint (exit 2), decide next action
  if [[ $tag_status_result -eq 2 ]]; then
    # plan mode (no watch, no apply): exit 0 (report status only)
    # tag workflow failures are informational when not in active watch/apply mode
    if [[ "$WATCH" != "true" && "$FLAG_APPLY" != "true" ]]; then
      exit 0
    fi
    # watch/apply mode: exit 2 if no retry, else continue to watch
    if [[ "$RETRY" != "true" ]]; then
      exit 2
    fi
    # retry + watch/apply: continue to watch below
  fi

  # watch tag workflows if requested (watch/apply after retry is valid per blueprint)
  if [[ "$WATCH" == "true" || "$FLAG_APPLY" == "true" ]]; then
    # note: use `|| tag_watch_result=$?` pattern to capture non-zero returns under set -e
    tag_watch_result=0
    emit_transport_watch "tag" "$expected_tag" || tag_watch_result=$?

    if [[ $tag_watch_result -ne 0 ]]; then
      exit $tag_watch_result
    fi
  fi
fi

exit 0
