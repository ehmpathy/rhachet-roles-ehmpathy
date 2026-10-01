#!/usr/bin/env bash
######################################################################
# .what = bind the human sponsor who answers for this tree's commits
#
# .why  = a commit must name the human who authorized it. on a human's
#         own machine, commits take that human from `git config` with no
#         bind at all (git.commit.set). a bind is for the exceptions:
#         sponsor someone else's work, or name a human on the clone's
#         machine, where git config names the clone. a bind always wins
#         over git config.
#
# usage:
#   printf 'Name <email>' | git.commit.sponsor set --who @stdin
#   git.commit.sponsor set --who "Name <email>"
#   git.commit.sponsor set --who @self     # this machine's git config
#   git.commit.sponsor get
#   git.commit.sponsor del
#
# guarantee:
#   - set/del are human-only (a tty the clone cannot reach)
#   - get carries no actor guard — a clone must be able to read its state
#   - the sponsor is a SNAPSHOT; it does not track its source after bind
#   - state is per-WORKTREE, at .meter/git.commit.sponsor.jsonc, and is
#     never committed (the dir self-bootstraps its own .gitignore)
#   - `@self` reads `git config` alone; gh is never read, in any form
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"
source "$SCRIPT_DIR/keyrack.operations.sh"

# .why = for `read_sponsor_state`, `set_sponsor_state`, and the shared
#        identity checks. git.commit.set reads the same file and judges the
#        same git config, so one shared source is what keeps the bind and the
#        commit from a drift in what they accept.
source "$SCRIPT_DIR/git.commit.operations.sh"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  emit_both "✋ ConstraintError: not in a git repository"
  exit 2
fi

######################################################################
# per-WORKTREE state
#
# .why = --show-toplevel returns THIS worktree's root. --git-dir and
#        --git-common-dir both resolve to the shared parent .git, so a
#        sponsor bound under either would cover every worktree of the
#        clone at once — one human's name on trees they never saw.
#
# .note = a swap here is CLAMPED — `[case2][t1]` binds in one worktree
#         and asserts a second worktree of the same clone sees none.
######################################################################
REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/$SPONSOR_STATE_FILENAME"

USAGE="usage: printf 'Name <email>' | git.commit.sponsor set --who @stdin
       git.commit.sponsor set --who \"Name <email>\"
       git.commit.sponsor set --who @self
       git.commit.sponsor get
       git.commit.sponsor del"

######################################################################
# parse
######################################################################
COMMAND=""
WHO=""

