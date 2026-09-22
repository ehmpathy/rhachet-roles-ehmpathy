# F12 — repairs BEYOND this change's own surface are deferred

- **rework** = clean (a later round adds each; no code here hardens against their absence)
- **status** = open — best-guessed, flagged for the council
- **confidence** = 91%
- **where** = five dreams, all symlinked at `dreams/` on this route

## .the fork, stated fairly

`i004` and `i005` raised **four** asks that reach past this change's own surface, from four lanes.
they share ONE judgment — *does a repair that serves several skills ride a sponsor guard?* — so
they share one row:

| # | the ask | lane | why it reaches past |
|---|---|---|---|
| 1 | a shared **reader** for the uses meter — four bare `jq -r` callers | `mech-failhides` n.2 | `uses.local.sh` · `push.sh` · `set.sh` |
| 🔴 **1b** | a shared atomic **writer** for the uses meter — three inline heredocs | `arch-opport-decomposition` n.2 (i026) | `set.sh` (×2) · `uses.local.sh`. **added 2026-09-13 — see below** |
| 2 | a **mutex** so `set` and `del` cannot lose each other's update | `arch-hazards-behavior` n.2 | `sponsor.sh` · `bind.sh` · `uses.global.sh` |
| ~~3~~ | ~~a **pty harness**, so the `-t 0` guards are no longer dead under test~~ | `behavior-intent-coverage` · `ergo-friction-hazards` | ✅ **CLOSED at i020 — built, dogfooded, landed.** see below |
| 4 | one shared **`guard_actor_is_human`**, so 4 divergent copies converge | `enroll-impl-arch-defects` n.1 | it CHANGES BEHAVIOR in 3 extant `uses` skills |
| 🔴 **5** | a **refusal-promise audit** — every curated refusal names a command; no test walks `state → that command` | `behavior-intent-coverage` n.1 (i018) | `sponsor.sh` · `set.sh` · `uses.local.sh` · `uses.global.sh` — **four skills, three outside this wish** |
| 🔴 **6** | a shared `trap … EXIT` helper — 5 hand-rolled copies, past the rule-of-3 line | `enroll-impl-arch-defects` (i038) | `set.sh` · `uses.global.sh` · `uses.org.sh` · `sponsor.sh` · `operations.sh` — each traps a differently named local var |
| 🔴 **7** | the clone-identity backstop is one hardcoded roster entry, with no check that a second clone identity stays covered | `enroll-impl-arch-defects` (i038) | a fleet-shape question, not this wish's surface |
| 🔴 **8** | a comment condense pass — `sponsor.sh` + `operations.sh` narrate review history inline (`rule.forbid.chronological-accretion`) | `enroll-impl-arch-defects` (i038) | two files, ~1750+ and ~500+ lines; a mechanical pass, not a design fork, but sized past a single round |

each has two routes: build it now, or defer with a dream.

## 🔴 the synthesis — asks 4, 6, and 8 share ONE root cause

`enroll-impl-arch-defects` (i039) named this rather than left it implicit: asks 4 (actor-guard
convergence), 6 (the `trap EXIT` helper), and 8 (the comment condense) are three symptoms of one
cause — `operations.sh` has no bounded context, so any code a caller wants to share ends up in
that one file by default. a fix for each symptom in place (a dedup here, a helper there) raises
the cost to switch to the real fix — a split of `operations.sh` along its 5 concerns — every
round it is deferred. ⇒ if the council picks up any ONE of asks 4/6/8, a split of the file first
makes the rest cheaper, not harder; read the three as one root-cause decision, not three
independent patches.

## 🔴 asks 6–8 — added 2026-09-15 at i038, all three DEFERRED

`enroll-impl-arch-defects` found these on a direct read (the automated architecture lanes have
malfunctioned on context-overflow every round since i034, so this lane reads the implementation
by hand rather than compares against a prior verdict).

