#!/usr/bin/env bash
######################################################################
# .what = dispatch git.branch.rebase subcommands to their handlers
#
# .why  = one entry point: one permission rule; `help` lists subcommands
#
# usage:
#   rhx git.branch.rebase begin [--mode apply] [--unstaged ignore]
#   rhx git.branch.rebase continue | abort | take | lock
#   rhx git.branch.rebase help
#
# guarantee:
#   - --unstaged ignore sets unstaged paths aside, puts them back after
#   - passes rest args to the subskill via exec; fail-fast
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"

# source turtle vibes
source "$COMMIT_SKILL_DIR/output.sh"

######################################################################
# show usage
######################################################################
show_usage() {
  print_turtle_header "heres the wave..."
  print_tree_start "git.branch.rebase"
  echo "   ├─ subcommands"
  echo "   │  ├─ begin      start rebase onto origin/main"
  echo "   │  ├─ continue   continue after conflicts settled"
  echo "   │  ├─ take       settle conflicts via ours or theirs"
  echo "   │  ├─ abort      abandon rebase, restore pre-rebase state"
  echo "   │  ├─ lock       lock file operations (refresh)"
  echo "   │  └─ help       show this usage"
  echo "   ├─ examples"
  echo "   │  ├─ rhx git.branch.rebase begin --mode plan"
  echo "   │  ├─ rhx git.branch.rebase begin --mode apply"
  echo "   │  ├─ rhx git.branch.rebase begin --mode apply --unstaged ignore"
  echo "   │  ├─ rhx git.branch.rebase continue"
  echo "   │  ├─ rhx git.branch.rebase take --whos theirs pnpm-lock.yaml"
  echo "   │  ├─ rhx git.branch.rebase lock refresh"
  echo "   │  └─ rhx git.branch.rebase abort"
  echo "   └─ the branch's first feat already shipped? a rebase keeps that history;"
  echo "      cut a fresh branch instead: rhx git.branch.cutover help"
}

######################################################################
# parse arguments
######################################################################
SUBCMD=""
ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    --help|-h)
      # after a subcommand, --help belongs to that subcommand's own usage
      if [[ -n "$SUBCMD" ]]; then
        ARGS+=("$1")
        shift
        continue
      fi
      show_usage
      exit 0
      ;;
    *)
      # capture subcommand if not yet set
      if [[ -z "$SUBCMD" ]]; then
        SUBCMD="$1"
        shift
        continue
      fi
      # append rest of args after subcommand
      ARGS+=("$1")
      shift
      ;;
  esac
done

######################################################################
# validate subcommand
######################################################################

# guard: subcommand required
if [[ -z "$SUBCMD" ]]; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase"
  echo "   └─ error: subcommand required"
  echo ""
  show_usage
  exit 1
fi

# handle help subcommand
if [[ "$SUBCMD" == "help" ]]; then
  show_usage
  exit 0
fi

# guard: valid subcommand
case "$SUBCMD" in
  begin|continue|take|abort|lock)
    # valid - proceed to dispatch
    ;;
  *)
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase"
    echo "   └─ error: unknown subcommand: $SUBCMD"
    echo ""
    show_usage
    exit 1
    ;;
esac

######################################################################
# dispatch to subskill
######################################################################
exec "$SKILL_DIR/git.branch.rebase.$SUBCMD.sh" "${ARGS[@]}"