# first positional arg is the command
if [[ $# -ge 1 && "$1" != --* ]]; then
  COMMAND="$1"
  shift
fi

while [[ $# -gt 0 ]]; do
  case $1 in
    set|get|del)
      COMMAND="$1"
      shift
      ;;
    --who)
      # 🔴 shift ONE, then take a value only if one is really there. never
      #    `shift 2`, and never `${2:-}` unconditionally.
      #
      # .why = `--who` as the LAST arg leaves one positional, so `shift 2`
      #        exits non-zero and `set -euo pipefail` kills the skill with
      #        bash's raw `shift: shift count out of range` at exit 1.
      #
      # 🔴 .why the `!= --*` test = a token that opens with TWO dashes is a
      #        flag the human meant to pass, never a name. `--who --help`
      #        prints help; `--who --bogus` meets the unknown-option refusal.
      #
      # 🔴 .why TWO dashes, never ONE = MEASURED. a `!= -*` guard refuses a
      #        legal value: `[case12]` binds `-e Ada\nLovelace <…>`, which
      #        opens with one dash on purpose. a parser may reserve a syntax
      #        position; it may not decide which human names are plausible.
      #
      # .why `-h` is reserved BY EXACT MATCH = the universal help alias, which
      #        no human names themselves. every other single-dash value binds.
      shift
      if [[ $# -gt 0 && "$1" != --* && "$1" != "-h" ]]; then
        WHO="$1"
        shift
      fi
      ;;
    --help|-h)
      echo "git.commit.sponsor — name the human who answers for this tree's commits"
      echo ""
      echo "  on your own machine, commits need no bind: they name the human in"
      echo "  this machine's git config. bind a sponsor to credit someone else,"
      echo "  or on the clone's machine. a bind wins over git config."
      echo ""
      echo "$USAGE"
      echo ""
      echo "commands:"
      echo "  set    bind the sponsor for this worktree (human only, at a terminal)"
      echo "  get    read the bound sponsor, or the git config default"
      echo "  del    clear the bound sponsor (human only, at a terminal)"
      echo ""
      echo "options (set):"
      echo "  --who @stdin           read 'Name <email>' from the pipe"
      echo "  --who \"Name <email>\"   name the human as a literal"
      echo "  --who @self            this machine's git config user.name + user.email"
      echo "                         (refuses where git config names a clone)"
      echo ""
      echo "options:"
      echo "  --help, -h             show this help"
      exit 0
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args, value-taking - ignore flag + its value
      shift
      if [[ $# -gt 0 && "$1" != --* && "$1" != -* ]]; then
        shift
      fi
      ;;
    --local|--global)
      # rhachet passthrough args, boolean - ignore flag only, no value to eat
      shift
      ;;
    --)
      shift
      ;;
    --*)
      emit_both "✋ ConstraintError: unknown option: $1
$USAGE"
      exit 2
      ;;
    *)
      shift
      ;;
  esac
done

# .why = validate_enum_arg emits to BOTH streams and exits 2, so a validation
#        error is never stdout-only (rule.require.skill-output-streams).
validate_enum_arg "$COMMAND" "command" "$USAGE" set get del

# .what = a PURE predicate: does a terminal drive this invocation?
#         status 0 = yes, status 1 = no.
#
# 🔴 .why all three streams = the paved dispatch form is
#        `printf ... | ... --who @stdin`, so stdin is a PIPE for the
#        legitimate human. a stdin-only test would refuse the very command
#        the design paves.
is_actor_human_via_all_streams() {
  [[ -t 2 || -t 1 || -t 0 || "${__I_AM_HUMAN:-}" == "true" ]]
}

# .what = the actor guard's refusal render, then exit 2
#
# 🔴 .why ONE render for two readers = a clone's tool call and a human's
#        claude `!` command both arrive with no terminal on any stream, and
#        they carry identical claude env markers (measured) — any marker is
#        one the clone could set anyway. the guard cannot tell them apart, so
#        the refusal names the CHANNEL as the cause, never the reader.
#
#        ⇒ the prior "only humans can run this command" told a human at a
#        `!` prompt that they were not one (rule.forbid.surprises).
#
# .why the clone paragraph on the `set` arm = a clone that reasons about its
#        refusal may conclude "the value was rejected, retry with a better
#        name" — the fabrication case. the paragraph shuts that loop.
#
# .why the remedy branches on the arm = a refused `del` must print the `del`
#        command, never a bind (rule.require.errors-name-the-fix).
refuse_actor() {
  local command="$1"

  local remedy="$SPONSOR_BIND_REMEDY"
  if [[ "$command" == "del" ]]; then
    remedy="  \$ rhx git.commit.sponsor del"
  fi

  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.sponsor $command"
    print_tree_constraint "no terminal on this command"
    echo ""
    echo "   only a human at a real terminal may bind or clear a sponsor, and"
    echo "   this command has none. a clone's tool call has none, and neither"
    echo "   does a claude \`!\` command, so the two cannot be told apart here."
    if [[ "$command" != "del" ]]; then
      echo ""
      echo "   if you are a clone: this holds even for a real human's name. to"
      echo "   name a human who did not act is a fabrication, and it reads as"
      echo "   authorized. hand this to your human."
    fi
    print_instruction "run it from your own terminal, in this tree:" "$remedy"
  )"
  exit 2
}

######################################################################
# guard 1 — the ACTOR guard. a human, at a terminal.
#
# .why = the PRIMARY guard. a clone owns an ordinary, human-shaped github
#        account and can set any env var, so no attribute of an identity or
#        environment can catch it. what it cannot counterfeit is a terminal.
#
# .why = it guards `del` as well as `set`. a permissive del is a permissive
#        set plus one step.
#
# 🔴 .note = THIS IS A FRICTION BOUNDARY, NEVER A SECURITY ONE. the state is
#        a plain file in the tree; a clone that can edit the repo can write it
#        directly. `__I_AM_HUMAN=true` is therefore a second door beside an
#        open field, and it is what lets the integration tests exercise the
#        mutations at all. what makes a forged sponsor answerable is that the
#        name lands in a public trailer, where the human it names can read it.
#
# 🔴 .note = the ACCEPT branch is proven under a REAL pseudo-terminal, with
#        the escape hatch disabled — `[case14][t0]`, via `src/.test/spawnInPty`.
######################################################################
case "$COMMAND" in
  set|del)
    if ! is_actor_human_via_all_streams; then
      refuse_actor "$COMMAND"
    fi
    ;;
esac

# .what = read a piped sponsor value from stdin
read_sponsor_stdin() {
  cat
}

