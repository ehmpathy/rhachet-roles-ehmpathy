#!/usr/bin/env bash
######################################################################
# .what = walk the critical paths of `git.branch.rebase --unstaged`
#         by hand, in throwaway repos, and print each one verbatim
#
# .why  = a test proves a path; a playtest shows a human what the path
#         feels like. each path prints the exact command, its real
#         output, its exit code, and a readback of the held paths, so
#         a reviewer can score it against def.frictionless
#
# usage:
#   playtest.rebase.unstaged.sh                 # walk every path, skill from src
#   playtest.rebase.unstaged.sh --path E3       # walk one path
#   playtest.rebase.unstaged.sh --from dist     # walk the built artifact (run npm run build first)
#   playtest.rebase.unstaged.sh --help
#
# paths:
#   help the input surface: each --help, and a bad --unstaged value
#   E1   clean rebase; a broken symlink retarget + a file edit put back
#   E2   no --unstaged flag; plan and apply refuse and name the cure
#   E3   a conflict stops the rebase; continue puts the paths back
#   E4   a conflict stops the rebase; abort puts the paths back
#   E5   main bumped a held path; the held copy is put back and flagged
#   E6   a held path regenerates while the conflict waits; continue
#   E18  main bumped a held path, and a conflict stops; continue
#   E19  E18, plus the held path edited again while stopped; continue
#   E35  a hook edits a held path while begin rebases
#
# guarantee:
#   - runs the skill from this repo's src (the code under review), or
#     from dist with --from dist (what rhx ships)
#   - every repo lives in a fresh temp dir, removed on exit
#   - never touches this worktree or the shared stash
#   - exit 0 = walked; exit 2 = bad input
######################################################################
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
AMBIENT=".agent/.actors/actor.via.repo=ambient/brain/.claude"
SETTINGS="$AMBIENT/settings.of.repo.json"
GROVE="$AMBIENT/settings.of.grove.json"
LINK_COMMITTED="/home/seaturtle/.claude/settings.json"
LINK_ABSENT="/nonexistent/turtle/.claude/settings.json"
ALL_PATHS=(help E1 E2 E3 E4 E5 E6 E18 E19 E35)

######################################################################
# show usage
######################################################################
show_usage() {
  echo "usage: playtest.rebase.unstaged.sh [--path help|E1|E2|E3|E4|E5|E6|E18|E19|E35] [--from src|dist]"
  echo ""
  echo "walk the critical paths of git.branch.rebase --unstaged in throwaway repos"
  echo ""
  echo "options:"
  echo "  --path   one path to walk (default: all)"
  echo "  --from   src = the code under review (default); dist = the built artifact"
  echo ""
  echo "examples:"
  echo "  playtest.rebase.unstaged.sh"
  echo "  playtest.rebase.unstaged.sh --path E3"
  echo "  playtest.rebase.unstaged.sh --from dist"
}

######################################################################
# parse arguments
######################################################################
ONLY=""
FROM="src"
while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role) shift 2 ;;
    --help|-h) show_usage; exit 0 ;;
    --path) ONLY="${2:-}"; shift 2 ;;
    --from) FROM="${2:-}"; shift 2 ;;
    *)
      { echo "✋ ConstraintError: unknown arg: $1"; show_usage; } | tee /dev/stderr
      exit 2
      ;;
  esac
done
if [[ -n "$ONLY" && ! " ${ALL_PATHS[*]} " =~ " $ONLY " ]]; then
  { echo "✋ ConstraintError: --path must be one of: ${ALL_PATHS[*]}"; show_usage; } | tee /dev/stderr
  exit 2
fi
if [[ "$FROM" != "src" && "$FROM" != "dist" ]]; then
  { echo "✋ ConstraintError: --from must be 'src' or 'dist'"; show_usage; } | tee /dev/stderr
  exit 2
fi
DISPATCHER="$REPO_ROOT/$FROM/domain.roles/mechanic/skills/git.branch.rebase/git.branch.rebase.sh"
if [[ ! -f "$DISPATCHER" ]]; then
  {
    echo "✋ ConstraintError: no dispatcher at $DISPATCHER"
    echo ""
    echo "🥥 did you know?"
    echo "   ├─ --from dist reads the build; build first"
    echo "   └─ npm run build"
  } | tee /dev/stderr
  exit 2
