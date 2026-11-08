#!/usr/bin/env bash
######################################################################
# .what = shared domain operations for git.branch.catchup subcommands
#
# .why  = one source for merge state, tree state, and the merge commit,
#         so begin, take, lock, continue, and abort read the same truth
#
# usage:
#   source "$SKILL_DIR/git.branch.catchup.operations.sh"
#   if is_merge_in_flight; then ...
#
# .note = the caller sources its dependencies first: `git.commit/output.sh`
#         (emit_both, print_*) for every leaf; `git.commit.operations.sh`
#         (as_commit_message_with_sponsor, as_commit_uses_after_spend,
#         set_commit_meter_state) for the commit step alone
######################################################################

# the one source the verb catches up from
CATCHUP_SOURCE_REMOTE="origin"
CATCHUP_SOURCE_BRANCH="main"
CATCHUP_SOURCE_REF="$CATCHUP_SOURCE_REMOTE/$CATCHUP_SOURCE_BRANCH"

# the line that names how and from what, on --help and every plan
CATCHUP_HOW_LINE="catch up via merge (no rewrite) from $CATCHUP_SOURCE_REF"

# the most behind-commits a plan lists before it summarizes the rest
CATCHUP_PLAN_COMMITS_SHOWN=10

######################################################################
# .what = is a merge in flight?
# .why  = MERGE_HEAD is git's own record; a rev-parse reads it in a
#         worktree too, where `.git` is a file and no `.git/` path exists
######################################################################
is_merge_in_flight() {
  git rev-parse -q --verify MERGE_HEAD >/dev/null 2>&1
}

######################################################################
# .what = is a rebase in flight?
# .why  = `--git-path` resolves the per-worktree state dir
######################################################################
is_rebase_in_flight() {
  [[ -d "$(git rev-parse --git-path rebase-merge)" ]] && return 0
  [[ -d "$(git rev-parse --git-path rebase-apply)" ]] && return 0
  return 1
}

######################################################################
# .what = a git path list, NUL-separated, as one raw path per line
# .why  = without `-z`, git quotes a non-ASCII name (`"caf\303\251.md"`),
#         and no pathspec or MERGE_MSG name matches the quoted form
# usage: git diff --name-only -z | as_lines_from_nul
######################################################################
as_lines_from_nul() {
  tr '\0' '\n'
}

######################################################################
# .what = the files git holds in conflict, one raw path per line
######################################################################
get_conflict_files() {
  git diff --name-only -z --diff-filter=U 2>/dev/null | as_lines_from_nul
}

######################################################################
# .what = the files git holds in conflict, as shown to a human: each file
#         one side deleted carries a label that names which side
# .why  = a delete-versus-change conflict holds no markers, so a bare path
#         gives no cue which side to take; a hand stage would revive the file
# .note = git's stage 2 is HEAD (the branch), stage 3 is MERGE_HEAD (main);
#         the side with no stage deleted the file
######################################################################
get_conflict_files_shown() {
  git ls-files -u -z 2>/dev/null | as_lines_from_nul | awk '
    {
      tab = index($0, "\t")
      path = substr($0, tab + 1)
      split(substr($0, 1, tab - 1), meta, " ")
      if (!(path in seen)) { seen[path] = 1; order[++n] = path }
      stage[path, meta[3]] = 1
    }
    END {
      for (i = 1; i <= n; i++) {
        p = order[i]
        if (!((p, 2) in stage)) { print p " (deleted on the branch, changed on main)"; continue }
        if (!((p, 3) in stage)) { print p " (deleted on main, changed on the branch)"; continue }
        print p
      }
    }
  '
}

######################################################################
# .what = does any shown conflict line name a file one side deleted?
# usage: has_deleted_conflict shown="$CONFLICTS_SHOWN"
######################################################################
has_deleted_conflict() {
  local shown="" arg
  for arg in "$@"; do
    case "$arg" in shown=*) shown="${arg#shown=}" ;; esac
  done
  grep -qE ' \(deleted on (main|the branch), changed on (main|the branch)\)$' <<< "$shown"
}

######################################################################
# .what = does any conflict line name a lockfile?
# .why  = a lockfile is refreshed, never merged by hand (vision case=6)
# usage: has_lockfile_conflict shown="$CONFLICTS_SHOWN"
######################################################################
has_lockfile_conflict() {
  local shown="" arg
  for arg in "$@"; do
    case "$arg" in shown=*) shown="${arg#shown=}" ;; esac
  done
  grep -qE '(^|/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)( |$)' <<< "$shown"
}

