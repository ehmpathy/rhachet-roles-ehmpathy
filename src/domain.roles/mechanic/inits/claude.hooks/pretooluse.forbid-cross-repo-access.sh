#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook to block adhoc access to OTHER repos under
#         $GIT_REPO_ROOT (default ~/git), redirect to git.repo.get
#
# .why  = a peer repo's clone holds whatever happens to be checked out
#         there: a stale branch, a dirty tree, a half-finished edit.
#         read it directly and you reason about code that does not match
#         origin/main — silently, with no signal you were wrong.
#
#         git.repo.get fetches origin and reads origin/main, so callers
#         are guaranteed the latest. this hook closes the only bypass.
#
# .how  = reads JSON from stdin, extracts the target path(s) for the
#         tool, and blocks when a path lands under $GIT_REPO_ROOT but
#         outside the current repo.
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#
# blind spot (accepted, stated plainly):
#   `git worktree add` can place a worktree at ANY path, even outside
#   $GIT_REPO_ROOT. only paths under the root are gated, so a worktree
#   placed outside it is not seen here. that is out of scope: the wish
#   targets reaches across the ~/git repo collection, not any arbitrary
#   path on disk.
#
# guarantee:
#   - allows any path inside the current repo (incl. its worktree)
#   - blocks Read/Edit/Write/Grep/Glob into another repo under the root
#   - blocks Bash commands that name another repo's path
#   - every block names the exact git.repo.get command to run instead
######################################################################

set -uo pipefail

# .what = write a line to both stdout and stderr
# .why  = failure output must land on both streams (rule.require.skill-output-streams).
#         tee /dev/stderr is unreliable under piped stdio (how hooks are invoked — it
#         errors "No such device"), so echo to each stream explicitly instead
emit_both() {
  echo "$1"
  echo "$1" >&2
}

# .what = print the 🥥 block that names the next move a human may take
# .why  = a fix stated as bare prose sits in the same visual register as the
#         diagnosis above it, so a reader who scans for "what do i do now" must
#         read the whole refusal to find the remedy. the 🥥 is a landmark
#         (rule.require.coconut-hints).
# .why  = this is a local copy of the helper in git.commit/output.sh, on the same
#         grounds emit_both keeps one: this hook runs on a PT5S budget and
#         declines to source a whole library for two functions
print_coconut_hint() {
  local affordance="$1"
  shift

  echo ""
  echo "🥥 did you know?"
  echo "   ├─ $affordance"

  # every command but the last takes ├─; the last closes the block with └─
  local total=$#
  local index=0
  local command
  for command in "$@"; do
    index=$((index + 1))
    if [[ $index -eq $total ]]; then
      echo "   └─ $command"
    else
      echo "   ├─ $command"
    fi
  done
}

# read JSON from stdin
STDIN_INPUT=$(cat)

# failfast: if no input, error (loud on both streams per skill-output-streams)
if [[ -z "$STDIN_INPUT" ]]; then
  emit_both "ERROR: PreToolUse hook received no input via stdin"
  exit 2
fi

# failfast: jq is required. an absent jq is an unexpected environment error — surface
# it loud rather than swallow it and fail-open blind (rule.forbid.failhide)
if ! command -v jq >/dev/null; then
  emit_both "ERROR: PreToolUse hook requires jq, which was not found on PATH"
  exit 2
fi

# extract tool name. jq is confirmed present above and the jq program is a fixed literal
# that always compiles — so the single expected failure is a malformed-JSON parse error.
# jq reports an input/parse error as exit 2 (jq <=1.6) or 5 (jq >=1.7); allowlist both
# and fail-open loud. any other nonzero is an unexpected jq failure — rethrow it (re-exit
# with jq's own code) rather than hide it
JQ_STATUS=0
TOOL_NAME=$(echo "$STDIN_INPUT" | jq -r '.tool_name // empty') || JQ_STATUS=$?
if [[ $JQ_STATUS -eq 2 || $JQ_STATUS -eq 5 ]]; then
  emit_both "WARN: PreToolUse hook could not parse stdin as JSON; allow tool call"
  exit 0
fi
if [[ $JQ_STATUS -ne 0 ]]; then
  emit_both "ERROR: PreToolUse hook hit an unexpected jq failure (exit $JQ_STATUS)"
  exit "$JQ_STATUS"
