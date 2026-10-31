# F2 — merge `begin --mode apply` does not require `push: allow`

- **fork**: (a) require `push: allow` as `git.branch.rebase begin` does · (b) gate on commit uses only; `git.commit.push` owns the push gate
- **taken**: (b). a merge commit is a commit, not a push; `git.commit.set` without `--push` does not need push allow either
- **rework**: clean. one guard
- **risk**: low. if wrong, a clone with commit quota but push blocked makes a merge commit it cannot push; `git.commit.push` then refuses loud and names the human grant. no work is lost; the commit waits locally
- **confidence**: 90%. answered by code: `git.commit.set` without `--push` needs no push allow (`:800`); rebase precedent points the other way because a rebase has no use until pushed
- **where**: `1.vision.yield.md` Q2
- **verdict**: open
