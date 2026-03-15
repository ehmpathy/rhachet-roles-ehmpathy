#!/usr/bin/env bash
######################################################################
# .what = upgrade declapract and apply latest best practices
#
# .why  = declapract manages development best practices and tools
#         across projects to ensure consistency and enable easy
#         upgrades to latest standards.
#
# guarantee:
#   ✔ uses fnm for node version
#   ✔ uses pnpm (not npm)
#   ✔ upgrades to latest declapract packages
#   ✔ applies practices twice (ensures idempotency)
#   ✔ reinstalls dependencies after application
#   ✔ fail-fast on any error
######################################################################

set -euo pipefail

echo "🐢 upgrade time!"

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
echo "😎 easy part done, now for the fun part"