######################################################################
# .what = does any conflict line name a file a hand edit settles?
# .why  = a lockfile is refreshed and a deleted file is taken, so neither
#         holds markers to remove; the hand-settle moves show only for the rest
# usage: has_text_conflict shown="$CONFLICTS_SHOWN"
######################################################################
has_text_conflict() {
  local shown="" arg
  for arg in "$@"; do
    case "$arg" in shown=*) shown="${arg#shown=}" ;; esac
  done
  grep -vE '(^|/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)( |$)' <<< "$shown" \
    | grep -vE ' \(deleted on (main|the branch), changed on (main|the branch)\)$' \
    | grep -q .
}

######################################################################
# .what = a PURE transformer: the lockfile paths among the conflict lines
# .why  = the next move names the lockfile the human already sees, so a
#         paste needs no placeholder filled
# usage: get_lockfile_conflicts shown="$CONFLICTS_SHOWN"
######################################################################
get_lockfile_conflicts() {
  local shown="" arg
  for arg in "$@"; do
    case "$arg" in shown=*) shown="${arg#shown=}" ;; esac
  done
  grep -oE '^([^ ]*/)?(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)( |$)' <<< "$shown" \
    | sed -E 's/ $//' || true
}

# the next-step line for a file one side deleted: no markers to edit, so
# the settle is a take; a hand stage of the file would revive it
CATCHUP_DELETED_ADVICE="a deleted file holds no markers; settle it with take"

# the hand-settle step before a stage: the same words begin, take, and continue show
CATCHUP_MARKERS_ADVICE="remove the <<<<<<< ======= >>>>>>> lines from each file"

######################################################################
# .what = the files the merge stopped on, one per line, settled or not
# .why  = git lists them in MERGE_MSG, under a `Conflicts:` line, each
#         behind the comment char and a tab
# .note = the comment char is whatever `core.commentChar` holds (`#` by
#         default, `;` or a word where set), so the read matches any
#         non-space prefix. a `#`-only read finds no file where it is set,
#         and the marker gate would then pass with no sound
######################################################################
get_stopped_conflict_files() {
  local merge_msg
  merge_msg=$(git rev-parse --git-path MERGE_MSG)
  [[ -f "$merge_msg" ]] || return 0
  sed -En '/^[^[:space:]]+ Conflicts:$/,$ s/^[^[:space:]]+\t//p' "$merge_msg"
}

######################################################################
# .what = the files that stopped the merge and are now settled, one per line
# .why  = git lists the files a merge stopped on in MERGE_MSG (`# Conflicts:`);
#         those no longer unmerged were settled by hand or by take, so an
#         abort that discards them must name each
######################################################################
get_settled_conflict_files() {
  local stopped
  stopped=$(get_stopped_conflict_files)
  [[ -n "$stopped" ]] || return 0

  local unmerged
  unmerged=$(get_conflict_files)
  if [[ -z "$unmerged" ]]; then
    echo "$stopped"
    return 0
  fi
  echo "$stopped" | grep -vxF -- "$unmerged" || true
}

######################################################################
# .what = the tracked files with work not yet committed, staged OR unstaged
# .why  = a merge commit would fold either kind into a commit no one
#         reviews. the rebase guard reads only unstaged; this reads both
######################################################################
get_uncommitted_files() {
  { git diff --name-only -z; git diff --cached --name-only -z; } 2>/dev/null \
    | as_lines_from_nul | sort -u
}

