# appendix — the peer rounds, 3 through 13

**this is the ARCHAEOLOGY. the yield holds the output.**

⇒ moved out of `5.1.execution.from_vision.yield.md` at peer round 14, under
`rule.always.yield-the-output-not-the-archaeology` and `rule.forbid.chronological-accretion`. the
yield cites this file by path; every decision these rounds produced is stated there as current truth.

## 🔴 .why it moved, and why the move was forced rather than chosen

the yield had grown to **1762 lines / 106KB**, of which **1245 lines — 71% — were these eleven round
sections**. one section appended per round, each a time-ordered record of what a reviewer said and
what i did about it.

that is precisely the shape `rule.forbid.chronological-accretion` grades a **blocker**:

> *"a time-ordered log of iterations/attempts where a statement of current truth would serve"*

and the shape `rule.always.yield-the-output-not-the-archaeology` names in its reviewer tells:

> *"a yield that grew on a round where no decision changed"*

🔴 **and it stopped to be a style defect at i014: `repo-rules` died with a node heap OOM at 2GB**,
after ~924 seconds. it had last run *fresh* at i011; between i011 and i014 i appended five more round
sections, then spent budget to un-freeze the lane — and the first thing the un-frozen lane met was a
file that had grown past what it could hold.

⚠️ **the accretion was legible the whole time and i read it as diligence.** each section was true,
each recorded a real lesson, and each was added for a defensible reason. **the defect was never in a
section; it was in the sum**, and a sum is the one property no individual edit shows you.

⇒ the transferable part: **"is this the answer, or the story of the answer?"** is a question to ask
of the FILE, never of the paragraph you are about to add. every paragraph passes it on its own.

## .how to read what follows

each round records: what the reviewers raised, what was repaired or refuted, and — the half worth a
keep — the **transferable lesson** the round produced. the yield states the outcomes; this file
states how they were reached, for a reader who wants the evidence under a decision.

🟡 **the round tables are frozen at the round that wrote them.** a count in round 8's `✅ proven`
table is what was true at round 8, never a claim about the current tree. the yield's `.progress`
table is the only live tally.

---

## 🔴 .peer round 3 — the two finds that only a WIDE read could reach

nine lanes ran. one blocker (r006), eleven nitpicks across the four lanes that approved. all closed.
two are worth the yield's space because neither was reachable from the diff alone.

### 1. a wisher verdict i cited by its SYMPTOM CLASS, and it over-reached

i refuted the nudge-write failhide at **r11 §3** on the grounds that A8/F5 had ruled it out of
scope. **it had not.**

| | A8/F5 governs | this is |
|---|---|---|
| subject | the malformed **CONFIG list** — the `.jsonc` | the nudge **STATE file** |
| when it is read | **ahead of** the verdict | **after** the verdict is rendered |
| a loud failure would | change what the gate blocks ⇒ a **policy move**, barred | change no block and no permit ⇒ **safe** |

🔴 **the axis is not *"is it a failhide?"* but *"does the swallowed failure feed a verdict?"*** — and
i had sorted on the first.

⚠️ **r002 is the lane that made it undeniable, by a quote of me against myself:** i had graded *this
exact shape* "NOT a policy change" at i001 r6, when i repaired its quote-escape half. ⇒ **a verdict
cited by class over-reaches by construction** — it will always cover more than it decided. the check
is to name the verdict's **subject**, never its symptom.

repaired: both record writes are now loud (what / why / effect / fix). ⚠️ the two **stale-sweep**
writes stay quiet on purpose — a failed sweep is *work skipped* and self-heals; a failed record is
*state lost* and is permanent. the hooks carry that distinction as a `.note`, so the asymmetry
cannot read as an oversight.

### 2. 🔴 F10's escape hatch was the clause that was wrong, and nobody had weighed it

r008 refused to let the coverage gap stand as deferred. ⇒ it was **run**:

```
--scope 'path://claude.hooks'  →  14 files · 749 passed · 3 FAILED · 235s
```

| F10's claim | verdict |
|---|---|
| a 3-file scope verifies *this change* as well as a 13-file one | ✅ held — all 3 reds are in the other ten |
| those ten touch files this diff does not | ✅ held, **verified** — `git diff main --stat` is empty for all three |
| 🔴 *"CI runs the full suite green, so the gap closes automatically"* | 🔴 **backwards** |

the three reds are a jq **version** mismatch: the hooks allowlist jq's parse-error exit as `2 or 5`;
this box's jq exits `4`, so three hooks flip from **fail open** to **fail closed**.

⇒ **a green CI proves only that CI runs a different jq.** CI is the one instrument that *cannot* see
this class — so the gap was never one it would close.

⚠️ **and it was never a hang: 235s.** three misdiagnoses cost more than the wait they sought to
avoid. the three reds are out of bounds (SAFE fails hard — a security-posture flip on hooks this
wish does not own) ⇒ dreamed, and **F10 is closed**.

> 🔴 **the lesson: a deferral's escape hatch deserves the scrutiny its main argument gets.** F10's
> verification case was sound and stayed sound. the clause that was wrong is the one no reviewer and
> no driver examined — and it was wrong in the direction that made the deferral look free.

### the rest, in one table

| lane | point | close |
|---|---|---|
| r002/r006/r008/r009 | malformed **payload** silently permits, unclamped | `[case22]` / `[case18]` — a **clamp**, never a repair. the read decides whether the gate engages, so loudness there is a policy move |
| r002/r009 | raw `grep:` leaks ahead of the bad-regex message | suppress on the grep that decides, **re-derive in the error branch** — detail kept, and the extra exec is paid only on the fatal path |
| 🔴 r009 | the no-input message has **no snapshot**, only `toContain` fragments | masked full-message snapshot in both hooks. ⚠️ i wrote those fragments to satisfy `rule.require.errors-name-the-fix` — they prove a `fix:` token is present and prove naught about whether the guidance still reads |
| r004 | the settings walk is a triple loop with 3 casts | `asAllRegisteredHooks` extracted |
| 🔴 r004 | the two predicates are written twice, with shapes that diverge | `asAbsentHookPaths` + `asWrappedCommands` extracted. ⚠️ **i made this same desync argument about prod literals at r004 and then wrote the hazard into a test file in the same round** |

## 🔴 .peer round 4 — a clamp that would not go red, and what that told us

eleven lanes ran. **zero blockers**, ten nitpicks across six lanes; two lanes clean, two lanes
tallied 0/0 while they raised prose points anyway. all closed.

### 1. 🔴 the largest find of the drive came from a clamp that REFUSED to bite

r007 n2 asked the per-term walk to part grep's exit 2 from its exit 1, rather than swallow it. the
repair is four lines. to prove it bites i needed a term that breaks grep, so `[case23]` was built on
`)foo(`.

**it failed 3 of 3 — exit 0, empty stderr, the branch never reached.** the reason:

| | the pattern `\b(deploy\|)foo()\b` |
|---|---|
| intended | *"deploy"* OR *")foo("* |
| 🔴 actual | `(deploy\|)` then a literal `foo` then `()` — *(deploy or empty)*, then `foo` |

⇒ the gate now demands **`foo`**. `we deploy at dawn.` passes completely unguarded — and the
pattern **COMPILES**, so the exit-2 guard added minutes earlier is silent by construction.

> 🔴 **an exit-code check guards against a pattern that does not COMPILE. it is silent about a
> pattern that compiles into the wrong sense.**

the repair closes one half of its class and reads as though it closed both. ⇒ both halves are now
pinned — `[case23] [t0]` asserts the hole as current behavior, `[t1]` asserts the repair on the half
it owns — dreamed, and raised as fulcrum **F12**.

⚠️ **the method is the transferable part.** the `elif` was reasoned about, looked right, and would
have passed review. **construction of an input that actually reaches a branch is what disclosed that
the input i thought reached it acts otherwise entirely.**

### 2. a snapshot that passed on its first run and failed on its second

r009 asked for a whole-message snapshot of the HARDNUDGE-not-saved error. i masked the volatile
path with `split(outcome.cwd)`. it went **green** — then red on the next run:

```
146 passed, 2 failed        ← the per-run temp path had landed in the snapshot
```

`genTempDir` returns a path that resolves through a symlink; the hook derives `NUDGE_FILE` from
`$PWD`, which bash reports **already resolved**. the two strings never matched.

> ⚠️ **a mask keyed to a value the subject re-derives is a guess, and a first-run green cannot
> falsify it** — jest writes the snapshot from the same run it checks. **only a second run grades a
> new snapshot.**

re-keyed to a pattern over the output. and the clamp's own proof named the sharper case: under a
**pure reorder** of three lines, **68 of 69 assertions in that file shipped green**, with the new
snapshot the single red — r009's claim demonstrated more exactly than r009 stated it.

### 3. ⚠️ two claims of mine that a read refuted, in one round

