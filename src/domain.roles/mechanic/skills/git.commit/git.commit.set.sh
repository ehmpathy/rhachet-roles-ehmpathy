#!/usr/bin/env bash
######################################################################
# .what = create git commit as seaturtle[bot] with human co-author
#
# .why  = mechanics commit under their own identity while credit
#         goes to the human who delegated the work
#
# usage:
#   echo "fix(scope): summary
#
#   - detail 1
#   - detail 2" | rhx git.commit.set -m @stdin                    # plan (preview)
#   echo "..." | rhx git.commit.set -m @stdin --mode apply        # apply (commit)
#   echo "..." | rhx git.commit.set -m @stdin --mode apply --push # apply + push
#   echo "..." | rhx git.commit.set -m @stdin --unstaged include  # include untracked
#   echo "..." | rhx git.commit.set -m @stdin --unstaged ignore   # ignore untracked
#
# message format:
#   first line = commit header (required)
#   blank line + rest of lines = commit body (required)
#
# guarantee:
#   - author is seaturtle[bot] <seaturtle@ehmpath.com>
#   - Co-authored-by trailer names the SPONSOR bound to this worktree
#   - refuses with exit 2 where no sponsor is bound (never guesses one)
#   - forbids adhoc Co-authored-by in input message (skill sets it automatically)
#   - requires quota from git.commit.uses
#   - requires a sponsor from git.commit.sponsor
#   - push only if allowed and requested
#   - fails fast if unstaged changes exist (unless --unstaged ignore|include)
#   - defaults to plan mode (preview only); use --mode apply to execute
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"
source "$SCRIPT_DIR/keyrack.operations.sh"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  emit_both "error: not in a git repository"
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/git.commit.uses.jsonc"

# global blocker path (defined in git.commit.operations.sh)

