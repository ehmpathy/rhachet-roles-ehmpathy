#!/usr/bin/env bash
######################################################################
# .what = run GitHub Actions workflows locally via act
#
# .why  = reproduce CI environment locally to catch issues before push:
#         - matches ubuntu-24.04 runner
#         - matches Node version from .nvmrc
#         - catches OS/environment-dependent test failures
#         - auto-loads secrets from keyrack
#         - bind-mounts repo (node_modules shared between jobs)
#         - caches actions via .agent/.cache/
#         - tees output to timestamped log files
#
# usage:
#   cicd.action.act.sh --flow test                    # run full test workflow
#   cicd.action.act.sh --flow test -j test-unit       # run specific job
#   cicd.action.act.sh --flow test -n                 # plan mode (show what would run)
#   cicd.action.act.sh --list                         # list available jobs
#
# prerequisite:
#   curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
#
# guarantee:
#   - uses ./bin/act if extant, else system act
#   - auto-unlocks keyrack and forwards secrets
#   - passes all args through to act
#   - logs output to .agent/.cache/.../logs/
#   - fail-fast on errors
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# find act binary
if [[ -x "$REPO_ROOT/bin/act" ]]; then
  ACT="$REPO_ROOT/bin/act"
elif command -v act &>/dev/null; then
  ACT="act"
else
  echo "error: act not found" >&2
  echo "install: curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash" >&2
  exit 1
fi

# parse args (filter out rhachet-injected args and extract --flow)
ARGS=()
FLOW=""
SKIP_NEXT=false
CAPTURE_FLOW=false
for arg in "$@"; do
  if [[ "$SKIP_NEXT" == "true" ]]; then
    SKIP_NEXT=false
    continue
  fi
  if [[ "$CAPTURE_FLOW" == "true" ]]; then
    FLOW="$arg"
    CAPTURE_FLOW=false
    continue
  fi
  case "$arg" in
    --skill|--repo|--role)
      SKIP_NEXT=true
      ;;
    --flow)
      CAPTURE_FLOW=true
      ;;
    *)
      ARGS+=("$arg")
      ;;
  esac
done

# require --flow
if [[ -z "$FLOW" ]]; then
  echo "error: --flow is required" >&2
  echo "usage: cicd.action.act.sh --flow <workflow> [act args...]" >&2
  exit 2
fi

# derive workflow file from flow name
WORKFLOW_FILE="$REPO_ROOT/.github/workflows/$FLOW.yml"
if [[ ! -f "$WORKFLOW_FILE" ]]; then
  echo "error: workflow not found: $WORKFLOW_FILE" >&2
  exit 2
fi

# load secrets from keyrack
SECRET_ARGS=()
if command -v rhx &>/dev/null; then
  # unlock keys for test env
  rhx keyrack unlock --owner ehmpath --env test || true

  # get export statements and convert to act -s args
  while IFS= read -r line; do
    # parse: export KEY_NAME="value"
    if [[ "$line" =~ ^export[[:space:]]+([A-Z_]+)=\"(.*)\"$ ]]; then
      KEY_NAME="${BASH_REMATCH[1]}"
      KEY_VALUE="${BASH_REMATCH[2]}"
      SECRET_ARGS+=("-s" "$KEY_NAME=$KEY_VALUE")
      echo "✓ $KEY_NAME"
    fi
  done < <(rhx keyrack source --owner ehmpath --env test --lenient 2>/dev/null || true)
fi

# ensure cache and log dirs exist
CACHE_DIR="$REPO_ROOT/.agent/.cache/repo=.this/role=any/skill=cicd.action.act"
LOG_DIR="$CACHE_DIR/logs"
mkdir -p "$CACHE_DIR" "$LOG_DIR"

# detect worktree and mount main repo .git for gitdir resolution
CONTAINER_OPTS=()
if [[ -f "$REPO_ROOT/.git" ]]; then
  # worktree: .git file contains "gitdir: /path/to/main/.git/worktrees/name"
  GITDIR=$(sed 's/^gitdir: //' "$REPO_ROOT/.git")
  # extract main repo .git path: /path/to/main/.git/worktrees/name -> /path/to/main/.git
  MAIN_GIT_DIR=$(dirname "$(dirname "$GITDIR")")
  echo "worktree found: will mount $MAIN_GIT_DIR for git resolution"
  CONTAINER_OPTS+=("--container-options" "-v ${MAIN_GIT_DIR}:${MAIN_GIT_DIR}:ro")
fi

# run act with bind, secrets, cache; tee output to log file
TIMESTAMP=$(date +%Y-%m-%dT%H-%M-%S)
LOG_FILE="$LOG_DIR/$FLOW.$TIMESTAMP.log"
"$ACT" -W "$WORKFLOW_FILE" --bind --cache-server-path "$CACHE_DIR" "${CONTAINER_OPTS[@]}" "${SECRET_ARGS[@]}" "${ARGS[@]}" 2>&1 | tee "$LOG_FILE"
