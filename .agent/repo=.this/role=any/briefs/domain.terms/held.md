# domain term: held

## .the term

**held** — *state* of a meter grant, shape `[noun][state]` (`grantHeld`).

> a human granted the meter, and has not revoked it. the count may be 0.

the pair: **live** (`live.md`) = held, with a use left. every live grant is held; a held grant at 0 left is not live.

## .the evidence — a scenario timeline (the wish's own incident)

measured 2026-10-18, `rhachet-roles-bhuild`, from `0.wish.md`:

| step | given | when | then (old) | then (with `held`) |
|---|---|---|---|---|
| 1 | a branch with 0 commits | a director grants 1 commit, push blocked | — | — |
| 2 | the grant | the crew begins a rebase | refused: "rebase requires push permission" | proceeds: a rebase spends no use; the grant is held |
| 3 | — | a second grant, push allowed | proceeds | not needed |

⇒ the act that spends no use (push, rebase) needed a word for "granted, regardless of count". the old code read the count, so a spent grant silently revoked push (`git.commit.push.sh:722`).

## .the evidence — dimensional walk (act × grant state)

| act | spends a use? | needs |
|---|---|---|
| commit | yes | live |
| stage (out of a rebase) | no, but precedes a commit | live |
| push to the tree's own branch | no | held |
| rebase begin | no | held |

the forbidden cell: a held grant at 0 left that commits. the gate refuses it.

## .the etymology

**held** — *to hold a grant*: the human gave it; the tree still has it. a revoke (`block`, `del`) is the only act that ends the hold. depletion does not.

rejected:
- `granted` — names the past act, not the current state; a revoked grant was also once granted
- `allowed` — collides with `git.commit.uses allow`, a write verb that means unlimited
- `active` — overloads the live/held split; reads as "has uses"

## .invariants

- `held ⟺ a grant file exists ∧ it is not a block`
- `live ⇒ held`; `held ∧ uses = 0 ⇒ ¬live`
- depletion never changes `held`; only `block` / `del` end it

## .where

`git.commit.operations.sh` (the live-or-held reader) · `git.commit.push.sh` · `git.branch.rebase.begin.sh` · vision `1.vision.yield.md` "live vs held".
