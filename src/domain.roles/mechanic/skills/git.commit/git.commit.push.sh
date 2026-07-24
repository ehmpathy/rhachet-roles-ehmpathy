#!/usr/bin/env bash
######################################################################
# .what = push HEAD commit to origin and findsert pr
#
# .why  = mechanics can push after a commit was already made,
#         or git.commit.set can compose with this for --push
#
# usage:
#   git.commit.push                                         # plan mode, tree output
#   git.commit.push --mode apply                            # execute push
#   git.commit.push --mode apply --output json              # json output (for composition)
#   git.commit.push --mode plan --output json --pr-title-fallback "feat: cool feature"
#
# guarantee:
#   - only pushes if HEAD commit was authored by seaturtle[bot]
#   - only pushes if push permission granted in .meter/git.commit.uses.jsonc
#   - never pushes to main/master
#   - opens the pr under --auth: as-ehmpath (default) needs the ehmpath keyrack
#     token; as-human uses the ambient gh cli login (no keyrack token needed)
#   - does NOT decrement uses (that is git.commit.set's job)
#   - defaults to plan mode (preview only); use --mode apply to execute
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"
source "$SCRIPT_DIR/git.commit.operations.sh"
source "$SCRIPT_DIR/keyrack.operations.sh"

# robot identity (label for messages; guard accepts any seaturtle identity)
ROBOT_NAME="seaturtle[bot]"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/git.commit.uses.jsonc"

# parse arguments
MODE="plan"
OUTPUT="tree"
PR_TITLE_FALLBACK=""
DEBUG="false"
AUTH="$AUTH_DEFAULT" # shared default from git.commit.operations.sh

while [[ $# -gt 0 ]]; do
  case $1 in
    --mode)
      MODE="$2"
      shift 2
      ;;
    --output)
      OUTPUT="$2"
      shift 2
      ;;
    --auth)
      AUTH="$2"
      shift 2
      ;;
    --pr-title-fallback)
      PR_TITLE_FALLBACK="$2"
      shift 2
      ;;
    --debug)
      DEBUG="true"
      shift
      ;;
    --help|-h)
      echo "usage: git.commit.push [--mode plan|apply] [--auth as-ehmpath|as-human] [--output tree|json] [--pr-title-fallback \"...\"] [--debug]"
      echo ""
      echo "options:"
      echo "  --mode plan|apply            plan shows preview, apply executes (default: plan)"
      echo "  --auth as-ehmpath|as-human   who opens the pr (default: as-ehmpath)"
      echo "                               as-ehmpath = seaturtle bot via ehmpath keyrack token"
      echo "                               as-human   = the gh cli login (fallback on keyrack failure)"
      echo "  --output tree|json           tree for standalone, json for composition (default: tree)"
      echo "  --pr-title-fallback \"...\"    fallback pr title when no commits on branch yet"
      echo "  --debug                      show verbose debug output"
      echo "  --help, -h                   show this help"
      exit 0
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift 2
      ;;
    --)
      shift
      ;;
    --*)
      echo "error: unknown option: $1"
      echo "usage: git.commit.push [--mode plan|apply] [--output tree|json]"
      exit 2
      ;;
    *)
      shift
      ;;
  esac
done

# validate the enum-valued flags (each errors to both streams + exit 2 via the
# shared guard in output.sh, so their text cannot drift from set.sh's copies)
validate_enum_arg "$MODE" "--mode" "" plan apply
validate_enum_arg "$OUTPUT" "--output" "" tree json
validate_enum_arg "$AUTH" "--auth" "" "${AUTH_VALID_VALUES[@]}"

# human-readable label for the pr-open auth source (shared with git.commit.set
# so the composed success tree names the same credential — see get_auth_who_label)
AUTH_WHO=$(get_auth_who_label "$AUTH")

######################################################################
# helper: emit error in the chosen output format
# note: errors go to both stdout and stderr per skill output streams brief
######################################################################
emit_error() {
  local message="$1"
  # default to the tree format; the json branch overrides it (no else — the
  # emit-to-both-streams tail is shared, so keep one linear path)
  local output
  output=$(print_turtle_header "bummer dude..."
    print_tree_start "git.commit.push"
    print_tree_error "$message")
  if [[ "$OUTPUT" == "json" ]]; then
    output=$(printf '{"status":"error","error":"%s"}\n' "$(escape_json_string "$message")")
  fi
  # output to both stdout and stderr
  echo "$output"
  echo "$output" >&2
}

