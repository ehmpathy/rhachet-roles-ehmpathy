#!/usr/bin/env bash
######################################################################
# .what = manage the global blocker for one meter: commit or release
#
# .why  = humans can pause all mechanic commits, or all releases, across
#         all repos with a single global circuit breaker per meter
#
# usage:
#   git.commit.uses --global block     # block commits globally
#   git.commit.uses --global allow     # lift the commit blocker
#   git.release.uses --global block    # block releases globally
#   git.release.uses --global get      # check the release blocker
#
# guarantee:
#   - the dispatcher names the meter via `--meter commit|release`, first arg
#   - blocker stored at ~/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter/
#     (git.commit.uses.jsonc · git.release.uses.jsonc)
#   - a global blocker overrides the org and local levels of its own meter only
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"
# .why = ROLE_REPO, ROLE_SLUG, GLOBAL_METER_DIR and GLOBAL_METER_FILE were
#        re-declared here, byte-identical to the copies in operations.sh and
#        in two peer skills. four copies of ONE path means a move of the
#        storage root has to land in four places to stay true; miss one and
#        that skill reads a meter nobody writes — a permission silently
#        granted or silently withheld, with no error to trace it by.
# .note = operations.sh is pure at source time (constants + functions, no
#         top-level command), so this source adds names and no behavior.
source "$SCRIPT_DIR/git.commit.operations.sh"

# scope the shared global reader + renders to the meter the dispatcher named;
# no default: a call with no --meter fails closed in set_meter_scope
METER_ARG=""
if [[ "${1:-}" == "--meter" ]]; then
  METER_ARG="${2:-}"
  shift 2 || shift $#
fi
set_meter_scope "$METER_ARG"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  emit_both "✋ ConstraintError: not in a git repository"
  exit 2
fi

# parse command
COMMAND=""

# first positional arg is command
if [[ $# -ge 1 && "$1" != --* ]]; then
  COMMAND="$1"
  shift
fi

while [[ $# -gt 0 ]]; do
  case $1 in
    block|allow|get)
      COMMAND="$1"
      shift
      ;;
    --help|-h)
      echo "usage: $METER_SKILL --global block"
      echo "       $METER_SKILL --global allow"
      echo "       $METER_SKILL --global get"
      echo ""
      echo "commands:"
      echo "  block  pause all mechanic $METER_NOUN_PLURAL globally"
      echo "  allow  lift global blocker, resume local behavior"
      echo "  get    check global blocker state"
      echo ""
      echo "options:"
      echo "  --help, -h            show this help"
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
      # rhachet passthrough args, boolean flags - ignore, no value to eat
      shift
      ;;
    --)
      shift
      ;;
    --*)
      emit_both "✋ ConstraintError: unknown option: $1
usage: $METER_SKILL --global block|allow|get"
      exit 2
      ;;
    *)
      shift
      ;;
  esac
done

# validate command
if [[ -z "$COMMAND" ]]; then
  emit_both "✋ ConstraintError: command required (block, allow, or get)
usage: $METER_SKILL --global block|allow|get"
  exit 2
fi

######################################################################
# guard: mutation commands require TTY (human only)
# note: __I_AM_HUMAN=true allows integration tests to run mutations
######################################################################
case "$COMMAND" in
  block|allow)
    guard_actor_is_human_via_stdin "$METER_SKILL $COMMAND --global"
    ;;
esac