| where | what i claimed | what the file said |
|---|---|---|
| `getMechanicRole.ts` | the stale pointer was fixed at i003 | **one of two copies** was fixed; `:64` was untouched — found by **four** lanes independently |
| the r011 `.taken` | the lane's F11 insight *"was not in F11 and belongs there"* | **F11's reason #1 is that insight**, in the same words, with the note quoted in full |

🔴 **both are the same failure: a claim graded against memory rather than against the artifact.** the
lane that caught the first wrote down the remedy offhand — *"I verified it by direct read/grep."*
⇒ **a claim repeated by four reviewers is still a claim; the grep is what makes it a fact**, and
that holds for my own prior `.taken` files above all.

### the rest, in one table

| lane | point | close |
|---|---|---|
| 🔴 r002 | the fork instrument writes **no shim** for an absent tool, so every `toEqual(0)` on it passes vacuously | fail-fast `ConstraintError`. proven at **0 passed / 28 failed** — an incomplete meter now reports no measurement at all |
| r007 | the HARDNUDGE window reads a **wall clock**; a backwards jump holds the gate open | documented in both hooks (the rule's own *document-or-eliminate*), dreamed. ⚠️ elimination would change **when** the gate re-blocks ⇒ barred by acceptance #3 |
| r001/r010 | the coconut-hints carve-out was never written down | `🟡 .note` in both hooks, beside the stream carve-out it mirrors. ⚠️ **both lanes also found it had gone unanswered since i002** — the gate counts reviewers, this rule counts points |
| r008 | two list items numbered `10` in the vision yield | renumbered. this route's `.taken` files cite items by number, so it is a broken reference rather than a cosmetic one |
| r011 | the per-term asymmetry should be *decided*, not left silent | the divergence is now deliberate **and documented**: the SIZE of the hole sets the policy, never the class of the error |
| r011 | *"a stone is never edited post-approval, per this route's own convention"* | **[REFUTE]** — a grep finds no such line in any file of this route, and r010 graded the same staleness a blocker |

## 🔴 .peer round 5 — two lanes claimed the same defect, and only one of them had it

nine lanes ran. **4 blockers across two lanes** (r001 ×1, r007 ×2 — the fourth was the tally's own
count of a malformed verdict), 7 nitpicks, seven lanes approved.

### 1. 🔴 the round's method: i refused to reason about either blocker

r001 and r007 raised what reads as one class in one file — *a malformed record in the human-edited
`terms.blocklist.jsonc` kills the single collapsed `jq`, so the whole gate opens*. the arguments are
near-identical. they disagree only about **which field** carries it.

⚠️ **the temptation was to accept both and guard both fields.** instead i wrote each as a fixture
and ran it:

| lane | the fixture | measured |
|---|---|---|
| r001 | `{ "why": "x" }` — an **absent** `term` | ✅ **green, un-repaired.** `jq`'s `join` renders `null` as `""` — it does not abort |
| 🔴 r007 | `"alt": "use"` — a **string** where an array is owed | 🔴 **red 2/2.** `"use" \| join(", ")` aborts the program |

> 🔴 **the difference is PRESENCE versus TYPE, and no amount of argument would have sorted them.**
> `//` defaults a null; it passes a wrong type straight through untouched.

⇒ the repair is `strings` + `try/catch`, never another `//`. **a presence check is the wrong
instrument for a human-edited file** — it enumerates one way to be wrong out of many.

✅ **and the refutation is now a passing clamp** (`[case24]`), never a paragraph. had i reasoned, i
would have shipped a guard for a defect that does not exist — and `// ""` would have **preserved**
one that does: it keeps a null term as an empty alternative, `\b(|deploy)\b`, which matches at every
word boundary.

### 2. 🔴 the sharpest defect of the drive: `set -e` in a `then` branch

r007 b1. the loud-warn restructure i wrote **for an earlier reviewer** reads
`if jq …; then mv …; else <warn> fi`. under `set -euo pipefail` a failed **standalone** command in a
`then` branch exits the shell with its own status — so a failed `mv` kills the hook at **status 1**,
before the block message and before `exit 2`.

**claude code reads non-2 as NOT BLOCKED.** ⇒ a forbidden term lands, silently, on precisely the
*"or the write failed"* branch whose message advertises the failure.

`[case26]` / `[case19]`, written first, measured worse than the reviewer predicted:

```
Expected: 2      Received: 1
Expected: "BLOCKED"
Received: "mv: cannot move '/tmp/tmp.AAKndUHgY5' to '…/.claude/…json': Permission denied"
```

⚠️ **both chmods in the clamp carry weight** — `rename()` needs write on the **dir**, the
cross-device copy fallback needs write on the **dest file**. close one and `mv` still succeeds and
the clamp goes green for the wrong reason. a clamp reasoned about rather than run would have had
exactly one.

the repair moves the `mv` **into the `if` condition**, where `set -e` does not apply:

```bash
if ! { jq … > "$TMP_FILE" 2>/dev/null && mv "$TMP_FILE" "$NUDGE_FILE" 2>/dev/null; }; then
```

🔴 **and the line one above it was correct the whole time.** the stale sweep uses
`jq … && mv … || rm -f …` — a `&&`/`||` list, immune to `set -e`. r006 n2 flagged that quiet line as
the silent-swallow smell in the same round. ⇒ **the quiet line was safe and the loud one was
broken**, which is the opposite of what both the rule and the intuition predict.

### 3. ⚠️ both blockers were authored by repairs made for EARLIER reviewers

| the defect | the repair that authored it | the reviewer who asked for that repair |
|---|---|---|
| `mv` fail-open under `set -e` | the loud-warn restructure | a `rule.forbid.failhide` point |
| one bad record kills nine terms | the collapsed single `jq` | the fork budget, acceptance #1 |

> 🔴 **a repair for one rule opened a hole in another, twice in one file.**

that is not an argument against either rule. it is the argument for a lane that grades **the diff
against the behavior it replaces** — the only instrument that finds this class, since neither defect
existed in the code the diff replaced and no read of that code could disclose them.

### the rest, in one table

| lane | point | close |
|---|---|---|
| 🔴 r009 | the SKIPPED diagnostic is the one authored message left on **fragments**, never a snapshot | snapped. **proven by the GREEN count**: with the `why:` line deleted, **75 of 76 assertions shipped green** — all four `toContain`s among them. the snapshot was the single red |
| r003 | the wrapper tell is restated inline in the unit test, so it lives in two files with no test able to observe drift | extracted to `asWrappedCommands.ts`; both call sites import it. ⚠️ **half refuted** — the `.sh` *shape* check and `asAbsentHookPaths`'s *existence* check are different assertions, and a unit test is barred from the second |
| r004 | the density rank table is split by prose; a renderer closes it at the first blank line, so rows 6–8 render as stray lines | rows rejoined, notes moved below. 🔴 **the doc's own note warns that hand-maintained derivations drift — and the table one screen above it had drifted positionally** |
| r008 | `case=7`'s bdd baseline says *"~15% of the box"* while its own narrative corrects that to one core | now *"~15% of one core (~3.75% of the box)"*. **the second correction of this figure in one drive** — A6 fixed the narrative at r3 and left the assertion beside it |
| r008 | the vision still promises the *"clock read early"* design that did not ship | corrected in `1.vision.yield.md` and `case=3`, **with the two narrative paragraphs kept verbatim** — a rejection only reads against the proposal it replaced. the arithmetic: the early read costs the CLEAN path a `sha256` + a nudge read, and the clean path is nearly every path |
| r001 | the fork-shim interpolates `tallyFile` and `realPath` unquoted; a path with a space silently breaks the tally | both quoted. ⚠️ **no clamp** — the failure needs a space in `$TMPDIR`, unreachable on this box, and a clamp i cannot watch fail is a guess. quoted out of existence instead (`rule.prefer.prevent-over-correct`, rung 1) |
| r006 | the alternation-corruption class is still open | **deferred on record** — pinned at `[case23] [t0]`, fulcrum **F12**, dreamed. the closure is a per-term compile check = N execs on the clean path ⇒ breaches acceptance #1. the reviewer read the record and graded it nitpick for that reason |
| r006 | the stale sweep still swallows every jq failure silently | **no edit owed** — the reviewer graded its own point informational and cited the `.note` that answers it. a loud sweep would print a second report of one root cause |
| r002 · r005 | — | ✅ **0 blockers, 0 nitpicks** |

## 🔴 .peer round 6 — a reviewer escalated a nitpick to a blocker, and was right to

nine lanes ran. **4 blockers → 1**; r007 (2 blockers at i005) approved outright, r001 approved. the
one rejection was **r006**, which had raised the same point as a *nitpick* one round earlier.

### 🔴 the escalation was the correct instrument, and the re-grade was earned

at i005 r006 flagged the alternation-corruption class and graded it **nitpick**, explicitly because
*"the deferral is on-record, pinned, and dreamed … rather than re-litigate a reserved call."* i
answered with the deferral's argument and it held the round.

at i006 the same lane graded it **blocker** and named the fix:

> "The cheap fix (a repo test asserting every term compiles standalone, **zero runtime cost**) is
> documented in the dream and should land."

⚠️ **that sentence refutes the argument i had answered it with.** my i005 `.taken` read *"the
closure is a per-term compile check = N execs on the clean path ⇒ breaches acceptance #1"* — which
is true of a check **inside the hook** and false of a **ci test**. 🔴 **and my own F12 entry had the
distinction right, on disk, days earlier:** *"zero runtime cost; the hook never runs it."*

⇒ **i argued a reviewer down with arithmetic my own fulcrum refutes.** the lane could not see F12's
text; it re-derived the correct arithmetic from the code and escalated.

### 🔴 the deferral's real reason was a prediction, and the measurement took one minute

stripped of the bad arithmetic, F12 rested on one conditional: *"a term that failed the assertion
would oblige a policy edit to the artifact acceptance #2 freezes."* the row even priced it —
**confidence 86%**, where the 14% was *"the wisher grades this obviously-take."*

**so i ran it. all nine live terms pass.** no failure, no policy edit, no wisher call taken out of
anyone's hands — the single reason the row existed.

> 🔴 **the 14% WAS the measurement, and a measurement is not a probability.** a fulcrum that reserves
> a call on *"what if the test fails"* can usually just run the test. when it can, **the row is not a
> fulcrum at all.**

### ✅ what landed — `[case27]`, and the clamp corrected me a second time

the invariant asserted is the one that matters, and it is **not** a compile check:

> **every term must still match ITSELF when read through the joined alternation.**

a compile check catches the term that does not compile; it is silent about the term that compiles
into the **wrong sense** — which is the entire hole, and why the Q11 exit-code guard cannot see it.

🔴 **and `[t1]`, the clamp's own clamp, failed on its first draft.** i asserted that both `deploy`
and `)foo(` would be reported lost. measured:

```
Expected value: ")foo("
Received array: ["deploy"]
```

`\b(deploy|)foo()\b` demands the literal `foo` — and `)foo(` **contains** `foo`, so the corrupt term
matches by coincidence, through a pattern that means otherwise entirely.

> ⚠️ **a corrupt term can read as guarded while every neighbour it corrupts is not.** the loss is
> never where you look for it, which is exactly why the predicate grades **every** term rather than
> the suspicious one.

⇒ `[t0]` pins the live list (9/9 pass, plus a non-vacuity assertion), `[t1]` proves the predicate
bites. **162/162 green.** F12 closed, the dream **TAKEN**, and `[case23] [t0]` left untouched — it
pins the hook's end-to-end behavior under a corrupt list, while `[case27]` stops the live list from
ever getting there. the two are complements.

### the rest, in one table

| lane | point | close |
|---|---|---|
| r006 n1 · n2 | the malformed-**config** and malformed-**payload** failhides | **no edit owed, and the reviewer says so**: both are ruled out of scope by the wisher (A8/F5) and pinned by `[case16]`/`[case22]`/`[case18]`. flagged *"only so the record stays explicit that these remain ruled-in behavior rather than an oversight"* |
| r001 · r003 · r004 · r007 · r008 | 1–3 nitpicks each, all lanes **approved** | carried into this round's edits where they landed; none blocks |
| r002 · r005 · r009 | — | ✅ **0 blockers, 0 nitpicks** |

## 🔴 .peer round 7 — zero blockers, and the deferred nitpicks came due all at once

eleven lanes ran. **blockers 0 across every one**, l3 included — the first round with naught to
refute. the judge failed on a different axis: **21 nitpicks against a threshold of 7**.

### 🔴 fifteen reported nitpicks were FIVE fixes, and every one was SAFE and CLEAN at i006

| # | the ask | lanes that raised it |
|---|---|---|
| A | the `PT5S` timeout fails OPEN, undocumented | r001n4 · r002n1 · r006n1 · r007n1 · r008n1 — **5** |
| B | the ported-path shape check reads inline | r001n2 · r003n1 · r004n2 — **3** |
| C | the author literal and the bash-prefix strip are each duplicated | r001n3 · r004n1 · r004n3 · r007n2 — **4** |
| D | `foo` / `alpha` / `beta` / `gamma` where themed fixtures read as clearly | r001n1 · r008n2 — **2** |
| E | `asAllRegisteredHooks` re-asserts its shape with inline `as` casts | r006n2 — **1** |

⇒ **five fixes, fifteen reports.** each fix touches test or support code only, and each landed in
a file this drive already had open. ⚠️ **all five were equally cheap two rounds ago.**

### 🔴 the defect is mine, and the rule already names it

across i006 and i007 i answered every **blocker** and left the **nitpicks** silent. that felt like
triage. it is not:

> **a nitpick with no `.taken` does not decay. it is re-derived from the code by every lane that
> can see it, every round, at full cost to each.**

r008 states it plainly — *"raised by peer i007-r010/r011 with no taken response in the record;
still unaddressed"* — and r003 had raised its one point at i005, i006, and again here. **three
raises is the lane at work and the driver silent.**

⇒ `rule.always.fix-forward-under-scouts-honor` grades a small, safe, clean fix seen and deferred a
**blocker**, and gives the reason: *"you already paid to understand it."* i paid three times, and
each deferral was re-billed across seven reviewers.

⚠️ **the shape generalizes past this route.** `…via-a-taken-per-point` says every point owes a
`.taken`, and the entrance gate enforces it only for **reviewers with blockers**. so the gate has
naught to say about an unanswered nitpick — and a driver who reads the gate as the contract will
do exactly what i did, round after round, while the count climbs.

### ✅ what landed

| fix | where |
|---|---|
| **A** | `🟡 .note` in both hook headers **and** beside the two registrations in `getMechanicRole.ts`, plus `.dream/v2026_09_12.fix.pt5s-hook-timeout-fails-open.md` |
| **B** | `asMalformedHookPaths.ts` — the ported-tree `.sh` shape, named |
| **C** | `asBashInvokedPaths.ts` (cross-file leaf) · `asMechanicHooks` (local to its file) |
| **D** | `kook(swell` · `)swell(` · `reef`/`shore`/`point`; both snapshots re-recorded |
| **E** | a declared `SettingsHookTree`, narrowed once at the parameter — **zero `as` casts**, and the body got shorter |

### 🔴 the timeout was invisible from BOTH files, which is why seven rounds missed it

three failhides of the **identical mechanism** — a non-2 exit that reads as a permit — were found
and repaired in this drive: the alternation collapse, the nudge write, the `mv`-in-`if` guard. the
fourth is `timeout: 'PT5S'`, and it survived because it is **configured in one file and suffered
in another**:

| a reader of… | sees |
|---|---|
| `blocklist.sh` / `gerunds.sh` | every `exit 2` path, every guard, and **no timeout at all** |
| `getMechanicRole.ts` | a number in a field beside 13 peers, with no statement of what expiry means |

⚠️ **and the wish's own premise is the trigger.** the clean path fell to ~5 execs and holds three
orders of headroom; the **tripped** path still forks ~25, and A1 records a measured ~40% trip rate.
⇒ **the fork trim MOVED this hazard. it did not remove it** — a sentence a reader of this yield
would not otherwise reach, so it is now in both hooks and in the dream.

⇒ documented rather than eliminated: to drop the timeout trades a rare silent permit for a certain
total stall on deadlock, and to raise it moves the bound while it keeps the class. **the real fix
is upstream** — claude code must part *expired* from *permitted*. ⚠️ **no fulcrum is owed**: a
fulcrum reserves a call for the council, and there is no alternative here for anyone to overrule.

### 🔴 two refusals inside the takes, both to protect a clamp from a false green

| the ask | the answer |
|---|---|
| *"ideally a clamp on the tripped path's latency"* (r008) | 🟡 **shape recorded in the dream, not landed.** a wall-clock assertion is the instrument this drive already refused at `[case6]` — it flakes on a busy grove, which is the only condition that matters. it would be **green on a quiet ci box** and read as evidence the hazard is bounded. the exec ratchet clamps the **cause**; the effect is documented rather than measured dishonestly |
| *"rename `deploy` too"* (r008n2) | ⚠️ **[REFUTE].** `foo` is a metasyntactic stand-in the rule names explicitly; `deploy` is an english verb a real blocklist would plausibly hold. the reviewer's own stated harm — *"a maintainer must decode generic tokens"* — is real for `foo` and absent for `deploy`. ~20 sites plus two snapshots of churn, against a rule that does not reach it |

### 🔴 the themed rename was not a rename — it had to preserve a regex property

`[case23]` and `[case27] [t1]` both turn on **paren balance through the template**:

```
\b(${alternation})\b   with alternation = deploy|)swell(
  ⇒ \b(deploy|)swell()\b   ← `(deploy|)` · `swell` · `()` — BALANCED, so it COMPILES
```

that balance **is the hole**: a term that compiles into the *wrong sense* is invisible to the Q11
guard, which only sees one that fails to compile. a themed word with a different paren shape —
`swell)(` — would make the pattern fail to compile, the guard would fire, and `[case23] [t0]` would
flip from *"the hole, pinned"* to *"the guard works"*.

⚠️ ⇒ **the case would go GREEN while it proved the opposite of its own name.** so the replacement
holds the shape `)<word>(`, and `)swell(` still **contains** `swell`, which preserves the
coincidence-match `[case27] [t1]` records.

### 🔴 and the extraction disclosed a divergence nobody had named

the two "duplicated" front halves were **not** byte-identical:

| | `asAbsentHookPaths` | the shape check |
|---|---|---|
| after the strip | `.split(/\s+/)[0]!` | the whole remainder |

no command in the role carries args, so the two agree on every input that exists — **no test could
tell them apart**. but the shape regex ends at `\.sh$`, so the un-split form was an accidental
*no-args* assertion smuggled inside a *path-shape* one.

⇒ unified on the split form, with the reason in the leaf's `.note`. ⚠️ **a duplication is rarely
still an exact copy by the time a reviewer names it** — and two rounds of deferral is what let this
one drift.

### ⚠️ why the rule of three does not govern the two extractions

`rule.prefer.wet-over-dry` prices a **wrong abstraction**. it does not price a shared invariant
whose divergence **no test can observe** — and this is one: both path assertions filter on `bash `,
so a command that stops to match is dropped from **both** and each passes **vacuously** over a
smaller set. a desync would not turn a test red; it would turn two tests **hollow**, the same
`[case2]` vacuity shape this drive already repaired once.

⇒ and this drive set the precedent itself at i005, when it extracted `asWrappedCommands` at exactly
two call sites for exactly this reason. r007 quoted that note back at me, on a predicate of the
identical class at the identical count.

### ✅ proven

| | |
|---|---|
| all three forbid-terms suites | ✅ **162 passed, 0 failed** |
| `getMechanicRole.test.ts` | ✅ 16 passed |
| `getMechanicRole.hooks-reachable.integration.test.ts` | ✅ 6 passed |
| types · lint · format | ✅ clean |

## 🔴 .peer round 8 — the nitpick count fell 15 → 7, and every survivor was a MISS of the prior fix

**0 blockers again.** the same nine lanes that had raised 15 nitpicks raised **7**, and all seven
landed in the round they were raised rather than the round after.

| lane | i008 | i009 |
|---|---|---|
| r001 repo-rules | 4 | 1 |
| r002 mech-failhides | 1 | ✅ 0 |
| r003 mech-decode-friction | 1 | 2 |
| r004 arch-opport-decomposition | 3 | 1 |
| r005 arch-smell-scopeleaks | 0 | ✅ 0 |
| r006 arch-hazards-maintenance | 2 | 1 |
| r007 arch-hazards-behavior | 2 | 1 |
| r008 behavior-intent-coverage | 2 | ✅ 0 |
| r009 ergo-friction-hazards | 0 | 1 |
| | **15** | **7** |

### 🔴 not one of the seven is a new class — each is a site the i008 fix did not reach

| lane | the point | how it hid from the i008 pass |
|---|---|---|
| r004 | the two-shapes regex restates the ported-path prefix a **third** time | it looked like a *kind* test, so its shape half was invisible |
| r003n1 | the `bash ` tell re-derived in the multi-event-key control | it needs `entry.event`, so the **path** extractor did not fit it |
| r003n2 | `[case27]`'s four-stage comment-strip pipeline | a *fixture*, not an assertion — read as setup rather than logic |
| r007 | the malformed-**payload** permit has no `.note` | the i008 pass documented **three** peer hazards and skipped the fourth |
| r001 | `case=3`'s pins table still claims the retry is cheap | the **third** copy of a claim refuted at i005; two were corrected |
| r006 | the fork tally accumulates by mutation | a `const` in front of a mutated object reads as a guarantee |
| 🔴 r009 | `[case15]`/`[case18]` block messages still on fragments | the i008 pass snapped **four** message variants and left two |

⇒ **six of the seven are the same meta-failure: a fix applied at the point of contact rather than
swept across its class.** and each skip was locally reasonable at the time, which is what makes the
pattern worth a name rather than an apology.

### 🔴 r009 is the sharpest instance, because that lane returned CLEAN at i008

| | |
|---|---|
| i008 | the snapshot sweep landed — `[case10]`, `[case11]`, `[case21]`, `[case23]`. **r009 returned 0 nitpicks** |
| i009 | r009 raised the two variants that same sweep skipped |

⚠️ **the sweep is what made its own remainder legible.** four variants rendered whole made the two
left on `toContain` conspicuous — the identical mechanism as r007's `.note` gap, reached from the
opposite direction.

🔴 ⇒ **a lane that returns 0 is not evidence its class is closed.** it is evidence the class was
not yet legible. so a partial sweep does not merely under-deliver — it raises the *next* round's
floor, and the count falls more slowly than the work done would predict.

### 🔴 two of them INVERT the signal, which is worse than a plain omission

| | |
|---|---|
| **r007** | at i008 the PT5S note landed beside three peer hazards. the fourth — the payload permit — then read as *"nobody thought about this"* rather than *"the wisher ruled on it."* ⚠️ **a partial documentation sweep does not half-help; it makes whatever it skips look like an oversight** |
| **r001** | the i005 refutation was applied to the narrative and the yield, and the **pins table** kept the refuted claim. a pins table is the most-scanned and least-re-read part of a case file ⇒ a reader who checks the table reaches the un-corrected claim |

⇒ the transferable rule: **when a claim is refuted or a hazard is documented, the move is a grep
for the class — never an edit at the site where it was raised.**

### ✅ what landed

| fix | shape |
|---|---|
| `isBashInvokedCommand.ts` | the `bash ` tell as its own leaf — **three** consumers now, so the rule of three is met on its own terms rather than argued past |
| the two-shapes assertion | split into *"which kind?"* + *"which shape?"*, and 🔴 **the pair is STRICTLY STRONGER** — the full `…\.sh$` shape implies the prefix the old regex tested |
| `asLiveBlocklistTerms()` | the `.jsonc` comment-strip, named; and the shape declared **once** rather than re-asserted on a callback param |
| the payload `🟡 .note` | in **both** hooks — and the gerunds one carries the extra fact that this is that hook's SECOND and last fail-open, since its config read fails **closed** |
| `case=3`'s pin | now names `RETRY_RATCHET < TRIPPED_RATCHET`, `[case5]` — an assertion a reader can check, rather than a claim no test makes |
| the fork tally | a `reduce`, so the accumulator's type is declared at the fold and the `const` means what it says |
| 🔴 two whole-message snapshots | `[case15][t1]` + `[case18][t0]` — and the render they pinned is one **no reader would have guessed**: the degraded detail is `why: ` / `alt: `, **empty labels each followed by one space**, so the three plausible regressions (a `root cause unknown` filler, both lines dropped, one of the two dropped) each shipped green under the fragment |

### ⚠️ the tally fix matters more than its verdict suggests

`byTool` is part of the wish's **instrument**, never its subject. acceptance #6 asks the fork count
be *"clamped by a test, not merely reported once"*, and every ratchet in this drive reads its number
through that fold. ⇒ a defect there does not fail loudly — it yields a **plausible wrong count**,
and the clamp then guards the wrong budget while it stays green.

🔴 **that is the third instance of one class this round**: `[case2]`'s vacuity, the shared-leaf
desync, and now the tally. **an instrument that lies reads exactly like an instrument that works**,
and every one of the three was found by a reviewer rather than by a test.

### 🔴 and the hooks caught a blocklisted term in the wish's own diff

a jsdoc header in `asBashInvokedPaths` used a live blocklist term where *"executable"* belonged.
the blocklist hook refused the very edit that touched the file. ⇒ **the gate this wish exists to
make cheap, at work on the wish's own code** — and it cost ~5 execs to say so.

### ✅ proven

| | |
|---|---|
| all three forbid-terms suites | ✅ **164 passed, 0 failed** |
| `getMechanicRole.hooks-reachable.integration.test.ts` | ✅ 6 passed |
| `getMechanicRole.test.ts` | ✅ 16 passed |
| 🔴 the two new snapshots | ✅ **graded on a SECOND run** — jest writes a new snapshot on the run that first checks it, so a green first run is no evidence at all. run 2: 82 passed, 0 written |
| types · lint · format | ✅ clean |

## 🔴 .peer round 9 — the count ROSE 7 → 14 while the defect surface shrank, and the cause was a sweep that closed too early

**0 blockers across all eleven lanes**, and the judge blocked anyway: `nitpicks exceed threshold
(14 > 7)`. the number went the wrong way on a round where every i009 point had landed.

| lane | i009 | i010 |
|---|---|---|
| r001 repo-rules | 1 | ✅ 0 |
| r002 mech-failhides | 0 | ✅ 0 |
| r003 mech-decode-friction | 2 | ✅ 0 |
| r004 arch-opport-decomposition | 1 | ✅ 0 |
| r005 arch-smell-scopeleaks | 0 | ✅ 0 |
| r006 arch-hazards-maintenance | 1 | 1 |
| r007 arch-hazards-behavior | 1 | 1 |
| r008 behavior-intent-coverage | 0 | 2 |
| r009 ergo-friction-hazards | 1 | 1 |
| 🔴 r010 enroll-impl-behavior-intent (l3) | — | **5** |
| 🔴 r011 enroll-impl-arch-defects (l3) | — | **4** |
| | **7** | **14** |

### 🔴 the root cause is a process defect, and r010 stated it in its first sentence

> *"**no `.taken.by_self` responses exist yet.** so 'the current implementation' is mid-review, not a
> settled artifact."*

the i009 `.taken` sweep ran when the **l1** lanes finished. the **l3** lanes — r010 and r011 — take
450–780s against l1's 45–120s, so they landed **after** the sweep and the stone was re-arrived with
two lanes unanswered.

⇒ **a review round is not done when the fast lanes are done.** ⚠️ and the miss is systematic rather
than careless: a sweep timed by "the reviews I can see" will miss the slowest lane every single
round, and the slowest lanes are the deepest ones.

### 🔴 the price of one unanswered nitpick, measured

this drive predicted the mechanism one round earlier and then paid it:

> *"a nitpick with no `.taken` does not decay — it is re-derived from the code by every lane that can
> see it, every round, at full cost to each."*

| | |
|---|---|
| the unanswered point | i009-r010's shadowed gerund arms |
| re-derived at i010 by | **r006 · r009 · r010 §1** — three lanes, three independent full reads |
| total raises across the trail | **five** (i007-r010, i009-r010, i010-r006, i010-r009, i010-r010) |
| what closed it | **one dream file** |

🔴 **and r010 found the sharper half**: the i009 reviewer had asked a direct question — *"want me to
write these two up as `.dream/` entries… or leave them purely as review notes?"* — and got no reply.
**an unanswered question does not read as a deferral; it reads as an absence**, so each later lane
re-opened it from zero.

### ⚠️ 14 raises, 8 distinct points — and three points account for seven of them

| the point | raised by | what it cost to close |
|---|---|---|
| 🔴 shadowed gerund arms | r006, r009, r010 §1 | one dream file |
| the empty-string term | r007, r010 §2 | one test case — **which refuted the claim** |
| the `case=4`/`case=8` cache drift | r008 n1, r010 §3 | four corrected paragraphs |
| `case=3`'s stale lines + sweep claim | r008 n2 | two corrections |
| the duplicated test harness | r011 | four extracted leaves |
| the `TALLIED` closure gap | r011 | one cross-check case |
| the `author` positive control | r011 | one assertion |
| the `dist/` leaves with no consumer | r011 | a documented boundary, no code |

⇒ **the count measures raises, never defects.** a reader who sees 7 → 14 concludes the work
regressed; the surface it grades went the other way.

### 🔴 a peer claim was REFUTED by measurement, and our own hook comment had already repeated it

two lanes (r007, r010 §2) predicted that an empty-string term in the blocklist would turn the gate
into an unconditional block: `\b(deploy|)\b` matches at every word boundary ⇒ every write refused.

**measured as `[case28]`, and it does not:**

| | predicted | ✅ measured |
|---|---|---|
| a clean write | exit 2, always | **exit 0**, `stderr` empty |
| `we deploy at dawn.` | exit 2, an empty term named | exit 2, **`deploy` alone** |

the reason is a grep fact no source read discloses: **an empty ERE alternative resolves as one that
never matches, and returns status 1 — no match — rather than 2.** the per-term walk's `\b\b` is the
identical shape one level down ⇒ **inert at both stages.**

🔴 **the uncomfortable half: the hook's own `.note` had documented the prediction.** it was written
from two lanes' argument, ahead of any test. ⇒ **a comment that encodes an untested peer claim is
worse than no comment** — it carries a reviewer's authority and none of a test's evidence, and the
next reader has no way to tell the two apart. corrected to the measured behavior, with the grep fact
attached.

⚠️ **and r010's coverage half was right even though its behavior half was not.** *"`[case24]` tests
an absent `term` field, which is a different code path than an explicit `""`"* — true, and it is why
`[case28]` exists at all. **a wrong prediction that names a real gap is worth more than a correct
one that names none.**

### 🔴 the hook disclosed a defect class a source read had correctly reported as empty

the shadowed-arm dream's own write was refused by the gerunds hook, and the refusal returned:

```
⛔ rebinding → consider: bind, bound, binder
```

`rebinding` has **no `*rebinding*` arm** — a grep for a fourth dead arm returns none, correctly. it
is the *other* half of the shape: a word with no arm of its own, absorbed by a broader glob.

| the frame | what it predicts | what a run found |
|---|---|---|
| "three dead arms" | three, fixable by a reorder | ✅ the three |
| 🔴 **"a glob table with no exact-match discipline"** | any word a broader glob contains gets the wrong advice, arm or no arm | ✅ **`rebinding`, which has no arm at all** |

⇒ **a reorder repairs three and leaves that half exactly as wrong.** the dream records an
exact-match associative array as the remedy, with that reason attached rather than as a preference.

⚠️ **and the repair is forbidden here regardless of cost.** acceptance #4 requires *"the same
per-term alternatives"*, and the `→ consider:` text **is** the per-term alternative. ⇒ *"zero cost,
just reorder"* is right about the effort and wrong about the permission.

### 🔴 a fail-open was found INSIDE the repair for the same fail-open

r010 (i009) raised an `rm -f` at the end of an AND-OR list under `set -euo pipefail`. the search for
it found a second site — one line inside the `if` **body** of the `[case19]`/`[case26]` repair:

```bash
if ! { jq … && mv "$TMP_FILE" "$NUDGE_FILE" 2>/dev/null; }; then
  rm -f "$TMP_FILE"        # ← an `if` BODY is NOT set -e-exempt
```

an `if` **condition** is exempt; an `if` **body** is not. ⇒ the repair that moved the `mv` into the
condition *precisely to stay `set -e`-safe* left an unguarded `rm -f` one line inside the body it
guards — **on the very path that exists to reach `exit 2`.**

🔴 **and the sweep now runs on the BLOCK branch**, so an abort there returns a non-2 status, which
claude code reads as **NOT BLOCKED**. a failed cleanup of a temp file would have **permitted a
forbidden term.** four sites guarded, two per hook, each with a `.note` for why `|| true` carries
real weight rather than clutter.

⚠️ **the lane graded it negligible and hedged it well** — *"flagging only because it's structurally
the same class three rounds were spent fixing."* that hedge was the correct instinct: it is
negligible in **likelihood** (`rm -f` needs an unwritable TMPDIR) and not in **kind**, and the cost
to close it was one token per site.

### ✅ what landed

| fix | shape |
|---|---|
| the shadowed-arm dream | `.dream/v2026_09_12.fix.gerund-suggestion-table-shadowed-case-arms.md`, symlinked at the route — with the `rebinding` class and the acceptance-#4 bar both recorded |
| four `\|\| true` guards | two per hook; the fork budget is unmoved, since `true` is a bash builtin and adds no exec |
| `[case28]` | the empty-term behavior pinned in **both** directions, with a whole-message snapshot so the *absence* of an empty-term line is reviewable rather than asserted |
| 🔴 `[case6]` — the `TALLIED` closure | scans both hook sources against a ~47-tool catalog; every command found must be TALLIED. **plus a control on itself** — `toContain('jq')` forbids a regex that matched naught from a closure that passes on an empty set |
| the `author` positive control | reachability 6 → **7 passed**. the hazard was not live (`events.size > 1` catches it today) — it was **unowned**, so an edit to that walk would have retired it with no sign |
| four extracted test leaves | `asWriteJson` · `asEditJson` · `genHookTempCwd` · `runHookIn`. 🔴 `nudgeFileName` is **required**, never defaulted: a default would let a caller weld the two nudge clocks together in silence, which `case=2` forbids |
| `case=4` · `case=8` · `case=3` | every drifted claim corrected or struck; the rejected cache **marked**, never deleted, so F3's arithmetic survives |

### 🔴 the "instrument that lies" class, hit for the fourth and fifth time

| # | the instrument | how it lied |
|---|---|---|
| 1 | `[case2]` | passed vacuously on an empty set |
| 2 | the shared leaf | two copies could desync with no test to notice |
| 3 | the fork tally | a mutated `const` yielded a plausible wrong count |
| 🔴 4 | `TALLIED` | a new tool runs unshimmed ⇒ every ratchet stays green while forks return |
| 🔴 5 | the `author` filter | a drifted stamp ⇒ `[]` ⇒ every downstream assertion passes on naught |

⚠️ **all five were found by a reviewer, never by a test** — which is the property that makes the
class worth a name. an instrument that reports green when it measures naught is indistinguishable,
from the inside, from one that works.

### 🔴 the constraint that bounded a REJECTED design still binds

`genHookTempCwd`'s required `nudgeFileName` exists because `case=2` demands two separate nudge
clocks — a constraint derived while the **merge** was on the table, and the merge was rejected.

⇒ **a constraint discovered under one design does not belong to that design.** it was derived from
the behavior, and the behavior did not change when the plan did. the same trap the vision flagged in
its own yield, met here for real in a test helper nobody would have graded as risky.

### ✅ proven

| | |
|---|---|
| all three forbid-terms suites | ✅ **169 passed** (was 164 — `[case6]` ×2, `[case28]` ×3) |
| reachability | ✅ **7 passed** (was 6 — the author control) |
| unit | ✅ 19 passed |
| `[case19]` / `[case26]` | ✅ unchanged by the four `\|\| true` guards |
| the fork budget | ✅ unchanged — `true` is a builtin, so no exec is added |
| `[case6]` bites | ✅ red under a staged `TALLIED` regression, green on restore |
| the harness extraction | ✅ verdict-neutral: every extant case green, no snapshot moved |
| types · lint · format | ✅ clean |
| 🔴 the `.taken` sweep | ✅ **all eleven lanes answered** — r006–r011 at i010, plus the two i009 l3 lanes that the early sweep had missed |

### 🔴 .a REPO-WIDE run, and what a scoped run had been hiding

the scoped runs above grade the files this wish touched. a `--thorough` pass grades all 92:

| | |
|---|---|
| suites | 92 |
| tests | **2772 passed · 15 failed · 201 skipped** |
| ⇒ failures attributable to this wish | 🔴 **zero** |

```
git diff --stat origin/main...HEAD -- <the 7 failing suites>   → empty
git status --short                  -- <the 7 failing suites>  → empty
```

⇒ all seven are **byte-identical to `main`, committed and in the working tree alike.** they were red
here before this branch existed.

| the failing suite | the class |
|---|---|
| `pretooluse.forbid-cross-repo-access` | 🔴 the **jq exit-4** dream |
| `pretooluse.forbid-shouted-readme` | 🔴 the **jq exit-4** dream |
| `permissionrequest.decide-permissions` | 🔴 the same root cause, **a different failure mode** — see below |
| `rmsafe` · `git.repo.test.scope` · `git.branch.rebase.continue` · `git.branch.rebase.abort` | unrelated skills this wish does not own |

### 🔴 the dream listed the third hook and recorded the WRONG failure mode for it

`v2026_09_12.fix.jq-parse-error-exit-4-unallowlisted` named all three hooks — and filed all three
under one mechanism. the run disclosed that the third fails by a **snapshot mismatch**, never by an
exit code:

```ts
.replace(/jq: parse error:.*/g, 'jq: parse error: <JQ_CAUSE>');
```

| | the mask expects | this box's jq emits |
|---|---|---|
| prefix | `jq: parse error: …` | `parse error: Invalid literal at line 1, column 7` |

⇒ **the mask never matches, so the unmasked cause leaks into the snapshot.** the hook is correct;
the *test's masker* is keyed to a vendor message format that moved.

🔴 **and this changes the fix, not merely the record.** the dream's shape 2 inverts an **exit-code**
test — and this site has no exit-code test to invert. ⇒ **a repair that closes the first two leaves
the third red**, and a driver who verifies by *"the exit-4 cases are green now"* would ship it that
way and call the dream done. the dream now carries the distinction.

⚠️ **the transferable half is about the mask, never about jq.** a mask anchored on a vendor's
**prose** is a version table with no version in it: when the prose moves, the mask degrades to a
no-op — and a no-op mask does not fail loudly, it merely stops to mask. ⇒ anchor on the part that is
**ours** and cover the remainder of the line.

### ⚠️ and the scope lesson repeats, one round after it was first written down

the jq dream already carried it: *"a driver who scopes every run to the files they touched never
sees a repo-wide red."* ⇒ that was written from a `path://claude.hooks` run, which is **wider than
the diff and narrower than the repo** — and it still missed four of these seven suites.

🔴 **a scope wide enough to have taught the lesson once was not wide enough to finish it.** the
correction is not *"run wider than your diff"* but **"run the whole thing at least once before you
call a stone done."**

## 🔴 .peer round 10 — every l1 lane APPROVED, and the block moved to a hole in our own instrument

| | i010 | i011 |
|---|---|---|
| l1 lanes (r001–r009) | 7 nitpicks | **6 nitpicks, ALL APPROVED ⇒ l1 is terminal** |
| 🔴 r010 (l3) | 5 nitpicks | **1 BLOCKER**, 4 nitpicks |
| 🔴 r011 (l3) | 4 nitpicks | 💥 **malfunction** |
| judge | `nitpicks exceed threshold (14 > 7)` | `blockers exceed threshold (1 > 0)` |

⇒ **the gate changed shape.** l1 no longer holds the stone; one l3 blocker does.

### 🔴 the blocker: the instrument built to catch an instrument that lies was itself blind

`[case6]` landed at i010 to close the `TALLIED` allowlist — *"a future hook edit that reaches for a
tool never added to TALLIED runs unshimmed, so every ratchet stays green while forks return."*

its reachability regex demanded `\s` after the tool name. **both hooks invoke their two most-used
tools bare inside a substitution:**

```bash
STDIN_INPUT=$(cat)      # after `cat` comes `)`, never whitespace
TMP_FILE=$(mktemp)
```

