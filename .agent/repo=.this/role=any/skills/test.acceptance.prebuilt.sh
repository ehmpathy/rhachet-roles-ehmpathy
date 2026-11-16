#!/usr/bin/env bash
######################################################################
# .what = run the acceptance suite against the dist/ already built,
#         with no `npm run build` before it
#
# .why  = `npm run test:acceptance` rebuilds first, and its last build
#         step (`rhachet repo introspect`) can refuse for reasons
#         unrelated to the suite. this runs the same jest config over
#         a dist/ refreshed by `npm run build:compile` and
#         `npm run build:complete:dist`, so a crew can still prove (and
#         snap) the acceptance journeys locally
#
# usage:
#   test.acceptance.prebuilt.sh --scope git.package.patch          # run one file
#   test.acceptance.prebuilt.sh --scope git.package.patch --resnap # update snapshots
#
# guarantee:
#   - runs from the git root
#   - never builds; refreshes naught; fails if dist/ is absent
#   - jest output streams to stdout; on failure it is also sent to stderr
#   - exit code = jest's exit code
######################################################################
set -euo pipefail

# refuse a bad call on both streams, exit 2, with the next move as a hint
refuse_constraint() {
  local message="$1"
  local hint="$2"
  local render
  render=$(printf '%s\n' \
    "🐢 bummer dude..." \
    "" \
    "🐚 test.acceptance.prebuilt" \
    "   └─ ✋ ConstraintError: $message" \
    "" \
    "🥥 did you know?" \
    "   └─ $hint")
  # .note = written to each fd, not via `tee /dev/stderr`: a socket stderr (as node's spawn
  #         gives) cannot be reopened through /dev/stderr
  echo "$render"
  echo "$render" >&2
  exit 2
}

SCOPE=""
RESNAP="false"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope) SCOPE="${2:-}"; shift 2 ;;
    --resnap) RESNAP="true"; shift ;;
    # rhachet passes its own selectors through; they name this skill, not jest's input
    --skill|--repo|--role) shift 2 ;;
    --help|-h)
      sed -n '2,22p' "$0"
      exit 0
      ;;
    *)
      refuse_constraint "unknown flag $1 (flags: --scope, --resnap)" \
        "rhx test.acceptance.prebuilt --scope <file> [--resnap]"
      ;;
  esac
done

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# the suite reads the built role, so a dist/ must exist
[[ -f dist/index.js ]] || refuse_constraint \
  "dist/index.js is absent" \
  "npm run build:compile && npm run build:complete:dist"

ARGS=(-c ./jest.acceptance.config.ts --forceExit --verbose --runInBand --passWithNoTests)
[[ "$RESNAP" == "true" ]] && ARGS+=(--updateSnapshot)
[[ -n "$SCOPE" ]] && ARGS+=("$SCOPE")

echo "🐢 lets ride..."
echo ""
echo "🐚 test.acceptance.prebuilt"
echo "   └─ run: npx jest ${ARGS[*]}"
echo ""

# stream jest to stdout (jest reports on stderr, so fold it in); keep a copy for a failure
JEST_LOG=$(mktemp)
trap 'rm -f "$JEST_LOG"' EXIT
set +e
npx jest "${ARGS[@]}" 2>&1 | tee "$JEST_LOG"
JEST_CODE=${PIPESTATUS[0]}
set -e

# a failure also reaches stderr, so it is never lost
if [[ "$JEST_CODE" -ne 0 ]]; then
  cat "$JEST_LOG" >&2
  echo ""
  echo "🐢 bummer dude... jest exited $JEST_CODE"
  echo "" >&2
  echo "🐢 bummer dude... jest exited $JEST_CODE" >&2
fi
exit "$JEST_CODE"