######################################################################
# .what = the untracked files at a path the source adds, one per line
# .why  = git refuses a merge that would overwrite an untracked file, and the
#         tracked-only dirty guard cannot see one. this names the collision
#         as a constraint the caller fixes, never a malfunction
######################################################################
#
# .note = a collision is a shared path or a file-versus-directory clash: an
#         untracked `a` blocks an added `a/b.txt`, and an untracked `x/y`
#         blocks an added `x`. both lists are root-relative (`:/`)
#
# .note = one pass: awk holds each added path and each of its ancestor dirs
#         in a set, then tests each untracked path and its own ancestors
#         against them. linear in the two lists, never their product
get_untracked_collision_files() {
  local added untracked
  added=$(git diff --name-only -z --no-renames --diff-filter=A "HEAD...$CATCHUP_SOURCE_REF" 2>/dev/null | as_lines_from_nul || true)
  untracked=$(git ls-files -z --others --exclude-standard --full-name -- ':/' 2>/dev/null | as_lines_from_nul || true)
  [[ -n "$added" && -n "$untracked" ]] || return 0

  awk '
    # pass 1: each added path, and each dir above it
    NR == FNR {
      if ($0 == "") next
      added[$0] = 1
      n = split($0, part, "/")
      dir = ""
      for (i = 1; i < n; i++) { dir = (i == 1) ? part[1] : dir "/" part[i]; above[dir] = 1 }
      next
    }
    # pass 2: an untracked path clashes if it is added, sits above an added
    # path, or sits below one
    {
      if ($0 == "") next
      if (($0 in added) || ($0 in above)) { print; next }
      n = split($0, part, "/")
      dir = ""
      for (i = 1; i < n; i++) {
        dir = (i == 1) ? part[1] : dir "/" part[i]
        if (dir in added) { print; next }
      }
    }
  ' <(printf '%s\n' "$added") <(printf '%s\n' "$untracked")
}

######################################################################
# .what = the current branch name ("HEAD" when detached)
######################################################################
get_current_branch() {
  git rev-parse --abbrev-ref HEAD 2>/dev/null
}

######################################################################
# .what = may the verb write to this branch?
# .why  = it never writes to main or master, and a detached HEAD has no
#         branch to catch up
# usage: is_branch_catchup_target branch="$BRANCH"
######################################################################
is_branch_catchup_target() {
  local branch="" arg
  for arg in "$@"; do
    case "$arg" in branch=*) branch="${arg#branch=}" ;; esac
  done
  [[ "$branch" == "main" || "$branch" == "master" || "$branch" == "HEAD" ]] && return 1
  return 0
}

######################################################################
# .what = commit counts between HEAD and the source
######################################################################
get_behind_count() {
  git rev-list --count "HEAD..$CATCHUP_SOURCE_REF" 2>/dev/null
}
get_ahead_count() {
  git rev-list --count "$CATCHUP_SOURCE_REF..HEAD" 2>/dev/null
}

######################################################################
# .what = the newest commits the source holds that HEAD lacks, as
#         "sha subject", at most `limit` of them
# .why  = git applies the limit, never a `| head`: under pipefail a reader
#         that closes early kills the writer with SIGPIPE
# usage: get_commits_behind limit=10
######################################################################
get_commits_behind() {
  local limit="" arg
  for arg in "$@"; do
    case "$arg" in limit=*) limit="${arg#limit=}" ;; esac
  done
  git log --oneline -n "$limit" "HEAD..$CATCHUP_SOURCE_REF" 2>/dev/null
}

######################################################################
# .what = a PURE transformer: the merge commit header for a branch
# .why  = `cont` is commitlint's type for progress within a pr; a scope
#         is required by rule.require.commit-scopes
# usage: as_catchup_commit_header branch="$BRANCH"
######################################################################
as_catchup_commit_header() {
  local branch="" arg
  for arg in "$@"; do
    case "$arg" in branch=*) branch="${arg#branch=}" ;; esac
  done
  echo "cont(branch): merge $CATCHUP_SOURCE_REF into $branch"
}

######################################################################
# .what = a PURE transformer: a count as words ("1 commit", "3 files")
# usage: as_count_phrase count="$BEHIND_COUNT" noun="commit"
######################################################################
as_count_phrase() {
  local count="" noun="" arg
  for arg in "$@"; do
    case "$arg" in
      count=*) count="${arg#count=}" ;;
      noun=*) noun="${arg#noun=}" ;;
    esac
  done
  if [[ "$count" -eq 1 ]]; then
    echo "1 $noun"
    return 0
  fi
  echo "$count ${noun}s"
}

######################################################################
# .what = the plan's list of commits behind: the newest few, then a tail
#         line that counts the rest
# usage: get_commits_behind_shown count="$BEHIND_COUNT"
######################################################################
get_commits_behind_shown() {
  local count="" arg
  for arg in "$@"; do
    case "$arg" in count=*) count="${arg#count=}" ;; esac
  done
  get_commits_behind limit="$CATCHUP_PLAN_COMMITS_SHOWN"
  if [[ "$count" -gt "$CATCHUP_PLAN_COMMITS_SHOWN" ]]; then
    echo "… and $((count - CATCHUP_PLAN_COMMITS_SHOWN)) more"
  fi
}

