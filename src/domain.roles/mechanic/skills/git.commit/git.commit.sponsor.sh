#!/usr/bin/env bash
######################################################################
# .what = bind the human sponsor who answers for this tree's commits
#
# .why  = a commit must name the human who authorized it. the prior
#         design read `git config` for that human, which is a lucky
#         proxy on a laptop and the CLONE ITSELF on a cloud grove — so
#         the trailer read "attributed" while it named zero humans.
#         a sponsor is bound by a human act instead, so no host config
#         can stand in for a decision nobody made.
#
# usage:
#   printf 'Name <email>' | git.commit.sponsor set --who @stdin
#   git.commit.sponsor set --who "Name <email>"
#   git.commit.sponsor set --who @me      # needs YOUR OWN gh auth login
#   git.commit.sponsor get
#   git.commit.sponsor del
#
# guarantee:
#   - set/del are human-only (a tty the clone cannot reach)
#   - get carries no actor guard — a clone must be able to read its state
#   - the sponsor is a SNAPSHOT; it does not track its source after bind
#   - state is per-WORKTREE, at .meter/git.commit.sponsor.jsonc, and is
#     never committed (the dir self-bootstraps its own .gitignore)
#   - `git config` is never read for an identity, on any grove
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"
source "$SCRIPT_DIR/keyrack.operations.sh"

# .why = for `read_sponsor_state`, the ONE reader of the sponsor state file.
#        git.commit.set reads that same file to name the trailer, so a
#        shared reader is what keeps this skill and that one from a drift
#        in how they parse it — or in what they do when it will not parse.
source "$SCRIPT_DIR/git.commit.operations.sh"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  emit_both "error: not in a git repository"
  exit 2
fi

######################################################################
# per-WORKTREE state
#
# .why = --show-toplevel returns THIS worktree's root. --git-dir and
#        --git-common-dir both resolve to the shared parent .git, so a
#        sponsor bound under either would cover every worktree of the
#        clone at once — one human's name on trees they never saw.
#        measured: this is the same fabrication the actor guard exists
#        to forbid, at smaller scale.
#
# .note = a swap here is CLAMPED — `[case2][t1]` binds in one worktree
#         and asserts a second worktree of the same clone sees none.
#         it was dogfooded against `--git-common-dir` and went red.
######################################################################
REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/$SPONSOR_STATE_FILENAME"

USAGE="usage: printf 'Name <email>' | git.commit.sponsor set --who @stdin
       git.commit.sponsor set --who \"Name <email>\"
       git.commit.sponsor set --who @me
       git.commit.sponsor get
       git.commit.sponsor del"

# the remedy block every refusal here prints, from git.commit.operations.sh.
#
# .why = @me is ABSENT from it on purpose: it reads the gh session on THIS
#        host, which on a cloud grove is the clone's — so a refusal that
#        named it would hand the reader a second refusal. only the forms that
#        hold on every grove belong in a mandatory block.
#
# 🔴 .note = the whole two-line BLOCK is shared now, not the two commands
#         alone. this file used to re-render the pair from the commands, and
#         so did git.commit.set — six copies, and one of them (the help body)
#         had already dropped to a single route. see the shared constant's
#         own note for why the SET is fixed while the prefix stays per-site.

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
      #        bash's own `shift: shift count out of range` — a raw message
      #        no human can act on, at exit 1, which reads as a MALFUNCTION
      #        where every other malformed input is a constraint at exit 2.
      #
      # 🔴 .why the `!= --*` test = a token that opens with TWO dashes is a
      #        FLAG the human meant to pass, never a name. `--who "$2"` taken
      #        blindly SWALLOWS it: `set --who --help` bound the literal
      #        `--help` as the sponsor's name and never printed help, then
      #        refused with "not a Name <email>" about a value the human never
      #        supplied — a message that describes an input they did not type
      #        (rule.forbid.surprises).
      #
      # ⇒ so an unconsumed flag stays in the arg list and reaches its own arm:
      #        `--who --help` prints help, `--who --bogus` meets the unknown-
      #        option refusal, and `--who` alone leaves WHO empty for the
      #        extant "--who is required". three inputs, three correct
      #        messages, and none of them new — the flag simply stops to
      #        consume them.
      #
      # 🔴 .why TWO dashes, never ONE = MEASURED. a `!= -*` test is the wider
      #        guard and it REFUSES A LEGAL VALUE: `[case12]` binds the name
      #        `-e Ada\nLovelace <ada@example.com>`, which opens with a single
      #        dash on purpose — it is the byte sequence `echo` mangles, and
      #        the clamp exists to prove the transformer emits it verbatim.
      #        ⇒ the wider guard turned that clamp red, which is what the test
      #        is for: a parser may reserve a syntax position, and it may not
      #        decide which human names are plausible.
      #
      # 🔴 .why `-h` is reserved BY EXACT MATCH, and it is the only single-dash
      #        token that is = `-h` was a KNOWN GAP for one round: one dash, so
      #        it was taken as a value, and a human who asked for help met
      #        "that value is not a 'Name <email>'" — their help request quoted
      #        back at them as a malformed identity (rule.forbid.surprises).
      #
      # ⇒ the gap was left open because the remedy weighed was the WIDER `!= -*`
      #        guard, which is measured to refuse a legal name. ⚠️ that was a
      #        false binary: an EXACT match on `-h` closes the gap and reserves
      #        exactly one token — the universal help alias, which no human
      #        names themselves — while `-e Ada…` and every other single-dash
      #        value still binds.
      #
      # .note = `--help` needs no row here; it opens with two dashes, so the
      #         `!= --*` test already passes it through to its own arm.
      shift
      if [[ $# -gt 0 && "$1" != --* && "$1" != "-h" ]]; then
        WHO="$1"
        shift
      fi
      ;;
    --help|-h)
      # .why = rule.require.help-on-demand names four parts, and the first
      #        is a one-line .what. usage alone tells a reader HOW to call a
      #        command they have not yet decided they want.
      echo "git.commit.sponsor — name the human who answers for this tree's commits"
      echo ""
      echo "$USAGE"
      echo ""
      echo "commands:"
      echo "  set    bind the sponsor for this worktree (human only)"
      echo "  get    read the bound sponsor"
      echo "  del    clear the bound sponsor (human only)"
      echo ""
      echo "options (set):"
      echo "  --who @stdin           read 'Name <email>' from the pipe"
      echo "  --who \"Name <email>\"   name the human as a literal"
      echo "  --who @me              your own github session"
      echo "                         (needs YOUR OWN 'gh auth login' on this"
      echo "                          host — a cloud grove carries the clone's)"
      echo "                         reserve for YOUR OWN requested work — a"
      echo "                         supervisor who acts for someone else"
      echo "                         should pipe THAT human via --who @stdin"
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
      emit_both "error: unknown option: $1
$USAGE"
      exit 2
      ;;
    *)
      shift
      ;;
  esac
done

# .why = validate_enum_arg is the extant helper for exactly this: it emits to
#        BOTH streams and exits 2, so a validation error is never stdout-only
#        (rule.require.skill-output-streams). an empty COMMAND is not in the
#        enum, so the absent case and the wrong case share one path.
validate_enum_arg "$COMMAND" "command" "$USAGE" set get del

