# F27 — continue leaves a stray staged file out of the merge commit, never refuses on it

- **fork**: a staged file that origin/main did not change since the merge base would fold unreviewed work into the merge commit (vision invariant 2). (a) continue unstages it, keeps its edit in the tree, commits the merge, and names each file it left out; (b) continue refuses (exit 2) until the clone unstages it
- **taken**: (a). a clone holds no paved unstage: `git restore --staged` reads "no paved path fits", and `git.stage` holds only `add`. under (b) the one paved exit is abort, which discards every settle. (a) keeps invariant 2 and loses no work: the edit waits in the tree for its own `git.commit.set`
- **rework**: clean. (b) is one refusal render in place of the unstage loop, plus its test; no caller depends on (a)
- **risk**: low. a clone that meant the file for the merge commit (a fix main's change forced) sees it named under "left out" and commits it apart
- **confidence**: 80%
- **where**: i008 r010 blocker.3; `git.branch.catchup.continue.sh`, `get_staged_files_foreign_to_merge`; continue `[case47]` pins (a)
- **verdict**: taken by the driver: an execution fork (seeds S6, S7)
