#!/usr/bin/env bash
######################################################################
# .what = mark shell files inside this repo executable
#
# .why  = the build refuses a skill or init `.sh` with no execute bit,
#         and a raw `chmod` is not paved: this grants only +x, only to
#         `.sh` files, only inside the repo
#
# usage:
#   chmodsafe.sh --path src/domain.roles/mechanic/skills/git.pull.watch/git.pull.watch.sh [--path ...]
#   chmodsafe.sh --glob 'src/domain.roles/mechanic/skills/git.pull.watch/*.sh'
#
# guarantee:
#   - only `.sh` files; only under the git root; never a symlink
#   - adds +x; never removes a bit
#   - validates every path before it changes any
#   - exit 0 ok · 2 bad input
#
# .test = src/.test/skills.repo.this/chmodsafe.integration.test.ts (jest skips .agent/)
######################################################################
set -euo pipefail

USAGE="rhx chmodsafe --path <file.sh> [--path ...] | --glob '<pattern>.sh'"

# .what = refuse with the fix, on both streams
fail() {
  local text
  text="$(printf '✋ ConstraintError: %s\n\n🥥 did you know?\n   └─ to fix it\n      └─ %s' "$1" "$USAGE")"
  echo "$text"
  echo "$text" >&2
  exit 2
}

# .what = the realpath of a file: its dir resolved, its own name kept
# .why  = a symlinked dir must not smuggle a path outside the repo past the check
as_real_path() {
  echo "$(cd "$(dirname "$1")" && pwd -P)/$(basename "$1")"
}

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "")"
[[ -n "$ROOT" ]] || fail "not in a git repository; cd into the repo whose files you mark"
ROOT="$(cd "$ROOT" && pwd -P)"
PATHS=()

while [[ $# -gt 0 ]]; do
  # a value flag at the end of the call has no value: refuse it, never a raw `shift` exit
  case "$1" in
    --skill|--repo|--role|--path|--glob) [[ $# -ge 2 ]] || fail "$1 needs a value" ;;
  esac
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --path) PATHS+=("$2"); shift 2 ;;
    --glob)
      shopt -s globstar nullglob
      # shellcheck disable=SC2206
      MATCHED=( ${2:-} )
      shopt -u nullglob
      [[ ${#MATCHED[@]} -gt 0 ]] || fail "--glob '${2:-}' matched no files"
      PATHS+=("${MATCHED[@]}")
      shift 2 ;;
    --help|-h)
      echo "usage: $USAGE"
      echo ""
      echo "options:"
      echo "  --path <file.sh>   one .sh file inside this repo (repeatable)"
      echo "  --glob <pattern>   every .sh file the pattern matches (quote it)"
      echo ""
      echo "example:"
      echo "  rhx chmodsafe --glob 'src/domain.roles/mechanic/skills/git.pull.watch/*.sh'"
      exit 0 ;;
    *) fail "unknown arg '$1'" ;;
  esac
done
[[ ${#PATHS[@]} -gt 0 ]] || fail "name at least one --path or --glob"

# validate every path before any change
for one in "${PATHS[@]}"; do
  [[ "$one" == *.sh ]] || fail "not a .sh file: $one"
  [[ -f "$one" && ! -L "$one" ]] || fail "not a regular file: $one"
  [[ "$(as_real_path "$one")" == "$ROOT"/* ]] || fail "outside the repo: $one"
done

# grant +x, and name each file
echo "🐢 shell yeah"
echo ""
echo "🐚 chmodsafe"
COUNT=${#PATHS[@]}
for i in "${!PATHS[@]}"; do
  chmod +x "${PATHS[$i]}"
  branch="├─"
  [[ $i -eq $((COUNT - 1)) ]] && branch="└─"
  echo "   $branch +x ${PATHS[$i]}"
done
