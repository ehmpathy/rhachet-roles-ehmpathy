#!/usr/bin/env bash
######################################################################
# .what = manage global git commit blocker for mechanics
#
# .why  = humans can pause all mechanic commits across all repos
#         with a single global circuit breaker
#
# usage:
#   git.commit.uses.global block    # block commits globally
#   git.commit.uses.global allow    # lift global blocker
#   git.commit.uses.global get      # check global blocker state
#
# guarantee:
#   - global blocker stored at ~/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter/
#   - global blocker overrides local quota
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

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  emit_both "error: not in a git repository"
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
      echo "usage: git.commit.uses --global block"
      echo "       git.commit.uses --global allow"
      echo "       git.commit.uses --global get"
      echo ""
      echo "commands:"
      echo "  block  pause all mechanic commits globally"
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
      emit_both "error: unknown option: $1
usage: git.commit.uses --global block|allow|get"
      exit 2
      ;;
    *)
      shift
      ;;
  esac
done

# validate command
if [[ -z "$COMMAND" ]]; then
  emit_both "error: command required (block, allow, or get)
usage: git.commit.uses --global block|allow|get"
  exit 2
fi

######################################################################
# guard: mutation commands require TTY (human only)
# note: __I_AM_HUMAN=true allows integration tests to run mutations
######################################################################
case "$COMMAND" in
  block|allow)
    guard_actor_is_human_via_stdin "git.commit.uses $COMMAND --global"
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
    print_tree_start "git.commit.uses block --global"
    echo "   └─ commits blocked globally"
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
        print_tree_start "git.commit.uses allow --global"
        print_tree_error "the global blocker path is not a file"
        echo ""
        echo "   commits stay blocked until this path is cleared by hand:"
        echo "     $GLOBAL_METER_FILE_SHOWN"
        echo "   inspect it, then remove it:"
        echo "     \$ ls -la $GLOBAL_METER_FILE_SHOWN"
        echo "     \$ rm -r $GLOBAL_METER_FILE_SHOWN"
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
    print_tree_start "git.commit.uses allow --global"
    echo "   └─ commits resumed globally"

    # nudge: this lifts the fleet-wide blocker, so it is a quota-grant
    # moment for THIS tree same as a local `set` — shared reader, see
    # `print_sponsor_bind_nudge_if_absent` (git.commit.operations.sh).
    print_sponsor_bind_nudge_if_absent
    ;;

  get)
    print_turtle_header "lets check the global meter..."
    print_tree_start "git.commit.uses get --global"

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

    # 🔴 .why ONE label, nested once = three OVERLAPPING `if`s used to stand
    #        here (not-2, 2-and-not-corrupt, corrupt), and a reader had to
    #        hold all three and confirm the last two are mutually exclusive
    #        with the first to know exactly one ever fires. this mirrors the
    #        twin surface's own shape (`uses.local get`'s `GLOBAL_BLOCK_LABEL`)
    #        so the two reads of one file render it the same way, by
    #        construction (rule.require.named-transformers).
    GLOBAL_BLOCK_LABEL="not blocked"
    if [[ "$GLOBAL_BLOCK_STATUS" -eq 2 ]]; then
      GLOBAL_BLOCK_LABEL="blocked"
      if [[ "$GLOBAL_BLOCK_CORRUPT" == "true" ]]; then
        GLOBAL_BLOCK_LABEL="blocked (file corrupt)"
      fi
    fi
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
    emit_both "error: unknown command: $COMMAND
usage: git.commit.uses --global block|allow|get"
    exit 2
    ;;
esac
