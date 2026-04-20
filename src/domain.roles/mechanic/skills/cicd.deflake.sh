#!/usr/bin/env bash
######################################################################
# .what = structured cicd deflake with route-based workflow
#
# .why  = transforms flake diagnosis from adhoc investigation into
#         structured workflows with evidence, diagnosis, repair,
#         verification, and institutional memory.
#
# usage:
#   rhx cicd.deflake init                    # create route, bind to branch
#   rhx cicd.deflake detect --days 30 --into $route/1.evidence.yield._.detected.json
#   rhx cicd.deflake exhume --run 12345 --attempt 1
#   rhx cicd.deflake --help                  # show usage
#
# guarantee:
#   ✔ init: creates route with stones/guards
#   ✔ detect: scans CI history for flaky tests
#   ✔ exhume: fetches failed attempt logs for diagnosis
#   ✔ fail-fast on any error
#
# .note = v1
######################################################################

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=cicd.deflake/output.sh
source "$SKILL_DIR/cicd.deflake/output.sh"

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
    --help|-h|help)
      # only show main help if no subcommand yet; otherwise pass to subcommand
      if [[ -z "$SUBCOMMAND" ]]; then
        echo "usage: rhx cicd.deflake <subcommand>"
        echo ""
        echo "subcommands:"
        echo "  init      create route and bind to branch"
        echo "  detect    scan CI history for flaky tests"
        echo "  exhume    fetch failed attempt logs for diagnosis"
        echo "  help      show this help"
        echo ""
        echo "examples:"
        echo "  rhx cicd.deflake init"
        echo "  rhx cicd.deflake detect --days 30 --into \$route/1.evidence.yield._.detected.json"
        echo "  rhx cicd.deflake exhume --run 24289601579 --attempt 1"
        exit 0
      else
        PASSTHROUGH_ARGS+=("$1")
        shift
      fi
      ;;
    init|detect|exhume)
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
        echo "   valid subcommands: init, detect, exhume, help"
        echo ""
        echo "   run \`rhx cicd.deflake help\` for usage"
        exit 2
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
  # no subcommand: show usage (user-friendly)
  echo "usage: rhx cicd.deflake <subcommand>"
  echo ""
  echo "subcommands:"
  echo "  init      create route and bind to branch"
  echo "  detect    scan CI history for flaky tests"
  echo "  exhume    fetch failed attempt logs for diagnosis"
  echo "  help      show this help"
  echo ""
  echo "examples:"
  echo "  rhx cicd.deflake init"
  echo "  rhx cicd.deflake detect --days 30 --into \$route/1.evidence.yield._.detected.json"
  echo "  rhx cicd.deflake exhume --run 24289601579 --attempt 1"
  exit 0
fi

case "$SUBCOMMAND" in
  init)
    # shellcheck source=cicd.deflake/init.sh
    source "$SKILL_DIR/cicd.deflake/init.sh"
    ;;
  detect)
    # pass collected args to detect handler
    set -- "${PASSTHROUGH_ARGS[@]}"
    # shellcheck source=cicd.deflake/detect.sh
    source "$SKILL_DIR/cicd.deflake/detect.sh"
    ;;
  exhume)
    # pass collected args to exhume handler
    set -- "${PASSTHROUGH_ARGS[@]}"
    # shellcheck source=cicd.deflake/exhume.sh
    source "$SKILL_DIR/cicd.deflake/exhume.sh"
    ;;
  *)
    print_error "unknown subcommand: $SUBCOMMAND"
    echo ""
    echo "   valid subcommands: init, detect, exhume, help"
    exit 2
    ;;
esac