| ask | SAFE? | CLEAN? |
|---|---|---|
| 6 — trap helper | ✅ yes — a pure extraction, no caller-visible change intended | 🔴 no. each site traps a DIFFERENT local var name (`err_file`, `file_temp`, `GLOBAL_METER_FILE_TEMP`); a shared helper needs either a renamed var at all 5 sites or an indirection (`trap "rm -f \"\$$var_name\"" EXIT`) that is itself a new pattern to review |
| 7 — roster fragility | ✅ yes — no code change proposed, only a fixed instruction for the roster's next edit | 🔴 no. `Q1` already ruled no automated dispatch exists, so no second clone identity is provisioned today; a repair here would harden against a fleet shape that does not yet exist |
| 8 — comment condense | ✅ yes — text-only | 🔴 no. two large files, and a full pass risks drift of the very citations (line numbers, fulcrum refs) later `.taken` files depend on, mid-convergence |

⇒ the dreams: `dreams/v2026_09_15.fix.trap-exit-is-hand-rolled-five-times.md` ·
`dreams/v2026_09_15.fix.the-clone-identity-roster-has-no-growth-check.md` ·
`dreams/v2026_09_15.reseed.review-history-comments-narrate-instead-of-state.md`

## 🔴 ask 1b — added 2026-09-13 at i026. the row said READER and the boundary has two sides

`arch-opport-decomposition` n.2 found that the uses meter is now the **one** persist boundary in
this family left inline and non-atomic, while both neighbours gained named atomic leaves this
drive:

| state file | the read | the write |
|---|---|---|
| sponsor | `read_sponsor_state` ✅ | `set_sponsor_state` ✅ |
| org meter | `read_org_meter_bytes` ✅ | `write_org_file` ✅ |
| 🔴 uses meter | dreamed (ask 1) | 🔴 **undreamed until i026** |

⇒ 🎯 **a half-extracted boundary reads as finished**, and that is exactly how this survived
sixteen rounds: ask 1 made the uses meter look accounted for, so the write side rode along inside
a row whose title said *reader*.

⚠️ **and the harm is not only duplication.** a `cat >` **truncates first**, so a crash between the
truncate and the write leaves a **0-byte meter** — which ask 1's absent shape gate then cannot
classify. ⇒ the two halves compound, which is the argument to land them **together**.

⚠️ **it does NOT close the race** (ask 2). an atomic write makes each write whole; it does not
make the read-modify-write pair exclusive.

| | verdict |
|---|---|
| SAFE | 🔴 no — this is the write that records a spent commit. a wrong edit double-spends the quota or refuses a human's grant |
| CLEAN | 🔴 no — three sites, two files, and it should land with `read_uses_state` rather than ahead of it |

⇒ the dream: `dreams/v2026_09_13.fix.the-uses-meter-persist-is-inline-duplicated-and-non-atomic.md`

### 🔴 confirmed independently at i027, with the adjacency argument the council should read

`enroll-impl-behavior-intent` r010 found this from a different rubric one round later, priced it
identically, and cited the dream by filename. **its final recommendation is the ask:**

> *"don't block this stone on #1 — it's genuinely prior-art and out of this wish's bound — but
> **it's the one item I'd escalate to the council alongside F12**, since it's the single largest
> live gap between 'hardened' and 'not yet touched' left adjacent to the feature."*

⚠️ **and it supplies the line that makes this the council's business rather than a backlog item:**
the uses meter *"gates every commit, **including sponsor-guarded ones**"*.

⇒ 🎯 the sponsor guard's whole value is that a commit records a real human. **the meter that
decides whether that commit may happen at all is the one file in the family still unhardened.** a
corrupt meter yields no wrong sponsor — it yields a tree that cannot commit, with no message that
says why.

⇒ **two lanes, two rubrics, one round apart, same verdict: real, and out of this wish's bound.**

⇒ 🎯 **the transferable lesson, and it is the twin of ask 3's:** ask 3's deferral held five rounds
on a **false binary**; ask 1b hid sixteen rounds behind a **partial title**. both are failures of
how the row was framed rather than of its argument — so a deferral should be audited for what its
NAME excludes, never only for whether its case still holds.

## ✅ ask 3 is CLOSED — 2026-09-12 at i020, and the deferral's REASON was a false binary

built: `src/.test/spawnInPty.ts`, plus `git.commit.sponsor [case14]` (3 asserts) and
`git.commit.uses [case31]` (3 asserts). all three tty branches in the family are now live under a
real pseudo-terminal, with the `__I_AM_HUMAN` escape **disabled**.

🔴 **the deferral held for five rounds (i004, i010, i011, i016, i019) on one sentence**, quoted from
the row below verbatim:

> *"it is `optional` upstream, so a host that skips it meets a broken suite, and a skip would be
> `failhide`."*

⇒ **that is a true statement of two options and a false claim that they are the only two.** the
repo's own `rule.require.failfast` (code.test) supplies the third, by name:

> *"tests that lack required resources must fail fast, not skip silently. absent resource =
> unacceptable… it must fail loud"* — with a `ConstraintError` that carries the fix.

⇒ 🎯 **a loud refusal is neither an assumption nor a skip.** `loadPty()` throws a `ConstraintError`
that states the install command. so the hermeticity question the council was asked to rule was
**already ruled, by a rule this repo booted into every round that deferred it.**

### ⚠️ what the build then found, which no further analysis would have

| found | how |
|---|---|
| 🔴 the require was satisfied through pnpm's **hoist dir** — `node_modules/node-pty` did **not** exist | a glob, then `depcheck` flagged the import as undeclared |
| ⇒ so "already in the lock file" ≠ "reachable from our src" | the row's own re-price at i015 conflated the two |
| the fix | declared directly via `set.package.install` (audit passed, pinned), and `[case14][t2]` now asserts the module loads from **inside this repo** rather than an ancestor |

⇒ **the row's i015 re-price said "NOT a new native dependency" and it was half right**: same
version, same tree — and an *undeclared* reach that `depcheck` correctly calls a defect.

### the dogfood, all three branches

| branch | neutralized | result |
|---|---|---|
| `is_actor_human_via_all_streams` accepts a tty | dropped the three `-t` tests | `[case14][t0]` — **3 asserts red** |
| `--who @stdin` refuses with no pipe | `if false` on the `-t 0` test | `[case14][t1]` — **2 asserts red, via TIMEOUT** |
| `guard_actor_is_human_via_stdin` accepts a tty | dropped the `-t 0` test | `[case31][t0]` — **3 asserts red** |

🔴 **the middle row is the one worth the record: it is the first test in this repo that proves a
HANG.** the clamp goes red because it ran out of time rather than on a bad exit — which is exactly
the failure mode the guard exists to prevent, and the one no spawnSync test can observe.

⇒ 🎯 **the transferable lesson: a deferral that names two options should be audited for a third
before it is carried a second round.** this one was carried five, and what unblocked it was a rule
already in the boot, not new information.

### 🔴 ask 5 — added 2026-09-12 at i018, and it is the one with a PROVEN defect behind it

the other four asks are hazards this drive reasoned about. **ask 5 arrived with a live defect
attached**, which changes how the council should weigh it:

> the corrupt-sponsor render said *"run `git.commit.sponsor del`"*. `del` gated on `-f`, so on the
> one state that render fires for — a directory at the state path — it printed **"groovy, already
> clear"** and removed no entry. ⇒ the advertised repair no-opped, and the next `set` died at `mv`.

**four lanes found the defect; the coverage lane found its CAUSE:** `[case11]` tested the render,
`[case6]` tested `del` on two other states, and **no test joined them**. the promise the refusal
made was never walked.

⇒ 🎯 **so ask 5 is not "add more tests". it is: `an error message that names a command is a
coverage obligation`** — and the class has now produced one real, shipped-for-a-round defect.

| | |
|---|---|
| the instance found | ✅ **repaired and clamped this round** (`[case6][t2]`, dogfooded RED) |
| the sweep | ⚠️ **deferred** — ~6 refusal sites, 4 skills, an unbounded count of state seeds |
| SAFE | yes — new tests only |
| 🔴 CLEAN | **no** — three of the four skills are outside this wish's subject, and eleven lanes are mid-read of the diff |

### 🔴 a SECOND instance landed at i019, one round later, from the same lane

`behavior-intent-coverage` found the corrupt-sponsor **nudge** (`uses.local.sh`) said *"clear it,
then bind afresh"* and printed only `cat` and `del`. ⇒ a human who ran the shown `del` was left at a
cleared tree with **the second half of the nudge's own sentence undiscoverable.**

⚠️ **and the reason no extant assert caught it is the same one both instances share.**
`[caseSponsorNudge][t3]` already asserted the nudge names the corruption, names the file, and shows
`del` — all green. **every assert graded what the remedy SAYS; the gap was in what it SHOWS**, and an
omission is invisible to an assert written for a presence.