case "$COMMAND" in
  block)
    # create global blocker file
    #
    # 🔴 .why a TEMP file then `mv` = this was the ONE writer in the family
    #        still non-atomic. local, org, and sponsor all landed on temp+mv;
    #        global's `block` arm kept a bare `cat > file`, which truncates
    #        first and fills after.
    #
    # 🔴 .why it matters MORE here than anywhere else = the reader on the
    #        other side of this file is hardened to fail CLOSED, and this
    #        file's scope is the whole host. so a crash, a full disk, or a
    #        `kill` between the truncate and the write leaves a torn file
    #        that blocks every commit in every repo on the machine — and the
    #        only exit is a manual `rm -r`.
    #
    #        ⇒ the two halves compose into a self-inflicted outage: the
    #        harder the reader, the worse a torn write is. an atomic rename
    #        is what lets the reader stay strict — a peer sees the prior
    #        complete file or the new complete file, and never a half one.
    #
    # ⚠️ .note = this makes the WRITE atomic, never the read-modify-write
    #         around it. the same lock this family still owes covers that:
    #         `.dream/v2026_09_12.fix.org-state-mutations-are-an-unlocked-read-modify-write.md`
    mkdir -p "$GLOBAL_METER_DIR"
    GLOBAL_METER_FILE_TEMP="${GLOBAL_METER_FILE}.tmp.$$"
    # .why the EXIT trap = a SIGINT/SIGTERM/kill between this write and the
    #        `mv` below leaves `$GLOBAL_METER_FILE_TEMP` behind in the state
    #        dir — the same window the family's other temp+mv writers
    #        (set_sponsor_state, write_org_file) guard for the identical
    #        reason.
    trap 'rm -f "${GLOBAL_METER_FILE_TEMP:-}"' EXIT
    cat > "$GLOBAL_METER_FILE_TEMP" << EOF
{
  "blocked": true
}
EOF
    mv -f "$GLOBAL_METER_FILE_TEMP" "$GLOBAL_METER_FILE"

    print_turtle_header "groovy, bond fire time"
    print_tree_start "$METER_SKILL block --global"
    echo "   └─ $METER_NOUN_PLURAL blocked globally"

    # each meter owns its own kill switch (F10): a commit block leaves releases
    # live, so a human mid-incident learns the second switch from this render
    if [[ "$METER_KIND" == "commit" ]]; then
      print_coconut_hint "releases ride their own switch; this one leaves them live. to halt releases too" \
        "git.release.uses block --global"
    fi
    ;;

  allow)
    # 🔴 .why this arm REFUSES rather than reports success = `rm -f` removes a
    #        regular file and cannot remove a DIRECTORY. the `-f` guard let a
    #        directory at this path fall straight past the delete to the
    #        render, which announced `commits resumed globally` while the
    #        blocker that halts every commit in the fleet sat untouched
    #        (rule.forbid.failhide).
    #
    # 🔴 .why it is the SHARPEST instance of that class here = this command is
    #        what the corrupt-file refusals PRINT as their remedy. a human who
    #        is told to run it, runs it, and is told it worked, has been handed
    #        a green light by the very path that refused them — and their next
    #        commit refuses again, for the reason they were told was cleared.
    if [[ -e "$GLOBAL_METER_FILE" && ! -f "$GLOBAL_METER_FILE" ]]; then
      emit_both "$(
        print_turtle_header "bummer dude..."
        print_tree_start "$METER_SKILL allow --global"
        print_tree_malfunction "the global blocker path is not a file"
        echo ""
        echo "   $METER_NOUN_PLURAL stay blocked until this path is cleared by hand:"
        echo "     $GLOBAL_METER_FILE_SHOWN"
        print_coconut_hint "inspect the path, then remove it" \
          "ls -la $GLOBAL_METER_FILE_SHOWN" \
          "rm -r $GLOBAL_METER_FILE_SHOWN"
      )"
      # a damaged host path is a MALFUNCTION, not bad caller input — the same
      # class `guard_org_meter_is_readable` and `refuse_set_state_damaged`
      # both exit 1 for. exit 2 here would read as a fixable caller mistake.
      exit 1
    fi

    # delete global blocker file (no-op if absent)
    if [[ -f "$GLOBAL_METER_FILE" ]]; then
      rm -f "$GLOBAL_METER_FILE"
    fi

    print_turtle_header "shell yeah, back in the water!"
    print_tree_start "$METER_SKILL allow --global"
    echo "   └─ $METER_NOUN_PLURAL resumed globally"

    # nudge: this lifts the fleet-wide blocker, so it is a quota-grant
    # moment for THIS tree same as a local `set` — shared reader, see
    # `print_sponsor_bind_nudge_if_absent` (git.commit.operations.sh).
    # .note = only the commit meter buys commits, so only it earns the nudge
    if [[ "$METER_KIND" == "commit" ]]; then
      print_sponsor_bind_nudge_if_absent
    fi
    ;;

  get)
    print_turtle_header "lets check the global meter..."
    print_tree_start "$METER_SKILL get --global"

    # 🔴 the SHARED reader decides, and this render only asks it.
    #
    # 🔴 .why = this arm carried its own read, keyed on jq's EXIT STATUS alone.
    #        a 0-BYTE file made jq exit 0 with an empty capture, so the compare
    #        against "true" was false and it printed `global: not blocked`; a
    #        DIRECTORY at the path failed `-f` and printed the same. ⇒ **the
    #        most authoritative read of the global blocker reported a damaged
    #        file as a healthy, permissive one** (rule.forbid.failhide).
    #
    # ⇒ 🔴 .why it was DELETED rather than hardened = `check_global_blocker`
    #        was hardened one round earlier and these two render surfaces were
    #        not, so a gate and its own display disagreed about one file. a
    #        third hardened copy would settle today's disagreement and keep the
    #        structure that produced it. **one reader, one decision point.**
    GLOBAL_BLOCK_STATUS=0
    check_global_blocker || GLOBAL_BLOCK_STATUS=$?

    # .why the SHARED leaf = every surface that reads the global blocker
    #       (commit get, commit get --global, release get) renders it through
    #       one label leaf, so the three cannot drift (rule.require.named-transformers)
    GLOBAL_BLOCK_LABEL="$(as_global_block_display status="$GLOBAL_BLOCK_STATUS" corrupt="$GLOBAL_BLOCK_CORRUPT")"
    echo "   └─ global: $GLOBAL_BLOCK_LABEL"

    # 🔴 .why the file is NAMED = this render is the most authoritative read
    #        of the global blocker there is, and it stopped one step short
    #        of the file — host-dependent, and printed nowhere else, so the
    #        human could neither inspect nor clear it
    #        (rule.require.errors-name-the-fix).
    #
    # 🔴 .why the SHARED leaf, never a copy = the twin surface,
    #        `uses.local get`, prints this same note. it was written out
    #        twice, and only the twin's copy was clamped — so a reword or a
    #        dropped remedy line HERE would ship green and leave the two
    #        reads of one file disagreed about how to repair it.
    #        ⇒ `print_global_corrupt_note` now owns the text, and this site
    #        carries its own clamp (`[case10][t2]`). it is a NO-OP unless
    #        `GLOBAL_BLOCK_CORRUPT` is true, so an unconditional call here
    #        matches the twin surface's own unconditional call.
    print_global_corrupt_note
    ;;

  *)
    emit_both "✋ ConstraintError: unknown command: $COMMAND
usage: $METER_SKILL --global block|allow|get"
    exit 2
    ;;
esac
