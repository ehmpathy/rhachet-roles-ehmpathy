#!/usr/bin/env bash
######################################################################
# .what = shared domain operations for git.repo.get skill
#
# .why  = single source of truth for repo discovery and access
#         separates domain logic from subcommand dispatch
#
# usage:
#   source "$SCRIPT_DIR/git.repo.get.operations.sh"
#   GIT_ROOT=$(get_git_root)
#   REPOS=$(get_all_local_repos)
#
# requires:
#   set -o pipefail in the sourcing shell
#
# .why = several error contracts here are LOAD-BEARING on pipefail. the
#        rethrows in run_git_grep only reach their callers because a
#        `matches=$(run_git_grep ... | sed ...) || fail_git_in_tree` sees
#        the grep's status rather than sed's. without pipefail, sed's 0
#        wins, the rethrow evaporates, and a broken search renders
#        "crickets... found: 0 matches" — the same output an honest empty
#        search gives. that is exactly the failhide those guards exist to
#        prevent, so the precondition is asserted rather than assumed:
#        a future caller that sources this file without pipefail (a test
#        harness, a second entrypoint) fails loudly at source time instead
#        of silently losing its error contracts.
######################################################################

# assert the precondition, at source time, before any contract depends on it
# .why = the render is echoed twice so it lands on BOTH stdout and stderr
#        (rule.require.skill-output-streams). the `| tee /dev/stderr` shorthand is
#        avoided on purpose: under piped stdio /dev/stderr is not always an
#        openable device, tee then errors "No such device", and the usual `|| true`
#        patch swallows genuine failures. two explicit echoes have neither problem
#        (the same lesson git.commit/output.sh emit_both records).
if [[ "$-" != *e* ]] || ! shopt -qo pipefail; then
  precondition_render="git.repo.get.operations.sh: requires 'set -eo pipefail' in the sourcing shell
  without it, the error rethrows in this file are silently lost"
  echo "$precondition_render"
  echo "$precondition_render" >&2
  return 1 2>/dev/null || exit 1
fi

######################################################################
# get_git_root — return root directory for local git clones
######################################################################
get_git_root() {
  echo "${GIT_REPO_ROOT:-$HOME/git}"
}

######################################################################
# parse_repo_slug — extract scope, org, repo from @scope/org/repo
# returns: scope org repo (space-separated)
######################################################################
parse_repo_slug() {
  local slug="$1"
  local scope="all"
  local org=""
  local repo=""

  # extract @scope if present
  if [[ "$slug" =~ ^@([^/]+)/(.*) ]]; then
    scope="${BASH_REMATCH[1]}"
    slug="${BASH_REMATCH[2]}"
  fi

  # extract org/repo
  if [[ "$slug" =~ ^([^/]+)/(.+)$ ]]; then
    org="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
  else
    # no org specified, treat as repo pattern in any org
    org="*"
    repo="$slug"
  fi

  echo "$scope $org $repo"
}

######################################################################
# get_all_local_repos — enumerate all local repo clones
# returns: list of org/repo slugs (one per line)
######################################################################
get_all_local_repos() {
  local git_root
  git_root=$(get_git_root)

  if [[ ! -d "$git_root" ]]; then
    return 0
  fi

  # find all .git directories at depth 2 (org/repo/.git)
  find "$git_root" -maxdepth 3 -name ".git" -type d 2>/dev/null | while read -r git_dir; do
    local repo_path="${git_dir%/.git}"
    local rel_path="${repo_path#$git_root/}"
    # only include if it's org/repo format (has exactly one slash)
    if [[ "$rel_path" =~ ^[^/]+/[^/]+$ ]]; then
      echo "$rel_path"
    fi
  done
}

######################################################################
# get_all_cloud_repos — enumerate repos from github org
# args: org name
# returns: list of org/repo slugs (one per line)
######################################################################
get_all_cloud_repos() {
  local org="$1"
  gh repo list "$org" --json nameWithOwner --jq '.[].nameWithOwner' 2>/dev/null || true
}

######################################################################
# refresh_local_repo — fetch latest from origin
# args: repo_path
# returns: 0 on success, non-zero on failure (failfast)
######################################################################
refresh_local_repo() {
  local repo_path="$1"

  # skip if refresh is off
  if [[ "${REFRESH:-on}" == "off" ]]; then
    return 0
  fi

  cd "$repo_path" || return 1

  # skip if no origin remote configured (e.g., test repos)
  if ! git remote get-url origin &>/dev/null; then
    return 0
  fi

  if ! git fetch origin --quiet 2>/dev/null; then
    echo "error: failed to fetch from origin" >&2
    echo "hint: use --refresh off to query stale local refs" >&2
    return 1
  fi
}

######################################################################
# lookup_repo — find repo (local-first, cloud fallback)
# args: org/repo slug
# returns: "local <path>" or "cloud <url>" or exits with error
######################################################################
lookup_repo() {
  local slug="$1"
  local git_root
  git_root=$(get_git_root)
  local local_path="$git_root/$slug"

  # try local first
  if [[ -d "$local_path/.git" ]]; then
    echo "local $local_path"
    return 0
  fi

  # try cloud
  local url
  url=$(gh repo view "$slug" --json url --jq '.url' 2>/dev/null || true)
  if [[ -n "$url" ]]; then
    echo "cloud $url"
    return 0
  fi

  # not found
  return 1
}

######################################################################
# get_default_branch — get default branch for a repo
# args: repo path (local) or slug (cloud)
# returns: branch name (e.g., "main" or "master")
######################################################################
get_default_branch() {
  local repo_path="$1"
  local is_local="$2"

  if [[ "$is_local" == "local" ]]; then
    # for local repos, check remote HEAD
    cd "$repo_path" || return 1
    git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main"
  else
    # for cloud repos, use gh api
    local slug="$1"
    gh repo view "$slug" --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo "main"
  fi
}

######################################################################
# fail_git_in_tree — a git command against a local tree failed
# args: what it tried to do, the path it tried it on
#
# .why = git already printed its own cause to stderr; this frames that
#        cause in the same turtle block every other failure here uses, so
#        a reader meets one shape whether the trouble was their argument
#        or the repo itself. a bare `echo ... >&2` in the middle of a
#        turtle-formatted skill reads as output from somewhere else.
#
# .why = it is called by the CALLER of the git operation, never by the
#        operation itself, because those operations run inside `$( )`.
#        in a command substitution this block's stdout half would be
#        captured as the return value and its `exit` would kill only the
#        subshell — so the caller would carry on with a turtle block as
#        its data. outside, both halves land where a human reads them.
######################################################################
fail_git_in_tree() {
  local attempt="$1"
  local path="$2"
  local repo_slug="${3:-}"

  # .why = `tree:` names the tree the CALLER asked for, exactly as it does in
  #        every other render here; the path git was run against gets its own
  #        `path:` label. they were one line, so `tree:` meant a NAME in four
  #        renders and an absolute PATH in this one — and in the worktree-list
  #        case that path is the REPO's, not the tree's, so the one label
  #        carried two senses and one of them was wrong
  #        (rule.forbid.ambiguous-labels).
  #
  # .why = `repo:` leads, because every neighbor --tree failure render
  #        (fail_tree_not_local, fail_tree_not_found) opens with it. without
  #        it a reader had to reverse-engineer the repo out of a raw worktree
  #        path like `short.vlad.feat-inflight` — the orientation line is
  #        present everywhere else in the same journey, so its absence read as
  #        a slip rather than a choice (rule.forbid.snapshot-visual-blemishes:
  #        same format across similar outputs).
  emit_both "$(
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get ${SUBCOMMAND:-<subcommand>}"
    [[ -n "$repo_slug" ]] && print_tree_branch "repo: $repo_slug (local)"
    [[ -n "${TREE_NAME:-}" ]] && print_tree_branch "tree: $TREE_NAME"
    print_tree_branch "path: $path"
    print_tree_error "could not $attempt this tree"
    print_coconut_hint \
      "git printed the cause just above; check the tree is intact" \
      "git -C $path status"
  )"
  exit 2
}