| | instance 1 (i018) | instance 2 (i019) |
|---|---|---|
| the promise | *"run `git.commit.sponsor del`"* | *"clear it, then bind afresh"* |
| the failure | the command **no-opped** on the one state it fired for | the bind was **never printed** |
| caught by | 4 lanes, cause found by coverage | 1 lane, coverage |
| state | ✅ repaired + clamped | ✅ repaired + clamped |

⇒ 🎯 **two proven instances is a different argument than one.** one is a defect; two in consecutive
rounds, on two different surfaces, from two different failure shapes, is a **class** — which is what
ask 5 claims and what the council is asked to weigh.

⚠️ **the dirt call is a JUDGMENT, which is why this row exists beside the dream**
(`rule.always.fix-forward-under-scouts-honor`): a reviewer could reasonably hold that a dozen
transition tests should ride along. i judged the diff growth worse than the delay, and judged it
**after** the one proven instance was already fixed. the council may overrule that.

⇒ the dream: `dreams/v2026_09_12.fix.a-refusal-that-names-a-command-is-an-untested-promise.md`

### 🔴 ask 5 NARROWED, 2026-09-12 at i022 — the two in-scope walks are BUILT

`enroll-impl-behavior-intent` r010 re-raised this as a blocker and itemized six unwalked promises,
three of them inside this wish's own subject. ⇒ **two of the three now walk end to end**, at
`git.commit.set` `[case49]`:

| walk | what it proves |
|---|---|
| `[t0]` no-sponsor refusal → `--who "Name <email>"` → commit | the **literal** bind form works. `F10` found it undiscoverable once; `[case47]` walks the piped form alone |
| `[t1]` corrupt refusal → `del` → `--who @stdin` → commit | 🔴 **`del` clears a file the reader cannot parse** — the arm that would strand a human in a loop |

🔴 **dogfooded, and the result is the argument for the whole ask.** with the parser made to refuse a
literal, and `del` made to read before it removes: **4 of 4 walk rows red, and BOTH refusal-TEXT rows
GREEN.** ⇒ the text is correct, the promise is broken, and the ~40 extant text assertions see none of
it. **a drift between a render and its parser is invisible to every test that grades one side.**

⚠️ **what REMAINS on this ask, re-graded by ROUTE rather than by scope:**

| promise | why it is still open |
|---|---|
| `sponsor get` corrupt → bind-after-corrupt | a third render of two commands already walked from two others. lowest marginal value |
| 🔴 the `@me` refusals → `gh auth login` | **CREDENTIAL-GATED, not merely deferred.** it needs a real github session the driver cannot mint ⇒ a `.taken` cannot close it, and the council or a human must |
| `uses get` corrupt-global · the actor-guard refusals | outside this wish (`uses` is a neighbour skill); the guard refusals need a pty per site |

⇒ 🎯 **the `@me` row is the one that changed in KIND.** it was filed under "deferred for diff size";
it is in fact a point **no permitted change closes** (`rule.always.raise-a-blocker-a-taken-cannot-close`).
the council should read it as an ask for a grant, never as a backlog item.

🔴 **#4 is the one that is not merely a refactor.** the three `uses` copies check stdin alone and
emit stdout alone; the sponsor's checks all three streams and emits to both. ⇒ that is a decision
about who may grant commit authority, not a tidy-up, and it is the clearest case in this row for
why the whole set belongs at a council.

### ⚠️ ask 4 — the HOST FILE grew again, 2026-09-12 at i021

`enroll-impl-arch-defects` r011 re-raised the size of the shared operations' home:

> *"`operations.sh` is a 987-line accretion of ≥5 orthogonal concerns […] Worth revisiting as a
> straight split into cohesive files (sourced from a thin aggregator)"*

🔴 **held, and the reason is ask 4 itself.** a *"thin aggregator"* every caller sources is precisely
a new `source` graph over a library that `exit 2`s from within — the hazard this ask exists to
settle. ⇒ **to split the file now would decide ask 4 by side effect**, and the wisher reserved it.

⚠️ **and the honest half, recorded rather than argued away: it grew AGAIN this round**, by the two
control-character gate lines and their note (the i021 r011 blocker). ⇒ the council sees the **trend**
and not only the count, since a deferral whose cost rises each round is a different decision from one
whose cost is flat.