######################################################################
# helper (pure transformer): order the two pr-open fixes by --auth
# .what = given the mode-specific fix (label + cmd), return the ordered pair
#         of fixes as four tab-separated fields:
#         prefer_label \t prefer_cmd \t alt_label \t alt_cmd
# .why  = the order is a pure decision (a function of $AUTH), separable from the
#         guide's i/o. as a transformer it lets emit_pr_open_guide read as a
#         straight compose of print_* calls (rule.forbid.decode-friction-in-orchestrators).
# .note = keyrack leads by default (the vision's preferred bias); under as-human
#         the caller already opted out of keyrack, so the mode fix leads and
#         keyrack becomes the "instead" alternative.
# args = fix2_label, fix2_cmd
######################################################################
get_ordered_pr_fixes() {
  local fix2_label="$1" fix2_cmd="$2"
  local keyrack_label="unlock the ehmpath keyrack, so the seaturtle can open the pr"
  # name the specific key (rule.require.narrow-keyrack-unlocks): a bare unlock
  # would prompt for every declared key (e.g. aws sso), so scope the hint to the
  # one github token this path needs.
  local keyrack_cmd="rhx keyrack unlock --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN"

  # under as-human the caller already opted out of keyrack, so the mode fix leads
  # (trailing newline lets the caller's `read` return 0 under set -e)
  if [[ "$AUTH" == "as-human" ]]; then
    printf '%s\t%s\t%s\t%s\n' \
      "$fix2_label" "$fix2_cmd" "$keyrack_label instead" "$keyrack_cmd"
    return
  fi

  # otherwise keyrack (the preferred default) leads and the mode fix is the alt
  printf '%s\t%s\t%s\t%s\n' \
    "$keyrack_label" "$keyrack_cmd" "$fix2_label" "$fix2_cmd"
}

######################################################################
# helper: guide the caller when the pr-open step lacks a usable credential
# .what = emit a pr-open guide (both streams) and exit 2 — the commit is
#         already pushed; only the pr-open needs auth, so name the fix and let
#         the caller act, never a dead end.
# .why  = both pr-open failure modes share one shape: the ehmpath keyrack token
#         is absent, or no gh credential is usable at all. each names two fixes
#         (unlock keyrack, or the mode-specific second fix). one helper holds
#         that shared line and the both-streams + json/tree + exit-2 path unified,
#         so a copy cannot diverge (rule.prefer.wet-over-dry, 3rd use).
# .note = the fix order is decided by the pure get_ordered_pr_fixes transformer;
#         the fix2 label is passed bare — this helper renders it as numbered fix
#         #1 or #2 (the "or" prefix rides #2) per that order.
# args = error_line, fix2_label, fix2_cmd, json_error, [detail]
######################################################################
emit_pr_open_guide() {
  local error_line="$1" fix2_label="$2" fix2_cmd="$3" json_error="$4" detail="${5:-}"

  # order the two fixes (pure decision, delegated to the transformer)
  local prefer_label prefer_cmd alt_label alt_cmd
  IFS=$'\t' read -r prefer_label prefer_cmd alt_label alt_cmd \
    < <(get_ordered_pr_fixes "$fix2_label" "$fix2_cmd")

  # render as a tree guide (the keyrack.yml-not-found guide shape): a generic
  # header, the specific cause on the `error:` line, then a 🥥 block of two
  # numbered fixes — #1 leads, #2 carries the "or" prefix.
  local guide
  guide=$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.push"
    print_tree_error "$error_line"
    echo ""
    echo "🥥 your commit is pushed; to open its pr, either:"
    echo "   ├─ 1. ${prefer_label}:"
    echo "   │     \$ ${prefer_cmd}"
    echo "   │"
    echo "   └─ 2. or ${alt_label}:"
    echo "         \$ ${alt_cmd}"
  )
  # the human-readable guide always rides stderr; stdout carries the
  # mode-appropriate failure — a json error object in json mode (machine-safe
  # for a composer), the prose guide in tree mode (rule.require.skill-output-streams)
  echo "$guide" >&2
  # blank line before the cause: detail so the raw diagnostic reads as its own
  # paragraph — uniform with the push/commit failure paths and the blank-line
  # paragraph convention used throughout these trees (rule.forbid.snapshot-visual-blemishes)
  [[ -n "$detail" ]] && { echo "" >&2; echo "$detail" >&2; }
  # json mode short-circuits to a machine-safe error; tree mode is the linear
  # default that follows (no else — one path each, early-return the json case)
  if [[ "$OUTPUT" == "json" ]]; then
    printf '{"status":"error","error":"%s"}\n' "$(escape_json_string "$json_error")"
    exit 2  # caller must act: unlock keyrack, or the mode-specific second fix
  fi
  echo "$guide"
  exit 2  # caller must act: unlock keyrack, or the mode-specific second fix
}

