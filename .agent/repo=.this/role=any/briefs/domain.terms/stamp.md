# domain term: stamp

## .the term

**stamp** — *dobj*, shape `[noun]` (`releaseStamp`).

> a grant on the release meter (`git.release.uses`): the human's authorization for this tree to ship.

a stamp is a **grant** (the general noun for any meter's authorization) on one meter. the meter is `git.release.uses`; its count is `uses`; its grant is the stamp. one noun per concept:

| concept | noun |
|---|---|
| the gate that counts an act | **meter** (`git.commit.uses`, `git.release.uses`) |
| a human's authorization on a meter | **grant** |
| a grant on the release meter | **stamp** |
| the count a grant carries | **uses** |
| the cli flag that sets the count | `--quant` (flag only, never a noun in prose) |

`quota` is retired from prose; it named the count and the grant at once.

## .the evidence — the wisher's word, and the narrative

the wish (`0.wish.md`) names it twice: *"the human's release stamp (or a charter that grants release auth)"* and the table row *"who grants: the human's release stamp"*.

narrative, distilled from `1.vision.yield.md`:

| given | when | then |
|---|---|---|
| a tree with a commit grant, no stamp | the crew runs `git.release --mode apply` | refused: "a commit grant never ships; a release needs its own stamp" |
| a human runs `git.release.uses set --quant 1` | the crew applies | it ships; the stamp spends itself, 1 → 0 |
| the merge arm fails | — | the stamp is refunded, unless a human changed it since |

⇒ a ship is the costly, irreversible act; the stamp is the human's mark on that one act, distinct from the commit grant a director gives freely.

## .the etymology

**stamp** — an official mark that authorizes a document to proceed (a passport stamp, a seal of approval). it is applied by an authority, once, for one passage.

rejected:
- `release grant` — accurate, but two words for a concept the domain expert names in one
- `approval` — collides with the route's `--as approved` (a human sign-off on a stone, not a ship)
- `token` — collides with the auth token (`--auth as-ehmpath`) on the same surface
- `release quota` — `quota` names the count; a stamp is the authorization

## .invariants

- a stamp is written only by a human at a tty (`git.release.uses set|allow|block|del`)
- no file tool, and no gate mode, raises a stamp (`refuse_if_human_grant`, F26, r11 i007)
- a commit grant never ships; a stamp never commits
- a ship spends one use per apply (`--into prod` arms two prs on one use)

## .where

`git.release.uses*.sh` · `git.release._.guard_release_meter.sh` · `git.release.operations.sh` · `howto.git-release.[lesson].md`.
