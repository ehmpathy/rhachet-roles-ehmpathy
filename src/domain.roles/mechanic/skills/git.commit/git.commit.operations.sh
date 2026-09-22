#!/usr/bin/env bash
######################################################################
# .what = shared domain operations + vocabulary for git.commit skills
#
# .why  = single source of truth for the pieces git.commit.set and
#         git.commit.push both depend on — behavioral commit detection, the
#         global/org meter paths, and the pr-open auth vocabulary (AUTH_DEFAULT,
#         AUTH_VALID_VALUES, get_auth_who_label). one home keeps the two skills in
#         sync on any of them.
#
# usage:
#   source "$SCRIPT_DIR/git.commit.operations.sh"
#   COMMITS=$(get_behavioral_commits_on_branch)
#   FIRST_HASH=$(get_first_behavioral_commit_hash)
######################################################################

######################################################################
# global blocker constants (shared across git.commit skills)
######################################################################
ROLE_REPO="ehmpathy"
ROLE_SLUG="mechanic"
GLOBAL_METER_DIR="$HOME/.rhachet/storage/repo=$ROLE_REPO/role=$ROLE_SLUG/.meter"
GLOBAL_METER_FILE="$GLOBAL_METER_DIR/git.commit.uses.jsonc"
ORG_METER_FILE="$GLOBAL_METER_DIR/git.commit.uses.org.jsonc"

######################################################################
# the global meter's DISPLAY path — a `~`-rooted twin of GLOBAL_METER_FILE
#
# 🔴 .why = a corrupt-global render told the human the file was damaged and
#        never named it. the path is HOST-dependent and appears nowhere else
#        on the read path, so a human who ran `git.commit.uses get` could
#        neither `cat` nor clear the very file the render was about
#        (rule.require.errors-name-the-fix). the sponsor's twin render names
#        `.meter/$SPONSOR_STATE_FILENAME` for exactly this reason.
#
# 🔴 .why the `~` is LITERAL, never expanded = `$GLOBAL_METER_FILE` holds the
#        real `$HOME`, so to print it would pin a per-host — and under test, a
#        per-run temp — string into a snapshot
#        (rule.require.hermetic-tests). `~` is both stable across hosts AND
#        copy-pasteable into the human's own shell, so it loses no action.
#
# 🔴 .why it is derived from the REAL path by one substitution, rather than
#        re-spelled = it used to be typed out afresh — `~/.rhachet/storage/…`
#        plus the basename — and shared only the two role constants with the
#        path the gate actually reads. so `.rhachet/storage`, `.meter`, and
#        both basenames each existed TWICE.
#
#        ⇒ a move of the storage root or a rename of either meter file would
#        change where the code reads and leave the refusal pointed at a file
#        nobody writes — and the human would `cat` a path that does not
#        exist, conclude the tool is confused, and be right.
#
#        the only difference the render owes is the `$HOME` prefix, so that
#        is the only thing it changes. the tail cannot drift, because there
#        is no second copy of it to drift from.
#
# .note = the strip is total under test too: `$HOME` there is a per-run temp
#         dir, and it is exactly the prefix removed — so the rendered string
#         stays `~/.rhachet/…` on every host and in every run
#         (rule.require.hermetic-tests).
######################################################################
GLOBAL_METER_FILE_SHOWN="~${GLOBAL_METER_FILE#"$HOME"}"

# the ORG meter's display path — the same `~`-rooted treatment, same reasons
ORG_METER_FILE_SHOWN="~${ORG_METER_FILE#"$HOME"}"

######################################################################
# render: name the damaged global meter, below the tree that reported it
#
# .what = the five-line note that turns "blocked (file corrupt)" from an alarm
#         into an action — it names the file and the two commands that clear it
#
# 🔴 .why ONE leaf, never two copies = TWO surfaces render this, and they are
#        the two reads of one file: `git.commit.uses get` (the local tree) and
#        `git.commit.uses get --global` (the most authoritative read there is).
#        the note was written twice, so a reword or a dropped remedy line in
#        either would leave the two disagreed about how to repair one file —
#        and only one copy was clamped, so the drift would ship green.
#
# 🔴 .why it lives HERE = it was first written as a nested function inside a
#        `get)` case arm, which made it absent on every other command path and
#        invisible to a reader who scans the top of the file for shared render
#        leaves. `operations.sh` is the extant home both surfaces already
#        source for the constant this note prints
#        (rule.forbid.maintenance-hazards).
#
# .why = a NO-OP unless the file is corrupt, so both callers invoke it
#        unconditionally and neither repeats the condition. the two renders
#        differ in their tree and agree on this note, which is exactly the
#        split a shared leaf is for (rule.require.named-transformers).
#
# .why = the caller sets `GLOBAL_BLOCK_CORRUPT`, never a string-match on the
#        label — a match on "(file corrupt)" would silently stop the day the
#        prose moved (rule.forbid.magic-values).
######################################################################
# 🔴 .why the clear is `rm -r` and NOT `git.commit.uses allow --global` = the
#        corrupt state this note renders spans three shapes — an unparseable
#        file, a 0-byte file, and a DIRECTORY at the path. `allow --global`
#        clears the first two and **refuses** on the third, since `rm -f`
#        cannot remove a directory. so for one of the shapes this very gate
#        classifies, the printed fix hands the human a second refusal.
#
# ⚠️ .note = the refusal it hands them is honest and names `rm -r`, so the path
#         terminated correctly — in two steps, for a state the note could have
#         answered in one. `rm -r` is the one command that holds for **every**
#         shape named here (case=3: a refusal prints the command that works).
#
# ⇒ .and it makes the two notes AGREE. `print_org_corrupt_note` clears its
#   wreck with `rm -r`; this one used a different command for the identical
#   job, so a human who met both learned two answers to one question
#   (rule.require.ubiqlang).
print_global_corrupt_note() {
  if [[ "${GLOBAL_BLOCK_CORRUPT:-false}" != "true" ]]; then
    return 0
  fi
  echo ""
  echo "   the global blocker file cannot be read:"
  echo "     $GLOBAL_METER_FILE_SHOWN"
  # 🔴 .why this LAYOUT = one error family ("a state file this skill depends on
  #    cannot be read → refuse → give a remedy") has THREE renders, and they
  #    carried two typographic grammars: this note and the org body indented
  #    the lead-in by 3 and the commands by 5, while
  #    `print_sponsor_corrupt_render` used the shared `print_instruction`
  #    helper (blank line, lead-in at 0, commands at 2). a human who met a
  #    corrupt global meter and then a corrupt sponsor file read a shell that
  #    disagrees with itself about how to lay out one idea
  #    (rule.forbid.snapshot-visual-blemishes).
  #
  # ⚠️ .why it MATCHES `print_instruction` rather than CALLS it = that helper
  #    lives in `output.sh`, and this file does not source it. a call here
  #    resolves only because every real caller happens to source both — an
  #    undeclared dependency that dies the moment `operations.sh` is sourced
  #    alone, which is exactly how the test harness uses it (it exits 127).
  #    ⇒ the shape is matched by hand; the coupling is not created.
  echo ""
  echo "until it parses, every commit is blocked. a human may inspect or clear it:"
  echo "  \$ cat $GLOBAL_METER_FILE_SHOWN"
  echo "  \$ rm -r $GLOBAL_METER_FILE_SHOWN"
}

######################################################################
# render the ORG-meter corrupt note — the twin of the block above
#
# .what = a NO-OP unless `ORG_BLOCK_CORRUPT` is true, so every caller invokes
#         it unconditionally and none repeats the condition.
#
# 🔴 .why it is owed AT ALL = the fail-closed hardening made `org meter file
#        corrupt` newly reachable on the commit gate, and the remedy printed
#        beside it there is `git.commit.uses allow --org <org>` — which writes
#        a key into a file that cannot be parsed. ⇒ a refusal whose fix does
#        not fix, the same shape as a `del` refusal that prints the bind
#        command (rule.require.errors-name-the-fix).
#
# ⇒ .why it MIRRORS the global note rather than reuses it = the two name two
#    different files, with two different clear commands. one note with two
#    branches would hide that behind a conditional; two notes state it.
#
# 🔴 .why `rm -r` and never a bare `rm` = the corrupt state this note renders is
#        classified to INCLUDE a directory at the path — that is what the `-e`
#        versus `-f` split in `check_org_blocker` decides. a bare `rm` cannot
#        remove a directory, so on that shape the printed remedy dies and the
#        damage stays. ⇒ a refusal whose fix does not fix, which is the exact
#        defect this note was added to remove, reintroduced by the one command
#        it prints.
#
# ⚠️ .note = `guard_org_meter_is_readable` prints `rm -r` for the identical
#         damage. the two disagreed, and the one that was wrong is the one a
#         human meets on the COMMON path — a refused commit. two remedies for
#         one state must agree, or one of them is a trap
#         (rule.require.errors-name-the-fix).
######################################################################
#
# 🔴 .why the BODY is its own leaf = there are TWO surfaces for this one state —
#        the commit gate (through the note below) and
#        `guard_org_meter_is_readable` in `uses.org.sh` — and they had two
#        renders. the commands were unified last round; **the prose was not**:
#          this leaf  → "the org meter file cannot be read"
#          the guard  → "the file that names each org's permission cannot be read"
#
# ⇒ 🎯 one state, two descriptions, and the drift was already real rather than
#        hypothetical. ⚠️ the same shape as the `rm`/`rm -r` disagreement one
#        round earlier, on the same pair of surfaces — which is the reactive
#        trigger `rule.prefer.most-common-denominator` waits for: **lift on
#        proven reuse, and two sites that have already diverged are proof.**
#
# .why the SPLIT rather than one function = the gate (`ORG_BLOCK_CORRUPT`) is
#        the commit path's question and the guard's own `-f`/`jq` test is
#        `uses.org.sh`'s. only the BODY is shared, so only the body is lifted.
######################################################################
# 🔴 .why the HEADLINE is a constant too = the body above was lifted one round
#        ago and the headline was left behind, so the SAME corrupt state still
#        announced itself two ways: the commit gate said
#        "org meter file corrupt (~/.rhachet/.../git.commit.uses.org.jsonc)"
#        and `guard_org_meter_is_readable` said "org meter file corrupt".
#        a human who met the refusal from `git.commit.uses` and later from
#        `git.commit.set` read two summaries of one fact.
#
# .why it carries NO path = the body names the path already, on every surface
#        that prints this headline. the set arm used to print it twice (once
#        per line); the push arm printed it once and offered a remedy that
#        cannot work on an unparseable file. both now render the identical
#        headline + body pair (rule.forbid.ambiguous-labels,
#        rule.require.errors-name-the-fix).
ORG_CORRUPT_HEADLINE="org meter file corrupt"