######################################################################
# GUARDS
######################################################################

# guard: global blocker must not be active
if ! check_global_blocker; then
  emit_error "$GLOBAL_BLOCK_REASON"
  if [[ "$OUTPUT" == "tree" ]]; then
    print_instruction "ask your human to lift:" "  \$ git.commit.uses allow --global"
  fi
  exit 2
fi

# guard: org blocker must not be active
if ! check_org_blocker; then
  emit_error "$ORG_BLOCK_REASON"
  if [[ "$OUTPUT" == "tree" ]]; then
    # different guidance based on error type
    if [[ "$ORG_BLOCK_REASON" == *"keyrack.yml not found"* ]]; then
      # output to both stdout and stderr per skill output streams brief
      KEYRACK_HINT=$(cat <<'EOF'

🥥 to fix this, ask a human to either:
   ├─ 1. add .agent/keyrack.yml with their org:
   │     $ echo 'org: ehmpathy' > .agent/keyrack.yml
   │
   └─ 2. or add the ehmpath keyrack, so ehmpaths like us can unlock our own keys:
         $ npx rhachet run --init keyrack.ehmpath
EOF
)
      echo "$KEYRACK_HINT"
      echo "$KEYRACK_HINT" >&2
    else
      print_instruction "ask your human to allow:" "  \$ git.commit.uses allow --org <org>"
    fi
  fi
  exit 2
fi

# guard: push must be allowed
PUSH_ALLOWED=""
USES=0
if [[ -f "$STATE_FILE" ]]; then
  PUSH_ALLOWED=$(jq -r '.push' "$STATE_FILE")
  USES=$(jq -r '.uses' "$STATE_FILE")
fi
if [[ "$PUSH_ALLOWED" != "allow" ]]; then
  emit_error "push not allowed"
  if [[ "$OUTPUT" == "tree" ]]; then
    print_instruction "ask your human to grant with --push allow:" "  \$ git.commit.uses set --quant N --push allow"
  fi
  exit 2  # blocked by constraints
fi

# guard: author check (apply mode only — plan mode skips since commit may not exist yet)
if [[ "$MODE" == "apply" ]]; then
  HEAD_AUTHOR=$(git log -1 --format='%an')
  if ! is_one_seaturtle_identity_name "$HEAD_AUTHOR"; then
    emit_error "HEAD commit not authored by $ROBOT_NAME"
    if [[ "$OUTPUT" == "tree" ]]; then
      # dual-stream the fix-hint so the stderr-only path also names the fix, to
      # match the dual-streamed error above (rule.require.errors-name-the-fix +
      # rule.require.skill-output-streams)
      AUTHOR_FIX=$(echo ""
        echo "push only works for commits made by $ROBOT_NAME."
        echo "use git.commit.set to create a proper commit first.")
      echo "$AUTHOR_FIX"
      echo "$AUTHOR_FIX" >&2
    fi
    exit 2  # blocked by constraints
  fi
fi

# guard: cannot push to main/master
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
  emit_error "cannot push directly to $CURRENT_BRANCH"
  if [[ "$OUTPUT" == "tree" ]]; then
    # the fix-hint rides BOTH streams so a stderr-only consumer still sees the
    # remediation, not just the bare error — emit_error already dual-streams the
    # error line above, so the hint must match or the stderr path reads as a
    # fix-less dead end (rule.require.errors-name-the-fix + skill-output-streams)
    BRANCH_FIX=$(echo ""
      echo "create a feature branch first:"
      echo "  \$ git checkout -b turtle/your-branch-name")
    echo "$BRANCH_FIX"
    echo "$BRANCH_FIX" >&2
  fi
  exit 2  # blocked by constraints
fi

######################################################################
# COMPUTE PR TITLE (from first behavioral commit on branch)
######################################################################
# find the first behavioral commit (fix/feat) - this is stable regardless
# of how many cont: commits are added later
BEHAVIORAL_COMMIT_HASH=$(get_first_behavioral_commit_hash)