# .what = the shared refusal scaffold for every `set` path, then exit 2
#
# 🔴 .why ONE leaf = the remedy pair is a load-bearing guarantee: a refusal
#        prints the forms that work on every machine, never `@self`, which
#        refuses on the clone's machine. one leaf makes that structural.
#
# .note = `remedy_head` prefixes the pair (e.g. `git config` fix lines);
#         it never replaces it.
#
# usage: refuse_set error="..." lead="..." [body="..."] [remedy_head="..."]
refuse_set() {
  local error="" lead="" body="" remedy_head="" arg
  for arg in "$@"; do
    case "$arg" in
      error=*) error="${arg#error=}" ;;
      lead=*) lead="${arg#lead=}" ;;
      body=*) body="${arg#body=}" ;;
      remedy_head=*) remedy_head="${arg#remedy_head=}" ;;
    esac
  done

  local remedy="$SPONSOR_BIND_REMEDY"
  [[ -n "$remedy_head" ]] && remedy="$remedy_head
$remedy"

  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.sponsor set"
    print_tree_constraint "$error"
    if [[ -n "$body" ]]; then
      echo ""
      printf '%s\n' "$body"
    fi
    print_instruction "$lead" "$remedy"
  )"
  exit 2
}

# .what = the shared refusal for both identity classes, then exit 2
#
# .why = ONE guard speaks ONCE: the stem states the CLASS, only the detail
#        line states the instance.
#
# usage: refuse_identity lead="you named:" value="Name <email>" kind=robot|placeholder [remedy_head="..."]
#
# .note = `remedy_head` prefixes the bind forms (e.g. the `git config` fix
#         where git config holds the placeholder); it never replaces them.
refuse_identity() {
  local lead="" value="" kind="" remedy_head="" arg
  for arg in "$@"; do
    case "$arg" in
      lead=*) lead="${arg#lead=}" ;;     # where the value came from
      value=*) value="${arg#value=}" ;;
      kind=*) kind="${arg#kind=}" ;;     # robot | placeholder
      remedy_head=*) remedy_head="${arg#remedy_head=}" ;;
    esac
  done

  local remedy="$SPONSOR_BIND_REMEDY"
  [[ -n "$remedy_head" ]] && remedy="$remedy_head
$remedy"

  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.sponsor set"
    print_tree_constraint "that identity cannot answer for a change"
    echo ""
    echo "   $lead"
    echo "     $value"
    echo "   ...and it is a $kind."
    echo ""
    echo "   a sponsor answers for the change in the real world. a $kind cannot"
    echo "   answer, so it cannot hold the slot."
    if [[ -n "$remedy_head" ]]; then
      print_instruction "fix it — then commits name you with no bind — or name yourself:" "$remedy"
    fi
    if [[ -z "$remedy_head" ]]; then
      print_instruction "name the human instead:" "$remedy"
    fi
  )"
  exit 2
}

# .what = the shared refusal for a damaged sponsor state PATH, then exit 1
#
# .why = a companion leaf, not a `refuse_set` parameter: this refusal exits
#        1 (malfunction — the tree is damaged) where every `refuse_set` call
#        exits 2 (constraint), and its remedy inspects and clears a path.
refuse_set_state_damaged() {
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.sponsor set"
    print_tree_malfunction "the sponsor state path is not a file"
    echo ""
    echo "   a non-file object sits where the sponsor is kept:"
    echo "     .meter/$SPONSOR_STATE_FILENAME"
    echo "   no sponsor was bound."
    print_instruction "inspect it, clear it, then bind afresh:" \
      "  \$ ls -la .meter/$SPONSOR_STATE_FILENAME
  \$ rm -r .meter/$SPONSOR_STATE_FILENAME
$SPONSOR_BIND_REMEDY"
  )"
  exit 1 # malfunction — the tree is damaged, not the caller's input
}

