#!/usr/bin/env bash
######################################################################
# .what = structured declapract upgrades with route-based workflow
#
# .why  = transforms declapract upgrades from one-shot commands into
#         structured workflows with documented defects and feedback
#         loops to infrastructure. exec logic stays in skill (not
#         copied to route) for improved security.
#
# usage:
#   rhx declapract.upgrade init           # create route, bind to branch
#   rhx declapract.upgrade exec           # run upgrade
#   rhx declapract.upgrade --help         # show help
#
# guarantee:
#   ✔ init: creates route with stones/guards (no .sh files)
#   ✔ exec: runs upgrade directly from skill
#   ✔ fail-fast on any error
######################################################################

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=declapract.upgrade/output.sh
source "$SKILL_DIR/declapract.upgrade/output.sh"

######################################################################
# parse arguments
######################################################################

SUBCOMMAND=""
PASSTHROUGH_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    --help|-h)
      echo "usage: rhx declapract.upgrade <subcommand>"
      echo ""
      echo "subcommands:"
      echo "  init    create route and bind to branch"
      echo "  exec    run the upgrade"
      echo ""
      echo "examples:"
      echo "  rhx declapract.upgrade init"
      echo "  rhx declapract.upgrade exec"
      exit 0
      ;;
    init|exec)
      SUBCOMMAND="$1"
      shift
      ;;
    --)
      shift
      PASSTHROUGH_ARGS+=("$@")
      break
      ;;
    *)
      if [[ -z "$SUBCOMMAND" ]]; then
        print_error "unknown subcommand: $1"
        echo ""
        echo "   valid subcommands: init, exec"
        echo ""
        echo "   run \`rhx declapract.upgrade --help\` for usage"
        exit 1
      else
        PASSTHROUGH_ARGS+=("$1")
        shift
      fi
      ;;
  esac
done

######################################################################
# route to subcommand handler
######################################################################

if [[ -z "$SUBCOMMAND" ]]; then
  print_error "no subcommand specified"
  echo ""
  echo "   valid subcommands: init, exec"
  echo ""
  echo "   run \`rhx declapract.upgrade --help\` for usage"
  exit 1
fi

case "$SUBCOMMAND" in
  init)
    # shellcheck source=declapract.upgrade/init.sh
    source "$SKILL_DIR/declapract.upgrade/init.sh"
    ;;
  exec)
    # shellcheck source=declapract.upgrade/exec.sh
    source "$SKILL_DIR/declapract.upgrade/exec.sh"
    ;;
  *)
    print_error "unknown subcommand: $SUBCOMMAND"
    echo ""
    echo "   valid subcommands: init, exec"
    exit 1
    ;;
esac