# extract PR title and body from the behavioral commit
PR_TITLE=""
PR_BODY=""
if [[ -n "$BEHAVIORAL_COMMIT_HASH" && "$BEHAVIORAL_COMMIT_HASH" != "NO_COMMITS" && "$BEHAVIORAL_COMMIT_HASH" != "NO_BASE" && "$BEHAVIORAL_COMMIT_HASH" != "ON_BASE" ]]; then
  PR_TITLE=$(git log -1 --format=%s "$BEHAVIORAL_COMMIT_HASH" 2>/dev/null || echo "")
  # capture the full body first, then cap at 50 lines via `head <<<` — a
  # `git log | head -50` pipe would SIGPIPE git (141) under pipefail on a long body
  PR_BODY_FULL=$(git log -1 --format=%B "$BEHAVIORAL_COMMIT_HASH" 2>/dev/null || echo "")
  PR_BODY=$(head -50 <<< "$PR_BODY_FULL")
fi

# fallback: use provided fallback, or HEAD commit message
if [[ -z "$PR_TITLE" && -n "$PR_TITLE_FALLBACK" ]]; then
  PR_TITLE="$PR_TITLE_FALLBACK"
fi
if [[ -z "$PR_TITLE" ]]; then
  PR_TITLE=$(git log -1 --format=%s 2>/dev/null || echo "")
fi
if [[ -z "$PR_BODY" ]]; then
  PR_BODY=$(git log -1 --format=%B 2>/dev/null || echo "")
fi

PUSH_TARGET="origin/$CURRENT_BRANCH"

######################################################################
# PLAN MODE: show what would happen, then exit
######################################################################
if [[ "$MODE" == "plan" ]]; then
  if [[ "$OUTPUT" == "json" ]]; then
    # escape quotes in pr title for valid json
    PR_TITLE_ESCAPED=$(echo "$PR_TITLE" | sed 's/"/\\"/g')
    printf '{"status":"planned","push_target":"%s","pr_title":"%s","pr_action":"findsert","auth":"%s"}\n' \
      "$PUSH_TARGET" "$PR_TITLE_ESCAPED" "$AUTH"
  else
    print_turtle_header "heres the wave..."
    print_tree_start "git.commit.push --mode plan"
    echo "   ├─ push: $PUSH_TARGET"
    echo "   ├─ pr"
    echo "   │  ├─ title: $PR_TITLE"
    echo "   │  ├─ action: findsert"
    echo "   │  └─ opened: $AUTH_WHO"
    echo "   └─ meter"
    if [[ "$USES" != "infinite" && "$USES" -le 0 ]]; then
      echo "      └─ push: allowed → blocked (revoked)"
    else
      echo "      └─ push: allowed"
    fi
    echo ""
    echo "run with --mode apply to execute"
  fi
  exit 0
fi

######################################################################
# APPLY MODE: execute the push + pr findsert
######################################################################

# push first — the transport uses ambient git creds and never needs the
# keyrack token, so it must not sit behind the pr-open auth. the push runs
# un-gated, so a keyrack outage can never strand a commit locally (see 1.vision).
[[ "$DEBUG" == "true" ]] && echo "[debug] apply mode: push to origin..." >&2

PUSH_EXIT=0
PUSH_OUTPUT=$(git push origin HEAD --force-with-lease 2>&1) || PUSH_EXIT=$?
[[ "$DEBUG" == "true" ]] && echo "[debug] push exit=$PUSH_EXIT" >&2
[[ "$DEBUG" == "true" ]] && echo "[debug] push output: $PUSH_OUTPUT" >&2

if [[ $PUSH_EXIT -ne 0 ]]; then
  # transport failed: the message rides BOTH streams (stdout for a terminal or a
  # stdout-only consumer, stderr for log aggregation) and is json-aware — a push
  # failure is never stdout-silent (rule.require.skill-output-streams). emit_error
  # carries the headline to both streams + the json object; the raw git output
  # follows on both streams in tree mode so the human sees WHY it failed.
  emit_error "git push failed"
  if [[ "$OUTPUT" == "tree" ]]; then
    # label the raw git output `cause:` so it reads as the root error, not part of
    # the structured guide — consistent with the keyrack/gh failure guides that
    # prefix their raw diagnostics the same way (rule.forbid.snapshot-visual-blemishes)
    PUSH_FAIL_DETAIL=$(echo ""; echo "cause: $PUSH_OUTPUT"; echo "")
    echo "$PUSH_FAIL_DETAIL"
    echo "$PUSH_FAIL_DETAIL" >&2
  fi
  exit 1
