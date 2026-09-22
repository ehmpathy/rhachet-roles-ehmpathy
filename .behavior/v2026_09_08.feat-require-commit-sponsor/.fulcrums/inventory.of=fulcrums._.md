# inventory of fulcrums

the forks best-guessed mid-drive. each row has an entry file; each entry states the fork, the
call, the reason at the time, and the rework cost.

⇒ `rule.always.itemize-the-fulcrums-you-best-guess` · `rule.always.defer-fulcrums-to-last`

🔴 **the council sat THREE times, all on 2026-09-09.** the wisher decided eight questions across the
rounds. ✅ **every design row is ruled**; one process row stands. the `verdict` column is the
decision, not a guess.

| case | title | rework | status | confidence | verdict |
|---|---|---|---|---|---|
| F1 | the term is `sponsor`, not `patron` or `authorizer` | clean | ✅ **ruled** | 94% | **upheld** — the restoration stands |
| F2 | per-tree only — 🔴 **the host-global default is withdrawn** | clean | ✅ **ruled** | 55% → **90%** | **upheld** — the 20-bind cost is accepted (small fleet, no dispatch) |
| F3 | the human-guard predicate is deferred to `2.1.criteria` — 🔴 **establish by ACT, not by identity** | clean | ✅ **ruled** | 88% → **95%** | **upheld** — no dispatcher ⇒ the tty check needs no second route |
| F4 | hard cutover — no grace period for extant trees | clean | ✅ **ruled** | 85% → **95%** | **upheld** — the fleet is small; one bind per tree, once |
| F5 | a dispatcher cannot bind; automated dispatch is undecided | ~~dirty~~ → **clean** | ✅ **ruled** | 55% → **90%** | 🔴 **upheld, and the DIRT IS GONE** — no automated dispatch exists |
| F6 | `@me` reads the github login (`gh api user`, as-human) | clean | ✅ **ruled** | 88% → **96%** | 🔴 **upheld, and NARROWED** — resolves only where your own session is |
| F7 | the term evidence file is written now, at vision | clean | open | 85% | _(unruled — a process call, not a design one)_ |
| F8 | a **new skill**, not a `--sponsor` flag on `git.commit.uses` | clean | ✅ **ruled** | 78% → **95%** | **upheld** — one *moment* is enough; the nudge becomes a deliverable |
| 🔴 **F9** | the `--from git-config` seed is **dropped**, though the wish permits it | clean | ✅ **ruled** | **92%** | **dropped** — `--who @stdin` covers it |
| 🔴 **F10** | **ONE `--who` flag** with `@me` / `@stdin` / literal value forms, not two flags | clean | ✅ **ruled** | **94%** | **one flag** — `@`-sigil-as-a-value is the repo's extant pattern |
| 🔴 **F11** | ~~the backstop catches **two** classes, and `case=5` `[t0]` is **not** one of them~~ | clean | ✅ **closed** | ~~72%~~ | 🔴 **RESOLVED, never ruled** — its route table lacked a row; the residual is gone |
| **F12** | repairs **beyond this change's own surface** are deferred — the uses reader · a set/del mutex · a pty harness · one shared actor guard · 🔴 **a refusal-promise audit** | clean | open | **91%** | _(unruled — each fails SAFE/CLEAN; **five** dreams caught)_ |
| 🔴 **F13** | l1 review lanes exclude `__snapshots__/**` (all 9) and `*.test.ts` (5 of 9, kept for `repo-rules`/`mech-failhides`/`behavior-intent-coverage`/`ergo-friction-hazards` whose own rubrics need test content) | clean | open | 70% | _(unruled — a best-guess to unblock a context-overflowed reviewer, not a design call on the feature)_ |

⚠️ **two process rows now stand — F7 and F12 — and neither is a design call.** F7 asks where the
term evidence belongs; F12 records a scope bound a reviewer already endorsed one round earlier.

🔴 **F11 closed at i003, and it is the one row that never reached a council.** a peer lane graded
its residual a blocker, and the grade was correct: the fulcrum's case rested on *"every route is
closed"*, and one route was absent from its own table — an identity **match** against the clone
roster the guard already kept, as distinct from the identity **attribute** predicates `Q10`
refuted. ⇒ the fix is one roster entry, and `case=5` `[t0]` now behaves as the vision demos it.