fi

BASE_DIR="$(mktemp -d)"
trap 'rm -rf -- "$BASE_DIR"' EXIT

######################################################################
# git in the scratch work tree; fail loud
######################################################################
wgit() { git -C "$WORK" "$@" > /dev/null; }

# commit one file on the current branch
commit_file() {
  local file="$1" content="$2" message="$3"
  printf '%s\n' "$content" > "$WORK/$file"
  wgit add -- "$file"
  wgit commit -q -m "$message"
}

######################################################################
# build a scratch repo: bare origin, a work clone, feat/turtle, main ahead
# args: name, then any of: conflict, main_bumps_package
######################################################################
setup_repo() {
  local name="$1"; shift
  local conflict=false main_bumps=false flag
  for flag in "$@"; do
    [[ "$flag" == "conflict" ]] && conflict=true
    [[ "$flag" == "main_bumps_package" ]] && main_bumps=true
  done
  local dir="$BASE_DIR/$name"
  WORK="$dir/work"
  mkdir -p "$dir/origin.git"
  git -C "$dir/origin.git" init -q --bare -b main
  git clone -q "$dir/origin.git" "$WORK" 2> /dev/null
  wgit config user.name "Test Human"
  wgit config user.email "human@test.com"
  wgit config commit.gpgsign false
  wgit config core.hooksPath .git/hooks
  wgit symbolic-ref HEAD refs/heads/main

  # the base tree: the ambient file and link a clone holds, plus repo files
  mkdir -p "$WORK/$AMBIENT"
  printf '# reef\n' > "$WORK/README.md"
  printf '{ "version": "1.0.0" }\n' > "$WORK/package.json"
  printf 'base\n' > "$WORK/conflict.txt"
  printf '{ "hooks": "v1" }\n' > "$WORK/$SETTINGS"
  ln -s "$LINK_COMMITTED" "$WORK/$GROVE"
  wgit add -A
  wgit commit -q -m "init: initial commit"
  wgit push -q -u origin main

  # the feature branch
  wgit checkout -q -b feat/turtle
  commit_file feature.txt "feature" "feat(reef): add feature"
  [[ "$conflict" == true ]] && commit_file conflict.txt "feature version" "feat(reef): edit conflict file"

  # main moves ahead
  wgit checkout -q main
  commit_file main-1.txt "main 1" "chore(reef): main commit"
  [[ "$conflict" == true ]] && commit_file conflict.txt "main version" "chore(reef): main edits conflict file"
  [[ "$main_bumps" == true ]] && commit_file package.json '{ "version": "1.1.0" }' "chore(release): v1.1.0"
  wgit push -q origin main
  wgit checkout -q feat/turtle

  # push grant, kept out of the tree
  mkdir -p "$WORK/.meter"
  printf '{ "uses": 5, "push": "allow" }\n' > "$WORK/.meter/git.commit.uses.jsonc"
  printf '.meter\n' > "$WORK/.git/info/exclude"
}

# drift the ambient pair the way a clone tree holds it
drift_ambient() {
  rm -f -- "$WORK/$GROVE"
  ln -s "$LINK_ABSENT" "$WORK/$GROVE"
  printf '{ "hooks": "v2-regenerated" }\n' > "$WORK/$SETTINGS"
}

######################################################################
# print a section header, a step, a run, and a readback
######################################################################
section() { echo ""; echo "════════ $1"; }
note() { echo "# $1"; }

# run the skill; print the command, its output, its exit
run() {
  local status=0 output
  echo "\$ rhx git.branch.rebase $*"
  output=$(cd "$WORK" && GIT_EDITOR=true bash "$DISPATCHER" "$@" 2> /dev/null) || status=$?
  echo "$output"
  echo "exit=$status"
}

# show what each held path reads, and what git sees as unstaged
readback() {
  echo "\$ readlink $GROVE"
  readlink -- "$WORK/$GROVE" || echo "(absent)"
  echo "\$ cat $SETTINGS"
  cat -- "$WORK/$SETTINGS"
  echo "\$ git status --porcelain"
  git -C "$WORK" status --porcelain
  echo "\$ git log --format=%s origin/main..HEAD"
  git -C "$WORK" log --format='%s' origin/main..HEAD
}

