# F11 — ~~the identity backstop catches two classes, and `case=5` `[t0]` is not one of them~~

> raised at **5.1.execution**, when `F3`'s deferred predicate met a file that had to contain one.

## 🔴 CLOSED at i003 — the residual is GONE, and this fulcrum's route table was WRONG

| field | value |
|---|---|
| rework | **clean** — it was, and the fix cost one roster entry |
| status | ✅ **closed — resolved, never accepted** |
| confidence | ~~72%~~ → **n/a** |
| where | `keyrack.operations.sh` → `SEATURTLE_CLONE_*` · `git.commit.sponsor.sh` → `is_identity_robot` |

**the peer lane `behavior-intent-coverage` graded the residual a blocker at i003, and it was right.**
this fulcrum reserved a call that was never the wisher's to make, because it rested on a route table
with an absent row.

### the error, precisely

the table below offers route **A** as *"an identity **attribute** that separates a clone from a
human"* and marks it refuted by `Q10`. that is true and it is not the only route:

| route | in the original table | verdict now |
|---|---|---|
| **A** — an identity **attribute** predicate | 🔴 refuted three times | ✅ still refuted. `Q10` stands |
| 🔴 **A′** — an identity **MATCH** against the roster the guard already keeps | ⛔ **absent from the table** | ✅ **taken.** the fix |

⇒ 🎯 **`Q10` measured whether any FIELD could tell a clone from a human, and the answer is no. it
never asked whether THIS account was already ours to name** — and the guard was, at that very
moment, matched two clone identities by name and by email.

⇒ **an identity match needs no attribute to work, which is exactly why it survives `Q10`'s three
refutations.** the account is not inferred to be a robot; it is declared to be one of ours.

### the correction, and what it cost

`SEATURTLE_CLONE_*` now declares the clone's github **account** in `keyrack.operations.sh`, beside
the two identities it already declares, and `is_identity_robot` cites it. verified first-party
2026-09-10: `gh api -X GET user` → `{"id":259600029,"login":"ehm-seaturtle","name":"Seaturtle
of'Ehmpathy","type":"User"}`.

⇒ 🔴 **it is deliberately NOT added to `is_one_seaturtle_identity_name`.** that predicate answers
*"may this author push?"*, and this account never authors a commit — to widen it would move the push
guard, which this change has no business to touch.

### 🔴 what this fulcrum cost by its existence

the honest tally, since the point of a fulcrum inventory is to be auditable:

| cost | detail |
|---|---|
| a **test that locked the defect** | `[case5][t3]` asserted the clone **binds**, exit 0, and cited this file for why |
| a **demo the vision renders and the code refused** | `case=5` `[t0]` and `case=1` `[t3]` both demand the refusal |
| **one review round** | the lane had to raise it as a blocker to get it looked at again |

⇒ ⚠️ **the test is the part worth remembering.** a fulcrum that reserves a call also licenses a test
to assert the un-fixed behavior, and that test then reads as a decision rather than a gap. the
`.why` block on `[case5][t3]` was three paragraphs of sound argument for the wrong outcome.

⇒ 🎯 **the lesson: when a fulcrum's case is "every route is closed", the fulcrum is only as good as
the route list — and a route list is exactly the thing an author cannot audit alone.** the two
questions that would have caught it: *what does this guard already do?* and *is my refutation about
the same KIND of check as my proposal?*

---

## the original record, kept verbatim below

## .the fork

`case=5` `[t0]` demos a human, at a tty, on a cloud grove, who runs `--who @me`. the session
resolves to `Seaturtle of'Ehmpathy <259600029+ehm-seaturtle@users.noreply.github.com>` and **the
bind must refuse.**

⇒ the fork is what the backstop checks so that it does.

| route | verdict |
|---|---|
| **A** — an identity attribute that separates a clone from a human | 🔴 **refuted three times.** `Q10` |
| **B** — the two classes that ARE establishable, plus a named residual | ✅ **taken** |
| **C** — halt until `F3`'s predicate is settled | ⛔ refused — the vision routed it to `2.1.criteria`, and a halt buys no evidence |