print_org_corrupt_body() {
  echo ""
  echo "   the org meter file cannot be read:"
  echo "     $ORG_METER_FILE_SHOWN"
  # .why this layout = the third member of the family takes the same shape;
  #      the reasons, and why it is matched rather than called, are on
  #      `print_global_corrupt_note`.
  echo ""
  echo "until it parses, every commit is blocked. a human may inspect or clear it:"
  echo "  \$ cat $ORG_METER_FILE_SHOWN"
  echo "  \$ rm -r $ORG_METER_FILE_SHOWN"
}

print_org_corrupt_note() {
  if [[ "${ORG_BLOCK_CORRUPT:-false}" != "true" ]]; then
    return 0
  fi

  print_org_corrupt_body
}

######################################################################
# findsert a state dir that git must never see
#
# .what = make the dir if absent, and bootstrap its `.gitignore` if absent.
#         idempotent on both halves, so a re-run converges.
#
# 🔴 .why = this scaffold guards the SAME invariant at every site: the state
#        under it must never be committed. the sponsor state is the sharpest
#        case — it holds a human's name and email, PII, and
#        `git.commit.push.sh` already strips that exact value from pr bodies
#        (*"privacy: avoid email leak"*). ⇒ a site that grew the dir and
#        missed the `.gitignore` would PUBLISH, in the repo, the one value
#        the push skill goes out of its way to keep out of a pr.
#
# .note = TWO callers, not three, so it sits under wet-over-dry's bar. it is
#         hoisted anyway for the same reason `SPONSOR_EMAIL_PATTERN` is: the
#         two are coupled for CORRECTNESS rather than merely duplicated. a
#         drift between them is SILENT — the dir still works, the state still
#         writes, and the only symptom is PII in a commit, one release later.
#
# ⚠️ .note = `git.commit.bind.sh` has a THIRD copy of this shape, and it is
#         deliberately NOT converted. it does not source this file, so a
#         conversion would add a new `source` edge into a library that
#         hard-exits (`guard_actor_is_human_via_stdin`) — the ripple the
#         arch-hazards lane flagged at i019, in the one skill the council
#         already holds an open question about (F12 ask 4). ⇒ it fails the
#         CLEAN half of scouts-honor, so it is deferred rather than smuggled.
#         its body also differs: a different dir, a commented header, and a
#         `.readme` beside it. the `headers` parameter below exists so that
#         conversion is a call-site change when the council rules, never a
#         redesign.
######################################################################
findsert_gitignored_dir() {
  local dir="$1"
  shift

  mkdir -p "$dir"

  if [[ -f "$dir/.gitignore" ]]; then
    return 0
  fi

  # .why = `*` goes LAST, so an optional header reads above the rule it
  #        explains. the file is absent at this point (the guard above
  #        returned otherwise), so the appends build it from empty.
  local line
  for line in "$@"; do
    printf '%s\n' "$line" >> "$dir/.gitignore"
  done
  printf '*\n' >> "$dir/.gitignore"
}

######################################################################
# the sponsor state file's ONE name
#
# .why = three skills build this path — the WRITER (git.commit.sponsor),
#        the reader that refuses a commit (git.commit.set), and the nudge
#        (git.commit.uses.local). each built it from its own literal, so a
#        rename applied to the writer and missed in a reader would leave
#        that reader on a file nobody writes: every commit refuses, and
#        the cause is a typo no test could see.
#
# .note = `seedTestSponsor.ts` holds the same literal and CANNOT source a
#         bash file. `git.commit.sponsor` [case13] asserts the two agree,
#         which is what keeps the cross-language pair honest.
######################################################################
SPONSOR_STATE_FILENAME="git.commit.sponsor.jsonc"

######################################################################
# the two bind commands a refusal may print
#
# .why = four render sites print these, across three skills — the sponsor
#        skill's own refusals, git.commit.set's help + its two sponsor
#        refusals, and git.commit.uses.local's nudge. each retyped them, so
#        a flag rename would have had to land in four places to stay true.
#
# 🔴 .why = a STALE printed command is the exact defect this drive already
#        met once: `F10` found `--who "Name <email>"` undiscoverable because
#        one render listed the piped form alone, and `Q2'` found four
#        refusals that printed `--from me`, a command that refuses on the
#        very grove it was read on. ⇒ a refusal that names a command the
#        reader cannot run is worse than one that names none, because the
#        reader doubts the feature rather than their own tree.
#
# .note = the value is the BARE command, with no prompt and no indent.
#         the three call sites indent differently on purpose — 2 spaces in a
#         refusal block, 4 in the help body, none in a coconut (which adds
#         its own) — so a shared prefix would change two renders. each site
#         owns its prefix; only the command itself is shared.
#
# .note = @me is absent here by design. it reads the gh session on THIS
#         host, which on a cloud grove is the clone's — so a MANDATORY block
#         that named it would hand the reader a second refusal. it appears
#         only in the optional coconut, where an optional route belongs.
######################################################################
SPONSOR_BIND_VIA_STDIN="printf 'Name <email>' | rhx git.commit.sponsor set --who @stdin"
SPONSOR_BIND_VIA_LITERAL="rhx git.commit.sponsor set --who \"Name <email>\""

######################################################################
# both routes, rendered as ONE instruction block
#
# 🔴 .why = the note above reasoned about the PREFIX and concluded each site
#        owns it. that is still true, and it is a different property from the
#        SET — which routes appear at all. the set never varies, and it was
#        the set that drifted: `git.commit.set --help` listed the piped form
#        alone while all six other renders listed both, so the literal was
#        undiscoverable from the one surface a human reads FIRST.
#
# 🔴 .why = that is `F10` recurred. the wisher found `--who "Name <email>"`
#        undiscoverable once already, from one render that named a single
#        route — and the repair reached every refusal and missed the help.
#        ⇒ six independent copies of a two-line block is six chances to
#        drift, and one had already taken it.
#
# .why = the guarantee carries load, and is not cosmetic: BOTH forms hold on
#        EVERY grove, and a block that names one leaves a human on the other
#        grove with no route they can run (`Q2'`). ⇒ shared, so a render
#        cannot silently carry half the answer.
#
# .note = 2-space indent, which is what a `print_instruction` block takes.
#         `--help` indents by 4 and composes its own line from the two
#         constants above — the prefix is still per-site, as the note above
#         says; only the SET is now fixed.
######################################################################
SPONSOR_BIND_REMEDY="  \$ $SPONSOR_BIND_VIA_STDIN
  \$ $SPONSOR_BIND_VIA_LITERAL"

######################################################################
# the corrupt-sponsor render — ONE copy, two callers
#
# 🔴 .why = `git.commit.set` and `git.commit.sponsor get` each hand-rolled the
#        SAME seven lines — header, tree start, the error, the "cannot be read"
#        prose, the repo-relative path, and a three-command remedy. only the
#        tree-start label ever differed.
#
# 🔴 .why it is not hypothetical drift = the two copies HAD ALREADY drifted.
#        the `set` copy listed the piped bind form alone while the `get` copy
#        listed both, so a human who met a corrupt file on the COMMON path — a
#        refused commit — saw fewer routes than one who ran `get`, and the
#        absent one was the literal that `F10` already found undiscoverable.
#        ⇒ the same failure `SPONSOR_BIND_REMEDY` above exists to prevent, one
#        level out: that constant fixed the remedy SET, and the render tree
#        around it stayed duplicated.
#
# .why = "cannot be read" rather than "cannot be parsed" — this branch covers
#        TWO causes: a file that will not parse, and one that parses and names
#        no sponsor. "parsed" is false of the second, and a refusal that
#        misdescribes the fault sends the human to look for the wrong damage
#        (rule.require.errors-name-the-fix).
#
# .why = the path is REPO-RELATIVE. an absolute one names the machine that
#        printed it, so a snapshot of this render would pin a temp dir and a
#        hostname (rule.require.hermetic-tests) — and a human already stands in
#        the tree, so the short form is the one they can act on at a glance.
#
# .note = the NAME comes from the shared constant, so a rename cannot leave
#         this prose pointed at a file nobody writes.
#
# .note = no `echo ""` before `print_instruction`; it opens with its own blank
#         line, and a second renders as a gap (forbid.snapshot-visual-blemishes)
#
# .note = @me stays absent on purpose — it reads THIS host's gh session, which
#         on a cloud grove is the clone's.
#
# usage: print_sponsor_corrupt_render "git.commit.set"
######################################################################
print_sponsor_corrupt_render() {
  local tree_start="$1"

  print_turtle_header "bummer dude..."
  print_tree_start "$tree_start"
  print_tree_error "sponsor state file corrupt"
  echo ""
  echo "   the file that names this tree's sponsor cannot be read:"
  echo "     .meter/$SPONSOR_STATE_FILENAME"
  print_instruction "inspect it, or clear the bind and set it afresh:" "  \$ cat .meter/$SPONSOR_STATE_FILENAME
  \$ rhx git.commit.sponsor del
$SPONSOR_BIND_REMEDY"
}

######################################################################
# what an email must LOOK like — the one pattern, shared by both paths
#
# 🔴 .why = the WRITER (`as_identity_parts`) and the READER
#        (`read_sponsor_state`) must agree on this, or the two disagree
#        about what a valid sponsor is. the writer refused a malformed
#        address while the reader accepted one, so a file that `set` would
#        never have produced still read as BOUND — and landed verbatim in a
#        trailer as `Co-authored-by: Ada <not-an-email>`.
#
# ⇒ a fabricated identity in a commit trailer is the ONE outcome this whole
#   change exists to forbid, so the reader may not be the looser of the two.
#
# .note = two callers, not three, so it sits under wet-over-dry's bar. it is
#         hoisted anyway because the two paths are coupled for CORRECTNESS
#         rather than merely duplicated: a drift between them is silent, and
#         it surfaces as a bad trailer rather than as a failed read.
#
# 🔴 .constraint = KEEP THIS PATTERN IN THE COMMON SUBSET OF TWO REGEX
#         ENGINES. the one string is interpolated into two dialects:
#
#           bash `=~`   → POSIX ERE      (git.commit.sponsor.sh:458)
#           jq `test()` → Oniguruma/PCRE (read_sponsor_state, below)
#
#         it is portable today because it uses only `+`, `.`, and bracket
#         classes — syntax both engines read identically.
#
#         ⛔ so do NOT add a PCRE-only construct: `\d`, a lookahead `(?=…)`,
#         a non-greedy `+?`, or a backreference. bash ERE does not read them,
#         and it fails SILENTLY rather than loudly — an unrecognized construct
#         is matched as literal text, so the WRITER would start to refuse an
#         address the READER still accepts.
#
#         ⇒ that is the exact writer-vs-reader split the `.why` above says
#         this constant exists to close, re-opened one layer down: the two
#         would share a string and still disagree about what it means.
#
# 🔴 .clamp = `[case35]` in the integration test walks 14 addresses through
#         BOTH engines and asserts the verdicts agree. it is dogfooded: swap
#         the last atom for `\d+` and 7 of the 14 go bash=no / jq=yes.
#         ⇒ so this constraint is CHECKED now, never merely remembered.
#
# ⚠️ .note = MEASURED, and it CORRECTS the line above. an earlier draft listed
#         `\w` beside `\d` as equally hazardous. it is not — `\w` is a GNU
#         extension that glibc's ERE DOES read, so a `\w+` swap left the suite
#         fully green. ⇒ the hazard is per-CONSTRUCT rather than per-family,
#         and a list held in a comment cannot tell them apart. `[case35]` can.
######################################################################
SPONSOR_EMAIL_PATTERN='[^ @]+@[^ @]+\.[^ @]+'