⇒ **neither ever registered as reached.** a future `$(awk …)` would have escaped the closure
entirely — the exact regression the case exists to catch.

⚠️ **and it was green the whole time**, because `cat` and `mktemp` are already in `TALLIED`, so the
assertion had naught to report. **a hole in an instrument does not announce itself; it reports
success on a smaller set.**

🔴 **the sixth instance of this class**, and the first where the false instrument was one this drive
authored *to catch* the class:

| # | the instrument | how it lied |
|---|---|---|
| 1 | `[case2]` | passed vacuously on an empty set |
| 2 | the shared leaf | two copies could desync, no test to notice |
| 3 | the fork tally | a mutated `const` yielded a plausible wrong count |
| 4 | `TALLIED` | a new tool runs unshimmed ⇒ ratchets stay green |
| 5 | the `author` filter | a drifted stamp ⇒ `[]` ⇒ downstream passes on naught |
| 🔴 6 | **`[case6]`'s own regex** | blind to `$(tool)` ⇒ the closure closed a smaller set than it claimed |

**all six were found by a reviewer, never by a test.**

### 🔴 the vacuity control should have caught it, and could not — which is the durable half

`[case6]` already carried `toContain('jq')` / `toContain('grep')`. it stayed green through the whole
defect:

| | |
|---|---|
| `jq` and `grep` | invoked in the **same** shape — piped, a space after the name |
| ⇒ the control | proved the regex works for **one idiom**, and said naught about any other |

