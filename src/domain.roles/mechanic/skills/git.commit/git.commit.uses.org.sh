#!/usr/bin/env bash
######################################################################
# .what = manage org-level git commit permissions for mechanics
#
# .why  = humans can allow/block commits per org:
#         - specific org overrides @all default
#         - @all resets all orgs and sets default
#         - org config is overridden by local repo config
#
# usage:
#   git.commit.uses --org ehmpathy allow   # allow commits for ehmpathy
#   git.commit.uses --org ahbode block     # block commits for ahbode
#   git.commit.uses --org @all allow       # allow all orgs (reset + default)
#   git.commit.uses --org @all block       # block all orgs (reset + default)
#   git.commit.uses --org ehmpathy del     # remove ehmpathy config, defer to @all
#   git.commit.uses --org get              # show all org configs
#   git.commit.uses --org ehmpathy get     # show config for specific org
#
# guarantee:
#   - state stored at ~/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter/
#   - specific org config overrides @all
#   - org config is overridden by local repo config
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"
# .why = ROLE_REPO, ROLE_SLUG and GLOBAL_METER_DIR were re-declared here,
#        byte-identical to the copies in operations.sh and in two peer
#        skills. four copies of ONE path means a move of the storage root
#        has to land in four places to stay true; miss one and that skill
#        reads a meter nobody writes — a permission silently granted or
#        silently withheld, with no error to trace it by.
#
# 🔴 .why = the org file also carried TWO names for ONE path — a local one
#        here, and ORG_METER_FILE in operations.sh. a synonym for a shared
#        resource is worse than a duplicate literal: a reader who greps one
#        name finds half the callers and concludes the other half does not
#        exist (rule.require.ubiqlang). ⇒ this file now uses the shared name.
#
# .note = operations.sh is pure at source time (constants + functions, no
#         top-level command), so this source adds names and no behavior.
source "$SCRIPT_DIR/git.commit.operations.sh"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  emit_both "error: not in a git repository"
  exit 2
fi

# parse args
ORG_NAME=""
COMMAND=""

# first positional arg could be org name or command
if [[ $# -ge 1 && "$1" != --* ]]; then
  # check if it's a command
  case "$1" in
    allow|block|del|get)
      COMMAND="$1"
      shift
      ;;
    *)
      ORG_NAME="$1"
      shift
      ;;
  esac
fi

while [[ $# -gt 0 ]]; do
  case $1 in
    allow|block|del|get)
      COMMAND="$1"
      shift
      ;;
    --help|-h)
      echo "usage: git.commit.uses --org <org> allow|block|del"
      echo "       git.commit.uses --org @all allow|block"
      echo "       git.commit.uses --org get"
      echo "       git.commit.uses --org <org> get"
      echo ""
      echo "commands:"
      echo "  allow        allow commits for this org"
      echo "  block        block commits for this org"
      echo "  del          remove org config, defer to @all"
      echo "  get          show org config(s)"
      echo ""
      echo "special values:"
      echo "  @all         sets default for all orgs (resets all + sets default)"
      echo ""
      echo "options:"
      echo "  --help, -h   show this help"
      exit 0
      ;;
    --repo|--role|--skill|--org)
      # rhachet passthrough args that carry a value - ignore flag + value
      shift
      # if next arg exists and is not a flag, skip it too
      if [[ $# -gt 0 && "$1" != --* && "$1" != -* ]]; then
        shift
      fi
      ;;
    --local|--global)
      # rhachet passthrough args with no value - shift alone
      # (a value arm here would silently swallow the next real token, e.g.
      # `--org ehmpathy --global allow` would swallow `allow` as --global's
      # dummy value — the exact class rule.require.failfast forbids)
      shift
      ;;
    --)
      shift
      ;;
    --*)
      emit_both "error: unknown option: $1"
      exit 2
      ;;
    *)
      # positional arg - could be org name
      if [[ -z "$ORG_NAME" ]]; then
        ORG_NAME="$1"
      fi
      shift
      ;;
  esac
done

# validate command
if [[ -z "$COMMAND" ]]; then
  emit_both "error: command required (allow, block, del, or get)
usage: git.commit.uses --org <org> allow|block|del|get"
  exit 2
fi

