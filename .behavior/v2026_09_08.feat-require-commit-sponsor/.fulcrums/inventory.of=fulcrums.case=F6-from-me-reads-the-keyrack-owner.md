# F6 — the `@me` form reads the github login, not the keyrack owner

**rework:** clean · **status: ✅ RULED** (2026-09-09) · **confidence:** 88% → **96%**
*(the original call — "keyrack owner" — was **refuted at self-review r1**. the email question was
**measured and answered at r4**. the last open half — whether a cloud grove carries a human github
session — was **ruled by the wisher at the second council**: it does not. see the verdict.)*

> 🔴 **SURFACE NOTE — `F10` renamed what this row decides, and decided none of it.** this fulcrum
> was posed about a flag called `--from me`; the third council folded that flag into `--who @me`, a
> **value form**. ⇒ **every verdict below holds unchanged** — the fork was always about the *source*
> (`gh api user` vs the keyrack owner), and a source is not a flag name.
>
> ⚠️ **sentences below that name `--from me` are kept where they record what was true at the time**
> (`rule.always.itemize-the-fulcrums-you-best-guess`: an entry states the reason **as it stood**).
> the ruled sections speak of `@me`.

## .the fork, stated fairly

`case=1` leans on `--from me` as the paved default: the human binds themself in one line, with no
hand-typed email. that flag needs a **truthful source for "me" on a cloud grove**, where
`git config` is the clone.

| source | verdict |
|---|---|
| **keyrack owner** | 🔴 **refuted — measured, see below** |
| **`gh api user`** under `--auth as-human` | ✅ **taken.** github's own answer for "who am i"; the `as-human` path already exists here |
| **ssh / login user** | a unix username is not a name + email, and on a shared grove it is the clone's |
| **drop `--from me`** | the fallback. every bind becomes a hand-typed `--who`; `case=1`'s ergonomic is lost but the design still works |

## 🔴 .the refutation — keyrack holds no person

the original call was *"keyrack owner"*, reasoned from the flag name `--owner ehmpath` and never
checked against the manifest. checked now:

```yaml
# .agent/keyrack.yml
org: ehmpathy
env.prod:
  - GITHUB_TOKEN
env.prep:
  - EHMPATHY_SEATURTLE_GITHUB_TOKEN
```

⇒ the manifest is **org + env + credential key names**. no person appears in it.

and the flag's own help text settles it:

```
$ rhx keyrack --help
  --owner <owner>     owner identity (e.g., mechanic, foreman)
```

🔴 **`--owner` names a ROLE, not a human.** so `--from me` read from the keyrack owner would yield
`mechanic` — **the clone**. that is not merely an absent source; it is the original defect
approached from a third direction.

the nearest person-shaped concept keyrack has is a **recipient**
(`rhx keyrack recipient set --pubkey … --label …`) — a pubkey plus a free-text label. a label is
neither validated nor a name + email, so it cannot hold a sponsor either.

## .taken, and why

**`gh api user` under `--auth as-human`.**

- it is github's own answer to *"who am i"*, and it returns a name and an email
- the `as-human` path **already exists in this skill family** — `git.commit.push.sh:411`:
  *"as-human → no token; gh uses the human's own `gh auth login` session"*
- it is tied to a **human act**: the human logged in with their own credential
- ⚠️ under `as-ehmpath` the same call returns the **bot**, so the flag must be pinned to
  `as-human` and the result must still pass the robot guard (`case=5`). the guard is the backstop,
  not the source

## .rework, and why

**clean.** `--from me` is one read path inside the bind. to swap its source is a one-function
change; to drop the flag leaves `--who` intact. the contract in `1.vision.yield.md` names the flag,
not the source.

## .confidence

**78%.** up from 60% — the source is now grounded in an extant, cited code path rather than
inferred from a flag name. the residual 22%:

- whether `gh api user` returns a **usable email** — github returns `null` for a user whose email
  is private, which is common (and `uladkasach@users.noreply.github.com` shows this org uses the
  private form). ⇒ **unverified**, and the likeliest way this call still fails
- whether a cloud grove reliably has a human `gh auth login` session at bind time

⇒ if the email comes back `null`, `--from me` degrades to a prompt or to `--who`. that is a graceful
fallback, not a broken design — which is why this stays a clean, low-stakes fulcrum.

## ✅ .the ask — ANSWERED at self-review r4, first-party

the open half was: *does `gh api user` return a usable email?* **measured, on this host:**

```sh
$ gh api -X GET user --jq '{name, email, login}'
{"email": null, "login": "ehm-seaturtle", "name": "Seaturtle of'Ehmpathy"}
```

🔴 **`.email` is `null`** — exactly the failure this fulcrum predicted. so `--from me` **cannot**
read `.email`.

✅ **but the address is DERIVABLE, and the derivation is verified:**