######################################################################
# helper: infer level from branch name (same logic as git.commit.bind)
######################################################################
infer_level_from_branch() {
  local branch="$1"

  local has_fix=false
  if [[ "$branch" =~ ^fix/ ]] || [[ "$branch" =~ /fix/ ]] || [[ "$branch" =~ /fix- ]] || \
     [[ "$branch" =~ ^hotfix/ ]] || [[ "$branch" =~ ^bugfix/ ]]; then
    has_fix=true
  fi

  local has_feat=false
  if [[ "$branch" =~ ^feat/ ]] || [[ "$branch" =~ /feat/ ]] || [[ "$branch" =~ /feat- ]] || \
     [[ "$branch" =~ ^feature/ ]]; then
    has_feat=true
  fi

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

######################################################################
# .what = a PURE transformer: the commit body → its tree-leaf lines
#
# .why = the plan-mode and apply-mode renders emit this same 12-line loop,
#        byte for byte. the glyphs and the indent are a CONTRACT — both are
#        pinned by snapshots — so a future format change had to be applied
#        twice, and a change applied once would show as a diff in one mode
#        only (rule.require.named-transformers).
#
# .why = the `if [[ -n "$bline" ]]` skip is why this is not a one-liner: a
#        body's blank lines carry no leaf, so the LAST non-blank line is not
#        always the last index. the loop reads the count, never the content.
#
# .note = it emits leaves only. the caller owns the `├─ body` line above and
#         every line below, because those differ between the two modes.
#
# 🔴 .why a GLYPH var and no `else` = `rule.forbid.else-branches` forbids
#        `else` outright, and the two-echo form held the snapshot-pinned
#        indent+text in TWO copies, free to drift apart. one predicate picks
#        the two characters that vary; the contract sits on ONE echo.
#        ⇒ the same form as `render_orgs_as_tree_lines` in uses.org.sh, which
#          this change authored in the same diff.
######################################################################
render_body_as_tree_lines() {
  local body="$1"
  local lines
  readarray -t lines <<< "$body"
  local count=${#lines[@]}
  local i
  for i in "${!lines[@]}"; do
    local line="${lines[$i]}"

    # a blank body line carries no leaf
    if [[ -z "$line" ]]; then
      continue
    fi

    # the last line closes the tree; every earlier one continues it
    local glyph='├─'
    if [[ $((i + 1)) -eq $count ]]; then
      glyph='└─'
    fi

    echo "   │  │  $glyph $line"
  done
}

######################################################################
# .what = a PURE transformer: the staged-file list → its tree-leaf lines
#
# .why = the plan render hand-rolled this loop with POSITIONAL array
#        semantics — a readarray, an index compare against a count, and a
#        glyph picked from that compare. a reader had to simulate the
#        indices to learn what it emits (rule.forbid.inline-decode-friction).
#
# .why = one call site, so this is NOT a dry extraction. the win is at the
#        CALL SITE: the plan orchestrator now reads as named calls rather
#        than as a loop the reader must decode. the glyph + indent are a
#        snapshot-pinned contract, and they now live in exactly one place
#        beside their body-render twin, where a format change reads as one
#        edit rather than two divergent ones.
#
# .why = extraction also closes a leak: `FILES_ARR`, `FILES_COUNT`, `i`,
#        and `f` were GLOBALS in the middle of a render. they are locals now.
#
# .note = the `if [[ -n "$f" ]]` skip mirrors the body render — a blank at
#         the end carries no leaf, so the last INDEX is not always the last
#         leaf. the loop reads the count, never the content.
#
# .note = it emits leaves only. the caller owns the `└─ files` line above.
#
# 🔴 .why a GLYPH var and no `else` = identical to its body-render twin above,
#        and to `render_orgs_as_tree_lines`. all three leaves this change
#        authored now pick a glyph, never a whole line.
######################################################################
render_files_as_tree_lines() {
  local files="$1"
  local lines
  readarray -t lines <<< "$files"
  local count=${#lines[@]}
  local i
  for i in "${!lines[@]}"; do
    local line="${lines[$i]}"

    # a blank at the end carries no leaf
    if [[ -z "$line" ]]; then
      continue
    fi

    # the last line closes the tree; every earlier one continues it
    local glyph='├─'
    if [[ $((i + 1)) -eq $count ]]; then
      glyph='└─'
    fi

    echo "   │     $glyph $line"
  done
}

######################################################################
# helper: extract commit prefix (fix, feat, chore, etc.) from header
######################################################################
get_commit_prefix() {
  local header="$1"
  if [[ "$header" =~ ^([a-z]+)[\(:] ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo ""
  fi
}

######################################################################
# helper: check if header has a scope (e.g., fix(api): not fix:)
######################################################################
has_scope() {
  local header="$1"
  # extract scope via sed - returns non-empty if scope present
  # e.g., "fix(api): msg" → "api", "fix: msg" → ""
  local scope
  scope=$(echo "$header" | sed -n 's/^[a-z]*(\([^)]*\)):.*/\1/p')
  if [[ -n "$scope" ]]; then
    return 0
  else
    return 1
  fi
}

######################################################################
# helper: check if a push actually shipped (requested, ran, no error)
######################################################################
# .what = a named predicate for "did a push land", so the CI-reminder gate
#         reads as one decision rather than three clauses to decode
#
# .why = a reader met `$DO_PUSH == true && $PUSH_STATUS != skipped &&
#        $PUSH_STATUS != *error*` inline and had to hold three separate
#        facts (requested, it ran, it did not error) to learn the clause
#        stands for "a push shipped" — the exact decode-friction
#        rule.forbid.inline-decode-friction names. the name carries the
#        sense; the clauses stay here, once.
is_push_shipped() {
  local do_push="$1"
  local push_status="$2"
  [[ "$do_push" == true && "$push_status" != "skipped" && "$push_status" != *"error"* ]]
}

######################################################################
# helper: check if a requested push/pr-open did NOT complete
######################################################################
# .what = a named predicate for "a composed push was requested and did not
#         complete", read from the delegated push.sh's raw `.status` field
#
# .why = the apply-mode summary re-derived `$DO_PUSH == true &&
#        $PUSH_RESULT_STATUS != pushed` inline at two call sites (the
#        stderr duplication and the non-zero exit propagation) — the same
#        decode-friction is_push_shipped was extracted to remove, just on
#        the raw status this file reads rather than the display string
#        is_push_shipped classifies (rule.forbid.inline-decode-friction).
is_push_failed() {
  local do_push="$1"
  local push_result_status="$2"
  [[ "$do_push" == true && "$push_result_status" != "pushed" ]]
}

######################################################################
# communicator: fetch the robot token, with its stderr captured
######################################################################
# .what = `fetch_github_token`, wrapped so its own stderr (a network
#         timeout, a locked keyrack, a corrupted credential store) lands in
#         `TOKEN_FETCH_ERR` rather than the raw i/o boundary the orchestrator
#         had to perform inline
#
# .why = the orchestrator below used to run its own four-line mktemp/call/
#        cat/rm dance around `fetch_github_token` — the exact mixed-grain
#        shape `rule.prefer.decomposable-architecture` names, and the same
#        shape `git.commit.sponsor.sh`'s `get_gh_user_session` (an analogous
#        boundary) was already pulled into a named leaf for. this is that
#        leaf's twin: `ROBOT_TOKEN=$(fetch_github_token)` now reads as one
#        decision, and the capture machinery lives once, here.
#
# .why globals set by a DIRECT call, never a `$( )` substitution = a
#        command substitution forks a subshell, and a variable this
#        function sets would die with it — the same reason
#        `get_gh_user_session` is called plainly rather than assigned from.
#
# .why the mktemp+trap+rm pair = the same defense `get_gh_user_session`
#        carries: the explicit `rm -f` covers the normal return, and the
#        `${err_file:-}`-guarded EXIT trap covers a kill mid-call. a bare
#        `$err_file` in the trap would read as unbound once this function
#        returns (this file runs under `set -u`), which aborts the trap and
#        overwrites the real exit code — see `get_gh_user_session`'s own
#        note for the measured version of this failure.
fetch_robot_token() {
  local err_file
  err_file=$(mktemp)
  trap 'rm -f "${err_file:-}"' EXIT

  ROBOT_TOKEN=$(fetch_github_token 2>"$err_file" || echo "")
  TOKEN_FETCH_ERR=$(cat "$err_file")
  rm -f "$err_file"
}

######################################################################
# source shared domain operations (get_behavioral_commits_on_branch, etc.)
######################################################################
source "$SCRIPT_DIR/git.commit.operations.sh"

# parse arguments
MESSAGE=""
DO_PUSH=false
UNSTAGED=""
MODE="plan"
PROMISE=""
AUTH="$AUTH_DEFAULT" # shared default from git.commit.operations.sh

while [[ $# -gt 0 ]]; do
  case $1 in
    --message|-m)
      # 🔴 same guard as --auth/--unstaged/--mode below — shift ONE, then
      #    take a value only if one is really there. a bare flag here leaves
      #    MESSAGE empty, which the extant `-z "$MESSAGE"` check turns into
      #    a curated constraint rather than a raw `shift 2` crash.
      shift
      if [[ $# -gt 0 && "$1" != --* ]]; then
        if [[ "$1" == "@stdin" ]]; then
          # read message from stdin
          MESSAGE=$(cat)
        else
          MESSAGE="$1"
        fi
        shift
      fi
      ;;
    --push)
      DO_PUSH=true
      shift
      ;;
    --auth)
      # 🔴 shift ONE, then take a value only if one is really there — see the
      #    `--promise` arm below for why a bare `shift 2` crashes raw at exit
      #    1 when the flag is the last arg. default-first (empty) then
      #    if-override, one path, no else — a bare flag leaves AUTH empty,
      #    which the extant validate_enum_arg call below turns into a
      #    curated constraint at exit 2.
      shift
      AUTH=""
      if [[ $# -gt 0 && "$1" != --* ]]; then
        AUTH="$1"
        shift
      fi
      ;;
    --unstaged)
      shift
      UNSTAGED=""
      if [[ $# -gt 0 && "$1" != --* ]]; then
        UNSTAGED="$1"
        shift
      fi
      ;;
    --mode)
      shift
      MODE=""
      if [[ $# -gt 0 && "$1" != --* ]]; then
        MODE="$1"
        shift
      fi
      ;;
    --promise)
      # 🔴 shift ONE, then take a value only if one is really there — never
      #    `shift 2`. `--promise` as the LAST arg leaves one positional, so
      #    `shift 2` exits non-zero and `set -euo pipefail` kills the skill
      #    with bash's own `shift: shift count out of range` — a raw message
      #    at exit 1, which reads as a MALFUNCTION where every other
      #    malformed input on this parser is a constraint at exit 2. the
      #    same guard `--who` already carries in git.commit.sponsor.sh, for
      #    this identical reason.
      shift
      if [[ $# -gt 0 && "$1" != --* ]]; then
        PROMISE="$1"
        shift
      fi
      ;;
    --help|-h)
      echo "usage: echo 'header\n\n- body' | git.commit.set -m @stdin [--mode plan|apply] [--push] [--auth as-ehmpath|as-human]"
      echo ""
      echo "options:"
      echo "  --message, -m @stdin   read multiline commit message from stdin (required)"
      echo "                         first line = header, after blank line = body"
      echo "  --mode plan|apply      plan shows preview, apply executes (default: plan)"
      echo "  --push                 push after commit (requires push permission)"
      echo "  --auth as-ehmpath|as-human"
      echo "                         who opens the pr (default: as-ehmpath)"
      echo "                         as-ehmpath = seaturtle bot via ehmpath keyrack token"
      echo "                         as-human   = the gh cli login (fallback on keyrack failure)"
      echo "                         note: --auth governs pr-open only; the commit is always"
      echo "                         authored as seaturtle[bot]. under as-human no keyrack"
      echo "                         token is fetched — the commit uses the default seaturtle"
      echo "                         identity, so the fallback escapes keyrack entirely"
      echo "  --unstaged ignore      proceed despite unstaged changes (commit staged only)"
      echo "  --unstaged include     stage all unstaged changes before commit"
      echo "  --promise is-netnew-behavior"
      echo "                         confirm a feat: commit is net-new behavior"
      echo "                         (answers the nudge on a no-level branch)"
      echo "  --help, -h             show this help"
      # .why = a MANDATORY precondition belongs on the help surface, not only
      #        in the refusal that fires once it is unmet. a human who reads
      #        --help before their first commit would otherwise meet the
      #        sponsor gate as a surprise, which is the exact friction
      #        rule.require.help-on-demand exists to prevent: help must state
      #        the inputs a command needs, and a bound sponsor is one of them.
      echo ""
      echo "requires:"
      echo "  a sponsor bound to this tree — the human who answers for the"
      echo "  commit. every commit is refused without one, and only a human"
      echo "  can bind it:"
      # 🔴 .why BOTH forms = this listed the piped form alone, while all six
      #        other renders in the two files listed both. ⇒ the literal was
      #        undiscoverable from `--help`, which is the FIRST surface a
      #        human reads — so the one place that exists to enumerate the
      #        inputs enumerated half of one (rule.require.help-on-demand).
      #        that is `F10` recurred: the wisher found this exact value form
      #        undiscoverable once already, from a render that named one route.
      echo "    \$ $SPONSOR_BIND_VIA_STDIN"
      echo "    \$ $SPONSOR_BIND_VIA_LITERAL"
      echo "    \$ rhx git.commit.sponsor get     # read the bound sponsor"
      exit 0
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args - ignore. same guard as the value arms
      # above: shift ONE, then a value only if one is really there — never
      # a bare `shift 2`.
      shift
      if [[ $# -gt 0 && "$1" != --* ]]; then
        shift
      fi
      ;;
    --)
      shift
      ;;
    --*)
      UNKNOWN_OPT_ERR="error: unknown option: $1
usage: echo 'header\n\n- body' | git.commit.set -m @stdin [--mode plan|apply] [--push]"
      echo "$UNKNOWN_OPT_ERR"
      echo "$UNKNOWN_OPT_ERR" >&2
      exit 2
      ;;
    *)
      shift
      ;;
  esac
done

# validate --message
# validation errors ride BOTH streams (stdout for a terminal viewer, stderr for
# log aggregation) to match the enum-flag guard in output.sh — a validation
# error is never stdout-only (rule.require.skill-output-streams). build once,
# emit to each stream.
if [[ -z "$MESSAGE" ]]; then
  MESSAGE_ERR=$(echo "error: --message is required"
    echo "usage: echo 'header\n\n- body' | git.commit.set -m @stdin [--mode plan|apply] [--push]")
  echo "$MESSAGE_ERR"
  echo "$MESSAGE_ERR" >&2
  exit 2
fi

# parse header and body from multiline message
# note: herestrings (not `echo | head`) avoid a SIGPIPE race under `set -o
# pipefail` + `set -e`, where head closes the pipe after line 1 and the echo
# writer dies with 141, aborting the whole run on a hot path
HEADER=$(head -n1 <<< "$MESSAGE")
BODY=$(tail -n +3 <<< "$MESSAGE")

# validate message has body (header + blank line + body)
if [[ -z "$BODY" ]]; then
  BODY_ERR=$(echo "error: --message must be multiline (header + blank line + body)"
    echo "usage: echo 'header\n\n- body line 1' | git.commit.set -m @stdin")
  echo "$BODY_ERR"
  echo "$BODY_ERR" >&2
  exit 2
fi

# guard: forbid adhoc Co-authored-by in input message
#
# .why = the sponsor never travels in a commit message — it is read from the
#        bound state instead. so this guard keeps its ONE job at full
#        strength: it need not learn to tell a bound sponsor from an
#        invented one, because a bound sponsor never arrives by this route.
# note: `grep <<< "$var"` (not `echo "$var" | grep -q`) avoids a SIGPIPE race
# under pipefail, where grep -q closes the pipe on first match before echo ends
if grep -qi "^Co-authored-by:" <<< "$MESSAGE"; then
  COAUTHOR_ERR=$(print_turtle_header "bummer dude..."
    print_tree_start "git.commit.set"
    print_tree_error "adhoc Co-authored-by forbidden"
    echo ""
    echo "   the commit message contains a Co-authored-by trailer."
    echo "   this skill sets Co-authored-by automatically, from the sponsor"
    echo "   bound to this tree."
    echo ""
    echo "   remove the Co-authored-by line from your message and retry.")
  echo "$COAUTHOR_ERR"
  echo "$COAUTHOR_ERR" >&2
  exit 2
fi

# validate the enum-valued flags via the shared guard in output.sh (each errors
# to both streams + exit 2, so their text cannot drift from push.sh's copies).
# --unstaged is optional, so only validate it when a value was supplied.
[[ -n "$UNSTAGED" ]] && validate_enum_arg "$UNSTAGED" "--unstaged" \
  "usage: echo 'header\n\n- body' | git.commit.set -m @stdin [--unstaged ignore|include]" \
  ignore include
validate_enum_arg "$AUTH" "--auth" \
  "usage: echo 'header\n\n- body' | git.commit.set -m @stdin [--auth as-ehmpath|as-human]" \
  "${AUTH_VALID_VALUES[@]}"
validate_enum_arg "$MODE" "--mode" \
  "usage: echo 'header\n\n- body' | git.commit.set -m @stdin [--mode plan|apply]" \
  plan apply

# guard: bound level constraint with inference + hard-nudge
LEVEL_FILE="$REPO_ROOT/.branch/.bind/git.commit.level"
EFFECTIVE_LEVEL=""
LEVEL_SOURCE=""

# 1. check explicit bind first
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
      LEVEL_SOURCE="inferred"
    fi
  fi
fi

# extract commit prefix from header
COMMIT_PREFIX=$(get_commit_prefix "$HEADER")

# skip validation for chore, docs, refactor, test, ci, build, perf, style prefixes
case "$COMMIT_PREFIX" in
  chore|docs|refactor|test|ci|build|perf|style)
    # no fix/feat validation for these types
    ;;
  *)
    # validate fix/feat based on effective level
    if [[ "$EFFECTIVE_LEVEL" == "fix" ]]; then
      # fix branch/bind: block feat commits
      if [[ "$COMMIT_PREFIX" == "feat" ]]; then
        emit_both "$(
          print_turtle_header "bummer dude..."
          print_tree_start "git.commit.set"
          print_tree_error "commit prefix mismatch"
          echo ""
          echo "   header: $HEADER"
          echo "   level.bound = $EFFECTIVE_LEVEL ($LEVEL_SOURCE)"
          echo "   level.found = $COMMIT_PREFIX"
          echo ""
          echo "   the level is bound to 'fix' but the commit prefix is 'feat'."
          echo ""
          echo "   the branch is bound to fix — use fix: even if you think its a feat."
          echo "   change your commit header to fix(...):"
        )"
        exit 2  # blocked by constraints
      fi
    elif [[ "$EFFECTIVE_LEVEL" == "feat" ]]; then
      # feat branch/bind: block fix commits
      if [[ "$COMMIT_PREFIX" == "fix" ]]; then
        emit_both "$(
          print_turtle_header "bummer dude..."
          print_tree_start "git.commit.set"
          print_tree_error "commit prefix mismatch"
          echo ""
          echo "   header: $HEADER"
          echo "   level.bound = $EFFECTIVE_LEVEL ($LEVEL_SOURCE)"
          echo "   level.found = $COMMIT_PREFIX"
          echo ""
          echo "   the level is bound to 'feat' but the commit prefix is 'fix'."
          echo ""
          echo "   the branch is bound to feat — use feat: even if you think its a fix."
          echo "   change your commit header to feat(...):"
        )"
        exit 2  # blocked by constraints
      fi
    else
      # no level (none): hard-nudge on feat, allow fix
      if [[ "$COMMIT_PREFIX" == "feat" ]]; then
        # check for --promise is-netnew-behavior
        if [[ "$PROMISE" != "is-netnew-behavior" ]]; then
          emit_both "$(
            print_turtle_header "hold up, dude..."
            print_tree_start "git.commit.set"
            echo "   └─ ✋ nudge: feat requires confirmation"
            echo ""
            echo "   your branch ($CURRENT_BRANCH) doesn't signal fix or feat."
            echo ""
            echo "   are you certain this is a feat?"
            echo "   - feat = net-new behavior that did not exist before"
            echo "   - fix = covers a gap, tunes implementation, or corrects a defect"
            echo ""
            echo "   if this is truly a feat, retry with:"
            echo "     --promise is-netnew-behavior"
            echo ""
            echo "   if this is a fix, change your commit header to fix(...):"
          )"
          exit 2  # blocked by constraints
        fi
      fi
      # fix commits on no-level branches are allowed (safe default)
    fi
    ;;
esac

# guard: continuation commit enforcement
# after first behavioral commit (fix/feat) on branch, subsequent fix/feat must use cont:
BEHAVIORAL_COMMITS=$(get_behavioral_commits_on_branch)

# fail fast: repo has no commits
if [[ "$BEHAVIORAL_COMMITS" == "NO_COMMITS" ]]; then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.set"
    print_tree_error "repo has no commits"
    echo ""
    echo "   cannot commit to an empty repo"
    echo "   ensure the repo has at least one commit on the base branch"
  )"
  exit 2
fi

# fail fast: no base branch to compare against
if [[ "$BEHAVIORAL_COMMITS" == "NO_BASE" ]]; then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.set"
    print_tree_error "no base branch found (main/master/trunk)"
    echo ""
    echo "   cannot determine branch context without a base branch"
    echo "   ensure the repo has a main, master, or trunk branch"
  )"
  exit 2
fi

# fail fast: cannot commit directly to base branch
if [[ "$BEHAVIORAL_COMMITS" == "ON_BASE" ]]; then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.set"
    print_tree_error "cannot commit to base branch"
    echo ""
    echo "   you are on main - create a feature branch first"
    echo ""
    echo "   example:"
    echo "     git checkout -b feat/my-feature"
  )"
  exit 2
fi

# guard: check for prior behavioral commits
if [[ -n "$BEHAVIORAL_COMMITS" ]]; then
  # branch already has a behavioral commit
  if [[ "$COMMIT_PREFIX" == "fix" || "$COMMIT_PREFIX" == "feat" ]]; then
    FIRST_BEHAVIORAL=$(head -n1 <<< "$BEHAVIORAL_COMMITS")

    # extract scope from header for helpful suggestion
    # use sed to avoid bash regex issues with parentheses
    COMMIT_SCOPE=$(echo "$HEADER" | sed -n 's/^[a-z]*(\([^)]*\)):.*/\1/p')

    emit_both "$(
      print_turtle_header "bummer dude..."
      print_tree_start "git.commit.set"
      print_tree_error "branch already has a behavioral commit"
      echo ""
      echo "   first behavioral commit: $FIRST_BEHAVIORAL"
      echo "   attempted: $HEADER"
      echo ""
      if [[ -n "$COMMIT_SCOPE" ]]; then
        echo "   use \`cont:\` or \`cont($COMMIT_SCOPE):\` prefix"
      else
        echo "   use \`cont:\` prefix"
      fi
    )"
    exit 2
  fi
else
  # branch has no behavioral commit yet - first commit must be fix(scope) or feat(scope)
  # chore and other prefixes never trigger tagged releases
  if [[ "$COMMIT_PREFIX" != "fix" && "$COMMIT_PREFIX" != "feat" ]]; then
    emit_both "$(
      print_turtle_header "bummer dude..."
      print_tree_start "git.commit.set"
      print_tree_error "first commit must be fix(<scope>): or feat(<scope>):"
      echo ""
      echo "   attempted: $COMMIT_PREFIX:"
      echo ""
      echo "   the first commit establishes the branch purpose"
      echo "   only fix: and feat: trigger tagged releases"
      echo ""
      echo "   use \`fix(<scope>):\` or \`feat(<scope>):\` for the first behavioral commit"
    )"
    exit 2
  fi

  # guard: first commit must have a scope
  if ! has_scope "$HEADER"; then
    emit_both "$(
      print_turtle_header "bummer dude..."
      print_tree_start "git.commit.set"
      print_tree_error "first commit requires a scope"
      echo ""
      echo "   attempted: $HEADER"
      echo ""
      echo "   the first commit must include a scope for changelog clarity"
      echo "   example: fix(<scope>): or feat(<scope>):"
      echo ""
      echo "   change your commit header to include a scope"
    )"
    exit 2
  fi