######################################################################
# get_all_worktrees — list worktrees of a repo
# args: repo_path
# returns: "<branch>|<path>" per line (branch empty when detached)
#
# .why = worktrees can live at ANY path (git worktree add <path>), even
#        outside $GIT_REPO_ROOT. so we always ask git, never guess by
#        a path pattern.
######################################################################
get_all_worktrees() {
  local repo_path="$1"

  # .why = a silenced git error here renders as "this repo has no worktrees",
  #        which is the same answer an honest single-clone repo gives. a
  #        corrupt repo or an unreadable dir would then surface downstream as
  #        `no worktree named "<x>"` — a message that sends the caller after
  #        a name problem they do not have. git's own message is surfaced and
  #        the failure is rethrown (rule.forbid.failhide).
  # .why = git's own message already reached stderr uncaptured, so the
  #        rethrow carries the status only. the turtle frame is emitted by
  #        the caller, which is not inside a command substitution
  local raw
  raw="$(git -C "$repo_path" worktree list --porcelain)" || return 1

  echo "$raw" | awk '
    /^worktree /  { wt = substr($0, 10) }
    /^branch /    { br = substr($0, 8); sub(/^refs\/heads\//, "", br) }
    /^$/          { if (wt != "") { print br "|" wt; wt = ""; br = "" } }
    END           { if (wt != "") print br "|" wt }
  '
}

######################################################################
# find_worktree_by_branch — full pass over the entries, branch name only
# args: entries tree_name
# returns: worktree path, or empty (exit 1) when no match
######################################################################
find_worktree_by_branch() {
  local entries="$1"
  local tree_name="$2"

  local branch wtpath
  while IFS='|' read -r branch wtpath; do
    [[ -z "$wtpath" ]] && continue
    if [[ -n "$branch" && "$branch" == "$tree_name" ]]; then
      echo "$wtpath"
      return 0
    fi
  done <<< "$entries"

  return 1
}

######################################################################
# find_worktree_by_dirname — full pass over the entries, dir name only
# args: entries tree_name
# returns: worktree path, or empty (exit 1) when no match
######################################################################
find_worktree_by_dirname() {
  local entries="$1"
  local tree_name="$2"

  local branch wtpath
  while IFS='|' read -r branch wtpath; do
    [[ -z "$wtpath" ]] && continue
    if [[ "$(basename "$wtpath")" == "$tree_name" ]]; then
      echo "$wtpath"
      return 0
    fi
  done <<< "$entries"

  return 1
}

######################################################################
# get_worktree_path — find a worktree of a repo by name
# args: repo_path tree_name
# returns: worktree path, or empty (exit 1) when no match
#
# .note = matches on branch name first, then on the worktree dir name,
#         so `--tree feat/auth` and `--tree repo.vlad.feat-auth` both work
#
# .why = the two matches run as two FULL passes, not interleaved per entry.
#        one loop that checked branch-then-basename on each entry in turn
#        would let an earlier worktree's DIR name beat a later worktree's
#        BRANCH name — the reverse of the priority stated just above, and a
#        silently wrong tree. every other ambiguity in this file refuses
#        rather than guesses; the priority here must at least be the one
#        the caller was promised
######################################################################
get_worktree_path() {
  local repo_path="$1"
  local tree_name="$2"

  # .why = the entries are taken up front rather than streamed through a
  #        process substitution, because `done < <(...)` discards the
  #        producer's exit status — a broken repo would read as "no worktree
  #        matched" and the caller would print a name error for a repo fault
  local entries
  entries="$(get_all_worktrees "$repo_path")" || return 2

  find_worktree_by_branch "$entries" "$tree_name" && return 0
  find_worktree_by_dirname "$entries" "$tree_name" && return 0

  return 1
}

######################################################################
# fail_path_escapes_tree — --paths reached outside the worktree
# args: subcommand repo_slug tree_name paths_glob
######################################################################
fail_path_escapes_tree() {
  local subcommand="$1"
  local repo_slug="$2"
  local tree_name="$3"
  local paths_glob="$4"

  emit_both "$(
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get $subcommand"
    print_tree_branch "repo: $repo_slug (local)"
    print_tree_branch "tree: $tree_name"
    print_tree_error "--paths resolves outside the worktree"
    echo ""
    echo "   \"$paths_glob\" walks out of the tree it was scoped to."
    echo "   git.repo.get reads repos, not the whole host filesystem."
    print_coconut_hint \
      "give a path relative to the repo root" \
      "rhx git.repo.get $subcommand --in $repo_slug --tree $tree_name --paths 'src/index.ts'"
  )"
  exit 2
}

######################################################################
# is_path_within_tree — does this --paths stay inside the worktree?
# args: worktree path, the --paths value
# returns: 0 when contained (allow), 1 when it escapes (block)
#
# .why = every OTHER content path resolves through git's own tree model
#        (`git show <ref>:<path>`, the github api, `ls-files`), which
#        cannot name a file outside the repo. the --tree read is a raw
#        filesystem read, so it must earn that same containment itself —
#        otherwise the skill the hook redirects EVERY cross-repo read to
#        becomes a way to read any path on the host.
#
# .how = `realpath -m` resolves `..` segments and symlinks without a
#        demand that the leaf exist, the same idiom the safe skills use
#        (cpsafe, mvsafe, rmsafe, teesafe, mkdirsafe).
######################################################################
is_path_within_tree() {
  local wtpath="$1"
  local candidate="$2"

  # an absolute --paths is never valid: --paths is repo-relative by contract.
  # rejected explicitly, because a naive join would silently swallow it into
  # the tree root and report "crickets" — a wrong input read as an empty
  # result (rule.forbid.surprises)
  [[ "$candidate" == /* ]] && return 1

  # .why = this is a security boundary, so it FAILS CLOSED. an earlier form
  #        fell back to the raw path when realpath could not expand it —
  #        which compared an unverified string and let the read through on
  #        the one input the check could not vouch for. a containment check
  #        that cannot verify must refuse, never assume.
  local root resolved
  root="$(realpath -m "$wtpath" 2>/dev/null)" || return 1
  resolved="$(realpath -m "$wtpath/$candidate" 2>/dev/null)" || return 1

  [[ -z "$root" || -z "$resolved" ]] && return 1
  [[ "$resolved" == "$root" || "$resolved" == "$root/"* ]] || return 1

  # .why = the vetted path is published so the read can use THE PATH THAT
  #        WAS CHECKED, rather than re-walk `$wtpath/$candidate` and hope it
  #        still means the same file. re-walked, a symlink swapped in after
  #        the check but before the read would be followed to wherever it
  #        now points — the check would have passed on one file and the read
  #        landed on another. resolved once, the read cannot drift from the
  #        decision (narrows the check-then-read race).
  TREE_PATH_VETTED="$resolved"
}

######################################################################
# fail_path_gitignored — --paths named a file git was told to ignore
# args: subcommand repo_slug tree_name paths_glob
######################################################################
fail_path_gitignored() {
  local subcommand="$1"
  local repo_slug="$2"
  local tree_name="$3"
  local paths_glob="$4"

  emit_both "$(
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get $subcommand"
    print_tree_branch "repo: $repo_slug (local)"
    print_tree_branch "tree: $tree_name"
    print_tree_error "--paths names a gitignored file"
    echo ""
    echo "   \"$paths_glob\" is ignored by that repo's .gitignore."
    echo "   git.repo.get serves a repo's source, not its local scratch"
    echo "   — build output, caches, and secret files stay unread."
    print_coconut_hint \
      "see what the tree does serve" \
      "rhx git.repo.get files --in $repo_slug --tree $tree_name"
  )"
  exit 2
}

######################################################################
# fail_path_unreadable_in_tree — --paths named a file we cannot read
# args: subcommand repo_slug tree_name paths_glob
######################################################################
fail_path_unreadable_in_tree() {
  local subcommand="$1"
  local repo_slug="$2"
  local tree_name="$3"
  local paths_glob="$4"

  emit_both "$(
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get $subcommand"
    print_tree_branch "repo: $repo_slug (local)"
    print_tree_branch "tree: $tree_name"
    print_tree_error "--paths named a file that tree cannot serve"
    echo ""
    echo "   \"$paths_glob\" is not a readable file in that tree."
    echo "   it may be absent, a directory, or unreadable to you."
    print_coconut_hint \
      "see what the tree does serve" \
      "rhx git.repo.get files --in $repo_slug --tree $tree_name"
  )"
  exit 2
}

######################################################################
# fail_path_binary_in_tree — --paths named a file that is not text
# args: subcommand repo_slug tree_name paths_glob
######################################################################
fail_path_binary_in_tree() {
  local subcommand="$1"
  local repo_slug="$2"
  local tree_name="$3"
  local paths_glob="$4"

  emit_both "$(
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get $subcommand"
    print_tree_branch "repo: $repo_slug (local)"
    print_tree_branch "tree: $tree_name"
    print_tree_error "--paths names a binary file"
    echo ""
    echo "   \"$paths_glob\" holds bytes that are not text."
    echo "   lines mode renders source, so it will not print raw bytes"
    echo "   at your terminal."
    print_coconut_hint \
      "the file list confirms it is there, without a byte of it on screen" \
      "rhx git.repo.get files --in $repo_slug --tree $tree_name --paths '$paths_glob'"
  )"
  exit 2
}

######################################################################
# is_file_binary — does this file hold bytes that are not text?
# args: absolute path to a readable file
# returns: 0 when binary (block), 1 when text (allow)
#
# .why = the --tree read is the ONE content path that reads raw bytes off
#        disk. every other path asks git, and git refuses binary content
#        on its own: `git show` is not reached in read mode, and `git grep`
#        answers "Binary file X matches" rather than print the bytes. so
#        read-through-tree is the sole mode that can hand a terminal a
#        stream of control bytes dressed as source lines.
#
# .why = worse than ugly, it is UNTRUE. the read is `content=$(cat ...)`,
#        and a command substitution silently drops every NUL byte — so the
#        render is not the file on disk, with no signal that bytes went
#        absent (rule.forbid.failhide). refused up front, the caller learns
#        the real fact instead of a doctored one.
#
# .how = a NUL byte in the first 8000 bytes, which is git's own test for
#        binary (buffer_is_binary). bash cannot hold a NUL in a variable,
#        so the probe compares the byte count before and after `tr -d`
#        rather than match the byte itself.
######################################################################
is_file_binary() {
  local file="$1"

  local bytes_raw bytes_sans_nul
  bytes_raw="$(head -c 8000 "$file" | wc -c)" || return 1
  bytes_sans_nul="$(head -c 8000 "$file" | LC_ALL=C tr -d '\000' | wc -c)" || return 1

  [[ "$bytes_raw" != "$bytes_sans_nul" ]]
}

######################################################################
# is_path_gitignored_in_tree — is this --paths ignored by the worktree?
# args: worktree path, the --paths value
# returns: 0 when ignored (block), 1 when served (allow)
#
# .why = the other two --tree modes already hide ignored files: the file
#        list passes --exclude-standard, and the search passes
#        --untracked, which honors .gitignore too. read mode is a raw
#        `cat`, so without this it alone would serve a peer repo's .env,
#        its build output, its local scratch — files the very same flag
#        reports as absent. one flag must mean one sense in all three
#        modes, or the quiet mode becomes the way around the other two.
######################################################################
is_path_gitignored_in_tree() {
  local wtpath="$1"
  local candidate="$2"

  git -C "$wtpath" check-ignore -q -- "$candidate" 2>/dev/null
}

######################################################################
# get_files_at_tree — list a worktree's files as they sit on disk
# args: worktree_path
# returns: list of file paths (one per line)
#
# .why = reads the worktree as it sits on disk, so uncommitted edits
#        are included. this is the "inflight" view.
#
# .note = --others adds files that are not in the index at all: a brand-new
#         file is the most inflight state there is, and a tracked-only list
#         would hide exactly the work the caller came to see.
# .note = --exclude-standard keeps .gitignore honored, so build output and
#         local scratch stay out.
# .note = LC_ALL=C makes the sort byte-ordered, which is how git itself
#         orders paths. without it locale collation reorders the output
#         (README.md after package.json) and a reader who compares --tree
#         output against --ref output would see a phantom diff.
######################################################################
get_files_at_tree() {
  local wtpath="$1"

  # .why = a silenced git error here reads as "this tree has no files", which
  #        is the same render a genuinely empty tree produces. an invalid
  #        worktree or an unreadable index would then look like a clean empty
  #        result. git's own message is surfaced and the failure is rethrown.
  # .why = git's own message already reached stderr uncaptured, so the
  #        rethrow carries the status only. the turtle frame is emitted by
  #        the caller, which is not inside a command substitution
  local out
  out="$(git -C "$wtpath" ls-files --cached --others --exclude-standard)" || return 1

  echo "$out" | LC_ALL=C sort -u
}

######################################################################
# run_git_grep — run a git grep, tolerate "no matches", rethrow errors
# args: the git grep args (after `git grep`)
# emits: the matched lines on stdout
#
# .why = git grep answers with THREE distinct exit codes, and a blanket
#        `|| true` flattens all three into one. 0 = matched, 1 = matched
#        nothing (an ordinary, expected answer), and >1 = a real failure
#        (a bad pattern, an unreadable index, a broken worktree). only
#        the 1 is benign. swallowed, a >1 renders as "crickets..." —
#        the same output an honest empty search produces — so a caller
#        reads a broken tree as a clean miss.
######################################################################
run_git_grep() {
  local out="" status=0
  out="$(git grep "$@")" || status=$?

  # 1 = no matches; an ordinary answer, not a failure.
  #
  # .why = git's own cause already reached stderr uncaptured, so the rethrow
  #        carries the status only. the turtle frame is emitted by the caller,
  #        which is not inside a command substitution
  [[ $status -gt 1 ]] && return "$status"

  echo "$out"
}

######################################################################
# get_files_at_ref — list files at a git ref (local)
# args: repo_path ref
# returns: list of file paths (one per line)
######################################################################
get_files_at_ref() {
  local repo_path="$1"
  local ref="$2"

  cd "$repo_path" || return 1
  git ls-tree -r --name-only "$ref" 2>/dev/null
}

######################################################################
# get_files_at_ref_cloud — list files from github api
# args: owner/repo ref
# returns: list of file paths (one per line)
######################################################################
get_files_at_ref_cloud() {
  local slug="$1"
  local ref="$2"

  gh api "repos/$slug/git/trees/$ref?recursive=1" \
    --jq '.tree[] | select(.type == "blob") | .path' 2>/dev/null
}

######################################################################
# search_lines — search for pattern in files (local)
# args: repo_path ref pattern
# returns: grep-style output with line numbers
######################################################################
search_lines() {
  local repo_path="$1"
  local ref="$2"
  local pattern="$3"

  cd "$repo_path" || return 1
  git grep -E -n "$pattern" "$ref" 2>/dev/null || true
}

######################################################################
# search_lines_cloud — search for pattern via github code search
# args: owner/repo pattern
# returns: list of matched files (limited - no line numbers)
# note: gh search code has rate limits (5/min) and no line context
######################################################################
search_lines_cloud() {
  local slug="$1"
  local pattern="$2"

  # gh search code returns files, not line matches
  # this is a limitation of the github code search api
  gh search code "$pattern" --repo "$slug" --json path --jq '.[].path' 2>/dev/null || true
}

######################################################################
# read_file — read file content at ref (local)
# args: repo_path ref file_path
# returns: file content
######################################################################
read_file() {
  local repo_path="$1"
  local ref="$2"
  local file_path="$3"

  cd "$repo_path" || return 1
  git show "$ref:$file_path" 2>/dev/null
}

######################################################################
# read_file_cloud — read file content from github api
# args: owner/repo ref file_path
# returns: file content (base64 decoded)
######################################################################
read_file_cloud() {
  local slug="$1"
  local ref="$2"
  local file_path="$3"

  # get content and decode base64
  gh api "repos/$slug/contents/$file_path?ref=$ref" \
    --jq '.content' 2>/dev/null | base64 -d 2>/dev/null
}

######################################################################
# print_tree_source_line — declare WHICH state the reader sees
# args: tree_path tree_name ref
#
# .why = the reader must never confuse inflight (uncommitted) state with
#        latest (origin/main). one line, always present, says which.
######################################################################
print_tree_source_line() {
  local tree_path="$1"
  local tree_name="$2"
  local ref="$3"

  if [[ -n "$tree_path" ]]; then
    print_tree_branch "tree: $tree_name (inflight)"
    return 0
  fi

  print_tree_branch "ref: $ref"
}

######################################################################
# print_tree_result_header — the four lines every result render opens with
# args: mood subcommand source tree_path ref
# reads: $REPO_SLUG, $TREE_NAME (globals, set once at parse time)
#
# .why = all six result renders (files empty/found, lines search
#        empty/found, lines read empty/found) opened with the SAME four
#        lines, hand-copied. the criteria lines that follow genuinely
#        differ per render — search names its radius, read names its
#        paths — so only the invariant opener is collected here. to fold
#        the divergent tail in too would need a flag per line, which
#        trades one duplication for a worse one.
#
# .why = the source line carries the most weight: it is what stops a
#        reader from confusion between inflight and latest. six copies
#        meant six chances for a future render to forget it. one cannot.
######################################################################
print_tree_result_header() {
  local mood="$1"
  local subcommand="$2"
  local source="$3"
  local tree_path="$4"
  local ref="$5"

  print_turtle_header "$mood"
  print_tree_start "git.repo.get $subcommand"
  print_tree_branch "repo: $REPO_SLUG ($source)"
  print_tree_source_line "$tree_path" "$TREE_NAME" "$ref"
}

######################################################################
# fail_tree_not_local — --tree asked for on a repo with no local clone
# args: subcommand repo_slug tree_name
######################################################################
fail_tree_not_local() {
  local subcommand="$1"
  local repo_slug="$2"
  local tree_name="$3"

  emit_both "$(
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get $subcommand"
    print_tree_branch "repo: $repo_slug (cloud)"
    # .why = echo the tree the caller asked for, as every neighbor --tree
    #        render does. this is the one --tree failure that had dropped it,
    #        so a reader hit a box shaped unlike its family and had to look
    #        back at their own command to recall the name
    print_tree_branch "tree: $tree_name"
    print_tree_error "--tree requires a local clone"
    print_coconut_hint \
      "worktrees only exist locally, so clone the repo first" \
      "gh repo clone $repo_slug $(get_git_root)/$repo_slug"
  )"
  exit 2
}

######################################################################
# fail_tree_not_found — --tree matched no worktree
# args: subcommand repo_slug repo_path tree_name
######################################################################
fail_tree_not_found() {
  local subcommand="$1"
  local repo_slug="$2"
  local repo_path="$3"
  local tree_name="$4"

  emit_both "$(
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get $subcommand"
    print_tree_branch "repo: $repo_slug (local)"
    # .why = echo the tree the caller asked for, as every other --tree render
    #        does. this is the one path where the name they typed is itself at
    #        fault, so it belongs next to the list of names that do exist — a
    #        reader compares the two without a scroll back to their own
    #        command (rule.require.errors-name-the-fix)
    print_tree_branch "tree: $tree_name"
    print_tree_error "no worktree named \"$tree_name\""
    echo ""
    echo "   worktrees found:"
    # .why = the enumeration is captured with its status BEFORE the loop, not
    #        fed through `done < <(...)`. a process substitution discards the
    #        producer's status, so a git that broke between the lookup and this
    #        render would print "(none)" beneath an error that blames the name
    #        the caller typed — a repo fault dressed as a caller-fixable typo.
    #        get_worktree_path avoids the same construct for the same reason;
    #        this render owes the caller the same honesty (rule.forbid.failhide)
    local worktrees_render worktrees_status=0
    worktrees_render=$(get_all_worktrees "$repo_path") || worktrees_status=$?

    local branch wtpath found=false
    if [[ $worktrees_status -ne 0 ]]; then
      echo "     (could not be listed — git failed to enumerate them)"
    else
      while IFS='|' read -r branch wtpath; do
        [[ -z "$wtpath" ]] && continue
        found=true
        echo "     - ${branch:-(detached)}  →  $wtpath"
      done <<< "$worktrees_render"
      if [[ "$found" == "false" ]]; then
        echo "     (none)"
      fi
    fi
    print_coconut_hint \
      "you can list the worktrees yourself" \
      "git -C $repo_path worktree list"
  )"
  exit 2
}

######################################################################
# fail_tree_conflict — --tree was combined with a flag it cannot join
# args: header_branch, error_line, affordance, then one or more commands
#
# .why = the three --tree conflicts render one shape: turtle header, a
#        context branch, the error, then the fix. they met the rule
#        of three, so they share one function rather than three copies.
#
# .why = it lives HERE, beside fail_tree_not_local and fail_tree_not_found,
#        because the three are one family and a family split across two
#        files means a future fix lands in one half. it sat in the CLI
#        entrypoint for one iteration with a comment that named this very
#        fix and did not take it (rule.prefer.most-common-denominator).
#
# .why = the fix arrives as an affordance plus commands, rather than as raw
#        lines on stdin. the heredoc form let each call site draw its own
#        block, so four call sites drew four shapes; routed through
#        print_coconut_hint they cannot drift (rule.require.coconut-hints).
######################################################################
fail_tree_conflict() {
  local header_branch="$1"
  local error_line="$2"
  local affordance="$3"
  shift 3

  emit_both "$(
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get ${SUBCOMMAND:-<subcommand>}"
    [[ -n "$header_branch" ]] && print_tree_branch "$header_branch"
    print_tree_branch "tree: $TREE_NAME"
    print_tree_error "$error_line"
    print_coconut_hint "$affordance" "$@"
  )"
  exit 2
}

######################################################################
# get_tree_path_or_fail — look up a --tree's path, or fail loud
# args: subcommand repo_slug source location tree_name
# sets: TREE_PATH_FOUND (global) to the worktree path
#
# .why = cmd_files and cmd_lines each need the same two guards before a
#        tree can be read — the repo must have a local clone, and the
#        named tree must exist in it — and both then fail through the
#        same two named failures. carried inline, that pair was one
#        orchestration copied verbatim in two places, so a fix to either
#        guard had to be applied twice or drift. the only thing that
#        differs between the callers is which subcommand name the error
#        prints, so it takes that as an arg.
#
# .why = it hands its answer back through a global rather than stdout,
#        because both of its failures print a turtle block and `exit 2`.
#        called in a command substitution, that block would be captured
#        as the return value and the `exit` would kill only the subshell
#        — the caller would sail on with an error message as its path.
######################################################################
get_tree_path_or_fail() {
  local subcommand="$1"
  local repo_slug="$2"
  local source="$3"
  local location="$4"
  local tree_name="$5"

  # worktrees are local-only, so a cloud-only repo cannot serve one
  if [[ "$source" != "local" ]]; then
    fail_tree_not_local "$subcommand" "$repo_slug" "$tree_name"
  fi

  local status=0
  TREE_PATH_FOUND=$(get_worktree_path "$location" "$tree_name") || status=$?

  # 2 = the enumeration itself failed, so this is a repo fault, not a name
  # one. git already surfaced its own cause; do not paper over it with "no
  # worktree named <x>", which would send the caller after the wrong cause
  [[ $status -eq 2 ]] && fail_git_in_tree "list the worktrees of" "$location" "$repo_slug"

  if [[ $status -ne 0 ]]; then
    fail_tree_not_found "$subcommand" "$repo_slug" "$location" "$tree_name"
  fi
}

######################################################################
# cmd_repos — enumerate repos subcommand
######################################################################
cmd_repos() {
  # default to */* if no --repos specified
  if [[ -z "$REPOS_GLOB" ]]; then
    REPOS_GLOB="*/*"
  fi

  # parse the glob pattern
  read -r scope org_pattern repo_pattern <<< "$(parse_repo_slug "$REPOS_GLOB")"

  local repos=()
  local sources=()

  # get local repos if scope allows
  if [[ "$scope" == "all" || "$scope" == "local" ]]; then
    while IFS= read -r slug; do
      [[ -z "$slug" ]] && continue
      # filter by pattern
      if [[ "$slug" == $org_pattern/$repo_pattern ]] || \
         [[ "$org_pattern" == "*" && "${slug#*/}" == $repo_pattern ]]; then
        repos+=("$slug")
        sources+=("local")
      fi
    done < <(get_all_local_repos)
  fi

  # get cloud repos if scope allows (and org is specific)
  if [[ "$scope" == "all" || "$scope" == "cloud" ]]; then
    if [[ "$org_pattern" != "*" ]]; then
      while IFS= read -r slug; do
        [[ -z "$slug" ]] && continue
        # check if not already in local list
        local already_local=false
        for extant in "${repos[@]:-}"; do
          if [[ "$extant" == "$slug" ]]; then
            already_local=true
            break
          fi
        done
        if ! $already_local; then
          # filter by repo pattern
          local repo_name="${slug#*/}"
          if [[ "$repo_name" == $repo_pattern ]]; then
            repos+=("$slug")
            sources+=("cloud")
          fi
        fi
      done < <(get_all_cloud_repos "$org_pattern")
    fi
  fi

  # sort repos alphabetically for deterministic output
  # create combined array for parallel sort, then split back
  local combined=()
  for i in "${!repos[@]}"; do
    combined+=("${repos[$i]}|${sources[$i]}")
  done
  IFS=$'\n' combined=($(printf '%s\n' "${combined[@]}" | sort))
  unset IFS

  # split back into repos and sources
  repos=()
  sources=()
  for entry in "${combined[@]}"; do
    repos+=("${entry%|*}")
    sources+=("${entry#*|}")
  done

  # output
  local count=${#repos[@]}
  if [[ $count -eq 0 ]]; then
    print_turtle_header "crickets..."
    print_tree_start "git.repo.get repos"
    print_tree_branch "repos: $REPOS_GLOB"
    echo "   │"
    print_tree_branch "found: 0 repos" true
  else
    print_turtle_header "far out"
    print_tree_start "git.repo.get repos"
    print_tree_branch "repos: $REPOS_GLOB"
    echo "   │"

    local git_root
    git_root=$(get_git_root)

    # calculate max repo name length for alignment
    local max_len=0
    for slug in "${repos[@]}"; do
      local repo="${slug#*/}"
      local len=${#repo}
      if (( len > max_len )); then
        max_len=$len
      fi
    done

    # group by org - first pass to count repos per org
    declare -A org_counts
    declare -A org_seen
    for slug in "${repos[@]}"; do
      local org="${slug%/*}"
      org_counts[$org]=$(( ${org_counts[$org]:-0} + 1 ))
    done

    # second pass to output with proper tree termination
    local current_org=""
    for i in "${!repos[@]}"; do
      local slug="${repos[$i]}"
      local source="${sources[$i]}"
      local org="${slug%/*}"
      local repo="${slug#*/}"

      if [[ "$org" != "$current_org" ]]; then
        if [[ -n "$current_org" ]]; then
          echo "   │"
        fi
        print_tree_branch "$org"
        current_org="$org"
        org_seen[$org]=0
      fi

      # increment seen count for this org
      org_seen[$org]=$(( ${org_seen[$org]} + 1 ))

      # determine if this is the last repo in this org
      local is_last_in_org=false
      if [[ ${org_seen[$org]} -eq ${org_counts[$org]} ]]; then
        is_last_in_org=true
      fi

      # pad repo name for alignment
      local pad_len=$(( max_len - ${#repo} + 2 ))
      local spaces
      spaces=$(printf '%*s' "$pad_len" '')

      # choose connector based on position
      local connector="├─"
      if $is_last_in_org; then
        connector="└─"
      fi

      if [[ "$source" == "local" ]]; then
        # display path with ~ instead of $HOME for readability
        local full_path="$git_root/$slug"
        local display_path
        display_path=$(echo "$full_path" | sed "s|^$HOME|~|")
        echo "   │  ${connector} ${repo}${spaces}${display_path} (local)"
      else
        echo "   │  ${connector} ${repo}${spaces}github.com/$slug (cloud)"
      fi
    done

    echo "   │"
    print_tree_branch "found: $count repos" true
  fi
}

######################################################################
# cmd_files_multi — list files across multiple repos
######################################################################
cmd_files_multi() {
  # parse the glob pattern
  read -r scope org_pattern repo_pattern <<< "$(parse_repo_slug "$REPOS_GLOB")"

  local repos=()
  local sources=()

  # get matched repos (same logic as cmd_repos)
  if [[ "$scope" == "all" || "$scope" == "local" ]]; then
    while IFS= read -r slug; do
      [[ -z "$slug" ]] && continue
      if [[ "$slug" == $org_pattern/$repo_pattern ]] || \
         [[ "$org_pattern" == "*" && "${slug#*/}" == $repo_pattern ]]; then
        repos+=("$slug")
        sources+=("local")
      fi
    done < <(get_all_local_repos)
  fi

  # sort repos alphabetically for deterministic output
  local combined=()
  for i in "${!repos[@]}"; do
    combined+=("${repos[$i]}|${sources[$i]}")
  done
  IFS=$'\n' combined=($(printf '%s\n' "${combined[@]}" | sort))
  unset IFS

  repos=()
  sources=()
  for entry in "${combined[@]}"; do
    repos+=("${entry%|*}")
    sources+=("${entry#*|}")
  done

  if [[ ${#repos[@]} -eq 0 ]]; then
    print_turtle_header "crickets..."
    print_tree_start "git.repo.get files"
    print_tree_branch "repos: $REPOS_GLOB"
    if [[ -n "$WORDS_PATTERN" ]]; then
      print_tree_branch "words: $WORDS_PATTERN"
    fi
    if [[ -n "$PATHS_GLOB" ]]; then
      print_tree_branch "paths: $PATHS_GLOB"
    fi
    echo "   │"
    print_tree_branch "found: 0 files" true
    return
  fi

  # search each repo for files
  local all_results=()
  local total_files=0
  local repos_with_files=0

  for i in "${!repos[@]}"; do
    local slug="${repos[$i]}"
    local source="${sources[$i]}"
    local git_root
    git_root=$(get_git_root)
    local location="$git_root/$slug"

    # .why = a fetch failure MUST be disclosed, never swallowed. the prior
    #        form (`2>/dev/null || continue`) dropped the repo from the run
    #        with no signal, which left the footer's `found: N` unable to be
    #        told apart from a complete search — a real failure absorbed into
    #        a success-shaped result (rule.forbid.failhide). the caller then
    #        reads "no matches in that repo" when the truth is "that repo was
    #        never checked", which is the same wrong-conclusion harm this
    #        whole behavior exists to prevent.
    #
    # .note = skip semantics are UNCHANGED — the repo is still omitted. the
    #         only addition is the disclosure, so no caller's results shift.
    if ! refresh_local_repo "$location" 2>/dev/null; then
      emit_both "   ⚠️  $slug — fetch failed; omitted from results (use --refresh off to search stale local refs)"
      continue
    fi

    # get ref
    local ref="$REF"
    if [[ -z "$ref" ]]; then
      ref="origin/$(get_default_branch "$location" "local")"
    fi

    # get files
    local files
    files=$(get_files_at_ref "$location" "$ref" 2>/dev/null) || continue

    # filter by paths if specified
    if [[ -n "$PATHS_GLOB" ]]; then
      files=$(echo "$files" | while IFS= read -r f; do
        # shellcheck disable=SC2053
        if [[ "$f" == $PATHS_GLOB ]]; then
          echo "$f"
        fi
      done)
    fi

    # filter by words if specified
    if [[ -n "$WORDS_PATTERN" ]]; then
      local found_files
      found_files=$(cd "$location" && git grep -E -l "$WORDS_PATTERN" "$ref" -- ${files:-} 2>/dev/null | sed "s|^$ref:||" || true)
      files="$found_files"
    fi

    # count and store results
    if [[ -n "$files" ]]; then
      local count
      count=$(echo "$files" | wc -l)
      total_files=$((total_files + count))
      repos_with_files=$((repos_with_files + 1))
      all_results+=("$slug|$source|$files")
    fi
  done

  # output
  if [[ $total_files -eq 0 ]]; then
    print_turtle_header "crickets..."
    print_tree_start "git.repo.get files"
    print_tree_branch "repos: $REPOS_GLOB"
    if [[ -n "$WORDS_PATTERN" ]]; then
      print_tree_branch "words: $WORDS_PATTERN"
    fi
    if [[ -n "$PATHS_GLOB" ]]; then
      print_tree_branch "paths: $PATHS_GLOB"
    fi
    echo "   │"
    print_tree_branch "found: 0 files" true
  else
    print_turtle_header "far out"
    print_tree_start "git.repo.get files"
    print_tree_branch "repos: $REPOS_GLOB"
    if [[ -n "$WORDS_PATTERN" ]]; then
      print_tree_branch "words: $WORDS_PATTERN"
    fi
    if [[ -n "$PATHS_GLOB" ]]; then
      print_tree_branch "paths: $PATHS_GLOB"
    fi
    echo "   │"

    # output results grouped by repo
    local num_results=${#all_results[@]}
    local repo_idx=0
    for result in "${all_results[@]}"; do
      repo_idx=$((repo_idx + 1))
      local is_last_repo=$([[ $repo_idx -eq $num_results ]] && echo true || echo false)

      local slug="${result%%|*}"
      local rest="${result#*|}"
      local source="${rest%%|*}"
      local files="${rest#*|}"

      local repo_connector="├─"
      local file_prefix="│  "
      if $is_last_repo; then
        repo_connector="├─"
        file_prefix="│  "
      fi

      echo "   ${repo_connector} $slug ($source)"

      # output files with proper termination
      local file_count
      file_count=$(echo "$files" | wc -l)
      local shown_count=$((file_count > 10 ? 10 : file_count))
      local file_idx=0

      echo "$files" | head -10 | while IFS= read -r f; do
        file_idx=$((file_idx + 1))
        local is_last_file=$([[ $file_idx -eq $shown_count && $file_count -le 10 ]] && echo true || echo false)
        local file_connector="├─"
        if $is_last_file; then
          file_connector="└─"
        fi
        echo "   ${file_prefix}${file_connector} $f"
      done

      if [[ $file_count -gt 10 ]]; then
        echo "   ${file_prefix}└─ ... $((file_count - 10)) more"
      fi
      echo "   │"
    done

    print_tree_branch "found: $total_files files in $repos_with_files repos" true
  fi
}

######################################################################
# cmd_files — list files subcommand
######################################################################
cmd_files() {
  # default to */* if --words specified but no --in or --repos
  if [[ -z "$REPO_SLUG" && -z "$REPOS_GLOB" && -n "$WORDS_PATTERN" ]]; then
    REPOS_GLOB="*/*"
  fi

  # multi-repo mode
  if [[ -n "$REPOS_GLOB" ]]; then
    cmd_files_multi
    return
  fi

  # single-repo mode requires --in
  if [[ -z "$REPO_SLUG" ]]; then
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get files"
    print_tree_error "--in flag is required"
    exit 2
  fi

  # lookup repo
  local lookup_result
  if ! lookup_result=$(lookup_repo "$REPO_SLUG"); then
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get files"
    print_tree_branch "repo: $REPO_SLUG"
    print_tree_error "repo not found"
    exit 2
  fi

  read -r source location <<< "$lookup_result"

  # handle --tree: read a local worktree's live files instead of origin/main
  local tree_path=""
  if [[ -n "$TREE_NAME" ]]; then
    get_tree_path_or_fail "files" "$REPO_SLUG" "$source" "$location" "$TREE_NAME"
    tree_path="$TREE_PATH_FOUND"
  fi

  # refresh local repo before query
  # .note = skipped for --tree; inflight state is local, no fetch needed
  if [[ "$source" == "local" && -z "$tree_path" ]]; then
    if ! refresh_local_repo "$location"; then
      print_turtle_header "bummer dude"
      print_tree_start "git.repo.get files"
      print_tree_branch "repo: $REPO_SLUG"
      print_tree_error "failed to fetch latest from origin"
      exit 1
    fi
  fi

  # determine ref
  local ref="$REF"
  if [[ -z "$ref" ]]; then
    if [[ "$source" == "local" ]]; then
      ref="origin/$(get_default_branch "$location" "local")"
    else
      ref="$(get_default_branch "$REPO_SLUG" "cloud")"
    fi
  fi

  # get files
  local files
  if [[ -n "$tree_path" ]]; then
    # .why = the callee already rethrows, but a bare `files=$(...)` would drop
    #        its exit status on the floor and carry on with an empty list —
    #        which renders "crickets...", the same output an honest empty tree
    #        gives. the rethrow only reaches the caller if the caller looks
    files=$(get_files_at_tree "$tree_path") \
      || fail_git_in_tree "list the files of" "$tree_path" "$REPO_SLUG"
  elif [[ "$source" == "local" ]]; then
    files=$(get_files_at_ref "$location" "$ref")
  else
    files=$(get_files_at_ref_cloud "$REPO_SLUG" "$ref")
  fi

  # filter by paths glob if specified
  if [[ -n "$PATHS_GLOB" ]]; then
    files=$(echo "$files" | while IFS= read -r f; do
      # shellcheck disable=SC2053
      if [[ "$f" == $PATHS_GLOB ]]; then
        echo "$f"
      fi
    done)
  fi

  # filter by words if specified (content search)
  if [[ -n "$WORDS_PATTERN" ]]; then
    local found_files
    if [[ -n "$tree_path" ]]; then
      # no ref => git grep searches the live worktree files on disk;
      # --untracked so a brand-new file is searched, not skipped
      found_files=$(cd "$tree_path" && run_git_grep -E -l --untracked "$WORDS_PATTERN" -- ${files:-}) \
        || fail_git_in_tree "search" "$tree_path" "$REPO_SLUG"
    elif [[ "$source" == "local" ]]; then
      found_files=$(cd "$location" && git grep -E -l "$WORDS_PATTERN" "$ref" -- ${files:-} 2>/dev/null | sed "s|^$ref:||" || true)
    else
      # cloud: use search_lines_cloud for files with content
      found_files=$(search_lines_cloud "$REPO_SLUG" "$WORDS_PATTERN")
      # intersect with path-filtered files if paths glob was specified
      if [[ -n "$PATHS_GLOB" && -n "$files" ]]; then
        found_files=$(comm -12 <(echo "$files" | sort) <(echo "$found_files" | sort) 2>/dev/null || true)
      fi
    fi
    files="$found_files"
  fi

  # count files
  local count=0
  if [[ -n "$files" ]]; then
    count=$(echo "$files" | wc -l)
  fi

  # the preamble is the same either way — only the mood differs
  #
  # .why = the empty and found renders were two copies of one block that
  #        agreed on every line but the greeting. a criteria line added to
  #        one and forgotten in the other would have made the two renders
  #        disagree about what was even asked for
  local mood="far out"
  if [[ $count -eq 0 ]]; then
    mood="crickets..."
  fi

  print_tree_result_header "$mood" "files" "$source" "$tree_path" "$ref"
  if [[ -n "$PATHS_GLOB" ]]; then
    print_tree_branch "paths: $PATHS_GLOB"
  fi
  if [[ -n "$WORDS_PATTERN" ]]; then
    print_tree_branch "words: $WORDS_PATTERN"
  fi
  echo "   │"

  # none matched — the count line is the whole answer
  if [[ $count -eq 0 ]]; then
    print_tree_branch "found: 0 files" true
    return 0
  fi

  # show files (simple list for now)
  echo "$files" | head -20 | while IFS= read -r f; do
    echo "   ├─ $f"
  done

  if [[ $count -gt 20 ]]; then
    echo "   ├─ ... $((count - 20)) more"
  fi

  echo "   │"
  print_tree_branch "found: $count files" true
}

######################################################################
# cmd_lines_multi — search lines across multiple repos
######################################################################
cmd_lines_multi() {
  # multi-repo search requires --words
  if [[ -z "$WORDS_PATTERN" ]]; then
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get lines"
    print_tree_branch "repos: $REPOS_GLOB"
    print_tree_error "--words is required for multi-repo search"
    exit 2
  fi

  # parse the glob pattern
  read -r scope org_pattern repo_pattern <<< "$(parse_repo_slug "$REPOS_GLOB")"

  local repos=()
  local sources=()

  # get matched repos
  if [[ "$scope" == "all" || "$scope" == "local" ]]; then
    while IFS= read -r slug; do
      [[ -z "$slug" ]] && continue
      if [[ "$slug" == $org_pattern/$repo_pattern ]] || \
         [[ "$org_pattern" == "*" && "${slug#*/}" == $repo_pattern ]]; then
        repos+=("$slug")
        sources+=("local")
      fi
    done < <(get_all_local_repos)
  fi

  # sort repos alphabetically for deterministic output
  local combined=()
  for i in "${!repos[@]}"; do
    combined+=("${repos[$i]}|${sources[$i]}")
  done
  IFS=$'\n' combined=($(printf '%s\n' "${combined[@]}" | sort))
  unset IFS

  repos=()
  sources=()
  for entry in "${combined[@]}"; do
    repos+=("${entry%|*}")
    sources+=("${entry#*|}")
  done

  if [[ ${#repos[@]} -eq 0 ]]; then
    print_turtle_header "crickets..."
    print_tree_start "git.repo.get lines"
    print_tree_branch "repos: $REPOS_GLOB"
    print_tree_branch "words: $WORDS_PATTERN"
    if [[ -n "$PATHS_GLOB" ]]; then
      print_tree_branch "paths: $PATHS_GLOB"
    fi
    echo "   │"
    print_tree_branch "found: 0 matches" true
    return
  fi

  # search each repo
  local all_results=()
  local total_matches=0
  local repos_with_matches=0

  for i in "${!repos[@]}"; do
    local slug="${repos[$i]}"
    local source="${sources[$i]}"
    local git_root
    git_root=$(get_git_root)
    local location="$git_root/$slug"

    # .why = a fetch failure MUST be disclosed, never swallowed. the prior
    #        form (`2>/dev/null || continue`) dropped the repo from the run
    #        with no signal, which left the footer's `found: N` unable to be
    #        told apart from a complete search — a real failure absorbed into
    #        a success-shaped result (rule.forbid.failhide). the caller then
    #        reads "no matches in that repo" when the truth is "that repo was
    #        never checked", which is the same wrong-conclusion harm this
    #        whole behavior exists to prevent.
    #
    # .note = skip semantics are UNCHANGED — the repo is still omitted. the
    #         only addition is the disclosure, so no caller's results shift.
    if ! refresh_local_repo "$location" 2>/dev/null; then
      emit_both "   ⚠️  $slug — fetch failed; omitted from results (use --refresh off to search stale local refs)"
      continue
    fi

    # get ref
    local ref="$REF"
    if [[ -z "$ref" ]]; then
      ref="origin/$(get_default_branch "$location" "local")"
    fi

    # search
    cd "$location" || continue
    local grep_args=(-E -n "$WORDS_PATTERN" "$ref")
    if [[ -n "$PATHS_GLOB" ]]; then
      grep_args+=(-- "$PATHS_GLOB")
    fi
    local matches
    matches=$(git grep "${grep_args[@]}" 2>/dev/null || true)

    if [[ -n "$matches" ]]; then
      local count
      count=$(echo "$matches" | wc -l)
      total_matches=$((total_matches + count))
      repos_with_matches=$((repos_with_matches + 1))
      all_results+=("$slug|$source|$ref|$matches")
    fi
  done

  # output
  if [[ $total_matches -eq 0 ]]; then
    print_turtle_header "crickets..."
    print_tree_start "git.repo.get lines"
    print_tree_branch "repos: $REPOS_GLOB"
    print_tree_branch "words: $WORDS_PATTERN"
    if [[ -n "$PATHS_GLOB" ]]; then
      print_tree_branch "paths: $PATHS_GLOB"
    fi
    echo "   │"
    print_tree_branch "found: 0 matches" true
  else
    print_turtle_header "far out"
    print_tree_start "git.repo.get lines"
    print_tree_branch "repos: $REPOS_GLOB"
    print_tree_branch "words: $WORDS_PATTERN"
    if [[ -n "$PATHS_GLOB" ]]; then
      print_tree_branch "paths: $PATHS_GLOB"
    fi
    echo "   │"

    # output results grouped by repo
    local num_results=${#all_results[@]}
    local repo_idx=0
    for result in "${all_results[@]}"; do
      repo_idx=$((repo_idx + 1))

      local slug="${result%%|*}"
      local rest="${result#*|}"
      local source="${rest%%|*}"
      rest="${rest#*|}"
      local ref="${rest%%|*}"
      local matches="${rest#*|}"

      local repo_count
      repo_count=$(echo "$matches" | wc -l)
      echo "   ├─ $slug ($source) — $repo_count matches"

      # collect unique files and their line counts
      local files_in_repo
      files_in_repo=$(echo "$matches" | head -20 | while IFS= read -r line; do
        local file_and_line="${line#$ref:}"
        echo "${file_and_line%%:*}"
      done | uniq)

      local num_files
      num_files=$(echo "$files_in_repo" | wc -l)
      local file_idx=0

      # group by file within repo
      local current_file=""
      echo "$matches" | head -20 | while IFS= read -r line; do
        local file_and_line="${line#$ref:}"
        local file="${file_and_line%%:*}"
        local rest="${file_and_line#*:}"
        local linenum="${rest%%:*}"
        local content="${rest#*:}"

        if [[ "$file" != "$current_file" ]]; then
          file_idx=$((file_idx + 1))
          local is_last_file=$([[ $file_idx -eq $num_files && $repo_count -le 20 ]] && echo true || echo false)
          local file_connector="├─"
          if $is_last_file; then
            file_connector="└─"
          fi
          if [[ -n "$current_file" ]]; then
            echo "   │  │"
          fi
          echo "   │  ${file_connector} $file"
          current_file="$file"
        fi
        printf "   │  │  > %4d: %s\n" "$linenum" "$content"
      done

      if [[ $repo_count -gt 20 ]]; then
        echo "   │  │"
        echo "   │  └─ ... $((repo_count - 20)) more matches"
      fi
      echo "   │"
    done

    print_tree_branch "found: $total_matches matches in $repos_with_matches repos" true
  fi
}

######################################################################
# cmd_lines — search or read lines subcommand
######################################################################
cmd_lines() {
  # default to */* if --words specified but no --in or --repos
  if [[ -z "$REPO_SLUG" && -z "$REPOS_GLOB" && -n "$WORDS_PATTERN" ]]; then
    REPOS_GLOB="*/*"
  fi

  # multi-repo mode
  if [[ -n "$REPOS_GLOB" ]]; then
    cmd_lines_multi
    return
  fi

  # single-repo mode requires --in
  if [[ -z "$REPO_SLUG" ]]; then
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get lines"
    print_tree_error "--in or --repos flag is required"
    exit 2
  fi

  # lookup repo
  local lookup_result
  if ! lookup_result=$(lookup_repo "$REPO_SLUG"); then
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get lines"
    print_tree_branch "repo: $REPO_SLUG"
    print_tree_error "repo not found"
    local org="${REPO_SLUG%/*}"
    print_coconut_hint \
      "you can search the whole org instead" \
      "rhx git.repo.get lines --repos '$org/*' --words 'pattern'"
    exit 2
  fi

  read -r source location <<< "$lookup_result"

  # handle --tree: read a local worktree's live files instead of origin/main
  local tree_path=""
  if [[ -n "$TREE_NAME" ]]; then
    get_tree_path_or_fail "lines" "$REPO_SLUG" "$source" "$location" "$TREE_NAME"
    tree_path="$TREE_PATH_FOUND"
  fi

  # refresh local repo before query
  # .note = skipped for --tree; inflight state is local, no fetch needed
  if [[ "$source" == "local" && -z "$tree_path" ]]; then
    if ! refresh_local_repo "$location"; then
      print_turtle_header "bummer dude"
      print_tree_start "git.repo.get lines"
      print_tree_branch "repo: $REPO_SLUG"
      print_tree_error "failed to fetch latest from origin"
      exit 1
    fi
  fi

  # determine ref
  local ref="$REF"
  if [[ -z "$ref" ]]; then
    if [[ "$source" == "local" ]]; then
      ref="origin/$(get_default_branch "$location" "local")"
    else
      ref="$(get_default_branch "$REPO_SLUG" "cloud")"
    fi
  fi

  # search mode vs read mode
  if [[ -n "$WORDS_PATTERN" ]]; then
    # search mode
    local matches

    if [[ -n "$tree_path" ]]; then
      cd "$tree_path" || exit 2

      # no ref => git grep searches the live worktree files on disk.
      # --untracked reaches brand-new files too (still .gitignore-honored),
      # so the search sees the same set `files --tree` lists.
      # output is file:line:content (no ref prefix), so prefix it with the
      # ref-shaped sentinel the parser below strips uniformly.
      local grep_args=(-E -n --untracked "$WORDS_PATTERN")
      if [[ -n "$PATHS_GLOB" ]]; then
        grep_args+=(-- "$PATHS_GLOB")
      fi

      matches=$(run_git_grep "${grep_args[@]}" | sed "s|^|$ref:|") \
        || fail_git_in_tree "search" "$tree_path" "$REPO_SLUG"
    elif [[ "$source" == "local" ]]; then
      cd "$location" || exit 2

      # build git grep command
      local grep_args=(-E -n "$WORDS_PATTERN" "$ref")
      if [[ -n "$PATHS_GLOB" ]]; then
        grep_args+=(-- "$PATHS_GLOB")
      fi

      matches=$(git grep "${grep_args[@]}" 2>/dev/null || true)
    else
      # cloud search: limited to file list (no line numbers from github api)
      # get files that match, then show content for each
      local matched_files
      matched_files=$(search_lines_cloud "$REPO_SLUG" "$WORDS_PATTERN")

      # filter by paths glob if specified
      if [[ -n "$PATHS_GLOB" && -n "$matched_files" ]]; then
        matched_files=$(echo "$matched_files" | while IFS= read -r f; do
          # shellcheck disable=SC2053
          if [[ "$f" == $PATHS_GLOB ]]; then
            echo "$f"
          fi
        done)
      fi

      # for each file, fetch content and grep locally for line numbers
      matches=""
      while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        local content
        content=$(read_file_cloud "$REPO_SLUG" "$ref" "$file" 2>/dev/null || true)
        if [[ -n "$content" ]]; then
          # grep content for line numbers
          local file_matches
          file_matches=$(echo "$content" | grep -E -n "$WORDS_PATTERN" 2>/dev/null | while IFS=: read -r linenum line_content; do
            echo "$ref:$file:$linenum:$line_content"
          done || true)
          if [[ -n "$file_matches" ]]; then
            if [[ -n "$matches" ]]; then
              matches="$matches"$'\n'"$file_matches"
            else
              matches="$file_matches"
            fi
          fi
        fi
      done <<< "$matched_files"
    fi

    # .note = unlike the files and read renders, these two tails do NOT
    #         agree: the found render names its radius, and the empty one
    #         has no context to report a radius for. so the opener is
    #         shared and the criteria stay per branch
    if [[ -z "$matches" ]]; then
      print_tree_result_header "crickets..." "lines" "$source" "$tree_path" "$ref"
      print_tree_branch "words: $WORDS_PATTERN"
      if [[ -n "$PATHS_GLOB" ]]; then
        print_tree_branch "paths: $PATHS_GLOB"
      fi
      echo "   │"
      print_tree_branch "found: 0 matches" true
    else
      local match_count
      match_count=$(echo "$matches" | wc -l)

      print_tree_result_header "far out" "lines" "$source" "$tree_path" "$ref"
      print_tree_branch "words: $WORDS_PATTERN"
      print_tree_branch "radius: $RADIUS"
      if [[ -n "$PATHS_GLOB" ]]; then
        print_tree_branch "paths: $PATHS_GLOB"
      fi
      echo "   │"

      # group by file and show with context
      local current_file=""
      echo "$matches" | while IFS= read -r line; do
        # parse ref:file:linenum:content
        local file_and_line="${line#$ref:}"
        local file="${file_and_line%%:*}"
        local rest="${file_and_line#*:}"
        local linenum="${rest%%:*}"
        local content="${rest#*:}"

        if [[ "$file" != "$current_file" ]]; then
          if [[ -n "$current_file" ]]; then
            echo "   │  └─"
            echo "   │"
          fi
          echo "   ├─ $file"
          echo "   │  ├─"
          current_file="$file"
        fi

        # show match with > prefix
        printf "   │  │ > %4d: %s\n" "$linenum" "$content"
      done

      echo "   │  └─"
      echo "   │"
      print_tree_branch "found: $match_count matches" true
    fi
  else
    # read mode - need a specific file
    if [[ -z "$PATHS_GLOB" ]]; then
      print_turtle_header "bummer dude"
      print_tree_start "git.repo.get lines"
      print_tree_branch "repo: $REPO_SLUG ($source)"
      print_tree_error "--paths is required for read mode (no --words)"
      exit 2
    fi

    # read the file
    local content
    if [[ -n "$tree_path" ]]; then
      # a raw filesystem read must prove containment first — the other
      # source paths get it free from git's tree model
      if ! is_path_within_tree "$tree_path" "$PATHS_GLOB"; then
        fail_path_escapes_tree "lines" "$REPO_SLUG" "$TREE_NAME" "$PATHS_GLOB"
      fi

      # and it must honor .gitignore, exactly as the file list and the
      # search already do — otherwise read mode alone serves the scratch
      # the other two modes report as absent
      if is_path_gitignored_in_tree "$tree_path" "$PATHS_GLOB"; then
        fail_path_gitignored "lines" "$REPO_SLUG" "$TREE_NAME" "$PATHS_GLOB"
      fi

      # .why = a `|| true` here would turn an unreadable file into an empty
      #        read, which then prints "crickets — found: 0 files". that is a
      #        failure disguised as a clean empty result. a ref-based read can
      #        fairly report empty (the path is simply not in that ref), but a
      #        filesystem read knows the difference and must say so.
      # .note = from here the VETTED path is used, not `$tree_path/$PATHS_GLOB`
      #         re-joined. the containment check resolved it once; to re-walk
      #         the raw join would re-follow any symlink, so the check and the
      #         read could land on two different files
      if [[ ! -f "$TREE_PATH_VETTED" || ! -r "$TREE_PATH_VETTED" ]]; then
        fail_path_unreadable_in_tree "lines" "$REPO_SLUG" "$TREE_NAME" "$PATHS_GLOB"
      fi

      # and it must be text. the `cat` below runs inside a command
      # substitution, which drops NUL bytes — so a binary read would render
      # a file that differs from the one on disk, with no signal
      if is_file_binary "$TREE_PATH_VETTED"; then
        fail_path_binary_in_tree "lines" "$REPO_SLUG" "$TREE_NAME" "$PATHS_GLOB"
      fi

      # read the live file on disk, so uncommitted edits are included
      content=$(cat "$TREE_PATH_VETTED")
    elif [[ "$source" == "local" ]]; then
      cd "$location" || exit 2
      content=$(git show "$ref:$PATHS_GLOB" 2>/dev/null) || true
    else
      content=$(read_file_cloud "$REPO_SLUG" "$ref" "$PATHS_GLOB" 2>/dev/null) || true
    fi

    # .why = a --tree read that got this far has already proven the file is
    #        present and readable, so empty content means an empty FILE — not a
    #        miss. to render it as "crickets — found: 0 files" would dress a
    #        found file as an absent one: the same costume rule.forbid.failhide
    #        strips off broken reads, worn here by a legitimate empty source
    #        file. the ref-based paths keep the miss render, because for them
    #        empty and absent are genuinely one answer — git yields an empty
    #        read for a path that is not in the ref at all.
    if [[ -z "$content" && -n "$tree_path" ]]; then
      print_tree_result_header "far out" "lines" "$source" "$tree_path" "$ref"
      print_tree_branch "paths: $PATHS_GLOB"
      echo "   │"
      echo "   ├─ $PATHS_GLOB (0 lines — the file is empty)"
      echo "   │"
      print_tree_branch "found: 1 file" true
      exit 0
    fi

    if [[ -z "$content" ]]; then
      print_tree_result_header "crickets..." "lines" "$source" "$tree_path" "$ref"
      print_tree_branch "paths: $PATHS_GLOB"
      echo "   │"
      print_tree_branch "found: 0 files" true
      exit 0
    fi

    local line_count
    line_count=$(echo "$content" | wc -l)

    print_tree_result_header "far out" "lines" "$source" "$tree_path" "$ref"
    print_tree_branch "paths: $PATHS_GLOB"
    echo "   │"
    echo "   ├─ $PATHS_GLOB ($line_count lines)"
    echo "   │  ├─"

    # show content with line numbers
    local linenum=1
    echo "$content" | while IFS= read -r line; do
      printf "   │  │  %4d: %s\n" "$linenum" "$line"
      linenum=$((linenum + 1))
    done

    echo "   │  └─"
    echo "   │"
    print_tree_branch "found: 1 file" true
  fi
}