## 🔴 .why route A is closed, and it was closed before this stone

`Q10` measured three candidate predicates against **the exact account `case=5` `[t0]` names**:

| candidate | measured verdict |
|---|---|
| the email domain `*users.noreply.github.com` | a bot **and** a human share it, in the defect's own repo |
| the derived noreply address | identical shape for both parties |
| `gh api user --jq .type` | the clone reads **`"User"`** |

⇒ 🎯 **the cause is one, and it is not a gap in the search: the clone owns an ordinary, human-shaped
github account.** no attribute of an identity can separate them, so no amount of further search
along that axis returns a different answer.

## ✅ .what was taken — the two classes it CAN establish

| class | reads | why it is a class, not a roster |
|---|---|---|
| **robot** | `[bot]` in the name or email · the clone identities `keyrack.operations.sh` declares | `[bot]` is a marker **github itself mints** for an app account; the clone list is declared and maintained elsewhere, so this file cites rather than invents it |
| **placeholder** | `test user` · `test human` · `your name` · `john/jane doe` · `@example.com`/`.org` | generalizes the two literals at `git.commit.set.sh:600` from a pair to a shape |

⚠️ **the placeholder class is the closest this design comes to the roster the wish forbids**, and it
is inside the bound for one reason: the wish forbids a list as the mechanism that **establishes a
human**, and `Q10` moved that job to the act guard. a list that runs *behind* an act check is a
second net, never the net.

## 🔴 .the residual, stated plainly

**neither class catches `case=5` `[t0]`.** a human who runs `--who @me` on a cloud grove today binds
the clone.

⇒ what stands between that and the defect is **not** the backstop:

| what carries it | how |
|---|---|
| the **act** guard | a clone cannot reach a terminal, so it cannot bind **itself** — which is the defect `#645` reports |
| the **echo** | `set` prints the resolved `name` / `email` in its success tree, so a wrong bind is **visible** at the moment it happens |
| `del` | a human who reads the wrong name clears it in one command, at a tty they already hold |

⇒ ⚠️ **the residual is a MISFIRE, not the original defect.** the defect was a clone that co-authored
itself with no human anywhere in the loop; the residual needs a human who is present, at a terminal,
who reads a name that is not theirs and proceeds anyway. ⇒ different party, different frequency,
and a fallback (`del`) the defect never had.

## .why this is clean, not dirty

the whole predicate lives in **one function** with a boolean contract:

```sh
is_identity_robot "$SPONSOR_NAME" "$SPONSOR_EMAIL"
```

⇒ every caller, every error text, and every test asserts on the **refusal**, never on the reason.
so a better predicate — from `2.1.criteria`, or from a mechanism github has not shipped yet — is a
swap inside that function and no ripple past it.

⇒ 🎯 **that shape was chosen for this reason.** the backstop was built as one named predicate rather
than inline conditions precisely because `F3` had already flagged its contents as unsettled.

## .the confidence, and why it is 72%

| pulls it up | pulls it down |
|---|---|
| route A is refuted by measurement, not by inference | the demo the vision renders is not delivered as demoed |
| the act guard is the primary check by the vision's own ruling | a human misfire has no guard at all, only a visible echo |
| the rework is clean, so a later fix costs one function | a reader of `case=5` will expect `[t0]` to pass a test, and it will not |

⇒ 🔴 **the last row is the honest cost, and it is what `E1` must state out loud.** a test that
asserts `[t0]` refuses would have to fake the predicate to go green, which is a fake test
(`philosophy.verification-strictness`). ⇒ the test for `[t0]` asserts what the code **does** —
it binds, and it echoes the name — and cites this fulcrum for why.

## .what would settle it

- a github signal that separates an app-backed session from a human one, under the ambient login
- **or** an explicit confirmation step on `@me` — the human reads the resolved name and answers.
  ⚠️ this would change the contract (`case=6` shows `@me` bind with no prompt), so it is a wisher
  call rather than a build one
- **or** a ruling that the residual is accepted, and `case=5` `[t0]` is re-rendered to match