# .what = a PURE predicate: does a human drive this invocation?
#         status 0 = yes, status 1 = no.
#
# 🔴 .why the name states the MECHANISM = this is the BROADER of the two
#        actor checks in this skill family, and the direction is the part a
#        reader must not guess at. `guard_actor_is_human_via_stdin`
#        (operations.sh, used by the `uses` trio) reads stdin alone; this
#        reads all three streams, so it accepts a STRICT SUPERSET:
#
#          -t 0   ⟹   (-t 2 || -t 1 || -t 0)
#
#        ⇒ every caller the `uses` guard admits, this one admits too, and
#        the reverse does not hold. the set "admitted by `uses`, refused
#        here" is EMPTY by construction — a fact worth the ink, because the
#        natural read of "the sponsor guard is the careful one" implies a
#        case that cannot exist.
#
#        ⚠️ and the asymmetry runs toward PERMISSION on the more dangerous
#        verb, which reads backwards until you know why. the `.why` below
#        carries the reason: `--who @stdin` is the paved dispatch form, so
#        stdin is a PIPE for the legitimate human. a stdin-only guard here
#        would refuse the very command this design paves. the breadth is
#        load-bearing, never an oversight.
#
# .why = a NAMED predicate rather than the four-conjunct boolean inline. the
#        expression states HOW it tests and never WHAT it concludes, so a
#        reader had to simulate it to learn it means "a clone with no
#        terminal on any stream, and no test escape"
#        (rule.require.named-transformers).
#
# 🔴 .note = it stays LOCAL to this skill rather than lifted beside its
#         weaker twin in operations.sh. it has ONE caller, and a lift on one
#         caller is a speculative lift — nest at the most specific place and
#         lift on proven reuse (rule.prefer.most-common-denominator).
#         whether the two guards should CONVERGE at all is a live question
#         for the fulcrum council (F12 ask 4b), and the name that convergence
#         would take — `guard_actor_is_human` — is reserved for it.
is_actor_human_via_all_streams() {
  [[ -t 2 || -t 1 || -t 0 || "${__I_AM_HUMAN:-}" == "true" ]]
}

# .what = the actor guard's refusal render, then exit 2
#
# .why = the guard decides; this leaf renders. the orchestrator below then
#        reads as one decision rather than a decision plus a 13-line tree
#        (rule.require.orchestrators-as-narrative).
#
# 🔴 .why it is a SIBLING of `refuse_set` rather than a parameter on it =
#        `refuse_set` builds its remedy from `$SPONSOR_BIND_REMEDY` and
#        takes no override, and that is its whole guarantee: every one of
#        its seven callers prints the command that works on any grove,
#        structurally, with no caller able to drift it.
#
#        ⇒ to widen it with a remedy argument would hand all seven the
#        drift the leaf exists to forbid — a larger hazard than the
#        duplication it would retire. so the two refusals stay two leaves.
#
# .why the remedy branches on the arm = a refused `del` handed the human
#        the commands that BIND one, which re-binds a sponsor rather than
#        clears it — the opposite of the blocked action, printed as its fix
#        (rule.require.errors-name-the-fix).
refuse_actor() {
  local command="$1"

  local remedy="$SPONSOR_BIND_REMEDY"
  if [[ "$command" == "del" ]]; then
    remedy="  \$ rhx git.commit.sponsor del"
  fi

  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.sponsor $command"
    print_tree_error "only humans can run this command"
    echo ""
    echo "   a sponsor answers for a change in the real world, so only a"
    echo "   human can bind or clear one."
    # 🔴 .why a SECOND paragraph, on the `set` arm only = the reader of
    #        this refusal is a clone that reasons about its own rejection,
    #        and the one-paragraph form leaves a wrong lesson to draw:
    #        "the VALUE was rejected, so retry with a better name."
    #
    #        ⇒ that retry is the fabrication case — a clone that names a
    #        real human who did not act — and it yields a record which
    #        READS authorized, so it is worse than an absent one. the
    #        refusal shuts that loop, or it fails open on attempt two
    #        (`1.vision.experience.case=4`, the sharp-path bar, row 4).
    #
    # .why the `set` arm only = a refused `del` offers no value at all,
    #        so its reader has no "better value" to reach for.
    # .clamp = MEASURED. flip this to a name no arm carries and the `del`
    #          twin's two asserts go red (its snapshot, and its explicit
    #          `not.toContain`) while the `set` twin stays green — so the
    #          clamp grades the SPLIT, not merely the paragraph's presence.
    if [[ "$command" != "del" ]]; then
      echo ""
      echo "   this holds even for a real human's name. to name a human who"
      echo "   did not act is a fabrication, and it reads as authorized."
    fi
    print_instruction "ask your human to run, in this tree:" "$remedy"
  )"
  exit 2
}

######################################################################
# guard 1 — the ACTOR guard. a human, at a terminal.
#
# .why = this is the PRIMARY guard, not the identity check below. three
#        identity attributes were measured against the clone's own
#        github account and all three failed to separate it from a
#        human: the email domain (a bot and a human share it), the
#        derived noreply address (identical shape), and `.type` (the
#        clone reads "User"). the clone owns an ordinary, human-shaped
#        account, so NO attribute of an identity can catch it.
#        what a clone cannot counterfeit is not a name — it is a
#        terminal, and a permission it does not hold.
#
# .why = the terminal test reads stderr and stdout, not stdin alone. the
#        paved form for a dispatch is `printf ... | ... --who @stdin`,
#        which makes stdin a PIPE for the legitimate human case. a
#        guard on `-t 0` would refuse the very command the design paves.
#        a clone under a tool harness has no terminal on any stream.
#
# .why = it guards `del` as well as `set`. a permissive del is a
#        permissive set plus one step.
#
# 🔴 .note = THIS IS A FRICTION BOUNDARY, NEVER A SECURITY ONE. do not
#        read the guard as one, and do not harden it as though it were.
#
#        the state it protects is a plain file in the tree — a clone that
#        can edit the repo can write `.meter/git.commit.sponsor.jsonc`
#        itself and never invoke this skill at all. so the guard raises
#        the cost of a fabricated sponsor from zero to deliberate; it
#        cannot make one impossible, and no test of the actor could.
#
#        ⇒ `__I_AM_HUMAN=true` is therefore not a hole in a wall. it is a
#        second door beside an open field, and it is what lets the
#        integration tests exercise the mutations at all. a gate on
#        NODE_ENV would read as a repair and buy no property the direct
#        file write does not already concede.
#
# 🔴 .note = the ACCEPT branch is proven under a REAL pseudo-terminal, with
#        the escape hatch disabled — `[case14][t0]`, via `src/.test/spawnInPty`.
#        it is dogfooded: drop the three `-t` tests from the predicate above
#        and all three of its asserts go red.
#        ⇒ so the escape hatch is no longer the only proof this guard has.
#
#        what makes a fabricated sponsor answerable is NOT this guard. it
#        is that the name lands in a commit trailer, in public, where the
#        human it names can read it — the wish asks that a commit name a
#        human, and a forged name is a visible forgery rather than the
#        silent zero-humans default it replaces.
######################################################################
case "$COMMAND" in
  set|del)
    if ! is_actor_human_via_all_streams; then
      refuse_actor "$COMMAND"
    fi
    ;;