# typo protection: all/ALL → suggest @all
if [[ "$ORG_NAME" == "all" || "$ORG_NAME" == "ALL" ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "git.commit.uses $COMMAND --org $ORG_NAME"
  echo "   └─ error: did you mean @all?"
  exit 2
fi

######################################################################
# guard: mutation commands require TTY (human only)
# note: __I_AM_HUMAN=true allows integration tests to run mutations
######################################################################
case "$COMMAND" in
  allow|block|del)
    guard_actor_is_human_via_stdin "git.commit.uses $COMMAND --org $ORG_NAME"
    ;;
esac

######################################################################
# operations: read/write org state file
######################################################################
# 🔴 the ONE capture every arm reads. the guard below fills it, once, and
#    `read_org_file` hands out that same string for the rest of the process.
#
# 🔴 .why = the guard used to validate the file in one spawn and each arm then
#        re-opened it in another, so the promise "this file is readable" covered
#        bytes that arm never saw. a `chmod`, a truncate, or a concurrent write
#        between the two opens put the arm back on the raw-jq-text path the
#        guard exists to remove (rule.require.failloud).
#
# ⇒ .why a captured STRING and not a re-read = it is the same move
#    `check_org_blocker` and `read_sponsor_state` already make: gate the bytes,
#    then answer every question from the bytes you gated. one reader, one
#    decision point.
#
# ⚠️ .note = this closes the guard→read window. it does NOT close the read→write
#         one: `set_org_state` still reads, edits, and writes with no lock, so
#         two concurrent mutations can drop an update. that needs a lock, and it
#         is caught as a dream rather than half-built here:
#         `.dream/v2026_09_12.fix.org-state-mutations-are-an-unlocked-read-modify-write.md`
ORG_METER_BYTES=''

read_org_file() {
  printf '%s' "$ORG_METER_BYTES"
}

######################################################################
# guard: the org meter is absent, or it is present AND readable
#
# .what = a no-op when the file is ABSENT — that is the ordinary first run, and
#         `read_org_file` answers it with an empty skeleton. it refuses only
#         when the path is present and cannot be read as an object.
#
# 🔴 .why it runs ONCE, above the dispatch = every arm below reaches the same
#        file. `get` reads it, `allow`/`block`/`del` read-modify-write it, and
#        each one did `read_org_file | jq …` under `set -euo pipefail` with no
#        gate. on a truncated or hand-edited file that means jq's raw parse
#        text, no file named, no remedy, and an exit code jq chose rather than
#        this skill (rule.require.failloud).
#
# 🔴 .why ONE call and never four = the gate was first written inside the `get`
#        arm alone, so the read surface refused politely while the three WRITE
#        surfaces still crashed on the same bytes — a skill disagreed with
#        itself about one file. ⇒ one reader, one decision point.
#
# ⚠️ .why a mutation must refuse rather than overwrite = `allow --org x` against
#         a damaged file would otherwise discard whatever it could not parse and
#         write a fresh skeleton, so a human who meant to ADD one org would
#         silently drop every org already named there.
#
# .why `-s` + `.[0]` = a 0-byte file makes a bare `jq -e` exit 0 with no output,
#        so the filter never runs at all. the slurp turns empty input into `[]`,
#        whose `.[0]` is a `null` that a TYPE test rejects — the same gate
#        `read_sponsor_state` and `check_global_blocker` use.
######################################################################
# .what = emit the org meter's bytes on stdout when it is a regular file this
#         process can read AND those bytes parse as a json object. otherwise
#         return 1 and emit no value.
#
# .why NAMED = the guard below read as a three-clause boolean — a file test, a
#        read test, and a jq shape test chained by `&&` — which a reader had to
#        decompose before they could see what the guard decides
#        (rule.require.named-transformers).
#
# 🔴 .why it RETURNS the bytes rather than a verdict = a verdict is a claim about
#        a file, and a file can change. the bytes ARE what the arms act on, so
#        the caller keeps the evidence rather than a report about it.
#        ⇒ a predicate would have left every arm to re-open the file and meet
#        whatever it found there.
#
# .why the capture is taken BEFORE the shape test = the two must run over one
#        string, or the gate and the value come from two opens again.
#
# .why `cat … 2>/dev/null` = the `-r` test and the open are two syscalls, so a
#        chmod or a target swap between them leaves `cat`'s own
#        `Permission denied` on the caller's stderr beside the curated refusal.
#        `read_sponsor_state` mutes its read for this same reason.
read_org_meter_bytes() {
  [[ -f "$ORG_METER_FILE" && -r "$ORG_METER_FILE" ]] || return 1

  local contents
  contents=$(cat "$ORG_METER_FILE" 2>/dev/null) || return 1

  # 🔴 .why the gate checks `.orgs`, never only the top level = a hand-edited
  #        `{"orgs": "x"}` passes `type == "object"` at the top, so it slipped
  #        past this reader untouched. `get_org_state`'s
  #        `jq -r '.orgs[$org] // "unset"'` then evaluated `"x"["ehmpathy"]`,
  #        jq exited non-zero, and `set -euo pipefail` inside the capture
  #        killed the skill with jq's raw parse text — no file named, no
  #        remedy, and an exit code jq chose rather than this skill
  #        (rule.forbid.maintenance-hazards).
  #
  # ⇒ the twin commit-gate reader (`check_org_blocker` → `read_org_meter_key`)
  #        already routes this exact shape through `|| return 1` and calls it
  #        corrupt, so the display path disagreed with the gate about one
  #        file. one reader, one decision — the container gets the same type
  #        check its leaves already carry (`is_org_state_known`).
  printf '%s' "$contents" \
    | jq -s -e '.[0] | type == "object" and (.orgs | type == "object")' \
      >/dev/null 2>&1 || return 1

  printf '%s' "$contents"
}

guard_org_meter_is_readable() {
  # an absent file is the ordinary first run. the skeleton is what every arm
  # reads, so it is seeded here rather than branched on at each read site
  if [[ ! -e "$ORG_METER_FILE" ]]; then
    ORG_METER_BYTES='{ "orgs": {} }'
    return 0
  fi

  if ORG_METER_BYTES=$(read_org_meter_bytes); then
    return 0
  fi

  # 🔴 .why BOTH the headline and the body come from the SHARED leaf = this
  #        state has two surfaces — here, and the commit gate through
  #        `print_org_corrupt_note` — and they carried two hand-written
  #        renders. the COMMANDS were unified one round ago and the BODY the
  #        round after; the HEADLINE was left behind, so one state still
  #        announced itself two ways: the commit gate named the path in its
  #        headline and this arm did not.
  #
  # ⇒ 🎯 a reword is now one edit rather than three, and the surfaces cannot
  #        drift again by construction. the tree-start above stays local
  #        because it names THIS command; the headline and body are shared,
  #        because they describe the state rather than the command.
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.uses $COMMAND --org${ORG_NAME:+ $ORG_NAME}"
    print_tree_error "$ORG_CORRUPT_HEADLINE"
    print_org_corrupt_body
  )"
  exit 1  # malfunction
}

