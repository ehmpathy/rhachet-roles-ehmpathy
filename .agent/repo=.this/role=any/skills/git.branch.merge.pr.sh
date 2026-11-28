#!/usr/bin/env bash
######################################################################
# .what = merge an open pr's head into this branch, so this branch
#         builds on that pr's work rather than a copy of it
#
# .why  = a crew asked to "build on #N, never twin" must carry the
#         pr's commits; raw `git merge` is unpaved, and a re-merge is
#         owed each time that pr gains a commit
#
# usage:
#   git.branch.merge.pr.sh --pr <n>                  # plan (default)
#   git.branch.merge.pr.sh --pr <n> --mode apply     # merge
#   git.branch.merge.pr.sh --pr <n> --mode apply --unstaged aside
#                                # set local edits on merged paths aside,
#                                # merge, then put them back
#   git.branch.merge.pr.sh --pr <n> --restore        # re-apply an aside patch left on disk
#   git.branch.merge.pr.sh --abort                   # undo a stopped merge
#
# guarantee:
#   - never commits: the merge lands in the index; the commit goes
#     through rhx git.commit.set, so commit hooks and attribution apply
#   - refuses (exit 2) when the local origin ref lags the pr's head on
#     github: a merge of a stale head would twin the pr
#   - refuses (exit 2) on a branch named main or master
#   - merges with --no-ff --no-commit
#   - --unstaged aside: local edits on paths the merge touches are saved
#     as a patch under the git dir, reverted, the merge runs, then the
#     patch re-applies via a 3-way apply; a patch that will not re-apply
#     stays on disk, named
#   - git refuses to begin → names git's reason, exit 2, naught changed
#   - on a conflict, stops with the merge in progress, names each
#     conflicted path, exit 2; settle, stage, then commit via
#     rhx git.commit.set, or run --abort
#   - plan mode writes naught
######################################################################
set -euo pipefail

PR=""
MODE="plan"
ABORT="false"
UNSTAGED="refuse"
RESTORE="false"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --pr) PR="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    --unstaged) UNSTAGED="${2:-}"; shift 2 ;;
    --abort) ABORT="true"; shift ;;
    --restore) RESTORE="true"; shift ;;
    --help|-h)
      echo "usage: git.branch.merge.pr.sh --pr <n> [--mode plan|apply] [--unstaged aside] | --pr <n> --restore | --abort"
      exit 0
      ;;
    *)
      echo "✋ ConstraintError: unknown argument: $1 (see --help)" | tee /dev/stderr
      exit 2
      ;;
  esac
done

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# re-apply an aside patch a prior run left on disk
if [[ "$RESTORE" == "true" ]]; then
  [[ "$PR" =~ ^[0-9]+$ ]] || { echo "✋ ConstraintError: --restore needs --pr <n>" | tee /dev/stderr; exit 2; }
  LEFT_PATCH="$(git rev-parse --absolute-git-dir)/merge.pr.$PR.aside.patch"
  [[ -f "$LEFT_PATCH" ]] || { echo "🐢 no aside patch left for pr #$PR; naught to restore"; exit 0; }
  mapfile -t LEFT_LIST < <(git apply --numstat "$LEFT_PATCH" | cut -f3)
  git apply --3way "$LEFT_PATCH" > /dev/null
  git reset -q -- "${LEFT_LIST[@]}" || true
  rm -f "$LEFT_PATCH"
  echo "🐢 restored ${#LEFT_LIST[@]} local edit(s) from pr #$PR's aside patch"
  exit 0
fi

# undo a stopped merge
if [[ "$ABORT" == "true" ]]; then
  git merge --abort
  echo "🐢 merge aborted; the branch is back where it was"
  exit 0
fi

# validate input
if [[ ! "$PR" =~ ^[0-9]+$ ]]; then
  echo "✋ ConstraintError: --pr <n> is required, a pr number" | tee /dev/stderr
  exit 2
fi
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  echo "✋ ConstraintError: --mode must be plan or apply, got '$MODE'" | tee /dev/stderr
  exit 2
fi
if [[ "$UNSTAGED" != "refuse" && "$UNSTAGED" != "aside" ]]; then
  echo "✋ ConstraintError: --unstaged must be aside, got '$UNSTAGED'" | tee /dev/stderr
  exit 2
fi

# refuse the default branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  echo "✋ ConstraintError: this branch is $BRANCH; merge a pr into a feature branch only" | tee /dev/stderr
  exit 2
fi

# read the pr's head from github
HEAD_REF=$(gh pr view "$PR" --json headRefName --jq .headRefName)
HEAD_OID=$(gh pr view "$PR" --json headRefOid --jq .headRefOid)
LOCAL_OID=$(git rev-parse --verify --quiet "origin/$HEAD_REF" || true)

