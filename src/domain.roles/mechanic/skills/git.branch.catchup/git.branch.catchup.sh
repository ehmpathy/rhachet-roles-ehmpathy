#!/usr/bin/env bash
######################################################################
# .what = catch up a feature branch with origin/main via one merge commit
#         (no rewrite): dispatch to begin, take, lock, continue, abort
#
# .why  = a mechanic whose pr is behind main, or CONFLICTING with it,
#         levels it with main and pushes plain. a rebase rewrites history,
#         so its push needs force; a merge commit rewrites none
#         - `catchup` once the branch is pushed; `rebase` before the first push
#         - the merge commit spends one commit use, under the same sponsor
#           and gates as git.commit.set
#
# usage:
#   rhx git.branch.catchup begin                          # plan (default)
#   rhx git.branch.catchup begin --mode apply             # merge + commit
#   rhx git.branch.catchup take --whos <main|branch> <paths…>
#   rhx git.branch.catchup lock refresh
#   rhx git.branch.catchup continue
#   rhx git.branch.catchup abort
#   then: rhx git.commit.push --mode apply
#
# guarantee:
#   - never merges into main or master; plan is the default mode
#   - a conflict stops loud, names each file, and leaves a merge in flight
#     that continue finishes or abort backs out
#   - dispatches to the subcommand via exec (single process)
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"

source "$COMMIT_SKILL_DIR/output.sh"
source "$SKILL_DIR/git.branch.catchup.operations.sh"

######################################################################
# show usage: the tree alone (under an error header), or with the help vibe
######################################################################
show_usage_tree() {
  print_tree_start "git.branch.catchup"
  echo "   ├─ $CATCHUP_HOW_LINE"
  echo "   ├─ one merge commit of origin/main into this branch; the push after it is plain"
  echo "   ├─ when: use it once the branch is pushed; rebase before the first push"
  echo "   ├─ subcommands"
  echo "   │  ├─ begin      preview (default) or apply the merge"
  echo "   │  ├─ take       settle a conflict by side: --whos <main|branch>"
  echo "   │  ├─ lock       refresh a taken lockfile against the merged package.json"
  echo "   │  ├─ continue   make the merge commit once every conflict is settled"
  echo "   │  ├─ abort      back out to the state before begin"
  echo "   │  └─ help       show this usage"
  echo "   └─ examples"
  echo "      ├─ rhx git.branch.catchup begin"
  echo "      ├─ rhx git.branch.catchup begin --mode apply"
  echo "      ├─ rhx git.branch.catchup take --whos main pnpm-lock.yaml"
  echo "      ├─ rhx git.branch.catchup lock refresh"
  echo "      ├─ rhx git.branch.catchup continue"
  echo "      ├─ rhx git.branch.catchup abort"
  echo "      └─ then: rhx git.commit.push --mode apply"
}
show_usage() {
  print_turtle_header "heres the wave..."
  show_usage_tree
}

######################################################################
# parse arguments
######################################################################
SUBCMD=""
ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role)
      shift
      [[ $# -gt 0 && "$1" != --* ]] && shift
      ;;
    --help|-h)
      # a --help after a subcommand belongs to that subcommand
      if [[ -n "$SUBCMD" ]]; then
        ARGS+=("$1")
        shift
        continue
      fi
      show_usage
      exit 0
      ;;
    *)
      if [[ -z "$SUBCMD" ]]; then
        SUBCMD="$1"
        shift
        continue
      fi
      ARGS+=("$1")
      shift
      ;;
  esac
done

# no subcommand, or help: show usage
if [[ -z "$SUBCMD" || "$SUBCMD" == "help" ]]; then
  show_usage
  exit 0
fi

# guard: a known subcommand
case "$SUBCMD" in
  begin|take|lock|continue|abort) ;;
  *)
    emit_both "✋ ConstraintError: unknown subcommand: $SUBCMD

$(show_usage_tree)"
    exit 2
    ;;
esac

exec "$SKILL_DIR/git.branch.catchup.$SUBCMD.sh" "${ARGS[@]+"${ARGS[@]}"}"