### 🔴 ask 4 NARROWED AGAIN, 2026-09-12 at i019 — one half was never the council's

`repo-rules` n.1 graded the shared guard's **stdout-only emit** a live violation of
`rule.require.skill-output-streams` in the shipped tree. ⇒ re-read, and the row had **two changes
fused under one deferral**, with only one of them a permission question:

| half | verdict |
|---|---|
| the **PREDICATE** — `-t 0` alone vs the three streams `sponsor` reads | ✅ **stays with the council.** to widen it is to widen who may grant commit authority |
| the **STREAMS** — stdout-only vs both | 🔴 **REPAIRED at i019.** it grants no authority, refuses no caller it accepted, and moves no predicate |

⇒ 🎯 **the transferable error is the BUNDLE.** a deferral that names two changes lends the stronger
reason to both, and the weaker half rides along unexamined — for four rounds here. ⚠️ the tell was
available the whole time: the row's own text said *"stdout-only emit included — **which breaks**
rule.require.skill-output-streams"*, and a **live rule violation** is not the same artifact as an
**open design question**.

⚠️ **and the repair was not free, which is worth the record.** the first attempt used
`| tee /dev/stderr` — the form the rule itself names — and it broke **10 tty-guard tests**, each
`expected 2, received 1`: `/dev/stderr` must be REOPENED, fd 2 is a pipe under `spawnSync`, the open
fails, `pipefail` fails the pipeline, and `set -e` kills the skill before its `exit 2`. ⇒ a
CONSTRAINT rendered as a MALFUNCTION, by the line added to make the refusal more visible.
`emit_both` (a plain `echo` + `>&2`) is the form that holds.

🟡 **what ask 4 still owes the council is unchanged in substance** — the predicate — and `i019`
raised its stakes: this change added `source` edges at `uses.global.sh`, `uses.org.sh`, and
`uses.local.sh`, so a helper that **hard-exits** is now reachable from three more places than it was
(`arch-hazards-behavior` n.2).

### 🔴 ask 4 CORRECTED, 2026-09-12 at i015 — the direction was BACKWARDS, and it inverts the question

this row read: *"to share the **stronger** contract **tightens** the quota-grant surface — a caller
that passes today starts to be refused."* **that is the opposite of what the code does.** the two
predicates, first-party:

```bash
git.commit.operations.sh:180   [[ -t 0 || __I_AM_HUMAN ]]                  # the uses trio
git.commit.sponsor.sh:194      [[ -t 2 || -t 1 || -t 0 || __I_AM_HUMAN ]]  # sponsor
```

⇒ `-t 0 ⟹ (-t 2 || -t 1 || -t 0)`. **the sponsor guard accepts a STRICT SUPERSET — it is the
BROADER one, never the stronger one.**

🔴 **so the council's question flips, and it flips toward the more dangerous half:**

| | the question as written | the question as measured |
|---|---|---|
| direction | may we **tighten** and refuse a caller we accept today? | 🔴 may we **LOOSEN** and accept a caller we refuse today? |
| the caller | — | one with a tty on stderr or stdout, and a **pipe** on stdin |
| what is at stake | a regression for a legitimate human | 🔴 **a wider grant of commit authority** |

⚠️ **and the sponsor's breadth is load-bound rather than lax:** `--who @stdin` is the paved
dispatch form (`Q8`), so stdin is a pipe for the legitimate human. a `-t 0`-only guard on the
sponsor would refuse the very command this design paves. ⇒ **convergence, if the council rules for
it, must move `uses` toward `sponsor` — and that is a widened permission, which deserves the
council's full attention rather than the calm word "tighten".**

🟡 the cause is traceable: `git.commit.sponsor.sh:173` called its own predicate *"the STRONGER of
the two"*. this row inherited the word, and so did an i015 reviewer. **the comment is repaired;
this row is the second place the error had spread.**

### 🔴 ask 4 NARROWED, 2026-09-11 — the council now decides ONE question, not two

`i006` `enroll-impl-arch-defects` nitpick.5 measured what i003–i005 had asserted: **3 of the 4
copies carry a byte-identical predicate**; only `git.commit.sponsor.sh`'s differs in contract. so
ask 4 was two questions fused — *(a) dedupe the identical trio* and *(b) should the sponsor's
stronger contract spread to them.*

