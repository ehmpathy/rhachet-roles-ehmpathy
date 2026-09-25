# F16 — dispute the r12 tally rather than absorb four concerns that do not exist

| field | value |
|---|---|
| **case** | F16 |
| **title** | dispute the r12 phantom tally |
| **rework** | **clean** — the whole call is four `--as disputed` commands and this file; a reversal is four `--as conceded` commands |
| **status** | ⏳ raised, awaits the council |
| **confidence** | **93%** — see `.confidence, and why it is not higher` |
| **where** | `5.3.verification`, round i003, lane `enroll-verif-test-intent` (r012) |

---

## .the fork, stated fairly

lane `enroll-verif-test-intent` was tallied **1 blocker · 3 nitpicks**. it enumerated **zero**
concerns. its own prose reads:

> "## Verdict: no blocker — no loosened assertions or changed test criteria found"

and closes with a word-form denial of any blocker at all.

the gate therefore holds four concerns that have no text, no location, and no rule cite. two roads
out:

| the fork | what it costs |
|---|---|
| **A — concede all four** | I would author four repairs for defects nobody named. there is no artifact to fix |
| **B — dispute all four**, with the mis-tally diagnosed | the lane's verdict is answered on the record, the tally is corrected, and a re-run settles it |

**taken: B.**

---

## .why, at the time

### the two numbers are traceable to their source sentences

this is not an inference about brain behavior. both numbers are quotable from the lane's **own**
prose, and each describes a **different lane**:

| tallied | the sentence it was scraped from | the lane that sentence is about |
|---|---|---|
| `1 blocker` | *"`mech-given-when-then` (r007) → **1 blocker** on a redundant-fork test pattern"* | mech-given-when-then, round **i002** — already conceded and fixed via `useThen` |
| `3 nitpicks` | *"Only `behavior-experience-coverage` raised **3 nitpicks**"* | behavior-experience-coverage, round i003 — conceded on **that** lane, all three repaired |

⇒ **the tallier matched numerals in a narrative about its peers.** `contract.reviewer-output` warns
of exactly this — it calls them *"incidental-match traps"* and gives the worked example
(*"no major blockers here"* must never read as a count).

### the lane emitted no numeric count, so it is a malfunction by contract

`contract.reviewer-output` is unambiguous:

> "stdout MUST hold a numeric count for BOTH dimensions … an unreadable review is a 💥 malfunction
> for that reviewer."

the lane wrote *"no blocker"* in prose — a word-form, which the contract lists in its own table of
failures. ⇒ this is a **contract-conformance malfunction**, not a verdict. and
`rule.always.diagnose-reviewer-malfunctions` says a malfunctioned lane still owes a `.taken`, which
is written and filed beside this.

### a concession here would be a false record

`rule.always.absorb-every-concern` defines `conceded` as *"the reviewer is right — commit to fix."*
there is no claim to be right about. a concession would enter four repairs-that-fix-naught into the
record and make the next reader believe four defects were found and closed. ⇒ **the dispute is the
honest disposition**, and it is the one the rule reserves for *"fine to continue — cite a fulcrum"*,
which is what this file is.

---

## .why it is a FULCRUM and not merely a call

a dispute sheds the concern from the stone-wide tally. that is a real effect on the threshold gate,
and it is made by the party under review. ⇒ the council must be able to overrule it, and can:
four `--as conceded` commands put the concerns back.

⚠️ **and the shape is one a driver could abuse.** *"the reviewer mis-tallied"* is available to any
driver who dislikes a count. what makes this instance checkable rather than convenient is that
**both numbers are quoted from the lane's own stdout, beside the peer lane each describes** — a
reader can verify the scrape without trust in me.

---

## .confidence, and why it is not higher

**93%.** the diagnosis is checkable from the artifact, so the *facts* are near-certain. what is not
certain is the **disposition**: whether this engine prefers a dispute or treats a mis-tally as a
malfunction to be re-run with no absorption at all.

`rule.always.absorb-every-concern` names that second road in its boundary clause — *"an unreadable
given (a malfunction → re-run, never an absorption)"* — but this given is not unreadable; it
produced two readable numbers from unreadable prose, which is a third state neither clause names.
⇒ I took the road that leaves the most on the record.

---

## .the rework, and why it is clean

- four `--as disputed` commands, this file, and one `.taken`
- a reversal is four `--as conceded` commands and a strikethrough here
- **no code, no test, no artifact** the fix ships depends on this call

⇒ **clean.** per `rule.always.defer-fulcrums-to-last`, a clean rework is best-guessed and flagged
rather than halted on.

---

## .the lever, if the council disagrees

the lane sits at **1/3** of its budget, so two rounds remain. the non-conformance is brain-output
variance rather than a deterministic defect ⇒ a re-run may well emit the two numeric lines the
contract asks for, which would settle this without a verdict at all.

---

## .the verdict, once ruled

_(unfilled — awaits the council)_