# .what = `--who @self`: refuse unless this machine's git config names a
#         human. on return, GIT_IDENTITY_NAME + GIT_IDENTITY_EMAIL hold it.
#
# .why = the value comes from `get_one_git_config_identity`, the SAME reader
#        `git.commit.set` uses for its no-bind default — so what `@self` would
#        bind and what a commit would name with no bind are one answer.
#
# .why it runs in the main flow, never in a `$( )` = a refusal must reach
#        both streams and exit the skill; inside a subshell it would do
#        neither (rule.require.skill-output-streams).
guard_self_identity() {
  get_one_git_config_identity
  guard_git_identity_readable skill="git.commit.sponsor"

  # one or both halves absent — name each, with its own fix line
  if [[ "$GIT_IDENTITY_KIND" == "unset" ]]; then
    refuse_set error="--who @self found no git identity on this machine" \
      lead="set it — then commits name you with no bind — or name yourself:" \
      body="   this machine's git config holds no complete identity:
$(as_git_config_unset_lines "${GIT_IDENTITY_FAULTS[@]}")" \
      remedy_head="$(as_git_config_fix_lines "${GIT_IDENTITY_FAULTS[@]}")"
  fi

  # both set, but not a `Name <email>`
  #
  # 🔴 .why the value is NOT echoed where it holds a control character = an
  #        ESC echoed into the tree render would let the rejected value
  #        rewrite the very message that rejects it.
  #
  # .why the fix names the half at fault = a fix line for the half that is
  #        fine sends the human to change the wrong value. the reader puts
  #        both halves at fault where neither is at fault alone.
  if [[ "$GIT_IDENTITY_KIND" == "malformed" ]]; then
    local shown="$GIT_IDENTITY_NAME <$GIT_IDENTITY_EMAIL>"
    is_identity_unprintable "$shown" && shown="(holds a control character)"
    refuse_set error="--who @self read a malformed git identity" \
      lead="fix it — then commits name you with no bind — or name yourself:" \
      body="   this machine's git config reads:
     $shown" \
      remedy_head="$(as_git_config_fix_lines "${GIT_IDENTITY_FAULTS[@]}")"
  fi

  # a roster identity — by definition, the clone's machine
  if [[ "$GIT_IDENTITY_KIND" == "clone" ]]; then
    refuse_set error="--who @self read a clone's identity on this machine" \
      lead="name yourself instead:" \
      body="   this machine's git config reads:
     $GIT_IDENTITY_NAME <$GIT_IDENTITY_EMAIL>
   ...so this is the clone's machine, and \"self\" here is the clone."
  fi

  # a placeholder name
  if [[ "$GIT_IDENTITY_KIND" == "placeholder" ]]; then
    refuse_identity lead="this machine's git config reads:" \
      value="$GIT_IDENTITY_NAME <$GIT_IDENTITY_EMAIL>" kind=placeholder \
      remedy_head="$(as_git_config_fix_lines "${GIT_IDENTITY_FAULTS[@]}")"
  fi

  return 0
}

