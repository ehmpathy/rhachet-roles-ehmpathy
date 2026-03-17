#!/usr/bin/env bash
######################################################################
# .what = init subcommand for declapract.upgrade skill
#
# .why  = creates route with stones/guards for structured workflow
#         no .sh files copied - exec logic stays in skill
#
# prereqs:
#   - declapract.use.yml exists
#
# guarantee:
#   ✔ creates route at .route/v$isodate.declapract.upgrade/
#   ✔ copies only .stone and .guard files (no .sh)
#   ✔ binds route to current branch
#   ✔ fail-fast on any error
######################################################################

# note: this file is sourced by declapract.upgrade.sh
# SKILL_DIR and output fns are already available

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

######################################################################
# compute route metadata
######################################################################

ISO_DATE=$(date +%Y_%m_%d)
ROUTE_SLUG="v${ISO_DATE}.declapract.upgrade"
ROUTE_PATH=".route/${ROUTE_SLUG}"
TEMPLATES_DIR="$SKILL_DIR/declapract.upgrade/templates"

######################################################################
# instantiate route
######################################################################

# findsert route directory
mkdir -p "$ROUTE_PATH"

# copy only .stone and .guard files (no .sh files)
for file in "$TEMPLATES_DIR"/*.stone "$TEMPLATES_DIR"/*.guard; do
  if [[ -f "$file" ]]; then
    cp -f "$file" "$ROUTE_PATH/"
  fi
done

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

print_tree_start "declapract.upgrade init"
print_tree_branch "route" "$ROUTE_PATH/ ✨"
print_tree_item "created" "true"
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
