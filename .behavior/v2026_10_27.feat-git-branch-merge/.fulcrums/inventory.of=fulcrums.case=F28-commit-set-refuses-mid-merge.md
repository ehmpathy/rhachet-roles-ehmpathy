# F28 — git.commit.set refuses while a merge is in flight

- **fork**: with MERGE_HEAD set, a plain `git commit` records two parents, so `git.commit.set` would make a merge commit past every catch-up gate (stopped-file markers, stray stage; vision invariants 2 and 5). (a) `git.commit.set` refuses any merge in flight (exit 2) and names `rhx git.branch.catchup continue | abort`; (b) refuse only a catch-up merge, let a foreign merge commit; (c) leave `git.commit.set` as is
- **taken**: (a). before this verb no paved path made a merge at all, so no caller leans on `git.commit.set` to finish one; a foreign merge in flight has its own exit in `catchup abort`. (b) would need `git.commit.set` to read the catch-up source, a dependency from the commit verb onto the merge verb; (c) leaves the bypass open
- **rework**: clean. the guard is one pure read ahead of every mutation; (b) narrows its condition, (c) deletes it
- **risk**: low. a human who hand-starts `git merge` and asks the clone to commit it meets a refusal that names both exits
- **confidence**: 80%
- **where**: i009 r010 nitpick (the `git.commit.set` bypass); `git.commit.set.sh`, ahead of the commit gates; continue `[case50]` pins (a)
- **verdict**: taken by the driver: an execution fork (seeds S6, S7)
