# F3 — the human-guard predicate is deferred to `2.1.criteria`

**rework:** clean · **status: ✅ RULED** (2026-09-09) · **confidence:** 88% → **95%**
*(80% → 88% at self-review r5 when a second candidate predicate was measured and refuted; → 95%
when the wisher ruled out a dispatcher, which removes the one case the act check could not cover.)*

## .the fork, stated fairly

the wish demands the guard *"establish a **human**, never enumerate known-bad names."* `#645`
proposes a concrete pattern: reject `*[bot]`, `seaturtle@ehmpath.com`, `*users.noreply.github.com`.

- **settle it now, at vision** — the wish names a shape; write it into the contract
- **defer it to `2.1.criteria`** — state the bar, leave the predicate to a pass with its own
  discovery

## .taken, and why at the time

**defer.** the vision states the **bar** (`case=5`) and does not fix the predicate.

🔴 **because the proposed pattern is wrong as written, and this is measured, not inferred.**

the distinct commit identities on `ahbode/svc-jobs` main — the repo the defect was found in:

```sh
$ gh api -X GET 'repos/ahbode/svc-jobs/commits?per_page=100' \
    --jq '[.[].commit.author | {n:.name, e:.email}] | unique | .[]'
{"e":"249629030+rhelease[bot]@users.noreply.github.com", "n":"rhelease[bot]"}          # a bot
{"e":"seaturtle@ehmpath.com",                            "n":"Seaturtle of'Ehmpathy"}  # a bot
{"e":"uladkasach@users.noreply.github.com",              "n":"Uladzimir Kasacheuski"}  # 🔴 a HUMAN
```

⇒ **a bot and a human share `users.noreply.github.com`, in the same repo.** the proposed pattern
would reject **the wisher himself** — the exact human the wish exists to name.

that is an over-rejection worse than the under-rejection it replaces: it blocks the correct act.

⇒ the wish asked for a **class**; the issue's own example is a **list**, and the list is provably
wrong on this repo's own data. that gap needs a discovery pass, not a vision-stage guess.

## 🔴 .the second refutation — `.type` does not tell a clone from a human either

**measured at self-review r5.** the obvious next predicate, once the email is out, is github's own
account-kind field. checked on the three identities above:

```sh
$ gh api -X GET 'repos/ahbode/svc-jobs/commits?per_page=100' \
    --jq '[.[].author | select(. != null) | {login, type}] | unique | .[]'
{"login":"ehm-seaturtle", "type":"User"}    # 🔴 the CLONE that authored a1635ea
{"login":"rhelease[bot]", "type":"Bot"}     # a github APP
{"login":"uladkasach",    "type":"User"}    # a human
```

⇒ 🔴 **`.type` catches the github APP and misses the CLONE.** `ehm-seaturtle` is an ordinary user
account a robot operates — by every attribute github exposes, it is a human.

## 🔴 .what the two refutations settle together