esac

######################################################################
# resolve the value forms of --who
######################################################################

# .what = a PURE predicate: is a `gh api user` body one an identity can be
#         built from? status 0 = yes, status 1 = no.
#
# .why = a zero exit from `gh` says the CALL completed. it makes no claim at
#        all about the BODY. this is the shape half of the very boundary
#        `as_identity_from_gh_user_json` transforms, ⇒ the two sit together.
#
# 🔴 .why = MEASURED, by removal of this gate against a `<html>502 Bad
#        Gateway</html>` reply. the outcome is worse than a crash:
#          1. four raw `parse error: Invalid numeric literal at line 1,
#             column 10` lines leak to the human — un-curated jq text
#          2. and the skill does NOT stop. each `// empty` swallows the
#             failure, so the transformer FABRICATES an address out of
#             two empty fields: `<+@users.noreply.github.com>`
#        ⇒ so this is a failhide that then invents a value, which is the
#        defect class of the whole change rather than merely an ugly error
#        (rule.forbid.failhide).
#
# .why = the far guard downstream does catch that fabrication, on the
#        `Name <email>` shape check — but it reports "that value is not a
#        'Name <email>'" and shows the human a value THEY never supplied. an
#        error must name the true cause, and by then the cause is four frames
#        back (rule.require.errors-name-the-fix).
#
# .why = it asserts the two fields the transformer LEANS ON, never merely
#        that the reply parses. `.name` and `.email` are both nullable by
#        design and fall back; `.login` and `.id` are what the derived
#        address is built from, so a reply without them would mint an address
#        like `+@users.noreply.github.com`.
#
# 🔴 .note = a PREDICATE beside the transformer, never a fold INTO it. the
#         transformer is invoked under `$( )`, so it cannot refuse — an
#         `exit` there would end only the subshell, and an error printed
#         there would be captured into the variable. a predicate returns
#         STATUS instead, so the caller branches on it in the main flow,
#         where the refusal reaches both streams
#         (rule.require.skill-output-streams).
# 🔴 .why `-s` (slurp) = MEASURED. without it this gate FAILS OPEN on an EMPTY
#        body, which is the one input it must refuse hardest:
#          $ printf '%s' ''   | jq -e '<filter>'   → exit 0   🔴 accepted
#          $ printf '%s' '{}' | jq -e '<filter>'   → exit 1   ✅ refused
#        `-e` reports on the LAST OUTPUT VALUE, and empty input produces no
#        value at all — so the filter never runs and there is no `false` to
#        report. ⇒ the gate says "usable" about a body it never read.
#
# 🔴 .why = and the consequence is the exact fabrication this gate exists to
#        prevent, reproduced: an empty body flows into the transformer, each
#        `// empty` swallows its absent field, and the skill mints
#        `<+@users.noreply.github.com>` — an address for a human who does not
#        exist, bound as a sponsor.
#
# .why = `-s` makes the value ALWAYS exist: empty input slurps to `[]`, so
#        `.[0]` is `null`, `null | type == "object"` is `false`, and `-e`
#        exits 1. a non-json body still fails to parse and exits non-zero.
#        ⇒ every reply now yields a verdict, so the gate fails CLOSED
#        (rule.require.safe-by-default).
#
# .note = found by a dogfood of the `timeout` clamp below — a stalled `gh`
#         run WITHOUT the bound exits 0 with an empty body, which is the only
#         path in the suite that fed this gate zero bytes.
is_gh_user_json_usable() {
  printf '%s' "$1" \
    | jq -s -e '.[0] | type == "object" and (.login // "") != "" and (.id // "") != ""' > /dev/null 2>&1
}

# .what = a PURE transformer: any upstream text → the same text with every
#         control character removed except the newline, which structures it
#
# 🔴 .why = the sponsored VALUE is guarded against `[[:cntrl:]]`
#        (`is_identity_unprintable`), and the text that arrives BESIDE it in a
#        refusal was not. `gh`'s stderr and its reply body are rendered
#        verbatim, and neither is ours — an error page, a proxy banner, or a
#        coloured cli warning carries ANSI escapes.
#
#        ⇒ so a refusal could emit `\033[2J` and clear the human's terminal,
#        or `\r` and overwrite the line that names the fix. the render that
#        exists to explain a failure is then the one thing that hides it.
#
# ⚠️ .why the NEWLINE survives = `as_gh_said_body` splits on it to indent gh's
#        words one per line. to strip it would collapse a multi-line cause
#        into one run-on line — legible, but no longer readable as the cause.
#        a tab becomes a space for the same reason inverted: it carries no
#        structure here and would break the tree's alignment.
#
# .note = it guards the RENDER, never the data. the reply is still judged by
#         `is_gh_user_json_usable` on its raw bytes, so no gate is loosened.
as_upstream_text_safe() {
  printf '%s' "$1" \
    | tr '\011' ' ' \
    | tr -d '\000-\010\013-\037\177'
}

# .what = a PURE transformer: any reply body → its first 200 bytes, for a
#         refusal's "the reply began:" line
#
# .why = the human must see WHAT came back to tell one failure from another —
#        an html error page and an empty body are two different causes, and
#        only the reply itself tells them apart. 200 bytes is enough to
#        separate them and short enough not to bury the fix beneath the
#        evidence.
#
# .why = a NAMED operation rather than an inline pipe, because
#        `printf '%s' "$x" | head -c 200` states HOW it cuts and never WHY
#        (rule.require.named-transformers).
#
# 🔴 .why a bash PARAMETER SLICE, never a `head -c` PIPE = a large reply (an
#        html error page — exactly the input this preview exists for) sends
#        more than 200 bytes into a pipe `head -c 200` closes once it has its
#        fill. the upstream writer then meets a closed pipe and takes
#        SIGPIPE; under `set -euo pipefail` that nonzero exit aborts the
#        whole skill with a raw pipeline failure, not the curated refusal
#        this preview feeds. a parameter slice touches no pipe and cannot
#        take SIGPIPE, so the abort chance is gone — for any reply length.
as_reply_preview() {
  local safe
  safe=$(as_upstream_text_safe "$1")
  printf '%s' "${safe:0:200}"
}