⚠️ **the transferable lesson:** a fulcrum that reserves a call also licenses a test to assert the
un-fixed behavior — `[case5][t3]` asserted the clone **binds**, and cited F11 for why. ⇒ a wrong
fulcrum does not merely defer a fix; it can harden the defect into the suite.

### 🔴 what the second council changed — the CONTRACT, not just the verdicts

round one settled who and whether. round two settled **which command a human runs**, and it moved
the paved path:

```
Q2′: "no — cloud has no human gh session"
 ├─▶ F6   --from me is LOCAL-ONLY. the cloud critipath (case=1, cell 4) takes --who @stdin
 ├─▶ F9   the seed's purpose was already served ⇒ the drop costs nothing
 └─▶ dimensions #3  the grove axis does NOT collapse — its weight moves to `bind`

seed:  "drop it — --who @stdin covers it"
 ├─▶ F9   3 bind routes → 2, and the split becomes a DOMAIN choice
 └─▶ case=6  rewritten: cell 3 keeps its verdict, its ROUTE changes

Q6:  "one moment is enough"
 └─▶ F8   the skill stands alone; the NUDGE is promoted to a required behavior
```

⚠️ **`Q2′` and the seed drop arrived in the same round, and the order matters.** had the seed been
dropped alone, axis D would have decided naught and the walk would have carried a dead dimension.
`Q2′` is what keeps it alive — and for a stronger reason than the seed gave it. ⇒ recorded at
`dimensions.md` → `.what the walk surfaced` #3.

### 🔴 round 3 — the wisher asked the question eight review rounds had not

> *"why wouldn't these be the same flag? `--who @me` vs `--who @stdin`"*

⇒ **`F10`**, and it is the cheapest, largest correction of the drive:

```
one flag
 ├─▶ matches the extant @-sigil pattern  (-m @stdin · --org @all · --into @this)
 ├─▶ F9 had left --from with exactly ONE legal value — a boolean in a costume
 ├─▶ Q8 had already ruled both flags name the SAME party (the requester)
 └─▶ 🔴 "--from me" parsed as "the SOURCE is me" — the pre-Q8 model (H2), still
        spoken by the surface after the prose had struck it
```

🔴 **and two defects fell out of the same question**, neither of which any lane had raised:

| found | what it was |
|---|---|
| `--who "literal"` was **undiscoverable** | the r6 refusal rule printed only the piped form, and the `case=1` `[t3]` rewrite had replaced the literal's only demo |
| *"`--from me` is **LOCAL-ONLY**"* **over-claimed** | the guard sits on the **value**, never the grove. `Q2′` is a fact about today's provisioned groves, not a rule — same class as *"impossible by nature"* |

⚠️ **the lesson worth the record: eight review rounds graded the two-flag contract against the rules
and passed it.** a reviewer checks the artifact against a rubric; it took a reader who owns the
domain to ask whether the **shape** was right. ⇒ a clean rubric is not evidence of a right design.

### 🔴 what the decision on Q1 (no automated dispatch) bought

it was the only **dirty** row, and three others hung off it. one answer closed all four:

```
Q1: "no dispatch — refuse it"
 ├─▶ F5  dirty → CLEAN. no provenance mechanism is owed
 ├─▶ F3  the ACT check (tty) holds with no second route
 ├─▶ F2  the 20-bind cost has no cheaper route, and is accepted
 └─▶ case=8  frequency ALWAYS → ZERO. a correct walk of a party that is not there
```

⚠️ **`case=8` stays in the contract, and its verdict changes rather than its content.** it is now a
**phantom** — a demonstrated cost with a frequency of zero. ⇒ it is the artifact that makes Q1
re-openable: the day dispatch arrives, the cost is already priced and the walk already done.

### ✅ F6 was narrowed twice, then closed

**round one, `Q8`** decided the sponsor is the **requester**. ⇒ the `me` form is the paved path only
when a human sponsors **their own** work. for a dispatch it names the wrong human, and a supplied
value is correct. the wisher's mechanism note added a contract requirement — *"the supervisor should
grab it from the machine they dispatched from and pipe it in"* ⇒ **the bind must accept `@stdin`**,
which matches the extant `-m @stdin` pattern.