fi

# check global blocker (before local quota)
#
# 🔴 .why emit_both = a refusal that reaches stdout alone is a permission denial
#        nobody can audit — a log aggregator, a parent process, or a ci hook
#        that reads stderr sees exit 2 beside an empty stream
#        (rule.require.skill-output-streams: a failure rides BOTH).
#
# 🔴 .why the corrupt note = this gate now fails CLOSED on a damaged file, so
#        `global blocker file corrupt` is reachable here. the lift command is
#        the remedy for a blocker a HUMAN set; it is not the remedy for a file
#        that will not parse. ⇒ the note names the file and how to clear it,
#        and is a no-op on the ordinary blocked case, so one call serves both
#        (rule.require.errors-name-the-fix).
#
# 🔴 .why the EXIT CODE branches on `_CORRUPT` = a human-set block is a
#        constraint the caller's human must lift (exit 2), but a file that
#        will not parse is a malfunction the family classifies as exit 1
#        everywhere else it appears — `guard_org_meter_is_readable` and
#        `refuse_set_state_damaged` both exit 1 for this identical class. an
#        aggregator that sorts exit 1 (malfunction) from exit 2 (constraint)
#        would otherwise read a damaged permission file as bad caller input.
if ! check_global_blocker; then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.set"
    print_tree_error "$GLOBAL_BLOCK_REASON"
    # ⚠️ the two remedies are EXCLUSIVE, so exactly one prints. a lift is what
    #    clears a blocker a human set; it is not what clears a damaged file,
    #    and both at once reads as a menu where the reader must pick.
    if [[ "$GLOBAL_BLOCK_CORRUPT" != "true" ]]; then
      print_instruction "ask your human to lift:" "  \$ git.commit.uses allow --global"
    fi
    print_global_corrupt_note
  )"
  if [[ "$GLOBAL_BLOCK_CORRUPT" == "true" ]]; then
    exit 1  # malfunction — the file is damaged, not the caller's input
  fi
  exit 2