# .what = a PURE transformer: gh's raw stderr → the indented `gh said:` block
#         a refusal renders beneath its error line. empty in ⇒ empty out.
#
# .why = a NAMED operation rather than the while-read accumulator it replaces.
#        the loop stated HOW it built the block — a concat per line, at a
#        fixed indent — and a reader had to simulate it to learn it emits
#        gh's own words, one per line (rule.require.named-transformers).
#
# .why = the EMPTY case is part of the contract, never an edge: an absent
#        stderr must yield an absent block, because `refuse_set` omits an
#        empty body entirely. a header with no lines beneath it would render
#        a bare `gh said:` and report naught.
#
# .note = the indent is a CONTRACT — the block sits inside a rendered tree,
#         and both widths here are snapshot-pinned. it lives in one place now,
#         so a render change is one edit rather than a hunt.
as_gh_said_body() {
  local stderr_raw
  # gh's stderr is upstream text, so it is stripped of control characters
  # before it reaches a render — see `as_upstream_text_safe`
  stderr_raw=$(as_upstream_text_safe "$1")
  [[ -n "$stderr_raw" ]] || return 0

  local body="   gh said:"
  local line
  while IFS= read -r line; do
    body="$body
     $line"
  done <<< "$stderr_raw"
  printf '%s' "$body"
}

######################################################################
# communicator: ask gh who this host's session belongs to
#
# .what = the raw external-call BOUNDARY for `--who @me`. it sets three
#         globals — the caller reads the status:
#           GH_USER_STATUS  0 = gh answered · non-zero = gh failed (124 = killed)
#           GH_USER_JSON    gh's stdout, verbatim
#           GH_USER_ERR     gh's stderr, verbatim
#
# 🔴 .why a NAMED leaf = the `@me` branch is an ORCHESTRATOR, and it spelled
#        this boundary out inline: a `mktemp`, a `timeout`-wrapped call, a
#        `cat` of the capture, and an `rm -f`. five lines of machinery a reader
#        must simulate to learn one fact — did gh answer? — in the middle of a
#        flow that otherwise reads as decisions
#        (rule.forbid.inline-decode-friction, define.domain-operation-grains).
#
# ⇒ .why ONE call site is enough = the grade is READABILITY AT THE CALL SITE,
#        never reuse. this drive held the lift for three rounds on
#        `rule.prefer.most-common-denominator` — which governs PLACEMENT and
#        says lift on proven reuse — and that was the wrong rule for the
#        question: a placement rule cannot answer a legibility one.
#        ⚠️ the same drive had already extracted `render_files_as_tree_lines`,
#        a one-call-site leaf, on exactly these grounds. ⇒ the hold was
#        inconsistent with its own precedent, and this is the correction.
#
# .note = the shape half (`is_gh_user_json_usable`) and the render half
#         (`as_gh_said_body`) of this same boundary were already named. this
#         was the last raw piece, so the three now sit together.
#
# 🔴 .why the call is TIME-BOUNDED = a hang is worse than a failure, and this
#        file says so in its own words one branch down: a `--who @stdin` with
#        no pipe would "meet a hang rather than a message — the one outcome
#        worse than an error, because it reports naught at all". an unbounded
#        network call is that same outcome by a different road — and it lands
#        on the ONE act that unblocks the tree, so a `gh` that never returns
#        freezes the whole commit path with no message to read.
#
# 🔴 .why gh's OWN stderr is KEPT = `2>/dev/null` here threw away the one fact
#        that names the cause, and the refusal then asserted a cause it had
#        never measured. a rate limit, a dropped network, and an expired token
#        failed identically, so a human with a healthy session was sent to
#        `gh auth login` and the true cause was never spoken. ⇒ a substitution
#        that reads reasonable and records the wrong cause — the EXACT class
#        this whole change exists to remove, reproduced inside its own paved
#        flag (rule.forbid.failhide, rule.require.errors-name-the-fix).
######################################################################
get_gh_user_session() {
  local err_file
  err_file=$(mktemp)
  # .why = the EXIT trap covers the window this function's own cleanup
  #        cannot: a SIGINT/SIGTERM/kill while the gh call below is in
  #        flight ends the process before the `rm -f` two lines down ever
  #        runs. the explicit `rm -f` at the end still fires on the normal
  #        path — by the time the trap would fire (at process exit, which
  #        may land long after this function returns), the `local err_file`
  #        value is gone from scope, so the trap alone cannot be trusted for
  #        the common case. both together close both windows; `rm -f` on an
  #        absent path is a no-op, so the pair never double-fails.
  #
  # 🔴 .why the `${err_file:-}` default = this file runs under `set -u`. a
  #        late-firing trap reads `err_file` AFTER this function has already
  #        returned and the `local` binding is gone — an unbound read there
  #        aborts the trap command itself, and an aborted EXIT-trap command
  #        overwrites the true exit code with its own (measured: a
  #        `refuse_set` call's `exit 2` came out as `1`). the default
  #        expansion makes the late, out-of-scope read expand to an empty
  #        string instead of erroring, so `rm -f ""` runs (a no-op) and the
  #        true exit code survives untouched.
  trap 'rm -f "${err_file:-}"' EXIT

  GH_USER_STATUS=0
  GH_USER_JSON=$(timeout "$EXTERNAL_CALL_TIMEOUT" gh api -X GET user 2> "$err_file") || GH_USER_STATUS=$?
  GH_USER_ERR=$(cat "$err_file")
  rm -f "$err_file"
}

# .what = read a piped sponsor value from stdin
#
# .why = the raw i/o boundary (stdin read) sat inline in the `--who @stdin`
#        orchestrator arm, while every other boundary in this file is a
#        named leaf (get_gh_user_session, read_sponsor_state,
#        is_gh_user_json_usable). the name here keeps that arm read as one
#        decision (rule.prefer.decomposable-architecture).
read_sponsor_stdin() {
  cat
}

# .what = a PURE transformer: a `gh api user` body → the `Name <email>` we write
#
# .why = github returns `.email: null` for an org that hides it, so the
#        address is DERIVED as <id>+<login>@users.noreply.github.com —
#        verified byte-for-byte against a real commit trailer. an error
#        that echoed the bare login would teach a shape we never write.
#
# .why = it emits ONLY the identity, and never an error. the gh calls and
#        their refusals live in the main flow instead, because this is
#        invoked under `$( )` — an `exit` here would end the SUBSHELL, and
#        an error printed here would be captured into the variable rather
#        than shown. ⇒ a failure would reach the human on stderr only,
#        which breaks rule.require.skill-output-streams silently.
#
# 🔴 .note = the bare `jq -r` reads below are safe ONLY because the caller
#         gates the body's shape first, via `is_gh_user_json_usable` above —
#         the shape half of this same boundary. drop that gate and a non-json
#         reply makes the first read exit non-zero under `set -euo pipefail`,
#         and the skill dies with jq's raw parse text instead of a curated
#         refusal. the gate cannot live INSIDE this transformer, for the
#         subshell reason above, ⇒ it is a named predicate beside it.
as_identity_from_gh_user_json() {
  local user_json="$1"

  # .why = `printf '%s'`, never `echo` — the same reason the two transformers
  #        below already give. a github `name` that holds a backslash escape
  #        is altered by shells that expand escapes, BEFORE jq ever parses
  #        it: a silent corruption of the exact identity this skill exists to
  #        preserve byte for byte. these three were the file's last holdouts
  #        from its own convention.
  local login name id email
  login=$(printf '%s' "$user_json" | jq -r '.login // empty')
  name=$(printf '%s' "$user_json" | jq -r '.name // empty')
  id=$(printf '%s' "$user_json" | jq -r '.id // empty')
  email=$(printf '%s' "$user_json" | jq -r '.email // empty')

  [[ -n "$name" ]] || name="$login"
  [[ -n "$email" ]] || email="${id}+${login}@users.noreply.github.com"

  printf '%s <%s>' "$name" "$email"
}