guard_org_meter_is_readable

# 🔴 .why a TEMP file then `mv` = a reader then sees the prior complete file or
#        the new complete file, and never a partial one — `mv` within one
#        directory is an atomic rename. this WAS a bare `echo > file`, so a
#        reader that landed mid-write saw a truncated org meter and the
#        precedence chain answered from half a file.
#
# .why = and `printf '%s'`, never `echo` — `echo` mangles a value that opens
#        with a dash and interprets a backslash on some shells. the identity
#        leaves of git.commit.sponsor.sh were converted for this same reason.
#
# ⚠️ .note = this makes each WRITE atomic. it does NOT make the read-modify-write
#         around it atomic: `set_org_state` reads, edits, and writes, and the
#         actor guard admits any number of terminals — so two concurrent
#         `allow`/`block` calls can still interleave and drop one update. that
#         needs a LOCK, which is a wider change than this wish opened.
#         ⇒ caught as a dream rather than half-built here:
#         `.dream/v2026_09_12.fix.org-state-mutations-are-an-unlocked-read-modify-write.md`
write_org_file() {
  local content="$1"
  local file_temp

  mkdir -p "$GLOBAL_METER_DIR"

  file_temp="${ORG_METER_FILE}.tmp.$$"
  # .why the EXIT trap = a SIGINT/SIGTERM/kill between this write and the `mv`
  #        below leaves `$file_temp` behind in the state dir — the same window
  #        `get_gh_user_session`/`set_sponsor_state` guard for the identical
  #        reason. the `${...:-}` default holds for the same reason too: a
  #        late trap under `set -u` reads `file_temp` after this function
  #        already returned.
  trap 'rm -f "${file_temp:-}"' EXIT
  printf '%s\n' "$content" > "$file_temp"
  mv -f "$file_temp" "$ORG_METER_FILE"

  # 🔴 keep the capture current. `read_org_file` hands out `ORG_METER_BYTES`, so
  #    an arm that writes and then reads would otherwise see the PRE-write state
  #    — the stale-read hazard the capture was introduced to remove, reopened by
  #    the one act that invalidates it. ⇒ the writer owns the refresh, so no
  #    call site has to remember the order.
  # .why the added newline = the disk copy above is `printf '%s\n'`, one byte
  #    longer than `$content`. a capture of the bare value would diverge from
  #    the disk bytes by that one newline, so a later byte-for-byte read of
  #    both would mismatch on a value that is logically identical.
  ORG_METER_BYTES="$content
"
}