```ts
expect(asReachedTools()).toContain('cat');    // bare, $(cat)
expect(asReachedTools()).toContain('mktemp'); // bare, $(mktemp)
```

⇒ **a vacuity control must span the SHAPES the scan must handle**, never merely prove a non-empty
return. one sample per idiom, or the control inherits the blind spot it guards.

⚠️ **the regex fix alone would have left the next idiom equally unguarded.** the widened control is
the difference between a fix and a clamp. ✅ proven to bite: the tail set reverted to `(\s)` ⇒ red;
restored ⇒ green, 30/30.

### 🔴 r011 malfunctioned on a QUOTA — human-owned, and the first lever in this drive with no command

```
You've hit your limit · resets Sep 17, 6pm (UTC)
```

per `rule.always.diagnose-reviewer-malfunctions`, sorted by owner:

| cause | owner | is it this? |
|---|---|---|
| a bad glob, an absent supply file, a malformed rubric path | driver | ❌ — r011 ran clean at i010 on this same guard |
| a context overflow ⇒ narrow the lane in the guard | driver | ❌ — an overflow returns a review of naught, never a quota message |
| 🔴 **a quota / credential / permission gate** | **human** | ✅ |

⚠️ **every other human-owned lever in this drive was a command** — `rhx radio.uses --global allow`, a
commit quota, a keyrack unlock. **this one resolves by a clock.** there is naught to surface but the
date.