# .what = a PURE transformer: a `Name <email>` value → its two parts, set on
#         IDENTITY_NAME and IDENTITY_EMAIL. returns 1 where the value does
#         not hold that shape.
#
# .why = the shape is the one contract a bound sponsor must satisfy — it is
#        what `git commit --trailer` expects, byte for byte. a value that
#        misses it would reach a commit as a malformed trailer, which is a
#        defect no later guard on this path would catch.
#
# .why = the ADDRESS half forbids a space and demands a dot after the `@`,
#        so `Kai <not an address>` and `Kai <kai@localhost>` both refuse.
#        the NAME half allows any character but the ` <` that closes it,
#        since a human's name is not ours to restrict — a name with an
#        apostrophe, a comma, or a non-latin script is a name.
#
# .why = it sets two named globals rather than leak BASH_REMATCH out to its
#        caller. a caller that read `BASH_REMATCH[2]` would depend on the
#        group order of a regex it cannot see, which is the very decode
#        cost this extraction exists to remove.
as_identity_parts() {
  local raw="$1"

  # .note = the email half comes from the SHARED pattern, so the writer and
  #         `read_sponsor_state` cannot drift on what an address must look
  #         like. a reader looser than the writer accepts a file `set` would
  #         have refused (git.commit.operations.sh).
  [[ "$raw" =~ ^(.+)\ \<($SPONSOR_EMAIL_PATTERN)\>$ ]] || return 1

  IDENTITY_NAME="${BASH_REMATCH[1]}"
  IDENTITY_EMAIL="${BASH_REMATCH[2]}"
  return 0
}

######################################################################
# guard 2 — the identity BACKSTOP.
#
# .what = true where a name or email marks a party that cannot answer for a
#         change — a github app, or one of this repo's own clone identities.
#
# .why = a second net behind the actor guard, never the primary check.
#        it establishes a CLASS (a party that cannot answer for a
#        change), rather than a roster of known-bad names — which is
#        why it reads a marker github itself mints ([bot]) and the
#        clone identities this repo already declares, not a list this
#        file invents.
######################################################################
is_identity_robot() {
  local name="$1"
  local email="$2"

  # `[bot]` is github's own marker for an app account, and it is matched
  # ANYWHERE in the value, never as a suffix.
  #
  # .why = a suffix match would miss the very identity this repo commits
  #        under. github mints a bot's address as `<id>+<login>@users.
  #        noreply.github.com`, so in `…+ehm-a-seaturtle[bot]@users.
  #        noreply.github.com` the marker sits mid-string with 30 more
  #        characters behind it.
  #
  # .note = the breadth is deliberate, and it is a BACKSTOP, so a false
  #         positive costs a human one re-word of a name that holds a
  #         literal `[bot]`. a false negative costs a commit that names a
  #         party which cannot answer for it — the defect this exists to
  #         forbid. the cheap error is the one to prefer.
  [[ "$name" == *"[bot]"* ]] && return 0
  [[ "$email" == *"[bot]"* ]] && return 0

  # our own clone identities, as declared in keyrack.operations.sh
  #
  # 🔴 .why = BOTH halves go through that file's own predicates. the email
  #        half used to compare against its constants inline, which put a
  #        second decision point beside a declared source of truth: a third
  #        identity added there would be caught by name and missed by email.
  #        ⇒ `[case5][t3]` clamps the symmetry, roster entry by roster entry.
  is_one_seaturtle_identity_name "$name" && return 0
  is_one_seaturtle_identity_email "$email" && return 0

  # 🔴 ...and the clone's own github ACCOUNT — the ambient `gh auth login`
  # session, which is what `--who @me` resolves to on a cloud grove.
  #
  # .why = this is the one entry that carries `--who @me`'s whole guarantee.
  #        the vision rules that a cloud grove has no human session, so the
  #        bind there must REFUSE rather than name whoever it found. with no
  #        check here, `@me` resolves this account, passes every predicate
  #        above (the name holds no `[bot]`, the email matches neither bot
  #        address), and binds the clone as its own sponsor — the defect,
  #        restored under the paved flag.
  #
  # .why = it is an IDENTITY match, never an attribute test. three attribute
  #        predicates were measured and refuted (the email domain, the
  #        derived-address shape, and `gh api user --jq .type`, which reads
  #        "User" for this account) — because the clone owns an ordinary,
  #        human-shaped github account. ⇒ no property of the identity can
  #        separate the two, so the roster names the account outright.
  #
  # .why the FUNCTION, not raw comparisons = the two siblings above already
  #        go through the roster's own predicates; this third check compared
  #        `$name`/`$email` against the constants inline, which put a second
  #        decision point beside `keyrack.operations.sh`'s declared source of
  #        truth. `is_one_seaturtle_identity_clone` closes that gap.
  is_one_seaturtle_identity_clone "$name" "$email" && return 0

  return 1
}

# .what = the two placeholder names the extant guard already caught, moved
#         here from git.commit.set.sh and no wider.
#
# .why = the wish forbids a roster of known-bad names as the mechanism, and
#        the act guard above is what establishes a human. so this list is a
#        backstop that carries the PRIOR behavior across, and earns no new
#        entries — a guess like "john doe" or "@example.com" would be a
#        roster this file invented, unasked and unexercised.
is_identity_placeholder() {
  local name_lower
  # `printf '%s'`, never `echo` — see the note in as_identity_trimmed
  name_lower=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')

  case "$name_lower" in
    *"test user"*|*"test human"*) return 0 ;;
  esac

  return 1
}

# .what = true where the value holds a C0 control character
#
# .why = the sponsor lands verbatim in a `Co-authored-by:` trailer, which is
#        LINE-structured. a control character there is not a strange name; it
#        is a second line, or an escape sequence, in a place that admits only
#        one claim about one person.
#
# .why it is NAMED rather than inline = the three peer identity predicates on
#        this file already carry a name (`is_identity_robot`,
#        `is_identity_placeholder`, `is_gh_user_json_usable`), so a bare regex
#        beside them reads as an omission rather than a decision. the caller
#        now states WHAT it refuses; this leaf states how it detects it.
#
# 🔴 .why the class, never the two characters = `[[:cntrl:]]` covers all of C0.
#        the defect this repairs WAS a deny-list of two characters, so a
#        deny-list of two more is the same mistake one step along.
is_identity_unprintable() {
  [[ "$1" =~ [[:cntrl:]] ]]
}