fi

# check org blocker (after global, before local)
# ⇒ the twin of the block above, on the org meter. same two reasons.
if ! check_org_blocker; then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.set"
    print_tree_error "$ORG_BLOCK_REASON"
    # ⚠️ exclusive, as above: `allow --org` writes a key into a file, which is
    #    no remedy for a file that cannot be parsed to write into.
    if [[ "$ORG_BLOCK_CORRUPT" != "true" ]]; then
      print_instruction "ask your human to allow:" "  \$ git.commit.uses allow --org <org>"
    fi
    print_org_corrupt_note
  )"
  if [[ "$ORG_BLOCK_CORRUPT" == "true" ]]; then
    exit 1  # malfunction — the file is damaged, not the caller's input
  fi
  exit 2
fi

# check state file exists
if [[ ! -f "$STATE_FILE" ]]; then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.set"
    print_tree_error "no commit quota set"
    print_instruction "ask your human to grant:" "  \$ git.commit.uses set --quant N --push allow|block"
  )"
  exit 2  # blocked by constraints
fi

# read state
USES=$(jq -r '.uses' "$STATE_FILE")
PUSH_ALLOWED=$(jq -r '.push' "$STATE_FILE")
STAGE_ALLOWED=$(jq -r '.stage // "block"' "$STATE_FILE")

