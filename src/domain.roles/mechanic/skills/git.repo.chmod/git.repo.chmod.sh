#!/usr/bin/env bash
######################################################################
# .what = set or clear the exec bit of one file inside the git repo
#
# .why  = raw chmod is denied: it can set any mode on any path. this is
#         the one paved way, and it moves only the exec bit of one file
#         the repo contains: no numeric modes, no setuid, no world-write,
#         no path outside the repo
#
# usage:
#   git.repo.chmod.sh --path <file> --exec on|off [--mode plan|apply]
#
# guarantee:
#   - plan by default: prints the file, its mode now, its mode after
#   - apply sets the mode and reads it back
#   - refuses (exit 2) a path outside the repo root, a symlink that
#     resolves outside, a directory, an absent file, any --exec but
#     on|off, and a file whose mode now carries setuid, setgid, sticky,
#     or world-write
#   - admits one way out of the root: a path through the worktree's own
#     .agent/repo=.this link (or its role=<x> link) whose real file lies
#     in the main worktree of the SAME git repo (same git common dir);
#     the plan prints the real path. a link of another name, a link into
#     a foreign repo, a `..` path, and a symlink behind the link that
#     escapes are all refused
######################################################################
set -euo pipefail

SKILL="git.repo.chmod"

# refuse: the fault in the tree, the fix under the coconut; both streams, exit 2
refuse() {
  local headline="$1" detail="$2" fix="$3" frame
  frame="🐢 bummer dude...

🐚 $SKILL
   └─ ✋ ConstraintError: $headline"
  [[ -n "$detail" ]] && frame+="
      └─ $detail"
  frame+="

🥥 did you know?
   ├─ $fix
   └─ rhx git.repo.chmod --path <file> --exec on|off [--mode plan|apply]"
  echo "$frame"
  echo "$frame" >&2
  exit 2
}

usage() {
  cat <<'EOF'
🐚 git.repo.chmod
   └─ set or clear the exec bit of one file inside the repo

usage:
  rhx git.repo.chmod --path <file> --exec on|off [--mode plan|apply]

inputs:
  --path <file>       the file, in the repo; a directory, a symlink out, or an absent file is refused
                      from a worktree, a role skill through .agent/repo=.this into the main worktree of the same repo is admitted
  --exec on|off       on: add the exec bit wherever read is granted. off: clear every exec bit. no numeric modes
  --mode plan|apply   plan (default): print the file, its mode now, its mode after. apply: set it, then read it back
  --help, -h          this text

example:
  rhx git.repo.chmod --path src/domain.roles/mechanic/skills/tool.sh --exec on
  rhx git.repo.chmod --path src/domain.roles/mechanic/skills/tool.sh --exec on --mode apply
EOF
}

PATH_IN=""
EXEC=""
RUN_MODE="plan"
EXEC_SET=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --path) PATH_IN="${2:-}"; shift 2 || shift ;;
    --exec) EXEC="${2:-}"; EXEC_SET="true"; shift 2 || shift ;;
    --mode) RUN_MODE="${2:-}"; shift 2 || shift ;;
    --repo|--role|--skill) shift 2 || shift ;;  # rhachet passthrough
    --) shift ;;
    --help|-h) usage; exit 0 ;;
    *) refuse "unknown argument: $1" "" "see: rhx git.repo.chmod --help" ;;
  esac
done

# validate input
[[ -n "$PATH_IN" ]] || refuse "--path is required" "" "name the file: --path <file>"
if [[ "$EXEC" != "on" && "$EXEC" != "off" ]]; then
  refuse "--exec must be on or off${EXEC_SET:+, got: '$EXEC'}" "no numeric modes, no setuid, no world-write: only the exec bit moves" "pass --exec on|off"
fi
if [[ "$RUN_MODE" != "plan" && "$RUN_MODE" != "apply" ]]; then
  refuse "--mode must be plan or apply, got: '$RUN_MODE'" "" "pass --mode plan|apply (plan is the default)"
fi
git rev-parse --git-dir > /dev/null 2>&1 || refuse "not in a git repository" "" "run from inside the repo"
REPO_ROOT=$(realpath "$(git rev-parse --show-toplevel)")

within() { [[ "$1" == "$2" || "$1" == "$2/"* ]]; }

# refuse an absent file
if [[ ! -e "$PATH_IN" && ! -L "$PATH_IN" ]]; then
  refuse "file is absent: $PATH_IN" "" "name a file that exists in the repo"
fi