```sh
$ gh api -X GET user --jq '(.id|tostring) + "+" + .login + "@users.noreply.github.com"'
"259600029+ehm-seaturtle@users.noreply.github.com"
```

⇒ 🎯 **that is byte-for-byte the co-author trailer on the defective commit `a1635ea`.** github's
noreply form is `<id>+<login>@users.noreply.github.com`, and `gh api user` returns both parts.

⇒ **`--from me` survives**, and its source is now precise: `.name` plus a **derived** noreply
address, never `.email`. the degradation to `--who` predicted here is **not needed**.

## ⚠️ .what the same measurement costs `F3`

the derived address for a **human** has the identical shape. ⇒ this is the third independent
confirmation that **an email pattern cannot establish a human** — the bot and the wisher both
inhabit `users.noreply.github.com`, and now both are reachable by the same derivation.

⇒ `F3`'s predicate must rest on something other than the address. that constraint is now measured
rather than inferred.

## .the residual

⚠️ the measurement above ran under the **bot's** session (`login: ehm-seaturtle`). it proves the
derivation works and that `.email` is null for this org's accounts; it does **not** prove a human's
`gh auth login` session is present on a cloud grove at bind time. that half of the 22% stands.

⇒ raised as the narrowed **Q2**.

## .where

- `case=6` `[t0]` — `source: session (@me)`
- `case=1` `[t3]` — the refusal where the session is not the human's
- `1.vision.yield.md` → the contract, open questions
- `F10` — the flag this row was posed about is now a value form of `--who`

## ✅ .the verdict — RULED by the wisher, 2026-09-09

**upheld, and NARROWED: the `@me` form reads `gh api user` under `--auth as-human`, and it holds
only where YOUR OWN session is on the host.**

⚠️ **this verdict once read *"a LOCAL-GROVE flag only"*, and that over-claimed.** the guard sits on
the **value**, never the grove — the skill runs no grove-detect (`case=5`, `case=6`). a human who
ssh'd in with their own `gh auth login` passes. `Q2′` measured how cloud groves are **provisioned
today**; it did not make the grove a predicate. ⇒ corrected at `F10`, same error class as
*"impossible by nature"*.

⇒ 🔴 **the residual above is closed, and it closed in the negative.** the open half read: *"it does
not prove a human's `gh auth login` session is present on a cloud grove at bind time."*

⇒ **`Q2′` came back: no. a cloud grove carries no human github session.** measured here, on this
very host, under the session a cloud tree actually has:

```sh
$ gh api -X GET user --jq '{login, name}'
{"login":"ehm-seaturtle","name":"Seaturtle of'Ehmpathy"}
```

⇒ 🎯 **the clone, on the groves as provisioned.** so `--who @me` there would name the robot — the
original defect, from a **fourth** direction, and this one carries the paved path's own value form.

| grove | the bind form | why |
|---|---|---|
| **local** | ✅ `--who @me` | the human's own `gh auth login` session is the one on the host |
| **cloud** | 🔴 `--who @stdin` / `--who "…"` | no human session exists to read. the supervisor supplies the requester |

## 🔴 .what this costs `case=1` — the paved path INVERTS on the critipath

`case=1` is the **cloud** case (cell 4), and it was written with the `@me` form as its `[t1]`. ⇒ that
`[t1]` is now wrong: the highest-care happy cell in the box takes a **supplied** form.

⚠️ **and this is a convergence, not a new cost.** `Q8` already ruled that the sponsor is the
**requester**, so a supervisor who dispatches someone else's ask was already headed to `--who`.
`Q2′` removes the *option* to do otherwise on a cloud grove.

⇒ **the two verdicts meet at the same command**, which is the strongest evidence either is right:

```sh
$ printf 'Ada Lovelace <ada@example.com>' | rhx git.commit.sponsor set --who @stdin
```

## ⚠️ .and the form must REFUSE, never degrade

🔴 **a silent degradation from `@me` to the session it finds is the defect this whole wish exists to
remove.** the form must not fall back; it must fail, and name the fix.

⇒ the guard is `case=5`'s **identity backstop** — a real human at a real tty runs this command, so
`case=4`'s act check passes and only the backstop refuses (`F3`). where `@me` runs and the session
is not a human's, it exits **2** and prints the **supplied** forms. ⇒ carried to `2.1.criteria`.

## .confidence, and why 96% rather than 100%

88% → **96%**. both open halves are now closed by measurement plus a wisher's verdict. the residual
4%: the check that separates a human session from the clone's is `F3`'s deferred predicate, and
`@me` depends on it to refuse rather than to degrade. ⇒ a `2.1.criteria` dependency, recorded so it
is not discovered late.

⚠️ **`F10` did not move this number.** it renamed the surface; the residual is about a **predicate**,
which no rename reaches.