######################################################################
# the critical paths
######################################################################
walk_help() {
  section "help · the input surface"
  setup_repo help
  run begin --help
  run continue --help
  run abort --help
  run begin --mode apply --unstaged bogus
}

walk_E1() {
  section "E1 · ambient drift (broken symlink retarget + file edit) · clean rebase"
  setup_repo E1
  drift_ambient
  run begin --mode apply --unstaged ignore
  readback
}

walk_E2() {
  section "E2 · no --unstaged flag · plan and apply refuse and name the cure"
  setup_repo E2
  drift_ambient
  run begin
  run begin --mode apply
  note "the cure the refusal names"
  run begin --mode apply --unstaged ignore
  readback
}

walk_E3() {
  section "E3 · conflict stops the rebase · continue"
  setup_repo E3 conflict
  drift_ambient
  run begin --mode apply --unstaged ignore
  note "the clone settles the conflict"
  printf 'settled\n' > "$WORK/conflict.txt"
  wgit add conflict.txt
  run continue
  readback
}

walk_E4() {
  section "E4 · conflict stops the rebase · abort"
  setup_repo E4 conflict
  drift_ambient
  run begin --mode apply --unstaged ignore
  run abort
  readback
}

walk_E5() {
  section "E5 · main bumped package.json, which the clone holds unstaged · clean rebase"
  setup_repo E5 main_bumps_package
  drift_ambient
  printf '{ "version": "1.0.0", "local": true }\n' > "$WORK/package.json"
  run begin --mode apply --unstaged ignore
  readback
  echo "\$ cat package.json"
  cat -- "$WORK/package.json"
}

walk_E6() {
  section "E6 · a session regenerates a held path while the conflict waits · continue"
  setup_repo E6 conflict
  drift_ambient
  run begin --mode apply --unstaged ignore
  note "a session hook regenerates the ambient file mid-conflict"
  printf '{ "hooks": "v3-session" }\n' > "$WORK/$SETTINGS"
  printf 'settled\n' > "$WORK/conflict.txt"
  wgit add conflict.txt
  run continue
  readback
  echo "\$ cat .git/git.branch.rebase.superseded/$SETTINGS"
  cat -- "$WORK/.git/git.branch.rebase.superseded/$SETTINGS"
}

walk_E18() {
  section "E18 · main bumped a held path, and a conflict stops · continue"
  setup_repo E18 conflict main_bumps_package
  drift_ambient
  printf '{ "version": "1.0.0", "local": true }\n' > "$WORK/package.json"
  run begin --mode apply --unstaged ignore
  printf 'settled\n' > "$WORK/conflict.txt"
  wgit add conflict.txt
  run continue
  readback
}

walk_E19() {
  section "E19 · E18, and the held path is edited again while stopped · continue"
  setup_repo E19 conflict main_bumps_package
  drift_ambient
  printf '{ "version": "1.0.0", "local": true }\n' > "$WORK/package.json"
  run begin --mode apply --unstaged ignore
  note "the clone edits the held package.json again mid-conflict"
  printf '{ "version": "1.0.0", "local": "again" }\n' > "$WORK/package.json"
  printf 'settled\n' > "$WORK/conflict.txt"
  wgit add conflict.txt
  run continue
  readback
  echo "\$ cat package.json"
  cat -- "$WORK/package.json"
}

walk_E35() {
  section "E35 · a hook edits a held path while begin rebases"
  setup_repo E35
  drift_ambient
  note "a post-rewrite hook regenerates the ambient file mid-rebase"
  printf '#!/bin/sh\necho %s > "%s"\n' "'{ \"hooks\": \"v3-hook\" }'" "$SETTINGS" > "$WORK/.git/hooks/post-rewrite"
  chmod +x "$WORK/.git/hooks/post-rewrite"
  run begin --mode apply --unstaged ignore
  readback
  echo "\$ cat .git/git.branch.rebase.superseded/$SETTINGS"
  cat -- "$WORK/.git/git.branch.rebase.superseded/$SETTINGS"
}

######################################################################
# walk
######################################################################
echo "🐢 playtest: git.branch.rebase --unstaged (skill run from $FROM)"
for name in "${ALL_PATHS[@]}"; do
  [[ -n "$ONLY" && "$name" != "$ONLY" ]] && continue
  "walk_$name"
done
