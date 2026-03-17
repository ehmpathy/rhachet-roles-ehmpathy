#!/usr/bin/env bash
######################################################################
# .what = exec subcommand for declapract.upgrade skill
#
# .why  = runs upgrade logic directly from skill (not from route)
#         eliminates chmod management and security risks of copied
#         executables in mutable route directory
#
# prereqs:
#   - declapract.use.yml exists
#   - pnpm available
#
# guarantee:
#   ✔ uses fnm for node version
#   ✔ uses pnpm (not npm)
#   ✔ upgrades to latest declapract packages
#   ✔ applies practices twice (ensures idempotency)
#   ✔ reinstalls dependencies after application
#   ✔ runs auto-fix
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
# run upgrade
######################################################################

print_turtle_header "upgrade time!"

echo "📦 ensure node version"
fnm use

echo ""
echo "📦 upgrade declapract packages"
pnpm add declapract@latest declapract-typescript-ehmpathy@latest --save-dev

echo ""
echo "✨ apply best practices"
npx declapract apply && npx declapract apply

echo ""
echo "📦 reinstall dependencies"
pnpm install

echo ""
echo "🔧 auto fix"
pnpm fix

echo ""
print_turtle_header "shell yeah!"
echo "   └─ upgrade complete, now review what broke 🏄"
