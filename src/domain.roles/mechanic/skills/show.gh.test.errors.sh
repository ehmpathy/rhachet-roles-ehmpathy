#!/usr/bin/env bash
######################################################################
# .what = show test errors from the latest test workflow run
#
# .why  = focused command for the most common ci debug task:
#         - quickly see what tests failed
#         - get straight to the error output
#         - no options to remember for typical use
#
# usage:
#   show.gh.test.errors.sh                    # show test errors from latest test run
#   show.gh.test.errors.sh --flow "ci"        # use different workflow name
#   show.gh.test.errors.sh --scope "unit"     # filter to unit test jobs only
#   show.gh.test.errors.sh --branch "main"    # check different branch
#
# guarantee:
#   - delegates to show.gh.action.logs.sh with sensible defaults
#   - defaults to "test" workflow
#   - shows only failed test output
######################################################################
set -euo pipefail

# resolve the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# default to "test" workflow
FLOW="test"
ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    --flow|-f)
      FLOW="$2"
      shift 2
      ;;
    --help|-h)
      echo "usage: show.gh.test.errors.sh [options]"
      echo ""
      echo "thin wrapper around show.gh.action.logs.sh with test-focused defaults"
      echo ""
      echo "options:"
      echo "  --flow, -f <name>       workflow name (default: 'test')"
      echo "  --scope, -s <pattern>   filter to jobs that match pattern"
      echo "  --branch, -b <name>     use specific branch (default: current)"
      echo "  --help, -h              show this help"
      exit 0
      ;;
    *)
      # pass through all other args
      ARGS+=("$1")
      shift
      ;;
  esac
done

# dispatch to show.gh.action.logs.sh with defaults
exec "$SCRIPT_DIR/show.gh.action.logs.sh" --flow "$FLOW" "${ARGS[@]}"