# the one admitted way out of the root: a worktree's .agent/repo=.this link into the main
# worktree of the SAME repo (same git common dir). the lexical path must sit under
# <root>/.agent/repo=.this/ with no `..`, its real path inside the link's real target and
# inside the main worktree, and git at the file's own dir must read that same common dir
# and the main worktree as its toplevel (no nested repo, no foreign repo)
VIA_LINK=""
via_this_link() {
  local abs="$1" lex this rest link link_real common main dir dir_common dir_top
  [[ "/$PATH_IN/" == *"/../"* ]] && return 1
  lex=$(realpath -s -- "$PATH_IN") || return 1
  this="$REPO_ROOT/.agent/repo=.this"
  within "$lex" "$this" && [[ "$lex" != "$this" ]] || return 1
  # the link: .agent/repo=.this itself, or its role=<x> entry (the shape a worktree has)
  rest="${lex#"$this"/}"
  if [[ -L "$this" ]]; then
    link="$this"
  elif [[ -d "$this" && "$rest" == role=*/* && -L "$this/${rest%%/*}" ]]; then
    link="$this/${rest%%/*}"
  else
    return 1
  fi
  link_real=$(realpath -- "$link") || return 1
  within "$abs" "$link_real" || return 1
  common=$(realpath -- "$(git -C "$REPO_ROOT" rev-parse --path-format=absolute --git-common-dir)") || return 1
  [[ "$(basename -- "$common")" == ".git" ]] || return 1
  main=$(dirname -- "$common")
  within "$abs" "$main" || return 1
  dir=$(dirname -- "$abs")
  dir_common=$(git -C "$dir" rev-parse --path-format=absolute --git-common-dir 2> /dev/null) || return 1
  [[ "$(realpath -- "$dir_common")" == "$common" ]] || return 1
  dir_top=$(git -C "$dir" rev-parse --show-toplevel 2> /dev/null) || return 1
  [[ "$(realpath -- "$dir_top")" == "$main" ]] || return 1
  VIA_LINK="$main"
}

# refuse a path or symlink that resolves outside the root
ABS=$(realpath "$PATH_IN")
if ! within "$ABS" "$REPO_ROOT" && ! via_this_link "$ABS"; then
  if [[ -L "$PATH_IN" ]]; then
    refuse "symlink resolves outside the repo: $PATH_IN" "repo root: $REPO_ROOT; target: $ABS" "name a file inside the repo root, or the symlink's in-repo target"
  fi
  refuse "path is outside the repo root: $PATH_IN" "repo root: $REPO_ROOT; path: $ABS" "name a file inside the repo root"
fi

# refuse a directory or a non-regular file
[[ -d "$ABS" ]] && refuse "path is a directory: $PATH_IN" "" "name one file; a directory's mode is not moved here"
[[ -f "$ABS" ]] || refuse "path is not a regular file: $PATH_IN" "" "name one regular file in the repo"

REL="${ABS#"$REPO_ROOT"/}"
[[ -n "$VIA_LINK" ]] && REL="$ABS"  # the real path, in the main worktree
NOW=$(stat -c '%a' "$ABS")
NOW_DEC=$((8#$NOW))

# refuse any bit beyond rwx of owner, group, other, or world-write
if (( (NOW_DEC & 07000) != 0 || (NOW_DEC & 0002) != 0 )); then
  refuse "file carries a mode beyond the exec bit: $REL is $NOW" "setuid, setgid, sticky, or world-write is never touched here" "cure the mode by a human hand; this skill moves only the exec bit"
fi

# compute the mode after: on adds x wherever r is granted; off clears every x
if [[ "$EXEC" == "on" ]]; then
  AFTER_DEC=$(( NOW_DEC | ((NOW_DEC & 0444) >> 2) ))
else
  AFTER_DEC=$(( NOW_DEC & ~0111 ))
fi
AFTER=$(printf '%o' "$AFTER_DEC")

echo "🐢 sweet"
echo ""
echo "🐚 $SKILL"
echo "   ├─ file: $REL"
[[ -n "$VIA_LINK" ]] && echo "   ├─ via:  .agent/repo=.this, into the main worktree $VIA_LINK (same git common dir)"
echo "   ├─ exec: $EXEC"
echo "   ├─ mode: $RUN_MODE"
echo "   ├─ now:  $NOW"

# plan stops here
if [[ "$RUN_MODE" == "plan" ]]; then
  echo "   ├─ after: $AFTER"
  echo "   └─ plan only; naught changed"
  echo ""
  echo "🥥 did you know?"
  echo "   └─ rhx git.repo.chmod --path $PATH_IN --exec $EXEC --mode apply"
  exit 0
fi

# apply, then read back
[[ "$AFTER" != "$NOW" ]] && chmod "$AFTER" "$ABS"
READ=$(stat -c '%a' "$ABS")
[[ "$READ" == "$AFTER" ]] || refuse "read-back differs: wanted $AFTER, read $READ for $REL" "" "check the file's mount and owner"
echo "   ├─ after: $AFTER"
echo "   └─ applied; read back: $READ"
