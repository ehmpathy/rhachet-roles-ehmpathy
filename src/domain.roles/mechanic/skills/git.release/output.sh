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
  echo ""
  echo "🌊 release: $title"
}

######################################################################
# print check status line
# usage: print_check_status "passed|failed|progress" [count]
######################################################################
print_check_status() {
  local status="$1"
  local count="${2:-}"

  case "$status" in
    passed)
      echo "   ├─ 👌 all checks passed"
      ;;
    failed)
      if [[ -n "$count" ]]; then
        echo "   ├─ ⚓  $count check(s) failed"
      else
        echo "   ├─ ⚓  checks failed"
      fi
      ;;
    progress)
      if [[ -n "$count" ]]; then
        echo "   ├─ 🐢 $count check(s) in progress"
      else
        echo "   ├─ 🐢 checks in progress"
      fi
      ;;
  esac
}

######################################################################
# print automerge status line
# usage: print_automerge_status "enabled|unfound|merged" [extra]
######################################################################
print_automerge_status() {
  local status="$1"
  local extra="${2:-}"

  case "$status" in
    enabled)
      if [[ -n "$extra" ]]; then
        echo "   ├─ 🌴 automerge enabled [added]"
      else
        echo "   ├─ 🌴 automerge enabled [found]"
      fi
      ;;
    unfound)
      echo "   ├─ 🌴 automerge unfound (use --mode apply to add)"
      ;;
    merged)
      echo "   └─ 🌴 merged"
      ;;
  esac
}

######################################################################
# print watch status line
# usage: print_watch_status [elapsed]
######################################################################
print_watch_status() {
  local elapsed="${1:-}"

  if [[ -n "$elapsed" ]]; then
    echo "   └─ 🥥 let's watch"
    echo "      └─ 👌 merged after $elapsed"
  else
    echo "   └─ 🥥 let's watch"
  fi
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
}

######################################################################
# print no PR status
# usage: print_no_pr_status "branch" [unpushed_count]
######################################################################
print_no_pr_status() {
  local branch="$1"
  local unpushed="${2:-0}"

  echo "🫧 no open branch pr"
  echo "   ├─ $branch"
  if [[ "$unpushed" -gt 0 ]]; then
    echo "   ├─ $unpushed unpushed commit(s)"
  fi
  echo "   └─ hint: use git.commit.push to push and findsert pr"
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
# print hint line
# usage: print_hint "message"
######################################################################
print_hint() {
  local message="$1"
  echo -e "   └─ \033[2mhint: $message\033[0m"
}

######################################################################
# print retry hint
# usage: print_retry_hint
######################################################################
print_retry_hint() {
  print_hint "use --retry to rerun failed workflows"
}

######################################################################
# print apply hint
# usage: print_apply_hint
######################################################################
print_apply_hint() {
  print_hint "use --mode apply to enable automerge and watch"
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
      echo "      └─ hint: use --retry to rerun failed workflows"
      ;;
    progress)
      echo "      └─ 🟡 $name in progress"
      ;;
  esac
}