# check uses > 0 or "infinite" (plan mode is allowed without uses)
if [[ "$USES" != "infinite" && "$USES" -le 0 && "$MODE" != "plan" ]]; then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.set"
    print_tree_error "no commit uses left"
    print_instruction "ask your human to grant more:" "  \$ git.commit.uses set --quant N --push allow|block"
  )"
  exit 2  # blocked by constraints
fi

# check push permission
if [[ "$DO_PUSH" == true && "$PUSH_ALLOWED" != "allow" ]]; then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.set"
    print_tree_error "push not allowed in current grant"
    print_instruction "ask your human to grant with --push allow" ""
  )"
  exit 2  # blocked by constraints
fi

######################################################################
# read the bound SPONSOR — the human who answers for this change
#
# .why = `git config` is never read for an identity, on any grove. it
#        names the human on a laptop and the CLONE on a cloud grove,
#        with no signal in the code to tell which — so the trailer read
#        "attributed" while it named zero humans. a sponsor is bound by
#        a human act instead, and where none is bound we refuse.
#
# .why = the read happens HERE, per commit, and is never cached. a tree
#        whose sponsor was cleared must be refused at its very NEXT
#        commit; a value read once per session would let a cleared tree
#        keep its commit, on an authorization no longer held — a stale
#        authorization, which is the defect's own shape.
#
# 🔴 .why = the POSITION of this block is load-bearing, in two directions,
#        and both are about acts a REFUSED commit must not perform:
#
#          1. it sits ahead of `git add -A` (the `--unstaged include`
#             branch below), so a refused commit stages not one file.
#             the guard used to sit AFTER it, and a tree with no sponsor
#             would have every change staged and then be refused — a
#             mutation on the path that reports failure.
#          2. it sits ahead of the meter write (the last act of this
#             skill), so a refused commit spends no quota. otherwise a
#             tree would burn its grant on refusals and need TWO human
#             grants to recover.
#
#        ⇒ the read is PURE and cheap, so it owes no order to the checks
#        below and belongs ahead of every mutation. the sibling command
#        holds the same invariant, and its suite states it outright:
#        "a refused bind must leave the tree exactly as it found it".
######################################################################
SPONSOR_FILE="$METER_DIR/$SPONSOR_STATE_FILENAME"

# .why = the shared reader, never a local jq. this read WAS a local
#        `jq ... 2>/dev/null || echo ""`, which discarded jq's exit status
#        and so collapsed a corrupt state file into the "no sponsor bound"
#        refusal below — it told the human to bind a sponsor they had
#        already bound, and never named the file that was truly at fault
#        (rule.forbid.failhide). the reader keeps the two apart.
#
# .note = the read is FRESH per invocation — never cached across commits, so
#         a cleared tree refuses on its very next commit. it is NOT, however,
#         point-in-time consistent through to the `git commit` call far below:
#         a `git.commit.sponsor del` that lands in that window commits a
#         trailer for a sponsor just cleared. accepted, on the same terms as
#         the set/del race under `F12` — both mutators are human-only and
#         tty-gated, so the window needs a human who clears a sponsor in the
#         seconds their own clone is mid-commit. distinct from F12 all the
#         same: that one is mutator-vs-mutator, this is reader-vs-mutator
#         inside one invocation.
read_sponsor_state "$SPONSOR_FILE" || SPONSOR_READ_STATUS=$?
SPONSOR_READ_STATUS="${SPONSOR_READ_STATUS:-0}"

# an unreadable file is a MALFUNCTION, and it exits 1 — a class apart from
# the unbound tree below, which is a constraint at exit 2. the remedy
# differs too: inspect the file, rather than ask a human for a new bind.
if [[ "$SPONSOR_READ_STATUS" -eq 1 ]]; then
  # .note = the render is SHARED with `git.commit.sponsor get` — the two had
  #         already drifted once on the bind-form set, so the tree now lives in
  #         one leaf and only the label is per-site. the reasons for each line
  #         are on `print_sponsor_corrupt_render`.
  emit_both "$(print_sponsor_corrupt_render "git.commit.set")"
  exit 1  # malfunction
fi

# 🔴 .why it branches on the STATUS, never on the parsed leaves = this read
#        `[[ -z "$SPONSOR_NAME" || -z "$SPONSOR_EMAIL" ]]`, which re-derives
#        from the fields a decision the reader already made. after the
#        reader's gate 2, status 0 guarantees both are non-empty and status 2
#        guarantees both are empty ⇒ the compound reduced to exactly this
#        line, by a longer route.
#
# 🔴 .why = so it was a SECOND, narrower idea of "is a sponsor bound", sat
#        beside the reader that owns the question. correct today, and the
#        exact latent drift the shared reader was built to remove: widen the
#        reader's sense of bound and this caller keeps the old one, silently.
#        one state file, one reader, one decision point.
#
# ⚠️ .why this renders INLINE while the corrupt case above routes through a
#    shared leaf = the leaf was lifted on proven reuse, never on shape. every
#    render that moved to `git.commit.operations.sh` has two or more call sites
#    across two or more skills:
#
#      print_global_corrupt_note     → 4 sites, 3 skills
#      print_sponsor_corrupt_render  → 2 sites, 2 skills (it had already drifted)
#
#    this body has ONE site, here, and it is the only surface that refuses a
#    commit for an unbound tree. to lift it would move a single-use render out
#    of the file that owns it, on a reuse that has not happened
#    (rule.prefer.most-common-denominator: lift is reactive, never speculative;
#    rule.prefer.wet-over-dry: one usage stays inline).
#
# ⇒ the asymmetry is the rule at work rather than an inconsistency in it. lift
#   this the day a second caller needs it, and not before.
if [[ "$SPONSOR_READ_STATUS" -eq 2 ]]; then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.set"
    print_tree_error "no sponsor is bound to this tree"
    echo ""
    echo "   a commit must name the human who authorized it. this tree names"
    echo "   none, so there is nobody to answer for the change."
    echo ""
    echo "   ⛔ you cannot fix this yourself. a sponsor is bound by a human,"
    echo "      at a tty."
    # the two forms that hold on EVERY grove. @me is absent on purpose: it
    # reads the gh session on this host, which on a cloud grove is the
    # clone's — so a mandatory block that printed it would hand the reader
    # a second refusal.
    print_instruction "ask your human to run, in this tree:" "$SPONSOR_BIND_REMEDY"
  )"
  exit 2  # blocked by constraints