# refuse a stale local ref
if [[ "$LOCAL_OID" != "$HEAD_OID" ]]; then
  {
    echo "✋ ConstraintError: origin/$HEAD_REF lags pr #$PR's head"
    echo "   ├─ local:  ${LOCAL_OID:-absent}"
    echo "   ├─ github: $HEAD_OID"
    echo "   └─ fix: fetch origin, then rerun"
  } | tee /dev/stderr
  exit 2
fi

AHEAD=$(git rev-list --count "HEAD..origin/$HEAD_REF")

echo "🐢 build on pr #$PR"
echo ""
echo "🐚 git.branch.merge.pr --pr $PR"
echo "   ├─ branch: $BRANCH"
echo "   ├─ merge:  origin/$HEAD_REF @ ${HEAD_OID:0:8}"
echo "   ├─ new commits: $AHEAD"
echo "   ├─ mode: $MODE"

# naught to merge
if [[ "$AHEAD" == "0" ]]; then
  echo "   └─ already carried; naught to merge"
  exit 0
fi

# plan stops here
if [[ "$MODE" == "plan" ]]; then
  echo "   └─ plan only; naught changed"
  echo ""
  echo "🥥 did you know?"
  echo "   └─ rhx git.branch.merge.pr --pr $PR --mode apply"
  exit 0
fi

# set aside local edits on paths the merge touches
ASIDE_PATCH="$(git rev-parse --absolute-git-dir)/merge.pr.$PR.aside.patch"
ASIDE_LIST=()
if [[ "$UNSTAGED" == "aside" ]]; then
  MERGE_BASE=$(git merge-base HEAD "origin/$HEAD_REF")
  mapfile -t ASIDE_LIST < <(comm -12 \
    <(git diff --name-only "$MERGE_BASE" "origin/$HEAD_REF" | sort) \
    <(git diff --name-only HEAD | sort))
fi
if [[ ${#ASIDE_LIST[@]} -gt 0 ]]; then
  git diff --binary HEAD -- "${ASIDE_LIST[@]}" > "$ASIDE_PATCH"
  git checkout HEAD -- "${ASIDE_LIST[@]}"
  echo "   ├─ aside: ${#ASIDE_LIST[@]} local edit(s)"
fi

# put the aside edits back; name a patch that will not re-apply
restore_aside() {
  [[ ${#ASIDE_LIST[@]} -eq 0 ]] && return 0
  if git apply --3way "$ASIDE_PATCH" > /dev/null; then
    git reset -q -- "${ASIDE_LIST[@]}"
    rm -f "$ASIDE_PATCH"
    echo "   ├─ restored: ${#ASIDE_LIST[@]} local edit(s)"
    return 0
  fi
  echo "   ├─ ✋ ConstraintError: local edits did not re-apply; patch kept at $ASIDE_PATCH" | tee /dev/stderr
}

# merge, no commit: the commit goes through rhx git.commit.set, so the
# repo's commit hooks and the seaturtle attribution apply to it
MERGE_LOG="$(git rev-parse --absolute-git-dir)/merge.pr.$PR.log"
if git merge --no-ff --no-commit "origin/$HEAD_REF" > "$MERGE_LOG" 2> "$MERGE_LOG.err"; then
  restore_aside
  echo "   ├─ merged into the index; commit owed"
  echo "   └─ next: commit the staged merge, local edits left out"
  echo "      └─ echo \$MESSAGE | rhx git.commit.set -m @stdin --mode apply --unstaged ignore"
  exit 0
fi

# no merge in progress → git refused before it began
if ! git rev-parse --verify --quiet MERGE_HEAD > /dev/null; then
  restore_aside
  {
    echo "   ├─ ✋ ConstraintError: git refused to begin the merge; naught changed"
    echo "   │  └─ git said"
    while IFS= read -r line; do
      [[ -n "$line" ]] && echo "   │     ├─ $line"
    done < "$MERGE_LOG.err"
    echo "   └─ fix: rerun with --unstaged aside, or commit the named local edits"
  } | tee /dev/stderr
  exit 2
fi

CONFLICTS=$(git diff --name-only --diff-filter=U)
{
  echo "   ├─ ✋ ConstraintError: the merge stopped on conflicts"
  echo "   │  └─ paths"
  while IFS= read -r path; do
    [[ -n "$path" ]] && echo "   │     ├─ $path"
  done <<< "$CONFLICTS"
  [[ ${#ASIDE_LIST[@]} -gt 0 ]] && echo "   │  aside patch, re-apply after the commit: git apply --3way $ASIDE_PATCH"
  echo "   └─ fix: settle each path, stage it (rhx git.stage.add), then commit (rhx git.commit.set); or undo (rhx git.branch.merge.pr --abort)"
} | tee /dev/stderr
exit 2