# .what = the shared refusal scaffold for every `set` path, then exit 2
#
# 🔴 .why = seven refusal paths hand-rolled the SAME four lines — `emit_both`,
#        the turtle header, the tree start, and a remedy that names the two
#        grove-independent bind routes. only the error line and the prose
#        between them ever differed, so the scaffold was re-encoded seven
#        times and a change to the render shape was seven edits
#        (rule.require.named-transformers, and well past wet-over-dry's
#        rule of three).
#
# 🔴 .why = and the DUPLICATION was the hazard, not the length. the remedy
#        pair is a load-bearing guarantee — a refusal prints the command that
#        works on every grove, never `@me`, which resolves to the clone on a
#        cloud grove. seven copies of that guarantee is seven places for it
#        to drift, and a drifted copy hands the reader a second refusal.
#        ⇒ one leaf makes the guarantee structural rather than repeated.
#
# .note = the BODY is a pre-built string rather than a callback, because the
#         two paths that need one build it from data they hold (gh's stderr,
#         the reply preview). a caller that needs no prose passes "".
#
# .note = `remedy_head` exists for the ONE path that offers a third route —
#         `gh auth login`, for a session that failed rather than a cli that
#         is absent. it prefixes the pair; it never replaces it.
refuse_set() {
  local error="$1"
  local lead="$2"
  local body="${3:-}"
  local remedy_head="${4:-}"

  local remedy="$SPONSOR_BIND_REMEDY"
  [[ -n "$remedy_head" ]] && remedy="$remedy_head
$remedy"

  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.sponsor set"
    print_tree_error "$error"
    if [[ -n "$body" ]]; then
      echo ""
      printf '%s\n' "$body"
    fi
    print_instruction "$lead" "$remedy"
  )"
  exit 2
}

# .what = the shared refusal for both identity guards, then exit 2
#
# .why = ONE guard speaks ONCE: the stem states the CLASS the guard checks, and
#        only the detail line states the instance. two hand-written refusals
#        would drift apart, and a reader would then read the drift as a
#        distinction the design does not make.
refuse_identity() {
  local lead="$1"    # how the value was supplied
  local value="$2"
  local kind="$3"    # robot | placeholder
  local grove_note="${4:-}"

  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.sponsor set"
    print_tree_error "that identity cannot answer for a change"
    echo ""
    echo "   $lead"
    echo "     $value"
    echo "   ...and it is a $kind."
    echo ""
    echo "   a sponsor answers for the change in the real world. a $kind cannot"
    echo "   answer, so it cannot hold the slot."
    if [[ -n "$grove_note" ]]; then
      echo ""
      echo "   $grove_note"
    fi
    print_instruction "name the human instead:" "$SPONSOR_BIND_REMEDY"
  )"
  exit 2
}