fi

# robot identity — the commit is always authored as seaturtle[bot]; the token
# only picks WHICH seaturtle (app bot vs standard) so the commit author equals
# the PR opener (github squash sets squash-author = opener). that match only
# matters under --auth as-ehmpath, where the seaturtle bot opens the pr. under
# --auth as-human the pr opens via the ambient gh login, so no token is needed
# and the commit uses the default standard seaturtle identity. this fetch runs
# AFTER arg-parse (so --help never pays the keyrack cost) and only for
# as-ehmpath (so the as-human fallback escapes keyrack entirely, per the vision).
# in test env we also skip the fetch to keep tests hermetic (default standard).
#
# 🔴 .why it sits HERE, below the sponsor guard = the fetch MUTATES an external
#        store. `fetch_github_token`'s fallback runs `keyrack unlock` whenever
#        the primary get fails, so it is not a read — it changes a store that
#        outlives this process.
#
# 🔴 .why = the sponsor guard's own rationale above says a refused commit must
#        stage not one file and spend no quota. an external unlock is the same
#        claim's third case, and the fetch used to sit ~300 lines AHEAD of the
#        refusal — so a tree with no sponsor unlocked the keyrack and then
#        refused. a mutation on the path that reports failure.
#
# .note = it moved DOWN rather than the guard up, deliberately. every other
#         refusal above keeps its relative order, so no error that fires today
#         fires in a different sequence tomorrow. the vars it sets are first
#         read hundreds of lines below (the plan tree and `--author`), so the
#         move costs the happy path no work at all.
ROBOT_TOKEN=""
ROBOT_TOKEN_FETCHED=false
if [[ "$AUTH" == "as-ehmpath" && "${NODE_ENV:-}" != "test" ]]; then
  # capture the keyrack error rather than discard it: a fetch miss soft-fails to
  # the default seaturtle identity (the commit still lands), but the cause must
  # not vanish — surface it on stderr so the human can tell a network blip from a
  # locked keyrack (rule.forbid.failhide)
  fetch_robot_token
  ROBOT_TOKEN_FETCHED=true
  if [[ -z "$ROBOT_TOKEN" && -n "$TOKEN_FETCH_ERR" ]]; then
    echo "🐢 heads up: the ehmpath keyrack token wasnt fetched; the commit will" >&2
    echo "   author as the default seaturtle. cause: $TOKEN_FETCH_ERR" >&2
  fi

  # failfast: an app token must map to the bot identity we hardcode for it,
  # else the squash-merge could silently show a 3rd contributor
  assert_token_identity_in_sync "$ROBOT_TOKEN" || exit 2
fi
IFS=$'\t' read -r ROBOT_NAME ROBOT_EMAIL < <(get_one_seaturtle_identity "$ROBOT_TOKEN")

# detect work outside the index (unstaged mods + untracked files)
HAS_UNSTAGED_MODS=false
HAS_UNTRACKED=false
if ! git diff --quiet; then
  HAS_UNSTAGED_MODS=true
fi
if [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  HAS_UNTRACKED=true
fi

# guard: unstaged changes must be explicitly handled (before staged check, since include adds them)
WILL_INCLUDE_UNSTAGED=false
if [[ "$HAS_UNSTAGED_MODS" == true || "$HAS_UNTRACKED" == true ]]; then
  if [[ "$UNSTAGED" == "include" ]]; then
    WILL_INCLUDE_UNSTAGED=true
    # only actually add in apply mode
    if [[ "$MODE" == "apply" ]]; then
      git add -A
    fi
  elif [[ "$UNSTAGED" == "ignore" ]]; then
    : # proceed with only staged changes
  else
    emit_both "$(
      print_turtle_header "bummer dude..."
      print_tree_start "git.commit.set"
      print_tree_error "unstaged changes detected"
      echo ""
      echo "unstaged files:"
      git diff --name-only | while read -r f; do echo "  $f"; done
      git ls-files --others --exclude-standard | while read -r f; do echo "  $f (untracked)"; done
      echo ""
      echo "either:"
      echo "  1. stage the changes you want to commit"
      echo "  2. pass --unstaged ignore to commit only staged changes"
      echo "  3. pass --unstaged include to stage all changes before commit"
    )"
    exit 2  # blocked by constraints
  fi
fi

# check staged changes (account for --unstaged include in plan mode)
if [[ "$WILL_INCLUDE_UNSTAGED" == false ]]; then
  if git diff --cached --quiet; then
    NO_STAGED_ERR="error: no changes to commit (no staged changes)"
    echo "$NO_STAGED_ERR"
    echo "$NO_STAGED_ERR" >&2
    exit 2  # blocked by constraints
  fi
else
  # in plan mode with --unstaged include, check that there ARE changes to include
  if git diff --cached --quiet && git diff --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
    NO_CHANGES_ERR="error: no changes to commit"
    echo "$NO_CHANGES_ERR"
    echo "$NO_CHANGES_ERR" >&2
    exit 2  # blocked by constraints
  fi
fi

# get current branch for output
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# compute what meter will show after (skip decrement for infinite)
if [[ "$USES" == "infinite" ]]; then
  NEW_USES="infinite"
else
  NEW_USES=$((USES - 1))
fi
if [[ "$PUSH_ALLOWED" == "allow" ]]; then
  PUSH_DISPLAY="allowed"
else
  PUSH_DISPLAY="blocked"
fi

# collect staged files for output
if [[ "$WILL_INCLUDE_UNSTAGED" == true ]]; then
  STAGED_FILES=$(git diff --cached --name-only; git diff --name-only; git ls-files --others --exclude-standard)
else
  STAGED_FILES=$(git diff --cached --name-only)
fi