| attribute tried | verdict |
|---|---|
| email domain (`*users.noreply.github.com`) | 🔴 refuted — bot and human share it (`#645`'s own proposal) |
| the derived noreply address | 🔴 refuted at `F6` — identical shape for both |
| `.type` (`User` / `Bot`) | 🔴 refuted here — the clone reads `User` |

⇒ **no attribute of the IDENTITY establishes a human, because the clone owns a real, ordinary
human-shaped account.** three independent tries, three refutations, one cause.

⇒ 🎯 **so the predicate is not an identity check at all — it is an ACT check.** what a clone cannot
counterfeit is not a name; it is a **tty** and a **permission it does not hold**. `case=4`'s two
guards already are that check, and they are the real human-establisher in this design.

⇒ **the identity guard (`case=5`) is demoted to a BACKSTOP**, and the demotion is what keeps it
inside the wish's bound: a known-bad list is forbidden as the *primary* mechanism, and is honest as
a secondary net behind an act guard that carries the load.

## .the bar this vision DOES fix

| the guard must | the guard must not |
|---|---|
| establish the human by the **act** — tty + a permission the clone lacks | rest on an attribute of the identity |
| reject a value that cannot answer for a change | reject a human's private-email address |
| run at **bind**, where a human can fix it | be a list of known-bad names, used as the primary check |

⇒ that bar is a criterion. the predicate that satisfies it is a design.

## .rework, and why

**clean.** to settle the predicate later costs no rework now — no code depends on it, and `case=5`
already fixes the error text and the exit code. `2.1.criteria` is the natural home.

## .confidence, and why not higher

**88%.** up from 80%. the deferral is now backed by **two** measured refutations rather than one,
and — the part that moved the number — it carries a **direction**: establish by act, not by
identity. a deferral that names where the answer lives is far less likely to land as the naive
list than one that only says "later".

the residual 12%: the act guard is `case=4`'s, and `case=4`'s own shape depends on **Q1** (may a
dispatcher, which has no tty, bind?). ⇒ if a dispatcher may bind, the tty half of the act check
needs a second route, and this predicate re-opens.

## .where

- `case=5` → `.the shape of the guard`
- `1.vision.yield.md` → open questions
- at criteria: the predicate itself

## ✅ .the verdict — RULED by the wisher, 2026-09-09

**upheld: the predicate is deferred to `2.1.criteria`, and it is an ACT check.**

⇒ 🔴 **the residual 12% is closed.** that residual was: *"the act guard is `case=4`'s, and
`case=4`'s shape depends on Q1 — a dispatcher has no tty, so if one may bind, the tty half needs a
second route."*

⇒ ✅ **`Q1` came back "no automated dispatch exists."** so no party without a tty needs to bind,
and **the act check stands alone with no second route owed.**

| the predicate, settled | status |
|---|---|
| establish the human by the **act** — a tty plus a permission the clone lacks | ✅ **the mechanism, ruled** |
| the identity list (`case=5`) as a **backstop** behind it | ✅ **its role, ruled** — which is what keeps a known-bad list inside the wish's bound |
| the backstop's own contents | ⚠️ **still deferred** to `2.1.criteria` — a design detail, and the one item this row still owes |

⇒ 88% → **95%**. the residual 5% is that the backstop's list has still not been written, and a
deferred artifact can land as the naive pattern anyway. ⚠️ **this row is the record that prevents
that**, and it now carries three measured refutations to hand the criteria stage:

| candidate | refuted |
|---|---|
| the email domain `*users.noreply.github.com` | bot and human share it |
| the derived noreply address | identical shape for both |
| `gh api user --jq .type` | the clone reads `"User"` |

⇒ 🎯 **the instruction that carries to `2.1.criteria`: do not reach for an identity attribute.
three have been measured and all three failed, for one cause — the clone owns a real, ordinary,
human-shaped github account.**

## 🔴 .the second council RAISED the backstop's stakes — read this before you defer its contents

`Q2′` ruled that a cloud grove as provisioned today carries no human `gh auth login` session, so
`--who @me` there reads the **clone**. that produced a cell this row must account for:

```
a real human, at a real tty, over ssh, runs the PAVED local value form on a cloud grove
```

| guard | verdict on that cell |
|---|---|
| the **act** check — a tty plus a permission the clone lacks | ✅ **passes.** the human holds both. nothing about the act is wrong |
| the **identity** backstop | 🔴 **the only thing that refuses it** |

⇒ ⚠️ **this row demoted the identity guard to a backstop, and the demotion still holds** — but a
backstop that is the sole net on a **critipath** is not a nicety. `case=5` `[t0]` is now that cell,
and `case=1` `[t3]` is the same refusal from the supervisor's side.

⇒ 🔴 **so the deferred contents are deferred, never optional.** a `2.1.criteria` pass that ships the
act check and postpones the backstop leaves cell 6 — *"every cloud-grove bind by a human who carries
a local habit"* — with **no guard at all**.

⚠️ **and the one predicate this cell makes easy is the one that must not be generalized.** here the
refused value is *this host's own `gh api user` answer*, so the check *"is the session's login the
clone's?"* would work — and would be an enumeration of one known-bad name, which the wish forbids.
⇒ the class is *"cannot answer for a change"*, and cell 6 is one instance of it, never its
definition.
