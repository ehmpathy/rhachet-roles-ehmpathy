#!/usr/bin/env bash
######################################################################
# .what = lock file operations for mid-rebase state
#
# .why  = regenerate lock files mid-rebase to prevent CI failures:
#         - after `take` on pnpm-lock.yaml, lock is stale
#         - install regenerates for current package.json
#         - stages lock so rebase can continue cleanly
#
# usage:
#   rhx git.branch.rebase lock refresh
#
# guarantee:
#   - requires rebase in progress
#   - detects package manager from lock file
#   - runs correct install command
#   - stages regenerated lock file
#   - fail-fast on errors
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# source shared operations
source "$SKILL_DIR/git.branch.rebase.operations.sh"

######################################################################
# turtle vibes output functions (inline — single consumer)
######################################################################
print_turtle_header() {
  local phrase="$1"
  echo "🐢 $phrase"
  echo ""
}

print_tree_start() {
  local command="$1"
  echo "🐚 $command"
}

print_tree_branch() {
  local key="$1"
  local value="$2"
  echo "   ├─ $key: $value"
}

print_tree_nested() {
  local value="$1"
  echo "   │  └─ $value ✓"
}

print_tree_leaf() {
  local label="$1"
  echo "   └─ $label"
}

print_tree_error() {
  local message="$1"
  echo "   └─ error: $message"
}

######################################################################
# parse arguments
######################################################################
SUBCMD=""

while [[ $# -gt 0 ]]; do
  case $1 in
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    *)
      # capture subcommand if not yet set
      if [[ -z "$SUBCMD" ]]; then
        SUBCMD="$1"
        shift
        continue
      fi
      shift
      ;;
  esac
done

######################################################################
# validate subcommand
######################################################################

# guard: subcommand required
if [[ -z "$SUBCMD" ]]; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase lock"
  print_tree_error "subcommand required (try: refresh)"
  exit 1
fi

# guard: valid subcommand
if [[ "$SUBCMD" != "refresh" ]]; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase lock"
  print_tree_error "unknown lock subcommand: $SUBCMD"
  exit 1
fi

######################################################################
# guard: rebase in progress
######################################################################
if ! is_rebase_in_progress; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase lock refresh"
  print_tree_error "no rebase in progress"
  exit 1
fi

######################################################################
# detect lock file
######################################################################
LOCK_FILE=""
PM=""

# priority: pnpm > npm > yarn
if [[ -f "pnpm-lock.yaml" ]]; then
  LOCK_FILE="pnpm-lock.yaml"
  PM="pnpm"
elif [[ -f "package-lock.json" ]]; then
  LOCK_FILE="package-lock.json"
  PM="npm"
elif [[ -f "yarn.lock" ]]; then
  LOCK_FILE="yarn.lock"
  PM="yarn"
fi

# guard: at least one lock file extant
if [[ -z "$LOCK_FILE" ]]; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase lock refresh"
  print_tree_error "no lock file found"
  exit 1
fi

######################################################################
# detect package manager availability
######################################################################

# guard: package manager installed
if [[ "$PM" == "pnpm" ]]; then
  if ! command -v pnpm &>/dev/null; then
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase lock refresh"
    print_tree_error "pnpm not found, install pnpm or use npm"
    exit 1
  fi
elif [[ "$PM" == "yarn" ]]; then
  if ! command -v yarn &>/dev/null; then
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase lock refresh"
    print_tree_error "yarn not found, install yarn"
    exit 1
  fi
fi
# npm is always available (comes with node)

######################################################################
# run install
######################################################################
INSTALL_OUTPUT=""
INSTALL_EXIT=0

case "$PM" in
  pnpm)
    INSTALL_OUTPUT=$(pnpm install 2>&1) || INSTALL_EXIT=$?
    ;;
  npm)
    INSTALL_OUTPUT=$(npm install 2>&1) || INSTALL_EXIT=$?
    ;;
  yarn)
    INSTALL_OUTPUT=$(yarn install 2>&1) || INSTALL_EXIT=$?
    ;;
esac

# guard: install succeeded
if [[ $INSTALL_EXIT -ne 0 ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "git.branch.rebase lock refresh"
  print_tree_branch "detected" "$PM"
  print_tree_branch "run" "$PM install"
  echo "   └─ error: install failed"
  echo ""
  echo "install output:"
  echo "$INSTALL_OUTPUT"
  exit 1
fi

######################################################################
# stage lock file
######################################################################
git add "$LOCK_FILE"

######################################################################
# output success
######################################################################
print_turtle_header "shell yeah!"
print_tree_start "git.branch.rebase lock refresh"
print_tree_branch "detected" "$PM"
print_tree_branch "run" "$PM install"
echo "   ├─ staged"
print_tree_nested "$LOCK_FILE"
print_tree_leaf "done"