######################################################################
# the `source` enum — WHO ANSWERED, never HOW the value arrived
#
# .what = `me` = read from this host's own github session · `supplied` =
#         handed in, piped or literal. the two answer different questions:
#         `me` says the binder sponsors their OWN work, `supplied` says
#         someone named the requester.
#
# 🔴 .why hoisted = the same writer/reader pair that earned
#        SPONSOR_STATE_FILENAME and SPONSOR_EMAIL_PATTERN their own
#        constants. `git.commit.sponsor.sh` WRITES the value; the
#        `// "supplied"` fallback in `read_sponsor_state` READS a default
#        for it. a rename of the label at one site alone would leave the
#        other on a word nobody writes — and the failure is silent, because
#        the fallback would simply start to fire on every file.
#
# .note = `git-config` is NOT a member. the wisher struck it, so no path
#         can write it (invariant 8).
#
# ⚠️ .note = `src/.test/seedTestSponsor.ts` encodes `supplied` a THIRD time
#         and cannot source this file — it is typescript. that copy is
#         pinned by `[case13]`, which reads a real bind rather than a
#         literal, so a rename here fails that test loudly.
######################################################################
SPONSOR_SOURCE_ME="me"
SPONSOR_SOURCE_SUPPLIED="supplied"

######################################################################
# the commit tree's `source:` leaf — a CONSTANT, deliberately
#
# .what = what `git.commit.set` prints under its sponsor block, so a
#         reader can tell an authorization from a guess with no code read
#         (`1.vision.experience.case=2`, the 🎯 primary critipath).
#
# 🔴 .why it is NOT `$SPONSOR_SOURCE` = they answer two different
#        questions, and only one of them may vary.
#
#        | leaf | answers | varies by grove? |
#        |---|---|---|
#        | `git.commit.sponsor get` → `source:` | HOW the value was supplied — `me` \| `supplied` | ✅ yes |
#        | 🔴 this one | WHERE this commit's sponsor came from | ⛔ **never** |
#
#        the vision's `[t3]` requires the commit tree be **byte-identical**
#        on a local and a cloud grove, and calls that equality "the fix" —
#        it is the whole proof that the grove axis went inert. a cloud
#        grove binds via `@stdin` (`supplied`) and a laptop via `@me`
#        (`me`), so to render `$SPONSOR_SOURCE` here would make the two
#        trees differ on exactly the axis the line exists to prove inert.
#
#        ⇒ the leaf's claim is `bound`, never `me`. it says: this value
#        was placed here by a human act, in this worktree — not inferred
#        from a host config (invariant 8).
SPONSOR_PROVENANCE="bound (this tree)"

# .what = a PURE transformer: a raw identity value → that value with its outer
#         whitespace and every embedded newline removed
#
# .why = the three `--who` value forms arrive shaped differently. a pipe
#        carries a newline at the end, a heredoc can carry several, and a
#        literal typed at a shell can carry a stray space at either end. each
#        would fail the shape check for a reason the human cannot see on
#        screen, so a value is normalized to one form before it is judged.
#
# .why = a NAMED operation rather than three inline expansions, because
#        `${raw#"${raw%%[![:space:]]*}"}` states HOW it cuts and never WHAT
#        it cuts — a reader had to simulate it to learn that much
#        (rule.require.named-transformers).
#
# 🔴 .why it lives HERE rather than in `git.commit.sponsor.sh` = it now has
#        TWO proven consumers on opposite sides of one boundary — the WRITER
#        (`git.commit.sponsor set`) and the READER (`read_sponsor_state`,
#        below). while only the writer trimmed, a hand-edited
#        `{"name": "  Ada  "}` passed every read gate and reached the trailer
#        as `Co-authored-by:   Ada   <...>`: outer blanks the writer could
#        never emit, preserved verbatim by the reader meant to distrust it.
#
#        ⇒ the lift is REACTIVE, not speculative — two sites that had already
#        diverged is the proof `rule.prefer.most-common-denominator` asks for,
#        and one shared transformer makes the symmetry structural rather than
#        a property two files must each remember to hold.
as_identity_trimmed() {
  local raw="$1"

  # drop every newline and carriage return, wherever in the value they sit
  #
  # 🔴 .why = `printf '%s'`, never `echo`. `echo` is not portable for
  #        arbitrary data: some shells read a flag at the front (`-n`, `-e`)
  #        and some expand backslash escapes, so a human name of `-e Ada` or
  #        one that holds a backslash would be ALTERED before the shape check
  #        — a silent corruption of the exact value this skill exists to
  #        preserve byte for byte. every other transformer here already
  #        emits with `printf '%s'`; this was the one that did not.
  raw=$(printf '%s' "$raw" | tr -d '\n\r')

  # cut the whitespace at the front, then the whitespace at the end
  raw="${raw#"${raw%%[![:space:]]*}"}"
  raw="${raw%"${raw##*[![:space:]]}"}"

  printf '%s' "$raw"
}

######################################################################
# pr-open auth vocabulary (single source, shared by push + set)
# .what = the default mode + the valid-value list for the --auth flag
# .why  = both git.commit.push and git.commit.set parse --auth; centralize the
#         default and the allowed set here so a new mode or a changed default is
#         a one-line edit, not a hunt across two files (matches how the identity
#         + label vocab is already centralized in this file)
######################################################################
AUTH_DEFAULT="as-ehmpath"
AUTH_VALID_VALUES=(as-ehmpath as-human)

######################################################################
# helper: map a pr-open auth mode to its human-readable label
# .what = as-human|as-ehmpath → the label shown on the `opened:` tree line
# .why  = both git.commit.push (which owns the pr-open) and git.commit.set
#         (which composes it and must state who opened the pr, per the vision)
#         render this label. one source keeps the two trees consistent.
#         names the credential + its role, not the caller — a human or an
#         ehmpath may run either mode; this states which credential opened the
#         pr. as-ehmpath is the preferred default; as-human is the fallback
#         path (the vision asks the tree to mark it "fallback" so a pr opened
#         by the gh login never reads as a bug), so the label carries that role.
######################################################################
get_auth_who_label() {
  # early-return the fallback label; the default label is the linear happy path
  if [[ "$1" == "as-human" ]]; then
    echo "as-human (gh cli login, fallback)"
    return
  fi
  echo "as-ehmpath (ehmpath keyrack)"
}

######################################################################
# guard: refuse a non-human actor, via STDIN ALONE
#
# .what = the actor guard the three git.commit.uses skills share. $1 is the
#         tree-start label, which is the one part that differs per caller.
#
# 🔴 .why the name states the MECHANISM = it is a weaker check than the one
#        `git.commit.sponsor` runs, and until now that divergence was written
#        down nowhere. three near-identical copies read as three authors who
#        each reached for the obvious check; ONE function named for what it
#        actually measures reads as a contract a reader can weigh.
#
# ⚠️ .note = this checks stdin ONLY. `git.commit.sponsor` checks all three
#         streams and emits on both — so a caller with stdin attached and
#         stdout piped PASSES here and is REFUSED there. that asymmetry is
#         the live defect: the looser guard is the one on the quota grant,
#         which hands out commit authority.
#
# 🔴 .note = the two halves of this guard were once deferred TOGETHER, and only
#         one of them had earned it. the note here read "the behavior is
#         preserved EXACTLY as the three copies had it, stdout-only emit
#         included — which breaks rule.require.skill-output-streams", and sent
#         the whole thing to a wisher. ⇒ that bundled a fixable rule violation
#         into a deferral only the PREDICATE deserved:
#
#           the PREDICATE (`-t 0` vs three streams) — DEFERRED, correctly. it
#             decides who may grant commit authority, and to widen it is to
#             widen a permission. that is a wisher's call (F12 ask 4b).
#
#           the STREAMS (stdout-only vs both) — 🔴 FIXED HERE. it grants no
#             authority, refuses no caller it accepted, and moves no predicate.
#             it was never a permission question, so it was never the council's.
#
# ⇒ .why = a refusal is a FAILURE, and a failure rides both streams
#         (rule.require.skill-output-streams). stdout keeps the render a human
#         reads in a terminal; stderr is what a log aggregator and a calling
#         process actually capture, and a refusal invisible to those is a
#         permission denial nobody can audit.
#
# .note = stdout is preserved, so every extant snapshot of the three `uses`
#         skills holds unchanged. the new bytes land on stderr alone, which is
#         the whole point of the fix.
#
# ⚠️ .note = this checks stdin ONLY, and `git.commit.sponsor` checks all three
#         streams — so a caller with stdin attached and stdout piped PASSES
#         here and is REFUSED there. that asymmetry is what the council still
#         owes a ruling on, and it is untouched by the stream fix above.
#         see .dream/v2026_09_10.fix.the-actor-guard-has-drifted-into-four-divergent-copies.md
######################################################################
guard_actor_is_human_via_stdin() {
  # a tty on stdin, or the explicit test escape hatch, proves a human
  #
  # 🔴 .note = the ACCEPT branch is proven under a REAL pseudo-terminal, with
  #        the escape hatch disabled — `git.commit.uses` `[case31][t0]`.
  #        dogfooded: drop the `-t 0` test and all three asserts go red.
  #        ⇒ three skills source this leaf, so its accept branch had the
  #        widest blast radius of any untested branch in the family.
  if [[ -t 0 || "${__I_AM_HUMAN:-}" == "true" ]]; then
    return 0
  fi

  # 🔴 .why `emit_both`, never `| tee /dev/stderr` = MEASURED. the rule's own
  #        text names the `tee` form, and it BREAKS under this skill's shell
  #        options: `/dev/stderr` is `/proc/self/fd/2`, `tee` must REOPEN it,
  #        and when fd 2 is a pipe (every `spawnSync` in the suite, and any
  #        caller that captures output) that open fails ⇒ `tee` exits non-zero
  #        ⇒ `pipefail` fails the pipeline ⇒ `set -e` kills the skill at exit 1
  #        before the `exit 2` below is ever reached.
  #
  #        ⇒ 10 tty-guard tests went red on exactly that, and every one of them
  #        read `expected 2, received 1` — a CONSTRAINT rendered as a
  #        MALFUNCTION, by the line added to make the refusal more visible.
  #
  # ⇒ .why = `emit_both` is the extant, proven form in this skill family
  #        (`output.sh`): a plain `echo` to stdout and a plain `>&2` to stderr,
  #        with no file to reopen and no pipeline to fail
  #        (rule.forbid.bare-host-deps — `/dev/stderr` is a host-provided path,
  #        and its availability is not ours to assume).
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "$1"
    print_tree_error "only humans can run this command"
  )"
  exit 2
}

