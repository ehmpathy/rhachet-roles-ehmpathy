#!/usr/bin/env bash
######################################################################
# .what = run integration tests thoroughly with optional scope filter
#
# .why  = integration tests verify interactions between components
#         and external systems. running them thoroughly (without
#         --changedSince) ensures all tests pass, not just changed ones.
#
#         this is critical before releases, after major changes, or
#         when verifying the entire test suite.
#
# usage for agents:
#   - run all integration tests:
#       ./test.integration.sh
#
#   - run tests matching a specific scope/pattern:
#       ./test.integration.sh <pattern>
#       example: ./test.integration.sh "user.*auth"
#       example: ./test.integration.sh "database"
#
#   - the THOROUGH=true flag forces ALL tests to run, not just
#     those changed since main branch
#
# guarantee:
#   ✔ runs ALL integration tests (ignores --changedSince)
#   ✔ supports optional jest pattern/scope filtering
#   ✔ uses verbose output for debugging
#   ✔ passes with no tests if scope matches nothing
#   ✔ fail-fast on test failures
######################################################################

set -euo pipefail

SCOPE="${1:-}"

echo "🧪 running integration tests thoroughly..."
echo ""

if [[ -n "$SCOPE" ]]; then
  echo "📍 scope filter: $SCOPE"
  echo ""
  THOROUGH=true npm run test:integration -- "$SCOPE"
else
  echo "📍 scope: all tests"
  echo ""
  THOROUGH=true npm run test:integration
fi

echo ""
echo "✅ integration tests complete!"
