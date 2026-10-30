#!/usr/bin/env bash
######################################################################
# .what = regenerate the lockfile against the merged manifest, and stage it
#
# .why  = a lockfile conflict is settled by `take --whos main`, which drops
#         the branch's own dependency changes from the lock; a refresh
#         against the merged package.json restores them
#
# usage:
#   rhx git.branch.catchup lock refresh
#
# guarantee:
#   - requires a merge in flight (exit 2 otherwise)
#   - refuses while package.json is itself in conflict (exit 2): a refresh
#     against half a manifest writes a wrong lock
#   - detects the package manager: pnpm > npm > yarn
#   - pnpm and npm update the lockfile only (no node_modules install); yarn
#     has no lockfile-only mode in v1, so it runs a full install
#   - stages the refreshed lockfile
#
# .note = a copy apart from the rebase twin's lock refresh, on purpose: the
#         rebase body demands a rebase in flight and exits 1 on constraints.
#         a fold of the two waits on the rebase exit-code fix (see its dream)
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"

source "$COMMIT_SKILL_DIR/output.sh"
source "$COMMIT_SKILL_DIR/git.commit.operations.sh"
source "$SKILL_DIR/git.branch.catchup.operations.sh"

LABEL="git.branch.catchup lock refresh"

######################################################################
# parse arguments
######################################################################
SUBCMD=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role)
      shift
      [[ $# -gt 0 && "$1" != --* ]] && shift
      ;;
    --help|-h)
      print_turtle_header "heres the wave..."
      print_tree_start "git.branch.catchup lock"
      echo "   ├─ usage"
      echo "   │  └─ rhx git.branch.catchup lock refresh"
      echo "   └─ regenerates the lockfile against the merged package.json, and stages it"
      exit 0
      ;;
    *)
      if [[ -z "$SUBCMD" ]]; then
        SUBCMD="$1"
        shift
        continue
      fi
      emit_catchup_constraint message="unknown argument: $1" tree="$(
        print_tree_start "git.branch.catchup lock"
        echo "   └─ usage: rhx git.branch.catchup lock refresh"
      )"
      exit 2
      ;;
  esac
done

# guard: the one subcommand
if [[ "$SUBCMD" != "refresh" ]]; then
  emit_catchup_constraint message="lock needs the subcommand refresh (got: ${SUBCMD:-none})" tree="$(
    print_tree_start "git.branch.catchup lock"
    echo "   └─ usage: rhx git.branch.catchup lock refresh"
  )"
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# guard: a merge in flight
refuse_if_no_merge_in_flight label="$LABEL"

# guard: no manifest in conflict
MANIFESTS_UNSETTLED=$(get_conflict_files | grep -E '(^|/)package\.json$' || true)
if [[ -n "$MANIFESTS_UNSETTLED" ]]; then
  emit_catchup_constraint message="a manifest is still in conflict" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ settle first"
    print_catchup_files_tree prefix="   │  " files="$MANIFESTS_UNSETTLED"
    echo "   ├─ why: a refresh reads package.json as is; with conflict markers it writes a wrong lock"
    echo "   └─ next: settle it, rhx git.stage.add it, then lock refresh again"
  )"
  exit 2
fi

######################################################################
# detect the lockfile and its package manager
######################################################################
# priority: pnpm > npm > yarn; the first lockfile found wins
LOCK_FILE=""
PM=""
INSTALL=()
if [[ -z "$LOCK_FILE" && -f "pnpm-lock.yaml" ]]; then
  LOCK_FILE="pnpm-lock.yaml"
  PM="pnpm"
  INSTALL=(pnpm install --lockfile-only)
fi
if [[ -z "$LOCK_FILE" && -f "package-lock.json" ]]; then
  LOCK_FILE="package-lock.json"
  PM="npm"
  INSTALL=(npm install --package-lock-only)
fi
if [[ -z "$LOCK_FILE" && -f "yarn.lock" ]]; then
  LOCK_FILE="yarn.lock"
  PM="yarn"
  INSTALL=(yarn install)
fi

# guard: a lockfile
if [[ -z "$LOCK_FILE" ]]; then
  emit_catchup_constraint message="no lockfile found" tree="$(
    print_tree_start "$LABEL"
    echo "   └─ looked for: pnpm-lock.yaml, package-lock.json, yarn.lock"
  )"
  exit 2
fi

# guard: its package manager on PATH
if ! command -v "$PM" >/dev/null 2>&1; then
  emit_catchup_constraint message="$PM not found on PATH" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ lockfile: $LOCK_FILE"
    echo "   └─ fix: install $PM, then lock refresh again"
  )"
  exit 2
fi

######################################################################
# refresh and stage
######################################################################
INSTALL_EXIT=0
INSTALL_OUTPUT=$("${INSTALL[@]}" 2>&1) || INSTALL_EXIT=$?
if [[ "$INSTALL_EXIT" -ne 0 ]]; then
  emit_catchup_malfunction message="$PM could not refresh the lockfile" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ ran: ${INSTALL[*]}"
    echo "   ├─ exit: $INSTALL_EXIT"
    echo "   └─ output"
    print_catchup_files_tree prefix="      " files="$INSTALL_OUTPUT"
  )"
  exit 1
fi

git add -- "$LOCK_FILE"

print_turtle_header "righteous!"
print_tree_start "$LABEL"
echo "   ├─ pm: $PM"
echo "   ├─ install: ${INSTALL[*]}"
echo "   ├─ staged"
echo "   │  └─ $LOCK_FILE ✓"
echo "   └─ next: rhx git.branch.catchup continue"