fi

PUSH_STATUS="$PUSH_TARGET ✓"

# pick the pr-open auth
# - as-human   → no token; gh uses the human's own `gh auth login` session
# - as-ehmpath → fetch the ehmpath keyrack token so the seaturtle bot opens the pr
GH_PR_TOKEN=""
if [[ "$AUTH" == "as-ehmpath" ]]; then
  # reuse a token an upstream git.commit.set already fetched, if it threaded one.
  # a composed --push then performs exactly ONE keyrack fetch and ONE identity
  # resolution shared by the commit author (set.sh) and the pr opener (here), so
  # the two cannot diverge into the "3rd contributor on squash" bug. the
  # PREFETCHED flag means "resolved upstream" even when the value is empty (the
  # upstream fetch failed) — so we reuse an empty result rather than re-fetch a
  # possibly-divergent one. default GH_PR_TOKEN to the threaded value; only fetch
  # when not threaded (a standalone invocation) — single if, no else.
  GH_PR_TOKEN="${SEATURTLE_PR_TOKEN_VALUE:-}"
  TOKEN_FETCH_ERR=""
  if [[ "${SEATURTLE_PR_TOKEN_PREFETCHED:-}" != "1" ]]; then
    # standalone: fetch via the shared communicator (the same operation
    # git.commit.set uses) — it tries the default owner, then the ehmpath keyrack
    # fallback, and echoes an empty string when the token is unreachable.
    [[ "$DEBUG" == "true" ]] && echo "[debug] as-ehmpath: fetch token via fetch_github_token..." >&2
    # capture the fetch's stderr (not /dev/null) so a real failure — network
    # timeout, daemon down, corrupted credential store — is surfaced in the guide
    # detail rather than hidden behind a generic message (rule.forbid.failhide)
    TOKEN_FETCH_ERR_FILE=$(mktemp)
    GH_PR_TOKEN=$(fetch_github_token 2>"$TOKEN_FETCH_ERR_FILE" || echo "")
    TOKEN_FETCH_ERR=$(cat "$TOKEN_FETCH_ERR_FILE")
    rm -f "$TOKEN_FETCH_ERR_FILE"

    # strong identity check on a freshly-fetched token: the same graphql-verified
    # assert git.commit.set runs after its fetch (set.sh), recomposed onto this
    # standalone path so the guarantee holds at BOTH fetch sites. the local name
    # check below (:432) only compares a prefix-derived name to HEAD_AUTHOR; it
    # cannot catch a ghs_ token rotated to a DIFFERENT app installation (same
    # prefix, different bot id) — assert_token_identity_in_sync verifies the live
    # bot id via graphql and fails loud on that divergence. the composed path
    # (PREFETCHED=1) already verified once in set.sh, so it skips this branch and
    # pays no redundant round-trip.
    assert_token_identity_in_sync "$GH_PR_TOKEN" || exit 2
  fi

  # keyrack unreachable → the commit is already pushed; only the pr-open is
  # blocked. guide the caller to the as-human fallback instead of a dead end.
  if [[ -z "$GH_PR_TOKEN" ]]; then
    # the json error stays concise and deterministic — a machine-safe retry hint,
    # not a place to embed a multi-line keyrack trace. the commit is already
    # pushed, so the idempotent retry is git.commit.push (not git.commit.set, which
    # would fail-fast on the now-empty stage). name the concrete command so the
    # guide's advice actually ships it.
    TOKEN_JSON_ERROR="ehmpath keyrack token unavailable — retry: rhx git.commit.push --mode apply --auth as-human (or unlock keyrack)"
    # surface the real fetch cause (network timeout, locked keyrack, daemon down)
    # as a stderr detail line in BOTH modes, so the human learns WHY the fetch
    # failed instead of a generic message (rule.forbid.failhide). it rides stderr —
    # the diagnostic channel — so the pretty stdout guide stays clean of the raw
    # trace, and the json stdout stays a concise machine object.
    TOKEN_CAUSE=""
    [[ -n "$TOKEN_FETCH_ERR" ]] && TOKEN_CAUSE="cause: $TOKEN_FETCH_ERR"
    emit_pr_open_guide \
      "ehmpath keyrack token not available" \
      "open the pr with the human's github login" \
      "rhx git.commit.push --mode apply --auth as-human" \
      "$TOKEN_JSON_ERROR" \
      "$TOKEN_CAUSE"
  fi

  # identity-sync guard: the fetched token must imply the SAME seaturtle identity
  # that HEAD was already committed under. github sets the squash author to the pr
  # opener, so if this token opens the pr under a different bot than the commit's
  # author, the squash shows a 3rd contributor (v2026_06_26.fix-seatur-contributor).
  # a composed --push threads set.sh's token, so its identity matches by
  # construction; but a STANDALONE as-ehmpath retry (the fix the guide names) can
  # fetch a token whose kind differs from the one at commit time (rotation,
  # pat↔app swap, or a keyrack-fallback commit later pushed once keyrack recovers).
  # fail loud on a proven divergence rather than silently open a mismatched pr.
  # only in apply mode, where HEAD_AUTHOR is set and a real commit exists.
  if [[ "$MODE" == "apply" && -n "$GH_PR_TOKEN" ]]; then
    IFS=$'\t' read -r PR_OPENER_NAME _ < <(get_one_seaturtle_identity "$GH_PR_TOKEN")
    if [[ "$PR_OPENER_NAME" != "$HEAD_AUTHOR" ]]; then
      emit_error "pr-open identity out of sync with the commit author"
      if [[ "$OUTPUT" == "tree" ]]; then
        echo ""
        echo "the commit was authored by: $HEAD_AUTHOR"
        echo "but the keyrack token opens the pr as: $PR_OPENER_NAME"
        echo "opening the pr now would show a 3rd contributor on squash."
        echo ""
        echo "fix: open the pr with the human's github login instead — the commit is already pushed"
        echo "  rhx git.commit.push --mode apply --auth as-human"
      fi
      exit 2  # caller must fix: identities diverged
    fi
  fi
