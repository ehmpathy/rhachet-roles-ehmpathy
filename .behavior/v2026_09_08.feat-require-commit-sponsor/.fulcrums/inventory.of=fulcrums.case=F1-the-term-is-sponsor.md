# F1 — the term is `sponsor`

**rework:** clean · **status: ✅ RULED** (2026-09-09) · **confidence:** 94%
*(was 88% — raised on first-party evidence, see below)*

## .the fork, stated fairly

the wish defers the word to the architect: `sponsor` · `patron` · `authorizer`, unsettled.

- **`patron`** has incumbency. it is the word rendered in the tree output today
  (`git.commit.set.sh:695`, and 20+ snapshot lines). to keep it is zero rename churn.
- **`authorizer`** is the most literal read of the motive — the party who authorized.
- **`sponsor`** is the wish's own working word and the issue title's.

## .taken, and why at the time

**`sponsor`.** four reasons, in order of weight:

0. 🔴 **it is a RESTORATION, not a coinage.** the origin wish that created `git.commit` already
   held the word — `.behavior/v2026_02_03.git-commit/0.wish.md:12`: *"attributes the human user
   that delegated the action with credit, **like a sponsor**"*. `patron` entered later, in the
   implementation, and drifted from the wish it was built from.
   ⇒ first-party, in-repo etymology, and it outranks every argument below. the question is no
   longer *"which word should we coin?"* but *"why did we abandon ours?"*

1. 🔴 **`patron` currently names the defect.** it labels the `git config` value — the thing that is
   a robot on a cloud grove. to keep the word is to give one term two senses: "the value we guessed"
   and "the authorization a human bound". `rule.forbid.term.addition.ambiguous`.
2. 🔴 **`authorizer` collides inside the same command.** `--auth as-ehmpath|as-human` already means
   *which github credential opens the pr* (`git.commit.operations.sh:35`). an `authorizer` field
   beside an `--auth` flag is one root, two senses, one screen.
3. **etymology fits.** *spondēre* = to pledge / take responsibility. the legislative sense — a
   member sponsors a bill they did not draft — is the near-exact analogue of a commit.

full evidence: `.agent/repo=.this/role=any/briefs/domain.terms/sponsor.md`.

## .rework, and why

**clean.** no code exists. the rename is a `sedreplace` across the skill, the snapshot baseline,
and the term file. it does not ripple into callers, contracts, or stored state.

⇒ this is exactly the fulcrum shape `rule.always.defer-fulcrums-to-last` says to best-guess and
drive on.

## .confidence, and why not higher

**94%**, raised from 88% when the origin wish was found.

the original 12% of doubt was the **github Sponsors** homonym. reason 0 mostly settles it: the
wisher already reached for this word *in this repo, for this exact role*, homonym and all. a
homonym the wisher themself was untroubled by is not ours to bikeshed
(`ref.reviewer.dont-bikeshed-terms`).

the residual 6% is the **sense shift**: the origin wish says *credit*, `#645` says
*accountability*. the word is restored; its motive is deeper. a reader who holds those two senses
far enough apart could argue for a distinct word for the sharper one. the term file states the
shift explicitly rather than paper over it.

## .where

- `.agent/repo=.this/role=any/briefs/domain.terms/sponsor.md`
- `1.vision.yield.md`, and every `case=N`
- at execution: `git.commit.set.sh:695`, `:917`, the `__snapshots__` baseline

## ✅ .the verdict — RULED by the wisher, 2026-09-09

**upheld. the term is `sponsor`.** `patron` and `authorizer` are both rejected.

⇒ the restoration stands: the word is the origin wish's own
(`v2026_02_03.git-commit/0.wish.md:12` — *"like a sponsor"*), and `patron` is confirmed as the
drift rather than the baseline.

⚠️ **the rename is now a scheduled task, not an open question.** 20+ snapshot lines carry `patron`,
plus the render sites at `git.commit.set.sh:592`, `:695`, `:917`. ⇒ it belongs in the execution
stone as a `sedreplace` plus a `--resnap`, and the residual 6% (the credit-versus-accountability
sense shift) is recorded in the term file rather than left to a later reader to rediscover.