⚠️ *(round one and two spoke of two flags; `F10` later folded them into one `--who`. the party each
names, and every verdict here, is unchanged — see the round-3 section above.)*

**round two, `Q2′`** closed the residual: *is a human `gh auth login` session present at bind time?*
⇒ **not on a cloud grove.** measured on this host, under the session a cloud tree actually has:

```sh
$ gh api -X GET user --jq '{login, name}'
{"login":"ehm-seaturtle","name":"Seaturtle of'Ehmpathy"}
```

⇒ 🎯 **the two rounds converge on one command.** `Q8` says a supervisor names the requester; `Q2′`
says a cloud grove has no other option. both land on `--who @stdin`, and a design that two
independent decisions push to the same place is a design with its shape right.

## .the read

> ⚠️ **the sections below are the read AS IT STOOD BEFORE the two councils.** they are kept because
> they record what each call rested on at the time it was made, which is what a fulcrum entry is
> for. the verdicts above supersede them — notably `F6` (now local-only), `F8` (now ruled), and the
> absence of `F9`, which did not exist until the wisher struck the seed.

**F5 was the one to read first.** ✅ **now ruled: no automated dispatch exists**, so the row is
clean, `F2` and `F3` are unblocked, and the actor axis keeps its three values with the
`dispatcher` row walked and refused.

🔴 **F2 changed at self-review r2, and it is the row to read second.** the host-global default was
**refuted**: `$HOME/.rhachet/storage/…` scopes to a **unix account**, not a person
(`git.commit.uses.global.sh:31`), so on a shared cloud grove one bind would sponsor every tree on
the host — and name a human who did not authorize the work. that is the **fabrication `case=4`
forbids a clone to write**, written by the design instead.

⇒ its confidence **fell** 72% → 55% even though the call got safer: the safety question closed, and
the ergonomic question it had been answered with (a 20-tree grove needs 20 binds) re-opened with no
cheap remedy that does not route through `F5`.

🔴 **F8 is new, and it is the vision's own contradiction.** `case=1` claims the human owes *"one
line and no more"*; the contract costs two commands. the claim must be delivered (a `--sponsor`
flag on `git.commit.uses`) or withdrawn (the prose corrected). ⇒ an ergonomist call.

**F1, F6 are name-and-shape calls** — clean, reversible before code lands.

**F3, F4, F7 decide what to settle now versus later** — order calls, no ripple.

🔴 **F3 moved at self-review r5, and the move changed what it defers.** a third candidate predicate
— `gh api user --jq .type` — was measured and **refuted**: the clone that authored `a1635ea` reads
`"User"`, the same as the wisher. three tries, one cause — **the clone owns a real human-shaped
github account, so no identity attribute separates them.**

⇒ 🎯 the predicate is an **act** check, never an identity one: a tty and a permission the clone
lacks. `case=4`'s guards already are it. ⇒ `case=5`'s identity guard is a **backstop**, which is
what keeps a known-bad list inside the wish's bound. 80% → **88%**.

## ✅ .the dependency the council sequenced — and it paid off

```
F5 (may a dispatcher bind?)  ─┬─▶  F2  (how is the 20-tree cost paid?)
                              ├─▶  F3  (a dispatcher has no tty ⇒ the ACT check needs a 2nd route)
                              └─▶  case=4's guard shape
```

⇒ **F2 could not be ruled before F5**, and F3 joined it at r5. ✅ **the council took F5 first, and
one answer closed all four rows** — the sequence was the point of the diagram, and it held.

⚠️ **the lesson worth the record:** F5's confidence sat at **55%** for the whole drive and the row
looked like the design's weakest point. it was not weak — it was **blocked on one fact nobody in
the drive could observe**. ⇒ a low-confidence fulcrum is not always a shaky call; sometimes it is a
correct call whose evidence lives outside the tree, and the fix is a question rather than more
analysis.

## .status legend

`open` — best-guessed, awaits the council. no verdict yet ruled.