fi

# .what = run gh for a pr op with the pr-open auth resolved above
# .why  = as-ehmpath supplies the ehmpath keyrack token via GH_TOKEN; as-human
#         strips any ambient GH_TOKEN/GITHUB_TOKEN so it opens the pr strictly
#         under the human's `gh auth login` session — never an inherited token
#         (a ci runner or the shell may export one, possibly the very expired
#         credential the fallback exists to escape). mirrors git.release.sh's
#         `unset GITHUB_TOKEN` intent. one wrapper keeps both pr-op call sites
#         (list, create) on a single auth path.
run_gh() {
  # as-human (no token): strip any ambient GH_TOKEN/GITHUB_TOKEN and run
  if [[ -z "$GH_PR_TOKEN" ]]; then
    env -u GH_TOKEN -u GITHUB_TOKEN gh "$@"
    return
  fi

  # as-ehmpath: supply the ehmpath keyrack token as GH_TOKEN
  GH_TOKEN="$GH_PR_TOKEN" gh "$@"
}

# .what = strip Co-authored-by trailers and blank tail lines from a pr body
# .why  = the commit message carries Co-authored-by: trailers (the human's git
#         identity), but the pr BODY must not echo them — they leak the human's
#         email onto the public pr, and github already renders co-authors from the
#         commit itself. a named transformer keeps the orchestrator readable
#         (rule.require.named-transformers): the call site reads intent, not a
#         grep|sed pipeline to decode.
# usage: clean=$(get_clean_pr_body "$PR_BODY")
get_clean_pr_body() {
  local body="$1"
  # grep -v drops the trailer lines (exit 1 when none match → || true); the sed
  # collapses any blank lines the removal leaves at the tail
  echo "$body" | { grep -v '^Co-authored-by:' || true; } | sed -e :a -e '/^\n*$/{$d;N;ba;}'
}

# .what = judge whether a failed gh pr-op failed for lack of a usable credential
# .why  = the two-fix guide must fire only on a pr-open auth failure, per the
#         vision's "guide fires only where it helps" — an unrelated gh failure
#         (protected branch, no commits, rate limit) must NOT misdirect the
#         caller to re-auth. match only the signatures gh emits with no token.
# .fragility = this gates the guide on gh's freeform stderr text, and gh is a
#         third-party cli. if a future gh release rewords an auth error (e.g.
#         'not logged in' → 'no active account', or drops 'gh_token'), a real
#         auth failure would slip past this match and the guide would go silent —
#         the dead-end the vision exists to prevent. there is no structural
#         backstop, so on a gh upgrade re-verify these signatures against gh's
#         current auth-error text. case27 locks the negative path (a NON-auth gh
#         failure must NOT match) but cannot catch a reworded auth phrase, so
#         this note is the guard against that drift.
is_gh_auth_failure() {
  # note: `grep -q <<<` (not `echo | grep -q`) avoids a SIGPIPE race under
  # pipefail, where grep -q closes the pipe on first match and echo dies with 141
  grep -qiE 'authentication|authenticate|unauthorized|http 401|bad credentials|gh auth login|not logged in|gh_token' <<< "$1"
}

