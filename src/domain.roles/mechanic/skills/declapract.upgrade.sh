#!/usr/bin/env bash
######################################################################
# .what = upgrade declapract and apply latest best practices
#
# .why  = declapract manages development best practices and tooling
#         configuration across projects, ensuring consistency and
#         enabling easy upgrades to latest standards.
#
#         this skill upgrades declapract packages and reapplies
#         practices, then validates the build still passes.
#
# guarantee:
#   ✔ verifies declapract.use.yml exists before proceeding
#   ✔ upgrades to latest declapract packages
#   ✔ applies practices twice (ensures idempotency)
#   ✔ reinstalls dependencies after application
#   ✔ fail-fast on any error
######################################################################

set -euo pipefail

PROJECT_ROOT="$PWD"
CONFIG_FILE="$PROJECT_ROOT/declapract.use.yml"

# Verify declapract config exists
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "❌ no declapract.use.yml found in project root"
  echo "   $CONFIG_FILE"
  echo "➡️  first configure declapract for this project"
  exit 2
fi

echo "📦 upgrading declapract packages..."
npm install --save-dev declapract@latest declapract-typescript-ehmpathy@latest

echo ""
echo "✨ applying best practices..."
npx declapract apply && npx declapract apply

echo ""
echo "📦 reinstalling dependencies..."
npm install

echo ""
echo "✅ declapract upgrade complete!"
echo ""
echo "⚠️  next steps:"
echo "   1. verify build passes: npm run test:types && npm run build"
echo "   2. review changes for breaking updates"
echo "   3. test that all still behaves as expected"