######################################################################
# commands
######################################################################
case "$COMMAND" in
  set)
    if [[ -z "$WHO" ]]; then
      refuse_set error="--who is required" lead="name the human:"
    fi

    # gather the value forms into one string, then guard the VALUE.
    #
    # .note = `@me` is the pre-rename spelling of `@self`, kept as a silent
    #         alias. it appears in no help, usage, refusal, or coconut, so the
    #         alias never teaches itself; a refusal on this path names `@self`.
    VIA_SELF=false
    case "$WHO" in
      @self|@me)
        VIA_SELF=true
        guard_self_identity
        SPONSOR_RAW="$GIT_IDENTITY_NAME <$GIT_IDENTITY_EMAIL>"
        ;;
      @stdin)
        # .why = `cat` on a terminal blocks forever, so a human who typed
        #        `--who @stdin` with no pipe would meet a hang rather than a
        #        message (rule.require.status-feedback). clamped at
        #        `[case14][t1]` under a real pseudo-terminal.
        if [[ -t 0 ]]; then
          refuse_set error="--who @stdin expects a pipe, and none is piped" \
            lead="pipe the human in, or name them as a literal:"
        fi
        SPONSOR_RAW=$(read_sponsor_stdin)
        ;;
      *)
        SPONSOR_RAW="$WHO"
        ;;
    esac

    SPONSOR_RAW=$(as_identity_trimmed "$SPONSOR_RAW")

    if [[ -z "$SPONSOR_RAW" ]]; then
      refuse_set error="--who resolved to an empty value" lead="name the human:"
    fi

    # 🔴 refuse a control character — BEFORE the shape gate, on the RAW value
    #
    # .why = the shape refusal below ECHOES the value; an ESC in it would
    #        render. and the READER refuses this same class, so a writer
    #        looser than its reader would bind a value that then refuses every
    #        commit. the refusal does not echo the value.
    if is_identity_unprintable "$SPONSOR_RAW"; then
      refuse_set error="that value holds a control character" \
        lead="a sponsor is one line, so name the human in plain text:"
    fi

    if ! as_identity_parts "$SPONSOR_RAW"; then
      refuse_set error="that value is not a 'Name <email>'" \
        lead="name the human as a name plus an address:" \
        body="   you gave:
     $SPONSOR_RAW"
    fi
    SPONSOR_NAME="$IDENTITY_NAME"
    SPONSOR_EMAIL="$IDENTITY_EMAIL"

    # the identity backstops — a robot or a placeholder cannot answer for a
    # change. `@self` already passed these on git config; they guard the
    # supplied forms.
    if is_identity_robot name="$SPONSOR_NAME" email="$SPONSOR_EMAIL"; then
      refuse_identity lead="you named:" value="$SPONSOR_NAME <$SPONSOR_EMAIL>" kind=robot
    fi
    if is_identity_placeholder "$SPONSOR_NAME"; then
      refuse_identity lead="you named:" value="$SPONSOR_NAME <$SPONSOR_EMAIL>" kind=placeholder
    fi

    # findsert .meter dir and its .gitignore
    # .why = the state holds a human's name and email — pii. via the shared
    #        leaf, so this site and the `uses` site cannot drift on a scaffold
    #        whose only drift symptom is PII in a commit.
    findsert_gitignored_dir "$METER_DIR"

    # .what = provenance is part of the value: `self` = read from this
    #         machine's git config; `supplied` = handed in, piped or literal.
    # .note = default, then override — the supplied label is also the
    #         reader's fallback, so the two agree by construction.
    SPONSOR_SOURCE="$SPONSOR_SOURCE_SUPPLIED"
    if [[ "$VIA_SELF" == "true" ]]; then
      SPONSOR_SOURCE="$SPONSOR_SOURCE_SELF"
    fi

    # 🔴 .why the write is CHECKED = a directory at the state path makes the
    #        write impossible, and the render below would otherwise report a
    #        bind that never landed.
    if ! set_sponsor_state "$STATE_FILE" "$SPONSOR_NAME" "$SPONSOR_EMAIL" "$SPONSOR_SOURCE"; then
      refuse_set_state_damaged
    fi

    print_turtle_header "shell yeah, sponsor bound"
    print_tree_start "git.commit.sponsor set"
    echo "   ├─ name: $SPONSOR_NAME"
    echo "   ├─ email: $SPONSOR_EMAIL"
    echo "   └─ source: $SPONSOR_SOURCE"
    ;;

  get)
    # 🔴 .why the READ comes first, and the tree opens after = a `get` must
    #        render exactly ONE tree, whatever it finds. a header opened
    #        before the read orphaned a success header above a corrupt-file
    #        error (rule.require.treestruct-output, rule.forbid.surprises).
    SPONSOR_GET_STATUS=0
    read_sponsor_state "$STATE_FILE" || SPONSOR_GET_STATUS=$?

    # 1 = present and unusable. a malfunction: inspect the file, never bind
    # over a sponsor that is already written.
    if [[ "$SPONSOR_GET_STATUS" -eq 1 ]]; then
      emit_both "$(print_sponsor_corrupt_render "git.commit.sponsor get")"
      exit 1  # malfunction
    fi

    # 2 = no bind. commits then take git config where it names a human, so
    # `get` says which, and never implies "no sponsor" where commits have one
    if [[ "$SPONSOR_GET_STATUS" -eq 2 ]]; then
      print_sponsor_unbound_state
      exit 0
    fi

    print_turtle_header "lets check the sponsor..."
    print_tree_start "git.commit.sponsor"
    echo "   ├─ name: $SPONSOR_NAME"
    echo "   ├─ email: $SPONSOR_EMAIL"
    echo "   └─ source: $SPONSOR_SOURCE"
    ;;

  del)
    # 🔴 .why `-e`, never `-f` = the absence test asks "is there an ENTRY
    #        here". `read_sponsor_state` classifies a DIRECTORY at this path as
    #        damage and names `del` as its remedy; a `-f` gate would answer
    #        that remedy with "already clear" and remove naught.
    #
    # 🔴 .clamp = `git.commit.set` `[case49][t1]` WALKS the promise: refuse on
    #        a corrupt file, run the `del` it printed, bind, and commit.
    if [[ ! -e "$STATE_FILE" ]]; then
      print_turtle_header "groovy, already clear"
      print_tree_start "git.commit.sponsor del"
      echo "   └─ sponsor: (none bound)"
      exit 0
    fi

    # .why `-rf` = the entry may be a DIRECTORY, which `rm -f` cannot remove.
    #
    # ⚠️ .why the path check = `-rf` is a sharp tool, so the claim that it
    #        can reach only this skill's own state file is CHECKED, never
    #        promised (rule.require.failfast).
    if [[ "$STATE_FILE" != *"/$SPONSOR_STATE_FILENAME" ]]; then
      emit_both "💥 MalfunctionError: refused to clear an unexpected path: $STATE_FILE"
      exit 1
    fi
    rm -rf "$STATE_FILE"
    print_turtle_header "groovy, sponsor cleared"
    print_tree_start "git.commit.sponsor del"
    echo "   └─ cleared"
    ;;
esac
