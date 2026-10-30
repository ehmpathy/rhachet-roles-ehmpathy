# F1 — leave `git.commit.push` and its `--force-with-lease` as is

- **fork**: (a) leave `git.commit.push` and its `--force-with-lease` as is; the lease is inert on a fast-forward · (b) push plain when the remote head is an ancestor of HEAD, lease only on divergence
- **taken**: (a), by the director's call (seed S1)
- **rework**: clean. (b) is one conditional at `git.commit.push.sh:475`
- **risk**: low. on a fast-forward the lease changes no outcome. the one harm left: the auto-mode check might read the flag as a force and deny the post-merge push (Q9). that harm fails loud at the live push of this route's pr, and (b) is the clean cure
- **where**: `1.vision.yield.md` Q1
- **verdict**: answered — leave the lease as is