######################################################################
# PLAN MODE: show what would happen, then exit
######################################################################
if [[ "$MODE" == "plan" ]]; then
  # preflight push plan before tree output (so errors show clean, not mid-tree)
  PUSH_PLAN_JSON=""
  if [[ "$DO_PUSH" == true ]]; then
    # capture the real exit code rather than mask stdout with a concatenated
    # fallback echo — a `$(cmd || echo fallback)` would splice push.sh's own
    # error json onto the fallback, which corrupts any future read past .status.
    # only substitute the fallback when push.sh emitted an empty result. the
    # json-mode invocation's stderr is discarded: on the failure path below we
    # re-invoke push.sh in tree mode, whose guide already rides BOTH streams, so
    # the cause is never hidden (rule.forbid.failhide).
    PUSH_PLAN_EXIT=0
    PUSH_PLAN_JSON=$("$SCRIPT_DIR/git.commit.push.sh" --mode plan --output json --auth "$AUTH" --pr-title-fallback "$HEADER" 2>/dev/null) || PUSH_PLAN_EXIT=$?
    if [[ -z "$PUSH_PLAN_JSON" ]]; then
      PUSH_PLAN_JSON='{"status":"error","error":"push plan failed"}'
    fi
    PUSH_PLAN_STATUS=$(echo "$PUSH_PLAN_JSON" | jq -r '.status')
    if [[ "$PUSH_PLAN_STATUS" != "planned" ]]; then
      # push plan failed — delegate to push tree output for the user-friendly
      # guide, which push.sh emits to BOTH streams. that tree carries the
      # actionable cause on each stream; plan mode fetches no keyrack token, so
      # there is no extra guide to surface. we do NOT re-echo push.sh's json-mode
      # stderr here — in plan mode it only duplicates the tree's error line and
      # would glue a raw json blob onto the human tree on stderr.
      "$SCRIPT_DIR/git.commit.push.sh" --mode plan --auth "$AUTH" --pr-title-fallback "$HEADER" || true
      exit 2
    fi
  fi

  print_turtle_header "heres the wave..."
  print_tree_start "git.commit.set --mode plan"
  echo "   ├─ commit"
  echo "   │  ├─ header: $HEADER"
  echo "   │  ├─ body"
  render_body_as_tree_lines "$BODY"
  echo "   │  ├─ author"
  echo "   │  │  ├─ name: $ROBOT_NAME"
  echo "   │  │  └─ email: $ROBOT_EMAIL"
  echo "   │  ├─ sponsor"
  echo "   │  │  ├─ name: $SPONSOR_NAME"
  echo "   │  │  ├─ email: $SPONSOR_EMAIL"
  echo "   │  │  └─ source: $SPONSOR_PROVENANCE"
  echo "   │  └─ files"
  render_files_as_tree_lines "$STAGED_FILES"
  if [[ "$DO_PUSH" == true ]]; then
    PUSH_TARGET=$(echo "$PUSH_PLAN_JSON" | jq -r '.push_target')
    PUSH_PR_TITLE=$(echo "$PUSH_PLAN_JSON" | jq -r '.pr_title')
    # surface who opens the pr (the vision requires the tree name it), from the
    # delegated push plan's .auth via the shared label helper
    PUSH_AUTH_WHO=$(get_auth_who_label "$(echo "$PUSH_PLAN_JSON" | jq -r '.auth')")
    echo "   ├─ push: $PUSH_TARGET"
    echo "   ├─ pr"
    echo "   │  ├─ title: $PUSH_PR_TITLE"
    echo "   │  ├─ action: findsert draft"
    echo "   │  └─ opened: $PUSH_AUTH_WHO"
  else
    echo "   ├─ push: skipped"
  fi
  echo "   └─ meter"
  if [[ "$USES" == "infinite" ]]; then
    echo "      ├─ left: unlimited"
  else
    echo "      ├─ left: $USES → $NEW_USES"
  fi
  if [[ "$DO_PUSH" == true && "$NEW_USES" != "infinite" && "$NEW_USES" -le 0 && "$PUSH_ALLOWED" == "allow" ]]; then
    echo "      └─ push: allowed → blocked (revoked)"
  else
    echo "      └─ push: $PUSH_DISPLAY"
  fi
  echo ""
  echo "run with --mode apply to execute"
  exit 0
fi

######################################################################
# APPLY MODE: execute the actual mutations
######################################################################

# create commit
FULL_MESSAGE="$MESSAGE

Co-authored-by: $SPONSOR_NAME <$SPONSOR_EMAIL>"

COMMIT_STDERR_FILE=$(mktemp)
if ! git commit \
  --author="$ROBOT_NAME <$ROBOT_EMAIL>" \
  --message="$FULL_MESSAGE" \
  > /dev/null 2>"$COMMIT_STDERR_FILE"; then
  # commit failure rides BOTH streams (stdout for a terminal viewer, stderr for
  # log aggregation) — a failure is never stdout-only, and every other failure
  # path in this file dual-streams (rule.require.skill-output-streams). build the
  # framed error once (header + tree + the raw git cause), then emit to each
  # stream via a portable dual-echo (not `tee /dev/stderr`, absent in some
  # spawned shells).
  COMMIT_ERR=$(print_turtle_header "bummer dude..."
    print_tree_start "git.commit.set"
    print_tree_error "git commit failed"
    echo ""
    # label the raw git output `cause:` so it reads as the root error, not part of
    # the structured guide — consistent with the keyrack/gh failure guides that
    # prefix their raw diagnostics the same way (rule.forbid.snapshot-visual-blemishes)
    echo "cause: $(cat "$COMMIT_STDERR_FILE")")
  rm -f "$COMMIT_STDERR_FILE"
  echo "$COMMIT_ERR"
  echo "$COMMIT_ERR" >&2
  exit 1
fi
rm -f "$COMMIT_STDERR_FILE"