######################################################################
# .what = the files the merge stopped on that still hold a conflict marker
#         once staged, one per line
# .why  = `git add` on a file with `<<<<<<<` left in it clears its conflict
#         state, so the unmerged check alone would commit the markers.
#         `--check` also flags whitespace; only its marker lines count
# .note = only the files the merge stopped on count: a file main brought in
#         clean may hold marker-like lines (a doc on conflicts, a `=======`
#         underline) that the clone never touched and cannot fix
#
# .note = only a marker line that neither side holds counts: a line that
#         HEAD or MERGE_HEAD already carries (a `=======` underline kept in
#         a settle) is the file's own text, never a leftover of the merge
######################################################################
get_staged_conflict_marker_files() {
  local stopped
  stopped=$(get_stopped_conflict_files)

  # each flagged "file:line" in a stopped file
  local flagged
  flagged=$({ git -c core.quotePath=false diff --cached --check 2>/dev/null || true; } \
    | { grep -F 'leftover conflict marker' || true; } \
    | awk -F: -v OFS=: '{ line = $(NF - 1); NF = NF - 2; print $0, line }')
  [[ -n "$flagged" ]] || return 0

  # keep a file once any of its flagged lines is absent from both sides
  # .note = each blob is captured whole before a read: a `git show | grep -q`
  #         or `| awk exit` closes early on a large file, git dies of SIGPIPE,
  #         and pipefail turns a found line into a miss
  local entry file line text staged
  while IFS= read -r entry; do
    [[ -n "$entry" ]] || continue
    file="${entry%:*}"
    line="${entry##*:}"
    # a MERGE_MSG with no list scopes naught out: the gate fails closed
    [[ -z "$stopped" ]] || grep -Fxq -- "$file" <<< "$stopped" || continue
    staged=$(git show ":$file" 2>/dev/null || true)
    text=$(awk -v n="$line" 'NR == n { print }' <<< "$staged")
    is_line_on_either_side file="$file" text="$text" && continue
    echo "$file"
  done <<< "$flagged" | sort -u
}

######################################################################
# .what = does HEAD or MERGE_HEAD hold this exact line in this file?
# usage: is_line_on_either_side file="$FILE" text="$TEXT"
######################################################################
is_line_on_either_side() {
  local file="" text="" arg side blob
  for arg in "$@"; do
    case "$arg" in
      file=*) file="${arg#file=}" ;;
      text=*) text="${arg#text=}" ;;
    esac
  done
  # capture first: a pipe into `grep -q` would SIGPIPE git on a large blob
  for side in HEAD MERGE_HEAD; do
    blob=$(git show "$side:$file" 2>/dev/null || true)
    grep -Fxq -- "$text" <<< "$blob" && return 0
  done
  return 1
}

######################################################################
# .what = the staged files the merge did not carry in, one per line
# .why  = a merge commit no one reviews must hold only main's changes and
#         the clone's settles of them; a stray `git.stage.add .` would fold
#         unreviewed work into it (vision invariant 2)
# .note = a settle touches only a file main changed since the merge base,
#         so any other staged path is foreign to the catch-up
######################################################################
get_staged_files_foreign_to_merge() {
  local base brought staged
  base=$(git merge-base HEAD MERGE_HEAD 2>/dev/null) || return 0
  brought=$(git diff --name-only -z --no-renames "$base" MERGE_HEAD 2>/dev/null | as_lines_from_nul || true)
  staged=$(git diff --cached --name-only -z --no-renames 2>/dev/null | as_lines_from_nul || true)
  [[ -n "$staged" ]] || return 0
  if [[ -z "$brought" ]]; then
    echo "$staged"
    return 0
  fi
  grep -vxF -- "$brought" <<< "$staged" || true
}