fi

# .note = NotebookEdit is gated alongside Edit/Write: it is a distinct,
#         write-capable tool that carries its own absolute `notebook_path`
#         rather than a `file_path`, so a gate that reads only `file_path`
#         would let a peer repo's .ipynb be edited unseen.
case "$TOOL_NAME" in
  Read|Edit|Write|NotebookEdit|Grep|Glob|Bash) ;;
  *) exit 0 ;;
esac

######################################################################
# the boundary
######################################################################
# .note = `${GIT_REPO_ROOT:-$HOME/git}` is the same default git.repo.get uses
#         (`get_git_root`, git.repo.get.operations.sh:17). the hook restates it
#         rather than sources that file: this runs on EVERY tool call under a
#         PT5S budget, so it must not pull in a whole operations library. the
#         two must stay in step — a change there belongs here too.
GIT_ROOT="${GIT_REPO_ROOT:-$HOME/git}"

# the root AS WRITTEN, kept before canonicalization
#
# .why = a Bash command names a path however the caller typed it. when the root
#        is reached through a symlink, its canonical form never appears in the
#        command text, so a scan for the canonical prefix alone finds no
#        candidate and the gate falls open. both forms are scanned.
GIT_ROOT_RAW="$GIT_ROOT"

# canonicalize the root so comparisons are apples-to-apples
if [[ -d "$GIT_ROOT" ]]; then
  GIT_ROOT="$(realpath "$GIT_ROOT")"
fi

# the current repo = the git toplevel of cwd. works inside a worktree,
# where .git is a file rather than a dir.
#
# .note = `realpath "$(git rev-parse --show-toplevel)"` is the extant idiom for
#         the current-repo root across the safe skills (cpsafe:142, mvsafe:142,
#         rmsafe:133, teesafe:109, mkdirsafe:99, grepsafe:164, globsafe:153).
CURRENT_REPO="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -n "$CURRENT_REPO" ]]; then
  CURRENT_REPO="$(realpath "$CURRENT_REPO")"
fi

######################################################################
# as_abs_path — expand ~, make absolute, canonicalize
# args: raw path
# returns: absolute path
#
# .note = `realpath -m` is the canonicalization used across the safe
#         skills (cpsafe, mvsafe, rmsafe, teesafe, mkdirsafe, grepsafe).
#         -m tolerates a path whose leaf does not exist yet, which is
#         exactly the Write-a-new-file case.
#
# .why = it emits an EMPTY string and returns nonzero when realpath cannot
#        expand the path, rather than a fallback to the raw string. this
#        gate judges containment by prefix, and a raw `~/git/../etc/passwd`
#        does not carry the `$GIT_ROOT/` prefix its canonical form would
#        — so the fallback compared an unverified string and let the read
#        through. the caller treats an unexpandable path as cross-repo,
#        which is fail-CLOSED: undecidable means deny, never allow.
######################################################################
as_abs_path() {
  local raw="$1"

  # expand a ~ prefix (realpath treats it literally)
  case "$raw" in
    "~") raw="$HOME" ;;
    "~/"*) raw="$HOME/${raw#\~/}" ;;
  esac

  realpath -m "$raw" 2>/dev/null
}

######################################################################
# as_abs_path_lexical — absolute, but WITHOUT symlinks followed
# args: raw path
# returns: absolute path as written
#
# .note = `realpath -m -s` is the extant no-follow form (symlink.sh:144).
#         -s keeps the path the caller wrote, which is what the
#         node_modules allowance below must judge.
######################################################################
as_abs_path_lexical() {
  local raw="$1"

  case "$raw" in
    "~") raw="$HOME" ;;
    "~/"*) raw="$HOME/${raw#\~/}" ;;
  esac

  realpath -m -s "$raw" 2>/dev/null
}