# .what = guide the caller when the pr-open credential is unusable under both modes
# .why  = the vision requires: when both the ehmpath keyrack token AND the human
#         gh login are unavailable, fail loud with two named fixes (unlock keyrack,
#         or gh auth login) — never a bare gh stack trace. the guide states both,
#         so it is correct whichever mode failed. the commit is already pushed;
#         only the pr-open is on hold.
emit_gh_auth_guide() {
  # label the raw gh output as the cause, to match the keyrack path's
  # `cause: $TOKEN_FETCH_ERR` — so the guide's diagnostic reads as an intentional
  # annotation, not leaked gh noise (consistent across both pr-open guide sites)
  local cause=""
  [[ -n "$1" ]] && cause="cause: $1"
  emit_pr_open_guide \
    "no usable gh credential to open the pr" \
    "log in the human's github, so the as-human fallback works" \
    "gh auth login" \
    "pr-open credential unusable — unlock keyrack or run gh auth login" \
    "$cause"
}

# findsert draft pr
[[ "$DEBUG" == "true" ]] && echo "[debug] findsert pr for branch $CURRENT_BRANCH..." >&2

PR_STATUS=""
PR_LIST_OUTPUT=""
PR_LIST_EXIT=0
PR_LIST_OUTPUT=$(run_gh pr list --head "$CURRENT_BRANCH" --json number --jq '.[0].number' 2>&1) || PR_LIST_EXIT=$?
[[ "$DEBUG" == "true" ]] && echo "[debug] pr list exit=$PR_LIST_EXIT, output: '$PR_LIST_OUTPUT'" >&2

# the earliest signal of an unusable pr-open credential: guide now, before a
# doomed create attempt, when the list failed for lack of auth (both modes)
if [[ $PR_LIST_EXIT -ne 0 ]] && is_gh_auth_failure "$PR_LIST_OUTPUT"; then
  emit_gh_auth_guide "$PR_LIST_OUTPUT"
fi

PR_FOUND=""
if [[ $PR_LIST_EXIT -eq 0 && -n "$PR_LIST_OUTPUT" && "$PR_LIST_OUTPUT" != "null" ]]; then
  PR_FOUND="$PR_LIST_OUTPUT"
fi
[[ "$DEBUG" == "true" ]] && echo "[debug] pr found: '$PR_FOUND'" >&2

# PR_OK decomposes the pr-open outcome from the git-push transport: the push
# can succeed while the pr-open fails (branch protection, rate limit). without
# this split a failed pr-open would ride the push's success and exit 0, so a
# chained caller (`... --push && rhx git.release`) would believe a pr exists.
PR_OK=true

# found: record the extant pr (guard-clause, no else)
if [[ -n "$PR_FOUND" ]]; then
  PR_STATUS="pr #$PR_FOUND (found)"
fi

# create: only when no pr was found (guarded on the negated condition — no else,
# so the narrative stays linear per rule.forbid.else-branches)
if [[ -z "$PR_FOUND" ]]; then
  # strip Co-authored-by trailers from PR body (privacy: avoid email leak)
  PR_BODY_CLEAN=$(get_clean_pr_body "$PR_BODY")
  PR_BODY_FULL="$PR_BODY_CLEAN