# .what = set one org's state, then persist
#
# 🔴 .why = the org name was INTERPOLATED into the jq program text —
#        `jq ".orgs[\"$ORG_NAME\"] = \"allowed\""`. that makes a user-supplied
#        value part of the program rather than part of the data, so a name that
#        carries a `"` ends the string and the rest parses as jq. `--arg` binds
#        it as data, where it cannot be read as syntax.
#
# .why = and `printf '%s'`, never `echo` — `echo` mangles a value that opens
#        with a dash, and interprets a backslash on some shells. the identity
#        leaves of git.commit.sponsor.sh were converted for this same reason;
#        this was the last site in the family that still piped data by `echo`.
#
# .why NAMED = four call sites re-encoded the same field-set, so the shape of
#        the org record lived in four places (rule.require.named-transformers).
set_org_state() {
  local org="$1"
  local state="$2"
  local updated

  updated=$(printf '%s' "$(read_org_file)" \
    | jq --arg org "$org" --arg state "$state" '.orgs[$org] = $state')

  write_org_file "$updated"
}

# .what = drop one org's entry, then persist — the `set_org_state` inverse
#
# .why = same two reasons as its pair: the org name binds as data via `--arg`,
#        and the pipe carries `printf '%s'` rather than `echo`.
del_org_state() {
  local org="$1"
  local updated

  updated=$(printf '%s' "$(read_org_file)" \
    | jq --arg org "$org" 'del(.orgs[$org])')

  write_org_file "$updated"
}

# .what = every configured org as one `name: state` line, in file order
#
# 🔴 .why NAMED = the `get` arm carried this pipeline inline, and a reader had
#        to simulate three stages to learn what it yields — what `to_entries`
#        builds, what `.[]` streams out of it, and how the format string shapes
#        each element (rule.forbid.inline-decode-friction).
#
# ⚠️ .why it is owed even though `render_orgs_as_tree_lines` was already
#         extracted = that extraction took the RENDER and left the SOURCE
#         beside it, so the orchestrator still read as a pipeline with a named
#         call on the end. ⇒ a half-extracted line reads worse than an
#         un-extracted one, because the named half vouches for the raw half.
#
# 🔴 .why each value goes through `get_org_state` rather than straight out of
#        `jq` = the show-all path interpolated the RAW leaf, so one malformed
#        entry read three different ways at once:
#
#        | who reads `{"orgs": {"ehmpathy": {"x": 1}}}` | says |
#        |---|---|
#        | `get --org` (show-all) | 🔴 `ehmpathy: {"x":1}` — raw json, as if a state |
#        | `get --org ehmpathy` (named) | `corrupt` |
#        | the commit gate | `corrupt` |
#
#        ⇒ the survey a human runs to SEE the fleet was the one view that
#        would not name the damage. it rendered the garbage as though it were
#        a legal answer, while both paths that ACT on the same byte refused
#        it — so a human reads the survey, finds it clean, and cannot explain
#        why commits are blocked.
#
# ⚠️ .note = it re-reads per key rather than filter the capture, so the
#         CLASSIFIER sits at exactly one site. the input is a handful of org
#         names and `read_org_file` serves a cached capture, so the cost is a
#         jq call per org — paid to keep ONE definition of a known state.
get_all_org_state_lines() {
  local org
  while IFS= read -r org; do
    [[ -n "$org" ]] || continue
    printf '%s: %s\n' "$org" "$(get_org_state "$org")"
  done < <(read_org_file | jq -r '.orgs | keys[]')
}