######################################################################
# is_cross_repo — does this path reach into ANOTHER repo under the root?
# args: absolute path (symlinks followed), absolute path as written
# returns: 0 when cross-repo (block), 1 otherwise (allow)
######################################################################
is_cross_repo() {
  local abs="$1"
  local lex="$2"

  # an unexpandable path is undecidable, so it is denied — fail CLOSED.
  # to allow it would hand the gate a trivial bypass: any path realpath
  # chokes on would sail past every check below
  [[ -z "$abs" || -z "$lex" ]] && return 0

  # only paths under the git root are in scope
  [[ "$abs" == "$GIT_ROOT/"* ]] || return 1

  # every path inside the current repo is the caller's own work
  if [[ -n "$CURRENT_REPO" && ( "$abs" == "$CURRENT_REPO" || "$abs" == "$CURRENT_REPO/"* ) ]]; then
    return 1
  fi

  # a dependency the current repo installed is its own business, even when
  # the install is a symlink into a peer clone (pnpm link, workspaces).
  #
  # .why = judged on the path as written: by the time we hold $abs, realpath
  #        has already followed the link out of the repo, so the caller's own
  #        node_modules would read as a peer-repo reach and block every read
  #        of a linked dependency.
  #
  # .how = take the segment before the FIRST /node_modules/ — the dir that
  #        owns the install — and canonicalize only that. the owner is a real
  #        dir, so this compares like with like against CURRENT_REPO, while
  #        the link below node_modules stays unfollowed.
  if [[ -n "$CURRENT_REPO" && "$lex" == */node_modules/* ]]; then
    local owner="${lex%%/node_modules/*}"
    owner="$(realpath -m "$owner" 2>/dev/null || echo "$owner")"
    [[ "$owner" == "$CURRENT_REPO" ]] && return 1
  fi

  return 0
}

######################################################################
# get_repo_slug — derive the org/repo slug for the redirect
# args: absolute path
# returns: "org/repo" (falls back to path segments)
#
# .why = a worktree path (~/git/<org>/_worktrees/<repo>.x/...) does NOT
#        map to a slug by path segments — the dir is the worktree name,
#        not the repo. so ask git for the remote, and only fall back to
#        segments when there is no remote to ask.
######################################################################
get_repo_slug() {
  local abs="$1"

  # walk to a directory we can ask git about
  local dir="$abs"
  [[ ! -d "$dir" ]] && dir="$(dirname "$dir")"
  while [[ ! -d "$dir" && "$dir" == "$GIT_ROOT/"* ]]; do
    dir="$(dirname "$dir")"
  done

  # .why = two distinct "no answer" cases are ordinary here, and each is
  #        asked separately so neither hides a real fault:
  #          1. the dir is not a git repo at all — asked as a boolean probe,
  #             whose whole contract is a yes/no, so its output is discarded
  #          2. it IS a repo, but has no origin — git exits 1 for an unset key
  #        both fall through to the segment form below. any OTHER exit is a
  #        real fault, and git's own message reaches stderr rather than being
  #        silenced: a wrong slug in the redirect reads as authoritative, so
  #        its cause must stay visible (rule.forbid.failhide)
  local url="" status=0
  if git -C "$dir" rev-parse --git-dir >/dev/null 2>&1; then
    url="$(git -C "$dir" config --get remote.origin.url)" || status=$?
    [[ $status -gt 1 ]] && url=""
  fi

  if [[ -n "$url" ]]; then
    url="${url%.git}"
    url="${url##*:}" # scp-style: git@github.com:org/repo
    local slug
    slug="$(echo "$url" | awk -F/ 'NF>=2 { print $(NF-1)"/"$NF }')"
    if [[ -n "$slug" ]]; then
      echo "$slug"
      return 0
    fi
  fi

  # fallback: first two segments under the root
  local rel="${abs#"$GIT_ROOT"/}"
  local org="${rel%%/*}"
  local rest="${rel#*/}"
  local repo="${rest%%/*}"
  echo "$org/$repo"
}

######################################################################
# get_repo_relative_path — the file path within its repo
# args: absolute path
# returns: path relative to that repo's toplevel (empty when unknown)
######################################################################
get_repo_relative_path() {
  local abs="$1"

  local dir="$abs"
  [[ ! -d "$dir" ]] && dir="$(dirname "$dir")"

  local toplevel
  toplevel="$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null || true)"
  if [[ -n "$toplevel" ]]; then
    # canonicalize via realpath, the extant idiom used everywhere else here.
    # a `cd`/`pwd -P` pair would do the same inside its subshell, but reads
    # as a CWD mutation and needs a reader to confirm the subshell before
    # they can rule it out. it also fell back to the un-canonical string,
    # which could yield a wrong relative path in the redirect
    toplevel="$(realpath "$toplevel" 2>/dev/null)" || toplevel=""
    if [[ -n "$toplevel" && "$abs" == "$toplevel/"* ]]; then
      echo "${abs#"$toplevel"/}"
      return 0
    fi
  fi

  echo ""
}

######################################################################
# get_repo_relative_glob — a glob pattern, rebased onto its repo root
# args: a glob pattern (absolute or relative)
# returns: the pattern relative to its repo's toplevel, else unchanged
#
# .why = git.repo.get --paths is repo-relative. an absolute pattern handed
#        to it matches zero files, so a redirect that pastes the caller's
#        own absolute glob names a fix that FAILS when run — worse than one
#        that names none (rule.require.errors-name-the-fix). every other
#        fixline shape already uses the derived relpath; the glob shape was
#        the lone branch that echoed the caller's raw string back.
#
# .why = get_repo_relative_path cannot serve here: it dirnames ONCE and
#        needs the result to exist, but `<repo>/src/**/*.ts` dirnames to
#        `<repo>/src/**`, which never does. so walk up to the deepest
#        ancestor that is a real directory, and take the toplevel from that.
######################################################################
get_repo_relative_glob() {
  local glob="$1"

  # walk up to the deepest ancestor that actually exists on disk
  local dir="$glob"
  while [[ -n "$dir" && "$dir" != "/" && "$dir" != "." && ! -d "$dir" ]]; do
    dir="$(dirname "$dir")"
  done
  if [[ ! -d "$dir" ]]; then
    echo "$glob"
    return 0
  fi

  # the wildcard tail — the rest of what the caller wrote past that ancestor
  local suffix="${glob#"$dir"}"
  suffix="${suffix#/}"

  # .why = both sides are canonicalized before they are compared. a prefix
  #        match of the RAW glob against a realpath'd toplevel silently
  #        fails whenever any ancestor is a symlink (as the test fixtures'
  #        temp root is), and the redirect then falls back to the absolute
  #        pattern — the very defect this rebase exists to remove.
  local dir_real toplevel
  dir_real="$(realpath "$dir" 2>/dev/null)" || dir_real=""
  toplevel="$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null || true)"
  [[ -n "$toplevel" ]] && toplevel="$(realpath "$toplevel" 2>/dev/null || true)"
  if [[ -z "$dir_real" || -z "$toplevel" ]]; then
    echo "$glob"
    return 0
  fi

  # the ancestor's own path within its repo; empty when it IS the repo root
  local reldir=""
  if [[ "$dir_real" == "$toplevel/"* ]]; then
    reldir="${dir_real#"$toplevel"/}"
  elif [[ "$dir_real" != "$toplevel" ]]; then
    echo "$glob" # outside that repo entirely — leave the caller's string be
    return 0
  fi

  [[ -n "$reldir" && -n "$suffix" ]] && echo "$reldir/$suffix" && return 0
  echo "${reldir}${suffix}"
}

######################################################################
# is_ignored_in_its_repo — did that repo tell git to ignore this file?
# args: absolute path
# returns: 0 when ignored, 1 otherwise
#
# .why = git.repo.get reads git's tree, so it can never serve a file that
#        repo ignores. the redirect must know that, or it prints a fix
#        line that fails the moment the caller runs it.
######################################################################
is_ignored_in_its_repo() {
  local abs="$1"

  local dir="$abs"
  [[ ! -d "$dir" ]] && dir="$(dirname "$dir")"

  git -C "$dir" check-ignore -q -- "$abs" 2>/dev/null
}

######################################################################
# block — report the violation and name the fix
# args: abs_path
######################################################################
block() {
  local abs="$1"

  local slug relpath
  slug="$(get_repo_slug "$abs")"
  relpath="$(get_repo_relative_path "$abs")"

  # each piece of the message is named, so the emit below reads as the
  # shape a human sees rather than as the logic that produced it
  local headline whose body
  headline="$(get_block_headline "$slug")"
  whose="$(get_block_whose "$slug")"
  body="$(get_block_body "$abs" "$slug" "$relpath")"

  emit_both "
🛑 BLOCKED: $headline — $TOOL_NAME

   path: ${abs/#$HOME/\~}
   repo: $slug ($whose)

$body
"
  exit 2
}

######################################################################
# is_same_repo_other_tree — is the target the caller's OWN repo?
# args: the target's slug
# returns: 0 when it is the same repo (a different tree), 1 otherwise
#
# .why = a worktree of the caller's own repo is still blocked — its tree can
#        be just as stale or dirty as a peer's — but it is a different TREE,
#        not a different REPO. both the headline and the sub-line turn on
#        this one fact, so it is asked once, by name.
######################################################################
is_same_repo_other_tree() {
  local slug="$1"

  [[ -z "$CURRENT_REPO" ]] && return 1
  [[ "$(get_repo_slug "$CURRENT_REPO")" == "$slug" ]]
}

######################################################################
# get_block_headline — the single most-read line of the message
# args: the target's slug
#
# .why = "cross-repo access" carries a second sense when the target IS your
#        own repo, and a reader who disbelieves the first line will not trust
#        the rest (rule.forbid.ambiguous-labels). so the headline names the
#        tree, not the repo, for that case.
######################################################################
get_block_headline() {
  is_same_repo_other_tree "$1" \
    && echo "adhoc cross-tree access" \
    || echo "adhoc cross-repo access"
}

######################################################################
# get_block_whose — the parenthetical beside the repo slug
# args: the target's slug
######################################################################
get_block_whose() {
  is_same_repo_other_tree "$1" \
    && echo "your repo, but a different worktree" \
    || echo "not your current repo"
}

######################################################################
# get_block_body — the why + fix half of the message
# args: abs_path slug relpath
#
# .why = the fix lines mirror what the caller actually asked for. a caller
#        who searched gets a search back, with their own words in it; a
#        caller who named a file gets that file. a redirect that answers a
#        search with a file list sends them where they did not ask to go.
#
# .why = each case returns early rather than sit in an elif chain, so a
#        reader finds the one branch that applies and stops — they never
#        hold four conditions at once to learn which one won
#        (rule.require.narrative-flow).
######################################################################
get_block_body() {
  local abs="$1"
  local slug="$2"
  local relpath="$3"

  # a gitignored file is a DEAD END, not a redirect. that repo told git to
  # ignore it, so git.repo.get — which reads git's tree — cannot serve it at
  # any ref or tree. to print a git.repo.get line here would name a fix that
  # fails the moment it is run, which is worse than one that names none
  # (rule.require.errors-name-the-fix)
  if is_ignored_in_its_repo "$abs"; then
    echo "   why: that repo gitignores this file, so it is that repo's local
        scratch — build output, a cache, or a secret. git.repo.get reads
        git's tree, and this file is not in it, at any ref or worktree.

   fix: there is no sanctioned read for this one:
        ask the human. do not read another repo's scratch behind them."
    return 0
  fi

  # every other case redirects, so they share one diagnosis + one coconut
  local whyline="   why: that clone holds whatever is checked out there right now —
        a stale branch or a dirty tree. a direct read is a trap."

  # both commands answer the caller's OWN question — same shape, two sources
  local fixlines treelines
  fixlines="$(get_block_fixlines "$slug" "$relpath")"
  treelines="$(get_block_fixlines "$slug" "$relpath" " --tree $(get_block_treename "$abs")")"

  # the two commands are a genuine choice, so both are offered rather than one
  # picked for the caller. each carries its own end-of-line marker, because the
  # sole visible difference between them is a `--tree` mid-line — too quiet to
  # tell latest from inflight at a glance (rule.forbid.ambiguous-labels)
  echo "$whyline
$(print_coconut_hint \
  "--tree reads a local tree's inflight state — a worktree, or the repo's own clone" \
  "$fixlines   # latest (origin/main)" \
  "$treelines   # inflight (uncommitted included)")"
}

######################################################################
# get_block_treename — the tree the blocked path actually sits in
# args: abs path that was blocked
# returns: that tree's branch name, or the literal <branch> placeholder
#
# .why = the blocked path IS a spot in some checked-out tree, so its
#        branch is one command away. to print a generic <branch> when the
#        exact answer is at hand gives back a line the human must finish
#        by hand — and the whole point of this redirect is that it is
#        copy-paste, not a retype (rule.require.errors-name-the-fix).
#
# .why = it falls back to the placeholder rather than fail. a detached
#        HEAD answers "HEAD", a bare or broken dir answers not at all, and
#        in those cases a generic hint beats a wrong branch name. this
#        runs only on the block path, so its cost is paid once per refusal
######################################################################
get_block_treename() {
  local abs="$1"

  # a file has no branch; the dir that holds it does
  local dir="$abs"
  [[ -d "$dir" ]] || dir="$(dirname "$abs")"
  [[ -d "$dir" ]] || { echo "<branch>"; return 0; }

  local branch=""
  branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null)" || true

  # HEAD means detached — no branch name to offer
  if [[ -z "$branch" || "$branch" == "HEAD" ]]; then
    echo "<branch>"
    return 0
  fi

  echo "$branch"
}

######################################################################
# get_block_fixlines — the one command that answers what was asked
# args: slug relpath
# reads: $SEARCH_WORDS, $GLOB_PATHS (globals, set once at parse time)
#
# .why = the two globals are declared here rather than passed, so the
#        `args:` line above can be read literally. every other helper in
#        this file is strictly parameterized; this is the lone exception,
#        and an undeclared exception is how a reader learns to distrust the
#        contract lines everywhere else.
######################################################################
get_block_fixlines() {
  local slug="$1"
  local relpath="$2"

  # an optional source selector, spliced in right after --in. empty gives
  # the latest (origin/main) form; " --tree <branch>" gives the inflight one
  #
  # .why = the inflight suggestion must answer the SAME question the caller
  #        asked, exactly as the latest one does. it was a fixed string that
  #        always said `lines ... --paths '<file>'`, so a caller who searched
  #        got handed a file-read shape that answers no search, and a caller
  #        who named a file got a dead `<file>` placeholder next to their own
  #        path. both made them retype what they had already typed — the
  #        precise friction this redirect exists to remove
  local source_flag="${3:-}"

  # a search gets a search back, with the caller's own words in it.
  # a lone ' would end the quoted arg, so close/escape/reopen it
  if [[ -n "$SEARCH_WORDS" ]]; then
    local words="${SEARCH_WORDS//\'/\'\\\'\'}"
    [[ -n "$relpath" ]] \
      && echo "rhx git.repo.get lines --in $slug$source_flag --words '$words' --paths '$relpath'" \
      || echo "rhx git.repo.get lines --in $slug$source_flag --words '$words'"
    return 0
  fi

  # a glob gets a file list, scoped by that same glob — rebased onto the
  # repo root, since --paths is repo-relative and an absolute pattern
  # matches zero files (see get_repo_relative_glob)
  if [[ -n "$GLOB_PATHS" ]]; then
    local globs
    globs="$(get_repo_relative_glob "$GLOB_PATHS")"
    globs="${globs//\'/\'\\\'\'}"
    echo "rhx git.repo.get files --in $slug$source_flag --paths '$globs'"
    return 0
  fi

  # a named file gets that file
  if [[ -n "$relpath" ]]; then
    echo "rhx git.repo.get lines --in $slug$source_flag --paths '$relpath'"
    return 0
  fi

  # and a bare repo reach gets the repo's file list
  echo "rhx git.repo.get files --in $slug$source_flag"
}

######################################################################
# block_unverifiable — the gate could not canonicalize this path
# args: raw path as the caller wrote it
#
# .why = this gate decides by canonical prefix, so a path realpath cannot
#        expand (a symlink cycle, a path past the system limit) is simply
#        UNDECIDABLE. an earlier form fell back to the raw string, which
#        made "hand it a path realpath chokes on" a one-step bypass of
#        every check. undecidable now DENIES — fail closed.
#
# .why = it gets its own message rather than the cross-repo one, because
#        it is a different fact. to say "cross-repo" of a path we could
#        not place would assert something unproven, and the caller would
#        chase a repo boundary that was never the problem
#        (rule.forbid.ambiguous-labels).
######################################################################
block_unverifiable() {
  local raw="$1"

  local message
  message="
🛑 BLOCKED: unverifiable path — $TOOL_NAME

   path: ${raw/#$HOME/\~}

   why: this path cannot be canonicalized, so the cross-repo gate cannot
        tell which repo it lands in. it is denied rather than guessed at.
        give a path realpath can expand — check for a symlink cycle, or a
        length past the system limit.
$(print_coconut_hint \
  "a repo can be named by slug, so no path has to be expanded at all" \
  "rhx git.repo.get lines --in <org>/<repo> --paths '<file>'")
"

  emit_both "$message"
  exit 2
}

######################################################################
# gather candidate paths, per tool
######################################################################
CANDIDATES=()
SEARCH_WORDS=""
GLOB_PATHS=""

if [[ "$TOOL_NAME" == "Read" || "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
  FILE_PATH=$(echo "$STDIN_INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")
  [[ -n "$FILE_PATH" ]] && CANDIDATES+=("$FILE_PATH")
fi

# NotebookEdit names its target `notebook_path`, not `file_path`
if [[ "$TOOL_NAME" == "NotebookEdit" ]]; then
  NOTEBOOK_PATH=$(echo "$STDIN_INPUT" | jq -r '.tool_input.notebook_path // empty' 2>/dev/null || echo "")
  [[ -n "$NOTEBOOK_PATH" ]] && CANDIDATES+=("$NOTEBOOK_PATH")
fi

if [[ "$TOOL_NAME" == "Grep" || "$TOOL_NAME" == "Glob" ]]; then
  # .path (this harness) and .paths[] (documented array form) are both read,
  # so the gate holds whichever shape the tool sends
  while IFS= read -r p; do
    [[ -n "$p" ]] && CANDIDATES+=("$p")
  done < <(echo "$STDIN_INPUT" | jq -r '
    [ .tool_input.path? // empty ]
    + ( .tool_input.paths? // [] )
    | .[]
  ' 2>/dev/null || true)

  # .why = a Grep carries the words the caller searched for. without it the
  #        redirect can only print a `<pattern>` placeholder, so the caller
  #        must retype what they already typed — and the promise that the
  #        fix line is copy-paste holds for --paths but breaks for --words.
  #        Glob's `pattern` is a path shape, not a word, so it is left alone.
  if [[ "$TOOL_NAME" == "Grep" ]]; then
    SEARCH_WORDS=$(echo "$STDIN_INPUT" | jq -r '.tool_input.pattern // empty' 2>/dev/null || echo "")
  fi

  # .why = a Glob's pattern is a PATH shape, so it belongs in --paths, not
  #        --words. without it a Glob over a directory redirects to a bare
  #        `files --in <slug>` — the whole repo — and the caller must re-add
  #        the shape they already typed. `files --paths '<glob>'` exists for
  #        exactly this, so the fix line can carry it.
  if [[ "$TOOL_NAME" == "Glob" ]]; then
    GLOB_PATHS=$(echo "$STDIN_INPUT" | jq -r '.tool_input.pattern // empty' 2>/dev/null || echo "")

    # .why = and because it is a path shape, it is also a TARGET, not merely
    #        message text. Glob accepts a bare absolute pattern with no
    #        `path` field, so a gate that reads only `path` lets
    #        `{ pattern: "/home/me/git/org/peer/**/*.ts" }` walk a peer repo
    #        entirely ungated — the very hazard this hook exists to close.
    #        a relative pattern needs no special care: it resolves against
    #        the caller's cwd, so it lands inside their own repo and passes.
    #        Grep's pattern is deliberately NOT added — it is a regex over
    #        content, so a search for a path-like string in your OWN repo
    #        must not read as a cross-repo reach.
    [[ -n "$GLOB_PATHS" ]] && CANDIDATES+=("$GLOB_PATHS")
  fi
fi

if [[ "$TOOL_NAME" == "Bash" ]]; then
  COMMAND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")
  if [[ -n "$COMMAND" ]]; then
    # pull out tokens that name a path under the git root, in ~/git/...,
    # $HOME/git/..., or /abs/path/git/... form. both the canonical root and
    # the root as written are scanned, so a symlinked root is not a bypass.
    #
    # .note = the Bash gate is a HEURISTIC, not a proof, and that is accepted.
    #         it reads the command text, so it sees only paths spelled with a
    #         `~`, `$HOME`, `${HOME}`, or root prefix. it does NOT catch:
    #           - `cd ~/git/other/repo && cat file.ts` (bare name after a cd)
    #           - `$P/file.ts` (a path assembled through a variable)
    #         the tool-level gates (Read/Edit/Write/NotebookEdit/Grep/Glob) are
    #         the precise ones and are exhaustive; Bash is best-effort cover for
    #         the honest spellings.
    ROOT_ALTS="$GIT_ROOT"
    [[ "$GIT_ROOT_RAW" != "$GIT_ROOT" ]] && ROOT_ALTS="$GIT_ROOT|$GIT_ROOT_RAW"

    # the variable forms a caller may use to name the root
    #
    # .why = this hook defines its own boundary as `$GIT_REPO_ROOT` (line 95),
    #        so a caller who writes a path with that same variable names
    #        exactly the root this gate guards — and it was the one form the
    #        extractor did not read, so `cat $GIT_REPO_ROOT/org/peer/f.ts`
    #        passed ungated. narrower than the accepted "arbitrary variable"
    #        gap below, because this name is one the hook itself depends on.
    #
    # .why = added ONLY when the var is actually set. when it is unset, bash
    #        expands `$GIT_REPO_ROOT/org/repo` to `/org/repo` — a path that
    #        never touches the root at all. to fold it anyway would invent a
    #        candidate the caller never named, and block a reach that is not
    #        one (rule.forbid.surprises).
    VAR_ALTS="\\\$HOME"
    [[ -n "${GIT_REPO_ROOT:-}" ]] && VAR_ALTS="\\\$HOME|\\\$GIT_REPO_ROOT"

    # .why = `${HOME}` is folded to `$HOME` FIRST, so the extractor regex
    #        stays single-form. a brace alternative inside the ERE would
    #        need `\{`, which greps read as an interval, not a literal.
    #        `${GIT_REPO_ROOT}` is folded the same way, for the same reason.
    #
    # .why = grep's exit 1 ("no paths in this command") is the ORDINARY case
    #        here — most commands name no repo path at all. exit >1 is a real
    #        failure, and a blanket `|| true` flattened the two together, so
    #        a broken extractor would read as "this command is clean" and the
    #        gate would fall open silently. the two are now separated: 1 is
    #        accepted, >1 warns on both streams. it WARNS rather than blocks
    #        because this gate is declared best-effort (see the note above) —
    #        but best-effort must still be audible, never silent
    #        (rule.forbid.failhide).
    COMMAND_FOLDED="${COMMAND//\$\{HOME\}/\$HOME}"
    COMMAND_FOLDED="${COMMAND_FOLDED//\$\{GIT_REPO_ROOT\}/\$GIT_REPO_ROOT}"

    # .note = `$GIT_REPO_ROOT` maps back to the root AS WRITTEN, not the
    #         canonical one, because that is what bash itself would expand it
    #         to. is_cross_repo canonicalizes afterward, as it does for every
    #         other candidate.
    EXTRACTED=""
    EXTRACT_STATUS=0
    EXTRACTED="$(
      echo "$COMMAND_FOLDED" \
        | grep -oE "(~|${VAR_ALTS}|${ROOT_ALTS})/[A-Za-z0-9._/-]+" \
        | sed -e "s|^\\\$HOME|$HOME|" -e "s|^\\\$GIT_REPO_ROOT|$GIT_ROOT_RAW|"
    )" || EXTRACT_STATUS=$?

    if [[ $EXTRACT_STATUS -gt 1 ]]; then
      emit_both "⚠️  cross-repo gate: could not scan this Bash command (exit $EXTRACT_STATUS); the Bash heuristic did not run"
    fi

    while IFS= read -r p; do
      [[ -n "$p" ]] && CANDIDATES+=("$p")
    done <<< "$EXTRACTED"
  fi
fi

######################################################################
# verdict
######################################################################
for candidate in ${CANDIDATES+"${CANDIDATES[@]}"}; do
  lex="$(as_abs_path_lexical "$candidate")"
  abs="$(as_abs_path "$candidate")"

  # undecidable denies before any containment check runs
  if [[ -z "$abs" || -z "$lex" ]]; then
    block_unverifiable "$candidate"
  fi

  if is_cross_repo "$abs" "$lex"; then
    block "$abs"
  fi
done

exit 0