---
🐢🌊 surfed in by seaturtle[bot]"
  [[ "$DEBUG" == "true" ]] && echo "[debug] pr create as $AUTH (token len=${#GH_PR_TOKEN})" >&2
  PR_CREATE_OUTPUT=""
  PR_CREATE_EXIT=0
  PR_CREATE_OUTPUT=$(run_gh pr create \
    --title "$PR_TITLE" \
    --body "$PR_BODY_FULL" \
    2>&1) || PR_CREATE_EXIT=$?
  [[ "$DEBUG" == "true" ]] && echo "[debug] pr create exit=$PR_CREATE_EXIT" >&2
  [[ "$DEBUG" == "true" ]] && echo "[debug] pr create output: $PR_CREATE_OUTPUT" >&2

  if [[ $PR_CREATE_EXIT -eq 0 ]]; then
    NEW_PR=$(echo "$PR_CREATE_OUTPUT" | grep -oE '[0-9]+$' || echo "")
    if [[ -n "$NEW_PR" ]]; then
      PR_STATUS="pr #$NEW_PR (created)"
    else
      PR_STATUS="pr created (url: $PR_CREATE_OUTPUT)"
    fi
  else
    # an auth failure here means the credential is unusable under this mode —
    # guide to the two fixes rather than surface a bare gh error as pr status
    if is_gh_auth_failure "$PR_CREATE_OUTPUT"; then
      emit_gh_auth_guide "$PR_CREATE_OUTPUT"
    fi
    # a non-auth pr-create failure (branch protection, rate limit, no commits)
    # is a caller-must-fix constraint — record it so the output path reports the
    # failure and exits non-zero rather than hide it under the push success
    PR_STATUS="pr creation failed: $PR_CREATE_OUTPUT"
    PR_OK=false
  fi
fi

# auto-revoke push if uses depleted (skip for infinite)
PUSH_REVOKED=false
if [[ "$USES" != "infinite" && "$USES" -le 0 ]]; then
  cat > "$STATE_FILE" << EOF
{
  "uses": $USES,
  "push": "block"
}
EOF
  PUSH_REVOKED=true
fi

# the pr field decomposes the pr-open outcome (ok|error) from the push status,
# so a caller can tell a failed pr-open apart from a successful one even though
# the git push itself succeeded in both
PR_RESULT="ok"
[[ "$PR_OK" == false ]] && PR_RESULT="error"

# output results
# json mode emits one machine-readable line and is done; tree mode is the linear
# default below (no else — the early-exit keeps json off the tree path). a failed
# pr-open is a caller-must-fix constraint (exit 2): the push landed, but the pr
# did not open, so downstream automation must not read this as full success.
if [[ "$OUTPUT" == "json" ]]; then
  PR_STATUS_ESCAPED=$(escape_json_string "$PR_STATUS")
  PR_JSON=$(printf '{"status":"pushed","push_target":"%s","pr":"%s","pr_status":"%s","auth":"%s","push_revoked":%s}' \
    "$PUSH_TARGET" "$PR_RESULT" "$PR_STATUS_ESCAPED" "$AUTH" "$PUSH_REVOKED")
  echo "$PR_JSON"
  # on a failed pr-open, duplicate the error line to stderr so a stderr-only
  # consumer (ci log scan, hook) sees the failure signal too — the tree path
  # below does the same on failure (rule.require.skill-output-streams). a
  # success stays stdout-only.
  if [[ "$PR_OK" == false ]]; then
    echo "$PR_JSON" >&2
    exit 2
  fi
  exit 0
fi

# tree mode: precompute the outcome-dependent lines as conditional overrides of a
# sensible default (no else), then build the tree once and route it by outcome
PR_HEADER="bummer dude, pushed but the pr didnt open"
[[ "$PR_OK" == true ]] && PR_HEADER="cowabunga!"
METER_LINE="      └─ push: allowed"
[[ "$PUSH_REVOKED" == true ]] && METER_LINE="      └─ push: allowed → blocked (revoked)"

TREE_OUTPUT=$(
  print_turtle_header "$PR_HEADER"
  print_tree_start "git.commit.push"
  echo "   ├─ push: $PUSH_STATUS"
  if [[ -n "$PR_STATUS" ]]; then
    echo "   ├─ pr: $PR_STATUS"
    echo "   ├─ opened: $AUTH_WHO"
  fi
  echo "   └─ meter"
  echo "$METER_LINE"
  if [[ "$PR_OK" == true ]]; then
    echo ""
    echo "🌊 now lets ride the release wave and catch any wipeouts"
    echo "   └─ rhx git.release --watch || rhx show.gh.test.errors"
  fi
)
# always to stdout; on a pr-open failure also to stderr, so a stderr-only
# consumer (a ci log scan) still sees why exit 2 happened — parity with every
# other failure path in this file (rule.require.skill-output-streams)
echo "$TREE_OUTPUT"
if [[ "$PR_OK" == false ]]; then
  echo "$TREE_OUTPUT" >&2
  exit 2
fi
