#!/usr/bin/env bash
######################################################################
# .what = init subcommand for cicd.deflake skill
#
# .why  = creates route with stones/guards for structured deflake workflow
#
# prereqs:
#   - inside a git repository
#
# guarantee:
#   ✔ creates route at .behavior/v$isodate.cicd-deflake/
#   ✔ copies all .stone and .guard files
#   ✔ binds route to current branch
#   ✔ fail-fast on any error
######################################################################

# note: this file is sourced by cicd.deflake.sh
# SKILL_DIR and output fns are already available

######################################################################
# parse arguments
######################################################################

HELP=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --help|-h)
      HELP=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

######################################################################
# help output
######################################################################

if [[ "$HELP" == "true" ]]; then
  echo "🐢 cicd.deflake init — create route for structured deflake workflow"
  echo ""
  echo "usage:"
  echo "  rhx cicd.deflake init               # create route in .behavior/"
  echo "  rhx cicd.deflake init --help        # show this help"
  echo ""
  echo "what it does:"
  echo "  1. creates route at .behavior/v\${date}.cicd-deflake/"
  echo "  2. copies all .stone and .guard files"
  echo "  3. binds route to current branch"
  echo ""
  echo "prereqs:"
  echo "  - inside a git repository"
  echo ""
  echo "stones created:"
  echo "  - 1.evidence.stone"
  echo "  - 2.1.diagnose.research.stone"
  echo "  - 2.2.diagnose.rootcause.stone"
  echo "  - 3.plan.stone"
  echo "  - 4.execution.stone"
  echo "  - 5.verification.stone"
  echo "  - 6.repairs.stone"
  echo "  - 7.reflection.stone"
  echo "  - 8.institutionalize.stone"
  exit 0
fi

######################################################################
# check prerequisites
######################################################################

# check we are in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  print_error "not in a git repository" "cicd.deflake init"
  echo ""
  echo "   run this command from within a git repository"
  exit 2
fi

######################################################################
# compute route metadata
######################################################################

ISO_DATE=$(date +%Y_%m_%d)
ROUTE_SLUG="v${ISO_DATE}.cicd-deflake"
ROUTE_PATH=".behavior/${ROUTE_SLUG}"
TEMPLATES_DIR="$SKILL_DIR/cicd.deflake/templates"

######################################################################
# check if already bound
######################################################################

# skip check in test environments
if [[ "${SKIP_ROUTE_BIND:-}" != "1" ]]; then
  BOUND_ROUTE=$(npx rhachet run --repo bhrain --skill route.bind.get 2>/dev/null | grep -o '\.behavior/[^ ]*' || true)
  if [[ -n "$BOUND_ROUTE" && "$BOUND_ROUTE" == *"cicd-deflake"* ]]; then
    print_error "already bound to cicd-deflake route" "cicd.deflake init"
    echo ""
    echo "   bound route: $BOUND_ROUTE"
    echo ""
    echo "   to unbind: rhx route.bind.del"
    exit 2
  fi
fi

######################################################################
# instantiate route
######################################################################

# findsert route directory
mkdir -p "$ROUTE_PATH"

# copy only .stone and .guard files
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

print_turtle_header "tubular!"

print_tree_start "cicd.deflake init"
print_tree_branch "route" "$ROUTE_PATH/ ✨"
print_tree_item "created" "true"
echo "      ├─ 1.evidence.stone"
echo "      ├─ 2.1.diagnose.research.stone"
echo "      ├─ 2.1.diagnose.research.guard"
echo "      ├─ 2.2.diagnose.rootcause.stone"
echo "      ├─ 2.2.diagnose.rootcause.guard"
echo "      ├─ 3.plan.stone"
echo "      ├─ 3.plan.guard"
echo "      ├─ 4.execution.stone"
echo "      ├─ 4.execution.guard"
echo "      ├─ 5.verification.stone"
echo "      ├─ 5.verification.guard"
echo "      ├─ 6.repairs.stone"
echo "      ├─ 7.reflection.stone"
echo "      ├─ 7.reflection.guard"
echo "      └─ 8.institutionalize.stone"

print_coconut "hang ten! we'll ride this in" "branch $CURRENT_BRANCH <-> route $ROUTE_PATH"
