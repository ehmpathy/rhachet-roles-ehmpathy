# domain term: live

## .the term

**live** — *state* of a meter grant, shape `[noun][state]` (`grantLive`).

> a held grant with a use left, or an unlimited grant (`allow`).

the pair: **held** (`held.md`). every live grant is held; a held grant at 0 left is not live.

## .the evidence — dimensional walk (act × grant state)

| act | spends a use? | needs |
|---|---|---|
| commit | yes | live |
| stage, out of a rebase | no, but it precedes the commit that spends | live |
| push, rebase begin | no | held |

the split is forced by the column "spends a use?". one word for both rows let a spent commit grant block a push (`git.commit.push.sh:722`, the wish's incident). see `held.md` for the timeline.

## .the etymology

**live** — a grant still in force for the act that spends it: a live round, a live wire. it carries charge left to spend.

rejected:
- `active` — reads as "not revoked", which is `held`; overloads the pair
- `open` — collides with a pr's open state on the same surface (`git.release`)
- `available` — names the use, not the grant; reads as a count, not a state

## .invariants

- `live ⟺ held ∧ (uses > 0 ∨ uses = "infinite")`
- an act that spends a use requires `live`; it never runs on `held` alone
- stage reads `live` out of a rebase, and reads no meter mid-rebase (F12)

## .where

`git.commit.set.sh` · `git.stage.add.sh` · `git.commit.operations.sh` · vision `1.vision.yield.md` "live vs held".