######################################################################
# .what = the next-move branch for a file that awaits a stage, per the grant
# .why  = a clone whose stage is blocked needs the human grant named, under a
#         label that says a human runs it; never a `git.stage.add` it cannot run
# .note = prints at the next block's depth (`      ├─ `), as each caller draws
# usage: print_catchup_stage_advice stage="$STAGE_ALLOWED" label="settle each file:"
######################################################################
print_catchup_stage_advice() {
  local stage="" label="settle each file:" arg
  for arg in "$@"; do
    case "$arg" in
      stage=*) stage="${arg#stage=}" ;;
      label=*) label="${arg#label=}" ;;
    esac
  done
  if [[ "$stage" == "allow" ]]; then
    printf '      ├─ %-18s rhx git.stage.add <file>\n' "$label"
    return 0
  fi
  printf '      ├─ %-18s a human grants stage first\n' "$label"
  echo "      │  └─ a human runs: $CATCHUP_GRANT_STAGE_COMMAND"
}

######################################################################
# .what = the next-move menu for a merge stopped on conflicts
# .why  = begin and continue stop on the same state, so they name the same
#         moves in one shape: a label, then a command a human can paste
# usage: print_catchup_next_moves shown="$CONFLICTS_SHOWN" stage="$STAGE_ALLOWED"
######################################################################
print_catchup_next_moves() {
  local shown="" stage="" arg
  for arg in "$@"; do
    case "$arg" in
      shown=*) shown="${arg#shown=}" ;;
      stage=*) stage="${arg#stage=}" ;;
    esac
  done
  echo "   └─ next"

  # a lockfile is refreshed, never hand-merged: a take per lockfile, then one refresh
  if has_lockfile_conflict shown="$shown"; then
    echo "      ├─ a lockfile is refreshed, not merged"
    local lock
    while IFS= read -r lock; do
      [[ -z "$lock" ]] && continue
      echo "      │  ├─ rhx git.branch.catchup take --whos main $lock"
    done <<< "$(get_lockfile_conflicts shown="$shown")"
    echo "      │  └─ rhx git.branch.catchup lock refresh"
  fi
  if has_deleted_conflict shown="$shown"; then
    echo "      ├─ $CATCHUP_DELETED_ADVICE"
  fi
  if has_text_conflict shown="$shown"; then
    echo "      ├─ $CATCHUP_MARKERS_ADVICE"
    print_catchup_stage_advice stage="$stage"
  fi
  echo "      ├─ or take a side:    rhx git.branch.catchup take --whos <main|branch> <file>"
  echo "      ├─ then:              rhx git.branch.catchup continue"
  echo "      └─ or back out:       rhx git.branch.catchup abort"
}

######################################################################
# .what = a PURE transformer: the meter line a plan or result shows
# usage: as_catchup_meter_line uses="$USES" after="$USES_AFTER"   # after="" when none
######################################################################
as_catchup_meter_line() {
  local uses="" after="" arg
  for arg in "$@"; do
    case "$arg" in
      uses=*) uses="${arg#uses=}" ;;
      after=*) after="${arg#after=}" ;;
    esac
  done
  if [[ "$uses" == "infinite" ]]; then
    echo "left: unlimited"
    return 0
  fi
  if [[ -z "$after" ]]; then
    echo "left: $uses"
    return 0
  fi
  echo "left: $uses → $after"
}

######################################################################
# .what = print files as tree leaves under a prefix; the last closes
# usage: print_catchup_lines_tree prefix="   │  " files="$FILES"
######################################################################
print_catchup_lines_tree() {
  local prefix="" files="" arg
  for arg in "$@"; do
    case "$arg" in
      prefix=*) prefix="${arg#prefix=}" ;;
      files=*) files="${arg#files=}" ;;
    esac
  done
  local lines=()
  local line
  while IFS= read -r line; do
    [[ -n "$line" ]] && lines+=("$line")
  done <<< "$files"

  local count=${#lines[@]}
  local i
  for i in "${!lines[@]}"; do
    local glyph='├─'
    [[ $((i + 1)) -eq $count ]] && glyph='└─'
    echo "${prefix}${glyph} ${lines[$i]}"
  done
}

######################################################################
# .what = print a header-first constraint refusal to both streams
#
# .why  = the verb's own refusals open with their class
#         (rule.require.qualified-error-headers), then the tree
#
# usage: emit_catchup_constraint message="uncommitted changes in the tree" tree="$TREE"
######################################################################
emit_catchup_constraint() {
  local message="" tree="" arg
  for arg in "$@"; do
    case "$arg" in
      message=*) message="${arg#message=}" ;;
      tree=*) tree="${arg#tree=}" ;;
    esac
  done
  emit_both "✋ ConstraintError: $message