######################################################################
# helper: check if global blocker is active
# returns:
#   - 0 (success) if NOT blocked (continue)
#   - 2 if blocked (caller should exit 2)
#   - sets GLOBAL_BLOCK_REASON if blocked
######################################################################
check_global_blocker() {
  GLOBAL_BLOCK_REASON=""

  # 🔴 .why a second NAMED output = the two `get` surfaces need to tell
  #        "blocked by a human" from "blocked because the file is damaged", and
  #        the only other route is to string-match `GLOBAL_BLOCK_REASON`. that
  #        match would silently stop the day the prose moved
  #        (rule.forbid.magic-values).
  #
  # ⇒ the reader decides; the callers read a flag. one reader, one decision
  #        point — which is why both `get` reads could be deleted rather than
  #        hardened one at a time.
  GLOBAL_BLOCK_CORRUPT=false

  # 🔴 .why `-e`, never `-f` = the ABSENCE test must ask "is there an ENTRY
  #        here", never "is there a REGULAR FILE here". a DIRECTORY at this
  #        path fails `-f`, so the old gate read it as "no global blocker set"
  #        and returned PERMISSIVE — damage reported as absence, on the one
  #        gate that pauses ALL commits in ALL repos.
  #
  # ⇒ this is the identical `-e` vs `-f` split `read_sponsor_state` and
  #        `del` already carry. the convention this change taught every other
  #        reader in the family was not applied to its most privileged one.
  if [[ ! -e "$GLOBAL_METER_FILE" ]]; then
    return 0  # not blocked — the entry is genuinely absent
  fi

  # 🔴 .why the DAMAGE gates = a present entry that cannot be read is not a
  #        permission to proceed. an unreadable global blocker fails CLOSED,
  #        because a permission surface must never guess toward permissive
  #        (rule.require.safe-by-default).
  if [[ ! -f "$GLOBAL_METER_FILE" || ! -r "$GLOBAL_METER_FILE" ]]; then
    GLOBAL_BLOCK_CORRUPT=true
    GLOBAL_BLOCK_REASON="global blocker file corrupt"
    return 2
  fi

  # 🔴 .why a SHAPE gate, and why the old `jq -r '.blocked // false'` was not
  #        one = jq on EMPTY input exits 0 and emits an empty capture. so a
  #        0-BYTE file left `blocked_val` empty, `"" == "true"` was false, and
  #        the gate returned PERMISSIVE while it reported itself intact.
  #
  # ⇒ `-s` slurps into an ARRAY, so empty input yields `[]` and `.[0]` yields
  #        `null` — a real value a TYPE test can reject. this is gate 1 of
  #        `read_sponsor_state`, applied to the family's most privileged file.
  #
  # 🔴 .why `-e` rides the TYPE test and never the value read = MEASURED, by a
  #        counter-clamp that caught it. `jq -e` sets its exit status from the
  #        LAST OUTPUT VALUE, so `-e '.blocked // false'` on a well-formed
  #        PERMISSIVE file emits `false` and exits 1 — and the gate read a
  #        healthy file as corrupt, which pauses the whole fleet.
  #
  # ⇒ so `-e` belongs on a predicate whose `false` MEANS refuse, never on a
  #        value read whose `false` means proceed. the two uses look identical
  #        and invert the gate.
  #
  # ⚠️ .note = the note at `read_org_meter_key` claimed its fail-closed shape
  #        "mirrors check_global_blocker, which already treats an unparseable
  #        file as blocked". that was FALSE for the empty-input case — a
  #        comment that vouched for a guarantee its neighbour did not give.
  #        ⇒ the claim is now true, rather than merely written down.
  # 🔴 read the file ONCE, then gate and read the value from those bytes.
  #
  # 🔴 .why = the gate and the value read were two `jq` spawns, each of which
  #        re-opened the path. the writer (`git.commit.uses.global.sh block`)
  #        is a NON-ATOMIC `cat >` heredoc, so a `block`/`allow` that lands
  #        between the two reads gives one of two wrong outcomes:
  #          1. the gate validates the OLD bytes, the read takes the NEW ones
  #             — a verdict assembled from two files, on a permission surface
  #          2. the read catches a mid-write TRUNCATED file, jq exits non-zero,
  #             and `set -euo pipefail` kills the caller with jq's raw parse
  #             text — never the curated "corrupt" branch four lines up
  #
  # ⇒ this is the identical torn-read `read_sponsor_state` was repaired for,
  #        re-introduced on the family's MOST privileged file. one capture, and
  #        both the gate and the read see the same bytes by construction.
  #
  # .note = the single capture also removes the second spawn's unguarded
  #         stderr, so no jq parse text can reach a caller's terminal.
  local contents
  contents=$(cat "$GLOBAL_METER_FILE" 2>/dev/null) || {
    GLOBAL_BLOCK_CORRUPT=true
    GLOBAL_BLOCK_REASON="global blocker file corrupt"
    return 2
  }

  # 🔴 .why a VANISHED entry resolves to NOT-BLOCKED, never to corrupt = `-e`
  #        above and `cat` here are two syscalls. the command that removes this
  #        file is `git.commit.uses allow --global` — 🔴 **the very command the
  #        corrupt refusal used to print as its own remedy** — so a human who
  #        lifts the blocker while a commit reads it lands squarely here.
  #
  # ⇒ the outcome without this gate is the worst shape available: a genuinely
  #        PERMISSIVE state rendered as damage, at exit 2, which pauses every
  #        commit in every repo and tells a human to `rm -r` a path that holds
  #        no entry. ⚠️ the fleet-wide gate is exactly where a wrong class costs
  #        the most.
  #
  # ⚠️ .note = this does NOT loosen the fail-closed rule. a 0-BYTE file still
  #         exists, so `-e` holds and it falls through to the shape gate below
  #         as damage. only a path with NO ENTRY resolves to permissive — and an
  #         absent global blocker is, by definition, not a block.
  if [[ -z "$contents" && ! -e "$GLOBAL_METER_FILE" ]]; then
    return 0
  fi

  # 🔴 the gate checks the top-level SHAPE **and** the `.blocked` LEAF type.
  #
  # 🔴 .why the leaf = a shape-only gate admitted `{"blocked": "not really"}`.
  #        the value read then yielded the string `not really`, the compare
  #        against `"true"` was false, and this — the switch that pauses every
  #        commit in every repo — reported the fleet as **PERMISSIVE**.
  #        ⇒ damage resolved toward the permissive answer, which is the one
  #        direction a permission gate may never guess
  #        (rule.require.safe-by-default, rule.forbid.failhide).
  #
  # ⇒ .why `.blocked? // false` inside the test = an ABSENT `.blocked` is legal
  #    and means "not blocked" — a bare `{}` is a healthy file. so absence is
  #    defaulted to a boolean before the type is read, and only a leaf that is
  #    PRESENT and non-boolean reads as damage.
  #
  # ⇒ .why it belongs beside its peers = `read_sponsor_state` already refuses
  #    `.sponsor.name`/`.email`/`.source` when they are not strings. a change
  #    that types every leaf of the identity file and no leaf of the permission
  #    file had the priority backwards.
  if ! printf '%s' "$contents" \
    | jq -s -e '.[0] | type == "object" and ((.blocked? // false | type) == "boolean")' \
      >/dev/null 2>&1; then
    GLOBAL_BLOCK_CORRUPT=true
    GLOBAL_BLOCK_REASON="global blocker file corrupt"
    return 2
  fi

  local blocked_val
  blocked_val=$(printf '%s' "$contents" | jq -s -r '.[0].blocked // false')

  if [[ "$blocked_val" == "true" ]]; then
    GLOBAL_BLOCK_REASON="commits blocked globally"
    return 2
  fi

  return 0  # not blocked
}