# .what = the shared refusal for a damaged sponsor state PATH, then exit 1
#
# .why = a companion leaf, not a `refuse_set` parameter: this refusal exits
#        1 (malfunction — the tree is damaged) where every `refuse_set` call
#        exits 2 (constraint — the caller's input), and its remedy inspects
#        and clears a path rather than binds a value. to fold that second
#        exit code and a second remedy shape into `refuse_set` would widen a
#        leaf every OTHER caller depends on to stay single-purpose — the
#        same argument that kept `refuse_actor` a companion rather than a
#        `refuse_set` parameter.
refuse_set_state_damaged() {
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.sponsor set"
    print_tree_error "the sponsor state path is not a file"
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

######################################################################
# commands
######################################################################
case "$COMMAND" in
  set)
    if [[ -z "$WHO" ]]; then
      refuse_set "--who is required" "name the human:"
    fi

    # resolve the three value forms into one string, then guard the VALUE.
    # all three feed one guard — the form that supplied it is not a factor.
    VIA_AT_ME=false
    case "$WHO" in
      @me)
        VIA_AT_ME=true

        if ! command -v gh > /dev/null 2>&1; then
          # .note = no `gh auth login` remedy here, unlike the failed-session
          #         branch below. an absent cli cannot be authenticated.
          refuse_set "--who @me needs the gh cli, and it is absent" \
            "name the human instead:"
        fi

        # ask gh who this host's session belongs to. the call is time-bounded
        # and keeps gh's own stderr; the leaf states why for both
        get_gh_user_session

        if [[ "$GH_USER_STATUS" -ne 0 ]]; then
          # .why = gh's OWN words are the body, so the refusal reports what was
          #        measured rather than a cause it assumed. an empty stderr
          #        yields an empty body, which the leaf omits.
          GH_SAID_BODY=$(as_gh_said_body "$GH_USER_ERR")

          # 🔴 .why the LEAD tracks the BODY = "read gh's words above" points at
          #        text the leaf above OMITS when gh's stderr was empty. a gh
          #        that dies silently — killed by the timeout, a proxy that drops
          #        the body, a wrapper that exits non-zero with no message — then
          #        renders an instruction to read words that are not there, and
          #        the human stops to hunt for absent text on an already-failing
          #        path (rule.forbid.surprises).
          #
          #        ⇒ the two states differ in what the reader can DO. with gh's
          #        words, the words pick the route. without them, no diagnosis is
          #        on offer and both routes stand equally — so the lead says that
          #        plainly rather than send the reader after evidence we did not
          #        receive. ⚠️ the REMEDY is identical either way; only the claim
          #        about what was measured changes (rule.forbid.failhide — a
          #        refusal must not imply a diagnosis it does not hold).
          GH_FAILED_LEAD="gh said no more, so take the one that fits:"
          if [[ -n "$GH_SAID_BODY" ]]; then
            GH_FAILED_LEAD="read gh's words above, then take the one that fits:"
          fi

          refuse_set \
            "--who @me asked gh for your identity, and gh failed (exit $GH_USER_STATUS)" \
            "$GH_FAILED_LEAD" \
            "$GH_SAID_BODY" \
            "  \$ gh auth login"
        fi

        # 🔴 gate the BODY's shape before any field is read. the measurement
        #    that earned this gate lives on `is_gh_user_json_usable`, beside
        #    the transformer whose bare reads it makes safe.
        if ! is_gh_user_json_usable "$GH_USER_JSON"; then
          GH_USER_REPLY_HEAD=$(as_reply_preview "$GH_USER_JSON")
          refuse_set \
            "--who @me got a reply from gh that carries no identity" \
            "name the human instead:" \
            "   gh exited 0, so the call went through — but the reply holds no
   .login and .id, which is what an identity is built from.

   the reply began:
     ${GH_USER_REPLY_HEAD:-(empty)}"
        fi

        SPONSOR_RAW=$(as_identity_from_gh_user_json "$GH_USER_JSON")
        ;;
      @stdin)
        # .why = `cat` on a terminal blocks forever, so a human who typed
        #        `--who @stdin` with no pipe would meet a hang rather than a
        #        message — the one outcome worse than an error, because it
        #        reports naught at all (rule.require.status-feedback).
        #
        # 🔴 .note = clamped at `[case14][t1]` under a real pseudo-terminal.
        #        dogfooded: neutralize this test and the case goes red via a
        #        TIMEOUT rather than a bad exit — which is the whole point,
        #        because a hang is what it exists to prevent.
        if [[ -t 0 ]]; then
          refuse_set "--who @stdin expects a pipe, and none is piped" \
            "pipe the human in, or name them as a literal:"
        fi
        SPONSOR_RAW=$(read_sponsor_stdin)
        ;;
      *)
        SPONSOR_RAW="$WHO"
        ;;
    esac

    SPONSOR_RAW=$(as_identity_trimmed "$SPONSOR_RAW")

    if [[ -z "$SPONSOR_RAW" ]]; then
      refuse_set "--who resolved to an empty value" "name the human:"
    fi

    # 🔴 refuse a control character — BEFORE the shape gate, on the RAW value
    #
    # .note = WHAT the class is, and why it is refused at all, lives on
    #         `is_identity_unprintable`. what follows is why it fires HERE.
    #
    # .why = the READER refuses this same class (`read_sponsor_state`, gate 1),
    #        and the two must agree. a writer looser than its reader would bind
    #        a value that then refuses every commit — the human is told at the
    #        one moment they are provably present, never at the one moment only
    #        a clone is there to read the complaint.
    #
    # 🔴 .why it sits HERE, ahead of `as_identity_parts` = it was BELOW, on the
    #        split parts, and that left a hole one branch wide. the shape
    #        refusal below ECHOES `$SPONSOR_RAW` back to the terminal — so a
    #        value that carried an ESC *and* failed the shape check never
    #        reached the guard, and its escape sequence rendered.
    #
    # ⇒ the guard has to precede every refusal that quotes the value, which
    #        means it precedes the shape gate. ⚠️ on the RAW value, never the
    #        parts: the parts do not exist yet, and the raw value is what the
    #        echo would print.
    #
    # .note = `as_identity_trimmed` already dropped every `\n` and `\r` above,
    #         so what reaches here is ESC, TAB, and the rest of C0. that trim is
    #         an ERGONOMIC normalization of a piped value; this is the guard.
    #
    # 🔴 .note = the refusal does NOT echo the value, unlike every other refusal
    #        in this file. an ESC echoed into the turtle-tree render would let
    #        the rejected value rewrite the very message that rejects it.
    if is_identity_unprintable "$SPONSOR_RAW"; then
      refuse_set "that value holds a control character" \
        "a sponsor is one line, so name the human in plain text:"
    fi

    if ! as_identity_parts "$SPONSOR_RAW"; then
      refuse_set "that value is not a 'Name <email>'" \
        "name the human as a name plus an address:" \
        "   you gave:
     $SPONSOR_RAW"
    fi
    SPONSOR_NAME="$IDENTITY_NAME"
    SPONSOR_EMAIL="$IDENTITY_EMAIL"

    # how the refusal should describe where the value came from
    #
    # .why = the note states a fact about cloud groves, never a claim about
    #        THIS host. the skill runs no grove-detect, so it cannot say which
    #        grove it stands on — and a message that asserted one would be the
    #        same over-claim as a guard that read a proxy for a human.
    # .note = default, then override — never an if/else. the supplied case is
    #         the default because it is what every route but `@me` produces,
    #         so the branch states only what is SPECIAL about `@me`
    #         (rule.forbid.else-branches). `GH_FAILED_LEAD` above takes the
    #         same shape.
    LEAD="you named:"
    GROVE_NOTE=""
    if [[ "$VIA_AT_ME" == "true" ]]; then
      LEAD="the github session on this host reads:"
      GROVE_NOTE="🌊 on a cloud grove that session is the clone's, never yours."
    fi

    if is_identity_robot "$SPONSOR_NAME" "$SPONSOR_EMAIL"; then
      refuse_identity "$LEAD" "$SPONSOR_NAME <$SPONSOR_EMAIL>" "robot" "$GROVE_NOTE"
    fi

    if is_identity_placeholder "$SPONSOR_NAME"; then
      refuse_identity "$LEAD" "$SPONSOR_NAME <$SPONSOR_EMAIL>" "placeholder" ""
    fi

    # findsert .meter dir and its .gitignore
    # .why = the state holds a human's name and email — pii, and the most
    #        sensitive value any of these meters has held. the push skill
    #        already strips this exact value from pr bodies, so a design
    #        that committed it would publish what the push guards.
    #        ⇒ via the shared leaf, so this site and the `uses` site cannot
    #        drift on a scaffold whose only drift symptom is PII in a commit.
    findsert_gitignored_dir "$METER_DIR"

    # .what = provenance is part of the value: `me` = read from this host's
    #         own github session; `supplied` = handed in, piped or literal.
    #
    # .why = the two answer different questions. `me` says the binder
    #        sponsors their OWN work; `supplied` says someone named the
    #        requester. a reader must be able to tell them apart without a
    #        code read, so the value carries its own origin.
    #
    # 🔴 .note = the two labels are SINGLE-SOURCED in git.commit.operations.sh
    #         beside SPONSOR_STATE_FILENAME, because this is the WRITER and
    #         `read_sponsor_state` holds a `// "supplied"` READER default. a
    #         rename applied here and missed there is silent — the fallback
    #         would just begin to fire on every file. the enum's own members,
    #         and why `git-config` is not one, are recorded at the constant.
    # .note = default, then override, as with LEAD above.
    #
    # 🔴 .why the SUPPLIED label is the default = it is also the READER's
    #         fallback (`// $sourceDefault` in read_sponsor_state), so the two
    #         now agree by construction rather than by two branches that
    #         happen to pick the same word.
    SPONSOR_SOURCE="$SPONSOR_SOURCE_SUPPLIED"
    if [[ "$VIA_AT_ME" == "true" ]]; then
      SPONSOR_SOURCE="$SPONSOR_SOURCE_ME"
    fi

    # .note = the write boundary lives beside its reader in
    #         git.commit.operations.sh, because the two encode ONE wire format
    #         and a change applied to one and missed on the other is silent.
    #         the atomic-rename reasons are recorded there.
    #
    # 🔴 .why the write is CHECKED = it can refuse. a directory at the state
    #        path makes the write impossible, and the render below would
    #        otherwise report a bind that never landed — see the leaf's own
    #        note for why `mv` cannot fail loudly on its own.
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
    #        render exactly ONE tree, whatever it finds.
    #
    #        the header used to open before the read, so the corrupt branch
    #        emitted a SECOND full tree beneath a first one it had already
    #        printed and could no longer take back:
    #
    #          🐢 lets check the sponsor...      ← opened, then orphaned
    #          🐚 git.commit.sponsor             ← bare. no leaf ever follows
    #          🐢 bummer dude...
    #          🐚 git.commit.sponsor get
    #             └─ error: sponsor state file corrupt
    #
    # ⇒ 🔴 .why = it reads as the tool that printed a SUCCESS header and then
    #        an error — on the one surface a human reaches for when every
    #        commit in the tree refuses. the moment they most need a clear
    #        answer is the moment it rendered two contradictory ones
    #        (rule.require.treestruct-output, rule.forbid.surprises).
    #
    # .note = the order is the whole fix. the read is pure and cheap, so it
    #         costs the happy path no work to know the outcome before it
    #         commits to a header.
    #
    # .why = the shared reader, never a local jq. these reads WERE bare
    #        `jq -r ... "$STATE_FILE"` calls, so under `set -euo pipefail` a
    #        corrupt file killed the run with jq's raw parse text — no file
    #        named, no remedy offered, and an exit code jq picked rather than
    #        this skill (rule.require.failloud).
    #
    # .why = provenance is part of the value, so `get` renders it — that is
    #        the whole reason the reader returns it: a human tells a
    #        session-read bind from a supplied one without a code read.
    #
    # 🔴 .why = ONE call answers BOTH questions. this block opened with its own
    #        `[[ ! -f "$STATE_FILE" ]]` check that rendered `(none)` before the
    #        reader ran — a second idea of "is a sponsor bound", beside the
    #        reader that already decides it. it was correct and it was a
    #        second decision point: when the reader learned that a file which
    #        parses but names no sponsor is UNUSABLE, `get` would have kept
    #        the older, narrower sense of bound unless edited too. one state
    #        file wants one reader, and one reader wants one caller-side
    #        branch on its status.
    SPONSOR_GET_STATUS=0
    read_sponsor_state "$STATE_FILE" || SPONSOR_GET_STATUS=$?

    # 1 = the file is present and unusable. a malfunction, and a class apart
    # from the unbound tree below: the remedy is to inspect the file, never
    # to bind a sponsor that is already written.
    #
    # .note = it is answered FIRST, before any header, so its tree is the only
    #         one on screen. see the order note at the top of this branch.
    if [[ "$SPONSOR_GET_STATUS" -eq 1 ]]; then
      # .note = the render is SHARED with the sponsor guard in git.commit.set —
      #         the two had already drifted once on the bind-form set, so the
      #         tree now lives in one leaf and only the label is per-site. the
      #         reasons for each line are on `print_sponsor_corrupt_render`.
      emit_both "$(print_sponsor_corrupt_render "git.commit.sponsor get")"
      exit 1  # malfunction
    fi

    print_turtle_header "lets check the sponsor..."
    print_tree_start "git.commit.sponsor"

    # 2 = no file is bound. an unbound tree is a normal state, never a fault,
    # so it renders and exits 0.
    if [[ "$SPONSOR_GET_STATUS" -eq 2 ]]; then
      echo "   └─ sponsor: (none)"
      # .note = no echo "" here; print_coconut_hint opens with its own blank
      #         line, and a second renders as a gap (forbid.snapshot-visual-blemishes)
      #
      # .why = the affordance names WHO may bind, never what the reader should
      #        do. `get` is the ONE subcommand with no actor guard (invariant
      #        3), so it is read by a clone AND by a human and must fit both.
      #        "ask your human to…" fits only the clone — it commands a human
      #        who is often the very reader. as written, a clone reads "not me",
      #        a human reads "that is me, and here is the command".
      #        ⇒ the imperative form is correct in `git.commit.set`, which a
      #        clone runs and a human does not (rule.require.errors-name-the-fix).
      # 🔴 .why a COCONUT here, and PLAIN PROSE on every refusal = the two
      #        carry opposite loads. a refusal's remedy is MANDATORY — the
      #        caller is stopped until it runs — and `rule.require.coconut-hints`
      #        grades a coconut that carries mandatory load a BLOCKER.
      #
      #        this render is the inverse: `get` succeeded, exits 0, and reports
      #        a true state. the bind is an OPTIONAL next move, which is the one
      #        sense the coconut marks (its `.when it applies` table lists a
      #        recovery path as ✅).
      #
      # ⇒ so the 🥥 is not decoration; it is what tells the reader which of the
      #        two renders they face, with no re-read of the text above.
      print_coconut_hint "a human binds this tree's sponsor" \
        "$SPONSOR_BIND_VIA_STDIN" \
        "$SPONSOR_BIND_VIA_LITERAL"
      exit 0
    fi

    echo "   ├─ name: $SPONSOR_NAME"
    echo "   ├─ email: $SPONSOR_EMAIL"
    echo "   └─ source: $SPONSOR_SOURCE"
    ;;

  del)
    # 🔴 .why `-e`, never `-f` = the ABSENCE test must ask "is there an ENTRY
    #        here", never "is there a REGULAR FILE here". `read_sponsor_state`
    #        classifies a DIRECTORY at this path as DAMAGE (status 1), and its
    #        curated refusal names `del` as the one remedy.
    #
    #        ⇒ a `-f` gate here answers that remedy with "groovy, already
    #        clear", removes no entry, and exits 0 — so the repair the human
    #        was just sent to run NO-OPS, and the `set` that follows dies at
    #        `mv` with a raw system error about a directory.
    #
    #        ⚠️ the reader and its own advertised remedy must agree on what
    #        ABSENCE means, or the remedy path carries the very
    #        damage-reported-as-absence failhide the reader exists to close
    #        (rule.forbid.failhide). ⇒ this is the `-e` vs `-f` split of
    #        `read_sponsor_state`, applied to the second half of the pair.
    #
    # 🔴 .clamp = `git.commit.set` `[case49][t1]` WALKS the promise: it refuses a
    #        commit against a corrupt file, runs the `del` that refusal printed,
    #        binds, and commits. ⇒ the one test that proves this arm never READS
    #        the state it was sent to remove. dogfooded: a `read_sponsor_state`
    #        gate inserted above turns it red while the refusal's TEXT stays
    #        green — which is exactly the drift a text assertion cannot see.
    if [[ ! -e "$STATE_FILE" ]]; then
      print_turtle_header "groovy, already clear"
      print_tree_start "git.commit.sponsor del"
      echo "   └─ sponsor: (none)"
      exit 0
    fi

    # .why = `-rf`, never `-f` = the entry may be a DIRECTORY (the damage the
    #        gate above now admits), and `rm -f` cannot remove one — it would
    #        exit non-zero and kill the skill under `set -e`, one step short of
    #        the repair.
    #
    # ⚠️ .why the GUARD above the `rm` = `-rf` is a sharp tool, and this comment
    #        used to end "the recursion is bounded to this ONE skill-owned
    #        path". that was an ASSERTION about the code, never a guarantee
    #        from it: any later change that let `STATE_FILE` point elsewhere —
    #        a path join reworked, a `rev-parse` that answers oddly, a
    #        symlinked `.meter` — would delete that subtree instead, silently.
    #
    # ⇒ so the claim is now CHECKED rather than promised. the path must end in
    #        the skill's own state filename or the skill fails fast with a
    #        malfunction, and the sharp tool cannot be aimed anywhere else
    #        (rule.forbid.maintenance-hazards, rule.require.failfast).
    #
    # ⚠️ .note = a `rm -f` + `rmdir` pair was weighed as the softer tool and
    #        REFUTED by measurement: `rmdir` refuses a NON-EMPTY directory, and
    #        `[case6][t2]` seeds exactly that — a stray dir that holds a file.
    #        the softer pair would leave the damage in place and report it
    #        cleared, which is the failhide this whole `del` repair closed.
    if [[ "$STATE_FILE" != *"/$SPONSOR_STATE_FILENAME" ]]; then
      emit_both "error: refused to clear an unexpected path: $STATE_FILE"
      exit 1
    fi
    rm -rf "$STATE_FILE"
    print_turtle_header "groovy, sponsor cleared"
    print_tree_start "git.commit.sponsor del"
    echo "   └─ cleared"
    ;;
esac