$tree"
}

######################################################################
# .what = print a header-first malfunction to both streams
# usage: emit_catchup_malfunction message="git merge --abort failed" tree="$TREE"
######################################################################
emit_catchup_malfunction() {
  local message="" tree="" arg
  for arg in "$@"; do
    case "$arg" in
      message=*) message="${arg#message=}" ;;
      tree=*) tree="${arg#tree=}" ;;
    esac
  done
  emit_both "💥 MalfunctionError: $message

$tree"
}

######################################################################
# .what = make the merge commit for a settled merge in flight, and spend
#         one commit use
#
# .why  = begin (clean merge) and continue (settled merge) share this one
#         path, so the two cannot drift on author, trailer, or meter
#
# .note = `git merge` takes no `--author`, so the merge runs with
#         `--no-commit` and this step commits it. with MERGE_HEAD set, a
#         plain `git commit` records both parents
#
# .sets  = CATCHUP_COMMIT_SHA, CATCHUP_USES_AFTER
#
# a failed `git commit` renders its malfunction here and exits 1; the merge
# stays in flight, so continue or abort recovers it
#
# usage: set_catchup_merge_commit label="$LABEL" branch="$BRANCH" \
#          robot_name="$ROBOT_NAME" robot_email="$ROBOT_EMAIL" \
#          sponsor_name="$SPONSOR_NAME" sponsor_email="$SPONSOR_EMAIL" \
#          state_file="$STATE_FILE"
######################################################################
set_catchup_merge_commit() {
  local label="" branch="" robot_name="" robot_email="" sponsor_name="" sponsor_email=""
  local state_file="" arg
  for arg in "$@"; do
    case "$arg" in
      label=*) label="${arg#label=}" ;;
      branch=*) branch="${arg#branch=}" ;;
      robot_name=*) robot_name="${arg#robot_name=}" ;;
      robot_email=*) robot_email="${arg#robot_email=}" ;;
      sponsor_name=*) sponsor_name="${arg#sponsor_name=}" ;;
      sponsor_email=*) sponsor_email="${arg#sponsor_email=}" ;;
      state_file=*) state_file="${arg#state_file=}" ;;
    esac
  done
  local message
  message=$(as_commit_message_with_sponsor \
    message="$(as_catchup_commit_header branch="$branch")" \
    sponsor_name="$sponsor_name" sponsor_email="$sponsor_email")

  # commit the merge; a failure leaves it in flight
  local err_file commit_err
  err_file=$(mktemp)
  if ! git commit \
    --author="$robot_name <$robot_email>" \
    --message="$message" \
    > /dev/null 2>"$err_file"; then
    commit_err=$(cat "$err_file")
    rm -f "$err_file"
    emit_catchup_malfunction message="git commit failed; the merge stays in flight" tree="$(
      print_tree_start "$label"
      echo "   ├─ cause"
      print_catchup_lines_tree prefix="   │  " files="$commit_err"
      echo "   └─ next"
      echo "      ├─ fix the cause above"
      echo "      ├─ then:              rhx git.branch.catchup continue"
      echo "      └─ or back out:       rhx git.branch.catchup abort"
    )"
    exit 1
  fi
  rm -f "$err_file"

  # spend one use, from a read taken now: a fetch and a merge sat between the
  # gate's read and this write, and a commit in that window spent its own use
  CATCHUP_COMMIT_SHA=$(git rev-parse --short HEAD)
  get_commit_quota_status file="$state_file"
  CATCHUP_USES_AFTER=$(as_commit_uses_after_spend uses="$USES")
  set_commit_meter_state file="$state_file" uses="$CATCHUP_USES_AFTER" \
    push="$PUSH_ALLOWED" stage="$STAGE_ALLOWED"
}