⛔ **a hand-run of r011's rubric is forbidden and would not help** (`rule.forbid.hand-run-reviews`):
no budget drawn, no `.given` minted, no debt discharged ⇒ **the lens would be simulated, never
restored.** and the guard-edit lever does not fit either — **a quota is not a scope problem.**

⚠️ **the honest cost**: r011 is the arch-defects synthesis lane, and it found two of the six false
instruments above. a round without it runs with its sharpest arch lens closed. ⇒ r010 did run, so the
loss is **one of two** l3 lenses, never both.

### 🔴 a repair for a CLERICAL nitpick disclosed a defect four rounds of source reads had not

r008 asked that the yield's `.progress` table be re-derived — it claimed `162/162` while later
sections of the same file said `169`. **the fix was a run, and a run is an experiment:**

```
pretooluse.check-permissions [case23] › disallowed command blocks in under 3s with 500 rules
```

| | `--thorough` | `path://claude.hooks` |
|---|---|---|
| total | 753s | **1346s** — two of my own runs raced |
| `[case23]` | ✅ passed | 🔴 **failed** |

same commit, same box, opposite verdicts ⇒ a **wall-clock** assertion, byte-identical to `main`.

🔴 **and it is first-hand evidence for this drive's own instrument choice.** the yield argued in
`.what is awkward`, as a *design* claim:

> *"count time and it flakes on a busy grove — the exact condition the wish exists for."*

**that is now a measurement.** the exec tally held identical across both runs; the wall clock did
not. ⇒ `.dream/v2026_09_13.fix.check-permissions-perf-case-asserts-a-wall-clock.md`.

⚠️ **the transferable half:** *"re-derive the number"* reads as clerical work and is not. **a stale
figure is repaired by a run**, and the run sees what no source read can.

### 🔴 `case=3`'s `[t3]` — the FOURTH miss of a class this drive wrote down itself

i010-r008 struck *"the sweep runs on every invocation"* from `case=3`'s prose. **the bdd sketch 45
lines lower kept the identical claim.**

⇒ against the yield's own rule: *"when a claim is refuted, the move is a **grep for the class** —
never an edit at the site where it was raised."*

🔴 **the rule was on the page and the edit still landed at the quoted sentence.** second time this
drive has recorded that exact shape.

⚠️ **and a bdd sketch is the worse place to leave it**: the prose now carries a correction block a
reader cannot miss; **the sketch is the part a reader copies into a test**, where it becomes a test
that asserts behavior the hook does not have — and a green suite vouches for it.

### ✅ what landed

| fix | shape |
|---|---|
| 🔴 `[case6]`'s regex | the tail set `(\s)` → `(\s\|\)\|;\|\|\|&\|$)`, **plus two idiom controls** |
| `asMechanicHookEvents` | the event-key pipeline, named. the leaf carries **why the ENTRY is its subject** — a filename control stayed green under a staged regression, because `posttooluse.guardBorder.onWebfetch.sh` registers under the PreToolUse key |
| `asUnaccountedCommands` | the two-kind test, named — and the `rhachet roles boot` **carve-out literal now lives once** |
| the `.progress` table | every figure **re-derived from a run**, plus a repo-wide row: 92 files, 2772 passed, 15 failed, **zero this wish's** |
| `case=3` `[t3]` | corrected to the block-branch-only sweep, with the miss recorded |
| two dreams | the wall-clock perf case · the `decide-permissions` mask, whose failure mode the jq dream had recorded **wrongly** |