# .what = render one tree leaf per org line — the LAST takes `└─`
#
# 🔴 .why = the `get` orchestrator hand-rolled a `while read` with an index
#        counter and a count compare to pick the glyph. a reader had to
#        simulate the indices to learn it emits one leaf per org
#        (rule.forbid.inline-decode-friction), and it was the one inline
#        decode left after the org read moved onto named leaves.
#
# .why = the glyph and the indent are a snapshot-pinned contract, and they now
#        live in one place rather than mid-flow in a command arm.
#
# ⚠️ .why NO `-n` skip, unlike `render_files_as_tree_lines` = that twin renders
#        a `git` file list, where a TRAILING BLANK makes the last index not the
#        last leaf. this input is `jq … to_entries`, whose every line carries a
#        `key: value`. ⇒ the twin's guard would be cargo here, and the fact
#        that the two differ is exactly why the rule belongs in one leaf where
#        it is decided once rather than copied.
#
# .note = it emits leaves only. the caller owns the tree start above.
#
# 🔴 .why ONE predicate and a GLYPH var, rather than the twins' if/else = the
#        leaf first carried two consecutive ifs that tested exact opposites
#        (`-eq $count` then `-ne $count`). a reader had to hold both inverse
#        predicates to confirm every index takes exactly one branch, and a
#        later edit to one condition could emit a line twice or never.
#
# ⚠️ .why NOT the twins' if/else, which is what the review asked for = this
#        repo forbids `else` outright (rule.forbid.else-branches), so the
#        twins' shape trades one rule for another. a glyph var settles both:
#        one predicate, no else, and the indent+text contract on ONE echo, so
#        the snapshot-pinned string cannot drift between two copies.
render_orgs_as_tree_lines() {
  local orgs="$1"
  local lines
  readarray -t lines <<< "$orgs"
  local count=${#lines[@]}
  local i
  for i in "${!lines[@]}"; do
    # the last line closes the tree; every earlier one continues it
    local glyph='├─'
    if [[ $((i + 1)) -eq $count ]]; then
      glyph='└─'
    fi

    printf '   %s %s\n' "$glyph" "${lines[$i]}"
  done
}

# .what = read one org's state, or "unset" where it carries none
#
# .why = the read path interpolated the org name into the jq program for the
#        same reason the write path did, and inherits the same repair.
#
# 🔴 .why the value rides `is_org_state_known` = the top-level guard proves the
#        FILE parses to an object; it says naught about a LEAF. so a
#        well-formed `{"orgs": {"ehmpathy": ["allowed"]}}` rendered
#        `ehmpathy: ["allowed"]` — raw json handed to a human who opened this
#        command precisely to learn whether their commits are blocked.
#
# ⇒ 🎯 and the DISAGREEMENT was the defect, not the ugliness: `check_org_blocker`
#        routes that identical leaf through `is_org_state_known` and classifies
#        it as DAMAGE, so the gate paused commits while the display reported a
#        value. one state, two answers (rule.forbid.ambiguous-labels).
#
# .why = `corrupt` is the word the gate already uses for this file, so the two
#        surfaces now speak one vocabulary rather than two.
get_org_state() {
  local org="$1"
  local state

  state=$(printf '%s' "$(read_org_file)" \
    | jq -r --arg org "$org" '.orgs[$org] // "unset"')

  if ! is_org_state_known "$state"; then
    echo "corrupt"
    return 0
  fi

  echo "$state"
}

######################################################################
# commands
######################################################################
case "$COMMAND" in
  allow)
    if [[ -z "$ORG_NAME" ]]; then
      emit_both "error: org name required for allow
usage: git.commit.uses --org <org> allow"
      exit 2
    fi

    if [[ "$ORG_NAME" == "@all" ]]; then
      # @all: reset all orgs to allowed + set @all default
      write_org_file '{ "orgs": { "@all": "allowed" } }'

      print_turtle_header "shell yeah, back in the water!"
      print_tree_start "git.commit.uses allow --org @all"
      echo "   ├─ reset: all orgs → allowed"
      echo "   └─ @all: allowed"
    else
      # specific org: set to allowed
      set_org_state "$ORG_NAME" "allowed"

      print_turtle_header "shell yeah, back in the water!"
      print_tree_start "git.commit.uses allow --org $ORG_NAME"
      echo "   └─ $ORG_NAME: allowed"
    fi

    # nudge: this lifts an org-level permission, so it is a quota-grant
    # moment for THIS tree same as a local `set` — shared reader, see
    # `print_sponsor_bind_nudge_if_absent` (git.commit.operations.sh).
    print_sponsor_bind_nudge_if_absent
    ;;

  block)
    if [[ -z "$ORG_NAME" ]]; then
      emit_both "error: org name required for block