######################################################################
# .what = print the result tree of a committed merge, then the push nudge
# .note = a blocked push names the human grant, never a push it cannot run
# usage: print_catchup_committed label="$LABEL" merge_line="behind: 3 → 0" \
#          branch="$BRANCH" push="$PUSH_ALLOWED" \
#          sha="$CATCHUP_COMMIT_SHA" uses_after="$CATCHUP_USES_AFTER"
######################################################################
print_catchup_committed() {
  local label="" merge_line="" branch="" push="" sha="" uses_after="" arg
  for arg in "$@"; do
    case "$arg" in
      label=*) label="${arg#label=}" ;;
      merge_line=*) merge_line="${arg#merge_line=}" ;;
      branch=*) branch="${arg#branch=}" ;;
      push=*) push="${arg#push=}" ;;
      sha=*) sha="${arg#sha=}" ;;
      uses_after=*) uses_after="${arg#uses_after=}" ;;
    esac
  done

  print_turtle_header "righteous!"
  print_tree_start "$label"
  echo "   ├─ merge"
  echo "   │  ├─ from: $CATCHUP_SOURCE_REF"
  echo "   │  ├─ $merge_line"
  echo "   │  └─ status: committed"
  echo "   ├─ commit: $sha $(as_catchup_commit_header branch="$branch")"
  echo "   └─ meter"
  echo "      └─ $(as_catchup_meter_line uses="$uses_after" after="")"
  echo ""
  if [[ "$push" != "allow" ]]; then
    echo "🌊 committed; the push needs a human grant"
    echo "   └─ a human runs: $CATCHUP_GRANT_COMMAND"
    return 0
  fi
  echo "🌊 ready to push"
  echo "   └─ rhx git.commit.push --mode apply"
}

######################################################################
# .what = refuse a step that needs a merge in flight, when none is
# .why  = a step with no merge in flight refuses loud, never no-ops silent,
#         so a confused clone learns its state
# usage: refuse_if_no_merge_in_flight label="$LABEL"
######################################################################
refuse_if_no_merge_in_flight() {
  local label="" arg
  for arg in "$@"; do
    case "$arg" in label=*) label="${arg#label=}" ;; esac
  done
  is_merge_in_flight && return 0

  emit_catchup_constraint message="no merge in flight" tree="$(
    print_tree_start "$label"
    echo "   ├─ state: no catch-up merge is in flight"
    echo "   └─ fix: start one with rhx git.branch.catchup begin"
  )"
  exit 2
}

######################################################################
# .what = is the merge in flight a catch-up, of a commit the source holds?
# .why  = continue commits under the header "merge origin/main into …", so a
#         hand merge of another branch must never ride that header. an
#         ancestor test holds after a later fetch moves the source ahead
######################################################################
is_catchup_merge_in_flight() {
  is_merge_in_flight || return 1
  git merge-base --is-ancestor MERGE_HEAD "$CATCHUP_SOURCE_REF" 2>/dev/null
}

######################################################################
# .what = refuse a step that settles or commits a catch-up, unless the merge
#         in flight is one; a foreign merge is named, never committed
# usage: refuse_if_no_catchup_merge_in_flight label="$LABEL"
######################################################################
refuse_if_no_catchup_merge_in_flight() {
  local label="" arg
  for arg in "$@"; do
    case "$arg" in label=*) label="${arg#label=}" ;; esac
  done
  refuse_if_no_merge_in_flight label="$label"

  # never write to main, master, or a detached HEAD, in any step
  local branch
  branch=$(get_current_branch)
  if ! is_branch_catchup_target branch="$branch"; then
    emit_catchup_constraint message="will not catch up $branch" tree="$(
      print_tree_start "$label"
      echo "   ├─ branch: $branch"
      echo "   ├─ why: this verb levels a feature branch with main; it never writes to main or master"
      echo "   └─ fix: back the merge out with rhx git.branch.catchup abort, then run from your feature branch"
    )"
    exit 2
  fi

  is_catchup_merge_in_flight && return 0

  emit_catchup_constraint message="the merge in flight is not a catch-up from $CATCHUP_SOURCE_REF" tree="$(
    print_tree_start "$label"
    echo "   ├─ MERGE_HEAD: $(git rev-parse --short MERGE_HEAD) (not on $CATCHUP_SOURCE_REF)"
    echo "   ├─ why: this verb commits only a merge of $CATCHUP_SOURCE_REF"
    echo "   └─ fix: back it out with rhx git.branch.catchup abort, then begin"
  )"
  exit 2
}

######################################################################
# .what = the meter grant command a human runs, with stage when asked
######################################################################
CATCHUP_GRANT_COMMAND="rhx git.commit.uses set --quant N --push allow"
CATCHUP_GRANT_STAGE_COMMAND="rhx git.commit.uses set --quant N --push allow --stage allow"