######################################################################
# helper: read the sponsor bound to a tree
#
# .what = parse a sponsor state file into SPONSOR_NAME / SPONSOR_EMAIL /
#         SPONSOR_SOURCE, and tell an unreadable file from an unbound tree
#
# .why  = TWO skills read this one file: git.commit.set, to name the
#         trailer, and git.commit.sponsor get, to render it. each carried
#         its own read, and each was wrong in a different direction — set
#         swallowed a corrupt file into "no sponsor bound" (a failhide,
#         which sent the human to re-bind a sponsor already bound), while
#         get let jq's raw parse text kill the script with no file named.
#         one reader gives both callers the same, correct answer, and a
#         later change to the state shape is one edit rather than two.
#
# .why  = an unreadable file and an unbound tree are distinct failures
#         with distinct remedies, so they get distinct exit codes. to
#         collapse them is the defect this replaces (rule.forbid.failhide).
#
# returns:
#   - 0 = a sponsor is bound; the two identity vars hold it, both non-empty
#   - 1 = the file is present and UNUSABLE — it will not parse, or it parses
#         and carries no identity. a malfunction either way
#   - 2 = no file is bound; the three vars are empty
######################################################################
read_sponsor_state() {
  local file="$1"

  SPONSOR_NAME=""
  SPONSOR_EMAIL=""
  SPONSOR_SOURCE=""

  # 🔴 .why = ABSENT is tested as "no entry at this path", never as "no
  #        REGULAR file at this path". a bare `[[ ! -f ]]` conflates the two,
  #        and the difference is a wrong remedy:
  #
  #          a DIRECTORY at .meter/git.commit.sponsor.jsonc  (a stray mkdir,
  #          a bad rename) fails `-f` ⇒ status 2 ⇒ every caller renders
  #          "no sponsor is bound to this tree"
  #
  #        ⇒ the human is then sent to BIND a sponsor onto a path that holds
  #        a directory, and the bind fails too. damage reported as absence is
  #        the exact failhide this status split exists to prevent, and it
  #        hands out the one remedy that cannot work.
  #
  # .why = so `-e` decides absence and `-f` decides usability. any entry that
  #        EXISTS and is not a readable regular file is DAMAGE — status 1,
  #        which names the file and asks for a `del` + re-bind.
  if [[ ! -e "$file" ]]; then
    return 2
  fi

  # 🔴 .why = a present path that is not a readable regular file is status 1,
  #        and this test must run BEFORE the read below. `cat` on an
  #        unreadable file writes `cat: …: Permission denied` to the
  #        caller's stderr, and every caller inherits it — so the human
  #        would meet the curated refusal AND a raw system message beside
  #        it. the whole point of this reader is that no un-curated text
  #        reaches a human (rule.forbid.behavior-hazards).
  if [[ ! -f "$file" || ! -r "$file" ]]; then
    return 1
  fi

  # 🔴 read the file ONCE, then gate and read the fields from those bytes.
  #
  # .why = the writer is atomic to a reader — `set` builds a temp file and
  #        `mv`s it over, so no reader ever sees a half-written file. that
  #        guarantee holds per READ, and it buys naught across four of them.
  #
  # 🔴 .why = the gate and the three field reads were four separate `jq`
  #        spawns, each of which re-opened the path. a `set` that lands
  #        between the NAME read and the EMAIL read pairs a name from one
  #        file with an email from the other — and the pair passes every
  #        gate, because each half is individually valid. it then lands
  #        verbatim in `Co-authored-by: $SPONSOR_NAME <$SPONSOR_EMAIL>`.
  #
  # ⇒ 🔴 .why = that is a FABRICATED IDENTITY in a commit trailer, assembled
  #        from two real humans, which is the one outcome this whole change
  #        exists to forbid. the window is between sub-millisecond spawns, so
  #        it is intermittent and silent — the worst shape a defect can take
  #        on the value the feature exists to keep honest.
  #
  # .why = two humans at two terminals is a real concurrency, not a
  #        hypothetical one: `set` and `del` are guarded by a TTY check, and
  #        a tty guard admits any number of terminals. the atomic write below
  #        was defended against exactly this pair, and the reader had no
  #        defense to match it.
  #
  # .note = one capture also drops three `jq` spawns from the hot path — the
  #         reader runs on every commit. that is a side benefit, never the
  #         reason.
  # 🔴 .why = stderr is muted even though the `-r` gate above already refuses
  #        an unreadable file. the gate and this read are two syscalls, so a
  #        `chmod` between them still leaks `cat: …: Permission denied` onto
  #        the caller's stderr — and every caller inherits it. the window is
  #        tiny and the cost of the guard is one redirect.
  #
  # .why = a raw system message beside a curated refusal is the un-curated
  #        text this whole reader exists to remove. ⇒ `|| :` keeps an
  #        unreadable file on the status-1 path rather than letting a
  #        non-zero `cat` kill the caller under `set -e`, and the empty
  #        capture then fails the slurp gate below exactly as damage should.
  local contents
  contents=$(cat "$file" 2>/dev/null || :)

  # 🔴 .why = an EMPTY capture is re-tested for ABSENCE before it is called
  #        damage. `-e` above and `cat` here are two syscalls, so a concurrent
  #        `git.commit.sponsor del` between them empties the capture — and the
  #        slurp gate below would then read that emptiness as a corrupt file.
  #
  # ⇒ the tree is UNBOUND, and the human would be handed the corrupt remedy:
  #        "inspect it, or clear the bind and set it afresh", pointed at a file
  #        that no longer exists. ⚠️ the wrong CLASS produces the wrong REMEDY,
  #        and it returns status 1 (a malfunction) where an absent sponsor owes
  #        status 2 (a constraint) — the exit-code split this family keeps.
  #
  # .why = `del` is human-only and tty-gated, and a tty guard admits any number
  #        of terminals. so this is a real concurrency, the same one the atomic
  #        write and the single capture above are already defended against.
  #
  # ⚠️ .note = a genuinely 0-BYTE file is NOT this case. it still exists, so
  #         `-e` holds and the read falls through to the gates below, which
  #         classify it as damage exactly as they should.
  if [[ -z "$contents" && ! -e "$file" ]]; then
    return 2
  fi

  # gate 1 — does it parse, AND is `.sponsor` an object?
  #
  # .why = the two questions are asked together because the SECOND one keeps
  #        the field reads below safe. `.sponsor.name` on a file whose
  #        `.sponsor` is a STRING (`{"sponsor": "Ada"}`) makes jq exit
  #        non-zero with `Cannot index string with "name"` — and under
  #        `set -euo pipefail` that raw text kills the caller, with no file
  #        named and no remedy. ⇒ the very un-curated crash this reader was
  #        written to remove, one shape further out.
  #
  # .why = a bare `jq empty` answers only "is this json at all?", so it
  #        passes `{"sponsor": "Ada"}` and `{"foo": 1}` alike. the type test
  #        subsumes it: a file that will not parse fails this too, since jq
  #        cannot evaluate the expression at all.
  #
  # 🔴 .why = the LEAF types are tested too, and that half is not optional.
  #        a prior form of this gate asked only `(.sponsor | type) ==
  #        "object"` and claimed in this very comment that it made "the field
  #        reads below unable to fail". ⚠️ it did not.
  #
  # 🔴 .why = MEASURED, by removal of the leaf tests against
  #        `{"sponsor": {"name": {"nested": 1}, "email": "a@b.c"}}`. the
  #        outcome is NOT the crash it looks like it should be:
  #          1. `// empty` does not fire — a non-null truthy value is not null
  #          2. and `jq -r` does not fail on an object either. it prints the
  #             value as compact json, so SPONSOR_NAME becomes `{"nested":1}`
  #          3. gate 2 then sees a NON-EMPTY name and returns 0
  #        ⇒ `get` exits 0 and renders a bound sponsor named `{"nested":1}`,
  #        and a commit would carry `Co-authored-by: {"nested":1} <a@b.c>`.
  #
  # ⇒ 🔴 .why = so this is not an ugly error. it is a FABRICATED IDENTITY in a
  #        commit trailer, which is the one outcome this whole change exists
  #        to forbid. the reader would report a human who does not exist.
  #
  # ⚠️ .note = the shape is reachable only by a hand-edit, since `set` is the
  #        only writer and always emits three strings. that is what keeps it a
  #        nitpick rather than a blocker — never the severity of the outcome.
  # .why = `.source` is tested through its OWN fallback rather than as a bare
  #        string, because `null` is a legal value for it — a file bound
  #        before the field existed. `(.sponsor.source // $sourceDefault)` is
  #        byte-for-byte the expression the read below performs, so the gate
  #        tests exactly what the read will do, never an approximation of it.
  #        ⇒ both bind `$sourceDefault` from the SAME shared constant, so the
  #        equality survives a rename rather than depending on two literals.
  # 🔴 .why = the email is checked for SHAPE, never only for type. a type
  #        check alone asks "is it a string?" and `"not-an-email"` answers
  #        yes — so a hand-edited file read as BOUND and its value landed
  #        verbatim in a trailer: `Co-authored-by: Ada <not-an-email>`.
  #        ⇒ that is the same FABRICATED IDENTITY the nested-object case
  #        above describes, reached by a shorter route: the writer refuses
  #        this value and the reader accepted it, so the two disagreed about
  #        what a bound sponsor is.
  #
  # .note = the pattern is the SHARED one, so a reader that accepts what the
  #         writer refuses is now unreachable by construction rather than by
  #         two regexes that happen to match today.
  #
  # ⚠️ .note = the NAME is deliberately NOT shape-checked beyond non-empty.
  #         a human name has no legal form to check — `as_identity_parts`
  #         itself takes `.+` — so a pattern there would refuse real people.
  # 🔴 .why `-s`, and `.[0]` = a BARE `jq -e` reports on the last OUTPUT value,
  #        and EMPTY input produces no value at all — so the filter never runs,
  #        there is no `false` to report, and jq exits 0. ⇒ a 0-byte sponsor
  #        file would PASS this gate.
  #
  #        ⚠️ the outcome stayed correct only because the field reads below
  #        return empty and the non-empty check catches it. **that makes this
  #        gate a no-op on the empty case rather than a guard** — the safety
  #        rests entirely on a check several lines further down, and a later
  #        edit that trusts "the shape was already gated" would be wrong.
  #
  # ⇒ `-s` slurps the input into an ARRAY, so empty input yields `[]` and
  #        `.[0]` yields `null` — a real value the filter can reject. the gate
  #        then decides its own case.
  #
  # .note = this is the SAME empty-input class `is_gh_user_json_usable`
  #         measured and hardened with `-s`. the two gates read two different
  #         boundaries and share one jq trap; they now share one answer.
  #
  # ⚠️ .note = MEASURED, and the honest bound on what this buys: gate 1 and
  #         gate 2 both `return 1`, so this repair moves NO outcome. the suite
  #         is fully green with `-s` removed — the 0-byte clamp two files over
  #         holds under either gate alone, and says so at its own site.
  #
  # ⇒ so the win is STRUCTURAL, never behavioral: the gate now decides its own
  #         case rather than a downstream check that happens to cover for it.
  #         a later edit that trusts "the shape was already gated" — to drop
  #         gate 2, or to read a field between them — was wrong before and is
  #         right now, and no test could have told the difference.
  # 🔴 .why the CONTROL-CHARACTER tests = the reader was LOOSER than the writer,
  #        and the gap was message injection rather than identity forgery.
  #
  #        `SPONSOR_EMAIL_PATTERN` is a DENY-list — `[^ @]` excludes a space and
  #        an `@` and admits everything else, newline included, in BOTH engines.
  #        the name field is checked for `type == "string"` and no more, by
  #        design (a human name has no legal form to check). ⇒ neither gate
  #        refused a `\n`, and `git.commit.set.sh` interpolates both fields
  #        straight into `FULL_MESSAGE`:
  #
  #          {"sponsor":{"name":"Ada\nCo-authored-by: Mal <mal@x.dev>", …}}
  #
  #        lands as TWO fully-formed trailers, the second attacker-chosen.
  #        github credits it independently on squash, and the same hole admits
  #        `Signed-off-by:`, `BREAKING CHANGE:`, or `Fixes #N`.
  #
  # ⚠️ .why this is BEYOND the risk the design already accepts. a clone with
  #        repo-write can hand-edit this file to name any identity, and that is
  #        accepted because the forgery is ONE visible, disputable line. a
  #        newline breaks that bound structurally: one field becomes many lines,
  #        so the value stops being a claim about a person and starts to be a
  #        set of instructions for whatever parses the trailer block.
  #
  # 🔴 .why `[[:cntrl:]]`, never `[\n\r]` = the defect WAS a deny-list of two
  #        characters, so a deny-list of two more is the same mistake one step
  #        along. the class names what is inadmissible — every C0 plus DEL —
  #        and it covers the ESC that would otherwise reach a terminal render.
  #
  # 🔴 .note = MEASURED, and it corrects the review that raised this. the two
  #        fields are exposed to DIFFERENT characters, so a `[\n\r]` deny-list
  #        would have read as a full repair and closed one half:
  #
  #        | field | `\n` | `\r` |
  #        |-------|------|------|
  #        | name  | 🔴 live — no shape gate at all | 🔴 live |
  #        | email | ✅ already refused, by accident | 🔴 LIVE |
  #
  #        the email's `\n` is covered twice over, and by neither design:
  #          1. jq's `test` uses PERL syntax, so `$` holds at end-of-string or
  #             before a FINAL newline — never at end-of-line. an embedded `\n`
  #             therefore fails `^…$` on its own
  #          2. `$(…)` strips a TRAILING newline before the value is read
  #
  #        ⇒ a `\r` defeats both: `[^ @]` admits it, `$` is unmoved by it, and
  #        `$(…)` strips newlines alone. the email's live exposure was never
  #        the character the report named.
  #
  # ⇒ clamped at `git.commit.set` `[case48]` — `[t0]` the name's `\n`, `[t1]`
  #        the email's `\r`. dogfooded: with these two tests removed, 5 of 5
  #        assertions go red and the injected trailer renders.
  #
  # .note = the WRITER refuses this same class at bind (git.commit.sponsor.sh),
  #         so the two are symmetric. that is deliberate: a reader stricter than
  #         its writer is the same defect mirrored, and would bind a value that
  #         later refuses every commit.
  if ! printf '%s' "$contents" \
    | jq -s -e --arg emailPattern "^$SPONSOR_EMAIL_PATTERN\$" \
        --arg sourceDefault "$SPONSOR_SOURCE_SUPPLIED" \
        '.[0] | (.sponsor | type) == "object"
        and (.sponsor.name | type) == "string"
        and (.sponsor.email | type) == "string"
        and ((.sponsor.name | test("[[:cntrl:]]")) | not)
        and ((.sponsor.email | test("[[:cntrl:]]")) | not)
        and (.sponsor.email | test($emailPattern))
        and ((.sponsor.source // $sourceDefault) | type) == "string"
        and (((.sponsor.source // $sourceDefault) | test("[[:cntrl:]]")) | not)' >/dev/null 2>&1; then
    return 1
  fi

  SPONSOR_NAME=$(printf '%s' "$contents" | jq -r '.sponsor.name // empty')
  SPONSOR_EMAIL=$(printf '%s' "$contents" | jq -r '.sponsor.email // empty')

  # .why = the `// $sourceDefault` fallback covers a file bound before this
  #        field existed. a supplied value is the safe read: it claims only
  #        that a value was handed in, which is true of every bind. to guess
  #        `me` would assert a session that may never have been consulted.
  #
  # 🔴 .note = the default is the SHARED constant, never a literal, because
  #        `git.commit.sponsor.sh` is the writer of this same word. the gate
  #        above binds the identical `--arg`, so the two expressions stay
  #        byte-for-byte equal and a rename reaches all three at once.
  SPONSOR_SOURCE=$(printf '%s' "$contents" \
    | jq -r --arg sourceDefault "$SPONSOR_SOURCE_SUPPLIED" \
        '.sponsor.source // $sourceDefault')

  # 🔴 gate 2 — does it carry an identity? a file that parses and holds no
  # name or email is UNUSABLE, and it is a malfunction rather than an
  # unbound tree.
  #
  # .why = the two states are told apart by the FILE, never by the fields.
  #        `set` is the only writer and it always emits both (the heredoc in
  #        `set_sponsor_state`, just below), and `del` removes the file
  #        outright — so
  #        `{"sponsor": {}}` is reachable only by a hand-edit or a file cut
  #        short. that is damage, never an absence.
  #
  # .note = gate 1 alone returns 0 here and leaves both vars empty, which
  #         contradicts this function's own `0` contract above and funnels a
  #         damaged file into the caller's "no sponsor is bound" branch —
  #         the same wrong remedy handed to the same human, one degree off
  #         from the failhide this reader was written to close
  #         (rule.forbid.failhide). the shape check is what makes the
  #         contract true rather than merely stated.
  # 🔴 .why the test is on the TRIMMED value, never the raw one = `-z` is
  #        false for `"   "`, so a hand-edited
  #        `{"sponsor": {"name": "   ", "email": "a@b.c"}}` passed every gate
  #        and rendered `Co-authored-by:    <a@b.c>` — a trailer that is
  #        nominally bound and names no readable human.
  #
  # ⇒ that is the exact outcome this whole change exists to forbid, reached
  #        through the one gate that asks whether an identity is PRESENT.
  #        gate 1 types the leaves and refuses control characters; it holds no
  #        opinion on a string that is legal and empty of content.
  #
  # .why = the WRITER cannot produce this (`as_identity_trimmed` strips, and
  #        the empty-value check intercepts), so it is a hand-edit only — and
  #        a hand-edited file is precisely the class this reader was hardened
  #        against. a reader that trusts its writer needs no gates at all.
  local name_trimmed="${SPONSOR_NAME//[[:space:]]/}"
  local email_trimmed="${SPONSOR_EMAIL//[[:space:]]/}"

  if [[ -z "$name_trimmed" || -z "$email_trimmed" ]]; then
    SPONSOR_NAME=""
    SPONSOR_EMAIL=""
    SPONSOR_SOURCE=""
    return 1
  fi

  # 🔴 .why the reader TRIMS what it keeps, and not merely what it tests =
  #        the gate above collapses ALL whitespace, so it answers one question
  #        only — "is there any content here at all?" — and a name of
  #        `"  Ada Lovelace  "` answers yes. the value then flowed onward
  #        untouched and reached the trailer as
  #        `Co-authored-by:   Ada Lovelace   <ada@example.com>`.
  #
  # ⚠️ .why the two cannot be ONE expansion = the gate must ignore INNER
  #        spaces (a real human name holds them) while the store must keep
  #        them. `//[[:space:]]/` is right for the first and destroys the
  #        second; `as_identity_trimmed` cuts only the outer blanks.
  #
  # ⇒ the writer already called this transformer, so this restores a SYMMETRY
  #        rather than adding a rule: what a bind may write is now exactly
  #        what a read may return.
  SPONSOR_NAME=$(as_identity_trimmed "$SPONSOR_NAME")
  SPONSOR_EMAIL=$(as_identity_trimmed "$SPONSOR_EMAIL")

  return 0
}

######################################################################
# nudge: a quota grant with no sponsor bound buys no commits
#
# .why = a commit needs BOTH a quota and a sponsor, and every quota grant
#        surface — local `set`, `--global allow`, `--org allow` — is a moment
#        a human is provably present. this reader was extracted so the three
#        surfaces ask ONE question through one reader rather than three that
#        could drift (rule.require.get-set-gen-verbs, "one reader, one
#        decision point").
#
# .why = a coconut, and exit 0. a sponsor is required to COMMIT, never to
#        grant a quota — so this carries no mandatory load and the grant
#        stands on its own (rule.require.coconut-hints).
#
# .why = the `@me` line names ITS OWN caveat rather than a bare command. an
#        `@me` bind on behalf of someone else's requested work names the
#        wrong human, truthfully — the hard-to-see error this whole feature
#        exists to prevent (domain.terms/sponsor.md, invariant 7).
#
# 🔴 .why every inline `#` comment describes ONE line, and none of them end
#        in a colon = `print_coconut_hint` renders a FLAT list of peers. it
#        has no sub-header primitive, so a final colon fakes one. the `del`
#        line once read `# clear it, then bind afresh:` and that colon made
#        the two bind lines below read as its children — a nest the
#        renderer cannot draw (rule.forbid.snapshot-visual-blemishes).
#
#        ⇒ the ORDER now rides the word "first", which describes the line
#        it sits on. to restore a sub-header, give the renderer one.
#
#        .clamp = MEASURED. restore a final colon on any hint line and
#        `[caseSponsorNudge][t3]`'s colon assert goes red — it scans the
#        WHOLE coconut, so a hint added to any arm inherits the guard.
######################################################################
print_sponsor_bind_nudge_if_absent() {
  local repo_root meter_dir sponsor_status
  repo_root=$(git rev-parse --show-toplevel)
  meter_dir="$repo_root/.meter"

  sponsor_status=0
  read_sponsor_state "$meter_dir/$SPONSOR_STATE_FILENAME" || sponsor_status=$?

  if [[ "$sponsor_status" -eq 1 ]]; then
    print_coconut_hint \
      "the sponsor state file is corrupt, so commits will refuse" \
      "cat .meter/$SPONSOR_STATE_FILENAME" \
      "rhx git.commit.sponsor del   # clear the damaged entry first" \
      "$SPONSOR_BIND_VIA_STDIN" \
      "$SPONSOR_BIND_VIA_LITERAL"
  fi

  if [[ "$sponsor_status" -eq 2 ]]; then
    print_coconut_hint \
      "no sponsor is bound to this tree, so commits will refuse" \
      "$SPONSOR_BIND_VIA_STDIN" \
      "$SPONSOR_BIND_VIA_LITERAL" \
      "rhx git.commit.sponsor set --who @me   # reserve for YOUR OWN work"
  fi
}

######################################################################
# the WRITE boundary for the sponsor state — the `read_sponsor_state` pair
#
# usage: set_sponsor_state <file> <name> <email> <source>
#
# 🔴 .why it is a leaf = the read boundary was extracted and hardened over
#        this whole drive; the write boundary stayed spelled out inline in the
#        `set` orchestrator as escape → heredoc → temp-name → mv. a reader had
#        to simulate four steps to learn that the block writes one file
#        (rule.prefer.decomposable-architecture).
#
# 🔴 .why it lives HERE, beside its reader, rather than at its one caller =
#        the two encode ONE wire format and must agree on it. this file already
#        records what that disagreement costs: the writer refused a malformed
#        address while the reader accepted one, so a file `set` would never
#        produce still read as BOUND and landed in a trailer as
#        `Co-authored-by: Ada <not-an-email>`. ⇒ a format edit applied to one
#        and missed on the other is silent, and adjacency is what makes the
#        pair visible to a single reader.
#
# 🔴 .why a TEMP file then `mv` = a reader then sees the prior complete file or
#        the new complete file, and never a partial one — `mv` within one
#        directory is an atomic rename.
#
# .why = a heredoc straight to the final path is NOT atomic, and this skill is
#        the one that cannot afford that. a signal mid-write, a full disk, or
#        two humans at two terminals (the tty guard passes both) leaves a
#        truncated file — which `read_sponsor_state` spends real code to detect
#        and reports as a malfunction whose remedy is a manual `del` + re-bind.
#        ⇒ the write path would have manufactured the outage the read path
#        exists to catch.
#
# .note = the temp file is made INSIDE the state dir on purpose. `mv` is atomic
#         only within a filesystem, and a $TMPDIR on another mount would
#         silently degrade the rename to a copy.
######################################################################
set_sponsor_state() {
  local file="$1"
  local name="$2"
  local email="$3"
  local source="$4"

  local name_json
  local email_json
  local file_temp

  # 🔴 .why the write REFUSES a path that is not a regular file = `mv -f src dst`
  #        does not overwrite a DIRECTORY at `dst`; it moves `src` INSIDE it. so
  #        a directory at the state path made the bind land at
  #        `…/git.commit.sponsor.jsonc/git.commit.sponsor.jsonc.tmp.4271`, `mv`
  #        exit 0, and the skill print `shell yeah, sponsor bound`.
  #
  # 🔴 ⇒ the state path was still a directory, so the very next commit read it
  #        as corrupt and refused. a human was told the bind succeeded and then
  #        told, repeatedly, that it had not — the silent half-succeed this
  #        whole feature exists to close, reached through its own writer.
  #
  # ⚠️ .why `set -e` never caught it = the failure mode is an `mv` that
  #        SUCCEEDS. an exit-code check is no guard here; the path's own shape
  #        is the only thing that distinguishes the two outcomes.
  #
  # .note = its twin on the `del` side was already guarded (`[case6][t2]`).
  #         this is the `set`-side half of the same class.
  if [[ -e "$file" && ! -f "$file" ]]; then
    return 1
  fi

  name_json=$(escape_json_string "$name")
  email_json=$(escape_json_string "$email")

  file_temp="${file}.tmp.$$"
  # .why the EXIT trap = a SIGINT/SIGTERM/kill between this write and the `mv`
  #        below leaves `$file_temp` behind in the state dir — the same window
  #        `get_gh_user_session` guards for the identical reason. the `${...:-}`
  #        default holds for the same reason too: a late trap under `set -u`
  #        reads `file_temp` after the function already returned.
  trap 'rm -f "${file_temp:-}"' EXIT
  cat > "$file_temp" << EOF
{
  "sponsor": {
    "name": "$name_json",
    "email": "$email_json",
    "source": "$source"
  }
}
EOF
  mv -f "$file_temp" "$file"
}

######################################################################
# helper: get org from .agent/keyrack.yml
# returns:
#   - 0 if found, sets ORG_VALUE to org name
#   - 2 if not found or unset, sets ORG_ERROR
# note: uses global ORG_VALUE instead of echo to avoid subshell issues
#       (ORG_ERROR wouldn't propagate if called via command substitution)
######################################################################
get_org_from_keyrack() {
  ORG_ERROR=""
  ORG_VALUE=""
  local keyrack_file
  local git_root

  # find git root
  git_root=$(git rev-parse --show-toplevel 2>/dev/null)
  if [[ -z "$git_root" ]]; then
    ORG_ERROR="not in a git repository"
    return 2
  fi

  keyrack_file="$git_root/.agent/keyrack.yml"

  # check file exists
  if [[ ! -f "$keyrack_file" ]]; then
    ORG_ERROR=".agent/keyrack.yml not found"
    return 2
  fi

  # parse org field (simple grep + sed, no yq dependency)
  # note: `grep -m1` (not `grep | head -n1`) stops grep itself after the first
  # match, so no downstream reader closes a pipe early and SIGPIPEs the writer
  # under `set -o pipefail` + `set -e`
  local org_val
  org_val=$(grep -m1 -E "^org:" "$keyrack_file" 2>/dev/null | sed 's/^org:[[:space:]]*//' | tr -d '[:space:]')

  if [[ -z "$org_val" ]]; then
    ORG_ERROR=".agent/keyrack.yml#org required"
    return 2
  fi

  ORG_VALUE="$org_val"
  return 0
}

######################################################################
# helper: check if org blocker is active
# returns:
#   - 0 (success) if NOT blocked (continue)
#   - 2 if blocked (caller should exit 2)
#   - sets ORG_BLOCK_REASON if blocked
######################################################################
# .what = read ONE key from the org meter — status 0 + the value, or status 1
#
# 🔴 .why = both org reads were `jq … 2>/dev/null` with no check at all. on a
#        corrupt file jq fails, its error is discarded, and the capture comes
#        back EMPTY — which satisfies `!= "unset" && != "null"`, falls past the
#        `== "blocked"` test, and reaches `return 0`.
#
#        ⇒ **a corrupt PERMISSION file rendered as a healthy, permissive one**
#        (rule.forbid.failhide) — and it failed in the OPEN direction, the one
#        direction a permission read must never guess
#        (rule.require.safe-by-default).
#
# 🔴 .why TWO conditions, never the exit status alone = the two damaged shapes
#        fail DIFFERENTLY, and only one of them is non-zero:
#
#          corrupt json  → jq exits NON-ZERO, capture empty
#          a 0-byte file → jq exits ZERO,     capture empty   ← the trap
#
#        ⇒ an exit check alone still reads a 0-byte permission file as allowed.
#        this is the same empty-input class `is_gh_user_json_usable` measured on
#        the PIPE side; it reaches the FILE side too, and for the same cause —
#        empty input yields no value, so there is no result to report on.
#
# 🔴 .note = MEASURED, never reasoned. the second condition was dogfooded on its
#         own, against `[case34]`'s two damaged shapes:
#
#           both conditions   → [t5] green · [t6] green
#           exit check ONLY   → [t5] green · [t6] RED     ← earns its keep
#           neither (the bug) → [t5] RED   · [t6] RED
#
#         ⇒ row 2 is the whole reason this line is here. a reader who deletes
#         it as redundant with the `||` above will pass [t5] and ship the trap.
#
# ⚠️ .note = the `[[ -n "$value" ]]` line no longer catches a 0-BYTE file, and
#         the caller now carries that half. this reader takes CAPTURED BYTES
#         and slurps them, and `-s` turns empty input into `[]` — whose
#         `.[0].orgs[$key] // "unset"` yields the literal `unset`, a non-empty
#         value. ⇒ the emptiness signal dies in the slurp, and no test on the
#         VALUE can restore it, because `unset` is also the legal answer for a
#         healthy file that does not name this org.
#
#         ⇒ so `check_org_blocker` gates the SHAPE of the capture before it
#         reads any key. this line still earns its keep for the corrupt-json
#         case; it is no longer the whole guard. **measured**: the caller's
#         gate removed → `[case34][t6]` goes red with `no org config`.
#
# .note = a real key that is absent yields the literal "unset" via `//`, never
#         an empty string. ⇒ empty means DAMAGE here, unambiguously.
#
# .note = the fail-closed shape mirrors `check_global_blocker`, which already
#         treats an unparseable file as blocked. the org read was the one of
#         the three that swallowed it.
# 🔴 .why it takes BYTES rather than a path = it read `$ORG_METER_FILE` itself,
#        and `check_org_blocker` calls it TWICE — once for the org, once for the
#        `@all` fallback. two opens means two snapshots, so a concurrent
#        `allow --org @all` between them lets the gate compose one verdict from
#        two versions of the file:
#
#          version A: `@all: blocked`  ← the org read sees this, yields `unset`
#          version B: `@all: allowed`  ← the @all read sees this
#          ⇒ returns 0. **a blocked fleet, reported as allowed.**
#
#        the atomic writer closed the TORN read (no reader sees a partial file);
#        it cannot close the torn DECISION, because that needs one snapshot
#        rather than one write. ⇒ the caller captures once and passes the bytes.
#
# ⇒ .why this shape and not another = `check_global_blocker` three functions up
#    already reads its file once and answers both its questions from that
#    capture. this is that same move, on the gate that has two questions.
read_org_meter_key() {
  local contents="$1"
  local key="$2"
  local value
  value=$(printf '%s' "$contents" \
    | jq -s -r --arg key "$key" '.[0].orgs[$key] // "unset"' 2>/dev/null) || return 1
  [[ -n "$value" ]] || return 1
  printf '%s' "$value"
}

######################################################################
# is a value one of the three states an org leaf may hold?
#
# .what = `allowed` | `blocked` are what the writer emits; `unset` is what the
#         reader synthesizes for an absent key. every other value is damage.
#
# 🔴 .why a closed set = `check_org_blocker` compared the leaf against the
#        BLOCKED sentinels alone and let each other value fall through to
#        `return 0`. so `{"orgs": {"ehmpathy": ["allowed"]}}` — which `jq -r`
#        renders as the literal `["allowed"]` — read as a permission GRANTED.
#        ⇒ damage resolved toward permissive on a permission gate, which is the
#        one direction it may never guess (rule.require.safe-by-default).
#
# ⇒ .why an allowlist rather than a type check = `jq -r` has already flattened
#    the leaf to text by the time this sees it, so the JSON type is gone. what
#    survives is the rendered string, and the set of legal strings is closed and
#    three long — so the allowlist is both simpler and stricter than a re-parse.
#
# ⇒ .why one predicate rather than two inline compares = the org read and the
#    `@all` read ask the identical question, and a rule written twice is a rule
#    that drifts once (rule.require.named-transformers).
#
# 🔴 .why NO `null` entry = a JSON null leaf never reaches this predicate as
#        the literal string "null" — `read_org_meter_key`'s `// "unset"`
#        renders it "unset" first, at the ONE reader every caller of this
#        predicate goes through. a "null" allowlist entry would be dead code
#        that reads as a contract ("a stored null is a state distinct from
#        unset") the reader already refutes (rule.forbid.maintenance-hazards).
is_org_state_known() {
  case "$1" in
    allowed | blocked | unset) return 0 ;;
  esac
  return 1
}

check_org_blocker() {
  ORG_BLOCK_REASON=""
  # 🔴 .why a second NAMED output = the callers must tell "this org is blocked
  #        by a human" from "this file is damaged", because the two take
  #        OPPOSITE remedies — `uses allow --org` for the first, inspect-or-
  #        clear for the second. the only other route is a string-match on
  #        `ORG_BLOCK_REASON`, which breaks the day the prose is reworded
  #        (rule.forbid.magic-values).
  #
  # ⇒ .why it mirrors `GLOBAL_BLOCK_CORRUPT` = the two readers gate two meters
  #    for one commit, so a caller that learns the shape once applies it twice.
  ORG_BLOCK_CORRUPT=false

  # get org from keyrack (called directly, not via subshell, so ORG_ERROR propagates)
  if ! get_org_from_keyrack; then
    ORG_BLOCK_REASON="$ORG_ERROR"
    return 2
  fi
  local org="$ORG_VALUE"

  # 🔴 ABSENCE is `-e`; DAMAGE is `-f`. two tests, because they are two states
  #    with two different remedies — "configure one" versus "clear the wreck".
  #
  # 🔴 .why = one bare `-f` conflated them: a DIRECTORY at the path fails `-f`,
  #        so this read reported `org permissions not configured` — **damage
  #        rendered as absence**. it fails CLOSED, so no permission leaked; what
  #        leaked was the DIAGNOSIS. the human then runs `uses allow --org` to
  #        configure what is already configured, and the write dies on the
  #        directory nobody told them about (rule.forbid.failhide).
  #
  # ⇒ .why the shape matches its two peers = `check_global_blocker` and
  #    `read_sponsor_state` each carry this same pair. three readers, three
  #    meters, one absence/damage split — so a reader learns it once.
  if [[ ! -e "$ORG_METER_FILE" ]]; then
    # no org config = unset = check for @all
    ORG_BLOCK_REASON="no org config for $org (org permissions not configured)"
    return 2
  fi

  if [[ ! -f "$ORG_METER_FILE" || ! -r "$ORG_METER_FILE" ]]; then
    ORG_BLOCK_CORRUPT=true
    ORG_BLOCK_REASON="$ORG_CORRUPT_HEADLINE"
    return 2
  fi

  # 🔴 ONE capture, then BOTH key reads from it. the org key and the `@all`
  #    fallback are two questions about one state, so they must be answered
  #    from one snapshot — see the note on `read_org_meter_key`.
  local contents
  contents=$(cat "$ORG_METER_FILE" 2>/dev/null) || {
    ORG_BLOCK_CORRUPT=true
    ORG_BLOCK_REASON="$ORG_CORRUPT_HEADLINE"
    return 2
  }

  # 🔴 .why an EMPTY capture is re-tested for ABSENCE before it is called
  #        damage = the `-f`/`-r` gate above and this `cat` are two syscalls,
  #        so a concurrent `git.commit.uses org del` between them empties the
  #        capture and drops the file. this reader used to skip straight to
  #        the shape gate, which called that state "org meter file corrupt"
  #        — the wrong class, on a permission surface, pointed at a
  #        `cat`/`rm -r` remedy for a file that no longer exists
  #        (rule.forbid.friction-hazards).
  #
  # ⇒ .why it mirrors `read_sponsor_state` and `check_global_blocker` = all
  #        three readers share this exact race, and all three now share this
  #        exact recheck — the same class, the same fix, at the same site.
  #
  # ⚠️ .note = a genuinely 0-BYTE file is NOT this case. it still exists, so
  #        `-e` holds and the read falls through to the gates below, which
  #        classify it as damage exactly as they should.
  if [[ -z "$contents" && ! -e "$ORG_METER_FILE" ]]; then
    ORG_BLOCK_REASON="no org config for $org (org permissions not configured)"
    return 2
  fi

  # 🔴 gate the SHAPE of the capture, then read keys from it — the same order
  #    `check_global_blocker` uses, and it carries load HERE for a reason the
  #    key reader can no longer carry itself.
  #
  # 🔴 .why = `read_org_meter_key` used to read the FILE, where jq on empty
  #        input exits 0 with NO OUTPUT, so its `[[ -n "$value" ]]` caught a
  #        0-byte file. it now reads a captured STRING through `-s`, and the
  #        slurp turns empty input into `[]` — whose `.[0].orgs[$key]` is
  #        `null`, which `// "unset"` renders as the literal `unset`.
  #
  #        ⇒ **the emptiness signal is destroyed by the slurp**, so a 0-byte
  #        permission file read as `no org config` — damage rendered as
  #        absence, and measured red by `[case34][t6]`.
  #
  # ⇒ .why the gate rather than a restored `-n` check = `unset` is a LEGAL
  #    answer for a healthy file that simply does not name this org. once the
  #    slurp normalizes empty to `[]`, no inspection of the VALUE can tell the
  #    two apart. the distinction survives only upstream, on the bytes.
  if ! printf '%s' "$contents" \
    | jq -s -e '.[0] | type == "object"' >/dev/null 2>&1; then
    ORG_BLOCK_CORRUPT=true
    ORG_BLOCK_REASON="$ORG_CORRUPT_HEADLINE"
    return 2
  fi

  # read org-specific state
  local org_state
  if ! org_state=$(read_org_meter_key "$contents" "$org"); then
    ORG_BLOCK_CORRUPT=true
    ORG_BLOCK_REASON="$ORG_CORRUPT_HEADLINE"
    return 2
  fi

  # 🔴 the LEAF gate. the shape gate above proves the file is an object, and it
  #    says no word about the one value this gate actually decides on.
  if ! is_org_state_known "$org_state"; then
    ORG_BLOCK_CORRUPT=true
    ORG_BLOCK_REASON="$ORG_CORRUPT_HEADLINE"
    return 2
  fi

  # if org-specific state exists, use it
  if [[ "$org_state" != "unset" ]]; then
    if [[ "$org_state" == "blocked" ]]; then
      ORG_BLOCK_REASON="commits blocked for org $org"
      return 2
    fi
    return 0  # org is allowed
  fi

  # fall back to @all default
  local all_state
  if ! all_state=$(read_org_meter_key "$contents" "@all"); then
    ORG_BLOCK_CORRUPT=true
    ORG_BLOCK_REASON="$ORG_CORRUPT_HEADLINE"
    return 2
  fi

  # the same leaf gate, on the fallback. `@all` decides for every org that names
  # itself nowhere in the file, so a damaged `@all` is the wider fail-open
  if ! is_org_state_known "$all_state"; then
    ORG_BLOCK_CORRUPT=true
    ORG_BLOCK_REASON="$ORG_CORRUPT_HEADLINE"
    return 2
  fi

  if [[ "$all_state" == "unset" ]]; then
    ORG_BLOCK_REASON="no org config for $org (org permissions not configured)"
    return 2
  fi

  if [[ "$all_state" == "blocked" ]]; then
    ORG_BLOCK_REASON="commits blocked for org $org (from @all)"
    return 2
  fi

  return 0  # @all is allowed
}

######################################################################
# helper: find the closest ancestor branch for current HEAD
# handles stacked branches (branch B created from branch A)
# returns:
#   - "NO_COMMITS" if repo has no commits
#   - "NO_BASE" if no base branch found
#   - "ON_BASE" if current branch is the base branch
#   - branch name (e.g., "origin/main" or "turtle/branch-a") otherwise
######################################################################
get_closest_ancestor_branch() {
  # fail fast: repo has no commits
  if ! git rev-parse HEAD >/dev/null 2>&1; then
    echo "NO_COMMITS"
    return 0
  fi

  # find base branch (prefer origin remote, fall back to local)
  local base_branch=""
  for candidate in origin/main origin/master origin/trunk main master trunk; do
    if git rev-parse --verify "$candidate" >/dev/null 2>&1; then
      base_branch="$candidate"
      break
    fi
  done

  # fail fast: no known default branch found
  if [[ -z "$base_branch" ]]; then
    echo "NO_BASE"
    return 0
  fi

  # fail fast: current branch IS the base branch
  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  local base_branch_name="${base_branch#origin/}"
  if [[ "$current_branch" == "$base_branch_name" ]]; then
    echo "ON_BASE"
    return 0
  fi

  # find closest ancestor branch (handles stacked branches)
  local closest_ancestor="$base_branch"
  local closest_distance=999999

  # compute distance to main
  local main_mb
  main_mb=$(git merge-base HEAD "$base_branch" 2>/dev/null || echo "")
  if [[ -n "$main_mb" ]]; then
    closest_distance=$(git rev-list --count "$main_mb"..HEAD 2>/dev/null || echo "999999")
  fi

  # check all local branches to find closer ancestor
  local branches
  branches=$(git branch --format='%(refname:short)' 2>/dev/null || echo "")
  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue
    [[ "$branch" == "$current_branch" ]] && continue
    [[ "$branch" == "$base_branch_name" ]] && continue

    local mb
    mb=$(git merge-base HEAD "$branch" 2>/dev/null || echo "")
    [[ -z "$mb" ]] && continue

    local dist
    dist=$(git rev-list --count "$mb"..HEAD 2>/dev/null || echo "999999")

    # closer ancestor found (must have commits unique to current branch)
    if [[ $dist -gt 0 && $dist -lt $closest_distance ]]; then
      closest_distance=$dist
      closest_ancestor="$branch"
    fi
  done <<< "$branches"

  echo "$closest_ancestor"
}

######################################################################
# helper: enumerate behavioral commits (fix/feat) on current branch
# accounts for stacked branches - only returns commits unique to THIS branch
# returns:
#   - "NO_COMMITS" if repo has no commits (fail fast)
#   - "NO_BASE" if no base branch found (fail fast)
#   - "ON_BASE" if current branch is the base branch (fail fast)
#   - commit subjects (one per line) if behavioral commits found
#   - empty string if no behavioral commits on branch
######################################################################
get_behavioral_commits_on_branch() {
  local ancestor
  ancestor=$(get_closest_ancestor_branch)

  # propagate fail-fast signals
  if [[ "$ancestor" == "NO_COMMITS" || "$ancestor" == "NO_BASE" || "$ancestor" == "ON_BASE" ]]; then
    echo "$ancestor"
    return 0
  fi

  # list commits on branch since closest ancestor (oldest first)
  # filter to fix: or feat: prefixed commits
  # note: grep returns exit 1 when no matches, || true prevents pipefail
  git log --reverse --format="%s" "$ancestor..HEAD" 2>/dev/null | \
    grep -E "^(fix|feat)(\([^)]+\))?:" || true
}

######################################################################
# helper: get HASH of first behavioral commit on branch
# accounts for stacked branches - only considers commits unique to THIS branch
# returns:
#   - "NO_COMMITS" if repo has no commits
#   - "NO_BASE" if no base branch found
#   - "ON_BASE" if current branch is the base branch
#   - commit hash if behavioral commit found
#   - empty string if no behavioral commits on branch
######################################################################
get_first_behavioral_commit_hash() {
  local ancestor
  ancestor=$(get_closest_ancestor_branch)

  # propagate fail-fast signals
  if [[ "$ancestor" == "NO_COMMITS" || "$ancestor" == "NO_BASE" || "$ancestor" == "ON_BASE" ]]; then
    echo "$ancestor"
    return 0
  fi

  # list commits on branch since closest ancestor (oldest first)
  # note: grep returns exit 1 when no matches, capture output to avoid pipefail
  local commits
  commits=$(git log --reverse --format="%H %s" "$ancestor..HEAD" 2>/dev/null || echo "")
  if [[ -z "$commits" ]]; then
    echo ""
    return 0
  fi

  # filter to behavioral commits and extract first hash
  # note: `grep -m1 <<<` (not `echo | grep | head`) stops grep after the first
  # match with no early pipe close, so no writer SIGPIPEs under pipefail
  local behavioral
  behavioral=$(grep -m1 -E "^[a-f0-9]+ (fix|feat)(\([^)]+\))?:" <<< "$commits" || echo "")
  if [[ -z "$behavioral" ]]; then
    echo ""
    return 0
  fi

  echo "$behavioral" | cut -d' ' -f1
}