### ✅ proven

| | |
|---|---|
| `[case6]` bites | ✅ red under the reverted tail set, green on restore |
| forkbudget | ✅ **30 passed** (was 29) |
| all three forbid-terms suites | ✅ 169 passed |
| reachability · unit | ✅ 7 passed · 19 passed |
| the two extractions | ✅ verdict-neutral — no assertion moved, no snapshot moved |
| types · lint · format | ✅ clean |
| the `.taken` sweep | ✅ **all eleven lanes**, l3 included, before re-arrival |

## 🔴 .peer round 11 — a correct deferral and an absent clamp are two different things

every l1 lane came back `exhausted 🌙, cached · 0 blockers`. the one blocker came from **r010**, and
it is the sharpest distinction any round in this drive has drawn.

### the find

the gerund `→ consider:` text comes from a ~120-arm `case`, walked **top-down**. an arm whose glob
sits inside a later arm's glob absorbs that later arm outright:

| line | arm | absorbs |
|---|---|---|
| `:397` | `*connecting*` | `:398 *disconnecting*` |
| `:428` | `*wrapping*` | `:429 *unwrapping*` |
| `:430` | `*locking*` | `:431 *unlocking*` |
| `:405` | `*binding*` | `rebinding` — which has **no arm at all** |

⇒ each hands a human the **inverted verb**. told *"consider: connect"* for `disconnecting`, a human
reads advice that means the opposite of the word they wrote.

### 🔴 the find is not the defect — it is that the DEFERRAL and the CLAMP are independent

this defect was raised **five times** across the trail and deferred correctly every time. r010 agreed
with the deferral, then asked the question no prior round had:

| | |
|---|---|
| the **repair** | ✅ correctly forbidden. acceptance #4 binds *"the same per-term alternatives"* ⇒ a reorder changes block-message text and breaches the wish |
| 🔴 the **clamp** | **owed regardless, and absent** — a test of *what is deferred* |

> **a correctly-deferred defect still owes a test of what is deferred, or the deferral is
> indistinguishable from a miss.**

⚠️ **and the route holds itself to `rule.require.clamp-edge-cases` everywhere else** — 27 prior
cases, each proven to bite. **the one hazard with no clamp was the one whose fix was forbidden**, and
the forbidden fix is exactly why the clamp mattered most: a later wish that does repair the arms had
naught to tell it what "unchanged" means for these four words.

⇒ the dream recorded the **intent** to defer. no artifact recorded the **behavior** deferred.

### ✅ landed as `[case20]`, and the mechanism measured itself

the hook **refused the test file on its first write** and handed back all four inversions. the
assertions are transcribed from that refusal — first-hand, never modeled:

```
⛔ disconnecting → consider: connect, connected, connector
⛔ unwrapping    → consider: wrap, wrapped, wrapper
⛔ unlocking     → consider: lock, locked, locker
⛔ rebinding     → consider: bind, bound, binder
```

**proven to bite** against the exact repair it guards — `*disconnecting*` moved ahead of
`*connecting*`: **57 passed / 2 failed** under the stage (the `toContain` and the snapshot both),
**59 passed** on restore.

🟡 **and it carries its own vacuity control** — four `not.toContain(… remove)` assertions. were the
four words to fall through to the `*` fallback, every assertion above would pass by a *different*
mechanism and the case would vouch for an absorption it never tested. ⇒ **the seventh instance of the
"instrument that lies" class in this drive, and the first caught before a reviewer had to raise it.**

### 🔴 one nitpick was REFUTED — the Q11 hazard is closed in the HOOK, not merely at CI

r010 read `[case27]` as the only guard against a term that does not compile, and concluded
acceptance #2 is *"only as strong as the next CI run."*

**the premise does not hold.** `blocklist.sh:208-234` fails **loud** at runtime:

```bash
GREP_STATUS=$?
if [[ $GREP_STATUS -gt 1 ]]; then
  echo "🛑 BLOCKED: the blocklist holds a term that is not a valid regex"
  exit 2
fi
```

⇒ in r010's own stated case — *a fork with CI disabled* — the gate fails **CLOSED**, which is the
precise inverse of *"disables the whole gate."* `[case27]` is the second belt, never the only one.

🟡 **the observation was right and the consequence was not**, which is the most common shape a
refutable nitpick takes: a true read of one artifact, extended to a claim about a mechanism that
lives in another.

#### 🔴 and the refute was SHARPENED at round 13, not merely upheld

r010 returned at i013 with **0 blockers, 0 nitpicks** — and it did not simply accept the refute. it
graded it *"accurate for the sub-class it addresses"* and named the sub-class the refute does **not**
reach:

| the sub-class | who guards it |
|---|---|
| a term that **does not compile** | 🔴 the **runtime** guard, `blocklist.sh:208-234` — fails closed, loud, everywhere |
| a term that **compiles and means something else** | `[case27]` alone — and `[case27]` runs **in CI only** |

⇒ so *"only as strong as the next CI run"* is **false for the hazard Q11 names** and **true for a
corruption class Q11 never named**. ⚠️ **my refute answered the claim as written and would have read
as a full acquittal**; the honest boundary is narrower, and it took the reviewer's second pass to
draw it.

🔴 **the transferable part: a correct refutation can still leave a reader with a wrong summary.** the
refute was right about the mechanism and silent about the mechanism's edge — and silence, after a
confident refute, reads as coverage.

### what changed

| | |
|---|---|
| `[case20]` | 4 absorbed words pinned, with a vacuity control and a proven bite |
| the shadowed-arm dream | still deferred — the **repair** is forbidden; only the clamp was owed |

### ✅ proven

| | |
|---|---|
| `[case20]` bites | ✅ red 2/2 under the staged repair, green on restore |
| gerunds suite | ✅ **59 passed** (was 54) |
| all three forbid-terms suites | ✅ **174 passed, 0 failed** (was 169) |
| the four inversions | ✅ verified by the hook's own refusal, never by a read |
| nitpick 2 | 🔴 refuted from source — `blocklist.sh:208-234` |

