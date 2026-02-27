#!/usr/bin/env bash
######################################################################
# .what = bind commit level constraint for mechanics
#
# .why  = humans prescribe whether the work is a fix or feat,
#         so git.commit.set can enforce the correct prefix
#
# usage:
#   git.commit.bind get
#   git.commit.bind set --level fix
#   git.commit.bind set --level feat
#   git.commit.bind del
#
# guarantee:
#   - only humans can invoke (denied to mechanic via permissions)
#   - state stored in .branch/.bind/git.commit.level
#   - git.commit.set validates header prefix against bound level
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
BIND_DIR="$REPO_ROOT/.branch/.bind"
LEVEL_FILE="$BIND_DIR/git.commit.level"

######################################################################
# helper: infer level from branch name
######################################################################
infer_level_from_branch() {
  local branch="$1"

  # check for fix patterns: fix/*, */fix/*, */fix-*, hotfix/*, bugfix/*
  local has_fix=false
  if [[ "$branch" =~ ^fix/ ]] || [[ "$branch" =~ /fix/ ]] || [[ "$branch" =~ /fix- ]] || \
     [[ "$branch" =~ ^hotfix/ ]] || [[ "$branch" =~ ^bugfix/ ]]; then
    has_fix=true
  fi

  # check for feat patterns: feat/*, */feat/*, */feat-*, feature/*
  local has_feat=false
  if [[ "$branch" =~ ^feat/ ]] || [[ "$branch" =~ /feat/ ]] || [[ "$branch" =~ /feat- ]] || \
     [[ "$branch" =~ ^feature/ ]]; then
    has_feat=true
  fi

  # ambiguous = both signals present → none
  if $has_fix && $has_feat; then
    echo "none"
  elif $has_fix; then
    echo "fix"
  elif $has_feat; then
    echo "feat"
  else
    echo "none"
  fi
}

# parse subcommand
SUBCOMMAND=""
LEVEL=""

while [[ $# -gt 0 ]]; do
  case $1 in
    get|set|del)
      SUBCOMMAND="$1"
      shift
      ;;
    --level)
      LEVEL="$2"
      shift 2
      ;;
    --help|-h)
      echo "usage:"
      echo "  git.commit.bind get                show the bound level"
      echo "  git.commit.bind set --level fix    bind level to fix"
      echo "  git.commit.bind set --level feat   bind level to feat"
      echo "  git.commit.bind del                remove the bound level"
      exit 0
      ;;
    --repo|--role|--skill)
      shift 2
      ;;
    --)
      shift
      ;;
    --*)
      echo "error: unknown option: $1"
      echo "usage: git.commit.bind get | set --level fix|feat | del"
      exit 2
      ;;
    *)
      shift
      ;;
  esac
done

# validate subcommand
if [[ -z "$SUBCOMMAND" ]]; then
  echo "error: subcommand is required (get, set, or del)"
  echo "usage: git.commit.bind get | set --level fix|feat | del"
  exit 2
fi

case "$SUBCOMMAND" in
  set)
    # validate --level for set
    if [[ -z "$LEVEL" ]]; then
      echo "error: --level is required for set"
      echo "usage: git.commit.bind set --level fix|feat"
      exit 2
    fi
    if [[ "$LEVEL" != "feat" && "$LEVEL" != "fix" ]]; then
      echo "error: --level must be 'feat' or 'fix'"
      echo "usage: git.commit.bind set --level fix|feat"
      exit 2
    fi

    # findsert directory scaffold
    mkdir -p "$BIND_DIR"
    if [[ ! -f "$BIND_DIR/.gitignore" ]]; then
      printf '# .branch/.bind state files are local-only\n# human-prescribed constraints for mechanic behavior\n*\n' > "$BIND_DIR/.gitignore"
    fi
    if [[ ! -f "$BIND_DIR/.readme" ]]; then
      cat > "$BIND_DIR/.readme" << 'SCAFFOLD'
# .branch/.bind

stores human-prescribed constraints for mechanic behavior.

## how it works

1. human prescribes a constraint: `git.commit.bind set --level fix`
2. state is written to `.branch/.bind/git.commit.level`
3. mechanic checks the constraint before each commit
4. commits with a mismatched prefix are rejected
5. human clears the constraint: `git.commit.bind del`

## security

the mechanic cannot modify files in this directory.
write access to `.branch/.bind/` is denied in the permissions denylist.
only human-invoked commands can bind or clear constraints.
SCAFFOLD
    fi

    # write the bound level
    echo "$LEVEL" > "$LEVEL_FILE"
    print_turtle_header "sweet! level bound"
    print_tree_start "git.commit.bind"
    echo "   └─ level: $LEVEL"
    ;;
  get)
    # determine effective level and source
    EFFECTIVE_LEVEL=""
    LEVEL_SOURCE=""

    # 1. check explicit bind file first
    if [[ -f "$LEVEL_FILE" ]]; then
      EXPLICIT_LEVEL=$(cat "$LEVEL_FILE" 2>/dev/null || echo "")
      if [[ -n "$EXPLICIT_LEVEL" ]]; then
        EFFECTIVE_LEVEL="$EXPLICIT_LEVEL"
        LEVEL_SOURCE="explicit"
      fi
    fi

    # 2. if no explicit bind, infer from branch name
    if [[ -z "$EFFECTIVE_LEVEL" ]]; then
      CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
      if [[ -n "$CURRENT_BRANCH" && "$CURRENT_BRANCH" != "HEAD" ]]; then
        INFERRED_LEVEL=$(infer_level_from_branch "$CURRENT_BRANCH")
        if [[ "$INFERRED_LEVEL" != "none" ]]; then
          EFFECTIVE_LEVEL="$INFERRED_LEVEL"
          LEVEL_SOURCE="inferred from branch"
        fi
      fi
    fi

    # output
    print_turtle_header "lets check the bind..."
    print_tree_start "git.commit.bind"
    if [[ -n "$EFFECTIVE_LEVEL" ]]; then
      echo "   ├─ level: $EFFECTIVE_LEVEL"
      echo "   └─ source: $LEVEL_SOURCE"
    else
      echo "   └─ level: (none — will nudge on feat commits)"
    fi
    ;;
  del)
    # remove the bound level
    if [[ -f "$LEVEL_FILE" ]]; then
      rm "$LEVEL_FILE"
    fi
    print_turtle_header "groovy, level cleared"
    print_tree_start "git.commit.bind"
    echo "   └─ level: (none)"
    ;;
esac