⇒ **(a) landed. it passed SAFE and CLEAN on its own**, once the trio's files were already open for
ask 4's near neighbour in the same review (the `ROLE_REPO` consolidation, `i006` n.4):

| | verdict |
|---|---|
| SAFE | ✅ the predicate, the render, and the emit stream are preserved **exactly**. 336 green, no snapshot moved, and all three sites are clamped by a non-tty spawn — so the green is not vacuous |
| CLEAN | ✅ all three files were already in this diff; `operations.sh` is the extant shared home; no new file, no new dependency |

⇒ **(b) stands, untouched and correctly so.** the shared function preserves the WEAK contract
deliberately, and its name says so: `guard_actor_is_human_via_stdin`.

🎯 **the honest name is what the extraction actually bought.** the defect was never the three
copies — it was that *"the divergence is undocumented"*, so a reader of any one copy could not
learn the others answer differently. one function, named for the mechanism it measures, fixes that
with **no behavior change at all**. ⇒ and the council's tighten is now a **one-line** edit rather
than three.

⚠️ **what the council still owes, unchanged in substance:** may the quota-grant surface be
tightened to refuse a caller it accepts today?

## .taken, and why AT THE TIME

**defer, both.** the SAFE/CLEAN test refuses each, and for different reasons — which is itself
the tell that they are one judgment rather than one defect:

| ask | SAFE? | CLEAN? |
|---|---|---|
| **1 — the reader** | 🔴 no. the uses read is the **commit gate**; a bug here stops the fleet from every commit it would make | 🔴 no. four sites, three files, two skills this change never opened |
| **2 — the mutex** | 🔴 no, and worse: a stale lock would **stop a human from a sponsor bind** — a rare lost update traded away for a reachable total outage | 🔴 no. three files, plus a portability call (`flock` is absent on a default macos) |
| ~~**3 — the pty harness**~~ | ✅ yes | ✅ **REVERSED at i020 — it was CLEAN all along.** the CLEAN verdict rested on the two-option framing struck above; with the loud-refusal route the build touches one new test file, two test cases, and one declared devDependency. no product behavior moves, and no snapshot moved. ⇒ the original prose is kept below the strike so the council can read what the error was rather than only that there was one: *"it is `optional` upstream, so a host that skips it meets a broken suite, and a skip would be `failhide`"* |
| **4 — the actor guard** | ✅ yes as an extraction — 🔴 **no as shipped**: the shared contract REFUSES callers the three `uses` skills accept today | 🔴 no. three extant skills change behavior, and their snapshots move with them |

⚠️ **ask 2's proposed remedy was also refuted on its merits** — a rename-then-unlink is a no-op
against a writer-vs-writer race, since `rm` is already atomic to a reader. only a lock closes it,
and a lock is what fails SAFE.

⚠️ **and the same lane family drew this exact bound one round earlier, in this direction.**
`arch-hazards-behavior` `i003` nitpick.1 told me NOT to widen the atomic write into the uses
meter, and graded that restraint correct:

> *"the lane notes `git.commit.set` and `git.commit.uses` write meter state the same way, and
> correctly marks that as prior art rather than this change's doing … it ripples into two skills
> this change never opened."*

⇒ 🔴 **the asymmetry that settles it: the sponsor state file is NEW, so its reader was mine to
get right. the uses meter is prior art.** i003 repaired the sponsor reader for exactly that
reason and declined the uses meter for exactly this one. to widen now would reverse a bound a
reviewer already endorsed, in the same round it endorsed it.

## .why the confidence is not higher

**9% sits on one risk**: the nitpick will very likely return next round, since the code it names
is unchanged. a reviewer that re-raises it is not wrong — it is the same true observation.

⇒ so the doubt is not that route B is the wrong call; it is that the call **reads** like an
unanswered nitpick unless the dream and this row are cited in the `.taken`. they are.

🟡 a second, smaller doubt: the lane offered *"a follow-up guard or a note"*, and a **note** at
the site would be clean. i declined it because a note at **one of four** sites is the partial
repair `arch-opport-decomposition` graded a design defect in `i003` — it would tell a reader that
site is special when all four are identical.

## .the verdict

_(awaits the council)_