usage: git.commit.uses --org <org> block"
      exit 2
    fi

    if [[ "$ORG_NAME" == "@all" ]]; then
      # @all: reset all orgs to blocked + set @all default
      write_org_file '{ "orgs": { "@all": "blocked" } }'

      print_turtle_header "groovy, bond fire time"
      print_tree_start "git.commit.uses block --org @all"
      echo "   ├─ reset: all orgs → blocked"
      echo "   └─ @all: blocked"
    else
      # specific org: set to blocked
      set_org_state "$ORG_NAME" "blocked"

      print_turtle_header "groovy, bond fire time"
      print_tree_start "git.commit.uses block --org $ORG_NAME"
      echo "   └─ $ORG_NAME: blocked"
    fi
    ;;

  del)
    if [[ -z "$ORG_NAME" ]]; then
      emit_both "error: org name required for del
usage: git.commit.uses --org <org> del"
      exit 2
    fi

    if [[ "$ORG_NAME" == "@all" ]]; then
      emit_both "error: cannot delete @all, use allow or block instead"
      exit 2
    fi

    del_org_state "$ORG_NAME"

    print_turtle_header "righteous!"
    print_tree_start "git.commit.uses del --org $ORG_NAME"
    echo "   └─ $ORG_NAME: removed (inherits from @all)"
    ;;

  get)
    print_turtle_header "lets check the meter..."
    print_tree_start "git.commit.uses get --org${ORG_NAME:+ $ORG_NAME}"

    # ⇒ the SHAPE was gated once, above the dispatch, so every read below is
    #   safe to make. this arm carried its own copy of that gate while the
    #   three write arms carried none — see `guard_org_meter_is_readable`.
    #
    # 🔴 .why there is no `[[ ! -f "$ORG_METER_FILE" ]]` early exit here = it
    #        was a SECOND decision about a question the hoisted guard already
    #        answered, and it asked the FILE where every other read in this arm
    #        now asks the capture. ⇒ two readers of one state, and they can
    #        disagree the day the guard's sense of "absent" changes.
    #
    # ⚠️ .and it rendered one state two ways: with the file ABSENT a named org
    #    printed `no org configs set`; with the file PRESENT and empty the same
    #    org printed `<org>: unset`. one question — *is this org configured?* —
    #    answered differently by an incidental property of OTHER orgs
    #    (rule.forbid.ambiguous-labels). both now read `unset`.
    #
    # ⇒ the show-all branch keeps its own `no org configs set`, on the LINES it
    #   read rather than on the path — which is the honest test for "is the
    #   whole file empty?" (clamped at `[case14][t1]` and `[case25]`).
    if [[ -n "$ORG_NAME" ]]; then
      # show specific org
      ORG_STATE=$(get_org_state "$ORG_NAME")
      ALL_STATE=$(get_org_state "@all")

      # default-first: unset, then @all overrides, then the named org
      # overrides @all — one linear path, no else (matches the
      # --auth/--unstaged/--mode guards above).
      RESOLVED_STATE="unset"
      RESOLVED_SUFFIX=""
      if [[ "$ALL_STATE" != "unset" ]]; then
        RESOLVED_STATE="$ALL_STATE"
        RESOLVED_SUFFIX=" (from @all)"
      fi
      if [[ "$ORG_STATE" != "unset" ]]; then
        RESOLVED_STATE="$ORG_STATE"
        RESOLVED_SUFFIX=""
      fi
      echo "   └─ $ORG_NAME: $RESOLVED_STATE$RESOLVED_SUFFIX"
    else
      # show all orgs
      ORGS=$(get_all_org_state_lines)
      if [[ -z "$ORGS" ]]; then
        echo "   └─ no org configs set"
      fi
      if [[ -n "$ORGS" ]]; then
        render_orgs_as_tree_lines "$ORGS"
      fi
    fi
    ;;

  *)
    emit_both "error: unknown command: $COMMAND
usage: git.commit.uses --org <org> allow|block|del|get"
    exit 2
    ;;
esac
