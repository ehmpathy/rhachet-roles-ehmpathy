# F26 — take and lock refresh stage their own result, under no stage grant

- **fork**: `take` stages the side it picks and `lock refresh` stages the lockfile it writes, via raw `git add` / `git rm`, so `stage: block` does not hold them; a hand edit is staged by `rhx git.stage.add`, which the stage grant does gate. (a) both verbs are sanctioned stagers: each stages only the one file its own act produced; (b) both read the stage grant and refuse under `block`
- **taken**: (a). the stage grant guards a clone's choice of WHICH files enter a commit. take and lock refresh stage only a file the verb itself wrote, named by a conflict git already holds; there is no choice left to guard. under (b), a stage-blocked clone could neither take a side nor refresh a lock, so a lockfile conflict would have no paved settle. the commit that carries the staged file still runs every commit gate
- **rework**: clean. (b) is a grant read and one refusal per verb, plus their tests; no caller depends on (a)
- **risk**: low. a clone under `stage: block` can still settle a conflict whole; it cannot stage a file of its own choice
- **confidence**: 80%
- **where**: i007 r011 nitpick.5; `git.branch.catchup.take.sh`, `git.branch.catchup.lock.sh`; take `[case23d]` pins (a)
- **verdict**: taken by the driver: an execution fork (seeds S6, S7)
