#!/usr/bin/env bash
######################################################################
# .what = instantiate a rigid route for structured declapract upgrades
#
# .why  = transforms declapract upgrades from one-shot commands into
#         structured workflows with documented defects and feedback
#         loops to infrastructure.
#
# usage:
#   rhx init.declapract.upgrade
#
# guarantee:
#   ✔ verifies declapract.use.yml exists
#   ✔ verifies pnpm is available
#   ✔ creates route at .route/v$isodate.declapract.upgrade/
#   ✔ binds route to current branch
#   ✔ fail-fast on any error
######################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=init.declapract.upgrade/output.sh
source "$SCRIPT_DIR/init.declapract.upgrade/output.sh"

######################################################################
# parse arguments
######################################################################

while [[ $# -gt 0 ]]; do
  case $1 in
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    --help|-h)
      echo "usage: rhx init.declapract.upgrade"
      echo ""
      echo "instantiate a rigid route for structured declapract upgrades"
      echo ""
      echo "creates:"
      echo "  .route/v\$isodate.declapract.upgrade/"
      echo "    ├─ 1.upgrade.invoke.sh"
      echo "    ├─ 1.upgrade.invoke.stone"
      echo "    ├─ 2.detect.hazards.stone"
      echo "    ├─ 2.detect.hazards.guard"
      echo "    ├─ 3.1.repair.test.defects.stone"
      echo "    ├─ 3.1.repair.test.defects.guard"
      echo "    ├─ 3.2.reflect.test.defects.stone"
      echo "    ├─ 3.2.reflect.test.defects.guard"
      echo "    ├─ 3.3.repair.cicd.defects.stone"
      echo "    ├─ 3.3.repair.cicd.defects.guard"
      echo "    ├─ 3.4.reflect.cicd.defects.stone"
      echo "    └─ 3.4.reflect.cicd.defects.guard"
      exit 0
      ;;
    *)
      echo "unknown argument: $1"
      exit 1
      ;;
  esac
done

######################################################################
# check prerequisites
######################################################################

PROJECT_ROOT="$PWD"
CONFIG_FILE="$PROJECT_ROOT/declapract.use.yml"

# check declapract.use.yml exists
if [[ ! -f "$CONFIG_FILE" ]]; then
  print_error "not a declapract repo"
  echo ""
  echo "   $CONFIG_FILE not found"
  echo ""
  echo "   run \`npx declapract init\` first"
  exit 2
fi

# check pnpm available (skip in test mode)
if [[ -z "${SKIP_PNPM_CHECK:-}" ]] && ! command -v pnpm &> /dev/null; then
  print_error "pnpm not found"
  echo ""
  echo "   pnpm is required for declapract upgrades"
  echo ""
  echo "   install: npm install -g pnpm"
  exit 2
fi

######################################################################
# compute route metadata
######################################################################

ISO_DATE=$(date +%Y_%m_%d)
ROUTE_SLUG="v${ISO_DATE}.declapract.upgrade"
ROUTE_PATH=".route/${ROUTE_SLUG}"
TEMPLATES_DIR="$SCRIPT_DIR/init.declapract.upgrade/templates"

######################################################################
# instantiate route
######################################################################

# findsert route directory
mkdir -p "$ROUTE_PATH"

# copy templates to route directory (force to overwrite chmod 555 files)
cp -f "$TEMPLATES_DIR"/* "$ROUTE_PATH/"

# chmod 555 for *.sh files (executable, not writable)
chmod 555 "$ROUTE_PATH"/*.sh

######################################################################
# bind route to branch
######################################################################

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# skip route.bind.set in test environments (no rhachet installed locally)
if [[ "${SKIP_ROUTE_BIND:-}" != "1" ]]; then
  npx rhachet run --repo bhrain --skill route.bind.set --route "$ROUTE_PATH" > /dev/null 2>&1 || true
fi

######################################################################
# output turtle vibes
######################################################################

print_turtle_header "radical!"

print_tree_start "init.declapract.upgrade"
print_tree_branch "route" "$ROUTE_PATH/ ✨"
print_tree_item "created" "true"
echo "      ├─ 1.upgrade.invoke.sh (chmod 555)"
echo "      ├─ 1.upgrade.invoke.stone"
echo "      ├─ 2.detect.hazards.stone"
echo "      ├─ 2.detect.hazards.guard"
echo "      ├─ 3.1.repair.test.defects.stone"
echo "      ├─ 3.1.repair.test.defects.guard"
echo "      ├─ 3.2.reflect.test.defects.stone"
echo "      ├─ 3.2.reflect.test.defects.guard"
echo "      ├─ 3.3.repair.cicd.defects.stone"
echo "      ├─ 3.3.repair.cicd.defects.guard"
echo "      ├─ 3.4.reflect.cicd.defects.stone"
echo "      └─ 3.4.reflect.cicd.defects.guard"

print_coconut "hang ten! we'll ride this in" "branch $CURRENT_BRANCH <-> route $ROUTE_PATH"