# push if requested (delegate to git.commit.push)
PUSH_STATUS="skipped"
PR_STATUS=""
PR_AUTH_WHO=""
PUSH_STDERR_FILE=""
PUSH_RESULT_STATUS=""
PUSH_EXIT=0
if [[ "$DO_PUSH" == true ]]; then
  PUSH_STDERR_FILE=$(mktemp)
  # thread the token this process already fetched into the delegate so a composed
  # --push performs exactly ONE keyrack fetch and ONE identity resolution, shared
  # by both the commit author (here) and the pr opener (push.sh). without this the
  # two processes fetch independently: if this fetch fell back to the standard
  # identity while push.sh's later fetch returned an app-bot token, the pr would
  # open under a different identity than the commit — a silent return of the
  # "3rd contributor on squash" bug (v2026_06_26.fix-seatur-contributor). the
  # PREFETCHED flag separates "resolved to empty" from "not threaded", so push.sh
  # reuses an empty result (both failed) rather than a divergent re-fetch. only
  # thread when this process actually fetched (as-ehmpath, non-test).
  if [[ "$ROBOT_TOKEN_FETCHED" == true ]]; then
    export SEATURTLE_PR_TOKEN_PREFETCHED=1
    export SEATURTLE_PR_TOKEN_VALUE="$ROBOT_TOKEN"
  fi
  # capture the delegated exit code (not masked by a `|| echo`) so a failed
  # push/pr-open can propagate below — push.sh still emits its json error
  # object on stdout even when it exits non-zero (e.g. the keyrack guide)
  PUSH_RESULT_JSON=$("$SCRIPT_DIR/git.commit.push.sh" --mode apply --output json --auth "$AUTH" 2>"$PUSH_STDERR_FILE") || PUSH_EXIT=$?
  # guard: if push.sh emitted no json at all (hard crash), synthesize one
  if [[ -z "$PUSH_RESULT_JSON" ]]; then
    PUSH_RESULT_JSON='{"status":"error","error":"push failed"}'
    [[ $PUSH_EXIT -eq 0 ]] && PUSH_EXIT=1
  fi
  PUSH_RESULT_STATUS=$(echo "$PUSH_RESULT_JSON" | jq -r '.status')

  # success path: capture the push target + pr status (no else — the failure
  # path below runs only on the negated status, so the two never overlap)
  if [[ "$PUSH_RESULT_STATUS" == "pushed" ]]; then
    PUSH_TARGET=$(echo "$PUSH_RESULT_JSON" | jq -r '.push_target')
    PUSH_STATUS="$PUSH_TARGET ✓"
    PR_STATUS=$(echo "$PUSH_RESULT_JSON" | jq -r '.pr_status')
    # surface who opened the pr (the vision requires the tree name it), from the
    # delegated push result's .auth via the shared label helper
    PR_AUTH_WHO=$(get_auth_who_label "$(echo "$PUSH_RESULT_JSON" | jq -r '.auth')")
    rm -f "$PUSH_STDERR_FILE"
  fi

  # failure path: only when the push/pr-open did not succeed
  if [[ "$PUSH_RESULT_STATUS" != "pushed" ]]; then
    PUSH_ERR=$(echo "$PUSH_RESULT_JSON" | jq -r '.error // "push failed"')
    PUSH_STATUS="error: $PUSH_ERR"
    # replay the delegated push guide (keyrack errors, fallback hint, etc.).
    # it is failure output, so it rides BOTH streams — a stdout-only consumer
    # (a ci log scan) must see the actionable guide, not just the short
    # push:error line in the summary tree below (rule.require.skill-output-streams).
    # push.sh already dual-streams this guide when run directly; the composer
    # captured only its stderr copy, so we fan it back out to both here. a blank
    # separator on each stream keeps the guide's last command line apart from the
    # set banner that follows.
    if [[ -s "$PUSH_STDERR_FILE" ]]; then
      cat "$PUSH_STDERR_FILE"
      echo ""
      cat "$PUSH_STDERR_FILE" >&2
      echo "" >&2
    fi
    rm -f "$PUSH_STDERR_FILE"
    # the commit landed, but the push/pr-open did not — a keyrack fallback
    # event is exactly what the caller must see and act on. carry a non-zero
    # exit (default to constraint) so the composed command never reports success
    [[ $PUSH_EXIT -eq 0 ]] && PUSH_EXIT=2
  fi
fi

# update uses in state file (preserve stage, write "infinite" as string)
if [[ "$NEW_USES" == "infinite" ]]; then
  cat > "$STATE_FILE" << EOF
{
  "uses": "infinite",
  "push": "$PUSH_ALLOWED",
  "stage": "$STAGE_ALLOWED"
}
EOF
else
  cat > "$STATE_FILE" << EOF
{
  "uses": $NEW_USES,
  "push": "$PUSH_ALLOWED",
  "stage": "$STAGE_ALLOWED"
}
EOF
fi

# auto-revoke push if uses depleted and push was executed
if [[ "$DO_PUSH" == true && "$PUSH_RESULT_STATUS" == "pushed" && "$NEW_USES" != "infinite" && "$NEW_USES" -le 0 && "$PUSH_ALLOWED" == "allow" ]]; then
  PUSH_ALLOWED="block"
  cat > "$STATE_FILE" << EOF
{
  "uses": $NEW_USES,
  "push": "block",
  "stage": "$STAGE_ALLOWED"
}
EOF
  PUSH_DISPLAY="blocked (revoked)"
fi

# output with turtle vibes — cowabunga only when the push actually shipped;
# a requested-but-failed push still landed the commit, so it reads as righteous
# (the push: error line + non-zero exit convey the failure — never a celebratory
# header next to an error, per the vision's "two identities" awkwardness note).
# default to righteous; a shipped push overrides it (no else — one linear path)
SET_HEADER="righteous!"
[[ "$DO_PUSH" == true && "$PUSH_RESULT_STATUS" == "pushed" ]] && SET_HEADER="cowabunga!"

# build the summary once, then route it by stream: stdout always, and ALSO stderr
# when the delegated push/pr-open failed — so a stderr-only consumer (a ci log
# scan, a hook) sees the composed failure summary, not just the push guide that
# push.sh already put on stderr (rule.require.skill-output-streams: a failure
# rides both streams). push.sh duplicates its own failure output the same way;
# the composer now matches it. on success the summary stays stdout-only.
SET_OUTPUT=$(
  print_turtle_header "$SET_HEADER"

  print_tree_start "git.commit.set"
  echo "   ├─ commit"
  echo "   │  ├─ header: $HEADER"
  echo "   │  ├─ body"
  render_body_as_tree_lines "$BODY"
  echo "   │  ├─ author"
  echo "   │  │  ├─ name: $ROBOT_NAME"
  echo "   │  │  └─ email: $ROBOT_EMAIL"
  echo "   │  └─ sponsor"
  echo "   │     ├─ name: $SPONSOR_NAME"
  echo "   │     ├─ email: $SPONSOR_EMAIL"
  echo "   │     └─ source: $SPONSOR_PROVENANCE"
  echo "   ├─ push: $PUSH_STATUS"
  if [[ -n "$PR_STATUS" ]]; then
    echo "   ├─ pr: $PR_STATUS"
  fi
  # state who opened the pr (per the vision), when the pr-open actually happened
  if [[ -n "$PR_AUTH_WHO" ]]; then
    echo "   ├─ opened: $PR_AUTH_WHO"
  fi
  echo "   └─ meter"
  if [[ "$NEW_USES" == "infinite" ]]; then
    echo "      ├─ left: unlimited"
  else
    echo "      ├─ left: $NEW_USES"
  fi
  echo "      └─ push: $PUSH_DISPLAY"

  # remind to watch CI after push
  if is_push_shipped "$DO_PUSH" "$PUSH_STATUS"; then
    echo ""
    echo "🌊 now lets ride the release wave and catch any wipeouts"
    echo "   └─ rhx git.release --watch || rhx show.gh.test.errors"
  fi
)

# stdout always; on a delegated push/pr-open failure, duplicate to stderr too
echo "$SET_OUTPUT"
is_push_failed "$DO_PUSH" "$PUSH_RESULT_STATUS" && echo "$SET_OUTPUT" >&2

# propagate a delegated push/pr-open failure as a non-zero exit — the commit
# landed, but a composed `git.commit.set … --push` must not report success when
# the push did not complete, or a chained caller (&&, ci, watch-release) would
# believe work shipped when none did
if is_push_failed "$DO_PUSH" "$PUSH_RESULT_STATUS"; then
  exit "$PUSH_EXIT"
fi