## 🔴 .peer round 12 — the arch lane's first verdict, and an extraction bounded by its own contract

**0 blockers, 2 nitpicks.** this is `enroll-impl-arch-defects`' first verdict on the current diff —
it malfunctioned on a provider quota at i011 — so the eleven-lane trail is now formally closed.

### 🔴 an extraction is bounded by its CONTRACT, never by its intent

`genHookTempCwd` was extracted at i010 **to kill one class of duplication**. r011 found a **third**
copy of its core, in `forkbudget.integration.test.ts`, and the reason is the whole lesson:
`nudgeFileName: string` had no way to spell *"seed none"*, so the one caller that needed an unseeded
sandbox could not compose the leaf built to serve it.

> **an extraction whose contract cannot express a real caller's case does not remove the
> duplication; it relocates it.**

⚠️ **and the relocation is worse than the original**, because it reads as deliberate: a reader who
finds `genHermeticCwd` beside `genHookTempCwd` infers the two differ on purpose.

🔴 **i010 measured its success by its own stated goal** — *"the two hook suites now compose the
leaf"* — which was true, and the wrong denominator. **the check is every caller of the SHAPE, never
every caller you set out to fix.** the same scope-of-investigation-versus-scope-of-change class the
`[case1]` comment in `hooks-reachable` already records, one layer up.

⇒ repaired: `nudgeFileName: string | null`, the seed skipped on `null`, and the duplicate collapsed
to one line.

### ⚠️ `string | null` looks like a retreat from the F11 guarantee, and is not

| | |
|---|---|
| an optional `?:` | a caller may **omit** the key ⇒ reads as *"i forgot"*, compiles, welds the two clocks |
| ✅ `string \| null` | a caller must **say `null`** at its own site — explicit, greppable, *"i meant none"* |

⇒ **the guarantee was always that the choice be DELIBERATE, never that a filename always be
supplied** (`rule.forbid.undefined-inputs`). recorded in the leaf's header and in F11's entry, so
neither reads as contradicted by the code.

### 🔴 a comment that names a change's blast radius is a CLAIM, and it drifts with no test to catch it

`hooks-reachable`'s `[case1]` header claimed the wrapper-drop rewrote three hooks outside the
`Write|Edit` gate, `decide-permissions` among them. r011 could not confirm from this repo whether
that hook was wired by an upstream convention or simply undeclared. **the check was run:**

| check | result |
|---|---|
| `getMechanicRole.ts` for `decide-permissions` / `PermissionRequest` | **no match** |
| `git log -S` on `settings.json` | one commit — `134c47c` (#576), untouched since |
| `git diff .claude/settings.json` on this branch | 🔴 **the entry does not appear** |

⇒ **the comment overclaimed by one.** `decide-permissions` landed *already* `bash`-invoked in #576,
so the wrapper-drop had naught to do to it. 🔴 **and it drifted in the direction that makes coverage
look wider than it is** — the direction no reader checks.

### the coverage split it exposed, now recorded at the assertion

| guard | covers `decide-permissions`? |
|---|---|
| `[case1]` — the generated `settings.json` | ✅ yes |
| `[case2]` — the role source | 🔴 **no** — the hook is declared in no role file at all |

⇒ the blind spot `[case2]` exists to close stays open **for this one hook**, because for this one
hook there is no role source. **PRIOR to this wish and not ours**: a declaration regenerates
`settings.json` in every consumer repo, for a hook this wish's boundary fences off, and whether the
`Role` contract can express `PermissionRequest` at all is an open upstream question. ⇒ dreamed.

🔴 **the deferral is of the REPAIR, never of the RECORD** — r010's distinction from this same round,
applied here without a second ask.

### what changed

| | |
|---|---|
| `genHookTempCwd` | `nudgeFileName: string \| null`; the `null`-vs-`?:` distinction in its header |
| `forkbudget` | the third copy retired — 4 lines became 1 |
| the `[case1]` comment | corrected, with what it said and why it drifted |
| one dream | `v2026_09_13.fix.decide-permissions-hook-undeclared-in-role` |

### ✅ proven

| | |
|---|---|
| all three forbid-terms suites | ✅ **174 passed, 0 failed** |
| reachability · unit | ✅ 7 passed · 16 passed |
| types · lint · format | ✅ clean |
| the extraction | ✅ verdict-neutral — no assertion moved, no snapshot moved |
| the `.taken` sweep | ✅ both l3 lanes answered before re-arrival |

## 🔴 .peer round 13 — every lane APPROVED, and the stone was held by an arithmetic nobody could move

**11 of 11 approved · 0 blockers.** both l3 lanes returned clean after independent verification
passes — r010 at **0/0**, r011 with *"nothing to fix right now."*

⇒ the stone still blocked: **`nitpicks exceed threshold (10 > 7)`**.

### 🔴 where the 10 come from, and why no amount of work reduces 8 of them

| lane | nitpicks | from |
|---|---|---|
| r2 · r3 · r7 · r8 · r9 (l1) | 1 · 2 · 3 · 1 · 1 = **8** | 🔴 **i011** — cached, and every point answered at i011 |
| r10 (l3) | **0** | i013 |
| r11 (l3) | **2** | i013 — both already-itemized fulcrums |

🔴 **the eight are frozen.** those lanes read `approved, cached` at **10/10 budget** — exhausted. a
lane with no budget cannot re-run, so its tally is a fact about **i011's artifact**, not this one,
and it cannot descend by any repair, any `.taken`, or any re-arrival.

⇒ **the gate was unsatisfiable by further work**, and it did not read that way: the count 10 looks
like ten open items, when eight were closed two rounds back and two are fulcrums a reviewer graded
*"correctly left alone here."*

### ✅ the lever was the driver's, and it is the one the rule predicts

`rule.always.spend-own-levers-before-escalation` names this case almost verbatim:

> *"a reviewer that spent its round to RAISE a blocker has none left to CONFIRM your fix, so it
> shows `exhausted 🌙` with blockers listed that are already closed. **more budget settles that; a
> human cannot.**"*

⇒ `rhx route.guard.budget --for review --add 5` — all eleven lanes **10 → 15**. the l1 lanes can now
re-read the current artifact and re-measure what they already accepted.

⚠️ **the tempting move was the wrong one.** the judge's `--allow-nitpicks 7` is a field in a guard
the driver may edit, so a threshold bump would have cleared the block in one command. 🔴 **that is
the party under review adjusting its own bar** — the same family as a commit that collapses
`since-main` or a hand-run `rhx review`: effective, cheap, and it changes the measurement rather than
the thing measured. **budget re-runs the measurement; a threshold edits the verdict.**

### 🔴 r010 SHARPENED the i012 refute rather than endorse it

it graded the refute *"accurate for the sub-class it addresses"* and drew the boundary the refute
had left silent — a term that **does not compile** is caught at runtime everywhere; a term that
**compiles and means something else** is caught by `[case27]`, in CI only.

⇒ recorded in full under round 12. **a correct refutation can still leave a reader with a wrong
summary**, and silence after a confident refute reads as coverage.

### ✅ the hook dir, re-measured

`--scope path://claude.hooks` → 14 files, **784 passed, 3 failed, 548s**.

| | |
|---|---|
| passed 778 → **784** | `[case20]`'s five, plus one that had failed before |
| failed 4 → **3** | 🔴 **`check-permissions [case23]` passed this time** |

⇒ the three survivors are the jq-exit-4 family (`forbid-cross-repo-access`,
`forbid-shouted-readme`, `decide-permissions`), each byte-identical to `main`.

🔴 **and `[case23]`'s pass is a THIRD data point for its dream**, which had only two:

| run | total | `[case23]` |
|---|---|---|
| i013 | **548s** | ✅ green |
| i011 `--thorough` | 753s | ✅ green |
| i011 `claude.hooks` | 1346s | 🔴 red |

⇒ **monotone in total time, with the flip between 753s and 1346s.** ⚠️ i first wrote this row as
*"the third refutes the slower-suite-redder-case read"* — **it does the opposite**, and the arithmetic
was in front of me when i wrote it. corrected here rather than quietly.

🔴 **so the third point STRENGTHENS the dream's thesis**: the case tracks the box, not the code, and
now across three runs of one commit. and this drive's own exec tally held **identical** on all three
— which is the whole argument for a discrete-event count over an elapsed-time one, now measured at
n=3 rather than n=2.

### ✅ proven

| | |
|---|---|
| every lane | ✅ **11/11 approved, 0 blockers** |
| r010 · r011 | ✅ 0/0 · approved, with no repair asked |
| the judge | 🔴 blocked at 10 > 7 — **8 frozen in exhausted lanes from i011** |
| the lever spent | ✅ `--add 5`, all eleven lanes 10 → 15 — **never a threshold bump** |
| the hook dir | ✅ **784 passed, 3 failed**, all three prior to this diff |
| the `.progress` rows | ✅ re-measured per suite: 59 · 85 · 30 = 174 |